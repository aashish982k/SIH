-- Phase 6: preserve existing risk sources while adding RAG/LLM provenance.
-- Run once against an existing database; fresh installs use database/schema.sql.
ALTER TABLE risks
  MODIFY COLUMN source ENUM('rule_engine','ml_model','rag_llm','manual')
    NOT NULL DEFAULT 'rule_engine',
  ADD COLUMN reasoning TEXT NULL AFTER source,
  ADD COLUMN evidence JSON NULL AFTER reasoning,
  ADD COLUMN recommendation TEXT NULL AFTER evidence;
