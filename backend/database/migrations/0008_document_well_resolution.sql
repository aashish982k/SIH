ALTER TABLE documents
  ADD COLUMN well_resolution VARCHAR(32) NULL AFTER processing_error,
  ADD COLUMN resolved_well_name VARCHAR(120) NULL AFTER well_resolution,
  ADD COLUMN resolved_latitude DECIMAL(10,7) NULL AFTER resolved_well_name,
  ADD COLUMN resolved_longitude DECIMAL(10,7) NULL AFTER resolved_latitude;
