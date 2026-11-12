"""List every open conversation in your Replyze inbox, page by page.

    pip install requests
    REPLYZE_API_KEY=rpz_live_... python list_conversations.py
"""
import os
import sys

import requests

API = "https://client.replyze.chat/api/v1"
key = os.environ.get("REPLYZE_API_KEY")
if not key:
    sys.exit("Set REPLYZE_API_KEY (an API key with the conversations:read scope).")

session = requests.Session()
session.headers.update({"Authorization": f"Bearer {key}", "Accept": "application/json"})

cursor = None
while True:
    params = {"status": "open", "limit": 50}
    if cursor:
        params["cursor"] = cursor
    res = session.get(f"{API}/conversations", params=params, timeout=30)
    body = res.json()
    if not res.ok:
        sys.exit(f"{res.status_code} {body['error']['code']}: {body['error']['message']}")

    for c in body["data"]:
        contact = c.get("contact") or {}
        who = contact.get("name") or contact.get("email") or "Visitor"
        channel = (c.get("channel") or {}).get("type")
        print(f"#{c['id']}  {channel}  {who}  {c.get('subject') or ''}")

    if not body["has_more"]:
        break
    cursor = body["next_cursor"]
