"""Request/response models for the API."""

from __future__ import annotations

from typing import Optional

from pydantic import BaseModel, Field


class ModerateRequest(BaseModel):
    image_url: str = Field(..., min_length=1, description="Source URL of the image to moderate.")
    # Fixture-testing only: lets bench runs assert against a known label.
    expected_label: Optional[str] = None


class ModerateResponse(BaseModel):
    image_id: str
    sha256: str
    original_path: str
    decision: str
    model_version: Optional[str] = None
    expected_label: Optional[str] = None
    created_at: Optional[str] = None


class ModerationVerdict(BaseModel):
    """What the cascade returns for one image.

    Distinct from :class:`ModerateResponse`, which is the HTTP envelope: this is
    the internal decision record, carrying how the decision was reached (stage,
    cost) rather than how the row is presented.
    """

    image_id: str
    sha256: str
    decision: str
    stage: str
    latency_ms: float
    # Absent when an earlier stage short-circuited before any model ran and the
    # short-circuited-to record carried no score.
    nsfw_score: Optional[float] = None
    phash: Optional[str] = None
    model_version: Optional[str] = None
    # Set on a phash near-duplicate hit: the image whose verdict was reused.
    matched_image_id: Optional[str] = None
    # Hamming distance to `matched_image_id`; 0 means an exact phash match.
    matched_distance: Optional[int] = None


class HealthResponse(BaseModel):
    status: str
    postgres: bool
    redis: bool
    minio: bool
