import React, { useState, useEffect } from 'react';
import api from '../api/client.js';

const formStyle = {
  background: '#fff',
  padding: '1.5rem',
  borderRadius: '8px',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  marginBottom: '1.5rem',
};

const inputStyle = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  border: '1px solid #dee2e6',
  borderRadius: '4px',
  fontSize: '0.9rem',
  marginBottom: '0.75rem',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: '600',
  color: '#495057',
  marginBottom: '0.25rem',
};

const btnStyle = (variant = 'primary') => ({
  padding: '0.5rem 1rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  fontWeight: '500',
  background: variant === 'primary' ? '#1a1a2e' : variant === 'danger' ? '#dc3545' : '#6c757d',
  color: '#fff',
  marginRight: '0.5rem',
});

// poll: existing poll object for editing, or null for creation
// onSaved: callback with the saved poll
// onCancel: callback to close the form
export default function PollForm({ poll, onSaved, onCancel }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [options, setOptions] = useState(['', '']);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (poll) {
      setTitle(poll.title || '');
      setDescription(poll.description || '');
      setStatus(poll.status || 'draft');
      setOptions(poll.options?.map((o) => o.text) || ['', '']);
    }
  }, [poll]);

  function addOption() {
    setOptions((prev) => [...prev, '']);
  }

  function removeOption(index) {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateOption(index, value) {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const filtered = options.filter((o) => o.trim());
    if (filtered.length < 2) {
      setError('At least 2 non-empty options are required.');
      return;
    }
    setSaving(true);
    try {
      let saved;
      if (poll?.id) {
        const { data } = await api.put(`/admin/polls/${poll.id}`, { title, description, status });
        saved = data;
      } else {
        const { data } = await api.post('/admin/polls', { title, description, status, options: filtered });
        saved = data;
      }
      onSaved(saved);
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{poll?.id ? 'Edit Poll' : 'New Poll'}</h3>

      {error && <p style={{ color: '#dc3545', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</p>}

      <label style={labelStyle}>Title *</label>
      <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} required />

      <label style={labelStyle}>Description</label>
      <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: '60px' }} value={description} onChange={(e) => setDescription(e.target.value)} />

      <label style={labelStyle}>Status</label>
      <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="closed">Closed</option>
      </select>

      {!poll?.id && (
        <>
          <label style={labelStyle}>Options *</label>
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
                value={opt}
                placeholder={`Option ${i + 1}`}
                onChange={(e) => updateOption(i, e.target.value)}
              />
              {options.length > 2 && (
                <button type="button" style={btnStyle('danger')} onClick={() => removeOption(i)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" style={{ ...btnStyle('secondary'), marginBottom: '1rem' }} onClick={addOption}>
            + Add Option
          </button>
        </>
      )}

      <div style={{ display: 'flex', marginTop: '0.5rem' }}>
        <button type="submit" style={btnStyle()} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" style={btnStyle('secondary')} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
