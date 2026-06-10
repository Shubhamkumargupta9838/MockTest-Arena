const express = require('express');
const router = express.Router();
const db = require('../db/connection');

function slugify(str) {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

router.get('/meta', async (req, res) => {
  try {
    const [exams] = await db.query(
      `SELECT e.id, e.name, e.slug, ec.name AS category_name
       FROM exams e
       JOIN exam_categories ec ON ec.id = e.category_id
       WHERE e.is_active = 1
       ORDER BY ec.name, e.name`
    );

    const [sections] = await db.query(
      `SELECT es.id, es.pattern_id, es.name, es.question_count, es.marks_per_question,
              es.time_seconds, es.order, es.subject_id, s.name AS subject_name,
              ep.exam_id
       FROM exam_sections es
       JOIN subjects s ON s.id = es.subject_id
       JOIN exam_patterns ep ON ep.id = es.pattern_id
       WHERE es.question_count > 0
       ORDER BY ep.exam_id, es.order`
    );

    const [topics] = await db.query(
      `SELECT t.id, t.name, t.subject_id FROM topics t ORDER BY t.subject_id, t.name`
    );

    res.json({ exams, sections, topics });
  } catch (err) {
    console.error('GET /admin/meta:', err);
    res.status(500).json({ error: 'Failed to load metadata' });
  }
});

router.post('/tests', async (req, res) => {
  const conn = await db.getConnection();
  try {
    const {
      exam_id,
      title,
      slug,
      mode = 'mock',
      description = '',
      shuffle_questions = true,
      rules = [],
    } = req.body;

    if (!exam_id || !title) {
      return res.status(400).json({ error: 'Exam and title are required' });
    }

    const examId = parseInt(exam_id, 10);
    if (Number.isNaN(examId)) {
      return res.status(400).json({ error: 'Invalid exam selected' });
    }

    const [[pattern]] = await conn.query(
      `SELECT id FROM exam_patterns WHERE exam_id = ? LIMIT 1`,
      [examId]
    );
    if (!pattern) {
      return res.status(400).json({ error: 'Exam pattern not found for selected exam' });
    }

    let testSlug = slug ? slugify(slug) : slugify(title);
    if (!testSlug) {
      return res.status(400).json({ error: 'Test title must contain valid characters' });
    }

    const [[existingTest]] = await conn.query(
      `SELECT id FROM tests WHERE slug = ?`,
      [testSlug]
    );
    if (existingTest) {
      return res.status(400).json({ error: 'A test with this slug already exists. Please change the title or slug.' });
    }

    const [inserted] = await conn.query(
      `INSERT INTO tests (exam_id, pattern_id, title, slug, mode, description, is_active, shuffle_questions)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [examId, pattern.id, title, testSlug, mode === 'practice' ? 'practice' : 'mock', description, shuffle_questions ? 1 : 0]
    );

    const testId = inserted.insertId;
    let ruleCount = 0;

    const normalizedRules = Array.isArray(rules) ? rules : [];

    for (const rule of normalizedRules) {
      const sectionId = parseInt(rule.section_id, 10);
      const questionCount = parseInt(rule.question_count, 10);
      const topicId = rule.topic_id ? parseInt(rule.topic_id, 10) : null;
      const difficulty = rule.difficulty || null;

      if (Number.isNaN(sectionId) || Number.isNaN(questionCount) || questionCount <= 0) {
        continue;
      }

      await conn.query(
        `INSERT INTO test_section_rules (test_id, section_id, topic_id, difficulty, question_count)
         VALUES (?, ?, ?, ?, ?)`,
        [testId, sectionId, topicId || null, difficulty, questionCount]
      );
      ruleCount += 1;
    }

    if (ruleCount === 0) {
      const [defaultSections] = await conn.query(
        `SELECT es.id, es.question_count
         FROM exam_sections es
         JOIN exam_patterns ep ON ep.id = es.pattern_id
         WHERE ep.exam_id = ?`,
        [examId]
      );
      for (const sec of defaultSections) {
        await conn.query(
          `INSERT INTO test_section_rules (test_id, section_id, question_count)
           VALUES (?, ?, ?)`,
          [testId, sec.id, sec.question_count]
        );
      }
    }

    res.json({ status: 'ok', testId, slug: testSlug });
  } catch (err) {
    console.error('POST /admin/tests:', err);
    res.status(500).json({ error: 'Failed to create test' });
  } finally {
    conn.release();
  }
});

module.exports = router;
