// A Replyze webhook receiver in Express that checks every request.
//   npm install
//   REPLYZE_WEBHOOK_SECRET=... node server.js
// Then add http(s)://<your host>/replyze/webhook in
// Settings → Integrations → Developer → Webhooks.

const express = require('express');
const { verifyReplyzeSignature, isFresh } = require('./verify');

const secret = process.env.REPLYZE_WEBHOOK_SECRET;
if (!secret) {
  console.error('Set REPLYZE_WEBHOOK_SECRET (the signing secret shown when you added the webhook).');
  process.exit(1);
}

const app = express();
// Keep events you have handled; use your database in production.
const seen = new Set();

// express.raw keeps the exact bytes: the signature is over the raw body, not re-serialized JSON.
app.post('/replyze/webhook', express.raw({ type: 'application/json', limit: '1mb' }), (req, res) => {
  if (!verifyReplyzeSignature(req.body, req.get('X-Replyze-Signature'), secret)) {
    return res.status(401).send('Bad signature');
  }
  if (!isFresh(req.get('X-Replyze-Timestamp'))) {
    return res.status(400).send('Too old');
  }
  const eventId = req.get('X-Replyze-Event-Id');
  if (seen.has(eventId)) {
    return res.sendStatus(200); // a retry of an event you already have
  }
  seen.add(eventId);

  const event = JSON.parse(req.body.toString('utf8'));
  // Answer fast; do slow work after (or in a queue).
  res.sendStatus(200);

  switch (event.event) {
    case 'message.created': {
      const m = event.data.message;
      console.log(`[${m.sender_type}] in #${m.conversation_id}: ${m.content}`);
      break;
    }
    case 'conversation.resolved':
      console.log(`Conversation #${event.data.conversation.id} resolved`);
      break;
    default:
      console.log(`${event.event}`, JSON.stringify(event.data));
  }
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Listening on http://localhost:${port}/replyze/webhook`));
