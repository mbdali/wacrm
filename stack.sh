#!/bin/sh
# docker compose for the full stack (docker-compose.stack.yml), with the
# Supabase .env and .env.stack loaded. Any compose args pass through:
#   sh stack.sh up -d --build
#   sh stack.sh --profile admin up -d     # + Supabase Studio
set -eu
cd "$(dirname "$0")"
exec docker compose \
  -f docker-compose.stack.yml \
  --env-file ../supabase/docker/.env \
  --env-file .env.stack \
  "$@"
