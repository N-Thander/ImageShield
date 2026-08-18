"""Content hashes for the moderation cascade.

Two different jobs, deliberately kept apart:

* :func:`sha256_hex` is an *exact* hash over the raw bytes. One flipped bit is a
  different hash. It backs the exact-duplicate cache.
* :func:`phash_hex` is a *perceptual* hash over what the image looks like.
  Re-encoding, resizing or lightly recompressing the same picture lands on the
  same (or a very close) hash, which is what makes near-duplicate detection
  possible. Compare two of them with
  :func:`common.phash_index.hamming`, never with ``==``.
"""

from __future__ import annotations

import hashlib
from typing import Any

# 32x32 input reduced to the top-left 8x8 DCT block -> a 64-bit hash.
_DCT_SIZE = 32
_HASH_SIDE = 8
PHASH_BITS = _HASH_SIDE * _HASH_SIDE


def sha256_hex(data: bytes) -> str:
    """Exact content hash of the raw image bytes."""
    return hashlib.sha256(data).hexdigest()


def phash_hex(image: Any) -> str:
    """Return a 64-bit perceptual hash of a PIL image as 16 hex chars.

    Standard DCT pHash: greyscale, downscale, keep the low-frequency corner of
    the 2-D DCT, then threshold each coefficient against the median. Using the
    median (rather than the mean) keeps the result stable when one coefficient
    is extreme, and guarantees a balanced bit distribution.
    """
    # numpy is imported here rather than at module scope purely to keep this
    # module cheap for callers that only want sha256_hex.
    import numpy as np

    greyscale = image.convert("L").resize((_DCT_SIZE, _DCT_SIZE))
    pixels = np.asarray(greyscale, dtype=np.float64)

    coefficients = _dct_2d(pixels)
    block = coefficients[:_HASH_SIDE, :_HASH_SIDE]

    # The DC term carries overall brightness, not structure. Excluding it from
    # the median stops a uniformly dark or bright image from skewing every bit.
    median = np.median(block.flatten()[1:])

    bits = (block > median).flatten()
    value = 0
    for bit in bits:
        value = (value << 1) | int(bit)

    return f"{value:016x}"


def _dct_2d(matrix: Any) -> Any:
    """2-D DCT-II via separable matrix multiplication.

    Hand-rolled so this module needs only numpy — scipy.fft would be the usual
    route but is not a dependency of this project.
    """
    import numpy as np

    size = matrix.shape[0]
    n = np.arange(size)
    # basis[k, i] = cos(pi * (2i + 1) * k / 2N), scaled so the transform is orthonormal.
    basis = np.cos(np.pi * (2 * n[None, :] + 1) * n[:, None] / (2 * size))
    basis *= np.sqrt(2.0 / size)
    basis[0] *= np.sqrt(0.5)

    return basis @ matrix @ basis.T
