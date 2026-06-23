import React from 'react';
import { Outlet, Link, NavLink, useNavigate } from 'react-router-dom';
import { authFetch, clearLegacyAuthToken } from '../../utils/auth';
import './Layout.css';

export default function Layout() {
  const [user, setUser] = React.useState(null);
  const navigate = useNavigate();

  const loadUser = React.useCallback(() => {
    authFetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        setUser(data.authenticated && !data.admin ? data.user : null);
      })
      .catch(() => setUser(null));
  }, []);

  React.useEffect(() => {
    clearLegacyAuthToken();
    loadUser();
    window.addEventListener('auth:changed', loadUser);

    return () => window.removeEventListener('auth:changed', loadUser);
  }, [loadUser]);

  const handleLogout = async () => {
    await authFetch('/api/auth/logout', { method: 'POST' });
    clearLegacyAuthToken();
    setUser(null);
    navigate('/user/login');
  };

  return (
    <>
      <header className="site-header">
        <div className="container header-grid">
          <div className="brand">
            <span className="brand-dot" />
            <Link to="/" className="brand-name">MockTest Arena</Link>
            <span className="brand-tag">SSC · Railway · Banking</span>
          </div>
          <nav className="nav-links">
            <NavLink to="/exams/ssc" className="nav-link">SSC</NavLink>
            <NavLink to="/exams/railway" className="nav-link">Railway</NavLink>
            <NavLink to="/exams/banking" className="nav-link">Banking</NavLink>
            <NavLink to="/typing" className="nav-link" style={{
              backgroundColor: "#eac055",
              padding: "8px 10px",
              borderRadius: "6px",
              fontSize: "14px",
              textAlign:"center",
              color: "black",
              textDecoration: "none"
            }}>Typing</NavLink>
          </nav>
          <div className="header-cta">
            <Link to="/" className="btn btn-primary">Free Mock Test</Link>
            {user ? (
              <>
                <span className="user-pill">{user.name || user.email}</span>
                <button type="button" className="nav-link header-logout" onClick={handleLogout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/user/login" className="nav-link">Login</Link>
                <Link to="/user/register" className="nav-link">Register</Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="site-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        <div className="container footer-grid">
          <div>
            <h4>MockTest Arena</h4>
            <p>Real exam-like mocks for SSC, Railway, Banking. Built for speed, accuracy, and confidence.</p>
          </div>
          <div>
            <h5>Quick Links</h5>
            <Link to="/exams/ssc">SSC</Link>
            <Link to="/exams/railway">Railway</Link>
            <Link to="/exams/banking">Banking</Link>
            <Link to="/admin/login">Admin Panel</Link>
          </div>
          <div>
            <h5>Ads</h5>
            <div className="ad-slot">Ad Space (Header/Listing/Result)</div>
          </div>
        </div>
        <div className="footer-bottom">© 2026 MockTest Arena. All rights reserved.</div>
      </footer>
    </>
  );
}
