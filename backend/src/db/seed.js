/**
 * seed.js — Seeds MockTest Arena with sample data
 * Run: node src/db/seed.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

function slugify(str) {
  return str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mocktest_db',
    multipleStatements: true,
  });

  console.log('🌱 Seeding database...\n');

  // ── Categories ──────────────────────────────────────────
  const categories = [
    { name: 'SSC', description: 'Staff Selection Commission exams including CGL, CHSL, MTS' },
    { name: 'Railway', description: 'Indian Railways recruitment exams: RRB NTPC, Group D, ALP' },
    { name: 'Banking', description: 'IBPS PO, SBI Clerk, RBI Grade B and other banking exams' },
  ];

  const catIds = {};
  for (const cat of categories) {
    const slug = slugify(cat.name);
    await conn.query(
      `INSERT IGNORE INTO exam_categories (name, slug, description) VALUES (?, ?, ?)`,
      [cat.name, slug, cat.description]
    );
    const [[row]] = await conn.query(`SELECT id FROM exam_categories WHERE slug = ?`, [slug]);
    catIds[cat.name] = row.id;
    console.log(`  ✔ Category: ${cat.name}`);
  }

  // ── Exams ───────────────────────────────────────────────
  const exams = [
    { category: 'SSC', name: 'SSC CGL', desc: 'Combined Graduate Level Examination' },
    { category: 'SSC', name: 'SSC CHSL', desc: 'Combined Higher Secondary Level' },
    { category: 'Railway', name: 'RRB NTPC', desc: 'Non-Technical Popular Categories' },
    { category: 'Railway', name: 'RRB Group D', desc: 'Level 1 Posts Recruitment' },
    { category: 'Banking', name: 'IBPS PO', desc: 'Institute of Banking Personnel Selection – PO' },
    { category: 'Banking', name: 'SBI Clerk', desc: 'State Bank of India Junior Associates' },
  ];

  const examIds = {};
  for (const ex of exams) {
    const slug = slugify(ex.name);
    await conn.query(
      `INSERT IGNORE INTO exams (category_id, name, slug, description) VALUES (?, ?, ?, ?)`,
      [catIds[ex.category], ex.name, slug, ex.desc]
    );
    const [[row]] = await conn.query(`SELECT id FROM exams WHERE slug = ?`, [slug]);
    examIds[ex.name] = row.id;
    console.log(`  ✔ Exam: ${ex.name}`);
  }

  // ── Subjects ────────────────────────────────────────────
  const subjects = [
    { name: 'General Intelligence', banking: false },
    { name: 'General Awareness', banking: false },
    { name: 'Quantitative Aptitude', banking: true },
    { name: 'English Language', banking: true },
    { name: 'Reasoning Ability', banking: true },
  ];

  const subjectIds = {};
  for (const sub of subjects) {
    const slug = slugify(sub.name);
    await conn.query(
      `INSERT IGNORE INTO subjects (name, slug, is_banking_only) VALUES (?, ?, ?)`,
      [sub.name, slug, sub.banking ? 1 : 0]
    );
    const [[row]] = await conn.query(`SELECT id FROM subjects WHERE slug = ?`, [slug]);
    subjectIds[sub.name] = row.id;
    console.log(`  ✔ Subject: ${sub.name}`);
  }

  // ── Topics ──────────────────────────────────────────────
  const topicsMap = {
    'General Intelligence': ['Analogy', 'Series', 'Coding-Decoding', 'Blood Relations'],
    'Quantitative Aptitude': ['Number System', 'Percentage', 'Simple Interest', 'Algebra'],
    'English Language': ['Reading Comprehension', 'Fill in the Blanks', 'Error Spotting'],
    'General Awareness': ['History', 'Geography', 'Polity', 'Current Affairs'],
    'Reasoning Ability': ['Puzzles', 'Seating Arrangement', 'Syllogism'],
  };

  const topicIds = {};
  for (const [subName, topicList] of Object.entries(topicsMap)) {
    topicIds[subName] = {};
    for (const topicName of topicList) {
      const slug = slugify(topicName);
      await conn.query(
        `INSERT IGNORE INTO topics (subject_id, name, slug) VALUES (?, ?, ?)`,
        [subjectIds[subName], topicName, slug]
      );
      const [[row]] = await conn.query(
        `SELECT id FROM topics WHERE subject_id = ? AND name = ?`,
        [subjectIds[subName], topicName]
      );
      topicIds[subName][topicName] = row.id;
    }
  }
  console.log('  ✔ Topics seeded');

  // ── Patterns ────────────────────────────────────────────
  const patternDefs = {
    'SSC CGL':    { marks: 200, time: 3600, neg: 0.50 },
    'SSC CHSL':   { marks: 200, time: 3600, neg: 0.50 },
    'RRB NTPC':   { marks: 100, time: 5400, neg: 0.33 },
    'RRB Group D':{ marks: 100, time: 5400, neg: 0.33 },
    'IBPS PO':    { marks: 100, time: 3600, neg: 0.25 },
    'SBI Clerk':  { marks: 100, time: 3600, neg: 0.25 },
  };

  const patternIds = {};
  for (const [examName, pat] of Object.entries(patternDefs)) {
    const [[existing]] = await conn.query(
      `SELECT id FROM exam_patterns WHERE exam_id = ? LIMIT 1`,
      [examIds[examName]]
    );
    if (existing) {
      patternIds[examName] = existing.id;
    } else {
      const [res] = await conn.query(
        `INSERT INTO exam_patterns (exam_id, name, total_marks, total_time_seconds, negative_marking)
         VALUES (?, 'Official Pattern', ?, ?, ?)`,
        [examIds[examName], pat.marks, pat.time, pat.neg]
      );
      patternIds[examName] = res.insertId;
    }
    console.log(`  ✔ Pattern: ${examName}`);
  }

  // ── Sections ────────────────────────────────────────────
  const sectionDefs = {
    'SSC CGL':    [
      { subj: 'General Intelligence', name: 'Reasoning',       q: 25, marks: 2, time: 900,  ord: 1 },
      { subj: 'General Awareness',    name: 'GA',               q: 25, marks: 2, time: 900,  ord: 2 },
      { subj: 'Quantitative Aptitude',name: 'Quant',            q: 25, marks: 2, time: 900,  ord: 3 },
      { subj: 'English Language',     name: 'English',          q: 25, marks: 2, time: 900,  ord: 4 },
    ],
    'IBPS PO':    [
      { subj: 'Reasoning Ability',    name: 'Reasoning',        q: 35, marks: 1, time: 1200, ord: 1 },
      { subj: 'English Language',     name: 'English',          q: 30, marks: 1, time: 1200, ord: 2 },
      { subj: 'Quantitative Aptitude',name: 'Quant',            q: 35, marks: 1, time: 1200, ord: 3 },
    ],
    'RRB NTPC':   [
      { subj: 'General Intelligence', name: 'Reasoning',        q: 30, marks: 1, time: 1800, ord: 1 },
      { subj: 'General Awareness',    name: 'GA',               q: 40, marks: 1, time: 1800, ord: 2 },
      { subj: 'Quantitative Aptitude',name: 'Maths',            q: 30, marks: 1, time: 1800, ord: 3 },
    ],
  };

  const sectionIds = {};
  for (const [examName, secList] of Object.entries(sectionDefs)) {
    sectionIds[examName] = {};
    for (const sec of secList) {
      const [[existing]] = await conn.query(
        `SELECT id FROM exam_sections WHERE pattern_id = ? AND name = ?`,
        [patternIds[examName], sec.name]
      );
      if (existing) {
        sectionIds[examName][sec.name] = existing.id;
      } else {
        const [res] = await conn.query(
          `INSERT INTO exam_sections (pattern_id, subject_id, name, question_count, marks_per_question, time_seconds, \`order\`)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [patternIds[examName], subjectIds[sec.subj], sec.name, sec.q, sec.marks, sec.time, sec.ord]
        );
        sectionIds[examName][sec.name] = res.insertId;
      }
    }
    console.log(`  ✔ Sections: ${examName}`);
  }

  // ── Sample Questions ────────────────────────────────────
  const questionData = [
    // General Intelligence - Analogy
    {
      subj: 'General Intelligence', topic: 'Analogy', diff: 'easy', correct: 'B',
      text: 'Book : Library :: Painting : ?',
      choices: [{ l:'A', t:'Shop' }, { l:'B', t:'Gallery' }, { l:'C', t:'Museum' }, { l:'D', t:'Studio' }],
      explanation: 'Just as books are stored in a library, paintings are displayed in a gallery.'
    },
    {
      subj: 'General Intelligence', topic: 'Analogy', diff: 'medium', correct: 'C',
      text: 'Doctor : Stethoscope :: Carpenter : ?',
      choices: [{ l:'A', t:'Hammer' }, { l:'B', t:'Nail' }, { l:'C', t:'Saw' }, { l:'D', t:'Wood' }],
      explanation: 'A stethoscope is the primary tool of a doctor; a saw is the primary tool of a carpenter.'
    },
    // General Intelligence - Series
    {
      subj: 'General Intelligence', topic: 'Series', diff: 'easy', correct: 'A',
      text: 'What comes next in: 2, 4, 8, 16, ?',
      choices: [{ l:'A', t:'32' }, { l:'B', t:'24' }, { l:'C', t:'18' }, { l:'D', t:'30' }],
      explanation: 'Each term is multiplied by 2. So 16 × 2 = 32.'
    },
    {
      subj: 'General Intelligence', topic: 'Series', diff: 'medium', correct: 'B',
      text: 'Complete the series: 3, 7, 13, 21, ?',
      choices: [{ l:'A', t:'28' }, { l:'B', t:'31' }, { l:'C', t:'33' }, { l:'D', t:'29' }],
      explanation: 'Differences are 4, 6, 8, 10 (increasing by 2). So 21 + 10 = 31.'
    },
    // Quantitative Aptitude - Percentage
    {
      subj: 'Quantitative Aptitude', topic: 'Percentage', diff: 'easy', correct: 'C',
      text: 'What is 25% of 200?',
      choices: [{ l:'A', t:'40' }, { l:'B', t:'45' }, { l:'C', t:'50' }, { l:'D', t:'55' }],
      explanation: '25% of 200 = (25/100) × 200 = 50.'
    },
    {
      subj: 'Quantitative Aptitude', topic: 'Percentage', diff: 'medium', correct: 'D',
      text: 'A price increased from ₹500 to ₹600. What is the percentage increase?',
      choices: [{ l:'A', t:'10%' }, { l:'B', t:'15%' }, { l:'C', t:'18%' }, { l:'D', t:'20%' }],
      explanation: 'Increase = 100, original = 500. % increase = (100/500) × 100 = 20%.'
    },
    // English Language
    {
      subj: 'English Language', topic: 'Error Spotting', diff: 'easy', correct: 'B',
      text: 'Spot the error: She (A) is knowing (B) all the answers (C) to the questions (D)',
      choices: [{ l:'A', t:'She' }, { l:'B', t:'is knowing' }, { l:'C', t:'all the answers' }, { l:'D', t:'to the questions' }],
      explanation: '"Know" is a stative verb and should not be used in progressive tense. Correct: "knows".'
    },
    // General Awareness
    {
      subj: 'General Awareness', topic: 'History', diff: 'easy', correct: 'A',
      text: 'In which year did India get independence?',
      choices: [{ l:'A', t:'1947' }, { l:'B', t:'1948' }, { l:'C', t:'1946' }, { l:'D', t:'1950' }],
      explanation: 'India gained independence from British rule on 15 August 1947.'
    },
    {
      subj: 'General Awareness', topic: 'Geography', diff: 'medium', correct: 'C',
      text: 'Which is the longest river in India?',
      choices: [{ l:'A', t:'Yamuna' }, { l:'B', t:'Brahmaputra' }, { l:'C', t:'Ganga' }, { l:'D', t:'Godavari' }],
      explanation: 'The Ganga (Ganges) is the longest river in India at approximately 2,525 km.'
    },
    // Reasoning Ability
    {
      subj: 'Reasoning Ability', topic: 'Syllogism', diff: 'easy', correct: 'A',
      text: 'All cats are animals. All animals have legs. Conclusion: All cats have legs — is this?',
      choices: [{ l:'A', t:'True' }, { l:'B', t:'False' }, { l:'C', t:'Uncertain' }, { l:'D', t:'Partially true' }],
      explanation: 'By universal syllogism: All cats → animals → have legs. So all cats have legs. TRUE.'
    },
  ];

  for (const qd of questionData) {
    const subjectId = subjectIds[qd.subj];
    const topicId   = (topicIds[qd.subj] || {})[qd.topic] || null;

    const [[existingQ]] = await conn.query(
      `SELECT id FROM questions WHERE subject_id = ? AND text = ?`,
      [subjectId, qd.text]
    );

    let questionId;
    if (existingQ) {
      questionId = existingQ.id;
    } else {
      const [res] = await conn.query(
        `INSERT INTO questions (subject_id, topic_id, text, difficulty, correct_option, explanation)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [subjectId, topicId, qd.text, qd.diff, qd.correct, qd.explanation || '']
      );
      questionId = res.insertId;
      for (const ch of qd.choices) {
        await conn.query(
          `INSERT IGNORE INTO choices (question_id, label, text) VALUES (?, ?, ?)`,
          [questionId, ch.l, ch.t]
        );
      }
    }
  }
  console.log('  ✔ Sample questions seeded');

  // ── Tests ───────────────────────────────────────────────
  const testDefs = [
    { exam: 'SSC CGL',  pattern: 'SSC CGL',  title: 'SSC CGL Full Mock #1',     mode: 'mock',     slug: 'ssc-cgl-mock-1' },
    { exam: 'SSC CGL',  pattern: 'SSC CGL',  title: 'SSC CGL Full Mock #2',     mode: 'mock',     slug: 'ssc-cgl-mock-2' },
    { exam: 'SSC CGL',  pattern: 'SSC CGL',  title: 'Reasoning Practice Set 1', mode: 'practice', slug: 'ssc-cgl-reasoning-practice-1' },
    { exam: 'IBPS PO',  pattern: 'IBPS PO',  title: 'IBPS PO Full Mock #1',     mode: 'mock',     slug: 'ibps-po-mock-1' },
    { exam: 'IBPS PO',  pattern: 'IBPS PO',  title: 'English Practice Set 1',   mode: 'practice', slug: 'ibps-po-english-practice-1' },
    { exam: 'RRB NTPC', pattern: 'RRB NTPC', title: 'RRB NTPC Full Mock #1',    mode: 'mock',     slug: 'rrb-ntpc-mock-1' },
  ];

  const testIds = {};
  for (const td of testDefs) {
    await conn.query(
      `INSERT IGNORE INTO tests (exam_id, pattern_id, title, slug, mode, is_active, shuffle_questions)
       VALUES (?, ?, ?, ?, ?, 1, 1)`,
      [examIds[td.exam], patternIds[td.pattern], td.title, td.slug, td.mode]
    );
    const [[row]] = await conn.query(`SELECT id FROM tests WHERE slug = ?`, [td.slug]);
    testIds[td.slug] = row.id;
    console.log(`  ✔ Test: ${td.title}`);
  }

  // ── Test Section Rules ──────────────────────────────────
  for (const [examName, secList] of Object.entries(sectionDefs)) {
    const testsForExam = testDefs.filter(t => t.exam === examName);
    for (const td of testsForExam) {
      for (const sec of secList) {
        const secId = sectionIds[examName]?.[sec.name];
        if (!secId) continue;
        await conn.query(
          `INSERT IGNORE INTO test_section_rules (test_id, section_id, question_count)
           VALUES (?, ?, ?)`,
          [testIds[td.slug], secId, Math.min(sec.q, 5)]
        );
      }
    }
  }
  console.log('  ✔ Test section rules seeded');

  await conn.end();
  console.log('\n✅ Seeding complete! Start the server and visit http://localhost:3000\n');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
