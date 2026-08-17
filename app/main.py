"""ImageShield API.

Phase 0 scope: prove the environment is wired up.

* ``GET  /health``   — really pings Postgres, Redis and MinIO.
* ``POST /moderate`` — stub. Records a PENDING row so DB writes are proven
  end-to-end. No inference yet; see TODO(phase-1) below.
"""

from __future__ import annotations

import hashlib
import logging
import uuid

from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse

from app import config
from app.schemas import HealthResponse, ModerateRequest, ModerateResponse
from app.storage import get_db_connection, get_minio_client, get_redis_client

log = logging.getLogger("imageshield.api")

app = FastAPI(
    title="ImageShield",
    version="0.1.0",
    description="Image moderation pipeline — environment scaffold.",
)


# --------------------------------------------------------------------------- #
# health
# --------------------------------------------------------------------------- #

def _check_postgres() -> bool:
    try:
        with get_db_connection(connect_timeout=3) as conn, conn.cursor() as cur:
            cur.execute("SELECT 1")
            return cur.fetchone() == (1,)
    except Exception as exc:
        log.warning("postgres health check failed: %s", exc)
        return False


def _check_redis() -> bool:
    try:
        return bool(get_redis_client(socket_connect_timeout=3, socket_timeout=3).ping())
    except Exception as exc:
        log.warning("redis health check failed: %s", exc)
        return False


def _check_minio() -> bool:
    try:
        # bucket_exists is a cheap authenticated round-trip; it verifies both
        # reachability and that our credentials work.
        get_minio_client().bucket_exists(config.MINIO_BUCKET)
        return True
    except Exception as exc:
        log.warning("minio health check failed: %s", exc)
        return False


@app.get("/health", response_model=HealthResponse)
def health() -> JSONResponse:
    checks = {
        "postgres": _check_postgres(),
        "redis": _check_redis(),
        "minio": _check_minio(),
    }
    ok = all(checks.values())
    body = {"status": "ok" if ok else "degraded", **checks}
    # 503 when degraded so container orchestrators and `curl -f` can act on it.
    return JSONResponse(status_code=200 if ok else 503, content=body)


# --------------------------------------------------------------------------- #
# moderation (stub)
# --------------------------------------------------------------------------- #

INSERT_PENDING = """
    INSERT INTO images (image_id, sha256, original_path, decision, model_version, expected_label)
    VALUES (%s, %s, %s, 'PENDING', %s, %s)
    RETURNING image_id, sha256, original_path, decision, model_version, expected_label, created_at
"""


@app.post("/moderate", response_model=ModerateResponse, status_code=202)
def moderate(req: ModerateRequest) -> ModerateResponse:
    """Accept an image URL and queue it as PENDING.

    TODO(phase-1): download the image, compute the real content sha256 + phash,
    persist bytes to MinIO, run the cascade (app.cascade.decide) and enqueue to
    Redis for the worker instead of returning PENDING immediately.
    """
    image_id = uuid.uuid4().hex
    # TODO(phase-1): hash the fetched image *bytes*. Hashing the URL is a
    # placeholder purely to satisfy the NOT NULL column while wiring is proven.
    url_sha256 = hashlib.sha256(req.image_url.encode("utf-8")).hexdigest()

    try:
        with get_db_connection() as conn, conn.cursor() as cur:
            cur.execute(
                INSERT_PENDING,
                (image_id, url_sha256, req.image_url, config.MODEL_VERSION, req.expected_label),
            )
            row = cur.fetchone()
            conn.commit()
    except Exception as exc:
        log.exception("failed to record moderation request")
        raise HTTPException(status_code=503, detail=f"database unavailable: {exc}") from exc

    return ModerateResponse(
        image_id=row[0],
        sha256=row[1],
        original_path=row[2],
        decision=row[3],
        model_version=row[4],
        expected_label=row[5],
        created_at=row[6].isoformat() if row[6] else None,
    )


# --------------------------------------------------------------------------- #
# direct entrypoint
# --------------------------------------------------------------------------- #

if __name__ == "__main__":
    # Run with `python -m app.main` from the repo root — NOT `python app/main.py`,
    # which puts app/ on sys.path and breaks `from app import config`.
    # The import string (rather than the app object) is what makes --reload work:
    # the reloader needs to re-import the module in the worker process.
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )
