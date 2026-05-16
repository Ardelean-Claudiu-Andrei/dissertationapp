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
  { name: 'dark_mode',          description: 'Dark mode UI',                            enabled: 1, rollout_pct: 50,  min_version: '1.0.0' },
  { name: 'new_results_chart',  description: 'New chart visualization for results',      enabled: 1, rollout_pct: 75,  min_version: '1.0.0' },
  { name: 'version_gate',       description: 'Force update screen for old versions',     enabled: 0, rollout_pct: 100, min_version: '2.0.0' },
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
