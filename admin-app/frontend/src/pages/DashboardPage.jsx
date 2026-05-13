import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client.js';

const REFRESH_INTERVAL = 30;
const HEALTH_INTERVAL  = 10;

const cardStyle = {
  background: '#fff',
  borderRadius: 14,
  padding: '1.5rem',
  boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  flex: 1,
  minWidth: 140,
};

const statCards = [
  { key: 'total_users',  label: 'Total Users',   icon: '👥' },
  { key: 'total_votes',  label: 'Total Votes',   icon: '🗳️' },
  { key: 'total_polls',  label: 'Total Polls',   icon: '📋' },
  { key: 'active_polls', label: 'Active Polls',  icon: '🟢' },
  { key: 'flags_active', label: 'Active Flags',  icon: '🚩' },
];

function ProgressBar({ value, max, color = '#e94560' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ background: '#e9ecef', borderRadius: 4, height: 8, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function formatUptime(s) {
  if (s < 60) return `${s}s`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);

  const [healthStats, setHealthStats] = useState(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await client.get('/admin/stats');
      setStats(data);
      setError(null);
    } catch {
      setError('Failed to load stats.');
    } finally {
      setLoading(false);
      setCountdown(REFRESH_INTERVAL);
    }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const { data } = await client.get('/admin/scalability/stats');
      setHealthStats(data);
      setHealthError(null);
    } catch {
      setHealthError('Failed to load system health.');
    } finally {
      setHealthLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, REFRESH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    const tick = setInterval(() => setCountdown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, HEALTH_INTERVAL * 1000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  if (loading) {
    return <div style={{ padding: '2rem', color: '#6c757d' }}>Loading stats…</div>;
  }

  if (error) {
    return <div style={{ padding: '2rem', color: '#dc3545' }}>{error}</div>;
  }

  const versionEntries = Object.entries(stats.version_distribution || {});
  const cohortEntries = Object.entries(stats.cohort_distribution || {});
  const maxCohort = Math.max(...cohortEntries.map(([, v]) => v), 1);
  const maxVersion = Math.max(...versionEntries.map(([, v]) => v), 1);

  return (
    <div>
      {/* Auto-refresh badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem', alignItems: 'center', gap: '0.5rem' }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#28a745' }} />
        <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>
          Auto-refresh in {countdown}s
        </span>
        <button
          onClick={fetchStats}
          style={{ padding: '0.3rem 0.8rem', borderRadius: 8, border: '1px solid #dee2e6', background: '#fff', cursor: 'pointer', fontSize: '0.8rem', color: '#495057' }}
        >
          Refresh now
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        {statCards.map(({ key, label, icon }) => (
          <div key={key} style={cardStyle}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
            <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1a1a2e' }}>{stats[key] ?? 0}</div>
            <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.25rem' }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Version Distribution */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#1a1a2e', fontSize: '1rem' }}>Version Distribution</h3>
          <p style={{ fontSize: '0.75rem', color: '#6c757d', margin: '0 0 1rem' }}>Shows staged rollout across client versions</p>
          {versionEntries.length === 0 ? (
            <div style={{ color: '#adb5bd', fontSize: '0.875rem' }}>No data yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e9ecef' }}>
                  <th style={th}>Version</th>
                  <th style={th}>Users</th>
                  <th style={th}>Distribution</th>
                </tr>
              </thead>
              <tbody>
                {versionEntries.map(([version, count]) => (
                  <tr key={version}>
                    <td style={td}><code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: '0.85rem' }}>v{version}</code></td>
                    <td style={td}><strong>{count}</strong></td>
                    <td style={{ ...td, width: '40%' }}>
                      <ProgressBar value={count} max={maxVersion} color="#4361ee" />
                      <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>{Math.round((count / maxVersion) * 100)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Cohort Distribution */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#1a1a2e', fontSize: '1rem' }}>Cohort Distribution</h3>
          <p style={{ fontSize: '0.75rem', color: '#6c757d', margin: '0 0 1rem' }}>Deterministic A/B/C splits per device</p>
          {cohortEntries.length === 0 ? (
            <div style={{ color: '#adb5bd', fontSize: '0.875rem' }}>No data yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e9ecef' }}>
                  <th style={th}>Cohort</th>
                  <th style={th}>Users</th>
                  <th style={th}>Share</th>
                </tr>
              </thead>
              <tbody>
                {cohortEntries.map(([cohort, count]) => (
                  <tr key={cohort}>
                    <td style={td}><span style={{ fontWeight: '600', textTransform: 'uppercase', color: '#1a1a2e' }}>{cohort}</span></td>
                    <td style={td}><strong>{count}</strong></td>
                    <td style={{ ...td, width: '40%' }}>
                      <ProgressBar value={count} max={maxCohort} color="#e94560" />
                      <span style={{ fontSize: '0.75rem', color: '#6c757d' }}>{Math.round((count / maxCohort) * 100)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Votes per Poll */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#1a1a2e', fontSize: '1rem' }}>Votes per Poll</h3>
          {(stats.votes_per_poll || []).length === 0 ? (
            <div style={{ color: '#adb5bd', fontSize: '0.875rem' }}>No polls yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e9ecef' }}>
                  <th style={th}>Poll</th>
                  <th style={th}>Votes</th>
                </tr>
              </thead>
              <tbody>
                {stats.votes_per_poll.map((p) => (
                  <tr key={p.poll_id}>
                    <td style={{ ...td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.title}>{p.title}</td>
                    <td style={td}><strong>{p.vote_count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Top Flag Assignments */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
          <h3 style={{ margin: '0 0 1rem', color: '#1a1a2e', fontSize: '1rem' }}>Top Flag Assignments</h3>
          {(stats.top_flag_assignments || []).length === 0 ? (
            <div style={{ color: '#adb5bd', fontSize: '0.875rem' }}>No assignments yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e9ecef' }}>
                  <th style={th}>Flag</th>
                  <th style={th}>Assignments</th>
                </tr>
              </thead>
              <tbody>
                {stats.top_flag_assignments.map((f) => (
                  <tr key={f.flag_name}>
                    <td style={td}><code style={{ background: '#f0f0f0', padding: '2px 6px', borderRadius: 4, fontSize: '0.85rem' }}>{f.flag_name}</code></td>
                    <td style={td}><strong>{f.assignment_count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* System Health & Scalability */}
      <div style={{ marginTop: '2rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: '700', color: '#1a1a2e', margin: '0 0 1rem' }}>
          System Health &amp; Scalability
        </h3>
        {healthLoading ? (
          <div style={{ color: '#6c757d', fontSize: '0.875rem' }}>Loading health stats…</div>
        ) : healthError ? (
          <div style={{ color: '#dc3545', fontSize: '0.875rem' }}>{healthError}</div>
        ) : healthStats && (
          <>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <div style={cardStyle}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⏱️</div>
                <div style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1a1a2e' }}>{formatUptime(healthStats.uptime_seconds)}</div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.25rem' }}>Uptime</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🗄️</div>
                <div style={{ fontSize: '1.25rem', fontWeight: '800', color: healthStats.db.connected ? '#28a745' : '#dc3545' }}>
                  {healthStats.db.connected ? 'Connected' : 'Error'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.25rem' }}>DB Status</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1a1a2e' }}>{healthStats.cache.size}</div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.25rem' }}>Cached polls</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🕐</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1a1a2e' }}>{healthStats.cache.ttl_ms / 1000}s</div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.25rem' }}>Cache TTL</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🗳️</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1a1a2e' }}>{healthStats.votes_total}</div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.25rem' }}>Total votes</div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>👥</div>
                <div style={{ fontSize: '2rem', fontWeight: '800', color: '#1a1a2e' }}>{healthStats.users_total}</div>
                <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.25rem' }}>Total users</div>
              </div>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#adb5bd' }}>auto-refreshes every 10s</div>
          </>
        )}
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
