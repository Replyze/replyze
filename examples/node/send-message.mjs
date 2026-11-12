// Reply to a customer in a conversation, or leave an internal note.
// Node.js 18+ (built-in fetch), no dependencies.
//   REPLYZE_API_KEY=rpz_live_... node send-message.mjs 123 "Your refund is on its way."
//   REPLYZE_API_KEY=rpz_live_... node send-message.mjs 123 "Checked with billing" --note

import { randomUUID } from 'node:crypto';

const [conversationId, text, flag] = process.argv.slice(2);
const key = process.env.REPLYZE_API_KEY;
if (!key || !conversationId || !text) {
  console.error('Usage: REPLYZE_API_KEY=... node send-message.mjs <conversation id> <text> [--note]');
  process.exit(1);
}

const res = await fetch(`https://client.replyze.chat/api/v1/conversations/${conversationId}/messages`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    // A retry with the same key returns the first answer: the message is never sent twice.
    'Idempotency-Key': randomUUID(),
  },
  body: JSON.stringify({ content: text, type: flag === '--note' ? 'note' : 'reply' }),
});

const body = await res.json();
if (!res.ok) {
  console.error(`${res.status} ${body.error?.code}: ${body.error?.message}`);
  process.exit(1);
}
console.log(`Sent message #${body.id} at ${body.created_at}`);
