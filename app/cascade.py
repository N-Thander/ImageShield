"""Threshold cascade: turn an image into a moderation decision.

The cascade runs cheapest-first and stops at the first stage that can answer:

1. **cache**  — exact sha256 match against a previously decided image.
2. **phash**  — perceptual near-duplicate within the index's Hamming radius.
3. **cheap_model** — the ViT classifier in :mod:`app.models`, then thresholds.

Each stage that answers publishes a :class:`common.events.ModerationEvent` with
its own stage name and the measured wall-clock cost, so the dashboard can show
how much work the cascade is deflecting away from the model.

Nothing here downloads, stores or enqueues anything — the caller owns fetching
the bytes and persisting the result.
"""

from __future__ import annotations

import json
import logging
import time
from typing import Any, Optional

from app import config
from app.schemas import ModerationVerdict
from common import events, hashing
from common.phash_index import phash_hex as phash_index

log = logging.getLogger("imageshield.cascade")

PENDING = "PENDING"
SAFE = "SAFE"
REVIEW = "REVIEW"
BLOCK = "BLOCK"

DECISIONS = (PENDING, SAFE, REVIEW, BLOCK)

# Redis key prefix for the exact-content cache.
CACHE_PREFIX = "imageshield:sha:"
# Cached verdicts expire so a threshold or model-version change eventually wins.
CACHE_TTL_SECONDS = 7 * 24 * 60 * 60


def decide(
    nsfw_score: float,
    review_low: Optional[float] = None,
    review_high: Optional[float] = None,
) -> str:
    """Map an NSFW probability onto SAFE / REVIEW / BLOCK.

    Bands are inclusive at both ends: ``<= review_low`` is SAFE and
    ``>= review_high`` is BLOCK, leaving the open interval between them for
    human REVIEW. Thresholds default to the active config values.
    """
    low, high = thresholds()
    if review_low is not None:
        low = review_low
    if review_high is not None:
        high = review_high

    if nsfw_score >= high:
        return BLOCK
    if nsfw_score <= low:
        return SAFE
    return REVIEW


def thresholds() -> tuple[float, float]:
    """Active ``(review_low, review_high)`` band from config."""
    return config.REVIEW_LOW, config.REVIEW_HIGH


# --------------------------------------------------------------------------- #
# orchestration
# --------------------------------------------------------------------------- #


def moderate(
    image_bytes: bytes,
    image: Any,
    image_id: str,
    *,
    redis_client: Any = None,
    max_distance: Optional[int] = None,
) -> ModerationVerdict:
    """Run the full cascade over one already-fetched image.

    ``image_bytes`` are the raw bytes as downloaded (hashed exactly) and
    ``image`` is the decoded PIL image (hashed perceptually and, if it gets that
    far, scored). Both are supplied by the caller; this function performs no I/O
    beyond Redis.
    """
    started = time.perf_counter()

    if redis_client is None:
        # Imported lazily so importing this module stays cheap and test doubles
        # can be injected without a live Redis.
        from app.storage import get_redis_client

        redis_client = get_redis_client()

    sha256 = hashing.sha256_hex(image_bytes)

    # --- stage 1: exact duplicate ------------------------------------------ #
    cached = _cache_get(redis_client, sha256)
    if cached is not None:
        verdict = ModerationVerdict(
            image_id=image_id,
            sha256=sha256,
            decision=cached["decision"],
            stage=events.STAGE_CACHE,
            latency_ms=_elapsed_ms(started),
            nsfw_score=cached.get("nsfw_score"),
            phash=cached.get("phash"),
            model_version=cached.get("model_version"),
            matched_image_id=cached.get("image_id"),
            matched_distance=0,
        )
        _emit(verdict, redis_client)
        return verdict

    # --- stage 2: perceptual near-duplicate -------------------------------- #
    phash = hashing.phash_hex(image)
    match = phash_index.nearest(phash, max_distance)

    if match is not None:
        distance, _matched_hex, payload = match
        payload = payload if isinstance(payload, dict) else {}

        verdict = ModerationVerdict(
            image_id=image_id,
            sha256=sha256,
            decision=payload.get("decision", PENDING),
            stage=events.STAGE_PHASH,
            latency_ms=_elapsed_ms(started),
            nsfw_score=payload.get("nsfw_score"),
            phash=phash,
            model_version=payload.get("model_version"),
            matched_image_id=payload.get("image_id"),
            matched_distance=distance,
        )
        # Cache under *this* image's sha so the identical bytes skip straight to
        # stage 1 next time, but do not re-add the phash: it is already indexed
        # within the match radius and a second entry would only grow the tree.
        _cache_put(redis_client, sha256, verdict)
        _emit(verdict, redis_client)
        return verdict

    # --- stage 3: the model ------------------------------------------------ #
    # Imported here, not at module scope: app.models pulls torch/transformers on
    # first use and this module must stay importable without them.
    from app import models

    nsfw_score = float(models.score_image(image))
    verdict = ModerationVerdict(
        image_id=image_id,
        sha256=sha256,
        decision=decide(nsfw_score),
        stage=events.STAGE_CHEAP_MODEL,
        latency_ms=_elapsed_ms(started),
        nsfw_score=nsfw_score,
        phash=phash,
        model_version=config.MODEL_VERSION,
    )

    # Only a freshly-scored image earns an index entry — that is what lets the
    # next near-duplicate short-circuit at stage 2.
    _index_put(phash, verdict)
    _cache_put(redis_client, sha256, verdict)
    _emit(verdict, redis_client)
    return verdict


# --------------------------------------------------------------------------- #
# helpers — every one of these is best-effort and must not break a decision
# --------------------------------------------------------------------------- #


def _elapsed_ms(started: float) -> float:
    return round((time.perf_counter() - started) * 1000, 3)


def _cache_key(sha256: str) -> str:
    return f"{CACHE_PREFIX}{sha256}"


def _cache_get(client: Any, sha256: str) -> Optional[dict]:
    try:
        raw = client.get(_cache_key(sha256))
    except Exception as exc:
        log.warning("cache lookup failed for %s: %s", sha256[:12], exc)
        return None

    if not raw:
        return None

    try:
        payload = json.loads(raw)
    except (TypeError, ValueError) as exc:
        log.warning("discarding malformed cache entry for %s: %s", sha256[:12], exc)
        return None

    # A cache entry without a decision cannot short-circuit anything.
    return payload if isinstance(payload, dict) and payload.get("decision") else None


def _cache_put(client: Any, sha256: str, verdict: ModerationVerdict) -> None:
    try:
        client.setex(_cache_key(sha256), CACHE_TTL_SECONDS, json.dumps(_payload(verdict)))
    except Exception as exc:
        log.warning("cache write failed for %s: %s", sha256[:12], exc)


def _index_put(phash: str, verdict: ModerationVerdict) -> None:
    try:
        phash_index.add(phash, _payload(verdict))
    except Exception as exc:
        log.warning("phash index write failed for %s: %s", verdict.image_id, exc)


def _payload(verdict: ModerationVerdict) -> dict:
    """The subset of a verdict worth reusing when a later image matches it."""
    return {
        "image_id": verdict.image_id,
        "decision": verdict.decision,
        "nsfw_score": verdict.nsfw_score,
        "phash": verdict.phash,
        "model_version": verdict.model_version,
    }


def _emit(verdict: ModerationVerdict, client: Any) -> None:
    events.publish(
        events.ModerationEvent(
            image_id=verdict.image_id,
            decision=verdict.decision,
            stage=verdict.stage,
            latency_ms=verdict.latency_ms,
            nsfw_score=verdict.nsfw_score,
            model_version=verdict.model_version,
        ),
        client=client,
    )
