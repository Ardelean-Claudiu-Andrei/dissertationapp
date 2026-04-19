import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import DataTable from '../components/DataTable.jsx';

const cohortColors = { cohort_a: '#4361ee', cohort_b: '#7209b7', cohort_c: '#f72585' };
const cohortBg = { cohort_a: '#eef1ff', cohort_b: '#f5eeff', cohort_c: '#fff0f8' };

function StatCard({ label, value, icon, color = '#1a1a2e', sub }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0',
      display: 'flex', alignItems: 'center', gap: '1rem', flex: 1,
    }}>
      <div style={{ fontSize: '1.75rem' }}>{icon}</div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: '800', color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.2rem' }}>{label}</div>
        {sub && <div style={{ fontSize: '0.72rem', color: '#adb5bd', marginTop: '0.1rem' }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [cohortCounts, setCohortCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/users').then(({ data }) => {
      setUsers(data.users);
      setCohortCounts(data.cohortCounts);
    }).finally(() => setLoading(false));
  }, []);

  const totalVotes = users.reduce((s, u) => s + (Number(u.vote_count) || 0), 0);

  const columns = [
    {
      key: 'id', label: 'ID',
      render: (val) => <code style={{ fontSize: '0.75rem', color: '#6c757d' }}>{val?.slice(0, 8)}…</code>,
    },
    {
      key: 'device_id', label: 'Device ID',
      render: (val) => <code style={{ fontSize: '0.75rem', color: '#6c757d' }}>{val?.slice(0, 12)}…</code>,
    },
    { key: 'app_version', label: 'Version', render: (val) => <code style={{ fontSize: '0.82rem' }}>{val}</code> },
    { key: 'country', label: 'Country' },
    {
      key: 'cohort', label: 'Cohort',
      render: (val) => (
        <span style={{
          padding: '0.25rem 0.65rem', borderRadius: 20,
          background: cohortBg[val] || '#f8f9fa',
          color: cohortColors[val] || '#6c757d',
          fontSize: '0.75rem', fontWeight: '700',
        }}>
          {val}
        </span>
      ),
    },
    {
      key: 'vote_count', label: 'Votes',
      render: (val) => (
        <span style={{ fontWeight: '600', color: val > 0 ? '#4361ee' : '#adb5bd' }}>{val}</span>
      ),
    },
    {
      key: 'created_at', label: 'Registered',
      render: (val) => <span style={{ color: '#6c757d', fontSize: '0.85rem' }}>{val?.slice(0, 16).replace('T', ' ')}</span>,
    },
  ];

  return (
    <div>
      {/* Stats row */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem' }}>
        <StatCard label="Total Users" value={users.length} icon="👥" />
        <StatCard label="Total Votes" value={totalVotes} color="#4361ee" icon="🗳️" />
        <StatCard label="Cohorts" value={Object.keys(cohortCounts).length} color="#7209b7" icon="🔬" />
      </div>

      {/* Cohort breakdown */}
      {Object.keys(cohortCounts).length > 0 && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem' }}>
          {Object.entries(cohortCounts).map(([cohort, count]) => {
            const pct = users.length > 0 ? Math.round((count / users.length) * 100) : 0;
            return (
              <div key={cohort} style={{
                flex: 1, background: '#fff', borderRadius: 12, padding: '1rem 1.25rem',
                border: `2px solid ${cohortColors[cohort] || '#dee2e6'}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '700', color: cohortColors[cohort] || '#6c757d', fontSize: '0.875rem' }}>{cohort}</span>
                  <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#1a1a2e' }}>{count}</span>
                </div>
                <div style={{ height: 6, background: '#e9ecef', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: cohortColors[cohort] || '#dee2e6', borderRadius: 3, transition: 'width 0.5s' }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: '#6c757d', marginTop: '0.35rem' }}>{pct}% of users</div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>{users.length} registered user{users.length !== 1 ? 's' : ''}</div>
      </div>

      {loading
        ? <div style={{ background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#6c757d' }}>Loading…</div>
        : <DataTable columns={columns} data={users} />
      }
    </div>
  );
}
