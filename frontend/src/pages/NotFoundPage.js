import React from 'react';
import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <section className="section">
      <div className="container" style={{ textAlign: 'center', padding: '80px 0' }}>
        <h1 style={{ fontSize: 72, color: 'var(--accent)', fontWeight: 800 }}>404</h1>
        <h2 style={{ marginBottom: 12 }}>Page Not Found</h2>
        <p className="muted" style={{ marginBottom: 24 }}>
          The page you're looking for doesn't exist.
        </p>
        <Link to="/" className="btn btn-primary">Go Home</Link>
      </div>
    </section>
  );
}
