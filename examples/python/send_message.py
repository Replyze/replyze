"""Reply to a customer in a conversation, or leave an internal note.

    pip install requests
    REPLYZE_API_KEY=rpz_live_... python send_message.py 123 "Your refund is on its way."
    REPLYZE_API_KEY=rpz_live_... python send_message.py 123 "Checked with billing" --note
"""
import os
import sys
import uuid

import requests

if len(sys.argv) < 3 or not os.environ.get("REPLYZE_API_KEY"):
    sys.exit("Usage: REPLYZE_API_KEY=... python send_message.py <conversation id> <text> [--note]")

conversation_id, text = sys.argv[1], sys.argv[2]
kind = "note" if "--note" in sys.argv[3:] else "reply"

res = requests.post(
    f"https://client.replyze.chat/api/v1/conversations/{conversation_id}/messages",
    headers={
        "Authorization": f"Bearer {os.environ['REPLYZE_API_KEY']}",
        # A retry with the same key returns the first answer: the message is never sent twice.
        "Idempotency-Key": str(uuid.uuid4()),
    },
    json={"content": text, "type": kind},
    timeout=30,
)
body = res.json()
if not res.ok:
    sys.exit(f"{res.status_code} {body['error']['code']}: {body['error']['message']}")
print(f"Sent message #{body['id']} at {body['created_at']}")
