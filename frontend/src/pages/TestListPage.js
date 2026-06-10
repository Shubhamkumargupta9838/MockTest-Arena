import React from 'react';
import { useParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import StartTestLink from '../components/exam/StartTestLink';

export default function TestListPage({ mode }) {
  const { categorySlug, examSlug } = useParams();
  const { data, loading, error } = useFetch(
    `/api/exams/${categorySlug}/${examSlug}/tests?mode=${mode}`
  );

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (error)   return <div className="error-box">Tests not found.</div>;

  const { exam, tests } = data;
  const label = mode === 'mock' ? 'Full Mock Tests' : 'Practice Quizzes';

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <h2>{exam.name} — {label}</h2>
        </div>
        {tests.length === 0 ? (
          <p className="muted">No tests available yet.</p>
        ) : (
          <div className="list-grid">
            {tests.map(test => (
              <div key={test.id} className="list-card">
                <div>
                  <h4 style={{ marginBottom: 4 }}>{test.title}</h4>
                  <p className="muted" style={{ fontSize: 13 }}>{test.description || ''}</p>
                </div>
                <StartTestLink slug={test.slug} label="Start →" />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
