export function problem(status: number, code: string, title: string): Response {
  return Response.json({ type: 'about:blank', title, status, code }, {
    status, headers: { 'content-type': 'application/problem+json', 'cache-control': 'no-store' },
  });
}
