import os

POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "dev")
POSTGRES_DB = os.getenv("POSTGRES_DB", "imageshield")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))

DATABASE_URL = (
    f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
REDIS_PORT = int(os.getenv("REDIS_PORT", "6379"))

MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ROOT_USER = os.getenv("MINIO_ROOT_USER", "minio")
MINIO_ROOT_PASSWORD = os.getenv("MINIO_ROOT_PASSWORD", "minio123")
MINIO_BUCKET = os.getenv("MINIO_BUCKET", "imageshield")
MINIO_SECURE = os.getenv("MINIO_SECURE", "false").lower() == "true"

MODEL_NAME = os.getenv("MODEL_NAME", "Falconsai/nsfw_image_detection")
MODEL_VERSION = os.getenv("MODEL_VERSION", "falconsai-vit-1")
REVIEW_LOW = float(os.getenv("REVIEW_LOW", "0.30"))
REVIEW_HIGH = float(os.getenv("REVIEW_HIGH", "0.80"))
