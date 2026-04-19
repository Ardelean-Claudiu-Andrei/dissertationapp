import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import DataTable from '../components/DataTable.jsx';
import FlagForm from '../components/FlagForm.jsx';

const cohortColors = { cohort_a: '#4361ee', cohort_b: '#7209b7', cohort_c: '#f72585' };

function StatCard({ label, value, icon, color = '#1a1a2e' }) {
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
      </div>
    </div>
  );
}

const actionBtn = (variant) => ({
  padding: '0.3rem 0.7rem', border: 'none', borderRadius: 6,
  cursor: 'pointer', fontSize: '0.78rem', fontWeight: '500',
  background: variant === 'danger' ? '#fff0f0' : '#f0f0f0',
  color: variant === 'danger' ? '#dc3545' : '#495057',
});

const primaryBtn = {
  padding: '0.55rem 1.25rem', border: 'none', borderRadius: 8,
  cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600',
  background: '#1a1a2e', color: '#fff',
};

export default function FlagsPage() {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingFlag, setEditingFlag] = useState(null);

  async function loadFlags() {
    try {
      const { data } = await api.get('/admin/flags');
      setFlags(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadFlags(); }, []);

  async function toggleEnabled(flag) {
    const { data } = await api.put(`/admin/flags/${flag.id}`, { enabled: !flag.enabled });
    setFlags((prev) => prev.map((f) => (f.id === data.id ? { ...f, enabled: data.enabled } : f)));
  }

  async function handleDelete(id) {
    if (!confirm('Delete this feature flag?')) return;
    await api.delete(`/admin/flags/${id}`);
    setFlags((prev) => prev.filter((f) => f.id !== id));
  }

  function handleSaved(saved) {
    if (editingFlag?.id) {
      setFlags((prev) => prev.map((f) => (f.id === saved.id ? saved : f)));
    } else {
      setFlags((prev) => [saved, ...prev]);
    }
    setShowForm(false);
    setEditingFlag(null);
  }

  const enabledCount = flags.filter((f) => f.enabled).length;
  const totalAssigned = flags.reduce((s, f) => s + (Number(f.assignment_count) || 0), 0);

  const columns = [
    {
      key: 'name', label: 'Name',
      render: (val) => <code style={{ background: '#f0f4ff', color: '#4361ee', padding: '0.2rem 0.5rem', borderRadius: 4, fontSize: '0.82rem', fontWeight: '600' }}>{val}</code>,
    },
    { key: 'description', label: 'Description', render: (val) => <span style={{ color: '#6c757d', fontSize: '0.875rem' }}>{val || '—'}</span> },
    {
      key: 'enabled', label: 'Status',
      render: (val, row) => (
        <button onClick={() => toggleEnabled(row)} style={{
          padding: '0.3rem 0.85rem', border: 'none', borderRadius: 20, cursor: 'pointer',
          background: val ? '#d4edda' : '#f8d7da',
          color: val ? '#28a745' : '#dc3545',
          fontSize: '0.75rem', fontWeight: '700',
        }}>
          {val ? '● ON' : '○ OFF'}
        </button>
      ),
    },
    {
      key: 'rollout_pct', label: 'Rollout',
      render: (val) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 60, height: 6, background: '#e9ecef', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${val}%`, height: '100%', background: '#4361ee', borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#343a40' }}>{val}%</span>
        </div>
      ),
    },
    { key: 'min_version', label: 'Min Version', render: (val) => <code style={{ fontSize: '0.82rem' }}>{val}</code> },
    { key: 'assignment_count', label: 'Assigned', render: (val) => <span style={{ fontWeight: '600' }}>{val}</span> },
    {
      key: 'id', label: 'Actions',
      render: (val, row) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button style={actionBtn('secondary')} onClick={() => { setEditingFlag(row); setShowForm(true); }}>Edit</button>
          <button style={actionBtn('danger')} onClick={() => handleDelete(val)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem' }}>
        <StatCard label="Total Flags" value={flags.length} icon="🚩" />
        <StatCard label="Enabled" value={enabledCount} color="#28a745" icon="✅" />
        <StatCard label="Total Assigned" value={totalAssigned} color="#4361ee" icon="👥" />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>{flags.length} flag{flags.length !== 1 ? 's' : ''}</div>
        <button style={primaryBtn} onClick={() => { setEditingFlag(null); setShowForm(true); }}>+ New Flag</button>
      </div>

      {showForm && (
        <FlagForm
          flag={editingFlag}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingFlag(null); }}
        />
      )}

      {loading
        ? <div style={{ background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#6c757d' }}>Loading…</div>
        : <DataTable columns={columns} data={flags} />
      }
    </div>
  );
}
