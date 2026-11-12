import hashlib
import hmac
import time


def verify_replyze_signature(raw_body: bytes, header: str, secret: str) -> bool:
    """True when X-Replyze-Signature matches the raw body: "sha256=" and the hex
    HMAC-SHA256 of the exact bytes received, keyed with the webhook's signing
    secret. Compared in constant time."""
    expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, header or "")


def is_fresh(timestamp_header: str, max_age_seconds: int = 300, now: float | None = None) -> bool:
    """True when X-Replyze-Timestamp (Unix seconds) is within max_age_seconds of now."""
    try:
        ts = int(timestamp_header)
    except (TypeError, ValueError):
        return False
    return abs((time.time() if now is None else now) - ts) <= max_age_seconds
