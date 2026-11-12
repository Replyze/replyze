<?php
/**
 * List every open conversation in your Replyze inbox, page by page.
 * PHP 7.4+ with the curl extension.
 *   REPLYZE_API_KEY=rpz_live_... php list-conversations.php
 */

$key = getenv('REPLYZE_API_KEY');
if (!$key) {
    fwrite(STDERR, "Set REPLYZE_API_KEY (an API key with the conversations:read scope).\n");
    exit(1);
}

function replyze_get(string $path, string $key): array
{
    $ch = curl_init('https://client.replyze.chat/api/v1' . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 30,
        CURLOPT_HTTPHEADER => ["Authorization: Bearer {$key}", 'Accept: application/json'],
    ]);
    $raw = curl_exec($ch);
    if ($raw === false) {
        throw new RuntimeException(curl_error($ch));
    }
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $body = json_decode($raw, true);
    if ($status >= 400) {
        throw new RuntimeException("{$status} {$body['error']['code']}: {$body['error']['message']}");
    }

    return $body;
}

try {
    $cursor = null;
    do {
        $query = ['status' => 'open', 'limit' => 50];
        if ($cursor) {
            $query['cursor'] = $cursor;
        }
        $page = replyze_get('/conversations?' . http_build_query($query), $key);

        foreach ($page['data'] as $c) {
            $who = $c['contact']['name'] ?? $c['contact']['email'] ?? 'Visitor';
            $channel = $c['channel']['type'] ?? '';
            echo "#{$c['id']}  {$channel}  {$who}  " . ($c['subject'] ?? '') . "\n";
        }
        $cursor = $page['has_more'] ? $page['next_cursor'] : null;
    } while ($cursor);
} catch (RuntimeException $e) {
    fwrite(STDERR, $e->getMessage() . "\n");
    exit(1);
}
