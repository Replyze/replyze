// The webhook signature checks (examples/webhooks/ and the README's snippets) against
// examples/webhooks/test-body.json, signed the way Replyze signs it:
// "sha256=" + hex HMAC-SHA256 of the raw body, keyed with the webhook's signing secret.
// And the age checks, which read the signed body's created_at (ISO 8601), never a header.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import {
  PHP, PYTHON, ROOT, WEBHOOK_BODY_PATH, WEBHOOK_SECRET, WEBHOOK_SIGNATURE, isoTime, readmeBlock, run, webhookBody,
} from './helpers.mjs';

const require = createRequire(import.meta.url);
const HEADING = '5. Webhooks';
const body = webhookBody();
const tampered = Buffer.concat([body, Buffer.from(' ')]);
const sign = (bytes, secret = WEBHOOK_SECRET) => 'sha256=' + createHmac('sha256', secret).update(bytes).digest('hex');

// [description, body, header, expected]
const cases = [
  ['the right signature', body, WEBHOOK_SIGNATURE, true],
  ['a signature made with another secret', body, sign(body, 'not-the-secret'), false],
  ['a changed body', tampered, WEBHOOK_SIGNATURE, false],
  ['the bare hex without "sha256="', body, WEBHOOK_SIGNATURE.slice(7), false],
  ['an empty header', body, '', false],
  // As long as a real signature in characters, longer in bytes: a string-length check passes
  // it on to timingSafeEqual, which throws; compare_digest throws on non-ASCII str.
  ['a non-ASCII header as long as a signature', body, WEBHOOK_SIGNATURE.slice(0, -1) + 'é', false],
  ['the right signature with a non-ASCII character added', body, WEBHOOK_SIGNATURE + 'é', false],
];

// JSON with every non-ASCII character escaped: safe in a Windows command line, where PHP reads argv in the ANSI code page.
const asciiJson = (value) => JSON.stringify(value).replace(/[\u0080-￿]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const casesJson = asciiJson(cases.map(([, bytes, header]) => ({ tampered: bytes === tampered, header })));

// The age checks get a fixed "now"; created_at is Laravel's toISOString(): microseconds and "Z".
const NOW = 1_800_000_000;
const ageCases = [
  ['a minute old', isoTime(NOW - 60), true],
  ['a minute in the future (clock skew)', isoTime(NOW + 60), true],
  ['301 seconds old', isoTime(NOW - 301), false],
  ['an hour old', isoTime(NOW - 3600), false],
  ['without microseconds', new Date((NOW - 60) * 1000).toISOString().replace(/\.\d+Z$/, 'Z'), true],
  ['Unix seconds (the header format) instead of ISO 8601', String(NOW), false],
  ['not a date', 'not a date', false],
  ['an empty string', '', false],
  ['missing', null, false],
];
const ageJson = asciiJson(ageCases.map((c) => c[1]));
const ageExpected = ageCases.map((c) => c[2]);

test('test-body.json is unchanged and gives the README vector', () => {
  assert.equal(sign(body), WEBHOOK_SIGNATURE);
});

test('Node.js: examples/webhooks/node-express/verify.js', () => {
  const { verifyReplyzeSignature, isFresh } = require('../examples/webhooks/node-express/verify.js');
  for (const [what, bytes, header, expected] of cases) {
    assert.equal(verifyReplyzeSignature(bytes, header, WEBHOOK_SECRET), expected, what);
  }
  assert.equal(verifyReplyzeSignature(body, undefined, WEBHOOK_SECRET), false, 'no header');
  assert.equal(verifyReplyzeSignature(body, [WEBHOOK_SIGNATURE], WEBHOOK_SECRET), false, 'an array');
  for (const [what, createdAt, expected] of ageCases) {
    assert.equal(isFresh(createdAt ?? undefined, 300, NOW), expected, what);
  }
  assert.equal(isFresh(NOW, 300, NOW), false, 'a number');
});

test('Python: examples/webhooks/python-flask/verify.py', () => {
  const script = `
import json, sys
sys.path.insert(0, sys.argv[1])
from verify import verify_replyze_signature, is_fresh
body = open(sys.argv[2], 'rb').read()
cases = json.loads(sys.argv[3])
out = [verify_replyze_signature(body + (b' ' if c['tampered'] else b''), c['header'], sys.argv[4]) for c in cases]
out += [verify_replyze_signature(body, None, sys.argv[4]), verify_replyze_signature(body, [sys.argv[5]], sys.argv[4])]
out += [verify_replyze_signature(body, sys.argv[5].encode(), sys.argv[4]), verify_replyze_signature(body, b'sha256=\\xff', sys.argv[4])]
out += [is_fresh(c, 300, ${NOW}) for c in json.loads(sys.argv[6])] + [is_fresh(${NOW}, 300, ${NOW})]
print(json.dumps(out))
`;
  const out = JSON.parse(run(PYTHON, ['-c', script, join(ROOT, 'examples/webhooks/python-flask'), WEBHOOK_BODY_PATH, casesJson, WEBHOOK_SECRET, WEBHOOK_SIGNATURE, ageJson]));
  assert.deepEqual(out, [...cases.map((c) => c[3]), false, false, true, false, ...ageExpected, false]);
});

test('PHP: examples/webhooks/php/webhook.php', () => {
  const script = `
require $argv[1];
$body = file_get_contents($argv[2]);
$out = [];
foreach (json_decode($argv[3], true) as $c) {
    $out[] = verify_replyze_signature($body . ($c['tampered'] ? ' ' : ''), $c['header'], $argv[4]);
}
$out[] = verify_replyze_signature($body, null, $argv[4]);
$out[] = verify_replyze_signature($body, [$argv[5]], $argv[4]);
$out[] = verify_replyze_signature($body, 42, $argv[4]);
foreach (json_decode($argv[6], true) as $createdAt) {
    $out[] = replyze_is_fresh($createdAt, 300, ${NOW});
}
$out[] = replyze_is_fresh(${NOW}, 300, ${NOW});
$out[] = replyze_is_fresh('now', 300, ${NOW});
echo json_encode($out);
`;
  const out = JSON.parse(run(PHP, ['-r', script, '--', join(ROOT, 'examples/webhooks/php/webhook.php'), WEBHOOK_BODY_PATH, casesJson, WEBHOOK_SECRET, WEBHOOK_SIGNATURE, ageJson]));
  assert.deepEqual(out, [...cases.map((c) => c[3]), false, false, false, ...ageExpected, false, false]);
});

// The README's snippets use the real clock, so their times are relative to now.
const readmeAgeCases = () => {
  const now = Date.now() / 1000;
  return [
    ['a minute old', isoTime(now - 60), true],
    ['an hour old', isoTime(now - 3600), false],
    ['Unix seconds (the header format)', String(Math.floor(now)), false],
    ['not a date', 'not a date', false],
    ['missing', null, false],
  ];
};

test('README snippet: Node.js', () => {
  const code = readmeBlock(HEADING, '// Node.js');
  const { verify, isFresh } = new Function('require', `${code}\nreturn { verify: verifyReplyzeSignature, isFresh };`)(require);
  for (const [what, bytes, header, expected] of cases) {
    assert.equal(verify(bytes, header, WEBHOOK_SECRET), expected, what);
  }
  assert.equal(verify(body, undefined, WEBHOOK_SECRET), false, 'no header');
  for (const [what, createdAt, expected] of readmeAgeCases()) {
    assert.equal(isFresh(createdAt ?? undefined), expected, what);
  }
});

test('README snippet: Python', () => {
  const code = readmeBlock(HEADING, '# Python');
  const script = `${code}
import json, sys
body = open(sys.argv[1], 'rb').read()
cases = json.loads(sys.argv[2])
out = [verify_replyze_signature(body + (b' ' if c['tampered'] else b''), c['header'], sys.argv[3]) for c in cases]
out += [verify_replyze_signature(body, None, sys.argv[3])]
out += [is_fresh(c) for c in json.loads(sys.argv[4])]
print(json.dumps(out))
`;
  const age = readmeAgeCases();
  const out = JSON.parse(run(PYTHON, ['-c', script, WEBHOOK_BODY_PATH, casesJson, WEBHOOK_SECRET, asciiJson(age.map((c) => c[1]))]));
  assert.deepEqual(out, [...cases.map((c) => c[3]), false, ...age.map((c) => c[2])]);
});

test('README snippet: PHP', () => {
  const code = readmeBlock(HEADING, '// PHP');
  const script = `${code}
$body = file_get_contents($argv[1]);
$out = [];
foreach (json_decode($argv[2], true) as $c) {
    $out[] = verify_replyze_signature($body . ($c['tampered'] ? ' ' : ''), $c['header'], $argv[3]);
}
$out[] = verify_replyze_signature($body, null, $argv[3]);
$out[] = verify_replyze_signature($body, ['x'], $argv[3]);
foreach (json_decode($argv[4], true) as $createdAt) {
    $out[] = replyze_is_fresh($createdAt);
}
echo json_encode($out);
`;
  const age = readmeAgeCases();
  const out = JSON.parse(run(PHP, ['-r', script, '--', WEBHOOK_BODY_PATH, casesJson, WEBHOOK_SECRET, asciiJson(age.map((c) => c[1]))]));
  assert.deepEqual(out, [...cases.map((c) => c[3]), false, false, ...age.map((c) => c[2])]);
});
