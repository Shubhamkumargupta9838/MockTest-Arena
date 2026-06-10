import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useTimer — manages countdown for mock tests
 * @param {number} initialSeconds  - starting time in seconds (0 = disabled)
 * @param {function} onExpire      - callback when timer reaches 0
 */
export default function useTimer(initialSeconds, onExpire) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const timerRef = useRef(null);

  const start = useCallback(() => {
    if (!initialSeconds) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSeconds(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          onExpire && onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [initialSeconds, onExpire]);

  const stop = useCallback(() => {
    clearInterval(timerRef.current);
  }, []);

  const reset = useCallback((s) => {
    clearInterval(timerRef.current);
    setSeconds(s);
  }, []);

  // Auto-start when initialSeconds is set
  useEffect(() => {
    if (initialSeconds > 0) start();
    return () => clearInterval(timerRef.current);
  }, [initialSeconds, start]);

  const formatted = (() => {
    const s = Math.max(seconds, 0);
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  })();

  return { seconds, formatted, stop, reset };
}
