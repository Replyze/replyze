<?php
/**
 * The user_hash for Replyze.identify(), computed on your server.
 *   REPLYZE_IDENTITY_SECRET=... php user-hash.php 42
 *   REPLYZE_IDENTITY_SECRET=... php user-hash.php "" jane@example.com
 */

/**
 * Hex HMAC-SHA256 under the widget's identity secret (Settings → Chat Widget →
 * Identity) of the user's id, or, for a user without one, of their email in
 * lower case and trimmed.
 */
function replyze_user_hash(string $secret, $userId = null, ?string $email = null): string
{
    $subject = trim((string) $userId);
    if ($subject === '') {
        $subject = mb_strtolower(trim((string) $email));
    }
    if ($subject === '') {
        throw new InvalidArgumentException('Sign a user id or an email.');
    }

    return hash_hmac('sha256', $subject, $secret);
}

if (PHP_SAPI === 'cli' && realpath($argv[0]) === __FILE__) {
    $secret = getenv('REPLYZE_IDENTITY_SECRET');
    if (!$secret) {
        fwrite(STDERR, "Set REPLYZE_IDENTITY_SECRET.\n");
        exit(1);
    }
    echo replyze_user_hash($secret, $argv[1] ?? null, $argv[2] ?? null), "\n";
}
