import { json } from './utils.js';

export function getToken(request) {
  return (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
}

export function requireAuth(request, env) {
  const token = getToken(request);
  if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
    return json({ error: 'Wrong or missing password.' }, 401);
  }
  return null;
}
