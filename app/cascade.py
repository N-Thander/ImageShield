"""Threshold cascade: turn a model score into a moderation decision.

Phase 0 keeps only the decision vocabulary and the threshold plumbing so the
schema's ``decision`` column and the REVIEW_LOW/REVIEW_HIGH env vars have a
single owner. The real multi-stage cascade lands in phase 1.
"""

from __future__ import annotations

from typing import Optional

from app import config

PENDING = "PENDING"
SAFE = "SAFE"
REVIEW = "REVIEW"
BLOCK = "BLOCK"

DECISIONS = (PENDING, SAFE, REVIEW, BLOCK)


def decide(
    nsfw_score: float,
    review_low: Optional[float] = None,
    review_high: Optional[float] = None,
) -> str:
    """Map an NSFW probability onto SAFE / REVIEW / BLOCK.

    TODO(phase-1): this is the cheap first stage only. The real cascade adds a
    phash/near-duplicate short-circuit ahead of it and an expensive
    second-stage model for the REVIEW band.
    """
    raise NotImplementedError("TODO(phase-1): implement cascade decision")


def thresholds() -> tuple[float, float]:
    """Active ``(review_low, review_high)`` band from config."""
    return config.REVIEW_LOW, config.REVIEW_HIGH
