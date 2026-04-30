#!/usr/bin/env bash
# Bulk-upload .env.local to a linked Railway service.
#
# Usage (run from meta-cert-portal/):
#   ./scripts/railway-set-env.sh                    # uploads .env.local
#   ./scripts/railway-set-env.sh path/to/env-file   # uploads a custom file
#
# Requires: `railway login` and `railway link` already done.

set -euo pipefail

ENV_FILE="${1:-.env.local}"

if [ ! -f "$ENV_FILE" ]; then
  echo "[err ] $ENV_FILE not found. Run from meta-cert-portal/ or pass a path."
  exit 1
fi

if ! command -v railway >/dev/null 2>&1; then
  echo "[err ] railway CLI not installed."
  echo "       Install: curl -fsSL https://railway.com/install.sh | sh"
  exit 1
fi

# Confirm a Railway project is linked
if ! railway status >/dev/null 2>&1; then
  echo "[err ] No Railway project linked. Run 'railway link' first."
  exit 1
fi

echo "[info] Uploading vars from $ENV_FILE to the linked Railway service..."

count=0
while IFS='=' read -r key val || [ -n "$key" ]; do
  # skip blanks and comments
  [ -z "$key" ] && continue
  case "$key" in
    \#*) continue ;;
  esac

  # strip leading/trailing whitespace from the key
  key="$(echo "$key" | tr -d '[:space:]')"

  # strip surrounding quotes from the value if present
  val="${val%\"}"; val="${val#\"}"
  val="${val%\'}"; val="${val#\'}"

  # SECURITY: skip placeholder values from .env.local.example so we don't
  # overwrite real Railway vars with literal "your-key-here" strings.
  case "$val" in
    *your-*-here*|"") echo "[skip] $key (placeholder)"; continue ;;
  esac

  railway variables set "$key=$val" >/dev/null
  echo "[ok  ] $key"
  count=$((count + 1))
done < "$ENV_FILE"

echo "[info] Uploaded $count variable(s)."
echo "[info] Verify with: railway variables"
