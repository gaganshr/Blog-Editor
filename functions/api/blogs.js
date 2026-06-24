// Cloudflare Pages Function — /api/blogs
// GET  -> list all blogs (id, title, updatedAt) from KV metadata
// POST -> create a new (empty) blog, returns { id }
//
// Requires a KV namespace bound as "BLOGS" (Pages → Settings → Functions →
// KV namespace bindings). Without it the API returns a clear 500.

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequestGet({ env }) {
  const kv = env.BLOGS;
  if (!kv) return json({ error: 'KV binding "BLOGS" is not configured' }, 500);
  const out = [];
  let cursor;
  do {
    const page = await kv.list({ prefix: 'blog:', cursor });
    for (const k of page.keys) {
      const m = k.metadata || {};
      out.push({ id: k.name.slice(5), title: m.title || 'Untitled blog', updatedAt: m.updatedAt || null });
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  out.sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
  return json({ blogs: out });
}

export async function onRequestPost({ env, request }) {
  const kv = env.BLOGS;
  if (!kv) return json({ error: 'KV binding "BLOGS" is not configured' }, 500);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const id = (crypto.randomUUID && crypto.randomUUID()) ||
    (Date.now().toString(36) + Math.random().toString(36).slice(2, 8));
  const now = new Date().toISOString();
  const title = (body.title || 'Untitled blog').slice(0, 200);
  const html = typeof body.html === 'string' ? body.html : '';
  const rec = { id, title, html, createdAt: now, updatedAt: now };
  await kv.put('blog:' + id, JSON.stringify(rec), { metadata: { title, updatedAt: now } });
  return json({ id, title, updatedAt: now });
}
