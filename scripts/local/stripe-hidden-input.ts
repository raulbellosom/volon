import { CheckoutTestFailure } from '../../apps/api/src/modules/payments/checkout-sandbox.port.ts';

/** Pure editor for adversarial tests; never returns anything to stdout. */
export function hiddenInputChunk(current: string, chunk: string): { value: string; done: boolean } {
  let value = current;
  let done = false;
  for (const char of chunk) {
    if (done) {
      if (char === '\n') continue;
      throw new CheckoutTestFailure('INVALID_COMMAND');
    }
    if (char === '\r' || char === '\n') { done = true; continue; }
    if (char === '\x7f' || char === '\b') { value = value.slice(0, -1); continue; }
    if (char < ' ' || char > '~' || value.length >= 8192) throw new CheckoutTestFailure('INVALID_COMMAND');
    value += char;
  }
  return { value, done };
}
/** Only a real local TTY. No stdin pipe, file, argv or environment fallback. */
export function readHiddenStripeValue(label: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY || !process.stdin.setRawMode)
    return Promise.reject(new CheckoutTestFailure('TRANSPORT_DISABLED'));
  return new Promise((resolve, reject) => {
    let value = '';
    const previousRaw = process.stdin.isRaw;
    const cleanup = () => {
      clearTimeout(timer);
      process.stdin.off('data', data); process.stdin.off('end', cancel); process.stdin.off('error', cancel);
      process.stdin.setRawMode(previousRaw); process.stdin.pause();
      process.stdout.write('\n'); value = '';
    };
    const cancel = () => { cleanup(); reject(new CheckoutTestFailure('TRANSPORT_DISABLED')); };
    const data = (bytes: Buffer) => {
      try {
        const edit = hiddenInputChunk(value, bytes.toString('utf8'));
        value = edit.value;
        if (edit.done) { const result = value; cleanup(); resolve(result); }
      } catch { cancel(); }
    };
    const timer = setTimeout(cancel, 120000);
    process.stdout.write(label + ' (sin eco): ');
    process.stdin.setRawMode(true); process.stdin.resume();
    process.stdin.on('data', data); process.stdin.once('end', cancel); process.stdin.once('error', cancel);
  });
}
