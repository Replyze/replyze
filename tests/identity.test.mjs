// The identity examples (examples/identity/ and the README's snippets) against the README's test vectors.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import {
  IDENTITY_SECRET, IDENTITY_HASH_ID_42, IDENTITY_HASH_JANE, PHP, PYTHON, readmeBlock, run,
} from './helpers.mjs';

const require = createRequire(import.meta.url);
const env = { REPLYZE_IDENTITY_SECRET: IDENTITY_SECRET };
const HEADING = '3. Identity verification';

test('the README vectors are HMAC-SHA256 of the id, or of the trimmed, lower-cased email', () => {
  const hmac = (subject) => createHmac('sha256', IDENTITY_SECRET).update(subject).digest('hex');
  assert.equal(hmac('42'), IDENTITY_HASH_ID_42);
  assert.equal(hmac('jane@example.com'), IDENTITY_HASH_JANE);
});

const cli = [
  ['Node.js', 'node', ['examples/identity/user-hash.js']],
  ['Python', PYTHON, ['examples/identity/user_hash.py']],
  ['PHP', PHP, ['examples/identity/user-hash.php']],
];

for (const [label, cmd, script] of cli) {
  test(`${label} example: user id`, () => {
    assert.equal(run(cmd, [...script, '42'], { env }), IDENTITY_HASH_ID_42);
  });
  test(`${label} example: user id with spaces around it`, () => {
    assert.equal(run(cmd, [...script, ' 42 '], { env }), IDENTITY_HASH_ID_42);
  });
  test(`${label} example: email when there is no user id`, () => {
    assert.equal(run(cmd, [...script, '', ' Jane@Example.com '], { env }), IDENTITY_HASH_JANE);
  });
}

test('Node.js example as a module', () => {
  const { replyzeUserHash } = require('../examples/identity/user-hash.js');
  assert.equal(replyzeUserHash(IDENTITY_SECRET, 42), IDENTITY_HASH_ID_42);
  assert.equal(replyzeUserHash(IDENTITY_SECRET, null, ' Jane@Example.com '), IDENTITY_HASH_JANE);
  assert.throws(() => replyzeUserHash(IDENTITY_SECRET, '', ''));
});

test('README snippet: Node.js', () => {
  const code = readmeBlock(HEADING, '// Node.js');
  const userHash = new Function('require', 'process', 'user', `${code}\nreturn userHash;`)(
    require, { env }, { id: 42 },
  );
  assert.equal(userHash, IDENTITY_HASH_ID_42);
});

test('README snippet: Python', () => {
  const code = readmeBlock(HEADING, '# Python');
  const script = `class user:\n    id = 42\n${code}\nprint(user_hash)\n`;
  assert.equal(run(PYTHON, ['-c', script], { env }), IDENTITY_HASH_ID_42);
});

test('README snippet: PHP', () => {
  const code = readmeBlock(HEADING, '// PHP');
  const script = `$user = (object) ['id' => 42];\n${code}\necho $userHash;`;
  assert.equal(run(PHP, ['-r', script], { env }), IDENTITY_HASH_ID_42);
});
