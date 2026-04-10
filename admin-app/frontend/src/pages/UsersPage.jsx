import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import DataTable from '../components/DataTable.jsx';

const cohortColors = { cohort_a: '#4361ee', cohort_b: '#7209b7', cohort_c: '#f72585' };

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

  const columns = [
    { key: 'id', label: 'ID', render: (val) => <code style={{ fontSize: '0.75rem' }}>{val?.slice(0, 8)}…</code> },
    { key: 'device_id', label: 'Device ID', render: (val) => <code style={{ fontSize: '0.75rem' }}>{val?.slice(0, 12)}…</code> },
    { key: 'app_version', label: 'App Version' },
    { key: 'country', label: 'Country' },
    {
      key: 'cohort',
      label: 'Cohort',
      render: (val) => (
        <span style={{
          padding: '0.2rem 0.6rem',
          borderRadius: '12px',
          background: cohortColors[val] || '#6c757d',
          color: '#fff',
          fontSize: '0.75rem',
          fontWeight: '600',
        }}>
          {val}
        </span>
      ),
    },
    { key: 'vote_count', label: 'Votes Cast' },
    { key: 'created_at', label: 'Registered', render: (val) => val?.slice(0, 16).replace('T', ' ') },
  ];

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '1rem' }}>Users</h1>

        {/* Cohort summary */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {Object.entries(cohortCounts).map(([cohort, count]) => (
            <div key={cohort} style={{
              padding: '0.75rem 1.25rem',
              borderRadius: '8px',
              background: cohortColors[cohort] || '#6c757d',
              color: '#fff',
            }}>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginBottom: '0.25rem' }}>{cohort}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: '700' }}>{count}</div>
            </div>
          ))}
          {Object.keys(cohortCounts).length === 0 && !loading && (
            <p style={{ color: '#6c757d', fontSize: '0.9rem' }}>No users registered yet.</p>
          )}
        </div>
      </div>

      {loading ? <p>Loading…</p> : <DataTable columns={columns} data={users} />}
    </div>
  );
}
