import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import AdminExams from '../components/admin/AdminExams';
import AdminTests from '../components/admin/AdminTests';
import AdminUpload from '../components/admin/AdminUpload';
import { authFetch, clearLegacyAuthToken } from '../utils/auth';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('exams');
  const navigate = useNavigate();

  useEffect(() => {
    authFetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (!data.authenticated || !data.admin) {
          navigate('/admin/login');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => navigate('/admin/login'));
  }, [navigate]);

  const handleLogout = async () => {
    await authFetch('/api/auth/logout', { method: 'POST' });
    clearLegacyAuthToken();
    navigate('/admin/login');
  };

  if (!user) return <div className="loading-screen"><div className="spinner" /> Loading…</div>;

  return (
    <div className="admin-layout">
      <div className="admin-header">
        <div className="admin-header-content">
          <h1>Admin Dashboard</h1>
          <div className="admin-header-actions">
            <span className="user-info">👤 {user.username || user.name || user.email}</span>
            <button onClick={handleLogout} className="btn btn-light btn-sm">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="admin-container">
        <div className="admin-tabs">
          <button
            className={`tab ${tab === 'exams' ? 'active' : ''}`}
            onClick={() => setTab('exams')}
          >
            📚 Exams
          </button>
          <button
            className={`tab ${tab === 'tests' ? 'active' : ''}`}
            onClick={() => setTab('tests')}
          >
            📝 Tests & Mocks
          </button>
          <button
            className={`tab ${tab === 'upload' ? 'active' : ''}`}
            onClick={() => setTab('upload')}
          >
            ⬆️ Upload Questions
          </button>
        </div>

        <div className="admin-content">
          {tab === 'exams' && <AdminExams />}
          {tab === 'tests' && <AdminTests />}
          {tab === 'upload' && <AdminUpload />}
        </div>
      </div>
    </div>
  );
}
