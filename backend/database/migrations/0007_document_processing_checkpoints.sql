-- Add durable document-processing checkpoints to databases created before
-- the staged upload pipeline. Fresh databases already include these columns
-- in database/schema.sql.
ALTER TABLE documents
  ADD COLUMN processing_checkpoint VARCHAR(80) NULL AFTER status,
  ADD COLUMN processing_error TEXT NULL AFTER processing_checkpoint;
