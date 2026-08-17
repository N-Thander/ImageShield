"""Connection helpers for the three backing services.

Everything here reads from :mod:`app.config`, so the same code works against
``localhost`` (native dev) and against the Compose service names (in Docker)
purely by swapping environment variables.
"""

from __future__ import annotations

import minio
import psycopg
import redis

from app import config


def get_db_connection(**kwargs) -> psycopg.Connection:
    """Open a new psycopg connection. Caller owns closing it (use as a context manager)."""
    return psycopg.connect(config.DATABASE_URL, **kwargs)


def get_redis_client(**kwargs) -> redis.Redis:
    """Redis client. ``decode_responses`` keeps the stub logging readable."""
    return redis.Redis(
        host=config.REDIS_HOST,
        port=config.REDIS_PORT,
        decode_responses=True,
        **kwargs,
    )


def get_minio_client(**kwargs) -> minio.Minio:
    return minio.Minio(
        config.MINIO_ENDPOINT,
        access_key=config.MINIO_ROOT_USER,
        secret_key=config.MINIO_ROOT_PASSWORD,
        secure=config.MINIO_SECURE,
        **kwargs,
    )
