import React from 'react';
import { Link, useParams } from 'react-router-dom';
import useFetch from '../hooks/useFetch';

export default function CategoryPage() {
  const { categorySlug } = useParams();
  const { data, loading, error } = useFetch(`/api/exams/category/${categorySlug}`);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (error)   return <div className="error-box">Category not found.</div>;

  const { category, exams } = data;

  return (
    <section className="section">
      <div className="container">
        <div className="section-heading">
          <h2>{category.name}</h2>
          <p>{category.description || 'Choose an exam to start practicing.'}</p>
        </div>
        <div className="grid-3">
          {exams.map(exam => (
            <Link key={exam.id} className="card category-card"
              to={`/exams/${categorySlug}/${exam.slug}`}
              style={{ display: 'block' }}>
              <h3 style={{ marginBottom: 8 }}>{exam.name}</h3>
              <p className="muted" style={{ fontSize: 14, marginBottom: 12 }}>
                {exam.description || 'Mock tests and practice quizzes.'}
              </p>
              <span className="text-accent">View Tests →</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
