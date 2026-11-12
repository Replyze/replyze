"""The user_hash for Replyze.identify(), computed on your server. No dependencies.

    REPLYZE_IDENTITY_SECRET=... python user_hash.py 42
    REPLYZE_IDENTITY_SECRET=... python user_hash.py "" jane@example.com
"""
import hashlib
import hmac
import os
import sys


def replyze_user_hash(secret: str, user_id=None, email=None) -> str:
    """Hex HMAC-SHA256 under the widget's identity secret (Settings > Widget >
    Identity) of the user's id, or, for a user without one, of their email in
    lower case and trimmed."""
    subject = "" if user_id is None else str(user_id).strip()
    if not subject:
        subject = (email or "").strip().lower()
    if not subject:
        raise ValueError("Sign a user id or an email.")
    return hmac.new(secret.encode(), subject.encode(), hashlib.sha256).hexdigest()


if __name__ == "__main__":
    secret = os.environ.get("REPLYZE_IDENTITY_SECRET")
    if not secret:
        sys.exit("Set REPLYZE_IDENTITY_SECRET.")
    args = sys.argv[1:] + [None, None]
    print(replyze_user_hash(secret, args[0], args[1]))
