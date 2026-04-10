const { createHash } = require('crypto');

// Deterministically assigns a cohort based on the device_id.
// Same device_id always produces the same cohort — this is important
// for reproducibility in the dissertation experiments.
// The SHA-256 hash distributes evenly, giving roughly 33% per cohort.
function assignCohort(deviceId) {
  const hash = createHash('sha256').update(deviceId).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100; // 0–99
  if (bucket < 33) return 'cohort_a';
  if (bucket < 66) return 'cohort_b';
  return 'cohort_c';
}

module.exports = { assignCohort };
