CREATE DATABASE IF NOT EXISTS dissertationapp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE dissertationapp;

CREATE TABLE IF NOT EXISTS users (
  id          CHAR(36)     NOT NULL,
  device_id   VARCHAR(255) NOT NULL,
  app_version VARCHAR(20)  NOT NULL DEFAULT '1.0.0',
  country     VARCHAR(10)  NOT NULL DEFAULT 'RO',
  cohort      VARCHAR(50)  NOT NULL DEFAULT 'cohort_a',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_device_id (device_id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS polls (
  id          CHAR(36)                          NOT NULL,
  title       VARCHAR(255)                      NOT NULL,
  description TEXT,
  status      ENUM('draft','active','closed')   NOT NULL DEFAULT 'draft',
  created_at  DATETIME                          NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME                          NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_polls_status (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS options (
  id          CHAR(36)     NOT NULL,
  poll_id     CHAR(36)     NOT NULL,
  text        VARCHAR(255) NOT NULL,
  vote_count  INT          NOT NULL DEFAULT 0,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_options_poll (poll_id),
  CONSTRAINT fk_options_poll FOREIGN KEY (poll_id) REFERENCES polls (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS votes (
  id          CHAR(36)  NOT NULL,
  poll_id     CHAR(36)  NOT NULL,
  option_id   CHAR(36)  NOT NULL,
  user_id     CHAR(36)  NOT NULL,
  created_at  DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_vote (user_id, poll_id),
  INDEX idx_votes_poll (poll_id),
  INDEX idx_votes_user (user_id),
  CONSTRAINT fk_votes_poll   FOREIGN KEY (poll_id)   REFERENCES polls   (id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_option FOREIGN KEY (option_id) REFERENCES options (id) ON DELETE CASCADE,
  CONSTRAINT fk_votes_user   FOREIGN KEY (user_id)   REFERENCES users   (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS feature_flags (
  id          CHAR(36)     NOT NULL,
  name        VARCHAR(100) NOT NULL,
  description TEXT,
  enabled     TINYINT(1)   NOT NULL DEFAULT 1,
  rollout_pct INT          NOT NULL DEFAULT 100,
  min_version VARCHAR(20)  NOT NULL DEFAULT '1.0.0',
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_flag_name (name),
  INDEX idx_flags_enabled (enabled)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS flag_assignments (
  id          CHAR(36)  NOT NULL,
  user_id     CHAR(36)  NOT NULL,
  flag_id     CHAR(36)  NOT NULL,
  assigned_at DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_assignment (user_id, flag_id),
  CONSTRAINT fk_assign_user FOREIGN KEY (user_id) REFERENCES users         (id) ON DELETE CASCADE,
  CONSTRAINT fk_assign_flag FOREIGN KEY (flag_id) REFERENCES feature_flags (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_log (
  id          CHAR(36)     NOT NULL,
  user_id     CHAR(36),
  event_type  VARCHAR(100) NOT NULL,
  payload     JSON,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  INDEX idx_event_user (user_id),
  INDEX idx_event_type (event_type),
  INDEX idx_event_created (created_at)
) ENGINE=InnoDB;
