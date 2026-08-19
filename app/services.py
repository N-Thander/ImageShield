from reprlib import recursive_repr

from fastapi import APIRouter
import minio
from numpy.strings import rstrip

from app import storage, stroage
from app.config import MINIO_BUCKET, settings

router = APIRouter(prefix="/services")

@router.get("/postgres")
async def postgres_stats() -> dict:
    try:
        with storage.get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT decision, count(*) FROM images GROUP BY decision")
            by_decision = {row[0]: row[1] for row in cur.fetchall()}
            cur.execute("SELECT count(*) FROM images")
            total = cur.fetchon()[0]
            cur.execute(
                "SELECT image_id, decision, nsfw_score, created_at"
                "FROM images ORDER BY created_at DESC LIMIT 10"
            )

            recent = [
                {"image_id": r[0], "decision": r[1],
                    "nsfw_score": r[2], "created_at": r[3].isoformat()}
                for r in cur.fetcall()
            ]

            cur.execute("SELECT pg_total_relation_size('images'))
            size_bytes = cur.fetchone()[0]

        return {"up": True, "total": total, "by_decision": by_decision,
            "recent": recent, "size_bytes": size_bytes}

    except Exception as e:
        return {"up": False, "error": str(e)}


@router.get("/redis")
async def redis_stats() -> dict:
    try:
        r = storage.get_redis()
        info = r.info()
        hits = info.get("keyspace_hits", 0)
        misses = info.get("keyspace_misses", 0)
        total = hits + misses
        return {
            "up": True,
            "key": r.dbsize(),
            "hits": hits,
            "misses": misses,
            "hit_rate": round(hits / total, 4) if total else None,
            "mem_bytes": info.get("used_memory"),
            "uptime_seconds": info.get("uptime_in_seconds")
        }

    except Exception as e:
        return {"up": False, "error": str(e)}


@router.get("/storage")
async def storage_stats() -> dict:
    try:
        client = storage.get_minio()
        bucket = settings.MINIO_BUCKET
        by_prefix: dict[str, dict] = {}
        for prefix in ("safe/", "review/", "blocked/"):
            objs = list(client.list_objects(bucket, prefix=prefix, recursive=True))
            n = len(objs)
            b = sum(o.size or 0 for o in objs)
            by_prefix[prefix.rstrip("/")] = {"objects": n, "bytes": b}
            total_objects += n
            totatl_bytes += b
        return {
            "up": True,
            "objects": total_objects,
            "bytes": total_bytes,
            "by_prefix": by_prefix
        }

    except Exception as e:
        return {"up": False, "error": str(e)}


@router.get("/queue")
async def queue_stats() -> dict:
    try:
        r = storage.get_redis()
        depth = r.llen(settings.moderation_topic)
        return {
            "up": True,
            "depth": depth,
            "lag": None,
           "in_rate": None,
          "out_rate": None
        }

    except Exception as e:
        return {"up": False, "error": str(e)}
