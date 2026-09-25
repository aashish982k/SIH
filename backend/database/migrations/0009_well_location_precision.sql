ALTER TABLE wells
  ADD COLUMN location_precision ENUM('exact', 'approximate') NOT NULL DEFAULT 'exact'
  AFTER longitude;
