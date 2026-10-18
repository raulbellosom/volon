import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

class PayloadTooLarge extends Error {}

async function toRequest(incoming: IncomingMessage): Promise<Request> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of incoming.iterator({ destroyOnReturn: false })) {
    const buffer: Buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 16384) {
      incoming.resume();
      throw new PayloadTooLarge();
    }
    chunks.push(buffer);
  }
  const headers = new Headers();
  for (const [key, value] of Object.entries(incoming.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (value) headers.set(key, value.join(', '));
  }
  const method = incoming.method ?? 'GET';
  return new Request(new URL(incoming.url ?? '/', 'http://api.internal'), {
    method, headers, ...(method === 'GET' || method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }),
  });
}

async function send(response: Response, outgoing: ServerResponse): Promise<void> {
  outgoing.writeHead(response.status, Object.fromEntries(response.headers));
  outgoing.end(Buffer.from(await response.arrayBuffer()));
}

export function createHttpServer(handle: (request: Request) => Promise<Response>) {
  const server = createServer({ maxHeaderSize: 16384 }, async (incoming, outgoing) => {
    try { await send(await handle(await toRequest(incoming)), outgoing); }
    catch (error) {
      if (!outgoing.destroyed && !outgoing.headersSent) {
        const status = error instanceof PayloadTooLarge ? 413 : 503;
        await send(Response.json({ status, code: status === 413 ? 'PAYLOAD_TOO_LARGE' : 'SERVICE_UNAVAILABLE' },
          { status, headers: { 'cache-control': 'no-store', 'content-type': 'application/problem+json' } }), outgoing);
      }
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 5000;
  server.keepAliveTimeout = 5000;
  return server;
}
