const crypto = require('crypto');

/**
 * True when X-Replyze-Signature matches the raw body: "sha256=" and the hex
 * HMAC-SHA256 of the exact bytes received, keyed with the webhook's signing
 * secret. Compared in constant time.
 */
function verifyReplyzeSignature(rawBody, header, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(header || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** True when X-Replyze-Timestamp (Unix seconds) is within maxAgeSeconds of now. */
function isFresh(timestampHeader, maxAgeSeconds = 300, now = Date.now() / 1000) {
  const ts = Number(timestampHeader);
  return Number.isFinite(ts) && Math.abs(now - ts) <= maxAgeSeconds;
}

module.exports = { verifyReplyzeSignature, isFresh };
