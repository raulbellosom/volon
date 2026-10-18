import { command, pnpm, composeArgs, runQuietly } from './commands.mjs';

const operation = process.argv[2];
if (operation === 'status') {
  console.log(command('docker', [...composeArgs, 'ps']));
  console.log(command('docker', ['ps', '--filter', 'network=delivery-local', '--format', '{{.Names}} {{.Status}} {{.Ports}}']));
} else if (operation === 'stop') {
  runQuietly('Deteniendo API/Redis (se conservan volúmenes)', () => command('docker', [...composeArgs, 'stop']));
  runQuietly('Deteniendo Supabase local (se conservan datos)', () => pnpm(['exec', 'supabase', 'stop', '--project-id', 'delivery-local']));
} else { throw new Error('Operación local desconocida'); }
