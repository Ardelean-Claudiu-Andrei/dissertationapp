import React from 'react';
import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import PollsPage from './pages/PollsPage.jsx';
import FlagsPage from './pages/FlagsPage.jsx';
import EventLogPage from './pages/EventLogPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: '📈' },
  { to: '/', label: 'Polls', icon: '🗳️', end: true },
  { to: '/flags', label: 'Feature Flags', icon: '🚩' },
  { to: '/events', label: 'Event Log', icon: '📋' },
  { to: '/users', label: 'Users', icon: '👥' },
];

function Sidebar() {
  return (
    <aside style={styles.sidebar}>
      <div style={styles.brand}>
        <div style={styles.brandIcon}>D</div>
        <div>
          <div style={styles.brandTitle}>Dissertation</div>
          <div style={styles.brandSub}>Admin Panel</div>
        </div>
      </div>

      <nav style={styles.nav}>
        <div style={styles.navSection}>NAVIGATION</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            <span style={styles.navIcon}>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div style={styles.sidebarFooter}>
        <div style={styles.footerDot} />
        <span style={{ color: '#6c757d', fontSize: '0.75rem' }}>Backend connected</span>
      </div>
    </aside>
  );
}

function Header() {
  const location = useLocation();
  const current = NAV_ITEMS.find((n) => n.end ? location.pathname === n.to : location.pathname.startsWith(n.to));
  return (
    <header style={styles.header}>
      <div>
        <h1 style={styles.headerTitle}>{current?.label ?? 'Dashboard'}</h1>
        <div style={styles.breadcrumb}>Admin · {current?.label ?? 'Dashboard'}</div>
      </div>
      <div style={styles.headerRight}>
        <a href="http://localhost:3001/api-docs" target="_blank" rel="noreferrer" style={styles.docsBtn}>
          API Docs ↗
        </a>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div style={styles.layout}>
        <Sidebar />
        <div style={styles.main}>
          <Header />
          <div style={styles.content}>
            <Routes>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/" element={<PollsPage />} />
              <Route path="/flags" element={<FlagsPage />} />
              <Route path="/events" element={<EventLogPage />} />
              <Route path="/users" element={<UsersPage />} />
            </Routes>
          </div>
        </div>
      </div>
    </BrowserRouter>
  );
}

const styles = {
  layout: {
    display: 'flex',
    minHeight: '100vh',
    background: '#f8f9fa',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  sidebar: {
    width: 240,
    background: '#1a1a2e',
    display: 'flex',
    flexDirection: 'column',
    padding: '1.5rem 1rem',
    position: 'sticky',
    top: 0,
    height: '100vh',
    flexShrink: 0,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    marginBottom: '2rem',
    paddingBottom: '1.5rem',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  brandIcon: {
    width: 36, height: 36, borderRadius: 10,
    background: '#e94560',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontWeight: '800', fontSize: '1rem', color: '#fff',
    flexShrink: 0,
  },
  brandTitle: { color: '#fff', fontWeight: '700', fontSize: '0.95rem', lineHeight: 1.2 },
  brandSub: { color: '#6c757d', fontSize: '0.75rem' },
  nav: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  navSection: { fontSize: '0.65rem', fontWeight: '700', color: '#6c757d', letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 0.5rem', marginBottom: '0.5rem' },
  navLink: {
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '0.65rem 0.75rem', borderRadius: 10,
    color: '#a0aec0', fontSize: '0.875rem', fontWeight: '500',
    textDecoration: 'none', transition: 'all 0.15s',
  },
  navLinkActive: {
    background: 'rgba(233,69,96,0.12)',
    color: '#e94560',
    fontWeight: '600',
  },
  navIcon: { fontSize: '1rem', width: 20, textAlign: 'center' },
  sidebarFooter: {
    display: 'flex', alignItems: 'center', gap: '0.5rem',
    padding: '0.75rem 0.5rem',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    marginTop: '1rem',
  },
  footerDot: { width: 7, height: 7, borderRadius: '50%', background: '#28a745', flexShrink: 0 },
  main: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '1.25rem 2rem',
    background: '#fff',
    borderBottom: '1px solid #e9ecef',
    position: 'sticky', top: 0, zIndex: 10,
  },
  headerTitle: { fontSize: '1.25rem', fontWeight: '700', color: '#1a1a2e', margin: 0 },
  breadcrumb: { fontSize: '0.75rem', color: '#6c757d', marginTop: '0.1rem' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  docsBtn: {
    padding: '0.4rem 0.9rem', borderRadius: 8,
    background: '#f0f0f0', color: '#495057',
    fontSize: '0.8rem', fontWeight: '500', textDecoration: 'none',
    border: '1px solid #dee2e6',
  },
  content: { padding: '1.75rem 2rem', maxWidth: 1200, width: '100%' },
};
