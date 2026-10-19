#!/bin/sh
# Applies /migrations/*.sql in order, each once, each in its own
# transaction. Applied versions are recorded in
# supabase_migrations.schema_migrations — the table the Supabase CLI
# uses — so `supabase db push` / `migration list` stay compatible.
#
# MIGRATIONS_BASELINE: for a database whose migrations were applied by
# hand (no history table yet), the last version already applied, e.g.
# 059. Those versions are recorded without running. Only used when the
# history table is first created.
set -eu

q() { psql -v ON_ERROR_STOP=1 -qtAX "$@"; }

if [ "$(q -c "select to_regclass('supabase_migrations.schema_migrations') is null")" = "t" ]; then
  tables=$(q -c "select count(*) from information_schema.tables where table_schema = 'public'")
  if [ "$tables" -gt 0 ] && [ -z "$MIGRATIONS_BASELINE" ]; then
    echo "migrate: public schema has $tables tables but no migration history." >&2
    echo "migrate: set MIGRATIONS_BASELINE in .env.stack to the last migration already applied (e.g. 059)." >&2
    exit 1
  fi
  q <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL
  baseline=$MIGRATIONS_BASELINE
else
  baseline=""
fi

applied=0
for f in $(ls /migrations/*.sql | sort); do
  base=$(basename "$f" .sql)
  version=${base%%_*}
  name=${base#*_}

  [ -n "$(q -c "select 1 from supabase_migrations.schema_migrations where version = '$version'")" ] && continue

  record="insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name')"
  if [ -n "$baseline" ] && [ "$(expr "$version" \<= "$baseline")" = 1 ]; then
    q -c "$record"
    echo "migrate: baselined $base"
  else
    echo "migrate: applying $base"
    psql -v ON_ERROR_STOP=1 -qX -1 -f "$f" -c "$record"
    applied=$((applied + 1))
  fi
done

echo "migrate: done, $applied applied"
