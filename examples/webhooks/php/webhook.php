<?php
/**
 * A Replyze webhook receiver in plain PHP that checks every request.
 * Put it on your server (or try it with: REPLYZE_WEBHOOK_SECRET=... php -S localhost:3000 webhook.php)
 * and add its URL in Settings → Integrations → Developer → Webhooks.
 */

/**
 * True when X-Replyze-Signature matches the raw body: "sha256=" and the hex
 * HMAC-SHA256 of the exact bytes received, keyed with the webhook's signing
 * secret. Compared in constant time.
 */
function verify_replyze_signature(string $rawBody, ?string $header, string $secret): bool
{
    return hash_equals('sha256=' . hash_hmac('sha256', $rawBody, $secret), (string) $header);
}

/** True when X-Replyze-Timestamp (Unix seconds) is within $maxAge seconds of now. */
function replyze_is_fresh(?string $timestamp, int $maxAge = 300): bool
{
    return ctype_digit((string) $timestamp) && abs(time() - (int) $timestamp) <= $maxAge;
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
    if (!replyze_is_fresh($_SERVER['HTTP_X_REPLYZE_TIMESTAMP'] ?? null)) {
        http_response_code(400);
        exit('Too old');
    }

    // Drop retries of events you already have (use your database in production).
    $eventId = preg_replace('/[^a-f0-9-]/', '', $_SERVER['HTTP_X_REPLYZE_EVENT_ID'] ?? '');
    $seenFile = sys_get_temp_dir() . "/replyze-event-{$eventId}";
    if ($eventId !== '' && file_exists($seenFile)) {
        http_response_code(200);
        exit;
    }
    touch($seenFile);

    $event = json_decode($raw, true);
    if ($event['event'] === 'message.created') {
        $m = $event['data']['message'];
        error_log("[{$m['sender_type']}] in #{$m['conversation_id']}: {$m['content']}");
    } else {
        error_log($event['event'] . ' ' . json_encode($event['data']));
    }

    http_response_code(200);
}
