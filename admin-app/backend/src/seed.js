require('dotenv').config();
const { randomUUID } = require('crypto');
const pool = require('./db');

const POLLS = [
  {
    title: 'Ce tehnologie frontend preferați?',
    options: ['React', 'Vue', 'Angular', 'Svelte'],
  },
  {
    title: 'Ce bază de date folosiți cel mai des?',
    options: ['MySQL', 'PostgreSQL', 'MongoDB', 'Redis'],
  },
  {
    title: 'Cum preferați să lucrați?',
    options: ['Remote', 'Hybrid', 'Office'],
  },
];

const FLAGS = [
  { name: 'show_debug_info',           description: 'Show cohort, version badge, user ID, device ID',          enabled: 1, rollout_pct: 100, min_version: '1.0.0' },
  { name: 'dark_mode_on_canary',       description: 'Allow V3 Canary users to enable the dark-mode switch',    enabled: 1, rollout_pct: 100, min_version: '2.0.0' },
  { name: 'enhanced_results',          description: 'Animated results screen with stats and auto-refresh',     enabled: 1, rollout_pct: 100, min_version: '1.5.0' },
  { name: 'new_results_chart',         description: 'New chart visualization for results (legacy key)',         enabled: 1, rollout_pct: 64,  min_version: '1.0.0' },
  { name: 'version_gate',              description: 'Force update screen for old versions',                    enabled: 0, rollout_pct: 100, min_version: '2.0.0' },
  { name: 'maintenance_mode',          description: 'Show a maintenance banner on the Home screen',            enabled: 0, rollout_pct: 100, min_version: '1.0.0' },
  { name: 'compact_poll_cards',        description: 'Use a denser poll list layout with smaller cards',        enabled: 1, rollout_pct: 50,  min_version: '1.0.0' },
  { name: 'show_poll_descriptions',    description: 'Show poll descriptions in the poll list',                 enabled: 1, rollout_pct: 100, min_version: '1.0.0' },
  { name: 'left_handed_usage',         description: 'Reverse the bottom navigation order for left-handed use', enabled: 1, rollout_pct: 50,  min_version: '1.5.0' },
  { name: 'quick_results_button',      description: 'Let users jump straight to results from voted polls',     enabled: 1, rollout_pct: 75,  min_version: '1.5.0' },
  { name: 'welcome_banner',            description: 'Show a research/demo welcome banner on the Home screen',  enabled: 1, rollout_pct: 100, min_version: '1.0.0' },
  { name: 'profile_completion_prompt', description: 'Prompt users to complete missing profile fields',         enabled: 1, rollout_pct: 50,  min_version: '1.0.0' },
  { name: 'vertical_navbar',           description: 'Replace bottom tab bar with vertical tab bar',            enabled: 1, rollout_pct: 64,  min_version: '1.0.0' },
  { name: 'dark_mode',                 description: 'Dark mode UI (legacy key)',                               enabled: 1, rollout_pct: 50,  min_version: '1.0.0' },
];

async function seedPolls(conn) {
  let pollsInserted = 0;
  let optionsInserted = 0;

  for (const poll of POLLS) {
    const [existing] = await conn.query(
      'SELECT id FROM polls WHERE title = ?',
      [poll.title]
    );

    let pollId;
    if (existing.length > 0) {
      pollId = existing[0].id;
    } else {
      pollId = randomUUID();
      await conn.query(
        `INSERT INTO polls (id, title, status, created_at, updated_at)
         VALUES (?, ?, 'active', NOW(), NOW())`,
        [pollId, poll.title]
      );
      pollsInserted++;
    }

    for (const text of poll.options) {
      const [existingOpt] = await conn.query(
        'SELECT id FROM options WHERE poll_id = ? AND text = ?',
        [pollId, text]
      );
      if (existingOpt.length === 0) {
        await conn.query(
          `INSERT INTO options (id, poll_id, text, vote_count, created_at)
           VALUES (?, ?, ?, 0, NOW())`,
          [randomUUID(), pollId, text]
        );
        optionsInserted++;
      }
    }
  }

  return { pollsInserted, optionsInserted };
}

async function seedFlags(conn) {
  let flagsInserted = 0;

  for (const flag of FLAGS) {
    const [result] = await conn.query(
      `INSERT IGNORE INTO feature_flags
         (id, name, description, enabled, rollout_pct, min_version, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [randomUUID(), flag.name, flag.description, flag.enabled, flag.rollout_pct, flag.min_version]
    );
    if (result.affectedRows > 0) flagsInserted++;
  }

  return { flagsInserted };
}

async function main() {
  const conn = await pool.getConnection();
  try {
    const { pollsInserted, optionsInserted } = await seedPolls(conn);
    const { flagsInserted } = await seedFlags(conn);

    console.log('\n── Seed complete ──────────────────────────');
    console.log(`  Polls inserted   : ${pollsInserted} / ${POLLS.length}`);
    console.log(`  Options inserted : ${optionsInserted}`);
    console.log(`  Flags inserted   : ${flagsInserted} / ${FLAGS.length}`);
    console.log('───────────────────────────────────────────\n');
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
