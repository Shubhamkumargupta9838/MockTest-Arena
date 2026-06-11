import React, { useState, useEffect } from 'react';
import './AdminTests.css';

export default function AdminTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('all');

  useEffect(() => {
    fetch('/api/admin/meta', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        // For now, just show the meta info
        console.log('Admin meta:', data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load tests:', err);
        setLoading(false);
      });
  }, []);

  if (loading) return <div>Loading tests…</div>;

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Manage Tests & Mocks</h2>
        <a href="/admin/create-test" className="btn btn-primary btn-sm">+ Create Test</a>
      </div>

      <div className="filter-row">
        <select value={mode} onChange={e => setMode(e.target.value)}>
          <option value="all">All Tests</option>
          <option value="mock">Full Mock Tests</option>
          <option value="practice">Practice Tests</option>
        </select>
      </div>

      <div className="items-table">
        <div className="table-header">
          <div>Title</div>
          <div>Exam</div>
          <div>Mode</div>
          <div>Questions</div>
          <div>Actions</div>
        </div>
        {tests.length === 0 && (
          <div className="table-empty">
            <p>No tests found. <a href="/admin/create-test">Create one now</a>.</p>
          </div>
        )}
      </div>
    </div>
  );
}
