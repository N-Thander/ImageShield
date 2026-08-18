import threading
from dataclasses import dataclass, field
from typing import Any, Iterable, Optional


def _to_int(phash_hex: str) -> int:
    return int(phash_hex, 16)

def hamming(a_hex: str, b_hex: str) -> int:
    return (_to_int(a_hex) ^ _to_int(b_hex)).bit_count()


@dataclass
class _Node:
    key: int
    hex: str
    payload: Any
    childern: dict = field(default_factory=dict)


class PHashIndex:
    def __init__(self, max_distance: int = 6):
        self._root: Optional[_Node] = None
        self._lock = threading.Lock()
        self._size = 0
        self.default_max_distance = max_distance

    def __len__(self) -> int:
        return self._size

    def add(self, phash_hex: str, payload: Any) -> None:
        key = _to_int(phash_hex)
        with self._lock:
            if self._root is None:
                self._root = _Node(key, phash_hex, payload)
                self._size = 1
                return

            node = self._root

            while True:
                d = (node.key ^ key).bit_count()
                if d == 0:
                    node.payload = payload
                    return

                child = node.childern.get(d)
                if child is None:
                    node.childern[d] = _Node(key, phash_hex, payload)
                    self._size += 1
                    return
                node = child


    def query(self, phash_hex: str, max_distance: Optional[int] = None):
        if self._root is None:
            return []

        radius = self.default_max_distance if max_distance is None else max_distance
        key = _to_int(phash_hex)
        results: list[tuple[int, str, Any]] = []
        with self._lock:
            stack = [self._root]
            while stack:
                node = stack.pop()
                d = (node.key ^ key).bit_count()
                if d <= radius:
                    results.append((d, node.hex, node.payload))

                lo, hi = d - radius, d + radius
                for edge, child in node.childern.items():
                    if lo <= edge <= hi:
                        stack.append(child)

        results.sort(key=lambda t: t[0])
        return results

    def nearest(self, phash_hex: str, max_distance: Optional[int] = None):
        matches = self.query(phash_hex, max_distance)
        return matches[0] if matches else None

    def rebuild_from(self, rows: Iterable[tuple[str, Any]]) -> None:
        with self._lock:
            self._root = None
            self._size = 0
        for phash_hex, payload in rows:
            if phash_hex:
                self.add(phash_hex, payload)

phash_hex = PHashIndex()
