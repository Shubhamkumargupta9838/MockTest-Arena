const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const { parse } = require('csv-parse/sync');
const db      = require('../db/connection');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.originalname.match(/\.(csv|json)$/i)) cb(null, true);
    else cb(new Error('Only .csv or .json files are supported'));
  },
});

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function getOrCreateSubject(conn, name) {
  if (!name) return null;
  const [[row]] = await conn.query(`SELECT id FROM subjects WHERE name = ?`, [name]);
  if (row) return row.id;
  const slug = slugify(name);
  const [res] = await conn.query(
    `INSERT INTO subjects (name, slug) VALUES (?, ?)`, [name, slug]
  );
  return res.insertId;
}

async function getOrCreateTopic(conn, subjectId, name) {
  if (!subjectId || !name) return null;
  const [[row]] = await conn.query(
    `SELECT id FROM topics WHERE subject_id = ? AND name = ?`, [subjectId, name]
  );
  if (row) return row.id;
  const slug = slugify(name);
  const [res] = await conn.query(
    `INSERT INTO topics (subject_id, name, slug) VALUES (?, ?, ?)`, [subjectId, name, slug]
  );
  return res.insertId;
}

async function importQuestion(conn, item, selectedSubjectId, selectedTopicId, errors) {
  const subjectId = selectedSubjectId || await getOrCreateSubject(conn, item.subject);
  if (!subjectId) { errors.push('Missing subject'); return 0; }

  const topicId = selectedTopicId || await getOrCreateTopic(conn, subjectId, item.topic);
  const text = (item.text || '').trim();
  if (!text) { errors.push('Question text is required'); return 0; }

  const [[existing]] = await conn.query(
    `SELECT id FROM questions WHERE subject_id = ? AND text = ?`, [subjectId, text]
  );
  if (existing) return 0;

  const [res] = await conn.query(
    `INSERT INTO questions (subject_id, topic_id, text, difficulty, correct_option, explanation)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [subjectId, topicId, text,
     item.difficulty || 'easy',
     (item.correct_option || 'A').toUpperCase(),
     item.explanation || '']
  );
  const questionId = res.insertId;

  // Insert choices
  if (Array.isArray(item.choices)) {
    for (const ch of item.choices) {
      await conn.query(
        `INSERT IGNORE INTO choices (question_id, label, text) VALUES (?, ?, ?)`,
        [questionId, ch.label || ch.l, ch.text || ch.t || '']
      );
    }
  } else {
    // CSV format: option_a, option_b, option_c, option_d
    for (const label of ['A', 'B', 'C', 'D']) {
      const text = item[`option_${label.toLowerCase()}`] || '';
      await conn.query(
        `INSERT IGNORE INTO choices (question_id, label, text) VALUES (?, ?, ?)`,
        [questionId, label, text]
      );
    }
  }
  return 1;
}

// GET /api/upload/meta — lists exams, subjects, topics for the upload form
router.get('/meta', async (req, res) => {
  try {
    const [exams]    = await db.query(`SELECT id, name FROM exams WHERE is_active = 1`);
    const [subjects] = await db.query(`SELECT id, name FROM subjects WHERE is_active = 1`);
    const [topics]   = await db.query(
      `SELECT t.id, t.name, t.subject_id, s.name AS subject_name
       FROM topics t JOIN subjects s ON s.id = t.subject_id ORDER BY s.name, t.name`
    );
    res.json({ exams, subjects, topics });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load metadata' });
  }
});

// POST /api/upload/questions
router.post('/questions', upload.single('file'), async (req, res) => {
  const conn = await db.getConnection();
  const errors = [];
  let created = 0;

  try {
    const { exam_id, subject_id, topic_id, practice_title } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });

    const selectedSubjectId = subject_id ? parseInt(subject_id) : null;
    const selectedTopicId   = topic_id   ? parseInt(topic_id)   : null;

    const filename = file.originalname.toLowerCase();
    let rows = [];

    if (filename.endsWith('.json')) {
      const data = JSON.parse(file.buffer.toString('utf-8'));
      if (!Array.isArray(data)) throw new Error('JSON must be an array of questions');
      rows = data;
    } else if (filename.endsWith('.csv')) {
      rows = parse(file.buffer.toString('utf-8'), {
        columns: true, skip_empty_lines: true, trim: true,
      });
    } else {
      throw new Error('Only .csv or .json files are supported');
    }

    for (const row of rows) {
      const count = await importQuestion(conn, row, selectedSubjectId, selectedTopicId, errors);
      created += count;
    }

    // Optionally create practice test
    if (practice_title && exam_id && selectedSubjectId && selectedTopicId && errors.length === 0) {
      await createPracticeTest(conn, exam_id, selectedSubjectId, selectedTopicId, practice_title, created, errors);
    }

    res.json({ status: 'ok', created, errors });
  } catch (err) {
    console.error('POST /upload/questions:', err);
    res.status(400).json({ error: err.message, created, errors });
  } finally {
    conn.release();
  }
});

async function createPracticeTest(conn, examId, subjectId, topicId, title, questionCount, errors) {
  const [[pattern]] = await conn.query(
    `SELECT id FROM exam_patterns WHERE exam_id = ? LIMIT 1`, [examId]
  );
  if (!pattern) { errors.push('Exam pattern not found'); return; }

  const [[section]] = await conn.query(
    `SELECT id FROM exam_sections WHERE pattern_id = ? AND subject_id = ? LIMIT 1`,
    [pattern.id, subjectId]
  );
  if (!section) { errors.push('Section not found for selected subject'); return; }

  const slug = slugify(title) + '-' + Date.now();
  const [[existingTest]] = await conn.query(`SELECT id FROM tests WHERE slug = ?`, [slug]);
  let testId;

  if (existingTest) {
    testId = existingTest.id;
  } else {
    const [res] = await conn.query(
      `INSERT INTO tests (exam_id, pattern_id, title, slug, mode, description, is_active)
       VALUES (?, ?, ?, ?, 'practice', ?, 1)`,
      [examId, pattern.id, title, slug, `Practice set for topic`]
    );
    testId = res.insertId;
  }

  await conn.query(
    `INSERT IGNORE INTO test_section_rules (test_id, section_id, topic_id, question_count)
     VALUES (?, ?, ?, ?)`,
    [testId, section.id, topicId, Math.max(questionCount, 1)]
  );
}

module.exports = router;
