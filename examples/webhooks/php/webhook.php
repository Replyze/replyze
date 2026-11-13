<?php
/**
 * A Replyze webhook receiver in plain PHP that checks every request.
 * Put it on your server (or try it with: REPLYZE_WEBHOOK_SECRET=... php -S localhost:3000 webhook.php)
 * and add its URL in Settings → Integrations → Developer → Webhooks.
 */

/**
 * True when X-Replyze-Signature matches the raw body: "sha256=" and the hex
 * HMAC-SHA256 of the exact bytes received, keyed with the webhook's signing
 * secret. Compared in constant time. A missing header, or one that is not a
 * string (some frameworks give an array), is false instead of a TypeError.
 */
function verify_replyze_signature(string $rawBody, mixed $header, string $secret): bool
{
    return is_string($header) && hash_equals('sha256=' . hash_hmac('sha256', $rawBody, $secret), $header);
}

/**
 * True when the event's created_at (ISO 8601, from the signed body, never the
 * unsigned X-Replyze-Timestamp header) is within $maxAge seconds of now.
 * strtotime() alone would also read words like "now", so the date's shape is checked first.
 */
function replyze_is_fresh(mixed $createdAt, int $maxAge = 300, ?int $now = null): bool
{
    if (!is_string($createdAt) || !preg_match('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/', $createdAt)) {
        return false;
    }
    $sent = strtotime($createdAt);

    return $sent !== false && abs(($now ?? time()) - $sent) <= $maxAge;
}

// Only when this file answers the request, not when another script includes it.
if (PHP_SAPI !== 'cli' && realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    $secret = getenv('REPLYZE_WEBHOOK_SECRET') ?: '';
    if ($_SERVER['REQUEST_METHOD'] !== 'POST' || $secret === '') {
        http_response_code(405);
        exit;
    }

    // The exact bytes: the signature is over the raw body, not re-serialized JSON.
    $raw = file_get_contents('php://input');
    if (!verify_replyze_signature($raw, $_SERVER['HTTP_X_REPLYZE_SIGNATURE'] ?? null, $secret)) {
        http_response_code(401);
        exit('Bad signature');
    }

    // Signed, so now it is safe to parse. Take the time and the id from the body:
    // the signature covers it. X-Replyze-Timestamp and X-Replyze-Event-Id are
    // unsigned copies that anyone replaying an old request can change.
    $event = json_decode($raw, true);
    if (!is_array($event) || !replyze_is_fresh($event['created_at'] ?? null)) {
        http_response_code(400);
        exit('Too old');
    }

    // Drop retries of events you already have (use your database in production;
    // it only needs ids for as long as replyze_is_fresh lets an event in).
    $seenFile = sys_get_temp_dir() . '/replyze-event-' . hash('sha256', (string) ($event['id'] ?? ''));
    if (file_exists($seenFile)) {
        http_response_code(200);
        exit;
    }
    touch($seenFile);

    if ($event['event'] === 'message.created') {
        $m = $event['data']['message'];
        error_log("[{$m['sender_type']}] in #{$m['conversation_id']}: {$m['content']}");
    } else {
        error_log($event['event'] . ' ' . json_encode($event['data']));
    }

    http_response_code(200);
}
