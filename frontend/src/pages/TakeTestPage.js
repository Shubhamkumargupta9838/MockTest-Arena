import React, { useState, useEffect, useRef, useCallback } from 'react';
import NoQuestionsPage from './NoQuestionsPage';
import { useParams } from 'react-router-dom';
import QuestionPalette from '../components/quiz/QuestionPalette';
import './TakeTestPage.css';
import '../components/quiz/QuestionPalette.css';

export default function TakeTestPage() {
  const { attemptId } = useParams();

  const [payload,      setPayload]      = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [currentIdx,   setCurrentIdx]   = useState(0);
  const [questions,    setQuestions]    = useState([]);
  const [timeLeft,     setTimeLeft]     = useState(0);
  const [sectionSecs,  setSectionSecs]  = useState({});  // subject → remaining secs
  const [sectionSpent, setSectionSpent] = useState({});  // subject → spent secs

  const timerRef = useRef(null);

  // ── Format seconds → MM:SS ─────────────────────────────
  const fmt = (s) => {
    const m   = Math.floor(Math.max(s, 0) / 60).toString().padStart(2, '0');
    const sec = (Math.max(s, 0) % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  };

  // ── Load attempt data ──────────────────────────────────
  useEffect(() => {
    fetch(`/api/quiz/attempt/${attemptId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.submitted) { window.location.replace(`/results/${attemptId}`); return; }
        if (data.error)     throw new Error(data.error);

        setPayload(data);
        setQuestions(data.questions);
        setTimeLeft(data.timeLeft);

        const secSec = {}, secSp = {};
        (data.sections || []).forEach(sec => {
          secSec[sec.subject] = sec.timeSeconds - sec.timeSpent;
          secSp[sec.subject]  = sec.timeSpent;
        });
        setSectionSecs(secSec);
        setSectionSpent(secSp);
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [attemptId]);

  // ── Overall + section countdown timers ────────────────
  useEffect(() => {
    if (!payload?.isMock || loading) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 0) { clearInterval(timerRef.current); doSubmit(true); return 0; }
        return prev - 1;
      });
      // Decrement current section timer
      setQuestions(qs => {
        const subj = qs[currentIdx]?.subject;
        if (subj) {
          setSectionSecs(ss => ({ ...ss, [subj]: Math.max((ss[subj] || 0) - 1, 0) }));
          setSectionSpent(sp => ({ ...sp, [subj]: (sp[subj] || 0) + 1 }));
        }
        return qs;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
    
  }, [payload, loading]);

  // ── Integrity event logging ────────────────────────────
  useEffect(() => {
    const log = (type, detail) => fetch(`/api/quiz/attempt/${attemptId}/integrity`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: type, details: detail || '' }),
    });
    const onVis   = () => log('visibility', document.visibilityState);
    const onBlur  = () => log('tab_blur',   'Window blur');
    const onFocus = () => log('tab_focus',  'Window focus');
    const onCtx   = e  => { e.preventDefault(); log('right_click', ''); };
    const onCopy  = e  => { e.preventDefault(); log('copy_blocked', ''); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('blur',        onBlur);
    window.addEventListener('focus',       onFocus);
    window.addEventListener('contextmenu', onCtx);
    window.addEventListener('copy',        onCopy);
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('blur',        onBlur);
      window.removeEventListener('focus',       onFocus);
      window.removeEventListener('contextmenu', onCtx);
      window.removeEventListener('copy',        onCopy);
    };
  }, [attemptId]);

  // ── Save answer to backend ─────────────────────────────
  const saveAnswer = useCallback((question, selected) => {
    const section = payload?.sections?.find(s => s.subject === question.subject);
    fetch(`/api/quiz/attempt/${attemptId}/save`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        question_id:        question.id,
        selected_option:    selected || '',
        time_left_seconds:  timeLeft,
        section_id:         section?.id   || '',
        section_time_spent: section ? (sectionSpent[question.subject] || 0) : '',
      }),
    });
  }, [attemptId, payload, timeLeft, sectionSpent]);

  // ── Select / clear answer ──────────────────────────────
  const selectOption = (label) => {
    const q = questions[currentIdx];
    setQuestions(qs => qs.map((item, i) => i === currentIdx ? { ...item, selected: label } : item));
    saveAnswer(q, label);
  };

  const clearAnswer = () => {
    const q = questions[currentIdx];
    setQuestions(qs => qs.map((item, i) => i === currentIdx ? { ...item, selected: '' } : item));
    saveAnswer(q, '');
  };

  // ── Mark for review ────────────────────────────────────
  const toggleMark = () => {
    const q = questions[currentIdx];
    const newMarked = !q.marked;
    setQuestions(qs => qs.map((item, i) => i === currentIdx ? { ...item, marked: newMarked } : item));
    fetch(`/api/quiz/attempt/${attemptId}/mark`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question_id: q.id, is_marked: newMarked }),
    });
  };

  // ── Submit ─────────────────────────────────────────────
  const doSubmit = useCallback(async (auto = false) => {
    if (!auto && !window.confirm('Submit test now? You cannot change answers after submit.')) return;
    clearInterval(timerRef.current);
    const res  = await fetch(`/api/quiz/attempt/${attemptId}/submit`, {
      method: 'POST', credentials: 'include',
    });
    const data = await res.json();
    if (data.resultId !== undefined) window.location.replace(`/results/${attemptId}`);
  }, [attemptId]);

  // ── Render guards ──────────────────────────────────────
  if (loading) return <div className="loading-screen"><div className="spinner" /> Loading test…</div>;
  if (error)   return <div className="error-box">{error}</div>;
  if (!payload || questions.length === 0)
    return <NoQuestionsPage />;

  const q        = questions[currentIdx];
  const isMock   = payload.isMock;
  const secLeft  = isMock && sectionSecs[q.subject] !== undefined ? sectionSecs[q.subject] : null;
  const isLow    = isMock && timeLeft < 300;  // red timer under 5 min

  return (
    <div className="test-shell">
      {/* ── Test Header ───────────────────────────── */}
      <div className="test-header">
        <div>
          <h2>{payload.testTitle}</h2>
          <p className="muted">{isMock ? 'Full Mock Test' : 'Practice Quiz'}</p>
        </div>
        <div className="timer-block">
          <div className="timer-item">
            <span>Total Timer</span>
            <strong style={{ color: isLow ? 'var(--danger)' : 'var(--accent)' }}>
              {isMock ? fmt(timeLeft) : '--:--'}
            </strong>
          </div>
          <div className="timer-item">
            <span>Section Timer</span>
            <strong>{isMock && secLeft !== null ? fmt(secLeft) : '--:--'}</strong>
          </div>
        </div>
      </div>

      <div className="test-body">
        {/* ── Question Panel ─────────────────────── */}
        <div className="question-panel">
          <div className="question-meta">
            <span className="muted">{q.subject}</span>
            <span className="muted">Q{currentIdx + 1} of {questions.length}</span>
          </div>

          <div className="question-text">{q.text}</div>

          <div className="options">
            {q.choices.map(choice => (
              <button
                key={choice.label}
                className={`option-btn${q.selected === choice.label ? ' active' : ''}`}
                onClick={() => selectOption(choice.label)}
              >
                <strong>{choice.label}.</strong>&nbsp;{choice.text}
              </button>
            ))}
          </div>

          <div className="question-actions">
            <button className="btn btn-light" onClick={toggleMark}>
              {q.marked ? '★ Marked' : '☆ Mark for Review'}
            </button>
            <button className="btn btn-light" onClick={clearAnswer} disabled={!q.selected}>
              Clear Answer
            </button>
          </div>

          <div className="nav-actions">
            <button className="btn btn-secondary"
              disabled={currentIdx === 0}
              onClick={() => setCurrentIdx(i => i - 1)}>
              ← Previous
            </button>
            <button className="btn btn-primary"
              disabled={currentIdx === questions.length - 1}
              onClick={() => setCurrentIdx(i => i + 1)}>
              Next →
            </button>
            <button className="btn btn-danger" onClick={() => doSubmit(false)}>
              Submit Test
            </button>
          </div>
        </div>

        {/* ── Palette (extracted component) ──────── */}
        <QuestionPalette
          questions={questions}
          currentIdx={currentIdx}
          onSelect={setCurrentIdx}
        />
      </div>
    </div>
  );
}
