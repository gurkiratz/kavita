// Kavita admin Worker.
// GET  /        → password-gated form to add a poem (served same-origin).
// POST /poem    → validates the password, uploads images, appends to poems.json in R2.
//
// The reader app keeps reading the public R2 URL; this only handles writes.

const POEMS_KEY = 'poems.json';
const EXT_BY_TYPE = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

function slugify(s) {
  return (s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 60);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET' && url.pathname === '/') {
      const html = PAGE.replace('__R2_PUBLIC_BASE__', env.R2_PUBLIC_BASE || '');
      return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    }

    // Existing poems (same public data the app reads) — powers the admin list.
    if (request.method === 'GET' && url.pathname === '/poems') {
      const cur = await env.BUCKET.get(POEMS_KEY);
      const body = cur ? await cur.text() : '[]';
      return new Response(body, { headers: { 'content-type': 'application/json' } });
    }

    if (request.method === 'POST' && url.pathname === '/poem') {
      const token = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return json({ error: 'Wrong or missing password.' }, 401);
      }

      let form;
      try {
        form = await request.formData();
      } catch {
        return json({ error: 'Expected a form submission.' }, 400);
      }

      const titleGurmukhi = String(form.get('titleGurmukhi') || '').trim();
      const titleRoman = String(form.get('titleRoman') || '').trim();
      if (!titleGurmukhi && !titleRoman) {
        return json({ error: 'A title (Gurmukhi or Roman) is required.' }, 400);
      }
      const gurmukhi = String(form.get('gurmukhi') || '');
      const roman = String(form.get('roman') || '');
      const poet = String(form.get('poet') || '').trim();
      const tagsRaw = String(form.get('tags') || '').trim();
      const tags = tagsRaw ? tagsRaw.split(',').map((t) => t.trim()).filter(Boolean) : [];
      const files = form.getAll('images').filter((f) => f && typeof f.arrayBuffer === 'function' && f.size > 0);

      // Current poems
      const cur = await env.BUCKET.get(POEMS_KEY);
      let poems = [];
      if (cur) {
        try { poems = await cur.json(); } catch { poems = []; }
        if (!Array.isArray(poems)) poems = [];
      }

      // Unique id from the Roman title (falls back to Gurmukhi, then timestamp)
      const base = slugify(titleRoman) || slugify(titleGurmukhi) || 'poem-' + Date.now();
      let id = base;
      let n = 2;
      while (poems.some((p) => p && p.id === id)) id = base + '-' + n++;

      // Upload images
      const imageNames = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const fromName = f.name && f.name.includes('.') ? f.name.split('.').pop().toLowerCase() : '';
        const ext = EXT_BY_TYPE[f.type] || fromName || 'jpg';
        const name = files.length > 1 ? id + '-' + (i + 1) + '.' + ext : id + '.' + ext;
        await env.BUCKET.put('scans/' + name, await f.arrayBuffer(), {
          httpMetadata: { contentType: f.type || 'image/jpeg' },
        });
        imageNames.push(name);
      }

      // Build the poem (omit empty fields)
      const poem = { id, title: { gurmukhi: titleGurmukhi, roman: titleRoman } };
      if (imageNames.length === 1) poem.image = imageNames[0];
      if (imageNames.length > 1) poem.images = imageNames;
      if (gurmukhi) poem.gurmukhi = gurmukhi;
      if (roman) poem.roman = roman;
      if (poet) poem.poet = poet;
      if (tags.length) poem.tags = tags;

      poems.unshift(poem); // newest first
      await env.BUCKET.put(POEMS_KEY, JSON.stringify(poems, null, 2), {
        httpMetadata: { contentType: 'application/json' },
      });

      return json({ ok: true, id, count: poems.length });
    }

    return new Response('Not found', { status: 404 });
  },
};

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Kavita · Add poem</title>
<style>
  :root { color-scheme: light dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #FBF9F4; color: #1F1A12; font: 16px/1.5 -apple-system, system-ui, sans-serif; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 24px 16px 64px; }
  h1 { font-size: 22px; margin: 8px 0 4px; }
  p.sub { color: #6B6250; margin: 0 0 20px; }
  label { display: block; font-weight: 600; font-size: 13px; margin: 16px 0 6px; }
  input, textarea { width: 100%; padding: 10px 12px; border: 1px solid #E3DCCB; border-radius: 10px;
    background: #fff; color: inherit; font: inherit; }
  textarea { min-height: 140px; resize: vertical; white-space: pre; }
  .row { display: flex; gap: 12px; }
  .row > div { flex: 1; }
  button { margin-top: 24px; width: 100%; padding: 14px; border: 0; border-radius: 12px;
    background: #9C5B2E; color: #fff; font-weight: 700; font-size: 16px; cursor: pointer; }
  button:disabled { opacity: .6; cursor: default; }
  .status { margin-top: 16px; padding: 12px 14px; border-radius: 10px; display: none; }
  .status.ok { display: block; background: #E7F0E2; color: #2C4A1E; }
  .status.err { display: block; background: #F4E2E2; color: #6B1F1F; }
  .hint { color: #6B6250; font-weight: 400; font-size: 12px; }
  h2 { font-size: 18px; margin: 32px 0 4px; }
  .item { display: flex; gap: 12px; align-items: center; padding: 10px; margin-top: 8px;
    border: 1px solid #E3DCCB; border-radius: 12px; background: #fff; }
  .item img, .item .glyph { width: 48px; height: 48px; border-radius: 8px; flex: none;
    object-fit: cover; background: #F1ECE1; display: flex; align-items: center;
    justify-content: center; color: #6B6250; font-size: 22px; }
  .item .meta { min-width: 0; }
  .item .t { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .item .r { color: #6B6250; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style>
</head>
<body>
<div class="wrap">
  <h1>ਕਵਿਤਾ · Add a poem</h1>
  <p class="sub">Saves directly to your collection. Line breaks and spacing are kept exactly.</p>

  <label>Password <span class="hint">(remembered on this device)</span></label>
  <input id="token" type="password" autocomplete="current-password" />

  <form id="poemForm">
    <div class="row">
      <div>
        <label>Title — Gurmukhi</label>
        <input name="titleGurmukhi" />
      </div>
      <div>
        <label>Title — Roman</label>
        <input name="titleRoman" />
      </div>
    </div>

    <label>Punjabi (Gurmukhi) <span class="hint">paste with real line breaks</span></label>
    <textarea name="gurmukhi"></textarea>

    <label>English / Roman <span class="hint">paste with real line breaks</span></label>
    <textarea name="roman"></textarea>

    <div class="row">
      <div>
        <label>Poet <span class="hint">(optional)</span></label>
        <input name="poet" />
      </div>
      <div>
        <label>Tags <span class="hint">(comma separated)</span></label>
        <input name="tags" />
      </div>
    </div>

    <label>Images <span class="hint">(optional, one or more)</span></label>
    <input name="images" type="file" accept="image/*" multiple />

    <button id="submit" type="submit">Save poem</button>
  </form>

  <div id="status" class="status"></div>

  <h2>In your collection</h2>
  <p class="sub" id="count"></p>
  <div id="list"></div>
</div>

<script>
  var tokenEl = document.getElementById('token');
  var form = document.getElementById('poemForm');
  var btn = document.getElementById('submit');
  var statusEl = document.getElementById('status');
  var KEY = 'kavita_admin_token';

  tokenEl.value = localStorage.getItem(KEY) || '';

  var R2_BASE = '__R2_PUBLIC_BASE__';
  var listEl = document.getElementById('list');
  var countEl = document.getElementById('count');

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function thumb(p) {
    var file = (p.images && p.images[0]) || p.image;
    if (file && R2_BASE) return '<img src="' + R2_BASE + '/scans/' + encodeURIComponent(file) + '" alt="" loading="lazy" />';
    var g = (p.title && p.title.gurmukhi) ? p.title.gurmukhi.slice(0, 1) : '?';
    return '<div class="glyph">' + esc(g) + '</div>';
  }

  function loadList() {
    fetch('/poems').then(function (r) { return r.json(); }).then(function (poems) {
      countEl.textContent = poems.length + (poems.length === 1 ? ' poem' : ' poems');
      listEl.innerHTML = poems.map(function (p) {
        return '<div class="item">' + thumb(p) +
          '<div class="meta"><div class="t">' + esc(p.title && p.title.gurmukhi) + '</div>' +
          '<div class="r">' + esc(p.title && p.title.roman) + '</div></div></div>';
      }).join('');
    }).catch(function () { countEl.textContent = ''; });
  }

  loadList();

  function setStatus(msg, ok) {
    statusEl.textContent = msg;
    statusEl.className = 'status ' + (ok ? 'ok' : 'err');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var token = tokenEl.value.trim();
    if (!token) { setStatus('Enter your password first.', false); return; }
    localStorage.setItem(KEY, token);

    var fd = new FormData(form);
    btn.disabled = true;
    setStatus('Saving…', true);

    fetch('/poem', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (res.ok && res.d.ok) {
          setStatus('Saved "' + res.d.id + '" — now ' + res.d.count + ' poems. It will appear in the app shortly.', true);
          form.reset();
          loadList();
        } else {
          setStatus(res.d.error || 'Something went wrong.', false);
        }
      })
      .catch(function () { setStatus('Network error.', false); })
      .finally(function () { btn.disabled = false; });
  });
</script>
</body>
</html>`;
