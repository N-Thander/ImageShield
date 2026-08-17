"""Model-loading scaffold.

Deliberately does **no** work at import time — importing this module must stay
cheap so the API can boot (and /health can answer) without pulling weights.
Loading is lazy and cached; the first caller pays the download cost, which in
Docker lands in the ``hf_cache`` named volume.
"""

from __future__ import annotations

import logging
import threading
from typing import Any, Optional

from app import config

log = logging.getLogger("imageshield.models")

_lock = threading.Lock()
_processor: Optional[Any] = None
_model: Optional[Any] = None


def load_model() -> tuple[Any, Any]:
    """Return ``(processor, model)``, loading once on first call.

    TODO(phase-1): device selection (cpu/cuda), fp16, ``model.eval()``,
    warm-up pass, and a real error path when the download fails.
    """
    global _processor, _model

    if _model is not None and _processor is not None:
        return _processor, _model

    with _lock:
        if _model is None or _processor is None:
            # Imported here, not at module scope: transformers/torch cost
            # seconds to import and must not block API startup.
            from transformers import AutoImageProcessor, AutoModelForImageClassification

            log.info("loading model %s", config.MODEL_NAME)
            _processor = AutoImageProcessor.from_pretrained(config.MODEL_NAME)
            _model = AutoModelForImageClassification.from_pretrained(config.MODEL_NAME)

    return _processor, _model


def score_image(image: Any) -> float:
    """Return P(nsfw) in ``[0, 1]`` for a PIL image.

    TODO(phase-1): preprocess, forward pass under ``torch.inference_mode()``,
    softmax the logits, and map the label index to the nsfw probability.
    """
    raise NotImplementedError("TODO(phase-1): implement NSFW scoring")


def model_version() -> str:
    """Identifier stamped onto every row this model decides."""
    return config.MODEL_VERSION
