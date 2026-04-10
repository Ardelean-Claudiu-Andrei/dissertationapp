const { createHash } = require('crypto');

// Compares two semver strings like "1.2.3".
// Returns true if userVersion >= minVersion.
function semverGte(userVersion, minVersion) {
  const parse = (v) =>
    String(v || '1.0.0')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const [ua, ub, uc] = parse(userVersion);
  const [ma, mb, mc] = parse(minVersion);

  if (ua !== ma) return ua > ma;
  if (ub !== mb) return ub > mb;
  return uc >= mc;
}

// Deterministically decides if a user qualifies for a flag based on
// rollout_pct. Using hash(userId + flagId) % 100 ensures the same
// user always gets the same decision — not random per request.
function userQualifiesForRollout(userId, flagId, rolloutPct) {
  if (rolloutPct >= 100) return true;
  if (rolloutPct <= 0) return false;
  const hash = createHash('sha256')
    .update(userId + flagId)
    .digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) % 100;
  return bucket < rolloutPct;
}

// Evaluates which flags a user qualifies for.
// Returns array of { id, name } for qualifying flags.
function evaluateFlags(flags, user) {
  return flags
    .filter((flag) => {
      if (!flag.enabled) return false;
      if (!semverGte(user.app_version, flag.min_version)) return false;
      if (!userQualifiesForRollout(user.id, flag.id, flag.rollout_pct)) return false;
      return true;
    })
    .map((flag) => ({ id: flag.id, name: flag.name }));
}

module.exports = { evaluateFlags, semverGte, userQualifiesForRollout };
