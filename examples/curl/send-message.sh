#!/usr/bin/env bash
# Reply to a customer in a conversation (it reaches them at once, on the
# conversation's channel). Needs an API key with the conversations:write scope.
#   export REPLYZE_API_KEY=rpz_live_...
#   ./send-message.sh 123 "Thanks for waiting! Your refund is on its way."
set -euo pipefail

CONVERSATION_ID="${1:?Usage: $0 <conversation id> <text>}"
TEXT="${2:?Usage: $0 <conversation id> <text>}"

# The Idempotency-Key makes a retry safe: the same key within 24 hours
# returns the first answer instead of sending the message twice.
# The text goes through python3 only to escape it as JSON.
curl --fail-with-body -sS -X POST "https://client.replyze.chat/api/v1/conversations/${CONVERSATION_ID}/messages" \
  -H "Authorization: Bearer ${REPLYZE_API_KEY:?Set REPLYZE_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $(date +%s)-${RANDOM}${RANDOM}" \
  --data "{\"content\": $(printf '%s' "$TEXT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))'), \"type\": \"reply\"}"

# "type": "note" instead leaves an internal note that only your team sees.
