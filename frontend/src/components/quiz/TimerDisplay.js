import React from 'react';
import './TimerDisplay.css';

/**
 * TimerDisplay — shows overall + section timer in the test header
 */
export default function TimerDisplay({ isMock, overallFormatted, sectionFormatted }) {
  return (
    <div className="timer-block">
      <div className={`timer-item ${isMock && overallFormatted && parseInt(overallFormatted) < 300 ? 'warning' : ''}`}>
        <span>Total Timer</span>
        <strong>{isMock ? overallFormatted : '--:--'}</strong>
      </div>
      <div className="timer-item">
        <span>Section Timer</span>
        <strong>{isMock && sectionFormatted ? sectionFormatted : '--:--'}</strong>
      </div>
    </div>
  );
}
