#!/usr/bin/env bash
# List the open conversations in your Replyze inbox, newest first.
# Needs an API key with the conversations:read scope:
#   export REPLYZE_API_KEY=rpz_live_...
set -euo pipefail

curl --fail-with-body -sS "https://client.replyze.chat/api/v1/conversations?status=open&limit=10" \
  -H "Authorization: Bearer ${REPLYZE_API_KEY:?Set REPLYZE_API_KEY}" \
  -H "Accept: application/json"

# Next page: add &cursor=<next_cursor> from the answer.
