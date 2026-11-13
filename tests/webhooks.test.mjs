// The webhook signature checks (examples/webhooks/ and the README's snippets) against
// examples/webhooks/test-body.json, signed the way Replyze signs it:
// "sha256=" + hex HMAC-SHA256 of the raw body, keyed with the webhook's signing secret.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { join } from 'node:path';
import {
  PHP, PYTHON, ROOT, WEBHOOK_BODY_PATH, WEBHOOK_SECRET, WEBHOOK_SIGNATURE, readmeBlock, run, webhookBody,
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
];

test('test-body.json is unchanged and gives the README vector', () => {
  assert.equal(sign(body), WEBHOOK_SIGNATURE);
});

test('Node.js: examples/webhooks/node-express/verify.js', () => {
  const { verifyReplyzeSignature, isFresh } = require('../examples/webhooks/node-express/verify.js');
  for (const [what, bytes, header, expected] of cases) {
    assert.equal(verifyReplyzeSignature(bytes, header, WEBHOOK_SECRET), expected, what);
  }
  assert.equal(verifyReplyzeSignature(body, undefined, WEBHOOK_SECRET), false, 'no header');
  const now = 1_800_000_000;
  assert.equal(isFresh(String(now - 60), 300, now), true);
  assert.equal(isFresh(String(now - 301), 300, now), false);
  assert.equal(isFresh('not a number', 300, now), false);
  assert.equal(isFresh(undefined, 300, now), false);
});

test('Python: examples/webhooks/python-flask/verify.py', () => {
  const script = `
import json, sys
sys.path.insert(0, sys.argv[1])
from verify import verify_replyze_signature, is_fresh
body = open(sys.argv[2], 'rb').read()
cases = json.loads(sys.argv[3])
out = [verify_replyze_signature(body + (b' ' if c['tampered'] else b''), c['header'], sys.argv[4]) for c in cases]
now = 1800000000
out += [is_fresh(str(now - 60), 300, now), is_fresh(str(now - 301), 300, now), is_fresh('x', 300, now), is_fresh(None, 300, now)]
print(json.dumps(out))
`;
  const json = JSON.stringify(cases.map(([, bytes, header]) => ({ tampered: bytes === tampered, header })));
  const out = JSON.parse(run(PYTHON, ['-c', script, join(ROOT, 'examples/webhooks/python-flask'), WEBHOOK_BODY_PATH, json, WEBHOOK_SECRET]));
  assert.deepEqual(out, [...cases.map((c) => c[3]), true, false, false, false]);
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
$out[] = replyze_is_fresh((string) (time() - 60));
$out[] = replyze_is_fresh((string) (time() - 301));
$out[] = replyze_is_fresh('x');
echo json_encode($out);
`;
  const json = JSON.stringify(cases.map(([, bytes, header]) => ({ tampered: bytes === tampered, header })));
  const out = JSON.parse(run(PHP, ['-r', script, '--', join(ROOT, 'examples/webhooks/php/webhook.php'), WEBHOOK_BODY_PATH, json, WEBHOOK_SECRET]));
  assert.deepEqual(out, [...cases.map((c) => c[3]), false, true, false, false]);
});

test('README snippet: Node.js', () => {
  const code = readmeBlock(HEADING, '// Node.js');
  const verify = new Function('require', `${code}\nreturn verifyReplyzeSignature;`)(require);
  for (const [what, bytes, header, expected] of cases) {
    assert.equal(verify(bytes, header, WEBHOOK_SECRET), expected, what);
  }
});

test('README snippet: Python', () => {
  const code = readmeBlock(HEADING, '# Python');
  const script = `${code}
import json, sys
body = open(sys.argv[1], 'rb').read()
cases = json.loads(sys.argv[2])
print(json.dumps([verify_replyze_signature(body + (b' ' if c['tampered'] else b''), c['header'], sys.argv[3]) for c in cases]))
`;
  const json = JSON.stringify(cases.map(([, bytes, header]) => ({ tampered: bytes === tampered, header })));
  assert.deepEqual(JSON.parse(run(PYTHON, ['-c', script, WEBHOOK_BODY_PATH, json, WEBHOOK_SECRET])), cases.map((c) => c[3]));
});

test('README snippet: PHP', () => {
  const code = readmeBlock(HEADING, '// PHP');
  const script = `${code}
$body = file_get_contents($argv[1]);
$out = [];
foreach (json_decode($argv[2], true) as $c) {
    $out[] = verify_replyze_signature($body . ($c['tampered'] ? ' ' : ''), $c['header'], $argv[3]);
}
echo json_encode($out);
`;
  const json = JSON.stringify(cases.map(([, bytes, header]) => ({ tampered: bytes === tampered, header })));
  assert.deepEqual(JSON.parse(run(PHP, ['-r', script, '--', WEBHOOK_BODY_PATH, json, WEBHOOK_SECRET])), cases.map((c) => c[3]));
});
