import { resolveAppMode, type ModeEnv } from './app-mode.ts';

// Shape-valid placeholder; never a real key.
const KEY = 'sb_publishable_placeholder_for_tests_only';
const LOCAL: ModeEnv = { mode: 'local', authUrl: 'http://127.0.0.1:56321', apiUrl: 'http://127.0.0.1:3100', publishableKey: KEY };

describe('app mode gate', () => {
  it('defaults to demo and keeps it independent of any local settings', () => {
    expect(resolveAppMode({}, true)).toEqual({ kind: 'demo' });
    expect(resolveAppMode({ mode: 'demo', apiUrl: 'http://127.0.0.1:3100' }, false)).toEqual({ kind: 'demo' });
  });

  it('enables local only in development with loopback URLs and a publishable key', () => {
    expect(resolveAppMode(LOCAL, true)).toEqual({ kind: 'local', config: { authUrl: 'http://127.0.0.1:56321', apiUrl: 'http://127.0.0.1:3100', publishableKey: KEY } });
    expect(resolveAppMode({ ...LOCAL, authUrl: 'http://10.0.2.2:56321', apiUrl: 'http://localhost:3100' }, true).kind).toBe('local');
  });

  it('blocks local mode in production builds', () => {
    expect(resolveAppMode(LOCAL, false)).toMatchObject({ kind: 'blocked', reason: 'El modo local solo funciona en compilaciones de desarrollo.' });
  });

  it.each([
    ['a public host', { apiUrl: 'http://api.example.com:3100' }],
    ['a LAN address', { apiUrl: 'http://192.168.1.20:3100' }],
    ['https', { authUrl: 'https://127.0.0.1:56321' }],
    ['no port', { apiUrl: 'http://127.0.0.1' }],
    ['a path', { apiUrl: 'http://127.0.0.1:3100/v1' }],
    ['credentials in the URL', { apiUrl: 'http://user:pass@127.0.0.1:3100' }],
    ['a missing key', { publishableKey: undefined }],
    ['a secret key', { publishableKey: 'sb_secret_abcdefghijklmnopqrstuvwxyz' }],
    ['a legacy JWT key', { publishableKey: 'eyJhbGciOiJIUzI1NiJ9.e30.signature' }],
    ['a key with spaces', { publishableKey: 'abc def ghi jkl mno pqr stu' }],
  ])('blocks local mode with %s', (_name, override) => {
    expect(resolveAppMode({ ...LOCAL, ...override }, true).kind).toBe('blocked');
  });

  it('blocks unknown modes instead of guessing', () => {
    expect(resolveAppMode({ mode: 'real' }, true)).toMatchObject({ kind: 'blocked', requested: 'real' });
    expect(resolveAppMode({ mode: 'production' }, true).kind).toBe('blocked');
  });
});
