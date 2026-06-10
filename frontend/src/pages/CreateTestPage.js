import React, { useEffect, useMemo, useState } from 'react';
import './CreateTestPage.css';

export default function CreateTestPage() {
  const [meta, setMeta] = useState({ exams: [], sections: [], topics: [] });
  const [examId, setExamId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState('mock');
  const [shuffleQuestions, setShuffleQuestions] = useState(true);
  const [rules, setRules] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/admin/meta', { credentials: 'include' })
      .then(res => res.json())
      .then(data => setMeta(data))
      .catch(() => setMeta({ exams: [], sections: [], topics: [] }));
  }, []);

  const examSections = useMemo(() => {
    return meta.sections.filter(sec => String(sec.exam_id) === String(examId));
  }, [meta.sections, examId]);

  useEffect(() => {
    if (!examId) {
      setRules([]);
      return;
    }

    const preset = examSections.map(section => ({
      section_id: section.id,
      section_name: section.name,
      subject_id: section.subject_id,
      subject_name: section.subject_name,
      question_count: section.question_count,
      topic_id: '',
      difficulty: '',
    }));
    setRules(preset);
  }, [examId, examSections]);

  const handleRuleChange = (index, changes) => {
    setRules(current => current.map((rule, idx) => idx === index ? { ...rule, ...changes } : rule));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!examId || !title.trim()) {
      setResult({ error: 'Please select an exam and enter a title.' });
      return;
    }

    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch('/api/admin/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          exam_id: examId,
          title: title.trim(),
          mode,
          description: description.trim(),
          shuffle_questions: shuffleQuestions,
          rules: rules.map(rule => ({
            section_id: rule.section_id,
            question_count: parseInt(rule.question_count, 10) || 0,
            topic_id: rule.topic_id || null,
            difficulty: rule.difficulty || null,
          })),
        }),
      });
      const data = await res.json();
      setResult(data);
      if (data.status === 'ok') {
        setTitle('');
        setDescription('');
        setMode('mock');
        setShuffleQuestions(true);
      }
    } catch (err) {
      setResult({ error: err.message || 'Could not create test.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <h2>Create New Mock / Practice Test</h2>
          <p>Build a full mock test or a practice test by selecting sections and optional topic filters.</p>
        </div>

        <div className="create-test-card card">
          <form onSubmit={handleSubmit} className="create-test-form">
            <div className="form-row">
              <div className="form-group">
                <label>Exam</label>
                <select value={examId} onChange={e => setExamId(e.target.value)} required>
                  <option value="">— Select exam —</option>
                  {meta.exams.map(ex => (
                    <option key={ex.id} value={ex.id}>{ex.name} ({ex.category_name})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Mode</label>
                <select value={mode} onChange={e => setMode(e.target.value)}>
                  <option value="mock">Full Mock Test</option>
                  <option value="practice">Practice Test</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Test Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="SSC CGL Full Mock #3"
                required
              />
            </div>

            <div className="form-group">
              <label>Description (optional)</label>
              <textarea
                rows="3"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional description for the test"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label><input
                    type="checkbox"
                    checked={shuffleQuestions}
                    onChange={e => setShuffleQuestions(e.target.checked)}
                  />
                  <span className="checkbox-label">Shuffle questions</span>
                </label>
              </div>
              <div className="form-group">
                <label>Slug (optional)</label>
                <input
                  type="text"
                  placeholder="Optional custom slug / unique key"
                  disabled
                />
                <p className="muted hint">The slug will be generated automatically from the title.</p>
              </div>
            </div>

            {examId && examSections.length > 0 && (
              <div className="section-block">
                <h3>Section rules</h3>
                <p className="muted">The test engine will use these sections to select questions. For practice tests, you can optionally assign a topic filter to each section.</p>
                <div className="rules-table">
                  <div className="rules-row rules-header">
                    <div>Section</div>
                    <div>Subject</div>
                    <div>Question count</div>
                    <div>Topic filter (optional)</div>
                  </div>
                  {rules.map((rule, index) => {
                    const topicsForSubject = meta.topics.filter(t => t.subject_id === rule.subject_id);
                    return (
                      <div key={rule.section_id} className="rules-row">
                        <div>{rule.section_name}</div>
                        <div>{rule.subject_name}</div>
                        <div>
                          <input
                            type="number"
                            min="1"
                            value={rule.question_count}
                            onChange={e => handleRuleChange(index, { question_count: e.target.value })}
                          />
                        </div>
                        <div>
                          <select
                            value={rule.topic_id}
                            onChange={e => handleRuleChange(index, { topic_id: e.target.value })}
                          >
                            <option value="">— All topics —</option>
                            {topicsForSubject.map(topic => (
                              <option key={topic.id} value={topic.id}>{topic.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={submitting || !examId || !title.trim()}>
              {submitting ? 'Creating…' : 'Create Test'}
            </button>
          </form>

          {result && (
            <div className={`upload-result ${result.error ? 'error' : 'success'}`}>
              {result.error ? (
                <p>❌ {result.error}</p>
              ) : (
                <>
                  <p>✅ Test created successfully.</p>
                  <p>Slug: <strong>{result.slug}</strong></p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
