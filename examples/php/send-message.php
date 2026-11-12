<?php
/**
 * Reply to a customer in a conversation, or leave an internal note.
 * PHP 7.4+ with the curl extension.
 *   REPLYZE_API_KEY=rpz_live_... php send-message.php 123 "Your refund is on its way."
 *   REPLYZE_API_KEY=rpz_live_... php send-message.php 123 "Checked with billing" --note
 */

$key = getenv('REPLYZE_API_KEY');
[$conversationId, $text] = [$argv[1] ?? null, $argv[2] ?? null];
if (!$key || !$conversationId || $text === null) {
    fwrite(STDERR, "Usage: REPLYZE_API_KEY=... php send-message.php <conversation id> <text> [--note]\n");
    exit(1);
}

$ch = curl_init("https://client.replyze.chat/api/v1/conversations/{$conversationId}/messages");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Authorization: Bearer {$key}",
        'Content-Type: application/json',
        // A retry with the same key returns the first answer: the message is never sent twice.
        'Idempotency-Key: ' . bin2hex(random_bytes(16)),
    ],
    CURLOPT_POSTFIELDS => json_encode([
        'content' => $text,
        'type' => in_array('--note', $argv, true) ? 'note' : 'reply',
    ]),
]);
$raw = curl_exec($ch);
$status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$body = json_decode((string) $raw, true);
if ($raw === false || $status >= 400) {
    fwrite(STDERR, "{$status} " . ($body['error']['code'] ?? '') . ': ' . ($body['error']['message'] ?? 'request failed') . "\n");
    exit(1);
}
echo "Sent message #{$body['id']} at {$body['created_at']}\n";
