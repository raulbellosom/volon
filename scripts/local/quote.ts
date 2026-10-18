process.loadEnvFile('.env.local');
function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing ${key}`);
  return value;
}
const login = await fetch(`${required('SUPABASE_URL')}/auth/v1/token?grant_type=password`, {
  method: 'POST', headers: { apikey: required('SUPABASE_PUBLISHABLE_KEY'), 'content-type': 'application/json' },
  body: JSON.stringify({ email: 'merchant-a@example.test', password: required('SYNTHETIC_USER_PASSWORD') }),
  signal: AbortSignal.timeout(10000),
});
if (!login.ok) throw new Error('No fue posible autenticar al usuario sintético.');
const session: unknown = await login.json();
if (typeof session !== 'object' || session === null || !('access_token' in session)
  || typeof session.access_token !== 'string') throw new Error('Sesión inválida.');
const headers = { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' };
const created = await fetch(`${required('API_URL')}/v1/delivery-quotes`, {
  method: 'POST', headers, signal: AbortSignal.timeout(15000),
  body: JSON.stringify({ branchId: 'branch_synthetic_a', pickup: { lat: 0, lng: 0 },
    dropoff: { lat: 0.01, lng: 0.01 }, serviceType: 'local_delivery' }),
});
if (created.status !== 201) throw new Error(`La API rechazó crear la cotización: ${created.status}.`);
const quote: unknown = await created.json();
if (typeof quote !== 'object' || quote === null || !('quoteId' in quote)
  || typeof quote.quoteId !== 'string') throw new Error('Cotización inválida.');
const read = await fetch(`${required('API_URL')}/v1/delivery-quotes/${encodeURIComponent(quote.quoteId)}`, {
  headers, signal: AbortSignal.timeout(10000),
});
if (!read.ok) throw new Error(`La API rechazó consultar la cotización: ${read.status}.`);
console.log('Usuario sintético autenticado; cotización guardada y consultada:');
console.log(await read.json());
