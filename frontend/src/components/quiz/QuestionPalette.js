import React from 'react';

/**
 * QuestionPalette — the sidebar grid showing question status
 */
export default function QuestionPalette({ questions, currentIdx, onSelect }) {
  return (
    <aside className="palette-panel">
      <h4>Question Palette</h4>
      <div className="palette">
        {questions.map((q, idx) => (
          <button
            key={idx}
            className={[
              'palette-btn',
              q.selected ? 'attempted' : '',
              q.marked    ? 'marked'    : '',
              idx === currentIdx ? 'active' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSelect(idx)}
            title={`Question ${idx + 1}${q.selected ? ' (Answered)' : ''}${q.marked ? ' (Marked)' : ''}`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="palette-legend">
        <span className="legend attempted">Attempted</span>
        <span className="legend marked">Marked for Review</span>
        <span className="legend unattempted">Unattempted</span>
      </div>

      {/* Summary counts */}
      <div className="palette-summary">
        <div>
          <strong className="success">{questions.filter(q => q.selected).length}</strong>
          <span>Answered</span>
        </div>
        <div>
          <strong className="accent">{questions.filter(q => q.marked).length}</strong>
          <span>Marked</span>
        </div>
        <div>
          <strong className="muted">{questions.filter(q => !q.selected).length}</strong>
          <span>Remaining</span>
        </div>
      </div>
    </aside>
  );
}
