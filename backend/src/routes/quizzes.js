const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// ── helpers ─────────────────────────────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function buildAttemptQuestions(conn, testId) {
  // Get test + pattern
  const [[test]] = await conn.query(
    `SELECT t.id, t.mode, t.shuffle_questions, t.pattern_id,
            ep.total_time_seconds, ep.negative_marking
     FROM tests t
     JOIN exam_patterns ep ON ep.id = t.pattern_id
     WHERE t.id = ?`,
    [testId]
  );

  // Get rules
  const [rules] = await conn.query(
    `SELECT tsr.*, es.subject_id
     FROM test_section_rules tsr
     JOIN exam_sections es ON es.id = tsr.section_id
     WHERE tsr.test_id = ?`,
    [testId]
  );

  const selectedIds = new Set();
  const picked = [];
  let targetCount = 0;

  if (rules.length > 0) {
    for (const rule of rules) {
      targetCount += Number(rule.question_count) || 0;
      let query = `SELECT id FROM questions WHERE subject_id = ? AND is_active = 1`;
      const params = [rule.subject_id];
      if (rule.topic_id)  { query += ` AND topic_id = ?`;   params.push(rule.topic_id); }
      if (rule.difficulty){ query += ` AND difficulty = ?`;  params.push(rule.difficulty); }
      if (selectedIds.size > 0) {
        query += ` AND id NOT IN (${[...selectedIds].join(',')})`;
      }

      const [pool] = await conn.query(query, params);
      const available = pool.filter(r => !selectedIds.has(r.id));
      const count = Math.min(rule.question_count, available.length);
      shuffle(available).slice(0, count).forEach(r => {
        selectedIds.add(r.id);
        picked.push(r.id);
      });
    }
  }

  // Fallback: use pattern sections if no rules matched
  if (picked.length === 0) {
    const [sections] = await conn.query(
      `SELECT es.subject_id, es.question_count
       FROM exam_sections es WHERE es.pattern_id = ?`,
      [test.pattern_id]
    );
    for (const sec of sections) {
      targetCount += Number(sec.question_count) || 0;
      const [pool] = await conn.query(
        `SELECT id FROM questions WHERE subject_id = ? AND is_active = 1`,
        [sec.subject_id]
      );
      const available = pool.filter(r => !selectedIds.has(r.id));
      const count = Math.min(sec.question_count, available.length);
      shuffle(available).slice(0, count).forEach(r => {
        selectedIds.add(r.id);
        picked.push(r.id);
      });
    }
  }

  // If a test's exact section pools are short, top up from remaining active questions
  // so the attempt still reaches the configured full length.
  if (targetCount > 0 && picked.length < targetCount) {
    const [pool] = await conn.query(
      `SELECT id FROM questions WHERE is_active = 1`
    );
    const available = pool.filter(r => !selectedIds.has(r.id));
    shuffle(available).slice(0, targetCount - picked.length).forEach(r => {
      selectedIds.add(r.id);
      picked.push(r.id);
    });
  }

  if (test.shuffle_questions) shuffle(picked);
  return { questionIds: picked, test };
}

// POST /api/quiz/start/:testSlug
router.post('/start/:testSlug', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const [[test]] = await conn.query(
      `SELECT t.id, t.title, t.mode, t.shuffle_questions,
              t.pattern_id, ep.total_time_seconds
       FROM tests t
       JOIN exam_patterns ep ON ep.id = t.pattern_id
       WHERE t.slug = ? AND t.is_active = 1`,
      [req.params.testSlug]
    );
    if (!test) return res.status(404).json({ error: 'Test not found' });

    // Check for existing in-progress attempt (session)
    const sessionKey = `attempt_${test.id}`;
    const existingId = req.session[sessionKey];
    if (existingId) {
      const [[existing]] = await conn.query(
        `SELECT id FROM attempts WHERE id = ? AND test_id = ? AND is_submitted = 0`,
        [existingId, test.id]
      );
      if (existing) {
        return res.json({ attemptId: existing.id, resumed: true });
      }
    }

    const totalTime = test.mode === 'mock' ? test.total_time_seconds : 0;

    // Create attempt
    const [result] = await conn.query(
      `INSERT INTO attempts (test_id, total_time_seconds, time_left_seconds, last_seen_at)
       VALUES (?, ?, ?, NOW())`,
      [test.id, totalTime, totalTime]
    );
    const attemptId = result.insertId;

    // Create attempt sections
    const [sections] = await conn.query(
      `SELECT es.id, es.subject_id FROM exam_sections es WHERE es.pattern_id = ?`,
      [test.pattern_id]
    );
    for (const sec of sections) {
      await conn.query(
        `INSERT INTO attempt_sections (attempt_id, section_id, subject_id) VALUES (?, ?, ?)`,
        [attemptId, sec.id, sec.subject_id]
      );
    }

    // Build and insert attempt questions
    const { questionIds } = await buildAttemptQuestions(conn, test.id);
    if (questionIds.length === 0) {
      await conn.query(`DELETE FROM attempts WHERE id = ?`, [attemptId]);
      return res.status(422).json({ error: 'No questions available for this test' });
    }

    for (let i = 0; i < questionIds.length; i++) {
      await conn.query(
        `INSERT INTO attempt_questions (attempt_id, question_id, \`order\`) VALUES (?, ?, ?)`,
        [attemptId, questionIds[i], i + 1]
      );
    }

    req.session[sessionKey] = attemptId;
    res.json({ attemptId, resumed: false });
  } catch (err) {
    console.error('POST /quiz/start:', err);
    res.status(500).json({ error: 'Failed to start test' });
  } finally {
    conn.release();
  }
});

// GET /api/quiz/attempt/:attemptId
router.get('/attempt/:attemptId', async (req, res) => {
  try {
    const [[attempt]] = await db.query(
      `SELECT a.*, t.title, t.mode, t.shuffle_questions,
              ep.total_time_seconds, ep.negative_marking
       FROM attempts a
       JOIN tests t ON t.id = a.test_id
       JOIN exam_patterns ep ON ep.id = t.pattern_id
       WHERE a.id = ?`,
      [req.params.attemptId]
    );
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    if (attempt.is_submitted) {
      return res.json({ attempt, submitted: true });
    }

    // Update refresh count + last_seen
    await db.query(
      `UPDATE attempts SET refresh_count = refresh_count + 1, last_seen_at = NOW() WHERE id = ?`,
      [attempt.id]
    );
    if (attempt.refresh_count > 0) {
      await db.query(
        `INSERT INTO integrity_events (attempt_id, event_type, details) VALUES (?, 'refresh', ?)`,
        [attempt.id, `Refresh count: ${attempt.refresh_count + 1}`]
      );
    }

    // Questions
    const [questions] = await db.query(
      `SELECT aq.id AS aq_id, aq.order, aq.selected_option, aq.is_marked,
              q.id AS question_id, q.text, q.difficulty,
              s.name AS subject_name,
              -- Build JSON array of choices in a MySQL-compatible way
              CONCAT('[', IFNULL(GROUP_CONCAT(CONCAT('{"label":"', c.label, '","text":"', REPLACE(REPLACE(c.text, '\\\\', '\\\\\\\\'), '"', '\\\"'), '"}') ORDER BY c.label SEPARATOR ','), ''), ']') AS choices
       FROM attempt_questions aq
       JOIN questions q   ON q.id = aq.question_id
       JOIN subjects s    ON s.id = q.subject_id
       JOIN choices c     ON c.question_id = q.id
       WHERE aq.attempt_id = ?
       GROUP BY aq.id, aq.order, aq.selected_option, aq.is_marked,
                q.id, q.text, q.difficulty, s.name
       ORDER BY aq.order`,
      [attempt.id]
    );

    // Sections
    const [sections] = await db.query(
      `SELECT ases.id, es.name, es.time_seconds, s.name AS subject_name, ases.time_spent_seconds, es.id AS section_id
       FROM attempt_sections ases
       JOIN exam_sections es ON es.id = ases.section_id
       JOIN subjects s ON s.id = ases.subject_id
       WHERE ases.attempt_id = ?`,
      [attempt.id]
    );

    const parsedQuestions = questions.map(q => ({
      id: q.question_id,
      order: q.order,
      text: q.text,
      subject: q.subject_name,
      selected: q.selected_option || '',
      marked: !!q.is_marked,
      choices: typeof q.choices === 'string' ? JSON.parse(q.choices) : q.choices,
    }));

    res.json({
      attemptId: attempt.id,
      totalTime: attempt.total_time_seconds,
      timeLeft: attempt.time_left_seconds,
      isMock: attempt.mode === 'mock',
      testTitle: attempt.title,
      questions: parsedQuestions,
      sections: sections.map(s => ({
        id: s.section_id,
        name: s.name,
        subject: s.subject_name,
        timeSeconds: s.time_seconds,
        timeSpent: s.time_spent_seconds,
      })),
    });
  } catch (err) {
    console.error('GET /quiz/attempt:', err);
    res.status(500).json({ error: 'Failed to load attempt' });
  }
});

// POST /api/quiz/attempt/:attemptId/save
router.post('/attempt/:attemptId/save', async (req, res) => {
  try {
    const { question_id, selected_option, time_left_seconds, section_id, section_time_spent } = req.body;

    const [[attempt]] = await db.query(
      `SELECT id FROM attempts WHERE id = ? AND is_submitted = 0`,
      [req.params.attemptId]
    );
    if (!attempt) return res.status(404).json({ error: 'Attempt not found or already submitted' });

    const selected = (selected_option || '').toUpperCase().trim();
    await db.query(
      `UPDATE attempt_questions SET selected_option = ?, answered_at = NOW()
       WHERE attempt_id = ? AND question_id = ?`,
      [selected || null, attempt.id, question_id]
    );

    if (time_left_seconds !== undefined && !isNaN(parseInt(time_left_seconds))) {
      await db.query(
        `UPDATE attempts SET time_left_seconds = ?, last_seen_at = NOW() WHERE id = ?`,
        [parseInt(time_left_seconds), attempt.id]
      );
    }

    if (section_id && section_time_spent !== undefined && !isNaN(parseInt(section_time_spent))) {
      await db.query(
        `UPDATE attempt_sections SET time_spent_seconds = ? WHERE attempt_id = ? AND section_id = ?`,
        [parseInt(section_time_spent), attempt.id, section_id]
      );
    }

    res.json({ status: 'saved' });
  } catch (err) {
    console.error('POST /quiz/save:', err);
    res.status(500).json({ error: 'Failed to save answer' });
  }
});

// POST /api/quiz/attempt/:attemptId/mark
router.post('/attempt/:attemptId/mark', async (req, res) => {
  try {
    const { question_id, is_marked } = req.body;
    const [[attempt]] = await db.query(
      `SELECT id FROM attempts WHERE id = ? AND is_submitted = 0`,
      [req.params.attemptId]
    );
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    await db.query(
      `UPDATE attempt_questions SET is_marked = ? WHERE attempt_id = ? AND question_id = ?`,
      [is_marked === 'true' || is_marked === true ? 1 : 0, attempt.id, question_id]
    );
    res.json({ status: 'marked' });
  } catch (err) {
    console.error('POST /quiz/mark:', err);
    res.status(500).json({ error: 'Failed to mark question' });
  }
});

// POST /api/quiz/attempt/:attemptId/submit
router.post('/attempt/:attemptId/submit', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const [[attempt]] = await conn.query(
      `SELECT a.id, a.test_id, a.started_at, a.ended_at, a.is_submitted,
              a.total_time_seconds, a.time_left_seconds, a.last_seen_at, a.refresh_count,
              t.pattern_id
       FROM attempts a JOIN tests t ON t.id = a.test_id
       WHERE a.id = ? AND a.is_submitted = 0`,
      [req.params.attemptId]
    );
    if (!attempt) return res.status(404).json({ error: 'Attempt not found or already submitted' });

    await conn.query(
      `UPDATE attempts SET is_submitted = 1, ended_at = NOW() WHERE id = ?`,
      [attempt.id]
    );

    const result = await calculateAndSaveResult(conn, attempt);
    res.json({ status: 'submitted', resultId: result.id });
  } catch (err) {
    console.error('POST /quiz/submit:', err);
    res.status(500).json({ error: 'Failed to submit test' });
  } finally {
    conn.release();
  }
});

// POST /api/quiz/attempt/:attemptId/integrity
router.post('/attempt/:attemptId/integrity', async (req, res) => {
  try {
    const { event_type, details } = req.body;
    await db.query(
      `INSERT INTO integrity_events (attempt_id, event_type, details) VALUES (?, ?, ?)`,
      [req.params.attemptId, event_type || 'visibility', details || '']
    );
    res.json({ status: 'logged' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to log event' });
  }
});

// ── Result calculation (called on submit) ────────────────
async function calculateAndSaveResult(conn, attempt) {
  const [[existingResult]] = await conn.query(
    `SELECT id FROM results WHERE attempt_id = ?`, [attempt.id]
  );
  if (existingResult) return existingResult;

  const [[pattern]] = await conn.query(
    `SELECT ep.negative_marking FROM exam_patterns ep
     JOIN tests t ON t.pattern_id = ep.id
     WHERE t.id = ?`,
    [attempt.test_id]
  );
  const negative = parseFloat(pattern?.negative_marking || 0.25);

  const [questions] = await conn.query(
    `SELECT aq.selected_option, q.correct_option, q.subject_id,
            es.id AS section_id, es.name AS section_name, es.marks_per_question
     FROM attempt_questions aq
     JOIN questions q ON q.id = aq.question_id
     LEFT JOIN exam_sections es ON es.subject_id = q.subject_id AND es.pattern_id = ?
     WHERE aq.attempt_id = ?`,
    [attempt.pattern_id, attempt.id]
  );

  let correct = 0, incorrect = 0, unattempted = 0, score = 0;
  const sectionStats = {};

  for (const aq of questions) {
    const selected = (aq.selected_option || '').toUpperCase().trim();
    const correct_ans = (aq.correct_option || '').toUpperCase().trim();
    const secKey = aq.section_id ? String(aq.section_id) : 'general';
    const marksPerQ = parseFloat(aq.marks_per_question || 1);

    if (!sectionStats[secKey]) {
      sectionStats[secKey] = {
        section_name: aq.section_name || 'General',
        correct: 0, incorrect: 0, unattempted: 0,
        marks_per_question: marksPerQ,
      };
    }

    if (!selected) {
      unattempted++;
      sectionStats[secKey].unattempted++;
    } else if (selected === correct_ans) {
      correct++;
      sectionStats[secKey].correct++;
      score += marksPerQ;
    } else {
      incorrect++;
      sectionStats[secKey].incorrect++;
      score -= negative * marksPerQ;
    }
  }

  const totalAnswered = correct + incorrect;
  const accuracy = totalAnswered > 0 ? (correct / totalAnswered) * 100 : 0;

  const [res] = await conn.query(
    `INSERT INTO results (attempt_id, score, accuracy, correct_count, incorrect_count, unattempted_count, section_stats)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [attempt.id, score.toFixed(2), accuracy.toFixed(2), correct, incorrect, unattempted, JSON.stringify(sectionStats)]
  );

  return { id: res.insertId };
}

module.exports = router;
