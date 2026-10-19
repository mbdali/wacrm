# Full stack (app + Supabase) with one compose file

`docker-compose.stack.yml` runs the app, a trimmed self-hosted Supabase
(db, auth, rest, realtime, storage, gateway) and Caddy in one compose
project. Caddy serves everything on a single origin:

| Path                                   | Goes to            |
| -------------------------------------- | ------------------ |
| `/auth/v1`, `/rest/v1`, `/realtime/v1`, `/storage/v1` | Supabase gateway |
| everything else                        | app                |

## Layout

```
D:\Projects\
  wacrm\                     this repo
  supabase\docker\           Supabase docker setup (git clone of supabase/supabase)
    .env                     Supabase secrets
    docker-compose.wacrm.yml trimmed override (turns off unused services)
```

## First run

1. Supabase secrets: `../supabase/docker/.env`. For anything beyond local
   testing, replace the default secrets (`sh utils/generate-keys.sh` in
   that folder).
2. `cp .env.stack.example .env.stack` and fill in `ENCRYPTION_KEY` and
   `META_APP_SECRET`.
3. `sh stack.sh up -d --build`
4. Open http://raqmichats.localhost:8080

`stack.sh` is `docker compose -f docker-compose.stack.yml` with both env
files loaded; any compose command works through it (`ps`, `logs -f app`,
`down`, `--profile admin up -d` for Studio on http://localhost:8000).

If the standalone Supabase project is running, stop it first
(`docker compose --profile "*" down` in `../supabase/docker`) — the
container names are the same. Data lives in `../supabase/docker/volumes`
and is shared by both.

## Migrations

The `migrate` service applies `supabase/migrations/*.sql` on every
`up`, each new file once, in its own transaction, and records it in
`supabase_migrations.schema_migrations` (the Supabase CLI's table). New
upstream migrations apply on the next `sh stack.sh up -d --build`.

A database whose migrations were applied by hand has no history yet:
set `MIGRATIONS_BASELINE` to the last migration it already has (e.g.
`059`) and those are recorded without running.

## Production

In `.env.stack`:

```
PUBLIC_HOST=raqmichats.com
HTTP_PORT=80
PUBLIC_URL=https://raqmichats.com
```

Point the domain's DNS at the server, open ports 80 and 443, then
`sh stack.sh up -d --build`. Caddy fetches and renews the certificate.
