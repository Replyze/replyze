// List every open conversation in your Replyze inbox, page by page.
// Node.js 18+ (built-in fetch), no dependencies.
//   REPLYZE_API_KEY=rpz_live_... node list-conversations.mjs

const API = 'https://client.replyze.chat/api/v1';
const key = process.env.REPLYZE_API_KEY;
if (!key) {
  console.error('Set REPLYZE_API_KEY (an API key with the conversations:read scope).');
  process.exit(1);
}

async function replyze(path) {
  const res = await fetch(API + path, {
    headers: { Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`${res.status} ${body.error?.code}: ${body.error?.message}`);
  }
  return body;
}

try {
  let cursor = null;
  do {
    const params = new URLSearchParams({ status: 'open', limit: '50' });
    if (cursor) params.set('cursor', cursor);
    const page = await replyze(`/conversations?${params}`);

    for (const c of page.data) {
      const who = c.contact?.name || c.contact?.email || 'Visitor';
      console.log(`#${c.id}  ${c.channel?.type}  ${who}  ${c.subject ?? ''}`);
    }
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
