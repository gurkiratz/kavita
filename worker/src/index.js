// Kavita admin Worker.
// GET  /            → static admin page (public/index.html)
// GET  /config      → { r2PublicBase } for thumbnails
// GET  /poems       → poems.json from R2
// GET  /scans/:name → one scan, straight from the bound bucket
// POST /poem        → create poem (auth required)
// PUT  /poem/:id    → update poem (auth required)
// DELETE /poem/:id  → delete poem (auth required)

import { requireAuth } from "./auth.js";
import { createPoem, deletePoem, getPoemsText, updatePoem } from "./poems.js";
import { json } from "./utils.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/config") {
      return json({ r2PublicBase: env.R2_PUBLIC_BASE || "" });
    }

    // Serve scans from the bucket this Worker is actually bound to.
    //
    // The admin used to build thumbnail URLs from R2_PUBLIC_BASE, which always
    // points at the production bucket's public r2.dev host. In dev that's the
    // wrong bucket — an image saved to the local or preview bucket 404s the
    // moment the blob: preview is replaced by a real URL. Same origin as the
    // page, so it's correct in every environment and needs no CORS.
    const scanMatch = url.pathname.match(/^\/scans\/([^/]+)$/);
    if ((request.method === "GET" || request.method === "HEAD") && scanMatch) {
      const name = decodeURIComponent(scanMatch[1]);
      const obj = await env.BUCKET.get("scans/" + name);
      if (!obj) return new Response("Not found", { status: 404 });

      const headers = new Headers();
      obj.writeHttpMetadata(headers);
      headers.set("etag", obj.httpEtag);
      // A scan is immutable once written — re-uploading gives it a new filename.
      headers.set("cache-control", "public, max-age=31536000, immutable");
      return new Response(request.method === "HEAD" ? null : obj.body, { headers });
    }

    if (request.method === "GET" && url.pathname === "/poems") {
      const body = await getPoemsText(env);
      return new Response(body, {
        headers: { "content-type": "application/json" },
      });
    }

    if (request.method === "POST" && url.pathname === "/poem") {
      const denied = requireAuth(request, env);
      if (denied) return denied;

      let form;
      try {
        form = await request.formData();
      } catch {
        return json({ error: "Expected a form submission." }, 400);
      }

      const result = await createPoem(env, form);
      if (result.error) return json(result, 400);
      return json(result);
    }

    const editMatch = url.pathname.match(/^\/poem\/([^/]+)$/);
    if (request.method === "PUT" && editMatch) {
      const denied = requireAuth(request, env);
      if (denied) return denied;

      let form;
      try {
        form = await request.formData();
      } catch {
        return json({ error: "Expected a form submission." }, 400);
      }

      const result = await updatePoem(env, editMatch[1], form);
      if (result.error)
        return json(result, result.error === "Poem not found." ? 404 : 400);
      return json(result);
    }

    if (request.method === "DELETE" && editMatch) {
      const denied = requireAuth(request, env);
      if (denied) return denied;

      const result = await deletePoem(env, editMatch[1]);
      if (result.error)
        return json(result, result.error === "Poem not found." ? 404 : 400);
      return json(result);
    }

    return env.ASSETS.fetch(request);
  },
};
