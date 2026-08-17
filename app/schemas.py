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


class HealthResponse(BaseModel):
    status: str
    postgres: bool
    redis: bool
    minio: bool
