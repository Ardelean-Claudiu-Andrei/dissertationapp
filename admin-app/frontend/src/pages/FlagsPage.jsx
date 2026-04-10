import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import DataTable from '../components/DataTable.jsx';
import FlagForm from '../components/FlagForm.jsx';

const btnStyle = (variant = 'primary') => ({
  padding: '0.4rem 0.8rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.8rem',
  fontWeight: '500',
  background: variant === 'primary' ? '#1a1a2e' : variant === 'danger' ? '#dc3545' : '#6c757d',
  color: '#fff',
  marginRight: '0.4rem',
});

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

  const columns = [
    { key: 'name', label: 'Name', render: (val) => <code style={{ background: '#f0f0f0', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>{val}</code> },
    { key: 'description', label: 'Description' },
    {
      key: 'enabled',
      label: 'Enabled',
      render: (val, row) => (
        <button
          onClick={() => toggleEnabled(row)}
          style={{
            padding: '0.3rem 0.8rem',
            border: 'none',
            borderRadius: '12px',
            cursor: 'pointer',
            background: val ? '#28a745' : '#dc3545',
            color: '#fff',
            fontSize: '0.75rem',
            fontWeight: '600',
          }}
        >
          {val ? 'ON' : 'OFF'}
        </button>
      ),
    },
    { key: 'rollout_pct', label: 'Rollout %', render: (val) => `${val}%` },
    { key: 'min_version', label: 'Min Version' },
    { key: 'assignment_count', label: 'Assigned Users' },
    {
      key: 'id',
      label: 'Actions',
      render: (val, row) => (
        <>
          <button style={btnStyle('secondary')} onClick={() => { setEditingFlag(row); setShowForm(true); }}>Edit</button>
          <button style={btnStyle('danger')} onClick={() => handleDelete(val)}>Delete</button>
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Feature Flags</h1>
        <button style={btnStyle()} onClick={() => { setEditingFlag(null); setShowForm(true); }}>+ New Flag</button>
      </div>

      {showForm && (
        <FlagForm
          flag={editingFlag}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingFlag(null); }}
        />
      )}

      {loading ? <p>Loading…</p> : <DataTable columns={columns} data={flags} />}
    </div>
  );
}
