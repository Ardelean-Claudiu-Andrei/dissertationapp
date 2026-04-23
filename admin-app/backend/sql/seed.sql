USE dissertationapp;

-- Feature flags for demo (INSERT IGNORE to avoid errors if already present)
INSERT IGNORE INTO feature_flags (id, name, description, enabled, rollout_pct, min_version, created_at, updated_at)
VALUES
  (UUID(), 'enhanced_results',  'Animated results screen with stats and auto-refresh', 1, 100, '1.5.0', NOW(), NOW()),
  (UUID(), 'version_gate',      'Block users below minimum version',                   0, 100, '2.0.0', NOW(), NOW()),
  (UUID(), 'show_debug_info',   'Show cohort and version badge in UI',                 1, 100, '1.0.0', NOW(), NOW()),
  (UUID(), 'maintenance_mode',  'Show maintenance banner in HomeScreen',               0,   0, '1.0.0', NOW(), NOW());

-- 3 demo polls
INSERT IGNORE INTO polls (id, title, description, status, created_at, updated_at)
VALUES
  (UUID(), 'Ce tehnologie preferați pentru backend?', 'Alege platforma preferată pentru API-uri REST.', 'active', NOW(), NOW()),
  (UUID(), 'Cum gestionați versiunile unei aplicații mobile?', 'Tehnici de distribuție și rollout.', 'active', NOW(), NOW()),
  (UUID(), 'Ce strategie de scalare preferați?', 'Scalare orizontală vs verticală.', 'draft', NOW(), NOW());
