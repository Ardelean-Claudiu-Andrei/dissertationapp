const { createHash } = require('crypto');
const APP_VERSIONS = require('../config/app_versions');

// Deterministically assigns a cohort based on the userId (UUID).
// Same userId always produces the same cohort — guarantees the same user
// always gets the same version regardless of device or session.
// SHA-256(userId) % 3 gives exactly 1/3 per cohort with no boundary gaps.
function assignCohort(userId) {
  const hash = createHash('sha256').update(userId).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 3;
  if (bucket === 0) return 'cohort_a';
  if (bucket === 1) return 'cohort_b';
  return 'cohort_c';
}

function getVersionForCohort(cohort) {
  const map = { cohort_a: 'V1', cohort_b: 'V2', cohort_c: 'V3' };
  return map[cohort] || 'V1';
}

function getVersionConfig(cohort) {
  const version = getVersionForCohort(cohort);
  return { version, ...APP_VERSIONS[version] };
}

module.exports = { assignCohort, getVersionForCohort, getVersionConfig };
