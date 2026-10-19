import { readFile } from 'node:fs/promises';
import { createProviderAdapter } from './providers.ts';
import { evaluate } from './runner.ts';
import { COST_SCENARIOS, COST_SOURCES, estimateCost } from './cost.ts';
import { SYNTHETIC_CASES, syntheticFetch } from './fixtures.ts';
import { readRealConfiguration } from './real-config.ts';
import type { Provider } from './types.ts';

const args = process.argv.slice(2);
try {
  if (!args.length || (args.length === 1 && args[0] === '--offline')) {
    const reports = [];
    for (const provider of ['geoapify', 'google', 'mapbox'] as const) {
      let tick = 0;
      const adapter = createProviderAdapter(provider, 'artificial-fixture-only', { fetcher: syntheticFetch(provider) });
      reports.push(await evaluate(adapter, SYNTHETIC_CASES, { mode: 'simulation', clock: () => tick++ }));
    }
    console.log(JSON.stringify({ warning: 'SIMULACIÓN ARTIFICIAL. No mide proveedores reales.', realQueries: 0,
      reports, costSources: COST_SOURCES, costScenarios: Object.entries(COST_SCENARIOS).map(([name, scenario]) => ({
        name, assumptions: scenario, estimates: (['geoapify', 'google', 'mapbox'] as Provider[])
          .map((provider) => estimateCost(provider, scenario)),
      })) }, null, 2));
  } else if (args.length === 3 && args[0] === '--real' && args[1] === '--manifest' && args[2]) {
    if (process.env.CI !== undefined || process.env.GITHUB_ACTIONS !== undefined) throw new Error('Real evaluation disabled in CI');
    const path = args[2];
    const bytes = await readFile(path, 'utf8');
    if (Buffer.byteLength(bytes) > 1048576) throw new Error('Manifest too large');
    const config = readRealConfiguration(process.env, bytes);
    const adapter = createProviderAdapter(config.provider, config.key, { fetcher: fetch,
      maxRequests: config.maximum, retries: 0 });
    const report = await evaluate(adapter, config.cases, { mode: 'real',
      pause: () => new Promise((resolve) => setTimeout(resolve, 1000)) });
    console.log(JSON.stringify({ datasetHash: config.datasetHash, report }, null, 2));
  } else throw new Error('Invalid arguments');
} catch {
  console.error('Evaluación bloqueada o configuración inválida. Consulta docs/validation/map-provider-benchmark.md.');
  process.exitCode = 1;
}
