import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/auth';
import './AdminExams.css';

export default function AdminExams() {
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', category_id: '' });
  const [categories, setCategories] = useState([]);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const metaRes = await authFetch('/api/admin/meta');
        const metaData = await metaRes.json();
        if (metaData && metaData.exams) {
          setExams(metaData.exams);
        }
        if (metaData && metaData.categories) {
          setCategories(metaData.categories);
        }
      } catch (err) {
        console.error('Failed to load exams:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleCreateExam = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.name.trim() || !formData.category_id) {
      setMessage({ type: 'error', text: 'Exam name and category are required.' });
      return;
    }

    try {
      const res = await authFetch('/api/admin/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          category_id: formData.category_id,
        }),
      });
      const data = await res.json();
      if (data.status === 'ok') {
        const category = categories.find(cat => String(cat.id) === String(formData.category_id));
        setExams([{ id: data.examId, name: formData.name.trim(), description: formData.description.trim(), category_name: category?.name || '' }, ...exams]);
        setFormData({ name: '', description: '', category_id: '' });
        setMessage({ type: 'success', text: 'Exam created successfully.' });
        setShowForm(false);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to create exam.' });
      }
    } catch (err) {
      console.error('Create exam failed:', err);
      setMessage({ type: 'error', text: err.message || 'Failed to create exam.' });
    }
  };

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
        <form className="form-card" onSubmit={handleCreateExam}>
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
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">Create Exam</button>
          {message && (
            <p className={message.type === 'error' ? 'error-text' : 'success-text'}>{message.text}</p>
          )}
        </form>
      )}

      <div className="items-table">
        <div className="table-header">
          <div>Name</div>
          <div>Category</div>
          <div>Description</div>
          <div>Actions</div>
        </div>
        {exams.length === 0 && (
          <div className="table-empty">
            <p>No exams found.</p>
          </div>
        )}
        {exams.map(exam => (
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
