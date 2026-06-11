import React, { useState, useEffect } from 'react';
import './AdminExams.css';

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', category_id: '' });
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [examsRes, metaRes] = await Promise.all([
          fetch('/api/exams', { credentials: 'include' }),
          fetch('/api/admin/meta', { credentials: 'include' }),
        ]);

        const [examsData, metaData] = await Promise.all([
          examsRes.json(),
          metaRes.json(),
        ]);

        if (examsData) setExams(examsData);
        if (metaData && metaData.exams) {
          const cats = [...new Map(metaData.exams.map(e => [e.category_name, e.category_name])).values()];
          setCategories(cats);
        }
      } catch (err) {
        console.error('Failed to load exams:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <div>Loading exams…</div>;

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Manage Exams</h2>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-primary btn-sm">
          {showForm ? 'Cancel' : '+ Add Exam'}
        </button>
      </div>

      {showForm && (
        <div className="form-card">
          <h3>Create New Exam</h3>
          <div className="form-group">
            <label>Exam Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., SSC CHSL"
            />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="e.g., Combined Higher Secondary Level"
            />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select
              value={formData.category_id}
              onChange={e => setFormData({ ...formData, category_id: e.target.value })}
            >
              <option value="">— Select category —</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <button className="btn btn-primary">Create Exam</button>
        </div>
      )}

      <div className="items-table">
        <div className="table-header">
          <div>Name</div>
          <div>Category</div>
          <div>Description</div>
          <div>Actions</div>
        </div>
        {exams && exams.map(exam => (
          <div key={exam.id} className="table-row">
            <div>{exam.name}</div>
            <div className="muted">{exam.category_name || '—'}</div>
            <div className="muted text-small">{exam.description || '—'}</div>
            <div>
              <button className="btn btn-light btn-xs">Edit</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
