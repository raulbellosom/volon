#!/usr/bin/env bash
set -euo pipefail
export PGDATA=/var/lib/postgresql/manual/data
if [ "$(id -u)" = "0" ]; then
  mkdir -p /var/lib/postgresql/manual
  chown postgres:postgres /var/lib/postgresql/manual
  exec gosu postgres bash /manual/postgres.sh
fi
if [ ! -f "$PGDATA/PG_VERSION" ]; then
  mkdir -p "$PGDATA"
  initdb -D "$PGDATA" -U postgres --auth-host=scram-sha-256 --auth-local=trust \
    --pwfile=<(printf '%s\n' "$MANUAL_DB_PASSWORD") >/dev/null
fi
if ! grep -q '^# manual-local-docker' "$PGDATA/pg_hba.conf"; then
  printf '\n# manual-local-docker\nhost all all all scram-sha-256\n' >> "$PGDATA/pg_hba.conf"
fi
exec postgres -D "$PGDATA" -h '*' -p 5432 -c shared_buffers=64MB -c max_connections=50
