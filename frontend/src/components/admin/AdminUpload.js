import React, { useState, useEffect } from 'react';
import { authFetch } from '../../utils/auth';
import './AdminUpload.css';

export default function AdminUpload() {
  const [meta, setMeta] = useState({ exams: [], subjects: [], topics: [] });
  const [file, setFile] = useState(null);
  const [examId, setExamId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [practiceTitle, setPracticeTitle] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    authFetch('/api/upload/meta')
      .then(r => r.json())
      .then(setMeta)
      .catch(() => {});
  }, []);

  const filteredTopics = subjectId
    ? meta.topics.filter(t => String(t.subject_id) === subjectId)
    : meta.topics;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      alert('Please select a file');
      return;
    }
    setSubmitting(true);
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);
    if (examId) formData.append('exam_id', examId);
    if (subjectId) formData.append('subject_id', subjectId);
    if (topicId) formData.append('topic_id', topicId);
    if (practiceTitle) formData.append('practice_title', practiceTitle);

    try {
      const res = await authFetch('/api/upload/questions', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="admin-section">
      <div className="section-header">
        <h2>Upload Questions</h2>
      </div>

      <form onSubmit={handleSubmit} className="upload-form">
        <div className="form-group">
          <label>File (CSV or JSON) *</label>
          <input
            type="file"
            accept=".csv,.json"
            onChange={e => setFile(e.target.files[0])}
            required
          />
          <p className="muted hint">
            CSV columns: subject, topic, text, option_a, option_b, option_c, option_d, correct_option, difficulty, image_url, question_type<br />
            JSON: add image_url and question_type fields (e.g. &#123;"image_url": "https://...", "question_type": "image"&#125;)
          </p>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Exam (optional)</label>
            <select value={examId} onChange={e => setExamId(e.target.value)}>
              <option value="">— Select exam —</option>
              {meta.exams && meta.exams.map(ex => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Subject (optional)</label>
            <select value={subjectId} onChange={e => { setSubjectId(e.target.value); setTopicId(''); }}>
              <option value="">— Select subject —</option>
              {meta.subjects && meta.subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Topic (optional)</label>
            <select value={topicId} onChange={e => setTopicId(e.target.value)}>
              <option value="">— Select topic —</option>
              {filteredTopics.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Create practice test with title (optional)</label>
          <input
            className="practice-title-input"
            type="text"
            value={practiceTitle}
            onChange={e => setPracticeTitle(e.target.value)}
            placeholder="e.g. Analogy Practice Set 1"
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Uploading…' : 'Upload Questions'}
        </button>
      </form>

      {result && (
        <div className={`upload-result ${result.error ? 'error' : 'success'}`}>
          {result.error
            ? <p>❌ {result.error}</p>
            : <p>✅ Successfully imported <strong>{result.created}</strong> question(s).</p>
          }
          {result.errors?.length > 0 && (
            <ul className="error-list">
              {result.errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
