import React from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import StartTestLink from '../components/exam/StartTestLink';
import './ExamPage.css';

export default function ExamPage() {
  const { categorySlug, examSlug } = useParams();
  const { data, loading, error } = useFetch(`/api/exams/${categorySlug}/${examSlug}`);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (error)   return <div className="error-box">Exam not found.</div>;

  const { exam, practicetests, mocktests } = data;

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <h2>{exam.name}</h2>
          <p className="muted">{exam.description || ''}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <Link className="btn btn-secondary btn-sm"
              to={`/exams/${categorySlug}/${examSlug}/practice`}>
              All Practice Quizzes
            </Link>
            <Link className="btn btn-primary btn-sm"
              to={`/exams/${categorySlug}/${examSlug}/mock`}>
              All Mock Tests
            </Link>
          </div>
        </div>

        <div className="exam-panels">
          {mocktests.length > 0 && (
            <div className="exam-panel">
              <h3 className="panel-title">Full Mock Tests</h3>
              <div className="list-grid">
                {mocktests.map(test => <TestCard key={test.id} test={test} />)}
              </div>
            </div>
          )}

          {practicetests.length > 0 && (
            <div className="exam-panel">
              <h3 className="panel-title">Practice Quizzes</h3>
              <div className="list-grid">
                {practicetests.map(test => <TestCard key={test.id} test={test} />)}
              </div>
            </div>
          )}
        </div>

        {mocktests.length === 0 && practicetests.length === 0 && (
          <p className="muted">No tests available yet. Seed sample data first.</p>
        )}
      </div>
    </section>
  );
}

function TestCard({ test }) {
  return (
    <div className="list-card">
      <div>
        <h4 style={{ marginBottom: 4 }}>{test.title}</h4>
        <p className="muted" style={{ fontSize: 13 }}>
          {test.mode === 'mock' ? 'Full Mock Test' : 'Practice Quiz'}
        </p>
      </div>
      <StartTestLink slug={test.slug} label="Start →" />
    </div>
  );
}
