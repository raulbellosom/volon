import { createServer, type IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { CheckoutTestObservation } from '../../modules/payments/checkout-sandbox.port.ts';
import { CheckoutTestFailure } from '../../modules/payments/checkout-sandbox.port.ts';

/** Component only: never mounted in API or started by create/reconcile. No provider transport by default. */
export async function startPrivateStripeTestReceiver(options: {
  readonly observe: (bytes: Uint8Array, signature: string) => Promise<{ readonly receipt: CheckoutTestObservation; readonly recorded: boolean }>;
  readonly ttlMs?: number;
}) {
  const ttl = options.ttlMs ?? 60000;
  if (!Number.isInteger(ttl) || ttl < 1 || ttl > 600000 || process.env.NODE_ENV === 'production')
    throw new CheckoutTestFailure('CONFIGURATION_INVALID');
  let attempts = 0;
  const sockets = new Set<import('node:net').Socket>();
  const server = createServer({ maxHeaderSize: 8192, requestTimeout: 5000, headersTimeout: 5000 }, (req, res) => {
    const deadline = setTimeout(() => { req.destroy(); res.destroy(); }, 5000);
    res.once('close', () => clearTimeout(deadline));
    attempts++;
    const signature = req.headers['stripe-signature'];
    const address = server.address() as AddressInfo | null;
    const invalid = attempts > 20 || req.socket.remoteAddress !== '127.0.0.1' || req.method !== 'POST'
      || req.url !== '/stripe-test-events' || req.headers.host !== '127.0.0.1:' + address?.port
      || req.headers.origin !== undefined || req.headers.cookie !== undefined || req.headers['content-encoding'] !== undefined
      || !/^application\/json(?:;\s*charset=utf-8)?$/i.test(String(req.headers['content-type']))
      || typeof signature !== 'string' || Buffer.byteLength(signature) > 4096
      || Number(req.headers['content-length'] ?? 0) > 65536
      || req.headersDistinct['stripe-signature']?.length !== 1;
    if (invalid) { res.writeHead(400, { 'Cache-Control': 'no-store', Connection: 'close' }); res.end(); return; }
    void receive(req).then((bytes) => options.observe(bytes, signature)).then(({ receipt, recorded }) => {
      if (!recorded) throw new CheckoutTestFailure('REQUEST_UNKNOWN');
      if (res.destroyed) return;
      // Do not forward arbitrary callback/PSP objects to the local relay.
      res.writeHead(200, { 'Cache-Control': 'no-store', 'Content-Type': 'application/json', Connection: 'close' });
      res.end(JSON.stringify({ received: true, duplicate: receipt.duplicate === true, eligible: false }));
    }).catch((error: unknown) => {
      if (res.destroyed) return;
      const retryable = !(error instanceof CheckoutTestFailure) || ['INFRASTRUCTURE_UNAVAILABLE','REQUEST_UNKNOWN',
        'REQUEST_BUSY','VERSION_CONFLICT','TRANSPORT_DISABLED','CONFIGURATION_INVALID'].includes(error.code);
      if (!res.headersSent) res.writeHead(retryable ? 503 : 400, { 'Cache-Control': 'no-store', Connection: 'close' });
      res.end();
    });
  });
  server.maxConnections = 20;
  server.on('connection', (socket) => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
  server.setTimeout(5000, (socket) => socket.destroy());
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true; clearTimeout(timer);
    for (const socket of sockets) socket.destroy();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  };
  const timer = setTimeout(() => { void close(); }, ttl);
  const address = server.address() as AddressInfo;
  return { port: address.port, host: '127.0.0.1' as const, close };
}
async function receive(req: IncomingMessage): Promise<Uint8Array> {
  let size = 0;
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    if (!Buffer.isBuffer(chunk)) throw new CheckoutTestFailure('INVALID_COMMAND');
    size += chunk.byteLength;
    if (size > 65536) throw new CheckoutTestFailure('INVALID_COMMAND');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks, size);
}
