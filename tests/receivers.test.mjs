// End to end: starts the Express, Flask and PHP receivers and sends them events the way
// Replyze does, plus the requests an attacker could make. Runs with RUN_RECEIVERS=1, after
//   (cd examples/webhooks/node-express && npm install)
//   pip install -r examples/webhooks/python-flask/requirements.txt
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { createHmac, randomUUID } from 'node:crypto';
import { request } from 'node:http';
import { createServer } from 'node:net';
import { join } from 'node:path';
import {
  PHP, PYTHON, ROOT, WEBHOOK_EVENT_ID, WEBHOOK_SECRET, WEBHOOK_SIGNATURE, isoTime, readmeBlock, webhookBody,
} from './helpers.mjs';

const enabled = process.env.RUN_RECEIVERS === '1';
const sign = (bytes) => 'sha256=' + createHmac('sha256', WEBHOOK_SECRET).update(bytes).digest('hex');
const nowSeconds = () => Math.floor(Date.now() / 1000);

function freePort() {
  return new Promise((resolve, reject) => {
    const srv = createServer();
    srv.once('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function waitFor(url, child, log) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`The receiver exited (${child.exitCode}):\n${log()}`);
    try {
      await fetch(url, { method: 'GET' });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 100));
    }
  }
  throw new Error(`The receiver did not start:\n${log()}`);
}

async function until(check, what, log) {
  for (let i = 0; i < 50; i++) {
    if (check()) return;
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(`Timed out waiting for ${what}:\n${log()}`);
}

/** A message.created event made now (or `ageSeconds` ago), with its body and signature. */
function makeEvent(content, ageSeconds = 0) {
  const body = Buffer.from(JSON.stringify({
    id: randomUUID(),
    event: 'message.created',
    created_at: isoTime(Date.now() / 1000 - ageSeconds),
    workspace_id: 1,
    data: { message: { id: 501, conversation_id: 88, sender_type: 'visitor', content } },
  }));
  return { body, signature: sign(body) };
}

/**
 * POSTs `body` with Replyze's headers; a header set to undefined is left out. node:http rather than
 * fetch: it sends header strings byte for byte (latin1), so a test can put any byte in a header.
 */
function send(url, body, headers = {}) {
  const all = {
    'Content-Type': 'application/json',
    'User-Agent': 'Replyze-Webhooks/1.0',
    'X-Replyze-Event': 'message.created',
    'X-Replyze-Event-Id': randomUUID(),
    'X-Replyze-Timestamp': String(nowSeconds()),
    ...headers,
  };
  for (const k of Object.keys(all)) if (all[k] === undefined) delete all[k];
  return new Promise((resolve, reject) => {
    const req = request(url, { method: 'POST', headers: all }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (d) => { text += d; });
      res.on('end', () => resolve({ status: res.statusCode, text }));
    });
    req.on('error', reject);
    req.end(body);
  });
}

const count = (haystack, needle) => haystack.split(needle).length - 1;

const receivers = [
  {
    name: 'Express (examples/webhooks/node-express)',
    cwd: join(ROOT, 'examples/webhooks/node-express'),
    start: (port) => ['node', ['server.js'], { PORT: String(port) }],
    path: '/replyze/webhook',
  },
  {
    name: 'Flask (examples/webhooks/python-flask)',
    cwd: join(ROOT, 'examples/webhooks/python-flask'),
    start: (port) => [PYTHON, ['-m', 'flask', '--app', 'app', 'run', '--host', '127.0.0.1', '--port', String(port)], { PYTHONUNBUFFERED: '1' }],
    path: '/replyze/webhook',
  },
  {
    name: 'plain PHP (examples/webhooks/php)',
    cwd: join(ROOT, 'examples/webhooks/php'),
    start: (port) => [PHP, ['-S', `127.0.0.1:${port}`, 'webhook.php'], {}],
    path: '/',
  },
];

for (const r of receivers) {
  test(r.name, { skip: !enabled && 'set RUN_RECEIVERS=1 to start the receivers' }, async (t) => {
    const port = await freePort();
    const [cmd, args, env] = r.start(port);
    const child = spawn(cmd, args, { cwd: r.cwd, env: { ...process.env, ...env, REPLYZE_WEBHOOK_SECRET: WEBHOOK_SECRET } });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    const log = () => output;
    const url = `http://127.0.0.1:${port}${r.path}`;
    const run = randomUUID().slice(0, 8);
    try {
      await waitFor(url, child, log);

      await t.test('a signed event is handled once, however its unsigned headers change', async () => {
        const first = makeEvent(`first ${run}`);
        const ok = await send(url, first.body, { 'X-Replyze-Signature': first.signature });
        assert.equal(ok.status, 200, `signed request: ${ok.text}\n${output}`);
        const retry = await send(url, first.body, { 'X-Replyze-Signature': first.signature });
        assert.equal(retry.status, 200, 'a retry is acknowledged');
        const renamed = await send(url, first.body, {
          'X-Replyze-Signature': first.signature,
          'X-Replyze-Event-Id': randomUUID(),
          'X-Replyze-Timestamp': String(nowSeconds() + 1),
        });
        assert.equal(renamed.status, 200, 'the same body with a new X-Replyze-Event-Id is still a duplicate');

        // Headers are conveniences: missing or junk, the signed event still goes through.
        const second = makeEvent(`second ${run}`);
        const junk = await send(url, second.body, {
          'X-Replyze-Signature': second.signature,
          'X-Replyze-Timestamp': 'not-a-number',
          'X-Replyze-Event-Id': undefined,
        });
        assert.equal(junk.status, 200, `a non-numeric X-Replyze-Timestamp is no 500: ${junk.text}`);

        // Logs come in order, so once the second event is printed the first one's lines are all there.
        await until(() => output.includes(`second ${run}`), 'the second event in the log', log);
        assert.equal(count(output, `first ${run}`), 1, `the first event was handled once:\n${output}`);
        assert.equal(count(output, `second ${run}`), 1);
      });

      await t.test('a wrong, missing or non-ASCII signature gets 401, not 500', async () => {
        const e = makeEvent(`unsigned ${run}`);
        const signatures = {
          'a signature of another body': WEBHOOK_SIGNATURE,
          'all zeros': 'sha256=' + '0'.repeat(64),
          'empty': '',
          'missing': undefined,
          // As many characters as a real signature, one byte more once read as UTF-8.
          'a latin1 byte (0xE9) at the end': e.signature.slice(0, -1) + 'é',
          // The UTF-8 bytes of "é" (C3 A9): as many bytes as a real signature on the wire.
          'UTF-8 bytes at the end': e.signature.slice(0, -2) + 'Ã©',
          'the right signature plus a non-ASCII byte': e.signature + 'ÿ',
        };
        for (const [what, signature] of Object.entries(signatures)) {
          const res = await send(url, e.body, { 'X-Replyze-Signature': signature });
          assert.equal(res.status, 401, `${what}: ${res.status} ${res.text}\n${output}`);
        }
        assert.equal(count(output, `unsigned ${run}`), 0, 'none of them was handled');
      });

      await t.test('a replayed old body gets 400, whatever its headers say', async () => {
        // test-body.json is a real, correctly signed event from 2026-11-12: a captured request.
        for (const eventId of [randomUUID(), randomUUID(), WEBHOOK_EVENT_ID]) {
          const res = await send(url, webhookBody(), {
            'X-Replyze-Signature': WEBHOOK_SIGNATURE,
            'X-Replyze-Event-Id': eventId,
            'X-Replyze-Timestamp': String(nowSeconds()),
          });
          assert.equal(res.status, 400, `replay with fresh headers: ${res.status} ${res.text}`);
        }
        const old = makeEvent(`old ${run}`, 3600);
        const res = await send(url, old.body, { 'X-Replyze-Signature': old.signature });
        assert.equal(res.status, 400, 'a correctly signed event an hour old');
        assert.equal(count(output, `old ${run}`), 0, 'not handled');
      });

      await t.test('the README\'s "Send a signed test event" command gets 200', () => {
        const code = readmeBlock('5. Webhooks', '# Send a signed test event')
          .replace('http://localhost:3000/replyze/webhook', url);
        assert.ok(code.includes(url), 'the README block posts to localhost:3000/replyze/webhook');
        const result = spawnSync('bash', ['-c', code], { encoding: 'utf8' });
        assert.equal(result.status, 0, result.stderr);
        assert.match(result.stdout, /^HTTP\/1\.[01] 200/, `${result.stdout}\n${output}`);
      });
    } finally {
      child.kill();
    }
  });
}
