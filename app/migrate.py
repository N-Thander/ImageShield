"""Apply ``infra/schema.sql`` to Postgres.

Idempotent: the schema is written entirely with ``IF NOT EXISTS``, so this is
safe to run on every boot. Retries the *connection* for ~30s because Compose
can hand us a Postgres that passes ``pg_isready`` a beat before it accepts
real client connections.

Run as::

    python -m app.migrate
"""

from __future__ import annotations

import logging
import pathlib
import sys
import time

import psycopg

from app import config
from app.storage import get_db_connection

log = logging.getLogger("imageshield.migrate")

# Resolved relative to this file so it works both in the image (/srv/app/..)
# and from a native checkout.
SCHEMA_PATH = pathlib.Path(__file__).resolve().parent.parent / "infra" / "schema.sql"

CONNECT_TIMEOUT_SECONDS = 30.0
RETRY_INTERVAL_SECONDS = 1.0


def wait_for_db(timeout: float = CONNECT_TIMEOUT_SECONDS) -> psycopg.Connection:
    """Block until Postgres accepts a connection, or raise after ``timeout``."""
    deadline = time.monotonic() + timeout
    attempt = 0
    while True:
        attempt += 1
        try:
            return get_db_connection()
        except psycopg.OperationalError as exc:
            if time.monotonic() >= deadline:
                raise RuntimeError(
                    f"Postgres unreachable at {config.POSTGRES_HOST}:{config.POSTGRES_PORT} "
                    f"after {timeout:.0f}s ({attempt} attempts)"
                ) from exc
            log.info("waiting for postgres (attempt %d): %s", attempt, exc.__class__.__name__)
            time.sleep(RETRY_INTERVAL_SECONDS)


def apply_schema() -> None:
    if not SCHEMA_PATH.is_file():
        raise FileNotFoundError(f"schema not found: {SCHEMA_PATH}")

    sql = SCHEMA_PATH.read_text()
    with wait_for_db() as conn:
        with conn.cursor() as cur:
            cur.execute(sql)
        conn.commit()
    log.info("schema applied from %s", SCHEMA_PATH)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    try:
        apply_schema()
    except Exception as exc:  # surfaced as a non-zero exit so Compose halts the stack
        log.error("migration failed: %s", exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
