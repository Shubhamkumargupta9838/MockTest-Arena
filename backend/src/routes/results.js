const express = require('express');
const router  = express.Router();
const db      = require('../db/connection');

// GET /api/results/:attemptId
router.get('/:attemptId', async (req, res) => {
  try {
    const [[result]] = await db.query(
      `SELECT r.*, a.started_at, a.ended_at, a.refresh_count,
              t.title AS test_title, t.mode,
              e.name  AS exam_name
       FROM results r
       JOIN attempts a ON a.id = r.attempt_id
       JOIN tests t    ON t.id = a.test_id
       JOIN exams e    ON e.id = t.exam_id
       WHERE r.attempt_id = ?`,
      [req.params.attemptId]
    );

    if (!result) {
      // Check if attempt exists but has no result yet (not submitted)
      const [[attempt]] = await db.query(
        `SELECT id, is_submitted FROM attempts WHERE id = ?`, [req.params.attemptId]
      );
      if (!attempt) return res.status(404).json({ error: 'Result not found' });
      if (!attempt.is_submitted) return res.status(400).json({ error: 'Test not yet submitted' });
      return res.status(404).json({ error: 'Result not computed yet' });
    }

    // Parse section_stats JSON field
    const sectionStats = typeof result.section_stats === 'string'
      ? JSON.parse(result.section_stats)
      : (result.section_stats || {});

    res.json({
      id: result.id,
      attemptId: result.attempt_id,
      score: parseFloat(result.score),
      accuracy: parseFloat(result.accuracy),
      correctCount: result.correct_count,
      incorrectCount: result.incorrect_count,
      unattemptedCount: result.unattempted_count,
      sectionStats,
      testTitle: result.test_title,
      examName: result.exam_name,
      mode: result.mode,
      startedAt: result.started_at,
      endedAt: result.ended_at,
      refreshCount: result.refresh_count,
    });
  } catch (err) {
    console.error('GET /results:', err);
    res.status(500).json({ error: 'Failed to load result' });
  }
});

module.exports = router;
