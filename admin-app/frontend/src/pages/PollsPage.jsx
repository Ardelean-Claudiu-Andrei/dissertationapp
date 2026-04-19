import React, { useState, useEffect } from 'react';
import api from '../api/client.js';
import DataTable from '../components/DataTable.jsx';
import PollForm from '../components/PollForm.jsx';

const statusColors = { draft: '#6c757d', active: '#28a745', closed: '#dc3545' };
const statusBg = { draft: '#f8f9fa', active: '#d4edda', closed: '#f8d7da' };
const statusOptions = ['draft', 'active', 'closed'];

const badge = (status) => (
  <span style={{
    padding: '0.25rem 0.65rem', borderRadius: '20px',
    background: statusBg[status] || '#f8f9fa',
    color: statusColors[status] || '#6c757d',
    fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.03em',
  }}>
    {status}
  </span>
);

function StatCard({ label, value, color = '#1a1a2e', icon }) {
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

  const totalVotes = polls.reduce((sum, p) => sum + (p.options?.reduce((s, o) => s + (o.vote_count || 0), 0) || 0), 0);
  const activeCount = polls.filter((p) => p.status === 'active').length;

  const columns = [
    { key: 'title', label: 'Title', render: (val) => <span style={{ fontWeight: '600', color: '#1a1a2e' }}>{val}</span> },
    {
      key: 'status',
      label: 'Status',
      render: (val, row) => (
        <select
          value={val}
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontWeight: '600', color: statusColors[val], fontSize: '0.875rem' }}
          onChange={(e) => handleStatusChange(row, e.target.value)}
        >
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      ),
    },
    { key: 'options', label: 'Options', render: (val) => <span style={{ color: '#6c757d' }}>{val?.length ?? 0} options</span> },
    {
      key: 'options', label: 'Total Votes',
      render: (val) => {
        const total = val?.reduce((s, o) => s + (o.vote_count || 0), 0) || 0;
        return <span style={{ fontWeight: '600' }}>{total}</span>;
      },
    },
    { key: 'created_at', label: 'Created', render: (val) => <span style={{ color: '#6c757d', fontSize: '0.85rem' }}>{val?.slice(0, 16).replace('T', ' ')}</span> },
    {
      key: 'id',
      label: 'Actions',
      render: (val, row) => (
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button style={actionBtn('secondary')} onClick={() => { setEditingPoll(row); setShowForm(true); }}>Edit</button>
          <button style={actionBtn('danger')} onClick={() => handleDelete(val)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem' }}>
        <StatCard label="Total Polls" value={polls.length} icon="🗳️" />
        <StatCard label="Active" value={activeCount} color="#28a745" icon="✅" />
        <StatCard label="Total Votes" value={totalVotes} color="#4361ee" icon="📊" />
      </div>

      {/* Action bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div style={{ fontSize: '0.875rem', color: '#6c757d' }}>{polls.length} poll{polls.length !== 1 ? 's' : ''}</div>
        <button style={primaryBtn} onClick={() => { setEditingPoll(null); setShowForm(true); }}>+ New Poll</button>
      </div>

      {showForm && (
        <PollForm
          poll={editingPoll}
          onSaved={handleSaved}
          onCancel={() => { setShowForm(false); setEditingPoll(null); }}
        />
      )}

      {loading ? <LoadingCard /> : <DataTable columns={columns} data={polls} />}
    </div>
  );
}

function LoadingCard() {
  return <div style={{ background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#6c757d' }}>Loading…</div>;
}

const primaryBtn = {
  padding: '0.55rem 1.25rem', border: 'none', borderRadius: 8,
  cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600',
  background: '#1a1a2e', color: '#fff',
};

const actionBtn = (variant) => ({
  padding: '0.3rem 0.7rem', border: 'none', borderRadius: 6,
  cursor: 'pointer', fontSize: '0.78rem', fontWeight: '500',
  background: variant === 'danger' ? '#fff0f0' : '#f0f0f0',
  color: variant === 'danger' ? '#dc3545' : '#495057',
});
