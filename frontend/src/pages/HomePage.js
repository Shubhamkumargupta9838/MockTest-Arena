import React from 'react';
import { Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import './HomePage.css';

export default function HomePage() {
  const { data, loading, error } = useFetch('/api/exams/home');

  if (loading) return <div className="loading-screen"><div className="spinner" /> Loading…</div>;
  if (error)   return <div className="error-box">Failed to load: {error}</div>;

  const { categories = [], featuredTests = [] } = data;

  return (
    <>
      {/* ── Hero ─────────────────────────────────── */}
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <p className="hero-label">Exam-ready practice</p>
            <h1>Crack SSC, Railway &amp; Banking with real exam-like mocks.</h1>
            <p className="hero-sub">
              Full-length mock tests, topic-wise practice, negative marking, and detailed analytics.
            </p>
            <div className="hero-actions">
              <Link to="/exams/ssc" className="btn btn-primary">Start Free Mock</Link>
              <Link to="/exams/banking" className="btn btn-secondary">Explore Banking</Link>
              <Link to="/payment" className="btn btn-primary">
                Try Payment
              </Link>
            </div>
            <div className="hero-badges">
              <span>Section Timers</span>
              <span>Auto Save</span>
              <span>Exam Pattern</span>
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-card-top">
              <h3>Latest Mock Tests</h3>
              <p>Quick access to full mocks</p>
            </div>
            <div className="hero-card-list">
              {featuredTests.length === 0
                ? <p className="muted">No mock tests yet. Seed sample data first.</p>
                : featuredTests.map(test => (
                    <StartTestLink key={test.id} test={test} />
                  ))
              }
            </div>
          </div>
        </div>
      </section>

      {/* ── Categories ───────────────────────────── */}
      <section className="section">
        <div className="container">
          <div className="section-heading">
            <h2>Exam Categories</h2>
            <p>Choose your target exam and start practice instantly.</p>
          </div>
          <div className="grid-3">
            {categories.map(cat => (
              <Link key={cat.id} className="card category-card" to={`/exams/${cat.slug}`}>
                <h3>{cat.name}</h3>
                <p>{cat.description || 'Complete mock tests and practice quizzes.'}</p>
                <span className="text-accent">Explore →</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────── */}
      <section className="section alt">
        <div className="container">
          <div className="section-heading">
            <h2>Why students trust us</h2>
            <p>Fast, mobile-first, and designed for exam endurance.</p>
          </div>
          <div className="grid-3">
            <div className="card">
              <h3>Real Exam Engine</h3>
              <p>Section timers, auto-submit, and question palette built for exam discipline.</p>
            </div>
            <div className="card">
              <h3>Smart Analytics</h3>
              <p>Accuracy, time spent, and section insights help you improve faster.</p>
            </div>
            <div className="card">
              <h3>No Login Required</h3>
              <p>Start practice instantly. Optional login can be added later.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

// Handles the POST /api/quiz/start/:slug → redirect to attempt
function StartTestLink({ test }) {
  const [loading, setLoading] = React.useState(false);

  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/quiz/start/${test.slug}`, {
        method: 'POST', credentials: 'include',
      });
      const data = await res.json();
      if (data.attemptId) {
        window.location.href = `/quiz/attempt/${data.attemptId}`;
      }
    } catch {
      setLoading(false);
    }
  };

  return (
    <button className="card-row" onClick={handleStart} disabled={loading}>
      <div>
        <h4>{test.title}</h4>
        <p>{test.exam_name} · Full Mock</p>
      </div>
      <span>{loading ? '…' : 'Start →'}</span>
    </button>
  );
}
