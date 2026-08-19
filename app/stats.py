import asyncio
import time
from collections import deque

from fastapi import APIRouter

from app import decisions
from common.events import subscribe

router = APIRouter()

WINDOW_SECONDS = 900
MAX_EVENTS = 3000

class RollingStats:
    def __init__(self) -> None:
          self._events: deque[tuple[float, str, str, str, float]] = deque()
          self._task : asyncio.Task | None = None

    def start(self) -> None:
        if self._task is None:
            self._task = asyncio.create_task(self._consume())

    async def _consume(self) -> None:
        async for e in subscribe():
            self._events.append((time.time(), e.decision, e.stage, e.latency_ms))
            self._evict()


    def _evict(self) -> None:
        cutoff = time.time() - WINDOW_SECONDS
        while self._events and (self._events[0][0] < cutoff or len(self._events) > MAX_EVENTS):
            self._events.popleft()

    def snapshot(self) -> dict:
        self._evict()
        evts = list(self._events)
        n = len(evts)
        if n == 0:
            return {
                "throughput": 0.0,
                "p50": None,
                "p95": None,
                "p99": None,
                "decision": {},
                "stages": {},
                "cache_hit_rate": None,
                "queue_depth": None,
                "sample_size": 0
            }

        span = max(evts[-1][0] - evts[0][0], 1e-6)
        latencies = sorted(e[3] for e in evts)

        def pct(p: float) -> float:
            idx = min((int p / 100 * n), n - 1)
            return round(latencies[idx], 2)

        decisions: dict[str, int] = {}
        stages: dict[str, int] = {}

        for _, decision, stage, _in evts:
            decision[decision] =  decision.get(decision, 0) + 1
            stages[stage] = stages.get(stage, 0) + 1

        cache_like = stages.get("cache", 0) + stages.get("phase", 0)
        return {
            "throughput": round(n / span, 2),
            "p50": pct(50), "p95": pct(95), "p99":pct(99),
            "decisions": decisions, "stages": stages,
            "cache_hit_rate": round(cache_like / n , 4),
            "queue_depth": None,
            "sample_size": n
        }

stats = RollingStats()

@router.get("/stats")
async def get_stats() -> dict:
    return stats.snapshot()
