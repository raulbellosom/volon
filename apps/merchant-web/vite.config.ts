import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import type { Plugin, ProxyOptions } from 'vite';
import { defineConfig } from 'vitest/config';
import { themeInitScript } from '../../packages/ui-web/src/theme/theme-store.ts';

/**
 * Local backend values come from the repo `.env.local` written by `pnpm local:up`.
 * They stay in the dev server: the proxy injects the publishable key, so nothing
 * from that file is bundled into the browser code.
 */
function localBackend(): Record<string, string> {
  try {
    const file = readFileSync(fileURLToPath(new URL('../../.env.local', import.meta.url)), 'utf8');
    return Object.fromEntries(
      file.split(/\r?\n/).flatMap((line) => {
        const match = /^([A-Z_]+)=(.*)$/.exec(line.trim());
        return match?.[1] && match[2] ? [[match[1], match[2]]] : [];
      }),
    );
  } catch {
    return {};
  }
}

function devProxy(): Record<string, ProxyOptions> {
  const env = localBackend();
  const api = env['API_URL'] ?? 'http://127.0.0.1:3100';
  const auth: ProxyOptions = { target: env['SUPABASE_URL'] ?? 'http://127.0.0.1:56321', changeOrigin: true };
  const key = env['SUPABASE_PUBLISHABLE_KEY'];
  if (key) auth.headers = { apikey: key };
  return { '/v1': { target: api, changeOrigin: true }, '/auth/v1': auth };
}

/** Applies the stored theme before the first paint (no light flash for dark users). */
const themeInit: Plugin = {
  name: 'volon-theme-init',
  transformIndexHtml: () => [{ tag: 'script', children: themeInitScript, injectTo: 'head-prepend' }],
};

export default defineConfig({
  plugins: [themeInit, react(), tailwindcss()],
  server: { port: 5173, strictPort: true, host: '127.0.0.1', proxy: devProxy() },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
