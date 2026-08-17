"""Ensure the MinIO bucket exists.

Idempotent and retried for ~30s, same rationale as :mod:`app.migrate`.

Run as::

    python -m app.init_storage
"""

from __future__ import annotations

import logging
import sys
import time

from app import config
from app.storage import get_minio_client

log = logging.getLogger("imageshield.init_storage")

CONNECT_TIMEOUT_SECONDS = 30.0
RETRY_INTERVAL_SECONDS = 1.0


def ensure_bucket(timeout: float = CONNECT_TIMEOUT_SECONDS) -> None:
    deadline = time.monotonic() + timeout
    attempt = 0
    while True:
        attempt += 1
        try:
            client = get_minio_client()
            if client.bucket_exists(config.MINIO_BUCKET):
                log.info("bucket %r already present", config.MINIO_BUCKET)
            else:
                client.make_bucket(config.MINIO_BUCKET)
                log.info("bucket %r created", config.MINIO_BUCKET)
            return
        except Exception as exc:
            if time.monotonic() >= deadline:
                raise RuntimeError(
                    f"MinIO unreachable at {config.MINIO_ENDPOINT} "
                    f"after {timeout:.0f}s ({attempt} attempts)"
                ) from exc
            log.info("waiting for minio (attempt %d): %s", attempt, exc.__class__.__name__)
            time.sleep(RETRY_INTERVAL_SECONDS)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    try:
        ensure_bucket()
    except Exception as exc:
        log.error("bucket init failed: %s", exc)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
