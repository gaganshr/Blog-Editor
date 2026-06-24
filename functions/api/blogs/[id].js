// Cloudflare Pages Function — /api/blogs/:id
// GET    -> { id, title, html, createdAt, updatedAt }
// PUT    -> update title/html, returns { ok, updatedAt }
// DELETE -> remove the blog

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequestGet({ env, params }) {
  const kv = env.BLOGS;
  if (!kv) return json({ error: 'KV binding "BLOGS" is not configured' }, 500);
  const raw = await kv.get('blog:' + params.id);
  if (!raw) return json({ error: 'not found' }, 404);
  return new Response(raw, {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
}

export async function onRequestPut({ env, params, request }) {
  const kv = env.BLOGS;
  if (!kv) return json({ error: 'KV binding "BLOGS" is not configured' }, 500);
  let body = {};
  try { body = await request.json(); } catch (e) {}
  const raw = await kv.get('blog:' + params.id);
  const now = new Date().toISOString();
  const existing = raw ? JSON.parse(raw) : { id: params.id, createdAt: now };
  const rec = {
    id: params.id,
    title: (body.title != null ? body.title : existing.title || 'Untitled blog').slice(0, 200),
    html: typeof body.html === 'string' ? body.html : (existing.html || ''),
    createdAt: existing.createdAt || now,
    updatedAt: now,
  };
  await kv.put('blog:' + params.id, JSON.stringify(rec), { metadata: { title: rec.title, updatedAt: now } });
  return json({ ok: true, updatedAt: now });
}

export async function onRequestDelete({ env, params }) {
  const kv = env.BLOGS;
  if (!kv) return json({ error: 'KV binding "BLOGS" is not configured' }, 500);
  await kv.delete('blog:' + params.id);
  return json({ ok: true });
}
