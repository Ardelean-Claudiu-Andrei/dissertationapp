import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import PollsPage from './pages/PollsPage.jsx';
import FlagsPage from './pages/FlagsPage.jsx';
import EventLogPage from './pages/EventLogPage.jsx';
import UsersPage from './pages/UsersPage.jsx';

const navStyle = {
  display: 'flex',
  gap: '1rem',
  padding: '1rem 2rem',
  background: '#1a1a2e',
  alignItems: 'center',
};

const linkStyle = ({ isActive }) => ({
  color: isActive ? '#e94560' : '#a0aec0',
  textDecoration: 'none',
  fontWeight: isActive ? '600' : '400',
  fontSize: '0.95rem',
});

const titleStyle = {
  color: '#ffffff',
  fontWeight: '700',
  marginRight: 'auto',
  fontSize: '1rem',
};

const contentStyle = {
  padding: '2rem',
  maxWidth: '1200px',
  margin: '0 auto',
};

export default function App() {
  return (
    <BrowserRouter>
      <nav style={navStyle}>
        <span style={titleStyle}>Dissertation Admin</span>
        <NavLink to="/" style={linkStyle} end>Polls</NavLink>
        <NavLink to="/flags" style={linkStyle}>Feature Flags</NavLink>
        <NavLink to="/events" style={linkStyle}>Event Log</NavLink>
        <NavLink to="/users" style={linkStyle}>Users</NavLink>
      </nav>
      <div style={contentStyle}>
        <Routes>
          <Route path="/" element={<PollsPage />} />
          <Route path="/flags" element={<FlagsPage />} />
          <Route path="/events" element={<EventLogPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
