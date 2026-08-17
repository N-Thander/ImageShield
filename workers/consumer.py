"""Worker loop stub.

Phase 0 scope: prove the worker container starts, reaches Redis, stays up, and
shuts down cleanly on SIGTERM (so ``docker compose down`` is fast rather than
waiting out the 10s kill timeout).

Run as::

    python -m workers.consumer
"""

from __future__ import annotations

import logging
import signal
import sys
import threading
import time

from app import config
from app.storage import get_redis_client

log = logging.getLogger("imageshield.worker")

HEARTBEAT_SECONDS = 15.0
_shutdown = threading.Event()


def _handle_signal(signum, _frame) -> None:
    log.info("received %s, shutting down", signal.Signals(signum).name)
    _shutdown.set()


def run() -> int:
    signal.signal(signal.SIGTERM, _handle_signal)
    signal.signal(signal.SIGINT, _handle_signal)

    redis_client = get_redis_client()
    try:
        redis_client.ping()
        log.info("connected to redis at %s:%s", config.REDIS_HOST, config.REDIS_PORT)
    except Exception as exc:
        log.error("cannot reach redis at %s:%s: %s", config.REDIS_HOST, config.REDIS_PORT, exc)
        return 1

    log.info("worker alive (model=%s, version=%s)", config.MODEL_NAME, config.MODEL_VERSION)

    # TODO(phase-1): replace this heartbeat with a real consume loop —
    # BLPOP/XREADGROUP off the ingest stream, fetch bytes from MinIO, run
    # app.models.score_image + app.cascade.decide, then UPDATE the images row
    # with nsfw_score/decision/model_version/processed_at.
    while not _shutdown.is_set():
        log.info("heartbeat — idle, no queue consumption yet (TODO(phase-1))")
        _shutdown.wait(HEARTBEAT_SECONDS)

    log.info("worker stopped")
    return 0


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    return run()


if __name__ == "__main__":
    sys.exit(main())
