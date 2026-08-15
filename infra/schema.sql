CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS image (
    image_id    TEXT PRIMARY KEY,
    sha256  TEXT NOT NULL,
    phash   TEXT,
    original_path   TEXT NOT NULL,
    stored_path TEXT,
    nsfw_score  REAL,
    decision    TEXT NOT NULL DEFAULT 'PENDING',
    model_version   TEXT,
    expected_label  TEXT,
    created_at  TIMESTAMPTZ DEFAULT now(),
    processed_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_images_decision ON image(decision);
CREATE INDEX IF NOT EXISTS idx_images_sha256 ON images(sha256)

-- TRUNCATE images;
