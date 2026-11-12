"""A Replyze webhook receiver in Flask that checks every request.

    pip install -r requirements.txt
    REPLYZE_WEBHOOK_SECRET=... flask --app app run --port 3000

Then add http(s)://<your host>/replyze/webhook in
Settings > Integrations > Developer > Webhooks.
"""
import json
import os

from flask import Flask, abort, request

from verify import is_fresh, verify_replyze_signature

SECRET = os.environ.get("REPLYZE_WEBHOOK_SECRET")
if not SECRET:
    raise SystemExit("Set REPLYZE_WEBHOOK_SECRET (the signing secret shown when you added the webhook).")

app = Flask(__name__)
# Keep events you have handled; use your database in production.
seen: set[str] = set()


@app.post("/replyze/webhook")
def replyze_webhook():
    # get_data() is the exact bytes: the signature is over the raw body, not re-serialized JSON.
    raw = request.get_data()
    if not verify_replyze_signature(raw, request.headers.get("X-Replyze-Signature", ""), SECRET):
        abort(401)
    if not is_fresh(request.headers.get("X-Replyze-Timestamp")):
        abort(400)
    event_id = request.headers.get("X-Replyze-Event-Id", "")
    if event_id in seen:
        return "", 200  # a retry of an event you already have
    seen.add(event_id)

    event = json.loads(raw)
    if event["event"] == "message.created":
        m = event["data"]["message"]
        print(f"[{m['sender_type']}] in #{m['conversation_id']}: {m['content']}")
    else:
        print(event["event"], json.dumps(event["data"]))

    # Answer fast: hand slow work to a queue.
    return "", 200
