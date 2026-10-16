CREATE TABLE attendance_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attendance_id INT NOT NULL,
  employee_id VARCHAR(20) NOT NULL,
  actor_user_id INT NOT NULL,
  actor_role VARCHAR(32) NOT NULL,
  action ENUM('CHECK_IN', 'CHECK_OUT', 'MANUAL_CREATE', 'UPDATE', 'DELETE') NOT NULL,
  occurred_at TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  reason TEXT NULL,
  before_data JSON NULL,
  after_data JSON NULL,
  PRIMARY KEY (id),
  KEY idx_audit_attendance_time (attendance_id, occurred_at),
  KEY idx_audit_employee_time (employee_id, occurred_at),
  KEY idx_audit_actor_time (actor_user_id, occurred_at),
  CONSTRAINT fk_audit_actor_user
    FOREIGN KEY (actor_user_id)
    REFERENCES users (id)
    ON UPDATE RESTRICT
    ON DELETE RESTRICT
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;
