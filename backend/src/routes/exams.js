const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/exams/home
// Returns categories + featured mock tests for home page
router.get('/home', async (req, res) => {
  try {
    const [categories] = await db.query(
      `SELECT ec.id, ec.name, ec.slug, ec.description,
              JSON_ARRAYAGG(
                JSON_OBJECT('id', e.id, 'name', e.name, 'slug', e.slug)
              ) AS exams
       FROM exam_categories ec
       LEFT JOIN exams e ON e.category_id = ec.id AND e.is_active = 1
       WHERE ec.is_active = 1
       GROUP BY ec.id`
    );

    const [featuredTests] = await db.query(
      `SELECT t.id, t.title, t.slug, t.mode, e.name AS exam_name
       FROM tests t
       JOIN exams e ON e.id = t.exam_id
       WHERE t.is_active = 1 AND t.mode = 'mock'
       ORDER BY t.id DESC
       LIMIT 6`
    );

    // Parse JSON_ARRAYAGG strings from MySQL
    const parsedCategories = categories.map(cat => ({
      ...cat,
      exams: (() => { let e = typeof cat.exams === "string" ? (function(s){ try{return JSON.parse(s)}catch{return []} })(cat.exams) : (cat.exams || []); return Array.isArray(e) ? e : []; })(),
    })).map(cat => ({
      ...cat,
      exams: cat.exams.filter(e => e && e.id !== null),
    }));

    res.json({ categories: parsedCategories, featuredTests });
  } catch (err) {
    console.error('GET /exams/home:', err);
    res.status(500).json({ error: 'Failed to load home data' });
  }
});

// GET /api/exams/category/:slug
router.get('/category/:slug', async (req, res) => {
  try {
    const [[category]] = await db.query(
      `SELECT id, name, slug, description FROM exam_categories
       WHERE slug = ? AND is_active = 1`,
      [req.params.slug]
    );
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const [exams] = await db.query(
      `SELECT id, name, slug, description FROM exams
       WHERE category_id = ? AND is_active = 1`,
      [category.id]
    );

    res.json({ category, exams });
  } catch (err) {
    console.error('GET /exams/category:', err);
    res.status(500).json({ error: 'Failed to load category' });
  }
});

// GET /api/exams/:categorySlug/:examSlug
router.get('/:categorySlug/:examSlug', async (req, res) => {
  try {
    const [[exam]] = await db.query(
      `SELECT e.id, e.name, e.slug, e.description, ec.name AS category_name, ec.slug AS category_slug
       FROM exams e
       JOIN exam_categories ec ON ec.id = e.category_id
       WHERE e.slug = ? AND ec.slug = ? AND e.is_active = 1`,
      [req.params.examSlug, req.params.categorySlug]
    );
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    const [practicetests] = await db.query(
      `SELECT id, title, slug, mode, description FROM tests
       WHERE exam_id = ? AND is_active = 1 AND mode = 'practice' LIMIT 6`,
      [exam.id]
    );

    const [mocktests] = await db.query(
      `SELECT id, title, slug, mode, description FROM tests
       WHERE exam_id = ? AND is_active = 1 AND mode = 'mock' LIMIT 6`,
      [exam.id]
    );

    res.json({ exam, practicetests, mocktests });
  } catch (err) {
    console.error('GET /exams/exam:', err);
    res.status(500).json({ error: 'Failed to load exam' });
  }
});

// GET /api/exams/:categorySlug/:examSlug/tests?mode=mock|practice
router.get('/:categorySlug/:examSlug/tests', async (req, res) => {
  try {
    const { mode } = req.query;
    const [[exam]] = await db.query(
      `SELECT e.id, e.name FROM exams e
       JOIN exam_categories ec ON ec.id = e.category_id
       WHERE e.slug = ? AND ec.slug = ? AND e.is_active = 1`,
      [req.params.examSlug, req.params.categorySlug]
    );
    if (!exam) return res.status(404).json({ error: 'Exam not found' });

    let query = `SELECT id, title, slug, mode, description FROM tests WHERE exam_id = ? AND is_active = 1`;
    const params = [exam.id];
    if (mode) { query += ` AND mode = ?`; params.push(mode); }

    const [tests] = await db.query(query, params);
    res.json({ exam, tests });
  } catch (err) {
    console.error('GET /exams/tests:', err);
    res.status(500).json({ error: 'Failed to load tests' });
  }
});

module.exports = router;
