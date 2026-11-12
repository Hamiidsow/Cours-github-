#!/usr/bin/env bash
# Lance les tests de sécurité de la base sur un PostgreSQL LOCAL jetable.
# Prérequis : PostgreSQL 15+ installé (initdb, pg_ctl, psql).
set -euo pipefail
cd "$(dirname "$0")/.."
BIN="$(dirname "$(command -v pg_ctl || ls /usr/lib/postgresql/*/bin/pg_ctl | tail -1)")"
DIR="$(mktemp -d)"; PORT=54329
cp migrations/*.sql tests/*.sql "$DIR"/
chmod -R a+rX "$DIR"
run() { if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = 0 ] && chown -R postgres "$DIR"
run "$BIN/initdb" -D "$DIR/data" -A trust -U postgres >/dev/null
run "$BIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -l "$DIR/log" -w start >/dev/null
trap 'run "$BIN/pg_ctl" -D "$DIR/data" -m fast stop >/dev/null; rm -rf "$DIR"' EXIT
P=(run "$BIN/psql" -h "$DIR" -p "$PORT" -U postgres -v ON_ERROR_STOP=1 -q)
"${P[@]}" -f "$DIR/00_stub_supabase.sql"
for f in "$DIR"/0*_*.sql; do
  case "$f" in *00_stub*) ;; *) "${P[@]}" -f "$f" ;; esac
done
"${P[@]}" -f "$DIR/10_tests_securite.sql" 2>&1 | sed "s/^psql:[^ ]* NOTICE:  //" | grep -E "^(ok|ECHEC|psql|ERROR|TOUS)"
