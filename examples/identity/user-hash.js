// The user_hash for Replyze.identify(), computed on your server.
// Node.js, no dependencies.
//
//   REPLYZE_IDENTITY_SECRET=... node user-hash.js 42
//   REPLYZE_IDENTITY_SECRET=... node user-hash.js "" jane@example.com

const crypto = require('crypto');

/**
 * Hex HMAC-SHA256 under the widget's identity secret (Settings → Chat Widget →
 * Identity) of the user's id, or, for a user without one, of their email in
 * lower case and trimmed.
 */
function replyzeUserHash(secret, userId, email) {
  const id = userId === undefined || userId === null ? '' : String(userId).trim();
  const subject = id !== '' ? id : String(email || '').trim().toLowerCase();
  if (!subject) throw new Error('Sign a user id or an email.');
  return crypto.createHmac('sha256', secret).update(subject).digest('hex');
}

module.exports = { replyzeUserHash };

if (require.main === module) {
  const secret = process.env.REPLYZE_IDENTITY_SECRET;
  if (!secret) {
    console.error('Set REPLYZE_IDENTITY_SECRET.');
    process.exit(1);
  }
  console.log(replyzeUserHash(secret, process.argv[2], process.argv[3]));
}
