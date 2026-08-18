"""Moderation event fan-out.

Every terminal decision emits one :class:`ModerationEvent`. The dashboard's live
feed consumes exactly this shape, so the field names here are a contract with
``frontend/types/metrics.ts`` — changing one means changing both.

:func:`publish` is deliberately best-effort: telemetry must never be able to
fail a moderation call, so every error is swallowed and logged.
"""

from __future__ import annotations

import dataclasses
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

log = logging.getLogger("imageshield.events")

# Redis pub/sub channel the API's /live socket will subscribe to.
CHANNEL = "imageshield:events"

# Cascade stages, cheapest first. Mirrors `Stage` in the frontend types.
STAGE_CACHE = "cache"
STAGE_PHASH = "phash"
STAGE_CHEAP_MODEL = "cheap_model"
STAGE_HEAVY_MODEL = "heavy_model"

STAGES = (STAGE_CACHE, STAGE_PHASH, STAGE_CHEAP_MODEL, STAGE_HEAVY_MODEL)


@dataclasses.dataclass(frozen=True)
class ModerationEvent:
    """One decision, as it appears on the live feed."""

    image_id: str
    decision: str
    stage: str
    latency_ms: float
    nsfw_score: Optional[float] = None
    model_version: Optional[str] = None
    ts: Optional[str] = None

    def as_dict(self) -> dict:
        payload = dataclasses.asdict(self)
        if payload["ts"] is None:
            payload["ts"] = datetime.now(timezone.utc).isoformat()
        return payload


def publish(event: ModerationEvent, *, client: Any = None) -> bool:
    """Publish ``event`` to the live channel. Returns whether it went out.

    Never raises. A dead Redis, a serialisation problem or a bad payload all
    degrade to a logged warning and ``False`` — the caller has already made its
    decision and must not be rolled back by a telemetry failure.

    Pass ``client`` to reuse a connection the caller already holds; otherwise a
    client is obtained from :mod:`app.storage`.
    """
    try:
        if client is None:
            # Imported lazily: keeps `common` importable in contexts where the
            # app's dependencies (and env) are not set up, such as unit tests.
            from app.storage import get_redis_client

            client = get_redis_client()

        client.publish(CHANNEL, json.dumps(event.as_dict()))
        return True
    except Exception as exc:
        log.warning("failed to publish moderation event for %s: %s", event.image_id, exc)
        return False
