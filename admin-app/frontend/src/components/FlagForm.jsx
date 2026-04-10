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
  background: variant === 'primary' ? '#1a1a2e' : '#6c757d',
  color: '#fff',
  marginRight: '0.5rem',
});

export default function FlagForm({ flag, onSaved, onCancel }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [rolloutPct, setRolloutPct] = useState(100);
  const [minVersion, setMinVersion] = useState('1.0.0');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (flag) {
      setName(flag.name || '');
      setDescription(flag.description || '');
      setEnabled(!!flag.enabled);
      setRolloutPct(flag.rollout_pct ?? 100);
      setMinVersion(flag.min_version || '1.0.0');
    }
  }, [flag]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      let saved;
      const payload = { name, description, enabled, rollout_pct: Number(rolloutPct), min_version: minVersion };
      if (flag?.id) {
        const { data } = await api.put(`/admin/flags/${flag.id}`, payload);
        saved = data;
      } else {
        const { data } = await api.post('/admin/flags', payload);
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
      <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>{flag?.id ? 'Edit Flag' : 'New Feature Flag'}</h3>

      {error && <p style={{ color: '#dc3545', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</p>}

      <label style={labelStyle}>Name * (used as identifier in code)</label>
      <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. new_results_screen" required />

      <label style={labelStyle}>Description</label>
      <input style={inputStyle} value={description} onChange={(e) => setDescription(e.target.value)} />

      <label style={labelStyle}>Rollout % (0–100)</label>
      <input style={inputStyle} type="number" min="0" max="100" value={rolloutPct} onChange={(e) => setRolloutPct(e.target.value)} />

      <label style={labelStyle}>Minimum App Version</label>
      <input style={inputStyle} value={minVersion} onChange={(e) => setMinVersion(e.target.value)} placeholder="1.0.0" />

      <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        Enabled
      </label>

      <div style={{ display: 'flex', marginTop: '1rem' }}>
        <button type="submit" style={btnStyle()} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
        <button type="button" style={btnStyle('secondary')} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
