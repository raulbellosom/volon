import type { QuoteActor } from '../modules/pricing/quote.service.ts';

export function createSupabaseAuthenticator(url: string, publishableKey: string) {
  return async (request: Request): Promise<QuoteActor | null> => {
    const bearer = request.headers.get('authorization');
    if (!bearer || bearer.length > 8192 || !/^Bearer [A-Za-z0-9._-]+$/i.test(bearer)) return null;
    const response = await fetch(`${url}/auth/v1/user`, {
      redirect: 'error',
      headers: { apikey: publishableKey, authorization: bearer }, signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw new Error('Authentication unavailable');
    const user: unknown = await response.json();
    if (typeof user !== 'object' || user === null || !('id' in user)
      || typeof user.id !== 'string' || !/^[0-9a-f-]{36}$/i.test(user.id)) {
      throw new Error('Invalid authentication response');
    }
    return { subjectId: user.id };
  };
}
