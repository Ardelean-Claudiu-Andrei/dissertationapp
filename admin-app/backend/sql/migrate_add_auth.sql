USE dissertationapp;

ALTER TABLE users
  ADD COLUMN email         VARCHAR(255) NULL         AFTER device_id,
  ADD COLUMN password_hash VARCHAR(255) NULL         AFTER email,
  ADD COLUMN first_name    VARCHAR(100) NULL         AFTER password_hash,
  ADD COLUMN last_name     VARCHAR(100) NULL         AFTER first_name,
  ADD UNIQUE KEY uq_email (email);
