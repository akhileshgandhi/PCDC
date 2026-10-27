#!/bin/sh
set -e

# Bring the database schema up to date before serving traffic. Alembic builds
# a fresh database from scratch, so this also handles first-time setup.
if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "Running database migrations..."
  python -m alembic upgrade head
fi

exec "$@"
