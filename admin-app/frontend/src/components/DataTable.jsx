import React from 'react';

const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#fff',
  borderRadius: '8px',
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
};

const thStyle = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  background: '#f8f9fa',
  borderBottom: '2px solid #e9ecef',
  fontSize: '0.8rem',
  fontWeight: '600',
  textTransform: 'uppercase',
  color: '#6c757d',
  letterSpacing: '0.05em',
};

const tdStyle = {
  padding: '0.75rem 1rem',
  borderBottom: '1px solid #f0f0f0',
  fontSize: '0.9rem',
  verticalAlign: 'middle',
};

const emptyStyle = {
  padding: '2rem',
  textAlign: 'center',
  color: '#6c757d',
  fontSize: '0.9rem',
};

// columns: Array<{ key: string, label: string, render?: (value, row) => ReactNode }>
// data: Array<object>
export default function DataTable({ columns, data }) {
  if (!data || data.length === 0) {
    return (
      <table style={tableStyle}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={thStyle}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length} style={emptyStyle}>No data</td>
          </tr>
        </tbody>
      </table>
    );
  }

  return (
    <table style={tableStyle}>
      <thead>
        <tr>
          {columns.map((col) => (
            <th key={col.key} style={thStyle}>{col.label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.map((row, i) => (
          <tr key={row.id || i} style={{ background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
            {columns.map((col) => (
              <td key={col.key} style={tdStyle}>
                {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? '')}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
