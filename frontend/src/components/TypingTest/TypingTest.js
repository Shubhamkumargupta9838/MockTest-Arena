import { useEffect, useMemo, useRef, useState } from "react";
import "./TypingTest.css";
import passagesData from "./passages.json";
import { printCertificate } from "./certificate";

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

const TEST_OPTIONS = [
  { id: "timed-60", label: "1:00 Test", seconds: 60, group: "Timed Tests" },
  { id: "timed-180", label: "3:00 Test", seconds: 180, group: "Timed Tests" },
  { id: "timed-300", label: "5:00 Test", seconds: 300, group: "Timed Tests" },
  { id: "page-1", label: "1 Page Test", seconds: 60, group: "Page Tests" },
  { id: "page-2", label: "2 Page Test", seconds: 120, group: "Page Tests" },
  { id: "page-3", label: "3 Page Test", seconds: 180, group: "Page Tests" },
];

const EMPTY_STATS = {
  currentIndex: 0,
  errors: 0,
  totalTyped: 0,
  correctChars: 0,
  cumulativeErrors: 0,
  cumulativeTyped: 0,
  cumulativeCorrect: 0,
};

function shuffle(items) {
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

function normalizePassages(data) {
  const fallback =
    "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.";
  const source = data?.passages;

  if (Array.isArray(source)) {
    return {
      easy: shuffle(source),
      medium: shuffle(source),
      hard: shuffle(source),
    };
  }

  return {
    easy: shuffle(source?.easy?.length ? source.easy : [fallback]),
    medium: shuffle(source?.medium?.length ? source.medium : [fallback]),
    hard: shuffle(source?.hard?.length ? source.hard : [fallback]),
  };
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

function calculateDisplayStats(stats, testTime, currentTime) {
  const elapsed = testTime - currentTime;
  const mins = elapsed / 60 || 0.001;
  const totalCorrect = stats.cumulativeCorrect + stats.correctChars;
  const totalTyped = stats.cumulativeTyped + stats.totalTyped;
  const totalErrors = stats.cumulativeErrors + stats.errors;
  const wpm = Math.round(totalCorrect / 5 / mins);
  const acc = totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100;

  return {
    wpm,
    acc,
    chars: totalCorrect,
    errors: totalErrors,
  };
}

export default function TypingTest() {
  const passagePools = useMemo(() => normalizePassages(passagesData), []);
  const cursorsRef = useRef({ easy: 0, medium: 0, hard: 0 });
  const inputRef = useRef(null);

  const [currentDifficulty, setCurrentDifficulty] = useState("easy");
  const [testTime, setTestTime] = useState(60);
  const [currentTime, setCurrentTime] = useState(60);
  const [selectedTestId, setSelectedTestId] = useState("timed-60");
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stats, setStats] = useState(EMPTY_STATS);
  const [passage, setPassage] = useState({ text: "", num: 1, total: 1 });
  const [charStates, setCharStates] = useState([]);
  const [history, setHistory] = useState([]);
  const [sortMode, setSortMode] = useState("date");
  const [result, setResult] = useState(null);
  const [typingMode, setTypingMode] = useState("practice");

  const difficultyRef = useRef(currentDifficulty);
  const finishedRef = useRef(finished);
  const passageRef = useRef(passage);
  const charStatesRef = useRef(charStates);
  const statsRef = useRef(stats);
  const testTimeRef = useRef(testTime);
  const currentTimeRef = useRef(currentTime);

  useEffect(() => {
    difficultyRef.current = currentDifficulty;
  }, [currentDifficulty]);

  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);

  useEffect(() => {
    passageRef.current = passage;
  }, [passage]);

  useEffect(() => {
    charStatesRef.current = charStates;
  }, [charStates]);

  useEffect(() => {
    statsRef.current = stats;
  }, [stats]);

  useEffect(() => {
    testTimeRef.current = testTime;
  }, [testTime]);

  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  function focusInput() {
    inputRef.current?.focus();
  }

  function getNextPassage(level = difficultyRef.current) {
    const list = passagePools[level] || passagePools.easy;

    if (cursorsRef.current[level] >= list.length) {
      cursorsRef.current[level] = 0;
    }

    const index = cursorsRef.current[level];
    cursorsRef.current[level] += 1;

    return {
      text: list[index],
      num: index + 1,
      total: list.length,
    };
  }

  function loadNextPassage(level = difficultyRef.current) {
    const nextPassage = getNextPassage(level);

    setPassage(nextPassage);
    setCharStates(
      Array.from({ length: nextPassage.text.length }, (_, index) =>
        index === 0 ? "current" : "pending"
      )
    );
  }

  function resetTest(nextSeconds = testTimeRef.current, level = difficultyRef.current) {
    setStarted(false);
    setPaused(false);
    setFinished(false);
    setResult(null);
    setTestTime(nextSeconds);
    setCurrentTime(nextSeconds);
    setStats(EMPTY_STATS);
    loadNextPassage(level);
    window.setTimeout(focusInput, 0);
  }

  function finishTest(forcedElapsed) {
    if (finishedRef.current) return;

    const activeStats = statsRef.current;
    const activeTestTime = testTimeRef.current;
    const elapsed = forcedElapsed ?? activeTestTime - currentTimeRef.current;
    const mins = elapsed / 60 || 0.001;
    const totalCorrect = activeStats.cumulativeCorrect + activeStats.correctChars;
    const totalTyped = activeStats.cumulativeTyped + activeStats.totalTyped;
    const totalErrors = activeStats.cumulativeErrors + activeStats.errors;
    const wpm = Math.round(totalCorrect / 5 / mins);
    const acc = totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100;
    const completedResult = {
      wpm,
      acc,
      errors: totalErrors,
      chars: totalCorrect,
      date: new Date(),
      duration: activeTestTime,
    };

    finishedRef.current = true;
    setStarted(false);
    setPaused(false);
    setFinished(true);
    setResult(completedResult);
    setHistory((items) => [completedResult, ...items].slice(0, 30));
  }

  useEffect(() => {
    loadNextPassage("easy");
    focusInput();
    // This should run once on mount.
  }, []);

  useEffect(() => {
    if (!started || paused || finished) return undefined;

    const timerId = window.setInterval(() => {
      setCurrentTime((previousTime) => {
        if (previousTime <= 1) {
          currentTimeRef.current = 0;
          finishTest(testTimeRef.current);
          return 0;
        }

        const nextTime = previousTime - 1;
        currentTimeRef.current = nextTime;
        return nextTime;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [started, paused, finished]);

  function selectTest(option) {
    setSelectedTestId(option.id);
    resetTest(option.seconds);
  }

  function startTest(event, option) {
    event.stopPropagation();
    selectTest(option);
  }

  function changeDifficulty(level) {
    setCurrentDifficulty(level);
    cursorsRef.current[level] = 0;
    resetTest(testTimeRef.current, level);
  }

  function handleKeyDown(event) {
    if (event.key === "Tab") {
      event.preventDefault();
      return;
    }

    if (event.key === "Escape") {
      resetTest();
      return;
    }

    if (finishedRef.current) return;

    const activePassage = passageRef.current;
    const activeText = activePassage.text;
    const activeStats = statsRef.current;

    if (!activeText || activeStats.currentIndex >= activeText.length) return;

    if (!started) {
      setStarted(true);
      setPaused(false);
    }

    if (event.key === "Backspace") {
      event.preventDefault();

      if (activeStats.currentIndex === 0) return;

      const previousIndex = activeStats.currentIndex - 1;
      const previousState = charStatesRef.current[previousIndex];
      const nextStats = {
        ...activeStats,
        currentIndex: previousIndex,
        errors:
          previousState === "wrong"
            ? Math.max(0, activeStats.errors - 1)
            : activeStats.errors,
        correctChars:
          previousState === "correct"
            ? Math.max(0, activeStats.correctChars - 1)
            : activeStats.correctChars,
        totalTyped: Math.max(0, activeStats.totalTyped - 1),
      };
      const nextCharStates = [...charStatesRef.current];

      nextCharStates[previousIndex] = "current";

      if (nextCharStates[previousIndex + 1] === "current") {
        nextCharStates[previousIndex + 1] = "pending";
      }

      setStats(nextStats);
      setCharStates(nextCharStates);
      return;
    }

    if (event.key.length !== 1) return;

    const isCorrect = event.key === activeText[activeStats.currentIndex];
    const nextIndex = activeStats.currentIndex + 1;
    const typedStats = {
      ...activeStats,
      currentIndex: nextIndex,
      totalTyped: activeStats.totalTyped + 1,
      correctChars: activeStats.correctChars + (isCorrect ? 1 : 0),
      errors: activeStats.errors + (isCorrect ? 0 : 1),
    };

    if (nextIndex >= activeText.length) {
      setStats({
        ...EMPTY_STATS,
        cumulativeErrors: typedStats.cumulativeErrors + typedStats.errors,
        cumulativeTyped: typedStats.cumulativeTyped + typedStats.totalTyped,
        cumulativeCorrect: typedStats.cumulativeCorrect + typedStats.correctChars,
      });
      loadNextPassage();
      return;
    }

    const nextCharStates = [...charStatesRef.current];
    nextCharStates[activeStats.currentIndex] = isCorrect ? "correct" : "wrong";
    nextCharStates[nextIndex] = "current";

    setStats(typedStats);
    setCharStates(nextCharStates);
  }

  function handleBlur() {
    if (started && !paused && !finishedRef.current) {
      setPaused(true);
    }
  }

  function handleFocus() {
    if (started && paused && !finishedRef.current) {
      setPaused(false);
    }
  }

  const liveStats = calculateDisplayStats(stats, testTime, currentTime);
  const sortedHistory = [...history].sort((a, b) => {
    if (sortMode === "wpm") return b.wpm - a.wpm;
    if (sortMode === "acc") return b.acc - a.acc;
    return b.date - a.date;
  });
  const groupedTests = TEST_OPTIONS.reduce((groups, option) => {
    groups[option.group] = [...(groups[option.group] || []), option];
    return groups;
  }, {});

  return (
    <section id="app" className="typing-test section">
      <div className="container">
        <div className="typing-hero">
          <div>
            <span className="hero-label">Typing Practice</span>
            <h1>Speed test for focused exam practice</h1>
            <p className="hero-sub">
              Choose a passage, start typing, and track speed, accuracy, errors, and certificates
              in one place.
            </p>
          </div>
          <div className="typing-summary">
            <span>{passagePools.easy.length + passagePools.medium.length + passagePools.hard.length}</span>
            <p>Practice passages loaded</p>
          </div>
        </div>

        <div className="typing-route-nav">
          <div className="typing-word-logo">Typing</div>

          <div className="typing-nav-links" aria-label="Typing tools">
            {["Back","CustomTyping", "Games", "Themes"].map((item) => (
              <button
                className="typing-nav-link"
                key={item}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="typing-mode-toggle" aria-label="Typing mode">
            <button
              className={`typing-mode-btn ${typingMode === "exam" ? "active" : ""}`}
              type="button"
              onClick={() => setTypingMode("exam")}
            >
              Exam Mode
            </button>
            <button
              className={`typing-mode-btn ${typingMode === "practice" ? "active" : ""}`}
              type="button"
              onClick={() => setTypingMode("practice")}
            >
              Practice Mode
            </button>
          </div>
        </div>

        <div className="main">
        <aside className="sidebar">
          <div className="sidebar-promo">
            <p>Keep your best typing attempts visible while you practice.</p>
            <div className="btns">
              <button className="btn-login" type="button">
                Review History
              </button>
              <button className="btn-create" type="button">
                Start Fresh
              </button>
            </div>
          </div>

          {Object.entries(groupedTests).map(([groupName, options]) => (
            <div key={groupName}>
              <div className="section-title">{groupName}</div>
              <ul className="test-list">
                {options.map((option) => (
                  <li
                    className={`test-item ${selectedTestId === option.id ? "active" : ""
                      }`}
                    key={option.id}
                    onClick={() => selectTest(option)}
                  >
                    <span className="test-name">{option.label}</span>
                    <button
                      className="btn-start"
                      type="button"
                      onClick={(event) => startTest(event, option)}
                    >
                      Start Test
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div className="db-info">
            <div className="label">PASSAGE DATABASE</div>
            <div id="db-status">Loaded</div>
            <div id="db-count">
              Easy: {passagePools.easy.length} | Medium: {passagePools.medium.length} | Hard:{" "}
              {passagePools.hard.length}
            </div>
          </div>
        </aside>

        <main className="content">
          <input
            ref={inputRef}
            id="hidden-input"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            onBlur={handleBlur}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
          />

          {!finished && (
            <section className="test-panel" id="test-panel">
              <div className="timer-bar">
                <div id="timer-display" className="timer-display">
                  {formatTime(currentTime)}
                </div>

                <div className="diff-inline">
                  {["easy", "medium", "hard"].map((level) => (
                    <button
                      className={`btn-diff-inline ${currentDifficulty === level ? "active" : ""
                        }`}
                      key={level}
                      type="button"
                      onClick={() => changeDifficulty(level)}
                    >
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </button>
                  ))}
                </div>

                <div className="timer-actions">
                  <button className="btn-action" type="button" onClick={() => resetTest()}>
                    Redo
                  </button>
                  <button className="btn-action" type="button" onClick={() => resetTest()}>
                    Next Passage
                  </button>
                </div>
              </div>

              <div className="passage-meta" id="passage-meta">
                Passage #{passage.num} of {passage.total}
              </div>

              <div className="passage-container" id="passage" onClick={focusInput}>
                <div id="chars-container">
                  {passage.text.split("").map((char, index) => (
                    <span className={`char ${charStates[index] || "pending"}`} key={index}>
                      {char}
                    </span>
                  ))}
                </div>

                {(!started || paused) && (
                  <div className="pause-msg" id="pause-msg">
                    {paused ? "Timer paused. Click here to resume." : "Start Typing!"}
                  </div>
                )}
              </div>

              <div className="stats-bar">
                <div className="stat">
                  <div className="stat-val" id="live-wpm">
                    {liveStats.wpm}
                  </div>
                  <div className="stat-lbl">WPM</div>
                </div>
                <div className="stat">
                  <div className="stat-val" id="live-acc">
                    {liveStats.acc}%
                  </div>
                  <div className="stat-lbl">Accuracy</div>
                </div>
                <div className="stat">
                  <div className="stat-val" id="live-chars">
                    {liveStats.chars}
                  </div>
                  <div className="stat-lbl">Characters</div>
                </div>
                <div className="stat">
                  <div className="stat-val" id="live-errors">
                    {liveStats.errors}
                  </div>
                  <div className="stat-lbl">Errors</div>
                </div>
              </div>
            </section>
          )}

          <section className={`results-panel ${finished ? "show" : ""}`} id="results-panel">
            <div className="result-wpm" id="res-wpm">
              {result?.wpm ?? 0}
            </div>
            <div className="result-label">Words Per Minute</div>

            <div className="result-grid">
              <div className="stat">
                <div className="stat-val" id="res-acc">
                  {result?.acc ?? 0}%
                </div>
                <div className="stat-lbl">Accuracy</div>
              </div>
              <div className="stat">
                <div className="stat-val" id="res-chars">
                  {result?.chars ?? 0}
                </div>
                <div className="stat-lbl">Correct Chars</div>
              </div>
              <div className="stat">
                <div className="stat-val" id="res-errors">
                  {result?.errors ?? 0}
                </div>
                <div className="stat-lbl">Errors</div>
              </div>
            </div>

            <button className="btn-retry" type="button" onClick={() => resetTest()}>
              Try Again
            </button>
            <button className="btn-cert" type="button" onClick={() => printCertificate(result)}>
              Print Certificate
            </button>
          </section>

          <section className="history-panel">
            <div className="history-header">
              <span className="history-title">Your Test History (Last 30)</span>
              <div className="sort-links">
                Sort:
                {["date", "wpm", "acc"].map((mode) => (
                  <button
                    className={`sort-link ${sortMode === mode ? "active-sort" : ""}`}
                    key={mode}
                    type="button"
                    onClick={() => setSortMode(mode)}
                  >
                    {mode === "date" ? "Date" : mode === "wpm" ? "Speed" : "Accuracy"}
                  </button>
                ))}
              </div>
            </div>

            <div id="history-list">
              {sortedHistory.map((item) => (
                <div className="history-item" key={`${item.date.toISOString()}-${item.wpm}`}>
                  <div className="date-box">
                    <div className="date-month">{MONTHS[item.date.getMonth()]}</div>
                    <div className="date-day">{item.date.getDate()}</div>
                    <div className="date-year">{item.date.getFullYear()}</div>
                  </div>

                  <div className="hist-stats">
                    <div>
                      <div className="hist-val">{item.wpm} WPM</div>
                      <div className="hist-label">Speed</div>
                    </div>
                    <div>
                      <div className="hist-val">{item.acc}%</div>
                      <div className="hist-label">Accuracy</div>
                    </div>
                    <div>
                      <div className="hist-val">{item.errors}</div>
                      <div className="hist-label">Errors</div>
                    </div>
                    <div>
                      <div className="hist-val">{item.duration}s</div>
                      <div className="hist-label">Duration</div>
                    </div>
                  </div>

                  <button
                    className="btn-cert-sm"
                    type="button"
                    onClick={() => printCertificate(item)}
                  >
                    Certificate
                  </button>
                </div>
              ))}
            </div>

            {!history.length && (
              <div id="no-history">
                Complete a test to see your history here!
              </div>
            )}
          </section>
        </main>
      </div>
      </div>
    </section>
  );
}
