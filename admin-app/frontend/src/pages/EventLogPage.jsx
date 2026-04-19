import React, { useState, useEffect } from 'react';
import api from '../api/client.js';

const methodColors = { GET: '#4361ee', POST: '#28a745', PUT: '#fd7e14', DELETE: '#dc3545' };

function parseMethod(eventType) {
  const m = eventType?.match(/^(GET|POST|PUT|DELETE|PATCH)/);
  return m ? m[1] : null;
}

function MethodBadge({ eventType }) {
  const method = parseMethod(eventType);
  if (!method) return <code style={{ fontSize: '0.8rem', background: '#f0f0f0', padding: '0.15rem 0.4rem', borderRadius: 4 }}>{eventType}</code>;
  const color = methodColors[method] || '#6c757d';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
      <span style={{ background: color + '22', color, fontWeight: '700', fontSize: '0.7rem', padding: '0.15rem 0.45rem', borderRadius: 4, letterSpacing: '0.03em' }}>
        {method}
      </span>
      <code style={{ fontSize: '0.8rem', color: '#495057' }}>{eventType.replace(method + ' ', '')}</code>
    </span>
  );
}

export default function EventLogPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [eventType, setEventType] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  async function loadEvents() {
    try {
      const params = {};
      if (userId) params.user_id = userId;
      if (eventType) params.event_type = eventType;
      const { data } = await api.get('/admin/events', { params });
      setEvents(data);
      setLastUpdated(new Date().toLocaleTimeString());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, [userId, eventType]);

  const successCount = events.filter((e) => {
    const p = typeof e.payload === 'string' ? JSON.parse(e.payload || '{}') : (e.payload || {});
    return p.statusCode >= 200 && p.statusCode < 300;
  }).length;
  const errorCount = events.filter((e) => {
    const p = typeof e.payload === 'string' ? JSON.parse(e.payload || '{}') : (e.payload || {});
    return p.statusCode >= 400;
  }).length;

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.75rem' }}>
        {[
          { label: 'Total Events', value: events.length, icon: '📋', color: '#1a1a2e' },
          { label: 'Successful (2xx)', value: successCount, icon: '✅', color: '#28a745' },
          { label: 'Errors (4xx/5xx)', value: errorCount, icon: '❌', color: '#dc3545' },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, background: '#fff', borderRadius: 12, padding: '1.25rem 1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '1.75rem' }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: '1.75rem', fontWeight: '800', color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.8rem', color: '#6c757d', marginTop: '0.2rem' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', border: '1px solid #f0f0f0', display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input style={filterInput} placeholder="🔍 Filter by user ID" value={userId} onChange={(e) => setUserId(e.target.value)} />
        <input style={filterInput} placeholder="🔍 Filter by event type" value={eventType} onChange={(e) => setEventType(e.target.value)} />
        <button onClick={loadEvents} style={refreshBtn}>Refresh</button>
        {lastUpdated && <span style={{ fontSize: '0.75rem', color: '#adb5bd', marginLeft: 'auto' }}>Updated {lastUpdated}</span>}
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#6c757d' }}>Loading…</div>
      ) : events.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: '3rem', textAlign: 'center', color: '#6c757d' }}>No events found.</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f0f0f0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8f9fa' }}>
                {['Time', 'User ID', 'Event', 'Status', 'Details'].map((h) => (
                  <th key={h} style={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((event, i) => {
                const payload = typeof event.payload === 'string' ? JSON.parse(event.payload || '{}') : (event.payload || {});
                const status = payload.statusCode;
                const isError = status >= 400;
                const isExpanded = expandedId === event.id;
                return (
                  <React.Fragment key={event.id}>
                    <tr
                      style={{ background: isExpanded ? '#f8f9ff' : i % 2 === 0 ? '#fff' : '#fafafa', cursor: 'pointer' }}
                      onClick={() => setExpandedId(isExpanded ? null : event.id)}
                    >
                      <td style={td}><span style={{ fontSize: '0.8rem', color: '#6c757d', fontFamily: 'monospace' }}>{event.created_at?.slice(11, 19)}</span></td>
                      <td style={td}>{event.user_id ? <code style={{ fontSize: '0.75rem', color: '#6c757d' }}>{event.user_id.slice(0, 8)}…</code> : <span style={{ color: '#dee2e6' }}>—</span>}</td>
                      <td style={td}><MethodBadge eventType={event.event_type} /></td>
                      <td style={td}>
                        {status ? (
                          <span style={{ background: isError ? '#fff0f0' : '#f0fff4', color: isError ? '#dc3545' : '#28a745', fontWeight: '700', fontSize: '0.75rem', padding: '0.15rem 0.5rem', borderRadius: 4 }}>
                            {status}
                          </span>
                        ) : <span style={{ color: '#dee2e6' }}>—</span>}
                      </td>
                      <td style={td}><span style={{ fontSize: '0.78rem', color: '#adb5bd' }}>{isExpanded ? '▲ hide' : '▼ show'}</span></td>
                    </tr>
                    {isExpanded && (
                      <tr style={{ background: '#f8f9ff' }}>
                        <td colSpan={5} style={{ padding: '0.75rem 1rem' }}>
                          <pre style={{ fontSize: '0.75rem', background: '#1a1a2e', color: '#a0aec0', padding: '1rem', borderRadius: 8, margin: 0, overflow: 'auto', maxHeight: 200 }}>
                            {JSON.stringify(payload, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const th = { padding: '0.65rem 1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', color: '#6c757d', letterSpacing: '0.05em', borderBottom: '1px solid #e9ecef' };
const td = { padding: '0.65rem 1rem', fontSize: '0.875rem', verticalAlign: 'middle', borderBottom: '1px solid #f5f5f5' };
const filterInput = { padding: '0.5rem 0.85rem', border: '1px solid #e9ecef', borderRadius: 8, fontSize: '0.875rem', outline: 'none', minWidth: 200 };
const refreshBtn = { padding: '0.5rem 1rem', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: '600', background: '#1a1a2e', color: '#fff' };
