import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './AdminTests.css';

export default function AdminTests() {
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('all');
  const [error, setError] = useState(null);

  const fetchTests = async (selectedMode) => {
    setLoading(true);
    setError(null);
    try {
      const query = selectedMode && selectedMode !== 'all' ? `?mode=${selectedMode}` : '';
      const res = await fetch(`/api/admin/tests${query}`, { credentials: 'include' });
      const data = await res.json();
      if (data.tests) {
        setTests(data.tests);
      } else {
        setTests([]);
        setError(data.error || 'Failed to load tests.');
      }
    } catch (err) {
      console.error('Failed to load tests:', err);
      setError(err.message || 'Failed to load tests.');
      setTests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests(mode);
  }, [mode]);

  if (loading) return <div>Loading tests…</div>;

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Manage Tests & Mocks</h2>
        <Link to="/admin/create-test" className="btn btn-primary btn-sm">+ Create Test</Link>
      </div>

      <div className="filter-row">
        <select value={mode} onChange={e => setMode(e.target.value)}>
          <option value="all">All Tests</option>
          <option value="mock">Full Mock Tests</option>
          <option value="practice">Practice Tests</option>
        </select>
      </div>

      {error && <div className="upload-result error"><p>❌ {error}</p></div>}

      <div className="items-table">
        <div className="table-header">
          <div>Title</div>
          <div>Exam</div>
          <div>Mode</div>
          <div>Questions</div>
          <div>Actions</div>
        </div>
        {tests.length === 0 ? (
          <div className="table-empty">
            <p>No tests found. <Link to="/admin/create-test">Create one now</Link>.</p>
          </div>
        ) : (
          tests.map(test => (
            <div key={test.id} className="table-row">
              <div>{test.title}</div>
              <div className="muted">{test.exam_name || '—'}</div>
              <div>{test.mode}</div>
              <div>—</div>
              <div>
                <button className="btn btn-light btn-xs">Edit</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
