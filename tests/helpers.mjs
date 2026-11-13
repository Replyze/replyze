// Shared bits of the example tests (node --test tests/).
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PYTHON = process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
export const PHP = process.env.PHP || 'php';

// The test vectors documented in the README.
export const WEBHOOK_SECRET = '9f86d081884c7d659a2feaa0c55ad015';
export const WEBHOOK_BODY_PATH = join(ROOT, 'examples/webhooks/test-body.json');
export const WEBHOOK_SIGNATURE = 'sha256=912da3252eccfa6203a07400fd4a24081c10f35882012b0a50b7b12844a78979';
export const WEBHOOK_EVENT_ID = '0b9f6a52-3c1e-4d7a-9e21-5f8c2b7d1a40';

export const IDENTITY_SECRET = 'f3a1c9e07b2d4e68a5c1d9b3e7f20486a9c3e5d7f1b3a5c7e9d1f3b5a7c9e1d3';
export const IDENTITY_HASH_ID_42 = '61b4b465a57ec25065d5a3b377329c00ab8e1c5562756729d26d880f39d8ec13';
export const IDENTITY_HASH_JANE = '74baeda7d2f63e1df51c7aeea059bcf644fdca57ec0fcaba9a0f7b0e1b5eaaf9';

export function webhookBody() {
  return readFileSync(WEBHOOK_BODY_PATH);
}

/** Runs a program and returns its trimmed stdout; throws with stderr when it fails. */
export function run(cmd, args, { env = {}, cwd = ROOT, input } = {}) {
  const result = spawnSync(cmd, args, { cwd, env: { ...process.env, ...env }, input, encoding: 'utf8' });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${cmd} ${args.join(' ')} exited with ${result.status}\n${result.stderr}${result.stdout}`);
  }
  return result.stdout.trim();
}

/** The fenced code blocks of one README section ("## 3. Identity verification" up to the next "## "). */
export function readmeBlocks(heading) {
  const readme = readFileSync(join(ROOT, 'README.md'), 'utf8').replace(/\r\n/g, '\n');
  const start = readme.indexOf(`\n## ${heading}`);
  if (start < 0) throw new Error(`README has no section "## ${heading}"`);
  const end = readme.indexOf('\n## ', start + 1);
  const section = readme.slice(start, end < 0 ? undefined : end);
  return [...section.matchAll(/```(\w*)\n([\s\S]*?)```/g)].map((m) => ({ lang: m[1], code: m[2] }));
}

/** The one block of a section whose first line is `marker` (e.g. "// Node.js"). */
export function readmeBlock(heading, marker) {
  const found = readmeBlocks(heading).filter((b) => b.code.split('\n')[0].trim() === marker);
  if (found.length !== 1) throw new Error(`Expected one "${marker}" block in "${heading}", found ${found.length}`);
  return found[0].code;
}
