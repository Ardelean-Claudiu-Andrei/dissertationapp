import React, { useState, useEffect } from 'react';
import client from '../api/client.js';

const THEME_HEX = { blue: '#1a1a2e', green: '#2d6a4f', purple: '#7209b7' };

function normalizeFlagName(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function FeatureRow({ name, enabled, note }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #f0f0f0' }}>
      <span>
        <span style={{ fontSize: '0.85rem', color: '#495057' }}>{name.replace(/_/g, ' ')}</span>
        {note ? <span style={{ display: 'block', fontSize: '0.68rem', color: '#adb5bd', marginTop: 2 }}>{note}</span> : null}
      </span>
      <span style={{
        fontSize: '0.75rem', fontWeight: '700',
        color: enabled ? '#28a745' : '#adb5bd',
        background: enabled ? '#d4edda' : '#f0f0f0',
        borderRadius: 6, padding: '2px 8px',
      }}>
        {enabled ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}

export default function VersionsPage() {
  const [versions, setVersions] = useState([]);
  const [distribution, setDistribution] = useState(null);
  const [flags, setFlags] = useState([]);
  const [features, setFeatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      client.get('/admin/versions'),
      client.get('/admin/versions/distribution'),
      client.get('/admin/flags'),
      client.get('/admin/flags/features'),
    ])
      .then(([vRes, dRes, fRes, featureRes]) => {
        setVersions(vRes.data);
        setDistribution(dRes.data);
        setFlags(fRes.data);
        setFeatures(featureRes.data);
      })
      .catch(() => setError('Failed to load version data.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ padding: '2rem', color: '#6c757d' }}>Loading versions…</div>;
  if (error) return <div style={{ padding: '2rem', color: '#dc3545' }}>{error}</div>;

  const distMap = {};
  (distribution?.distribution || []).forEach((d) => { distMap[d.version] = d; });
  const enabledFlagNames = new Set(
    flags
      .filter((f) => (Number(f.enabled) === 1 || f.enabled === true) && Number(f.rollout_pct) > 0)
      .map((f) => normalizeFlagName(f.name))
  );
  const hasFlag = (name) => enabledFlagNames.has(normalizeFlagName(name));
  const darkFlagOn = hasFlag('dark_mode_on_canary') || hasFlag('dark_mode');
  const enhancedFlagOn = hasFlag('enhanced_results');
  const featureLabel = (key) => features.find((feature) => feature.key === key)?.label || key;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <p style={{ color: '#6c757d', fontSize: '0.875rem', margin: '0 0 0.5rem' }}>
          V1/V2/V3 are assigned deterministically via <code style={{ background: '#f0f0f0', padding: '1px 5px', borderRadius: 3 }}>SHA-256(userId) % 100</code> — the same user account always receives the same version regardless of device.
        </p>
        <p style={{ color: '#adb5bd', fontSize: '0.8rem', margin: 0, fontStyle: 'italic' }}>
          Note: these are dissertation demo variants (V1/V2/V3), not the same as the mobile build version / <code style={{ background: '#f0f0f0', padding: '1px 4px', borderRadius: 3 }}>app_version</code> field (e.g. 1.0.0 / 2.0.0).
        </p>
      </div>

      {/* Version Cards */}
      <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {versions.map((v) => {
          const color = THEME_HEX[v.theme] || '#1a1a2e';
          const dist = distMap[v.version];
          return (
            <div key={v.version} style={{
              flex: 1, minWidth: 240,
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
              overflow: 'hidden',
            }}>
              <div style={{ background: color, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ color: '#fff', fontWeight: '800', fontSize: '1.25rem' }}>{v.version}</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem' }}>{v.label}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#fff', fontWeight: '700', fontSize: '1.5rem' }}>{dist?.user_count ?? 0}</div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.75rem' }}>users</div>
                </div>
              </div>
              <div style={{ padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#6c757d', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Effective in mobile app</div>
                <FeatureRow
                  name="results_chart"
                  enabled={!!v.features.results_chart && enhancedFlagOn}
                  note={v.features.results_chart ? `requires ${featureLabel('enhanced_results')}` : 'disabled in this version'}
                />
                <FeatureRow
                  name="dark_mode"
                  enabled={!!v.features.dark_mode && darkFlagOn}
                  note={v.features.dark_mode ? `requires ${featureLabel('dark_mode_on_canary')}` : 'disabled in this version'}
                />
                <FeatureRow
                  name="show_vote_count"
                  enabled={!!v.features.show_vote_count}
                  note="version-controlled"
                />
                <FeatureRow
                  name="show_debug_info"
                  enabled={hasFlag('show_debug_info')}
                  note="global flag"
                />
                <FeatureRow
                  name="maintenance_mode"
                  enabled={hasFlag('maintenance_mode')}
                  note="global flag"
                />
                <FeatureRow
                  name="compact_poll_cards"
                  enabled={hasFlag('compact_poll_cards')}
                  note="global flag"
                />
                <FeatureRow
                  name="show_poll_descriptions"
                  enabled={hasFlag('show_poll_descriptions')}
                  note="global flag"
                />
                <FeatureRow
                  name="left_handed_usage"
                  enabled={hasFlag('left_handed_usage')}
                  note="global flag"
                />
                <FeatureRow
                  name="quick_results_button"
                  enabled={hasFlag('quick_results_button')}
                  note="global flag"
                />
                <FeatureRow
                  name="welcome_banner"
                  enabled={hasFlag('welcome_banner')}
                  note="global flag"
                />
                <FeatureRow
                  name="profile_completion_prompt"
                  enabled={hasFlag('profile_completion_prompt')}
                  note="global flag"
                />
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ background: '#e9ecef', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${dist?.percentage ?? 0}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.6s ease' }} />
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: 4 }}>
                    {dist?.percentage ?? 0}% of users · cohort: <code style={{ background: '#f0f0f0', padding: '1px 5px', borderRadius: 3 }}>{dist?.cohort ?? '—'}</code>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Distribution Table */}
      <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <h3 style={{ margin: '0 0 0.25rem', color: '#1a1a2e', fontSize: '1rem' }}>User Distribution</h3>
        <p style={{ fontSize: '0.75rem', color: '#6c757d', margin: '0 0 1rem' }}>
          Total registered users: <strong>{distribution?.total ?? 0}</strong>
        </p>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #e9ecef' }}>
              {['Version', 'Label', 'Cohort', 'Users', 'Share'].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(distribution?.distribution || []).map((d) => {
              const color = THEME_HEX[versions.find((v) => v.version === d.version)?.theme] || '#1a1a2e';
              return (
                <tr key={d.version}>
                  <td style={td}>
                    <span style={{ fontWeight: '700', color, fontSize: '1rem' }}>{d.version}</span>
                  </td>
                  <td style={td}>{d.label}</td>
                  <td style={td}><code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: '0.85rem' }}>{d.cohort}</code></td>
                  <td style={td}><strong>{d.user_count}</strong></td>
                  <td style={{ ...td, width: '35%' }}>
                    <div style={{ background: '#e9ecef', borderRadius: 4, height: 8, overflow: 'hidden', marginBottom: 3 }}>
                      <div style={{ width: `${d.percentage}%`, background: color, height: '100%', borderRadius: 4 }} />
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>{d.percentage}%</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = {
  textAlign: 'left',
  fontSize: '0.75rem',
  fontWeight: '600',
  color: '#6c757d',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  padding: '0.5rem 0.5rem 0.75rem',
};

const td = {
  padding: '0.6rem 0.5rem',
  fontSize: '0.875rem',
  color: '#343a40',
  borderBottom: '1px solid #f0f0f0',
};
