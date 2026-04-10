import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import DataTable from '../components/DataTable.jsx';
import PollForm from '../components/PollForm.jsx';

const statusColors = { draft: '#6c757d', active: '#28a745', closed: '#dc3545' };

const badge = (status) => (
  <span style={{
    padding: '0.2rem 0.6rem',
    borderRadius: '12px',
    background: statusColors[status] || '#6c757d',
    color: '#fff',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
  }}>
    {status}
  </span>
);

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

const statusOptions = ['draft', 'active', 'closed'];

export default function PollsPage() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPoll, setEditingPoll] = useState(null);

  async function loadPolls() {
    try {
      const { data } = await api.get('/admin/polls');
      setPolls(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPolls(); }, []);

  async function handleDelete(id) {
    if (!confirm('Delete this poll and all its votes?')) return;
    await api.delete(`/admin/polls/${id}`);
    setPolls((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleStatusChange(poll, newStatus) {
    const { data } = await api.put(`/admin/polls/${poll.id}`, { status: newStatus });
    setPolls((prev) => prev.map((p) => (p.id === data.id ? { ...p, status: data.status } : p)));
  }

  function handleSaved(saved) {
    if (editingPoll?.id) {
      setPolls((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
    } else {
      setPolls((prev) => [saved, ...prev]);
    }
    setShowForm(false);
    setEditingPoll(null);
  }

  const columns = [
    { key: 'title', label: 'Title' },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => (
        <select
          value={val}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: '600', color: statusColors[val] }}
          onChange={(e) => handleStatusChange(row, e.target.value)}
        >
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    { key: 'options', label: 'Options', render: (val) => val?.length ?? 0 },
    { key: 'created_at', label: 'Created', render: (val) => val?.slice(0, 16).replace('T', ' ') },
    {
      key: 'id',
      label: 'Actions',
      render: (val, row) => (
        <>
          <button style={btnStyle('secondary')} onClick={() => { setEditingPoll(row); setShowForm(true); }}>Edit</button>
          <button style={btnStyle('danger')} onClick={() => handleDelete(val)}>Delete</button>
        </>
      ),
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Polls</h1>
        <button style={btnStyle()} onClick={() => { setEditingPoll(null); setShowForm(true); }}>+ New Poll</button>
      </div>

      {showForm && (
        <PollForm
          poll={editingPoll}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingPoll(null); }}
        />
      )}

      {loading ? <p>Loading…</p> : <DataTable columns={columns} data={polls} />}
    </div>
  );
}
