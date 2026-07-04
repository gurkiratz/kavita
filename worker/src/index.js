// Kavita admin Worker.
// GET  /           → static admin page (public/index.html)
// GET  /config     → { r2PublicBase } for thumbnails
// GET  /poems      → poems.json from R2
// POST /poem       → create poem (auth required)
// PUT  /poem/:id   → update poem (auth required)

import { json } from './utils.js';
import { requireAuth } from './auth.js';
import { createPoem, getPoemsText, updatePoem } from './poems.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/config') {
      return json({ r2PublicBase: env.R2_PUBLIC_BASE || '' });
    }

    if (request.method === 'GET' && url.pathname === '/poems') {
      const body = await getPoemsText(env);
      return new Response(body, { headers: { 'content-type': 'application/json' } });
    }

    if (request.method === 'POST' && url.pathname === '/poem') {
      const denied = requireAuth(request, env);
      if (denied) return denied;

      let form;
      try {
        form = await request.formData();
      } catch {
        return json({ error: 'Expected a form submission.' }, 400);
      }

      const result = await createPoem(env, form);
      if (result.error) return json(result, 400);
      return json(result);
    }

    const editMatch = url.pathname.match(/^\/poem\/([^/]+)$/);
    if (request.method === 'PUT' && editMatch) {
      const denied = requireAuth(request, env);
      if (denied) return denied;

      let form;
      try {
        form = await request.formData();
      } catch {
        return json({ error: 'Expected a form submission.' }, 400);
      }

      const result = await updatePoem(env, editMatch[1], form);
      if (result.error) return json(result, result.error === 'Poem not found.' ? 404 : 400);
      return json(result);
    }

    return env.ASSETS.fetch(request);
  },
};
