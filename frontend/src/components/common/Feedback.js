import React from 'react';

export function Spinner({ text = 'Loading…' }) {
  return (
    <div className="loading-screen">
      <div className="spinner" />
      {text}
    </div>
  );
}

export function ErrorBox({ message }) {
  return (
    <div className="error-box">
      <strong>Error:</strong> {message}
    </div>
  );
}
