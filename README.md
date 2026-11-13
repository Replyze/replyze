<p align="center">
  <a href="https://replyze.chat/?utm_source=github&utm_medium=referral&utm_campaign=replyze">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/Replyze/.github/main/assets/logo-on-dark.png">
      <img src="https://raw.githubusercontent.com/Replyze/.github/main/assets/logo-on-light.png" alt="Replyze" height="48">
    </picture>
  </a>
</p>

# Replyze developer docs: live chat widget, JavaScript API, REST API and webhooks

[Replyze](https://replyze.chat/?utm_source=github&utm_medium=referral&utm_campaign=replyze) is AI customer support for your website: an AI agent that answers from your knowledge base and hands the chat to your team when it should, live chat on your site, and one shared inbox for web chat, email, WhatsApp and Telegram (Messenger and Instagram are in beta). This repository is the developer reference: how to embed the chat widget, control it from JavaScript, verify signed-in users, use the REST API, receive webhooks and connect AI agents over MCP. Every example in [`examples/`](examples/) runs as is.

**[Create a free account](https://client.replyze.chat/register?utm_source=github&utm_medium=referral&utm_campaign=replyze&utm_content=cta-top)** · [Live demo](https://replyze.chat/?utm_source=github&utm_medium=referral&utm_campaign=replyze&utm_content=live-demo) · [OpenAPI spec](openapi.json)

## Quickstart: your first API call

1. **Get an API key.** [Create a free account](https://client.replyze.chat/register?utm_source=github&utm_medium=referral&utm_campaign=replyze&utm_content=quickstart), open **Settings → Integrations → Developer** and create a key with the `conversations:read` scope. The key starts with `rpz_live_` and is shown once. Whether a workspace has the REST API depends on its plan ([pricing](https://replyze.chat/pricing?utm_source=github&utm_medium=referral&utm_campaign=replyze&utm_content=quickstart)); without it, calls answer `403 plan_required`.
2. **Check the key.**

   ```bash
   export REPLYZE_API_KEY=rpz_live_...
   curl https://client.replyze.chat/api/v1/me -H "Authorization: Bearer $REPLYZE_API_KEY"
   ```

   The answer names the key, its scopes and its workspace:

   ```json
   {"object":"api_key","id":7,"name":"My first key","prefix":"rpz_live_AbC123","scopes":["conversations:read"],"expires_at":null,"workspace":{"id":1,"name":"Acme"}}
   ```

3. **List your open conversations.**

   ```bash
   curl "https://client.replyze.chat/api/v1/conversations?status=open&limit=5" -H "Authorization: Bearer $REPLYZE_API_KEY"
   ```

Next: [send a reply](#examples) from Node.js, Python or PHP, [receive webhooks](#5-webhooks), or [put the chat on your site](#1-add-the-chat-widget-to-your-site). The live demo is replyze.chat itself: the chat bubble in the bottom-right corner is the Replyze widget.

## Contents

1. [Add the chat widget to your site](#1-add-the-chat-widget-to-your-site)
2. [JavaScript API](#2-javascript-api)
3. [Identity verification](#3-identity-verification)
4. [REST API](#4-rest-api)
5. [Webhooks](#5-webhooks)
6. [MCP server for AI agents](#6-mcp-server-for-ai-agents)
7. [More from Replyze](#more-from-replyze)
8. [Development](#development)

## 1. Add the chat widget to your site

Paste this before `</body>` on every page. Your widget token (`wgt_...`) is in the dashboard under **Settings → Integrations → Install widget**, which also shows this snippet with your token filled in.

```html
<script>
  window.ReplyzeConfig = {
    token: 'wgt_YOUR_TOKEN_HERE',
    apiUrl: 'https://client.replyze.chat'
  };
</script>
<script src="https://cdn.replyze.chat/widget.js" async></script>
```

The script loads asynchronously, so it doesn't hold up your page. A full page with the JavaScript API wired up is in [`examples/widget/index.html`](examples/widget/index.html).

Where the snippet goes on WordPress, Shopify, Wix, Webflow, Google Tag Manager, React, Laravel and other platforms, with a troubleshooting list (allowed domains, Content-Security-Policy, ad blockers): [add-live-chat-to-website](https://github.com/Replyze/add-live-chat-to-website). Packages that do it for you: [React and Next.js](https://github.com/Replyze/react-live-chat), [Vue and Nuxt](https://github.com/Replyze/vue-live-chat), [WordPress](https://github.com/Replyze/wordpress-live-chat), [React Native and Expo](https://github.com/Replyze/react-native-live-chat), [Flutter](https://github.com/Replyze/flutter-live-chat).

### Options

| `window.ReplyzeConfig` | What it does |
|---|---|
| `token` | Your widget token. Required. |
| `apiUrl` | The Replyze API. `https://client.replyze.chat` (the default). |
| `language` | The chat's interface language (`"de"`, `"pt-BR"`, `"ar"`...), over the visitor's browser and the widget settings. |
| `tracking` | `false` turns off visitor tracking (the visitor cookie, page views and heartbeats), for example until the visitor accepts analytics cookies. The chat works either way. Turn it on later with `Replyze.setTracking(true)`. |
| `overrides` | Look and behaviour set from your page, each one over the dashboard's widget settings: `color` (`"#1eabd2"` or `rgb(...)`), `position` (`"bottom_left"` or `"bottom_right"`), `theme` (`"light"` or `"dark"`), `bot_name`, `bot_avatar` (an https URL), `welcome_message`, `show_greeting_teaser` (true/false), `auto_open_delay` (seconds, 0 to 300). A value that doesn't fit is ignored. |

### Without an inline script

If your Content Security Policy doesn't allow inline scripts, put the settings on the script tag:

```html
<script src="https://cdn.replyze.chat/widget.js"
        data-token="wgt_YOUR_TOKEN_HERE"
        data-api-url="https://client.replyze.chat"
        data-language="en"
        async></script>
```

`data-tracking="false"` turns off visitor tracking, as `tracking: false` does above.

## 2. JavaScript API

Once the script has loaded, `window.Replyze` controls the widget.

| Method | What it does |
|---|---|
| `Replyze.open()` / `close()` / `toggle()` | Open, close or toggle the chat window |
| `Replyze.show()` / `hide()` | Show or hide the launcher and the chat; the widget keeps running while hidden |
| `Replyze.identify(email, name)` | Tell the chat who the visitor is |
| `Replyze.identify({ user_id, email, name, user_hash })` | The same for a signed-in user, verified with a signature from your server: see [Identity verification](#3-identity-verification) |
| `Replyze.setUser({ email, name, data })` | Name and email, plus custom data in `data` |
| `Replyze.setData({ plan: 'pro', seats: 12 })` | Custom data on the visitor's contact: text, numbers, true/false, or `null` to remove a key. Keys that match a contact field fill it; others are kept as extra data. Up to 50 keys at a time. |
| `Replyze.pushEvent('Signed up', { plan: 'pro' })` | An event on the visitor's timeline in the inbox, with the page it happened on. Names are 1 to 64 characters. |
| `Replyze.setLanguage('de')` | The chat's interface language, over the browser's and the widget settings |
| `Replyze.sendMessage('Hi!')` | Send a message as the visitor |
| `Replyze.openArticle(12)` | Open the widget on a help article (the widget needs its Home or Help tab) |
| `Replyze.setTracking(false)` | Turn visitor tracking off or on, for example from a cookie banner |
| `Replyze.reset()` | The visitor signed out of your site: forget them (chat, contact, visitor cookie). The next chat starts as a new visitor. |
| `Replyze.on(event, callback)` / `off(event, callback)` | Listen to the events below |

### Events

| Event | When | Callback gets |
|---|---|---|
| `ready` | The widget has started. It fires before `window.Replyze` exists, so a listener added with `on()` never hears it: to run code once the widget is there, queue the call (see below), because queued calls run right after the start | nothing |
| `open` / `close` | The chat window opened or closed | nothing |
| `message:sent` | The visitor sent a message | `{ text }`, or `{ file }` for an upload |
| `message:received` | A reply arrived from the AI or the team | the message |
| `identified` | `identify()` went through | `{ verified }`: true when the signature checked out |
| `reset` | `reset()` finished | nothing |
| `unread` | The unread count changed (the launcher's badge) | the count |

```js
Replyze.on('unread', (count) => {
  document.querySelector('#help-badge').textContent = count || '';
});
```

### Calls before the script has loaded

The script is `async`, so `window.Replyze` doesn't exist for the first moments. Calls made earlier can wait in a queue that the widget runs when it starts:

```html
<script>
  window.ReplyzeConfig = { token: 'wgt_YOUR_TOKEN_HERE', apiUrl: 'https://client.replyze.chat' };
  window.Replyze = window.Replyze || { _queue: [] };
</script>
<script src="https://cdn.replyze.chat/widget.js" async></script>
<script>
  // Runs the call now if the widget is there, else queues it.
  function replyze(method, ...args) {
    if (window.Replyze && window.Replyze._initialized) window.Replyze[method](...args);
    else window.Replyze._queue.push([method, ...args]);
  }

  replyze('on', 'open', () => console.log('The chat was opened'));
  replyze('identify', 'jane@example.com', 'Jane Doe');
</script>
```

## 3. Identity verification

Without verification, `identify()` only labels the visitor. With it, a signed-in user of your site becomes the same contact on every device and browser, marked as verified in the inbox, and nobody can chat as someone else by calling `identify()` with their email.

1. Turn it on in **Settings → Chat Widget → Identity** (owners and admins). Copy the secret it creates and keep it on your server only.
2. When a user is signed in, your server computes `user_hash`: the hex HMAC-SHA256 of the user's id as a string, keyed with the secret. A user without an id is signed by their email in lower case, without spaces around it.
3. The page passes it to the widget:

```js
Replyze.identify({
  user_id: '42',                 // the same id you signed
  email: 'jane@example.com',
  name: 'Jane Doe',
  user_hash: '<the signature from your server>',
});
```

4. When the user signs out, call `Replyze.reset()` so the next person on that computer starts fresh.

A wrong `user_hash` changes nothing: the widget stays the anonymous visitor it was. With verification turned on, an `identify()` that has a `user_id` but no valid `user_hash` is refused.

**On the server**

```js
// Node.js
const crypto = require('crypto');
const userHash = crypto.createHmac('sha256', process.env.REPLYZE_IDENTITY_SECRET)
  .update(String(user.id))
  .digest('hex');
```

```python
# Python
import hashlib, hmac, os
user_hash = hmac.new(os.environ["REPLYZE_IDENTITY_SECRET"].encode(), str(user.id).encode(), hashlib.sha256).hexdigest()
```

```php
// PHP
$userHash = hash_hmac('sha256', (string) $user->id, getenv('REPLYZE_IDENTITY_SECRET'));
```

Runnable versions with the email fallback are in [`examples/identity/`](examples/identity/). Check your code against this test vector (the secret is made up):

| Secret | Signed | `user_hash` |
|---|---|---|
| `f3a1c9e07b2d4e68a5c1d9b3e7f20486a9c3e5d7f1b3a5c7e9d1f3b5a7c9e1d3` | user id `42` | `61b4b465a57ec25065d5a3b377329c00ab8e1c5562756729d26d880f39d8ec13` |
| same | email ` Jane@Example.com ` (no id) | `74baeda7d2f63e1df51c7aeea059bcf644fdca57ec0fcaba9a0f7b0e1b5eaaf9` |

## 4. REST API

The REST API reads and changes one workspace: conversations and messages, contacts, the knowledge base and analytics. Whether your workspace has it depends on its plan ([pricing](https://replyze.chat/pricing?utm_source=github&utm_medium=referral&utm_campaign=replyze)); without it, calls answer `403 plan_required`.

- **Base URL:** `https://client.replyze.chat/api/v1`
- **Authentication:** an API key, sent as `Authorization: Bearer rpz_live_...` (or as `X-Api-Key: rpz_live_...`). Owners and admins make keys in **Settings → Integrations → Developer**, with the scopes the key needs. A key acts as the workspace, not as a person; it is shown once and can be revoked at any time.
- **Spec:** [`openapi.json`](openapi.json) (OpenAPI 3.1), the same document as `https://client.replyze.chat/api/v1/openapi.json`. Import it into Postman, Insomnia or an OpenAPI code generator.

```bash
curl "https://client.replyze.chat/api/v1/conversations?status=open" \
  -H "Authorization: Bearer $REPLYZE_API_KEY"
```

### Scopes

| Scope | Allows |
|---|---|
| `conversations:read` | Read conversations, their messages and notes, the team and the tags |
| `conversations:write` | Start conversations, send replies and internal notes, assign, resolve, reopen and tag |
| `contacts:read` | Read contacts |
| `contacts:write` | Create and update contacts |
| `knowledge:read` | Read knowledge base articles and categories, search the knowledge the AI answers from |
| `knowledge:write` | Create and update articles and categories |
| `analytics:read` | Read the analytics summary |

A write scope includes the read scope of the same resource.

### Endpoints

| Method | Path | What it does |
|---|---|---|
| GET | `/me` | The API key and its scopes |
| GET | `/agents` | The teammates |
| GET | `/tags` | The tags |
| GET | `/conversations` | List conversations (filters: `status`, `channel`, `contact_id`, `assigned_agent_id`, `unassigned`, `team_id`, `tag_id`, `q`, `created_since`, `updated_since`) |
| POST | `/conversations` | Start a conversation with a contact |
| GET | `/conversations/{id}` | One conversation |
| POST | `/conversations/{id}/assign` | Assign it to a teammate or a team |
| POST | `/conversations/{id}/resolve` | Resolve it |
| POST | `/conversations/{id}/reopen` | Reopen it |
| POST | `/conversations/{id}/tags` | Tag it |
| DELETE | `/conversations/{id}/tags/{tagId}` | Remove a tag |
| GET | `/conversations/{id}/messages` | Its messages, oldest first |
| POST | `/conversations/{id}/messages` | Send a reply (`"type": "reply"`) or an internal note (`"type": "note"`) |
| GET | `/conversations/{id}/messages/{messageId}` | One message |
| GET | `/contacts` | List contacts |
| POST | `/contacts` | Create a contact |
| GET / PATCH | `/contacts/{id}` | Read or update a contact |
| GET / POST | `/articles` | List or create knowledge base articles |
| GET / PATCH | `/articles/{id}` | Read or update an article |
| GET / POST | `/categories` | List or create categories |
| GET / PATCH | `/categories/{id}` | Read or update a category |
| GET | `/knowledge/search?q=...` | Search everything the AI answers from |
| GET | `/analytics/summary` | The Analytics page's headline numbers |

### Conventions

- **JSON in, JSON out.** Every object has an `object` field naming its type. Times are ISO 8601 in UTC.
- **Pagination.** Lists answer `{ "object": "list", "data": [...], "has_more": true, "next_cursor": "..." }`. Pass `cursor=<next_cursor>` for the next page and `limit` (1 to 100; default 25, and 50 for a conversation's messages) for its size. Lists are newest first, except a conversation's messages, which are oldest first. `updated_since` returns only what changed since then, for syncing.
- **Errors.** `{ "error": { "code": "...", "message": "...", "details": { ... } } }`:

  | Status | `code` |
  |---|---|
  | 400 | `bad_request` |
  | 401 | `missing_api_key`, `invalid_api_key`, `api_key_revoked`, `api_key_expired` |
  | 403 | `insufficient_scope` (the scope in `details.required_scope`), `plan_required`, `workspace_suspended` |
  | 404 | `not_found`: no such record in this workspace (another workspace's records are "not found" too), or no such endpoint |
  | 405 | `method_not_allowed` |
  | 409 | `contact_exists` (the contact in `details.contact_id`), `idempotency_in_progress` |
  | 422 | `validation_failed` (`details.errors` per field), `idempotency_key_reused` |
  | 429 | `rate_limited` (`details.retry_after` in seconds) |
  | 500 | `server_error` |

- **Idempotency.** Send `Idempotency-Key: <a unique value>` (up to 255 characters) with a POST. Sent again with the same key within 24 hours, it returns the first answer (with `Idempotent-Replayed: true`) instead of doing it twice, so a retry never sends a message twice. The same key with a different request is refused (`422 idempotency_key_reused`), and so is a retry while the first request is still running (`409 idempotency_in_progress`). Server errors, `409` and `429` answers are not kept, so you can retry those with the same key.
- **Rate limit.** 120 requests a minute per key, and 600 a minute for all the keys of a workspace together. Every answer has `X-RateLimit-Limit`, `X-RateLimit-Remaining` and `X-RateLimit-Reset` (Unix time); a 429 has `Retry-After` (seconds).
- **Audit.** What a key changes, and every conversation or contact it reads, is in the workspace's audit log under the key's name.

### Examples

| Language | List open conversations | Send a reply |
|---|---|---|
| cURL | [`curl/list-conversations.sh`](examples/curl/list-conversations.sh) | [`curl/send-message.sh`](examples/curl/send-message.sh) |
| Node.js 18+ (fetch, no SDK) | [`node/list-conversations.mjs`](examples/node/list-conversations.mjs) | [`node/send-message.mjs`](examples/node/send-message.mjs) |
| Python (requests) | [`python/list_conversations.py`](examples/python/list_conversations.py) | [`python/send_message.py`](examples/python/send_message.py) |
| PHP (cURL) | [`php/list-conversations.php`](examples/php/list-conversations.php) | [`php/send-message.php`](examples/php/send-message.php) |

All of them read the key from the `REPLYZE_API_KEY` environment variable.

## 5. Webhooks

Webhooks send events to your server as they happen. Add one in **Settings → Integrations → Developer → Webhooks**: the URL, the events to send, and the signing secret, which is shown only once.

| Event | When | `data` |
|---|---|---|
| `conversation.created` | A conversation's first message from the visitor or the team | `conversation` |
| `conversation.assigned` | A conversation was given to a teammate or a team | `conversation` |
| `conversation.resolved` | A conversation became resolved | `conversation` |
| `message.created` | A message from the visitor, the team or the AI (not internal notes, system lines or spam) | `message`, `conversation` |
| `contact.created` | A contact with a name, email or phone (an anonymous visitor counts from the moment they give one) | `contact` |
| `contact.updated` | A known contact's details changed | `contact`, `changed` (the fields) |

Each event is a JSON `POST`:

```json
{
  "id": "0b9f6a52-3c1e-4d7a-9e21-5f8c2b7d1a40",
  "event": "message.created",
  "created_at": "2026-11-12T10:15:00.000000Z",
  "workspace_id": 1,
  "data": { "message": { "...": "..." }, "conversation": { "...": "..." } }
}
```

with these headers:

| Header | Value |
|---|---|
| `X-Replyze-Event` | The event name |
| `X-Replyze-Event-Id` | A copy of the body's `id`, the same on every retry. **Not signed** |
| `X-Replyze-Timestamp` | A copy of the body's `created_at`, in Unix seconds. **Not signed** |
| `X-Replyze-Signature` | `sha256=` and the hex HMAC-SHA256 of the **raw** request body, keyed with the signing secret |

Only the body is signed. `X-Replyze-Event-Id` and `X-Replyze-Timestamp` are conveniences, for logs or routing; anyone who captured a request can send it again with new values in them. So take the id and the time from the body, never from these headers.

**Check every request** before you trust it, in this order:

1. Compute the HMAC over the raw bytes you received (not over re-serialized JSON) and compare it with `X-Replyze-Signature` in constant time, as bytes. No match: answer `401`.
2. Parse the body. If its `created_at` is more than 5 minutes away from now, answer `400`: it is an old request sent again.
3. If you have already handled its `id`, answer `200` and stop: it is a retry.

Answer with any 2xx within 10 seconds and do the work afterwards. A network error, a timeout or a 5xx is retried twice, after 30 seconds and then 3 minutes, with the same body, so a 5-minute window lets the retries in; any other answer is final. Redirects are not followed, so a 3xx counts as a failed delivery. The URL must be a public `http://` or `https://` address. Requests come with `User-Agent: Replyze-Webhooks/1.0`.

```js
// Node.js
const crypto = require('crypto');
function verifyReplyzeSignature(rawBody, header, secret) {
  if (typeof header !== 'string') return false;
  const expected = Buffer.from('sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex'));
  const received = Buffer.from(header); // compare bytes: a non-ASCII header has more bytes than characters
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
}
// createdAt from the signed body, not the X-Replyze-Timestamp header
function isFresh(createdAt, maxAgeSeconds = 300) {
  const sent = typeof createdAt === 'string' ? Date.parse(createdAt) : NaN;
  return Number.isFinite(sent) && Math.abs(Date.now() - sent) <= maxAgeSeconds * 1000;
}
```

```python
# Python
import hashlib, hmac, time
from datetime import datetime
def verify_replyze_signature(raw_body: bytes, header: str | None, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    # compare bytes: compare_digest raises TypeError on str with non-ASCII characters
    return isinstance(header, str) and hmac.compare_digest(expected.encode(), header.encode("utf-8", "replace"))
# created_at from the signed body, not the X-Replyze-Timestamp header
def is_fresh(created_at: str | None, max_age_seconds: int = 300) -> bool:
    try:
        sent = datetime.fromisoformat(created_at.replace("Z", "+00:00")).timestamp()
    except (AttributeError, TypeError, ValueError):
        return False
    return abs(time.time() - sent) <= max_age_seconds
```

```php
// PHP
function verify_replyze_signature(string $rawBody, mixed $header, string $secret): bool {
    return is_string($header) && hash_equals('sha256=' . hash_hmac('sha256', $rawBody, $secret), $header);
}
// $createdAt from the signed body, not the X-Replyze-Timestamp header
function replyze_is_fresh(mixed $createdAt, int $maxAge = 300): bool {
    $sent = is_string($createdAt) && preg_match('/^\d{4}-\d{2}-\d{2}T/', $createdAt) ? strtotime($createdAt) : false;
    return $sent !== false && abs(time() - $sent) <= $maxAge;
}
```

Complete receivers that do all three steps: [Express](examples/webhooks/node-express/), [Flask](examples/webhooks/python-flask/), [plain PHP](examples/webhooks/php/). Test vector: secret `9f86d081884c7d659a2feaa0c55ad015` and the body in [`examples/webhooks/test-body.json`](examples/webhooks/test-body.json) give `sha256=912da3252eccfa6203a07400fd4a24081c10f35882012b0a50b7b12844a78979`. CI starts each of the three receivers on every push and checks that a freshly signed event is handled once, that a wrong, missing or non-ASCII signature gets `401`, and that the test body, sent again with a new `X-Replyze-Timestamp` and `X-Replyze-Event-Id`, gets `400`: its `created_at` is old.

To try a receiver on your machine, start it with the test secret:

```bash
cd examples/webhooks/node-express && npm install
REPLYZE_WEBHOOK_SECRET=9f86d081884c7d659a2feaa0c55ad015 node server.js &
```

and send it an event made and signed just now (the receivers refuse anything older than 5 minutes):

```bash
# Send a signed test event
SECRET=9f86d081884c7d659a2feaa0c55ad015
BODY='{"id":"test-'$(date +%s)'","event":"message.created","created_at":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","workspace_id":1,"data":{"message":{"id":501,"conversation_id":88,"sender_type":"visitor","content":"Where is my order?"}}}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.*= //')
curl -i http://localhost:3000/replyze/webhook \
  -H "Content-Type: application/json" \
  -H "X-Replyze-Event: message.created" \
  -H "X-Replyze-Signature: sha256=$SIG" \
  --data-binary "$BODY"
```

The answer is `200 OK` and the receiver prints the message. Run only the `curl` command again and it sends the same event, like a retry: `200`, and nothing printed. `test-body.json` with its test-vector signature gets `400 Too old`, however fresh its headers: that is the replay check working. `--data-binary` sends the bytes as they are; `-d` would strip line breaks from a file and change the signature.

No-code tools (Zapier, Make, n8n) connect with their HTTP modules: a webhook trigger ("Catch Hook") for events, and HTTP requests with an API key for actions.

## 6. MCP server for AI agents

Replyze runs a remote [MCP](https://modelcontextprotocol.io) server at `https://client.replyze.chat/api/mcp` (streamable HTTP, authenticated with an API key). It lets Claude, Cursor, VS Code and other MCP clients search and read your conversations, reply to customers, leave internal notes, assign conversations, look up contacts and search your knowledge base; the key's scopes decide which tools the agent gets. In Claude Code, for example:

```bash
claude mcp add --transport http replyze https://client.replyze.chat/api/mcp \
  --header "Authorization: Bearer $REPLYZE_API_KEY"
```

Setup for Claude Desktop, Cursor, VS Code and other clients: [Replyze/replyze-mcp](https://github.com/Replyze/replyze-mcp).

A public help center is an MCP server too, with no key: `https://client.replyze.chat/api/mcp/kb/<your-help-center-slug>` lets anyone's assistant search and read your published articles. See [Replyze/knowledge-base-mcp-server](https://github.com/Replyze/knowledge-base-mcp-server).

## More from Replyze

| Repository | What is inside |
|---|---|
| [add-live-chat-to-website](https://github.com/Replyze/add-live-chat-to-website) | Copy-paste code to add live chat to HTML, WordPress, Shopify, Wix, Webflow, React, Next.js, Vue, Laravel and more |
| [react-live-chat](https://github.com/Replyze/react-live-chat) | React and Next.js live chat component |
| [vue-live-chat](https://github.com/Replyze/vue-live-chat) | Vue and Nuxt live chat component |
| [wordpress-live-chat](https://github.com/Replyze/wordpress-live-chat) | WordPress live chat and AI chatbot plugin |
| [react-native-live-chat](https://github.com/Replyze/react-native-live-chat) | Live chat and AI support in React Native and Expo apps |
| [flutter-live-chat](https://github.com/Replyze/flutter-live-chat) | Live chat and AI support in Flutter apps |
| [replyze-mcp](https://github.com/Replyze/replyze-mcp) | The Replyze MCP server for Claude, Cursor and VS Code |
| [knowledge-base-mcp-server](https://github.com/Replyze/knowledge-base-mcp-server) | Your public help center as an MCP server, no key needed |

## Development

Everything in [`examples/`](examples/) is checked on every push ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)): the spec is linted with Redocly, every example is syntax-checked, and the webhook and identity examples run against the test vectors above. To run the same checks locally (Node.js 18+, Python 3.10+, PHP 8.1+):

```bash
npx @redocly/cli lint openapi.json
bash scripts/check-syntax.sh
node --test tests/*.test.mjs
```

The end-to-end webhook tests start the Express, Flask and PHP receivers; they need `npm install` in `examples/webhooks/node-express` and `pip install -r examples/webhooks/python-flask/requirements.txt`, and run with `RUN_RECEIVERS=1 node --test tests/*.test.mjs`.

## License

The code in this repository is [MIT](LICENSE) licensed.
