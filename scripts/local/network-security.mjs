import { command } from './commands.mjs';

export function bindingsAreLoopback(containers) {
  return containers.every((container) => Object.values(container.NetworkSettings.Ports ?? {})
    .every((bindings) => bindings === null || bindings.every(({ HostIp }) =>
      HostIp === '127.0.0.1' || HostIp === '::1')));
}

function windowsFirewallProtectsPorts() {
  if (process.platform !== 'win32') return false;
  // Read-only check of active policy, not a request for elevation or a firewall mutation.
  const script = `
    $ErrorActionPreference = 'Stop'
    if (@(Get-NetFirewallProfile | Where-Object { -not $_.Enabled }).Count -gt 0) { exit 1 }
    $rules = @(Get-NetFirewallRule -PolicyStore ActiveStore -DisplayName 'Delivery local Supabase - block remote inbound' |
      Where-Object { $_.Enabled -eq 'True' -and $_.Direction -eq 'Inbound' -and $_.Action -eq 'Block' -and $_.Profile -eq 'Any' })
    foreach ($rule in $rules) {
      $port = $rule | Get-NetFirewallPortFilter
      $address = $rule | Get-NetFirewallAddressFilter
      if ($port.Protocol -eq 'TCP' -and $address.RemoteAddress -contains 'Any' -and
        $port.LocalPort -contains '56321' -and $port.LocalPort -contains '56322' -and $port.LocalPort -contains '56324') {
        Write-Output 'protected'; exit 0
      }
    }
    exit 1
  `;
  try { return command('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]).trim() === 'protected'; }
  catch { return false; }
}

export function verifyLocalNetwork() {
  const names = command('docker', ['ps', '--filter', 'network=delivery-local', '--format', '{{.Names}}'])
    .trim().split(/\s+/).filter((name) => name.startsWith('supabase_') && name.endsWith('_delivery-local'));
  if (!names.includes('supabase_db_delivery-local') || !names.includes('supabase_kong_delivery-local')) {
    throw new Error('No están activos los contenedores Supabase esperados.');
  }
  const containers = JSON.parse(command('docker', ['inspect', ...names]));
  if (bindingsAreLoopback(containers)) return 'Docker loopback';
  const ports = containers.flatMap((container) => Object.values(container.NetworkSettings.Ports ?? {}).flatMap((bindings) => bindings ?? []));
  if (ports.every(({ HostPort }) => ['56321', '56322', '56324'].includes(HostPort))
    && windowsFirewallProtectsPorts()) return 'Firewall Windows activo y verificado';
  throw new Error('Docker publica puertos fuera de loopback. Sigue el paso de firewall en docs/operations/local-backend.md antes de reiniciar.');
}
