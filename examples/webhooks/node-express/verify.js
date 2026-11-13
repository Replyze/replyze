const crypto = require('crypto');

/**
 * True when X-Replyze-Signature matches the raw body: "sha256=" and the hex
 * HMAC-SHA256 of the exact bytes received, keyed with the webhook's signing
 * secret. Compared in constant time, as bytes: timingSafeEqual throws on
 * buffers of different lengths, and a header with a non-ASCII character can
 * have the right string length but more bytes. Any such header is just false.
 */
function verifyReplyzeSignature(rawBody, header, secret) {
  if (typeof header !== 'string') return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
  const received = Buffer.from(header);
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}

/**
 * True when the event's created_at (ISO 8601, from the signed body, never
 * the unsigned X-Replyze-Timestamp header) is within maxAgeSeconds of now.
 */
function isFresh(createdAt, maxAgeSeconds = 300, now = Date.now() / 1000) {
  const sent = typeof createdAt === 'string' ? Date.parse(createdAt) / 1000 : NaN;
  return Number.isFinite(sent) && Math.abs(now - sent) <= maxAgeSeconds;
}

module.exports = { verifyReplyzeSignature, isFresh };
