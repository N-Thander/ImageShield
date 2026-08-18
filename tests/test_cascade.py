"""Cascade tests.

Nothing here loads the model. The threshold tests are pure, and the
short-circuit tests assert precisely that the model is *never* reached — a fake
Redis stands in for storage and ``app.models`` is left unimported.
"""

from __future__ import annotations

import json

import pytest
from PIL import Image

from app import cascade
from app.schemas import ModerationVerdict
from common import events, hashing
from common.phash_index import PHashIndex


# --------------------------------------------------------------------------- #
# fakes
# --------------------------------------------------------------------------- #


class FakeRedis:
    """Minimal stand-in for the subset of redis-py the cascade touches."""

    def __init__(self, initial: dict | None = None):
        self.store: dict[str, str] = dict(initial or {})
        self.published: list[tuple[str, str]] = []

    def get(self, key):
        return self.store.get(key)

    def setex(self, key, _ttl, value):
        self.store[key] = value

    def publish(self, channel, message):
        self.published.append((channel, message))


def exploding_score(_image):
    raise AssertionError("the model must not be reached on a short-circuit")


@pytest.fixture
def image():
    return Image.new("RGB", (64, 64), color=(120, 30, 200))


@pytest.fixture
def image_bytes():
    return b"\x89PNG\r\n\x1a\n fake image bytes"


@pytest.fixture(autouse=True)
def isolated_index(monkeypatch):
    """Give every test its own phash index — the real one is a module singleton."""
    index = PHashIndex()
    monkeypatch.setattr(cascade, "phash_index", index)
    return index


# --------------------------------------------------------------------------- #
# decide() — against the real configured thresholds, not hard-coded numbers
# --------------------------------------------------------------------------- #


def test_decide_low_score_is_safe():
    low, _high = cascade.thresholds()
    assert 0.02 <= low, "fixture assumes 0.02 sits in the SAFE band"
    assert cascade.decide(0.02) == cascade.SAFE


def test_decide_mid_score_is_review():
    low, high = cascade.thresholds()
    midpoint = (low + high) / 2
    assert cascade.decide(midpoint) == cascade.REVIEW


def test_decide_high_score_is_block():
    _low, high = cascade.thresholds()
    assert 0.95 >= high, "fixture assumes 0.95 sits in the BLOCK band"
    assert cascade.decide(0.95) == cascade.BLOCK


def test_decide_boundaries_are_inclusive():
    low, high = cascade.thresholds()
    # The band edges belong to the decisive verdicts, not to REVIEW.
    assert cascade.decide(low) == cascade.SAFE
    assert cascade.decide(high) == cascade.BLOCK


def test_decide_honours_explicit_thresholds():
    assert cascade.decide(0.5, review_low=0.6, review_high=0.9) == cascade.SAFE
    assert cascade.decide(0.5, review_low=0.1, review_high=0.4) == cascade.BLOCK


def test_decide_returns_known_vocabulary():
    for score in (0.0, 0.5, 1.0):
        assert cascade.decide(score) in cascade.DECISIONS


# --------------------------------------------------------------------------- #
# cache short-circuit
# --------------------------------------------------------------------------- #


def test_cache_hit_short_circuits_before_the_model(monkeypatch, image, image_bytes):
    monkeypatch.setattr("app.models.score_image", exploding_score, raising=False)

    sha = hashing.sha256_hex(image_bytes)
    redis = FakeRedis(
        {
            cascade._cache_key(sha): json.dumps(
                {
                    "image_id": "seen-before",
                    "decision": cascade.BLOCK,
                    "nsfw_score": 0.97,
                    "phash": "ffffffffffffffff",
                    "model_version": "falconsai-vit-1",
                }
            )
        }
    )

    verdict = cascade.moderate(image_bytes, image, "new-id", redis_client=redis)

    assert isinstance(verdict, ModerationVerdict)
    assert verdict.stage == events.STAGE_CACHE
    assert verdict.decision == cascade.BLOCK
    assert verdict.image_id == "new-id"
    assert verdict.sha256 == sha
    # The cached verdict is attributed to the image it originally came from.
    assert verdict.matched_image_id == "seen-before"
    assert verdict.matched_distance == 0
    assert verdict.nsfw_score == 0.97
    assert verdict.latency_ms >= 0


def test_cache_hit_publishes_one_event(monkeypatch, image, image_bytes):
    monkeypatch.setattr("app.models.score_image", exploding_score, raising=False)

    sha = hashing.sha256_hex(image_bytes)
    redis = FakeRedis(
        {cascade._cache_key(sha): json.dumps({"image_id": "x", "decision": cascade.SAFE})}
    )

    cascade.moderate(image_bytes, image, "new-id", redis_client=redis)

    assert len(redis.published) == 1
    channel, message = redis.published[0]
    assert channel == events.CHANNEL

    payload = json.loads(message)
    assert payload["stage"] == events.STAGE_CACHE
    assert payload["decision"] == cascade.SAFE
    assert payload["image_id"] == "new-id"
    assert payload["ts"] is not None


def test_malformed_cache_entry_is_ignored_not_fatal(monkeypatch, image, image_bytes):
    """A corrupt entry must fall through to the next stage, not raise."""
    sha = hashing.sha256_hex(image_bytes)
    redis = FakeRedis({cascade._cache_key(sha): "not json{"})

    monkeypatch.setattr("app.models.score_image", lambda _img: 0.01, raising=False)

    verdict = cascade.moderate(image_bytes, image, "id", redis_client=redis)
    assert verdict.stage == events.STAGE_CHEAP_MODEL
    assert verdict.decision == cascade.SAFE


# --------------------------------------------------------------------------- #
# phash short-circuit
# --------------------------------------------------------------------------- #


def test_phash_hit_short_circuits_before_the_model(
    monkeypatch, isolated_index, image, image_bytes
):
    monkeypatch.setattr("app.models.score_image", exploding_score, raising=False)

    # Pre-seed the index with this exact image's perceptual hash.
    isolated_index.add(
        hashing.phash_hex(image),
        {"image_id": "near-dup", "decision": cascade.REVIEW, "nsfw_score": 0.55},
    )
    redis = FakeRedis()

    verdict = cascade.moderate(image_bytes, image, "new-id", redis_client=redis)

    assert verdict.stage == events.STAGE_PHASH
    assert verdict.decision == cascade.REVIEW
    assert verdict.matched_image_id == "near-dup"
    assert verdict.matched_distance == 0
    # The exact bytes are now cached, so a repeat lands on stage 1.
    assert cascade._cache_key(verdict.sha256) in redis.store


def test_model_path_populates_cache_and_index(monkeypatch, isolated_index, image, image_bytes):
    monkeypatch.setattr("app.models.score_image", lambda _img: 0.99, raising=False)
    redis = FakeRedis()

    verdict = cascade.moderate(image_bytes, image, "fresh", redis_client=redis)

    assert verdict.stage == events.STAGE_CHEAP_MODEL
    assert verdict.decision == cascade.BLOCK
    assert verdict.nsfw_score == 0.99
    assert verdict.model_version == cascade.config.MODEL_VERSION

    # Both short-circuit paths are now primed for the next identical image.
    assert cascade._cache_key(verdict.sha256) in redis.store
    assert len(isolated_index) == 1


def test_publish_failure_does_not_break_the_decision(monkeypatch, image, image_bytes):
    """Telemetry is best-effort; a dead Redis must not lose a verdict."""

    class BrokenPublish(FakeRedis):
        def publish(self, channel, message):
            raise ConnectionError("redis is down")

    monkeypatch.setattr("app.models.score_image", lambda _img: 0.01, raising=False)

    verdict = cascade.moderate(image_bytes, image, "id", redis_client=BrokenPublish())
    assert verdict.decision == cascade.SAFE


# --------------------------------------------------------------------------- #
# hashing sanity — the cascade's stage-2 accuracy rests on these
# --------------------------------------------------------------------------- #


def structured_image():
    """A photo-like image: smooth variation plus a hard edge.

    Deliberately *not* a flat fill or a pure gradient. Those are degenerate for
    a DCT hash — almost all their energy sits in one or two coefficients and the
    rest of the 8x8 block sits on the median, so trivial noise flips many bits
    at once. Real photographs have broadband structure and are stable.
    """
    import numpy as np

    xs, ys = np.meshgrid(np.linspace(0, 1, 128), np.linspace(0, 1, 128))
    pixels = np.sin(xs * 9) * np.cos(ys * 7) * 110 + 128
    pixels[30:70, 40:90] = 20
    return Image.fromarray(pixels.astype("uint8")).convert("RGB")


def test_phash_is_stable_across_reencoding():
    import io

    original = structured_image()

    buffer = io.BytesIO()
    original.save(buffer, format="JPEG", quality=50)
    recompressed = Image.open(io.BytesIO(buffer.getvalue()))

    from common.phash_index import hamming

    distance = hamming(hashing.phash_hex(original), hashing.phash_hex(recompressed))
    assert distance <= 6, f"re-encoding moved the hash {distance} bits"


def test_phash_is_stable_across_resizing():
    from common.phash_index import hamming

    original = structured_image()
    distance = hamming(
        hashing.phash_hex(original),
        hashing.phash_hex(original.resize((64, 64))),
    )
    assert distance <= 6, f"resizing moved the hash {distance} bits"


def test_phash_separates_different_images():
    from common.phash_index import hamming

    black = Image.new("RGB", (64, 64), (0, 0, 0))
    assert hamming(hashing.phash_hex(black), hashing.phash_hex(structured_image())) > 6
