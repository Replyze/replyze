#!/usr/bin/env bash
# Syntax-checks every example: node --check, php -l, python -m py_compile, bash -n.
# Run from the repository root: bash scripts/check-syntax.sh
set -euo pipefail

cd "$(dirname "$0")/.."
failed=0
checked=0

check() {
  if "$@" >/dev/null 2>&1; then
    checked=$((checked + 1))
  else
    echo "FAIL: $*"
    "$@" || true
    failed=$((failed + 1))
  fi
}

while IFS= read -r -d '' f; do check node --check "$f"; done < <(find examples tests -type f \( -name '*.js' -o -name '*.mjs' \) -not -path '*/node_modules/*' -print0)
while IFS= read -r -d '' f; do check php -l "$f"; done < <(find examples -type f -name '*.php' -print0)
while IFS= read -r -d '' f; do check "${PYTHON:-python3}" -m py_compile "$f"; done < <(find examples -type f -name '*.py' -not -path '*/.venv/*' -print0)
while IFS= read -r -d '' f; do check bash -n "$f"; done < <(find examples scripts -type f -name '*.sh' -print0)
while IFS= read -r -d '' f; do check node -e 'JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"))' "$f"; done < <(find . -type f -name '*.json' -not -path './node_modules/*' -not -path '*/node_modules/*' -not -path './.git/*' -print0)

# Inline scripts of the widget example: each <script> body must parse.
check node -e '
const html = require("fs").readFileSync("examples/widget/index.html", "utf8");
const bodies = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (bodies.length === 0) throw new Error("no inline script found");
for (const body of bodies) new Function(body);
'

echo "Checked $checked files, $failed failed."
[ "$failed" -eq 0 ]
