import threading
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from PIL import Image

# If your app/config already exposes the model id, import it from there instead
# and delete this constant, to keep a single source of truth.
MODEL_ID = "Falconsai/nsfw_image_detection"

_model = None
_processor = None
_nsfw_index: int | None = None
_lock = threading.Lock()


def _load():
    """Load model + processor once. Safe under concurrent first calls."""
    global _model, _processor, _nsfw_index
    if _model is not None:                     # fast path, no lock
        return _model, _processor, _nsfw_index
    with _lock:
        if _model is None:                     # re-check inside the lock
            import torch  # noqa: F401  (kept warm for the no_grad context below)
            from transformers import (
                AutoModelForImageClassification,
                ViTImageProcessor,
            )

            model = AutoModelForImageClassification.from_pretrained(MODEL_ID)
            model.eval()                       # disable dropout/bn updates
            processor = ViTImageProcessor.from_pretrained(MODEL_ID)

            # resolve the nsfw class index from the model's own label map,
            # so we never hard-code 0/1 and break if the order ever changes
            id2label = {int(k): v.lower() for k, v in model.config.id2label.items()}
            nsfw_index = next(i for i, name in id2label.items() if name == "nsfw")

            _processor = processor
            _nsfw_index = nsfw_index
            _model = model                     # publish LAST: presence == fully ready
    return _model, _processor, _nsfw_index


def warmup() -> None:
    _load()


def score_image(img: "Image.Image") -> float:
    import torch

    model, processor, nsfw_index = _load()
    with torch.no_grad():
        inputs = processor(images=img.convert("RGB"), return_tensors="pt")
        logits = model(**inputs).logits
        probs = torch.softmax(logits, dim=-1)[0]
        return float(probs[nsfw_index].item())
