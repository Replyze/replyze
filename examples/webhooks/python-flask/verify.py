import hashlib
import hmac
import time
from datetime import datetime


def verify_replyze_signature(raw_body: bytes, header: str | bytes | None, secret: str) -> bool:
    """True when X-Replyze-Signature matches the raw body: "sha256=" and the hex
    HMAC-SHA256 of the exact bytes received, keyed with the webhook's signing
    secret. Compared in constant time, as bytes: compare_digest raises
    TypeError on str with non-ASCII characters, which would be a 500."""
    if isinstance(header, str):
        header = header.encode("utf-8", "replace")
    if not isinstance(header, bytes):
        return False
    expected = b"sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest().encode()
    return hmac.compare_digest(expected, header)


def is_fresh(created_at: str | None, max_age_seconds: int = 300, now: float | None = None) -> bool:
    """True when the event's created_at (ISO 8601, from the signed body, never
    the unsigned X-Replyze-Timestamp header) is within max_age_seconds of now."""
    try:
        # Replace "Z": fromisoformat reads it only from Python 3.11.
        sent = datetime.fromisoformat(created_at.replace("Z", "+00:00")).timestamp()
    except (AttributeError, TypeError, ValueError, OverflowError, OSError):
        return False
    return abs((time.time() if now is None else now) - sent) <= max_age_seconds
