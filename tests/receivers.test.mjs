// End to end: starts the Express, Flask and PHP receivers and sends them the test body,
// signed and unsigned, as Replyze would. Runs with RUN_RECEIVERS=1, after
//   (cd examples/webhooks/node-express && npm install)
//   pip install -r examples/webhooks/python-flask/requirements.txt
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { join } from 'node:path';
import {
  PHP, PYTHON, ROOT, WEBHOOK_EVENT_ID, WEBHOOK_SECRET, WEBHOOK_SIGNATURE, webhookBody,
} from './helpers.mjs';

const enabled = process.env.RUN_RECEIVERS === '1';
const body = webhookBody();

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

function send(url, { signature = WEBHOOK_SIGNATURE, timestamp = Math.floor(Date.now() / 1000), eventId = WEBHOOK_EVENT_ID } = {}) {
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'Replyze-Webhooks/1.0',
      'X-Replyze-Event': 'message.created',
      'X-Replyze-Event-Id': eventId,
      'X-Replyze-Timestamp': String(timestamp),
      'X-Replyze-Signature': signature,
    },
    body,
  });
}

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
    start: (port) => [PYTHON, ['-m', 'flask', '--app', 'app', 'run', '--host', '127.0.0.1', '--port', String(port)], {}],
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
  test(r.name, { skip: !enabled && 'set RUN_RECEIVERS=1 to start the receivers' }, async () => {
    const port = await freePort();
    const [cmd, args, env] = r.start(port);
    const child = spawn(cmd, args, { cwd: r.cwd, env: { ...process.env, ...env, REPLYZE_WEBHOOK_SECRET: WEBHOOK_SECRET } });
    let output = '';
    child.stdout.on('data', (d) => { output += d; });
    child.stderr.on('data', (d) => { output += d; });
    const url = `http://127.0.0.1:${port}${r.path}`;
    try {
      await waitFor(url, child, () => output);

      const ok = await send(url);
      assert.equal(ok.status, 200, `signed request: ${await ok.text()}\n${output}`);
      const again = await send(url);
      assert.equal(again.status, 200, 'the same event again (a retry) is acknowledged');

      const badSignature = await send(url, { signature: 'sha256=' + '0'.repeat(64) });
      assert.equal(badSignature.status, 401, 'a wrong signature is refused');
      const unsigned = await send(url, { signature: '' });
      assert.equal(unsigned.status, 401, 'an unsigned request is refused');

      const stale = await send(url, { timestamp: Math.floor(Date.now() / 1000) - 3600, eventId: '11111111-2222-4333-8444-555555555555' });
      assert.equal(stale.status, 400, 'a request an hour old is refused');
    } finally {
      child.kill();
    }
  });
}
