import React, { useState } from 'react';

export default function StartTestLink({ slug, label = 'Start →', className = 'btn btn-primary btn-sm' }) {
  const [loading, setLoading] = useState(false);

  const handleStart = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/quiz/start/${slug}`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (data.attemptId) {
        window.location.href = `/quiz/attempt/${data.attemptId}`;
      } else {
        alert(data.error || 'Could not start test');
        setLoading(false);
      }
    } catch {
      alert('Failed to start test. Please try again.');
      setLoading(false);
    }
  };

  return (
    <button className={className} onClick={handleStart} disabled={loading}>
      {loading ? '…' : label}
    </button>
  );
}
