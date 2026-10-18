export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  function required(key: string): string {
    const value = env[key];
    if (!value || /[\r\n]/.test(value)) throw new Error(`Missing or invalid ${key}`);
    return value;
  }
  const databaseUrl = required('DATABASE_URL');
  const supabaseUrl = required('SUPABASE_URL');
  if (!['postgres:', 'postgresql:'].includes(new URL(databaseUrl).protocol)
    || !['http:', 'https:'].includes(new URL(supabaseUrl).protocol)) throw new Error('Invalid service URL');
  if (env.LOCAL_SYNTHETIC_MODE !== 'true') throw new Error('Only synthetic local mode is supported');
  const port = Number(env.PORT ?? '3100');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
  return { databaseUrl, supabaseUrl, publishableKey: required('SUPABASE_PUBLISHABLE_KEY'), port };
}
