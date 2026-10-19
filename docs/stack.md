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
    deploy\supabase-trim.yml  turns off the Supabase services the app doesn't use
  supabase\docker\           Supabase docker setup (git clone of supabase/supabase)
    .env                     Supabase secrets
```

Only the `docker` folder of the Supabase repo is needed:

```
git clone --depth 1 --filter=blob:none --sparse https://github.com/supabase/supabase
cd supabase && git sparse-checkout set docker
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

### Caddy owns ports 80/443

In `.env.stack`:

```
PUBLIC_HOST=raqmichats.com
HTTP_PORT=80
PUBLIC_URL=https://raqmichats.com
```

Point the domain's DNS at the server, open ports 80 and 443, then
`sh stack.sh up -d --build`. Caddy fetches and renews the certificate.

### Another web server (nginx) already owns 80/443

In `.env.stack`:

```
BEHIND_PROXY=true
PUBLIC_HOST=crm.example.com
HTTP_PORT=8090
PUBLIC_URL=https://crm.example.com
```

`stack.sh` then layers `deploy/behind-proxy.yml`: Caddy listens on
`127.0.0.1:8090` only, and nginx forwards the domain to it with TLS.
Install `deploy/nginx-site.conf` (edit the domain and port first) and run
`certbot --nginx -d crm.example.com`.

### Ports

Docker-published ports bypass host firewalls such as ufw. Everything
except Caddy (in the Caddy-owns-80/443 mode) is published on
`127.0.0.1` only: the gateway/Studio on 8000 and Postgres on
`DB_HOST_PORT`. Reach Studio through an SSH tunnel:
`ssh -L 8000:localhost:8000 user@server`, then http://localhost:8000.
