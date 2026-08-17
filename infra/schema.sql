-- schema.sql — ImageShield image moderation ingestion table
CREATE EXTENSION IF NOT EXISTS vector;   -- ready for embeddings later; no-op now

CREATE TABLE IF NOT EXISTS images (
    image_id       TEXT PRIMARY KEY,
    sha256         TEXT NOT NULL,
    phash          TEXT,
    original_path  TEXT NOT NULL,
    stored_path    TEXT,
    nsfw_score     REAL,
    decision       TEXT NOT NULL DEFAULT 'PENDING',  -- PENDING | SAFE | REVIEW | BLOCK
    model_version  TEXT,
    expected_label TEXT,                             -- fixture testing only
    created_at     TIMESTAMPTZ DEFAULT now(),
    processed_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_images_decision ON images(decision);
CREATE INDEX IF NOT EXISTS idx_images_sha256   ON images(sha256);
