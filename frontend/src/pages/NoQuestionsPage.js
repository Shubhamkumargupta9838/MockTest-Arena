import React from 'react';
import { Link } from 'react-router-dom';

export default function NoQuestionsPage({ examName }) {
  return (
    <section className="section">
      <div className="container" style={{ textAlign: 'center', paddingTop: 60 }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>📭</div>
        <h2 style={{ marginBottom: 12 }}>No Questions Available</h2>
        <p className="muted" style={{ marginBottom: 28, maxWidth: 420, margin: '0 auto 28px' }}>
          {examName
            ? `There are no questions available for ${examName} yet.`
            : 'There are no questions available for this test yet.'}
          <br />Please check back later or contact the administrator.
        </p>
        <Link to="/" className="btn btn-primary">Back to Home</Link>
      </div>
    </section>
  );
}
