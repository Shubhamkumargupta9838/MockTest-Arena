import React from 'react';
import { useParams, Link } from 'react-router-dom';
import useFetch from '../hooks/useFetch';
import './ResultPage.css';

export default function ResultPage() {
  const { attemptId } = useParams();
  const { data: result, loading, error } = useFetch(`/api/results/${attemptId}`);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (error)   return <div className="error-box">Result not found. The test may not have been submitted yet.</div>;

  const sectionStats = result.sectionStats || {};

  return (
    <section className="section">
      <div className="container">
        {/* ── Score Card ───────────────────────── */}
        <div className="result-card">
          <h2>Score Card</h2>
          <p className="muted">{result.testTitle} · {result.examName}</p>

          <div className="result-grid">
            <div className="result-stat">
              <span>Score</span>
              <strong className="score-num">{result.score}</strong>
            </div>
            <div className="result-stat">
              <span>Accuracy</span>
              <strong>{Number(result.accuracy).toFixed(1)}%</strong>
            </div>
            <div className="result-stat success">
              <span>Correct</span>
              <strong>{result.correctCount}</strong>
            </div>
            <div className="result-stat danger">
              <span>Incorrect</span>
              <strong>{result.incorrectCount}</strong>
            </div>
            <div className="result-stat">
              <span>Unattempted</span>
              <strong>{result.unattemptedCount}</strong>
            </div>
          </div>

          {/* Accuracy bar */}
          <div className="accuracy-bar-wrap">
            <div className="accuracy-bar" style={{ width: `${Math.min(result.accuracy, 100)}%` }} />
          </div>
        </div>

        {/* ── Section Analysis ─────────────────── */}
        {Object.keys(sectionStats).length > 0 && (
          <>
            <div className="section-heading" style={{ marginTop: 32 }}>
              <h3>Section-wise Analysis</h3>
            </div>
            <div className="grid-3">
              {Object.entries(sectionStats).map(([key, stats]) => (
                <div key={key} className="card section-stat-card">
                  <h4>{stats.section_name}</h4>
                  <div className="stat-rows">
                    <div className="stat-row success"><span>Correct</span><strong>{stats.correct}</strong></div>
                    <div className="stat-row danger"><span>Incorrect</span><strong>{stats.incorrect}</strong></div>
                    <div className="stat-row"><span>Unattempted</span><strong>{stats.unattempted}</strong></div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="ad-slot" style={{ marginTop: 32 }}>Ad Space (Result Page)</div>

        <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
          <Link to="/" className="btn btn-primary">Go Home</Link>
        </div>
      </div>
    </section>
  );
}
