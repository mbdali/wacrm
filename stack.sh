#!/bin/sh
# docker compose for the full stack (docker-compose.stack.yml), with the
# Supabase .env and .env.stack loaded. Any compose args pass through:
#   sh stack.sh up -d --build
#   sh stack.sh --profile admin up -d     # + Supabase Studio
set -eu
cd "$(dirname "$0")"

files="-f docker-compose.stack.yml"
if grep -qE '^BEHIND_PROXY=true' .env.stack 2>/dev/null; then
  files="$files -f deploy/behind-proxy.yml"
fi

# shellcheck disable=SC2086
exec docker compose \
  $files \
  --env-file ../supabase/docker/.env \
  --env-file .env.stack \
  "$@"
