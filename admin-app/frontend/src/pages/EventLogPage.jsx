import React, { useState, useEffect, useRef } from 'react';
import api from '../api/client.js';
import DataTable from '../components/DataTable.jsx';

const inputStyle = {
  padding: '0.5rem 0.75rem',
  border: '1px solid #dee2e6',
  borderRadius: '4px',
  fontSize: '0.9rem',
  marginRight: '0.5rem',
};

const btnStyle = {
  padding: '0.5rem 1rem',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontSize: '0.9rem',
  background: '#1a1a2e',
  color: '#fff',
};

export default function EventLogPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [eventType, setEventType] = useState('');
  const intervalRef = useRef(null);

  async function loadEvents() {
    try {
      const params = {};
      if (userId) params.user_id = userId;
      if (eventType) params.event_type = eventType;
      const { data } = await api.get('/admin/events', { params });
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
    intervalRef.current = setInterval(loadEvents, 10000);
    return () => clearInterval(intervalRef.current);
  }, [userId, eventType]);

  const columns = [
    { key: 'created_at', label: 'Time', render: (val) => val?.slice(0, 19).replace('T', ' ') },
    { key: 'user_id', label: 'User ID', render: (val) => val ? <code style={{ fontSize: '0.75rem' }}>{val?.slice(0, 8)}…</code> : '—' },
    { key: 'event_type', label: 'Event Type', render: (val) => <code style={{ background: '#f0f0f0', padding: '0.1rem 0.4rem', borderRadius: '3px', fontSize: '0.8rem' }}>{val}</code> },
    {
      key: 'payload',
      label: 'Payload',
      render: (val) => {
        const parsed = typeof val === 'string' ? JSON.parse(val || '{}') : val;
        return (
          <details>
            <summary style={{ cursor: 'pointer', fontSize: '0.8rem', color: '#6c757d' }}>
              {parsed?.statusCode ? `HTTP ${parsed.statusCode}` : 'view'}
            </summary>
            <pre style={{ fontSize: '0.75rem', background: '#f8f9fa', padding: '0.5rem', borderRadius: '3px', marginTop: '0.25rem', maxWidth: '400px', overflow: 'auto' }}>
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </details>
        );
      },
    },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: '700' }}>Event Log</h1>
        <button style={btnStyle} onClick={loadEvents}>Refresh</button>
      </div>

      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center' }}>
        <input style={inputStyle} placeholder="Filter by user ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input style={inputStyle} placeholder="Filter by event type" value={eventType} onChange={(e) => setEventType(e.target.value)} />
        <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>Auto-refreshes every 10s</span>
      </div>

      {loading ? <p>Loading…</p> : <DataTable columns={columns} data={events} />}
    </div>
  );
}
