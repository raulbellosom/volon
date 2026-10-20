import type { request as httpsRequest, RequestOptions } from 'node:https';
import type { ClientRequest, IncomingMessage } from 'node:http';
import { rootCertificates, checkServerIdentity } from 'node:tls';
import { CheckoutTestFailure } from '../../modules/payments/checkout-sandbox.port.ts';
import type { StripeTestRequest, StripeTestTransport } from './http.ts';
import { snapshotStripeWireRequest, validateStripeWireRequest } from './https-policy.ts';

/** Internal I/O seam: tests inject an ephemeral TLS server; real composition is private to the manual factory. */
export interface StripeTlsIo {
  readonly resolve: () => Promise<string>;
  readonly open: typeof httpsRequest;
}
export function boundedStripeHttps(value: StripeTestRequest, io: StripeTlsIo, timeoutMs = 5000): ReturnType<StripeTestTransport> {
  const request = snapshotStripeWireRequest(value);
  const path = validateStripeWireRequest(request);
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) throw new CheckoutTestFailure('CONFIGURATION_INVALID');
  return new Promise((resolve, reject) => {
    let finished = false;
    let outgoing: ClientRequest | undefined;
    let incoming: IncomingMessage | undefined;
    const cleanup = () => { clearTimeout(timer); request.signal.removeEventListener('abort', aborted); };
    const fail = (code: CheckoutTestFailure['code']) => {
      if (finished) return;
      finished = true;
      cleanup(); outgoing?.destroy(); incoming?.destroy(); reject(new CheckoutTestFailure(code));
    };
    const aborted = () => fail('REQUEST_UNKNOWN');
    const timer = setTimeout(aborted, timeoutMs);
    request.signal.addEventListener('abort', aborted, { once: true });
    if (request.signal.aborted) { aborted(); return; }
    // Deadline covers DNS resolution too. No second DNS lookup after validating the selected address.
    void io.resolve().then((address) => {
      if (finished) return;
      const options: RequestOptions = { hostname: address, port: 443, method: request.method, path,
        family: 4, servername: 'api.stripe.com', minVersion: 'TLSv1.2', rejectUnauthorized: true,
        checkServerIdentity: (_hostname, certificate) => checkServerIdentity('api.stripe.com', certificate),
        ca: [...rootCertificates], agent: false, maxHeaderSize: 8192,
        headers: { ...request.headers, Host: 'api.stripe.com', 'Accept-Encoding': 'identity',
          ...(request.body === undefined ? {} : { 'Content-Length': Buffer.byteLength(request.body) }) } };
      outgoing = io.open(options, (response) => {
        incoming = response;
        response.on('error', aborted);
        response.on('aborted', aborted);
        const status = response.statusCode ?? 0;
        if (status !== 200) {
          finished = true; cleanup(); response.destroy(); outgoing?.destroy();
          resolve({ status, body: new Uint8Array() }); return;
        }
        const length = response.headers['content-length'];
        if ((length !== undefined && (typeof length !== 'string' || !/^\d+$/.test(length) || Number(length) > 262144))
          || (response.headers['content-encoding'] !== undefined && response.headers['content-encoding'] !== 'identity')
          || !/^application\/json(?:;\s*charset=utf-8)?$/i.test(String(response.headers['content-type']))) {
          fail('RESPONSE_MISMATCH'); return;
        }
        let size = 0;
        const chunks: Buffer[] = [];
        response.on('data', (chunk: unknown) => {
          if (finished) return;
          if (!Buffer.isBuffer(chunk)) { fail('RESPONSE_MISMATCH'); return; }
          size += chunk.byteLength;
          if (size > 262144) { fail('RESPONSE_MISMATCH'); return; }
          chunks.push(chunk);
        });
        response.on('end', () => {
          if (finished) return;
          finished = true; cleanup(); outgoing?.destroy();
          resolve({ status, body: Buffer.concat(chunks, size) });
        });
      });
      outgoing.on('error', aborted);
      outgoing.end(request.body);
    }).catch(aborted);
  });
}
