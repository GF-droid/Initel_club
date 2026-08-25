CREATE TABLE IF NOT EXISTS operation_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  operation_type VARCHAR(32) NOT NULL,
  room_id VARCHAR(16) NULL,
  action VARCHAR(64) NOT NULL,
  details JSON NULL,
  success TINYINT(1) NOT NULL DEFAULT 0,
  message VARCHAR(255) NULL,
  operator VARCHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_operation_logs_created_at (created_at),
  KEY idx_operation_logs_room_id (room_id),
  KEY idx_operation_logs_success (success)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
