/**
 * migrate.js — Creates all MySQL tables for MockTest Arena
 * Run: node src/db/migrate.js
 */
const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  const db = process.env.DB_NAME || 'mocktest_db';
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${db}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.query(`USE \`${db}\``);
  console.log(`📦 Using database: ${db}`);

  const schema = [
    // ── User ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS users (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      name           VARCHAR(120) NOT NULL,
      email          VARCHAR(180) NOT NULL UNIQUE,
      password_hash  VARCHAR(255),
      provider       ENUM('local','google','github') DEFAULT 'local',
      provider_id    VARCHAR(255),
      role           ENUM('user','admin') DEFAULT 'user',
      created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at     DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_provider_account (provider, provider_id)
    )`,

    // ── Exam Category ──────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS exam_categories (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      name        VARCHAR(120) NOT NULL UNIQUE,
      slug        VARCHAR(140) NOT NULL UNIQUE,
      description TEXT,
      is_active   TINYINT(1) DEFAULT 1,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // ── Exam ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS exams (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      category_id INT NOT NULL,
      name        VARCHAR(120) NOT NULL,
      slug        VARCHAR(140) NOT NULL UNIQUE,
      description TEXT,
      is_active   TINYINT(1) DEFAULT 1,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (category_id) REFERENCES exam_categories(id) ON DELETE CASCADE
    )`,

    // ── Subject ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS subjects (
      id               INT AUTO_INCREMENT PRIMARY KEY,
      name             VARCHAR(120) NOT NULL UNIQUE,
      slug             VARCHAR(140) NOT NULL UNIQUE,
      is_banking_only  TINYINT(1) DEFAULT 0,
      is_active        TINYINT(1) DEFAULT 1
    )`,

    // ── Topic ──────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS topics (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      subject_id INT NOT NULL,
      name       VARCHAR(120) NOT NULL,
      slug       VARCHAR(140),
      UNIQUE KEY uq_subject_topic (subject_id, name),
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )`,

    // ── Exam Pattern ───────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS exam_patterns (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      exam_id             INT NOT NULL,
      name                VARCHAR(120) DEFAULT 'Official Pattern',
      total_marks         INT DEFAULT 100,
      total_time_seconds  INT DEFAULT 3600,
      negative_marking    DECIMAL(4,2) DEFAULT 0.25,
      is_active           TINYINT(1) DEFAULT 1,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
    )`,

    // ── Exam Section ───────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS exam_sections (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      pattern_id          INT NOT NULL,
      subject_id          INT NOT NULL,
      name                VARCHAR(120) NOT NULL,
      question_count      INT DEFAULT 25,
      marks_per_question  DECIMAL(5,2) DEFAULT 1.00,
      time_seconds        INT DEFAULT 900,
      \`order\`           INT DEFAULT 1,
      FOREIGN KEY (pattern_id) REFERENCES exam_patterns(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )`,

    // ── Test ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS tests (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      exam_id           INT NOT NULL,
      pattern_id        INT NOT NULL,
      title             VARCHAR(160) NOT NULL,
      slug              VARCHAR(180) NOT NULL UNIQUE,
      mode              ENUM('practice','mock') NOT NULL,
      description       TEXT,
      is_active         TINYINT(1) DEFAULT 1,
      shuffle_questions TINYINT(1) DEFAULT 1,
      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
      FOREIGN KEY (pattern_id) REFERENCES exam_patterns(id) ON DELETE CASCADE
    )`,

    // ── Question ───────────────────────────────────────────
`CREATE TABLE IF NOT EXISTS questions (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  subject_id     INT NOT NULL,
  topic_id       INT,
  text           TEXT NOT NULL,
  difficulty     ENUM('easy','medium','hard') DEFAULT 'easy',
  correct_option CHAR(1) NOT NULL,
  explanation    TEXT,
  image_url      VARCHAR(500),
  question_type  ENUM('text','image') DEFAULT 'text',
  is_active      TINYINT(1) DEFAULT 1,
  created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
  FOREIGN KEY (topic_id)   REFERENCES topics(id) ON DELETE SET NULL
)`,

    // ── Choice ─────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS choices (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      question_id INT NOT NULL,
      label       CHAR(1) NOT NULL,
      text        VARCHAR(500) NOT NULL,
      UNIQUE KEY uq_question_label (question_id, label),
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`,

    // ── Test Section Rule ──────────────────────────────────
    `CREATE TABLE IF NOT EXISTS test_section_rules (
      id             INT AUTO_INCREMENT PRIMARY KEY,
      test_id        INT NOT NULL,
      section_id     INT NOT NULL,
      topic_id       INT,
      difficulty     VARCHAR(10),
      question_count INT DEFAULT 10,
      FOREIGN KEY (test_id)    REFERENCES tests(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES exam_sections(id) ON DELETE CASCADE,
      FOREIGN KEY (topic_id)   REFERENCES topics(id) ON DELETE SET NULL
    )`,

    // ── Attempt ────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS attempts (
      id                  INT AUTO_INCREMENT PRIMARY KEY,
      test_id             INT NOT NULL,
      started_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
      ended_at            DATETIME,
      is_submitted        TINYINT(1) DEFAULT 0,
      total_time_seconds  INT DEFAULT 0,
      time_left_seconds   INT DEFAULT 0,
      last_seen_at        DATETIME,
      refresh_count       INT DEFAULT 0,
      FOREIGN KEY (test_id) REFERENCES tests(id) ON DELETE CASCADE
    )`,

    // ── Attempt Section ────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS attempt_sections (
      id                 INT AUTO_INCREMENT PRIMARY KEY,
      attempt_id         INT NOT NULL,
      section_id         INT NOT NULL,
      subject_id         INT NOT NULL,
      time_spent_seconds INT DEFAULT 0,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (section_id) REFERENCES exam_sections(id) ON DELETE CASCADE,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE
    )`,

    // ── Attempt Question ───────────────────────────────────
    `CREATE TABLE IF NOT EXISTS attempt_questions (
      id              INT AUTO_INCREMENT PRIMARY KEY,
      attempt_id      INT NOT NULL,
      question_id     INT NOT NULL,
      \`order\`       INT DEFAULT 1,
      selected_option CHAR(1),
      is_marked       TINYINT(1) DEFAULT 0,
      answered_at     DATETIME,
      UNIQUE KEY uq_attempt_question (attempt_id, question_id),
      FOREIGN KEY (attempt_id)  REFERENCES attempts(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    )`,

    // ── Integrity Event ────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS integrity_events (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      attempt_id  INT NOT NULL,
      event_type  VARCHAR(30) NOT NULL,
      details     TEXT,
      created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE
    )`,

    // ── Result ─────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS results (
      id                INT AUTO_INCREMENT PRIMARY KEY,
      attempt_id        INT NOT NULL UNIQUE,
      score             DECIMAL(6,2) DEFAULT 0,
      accuracy          DECIMAL(5,2) DEFAULT 0,
      correct_count     INT DEFAULT 0,
      incorrect_count   INT DEFAULT 0,
      unattempted_count INT DEFAULT 0,
      section_stats     JSON,
      created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attempt_id) REFERENCES attempts(id) ON DELETE CASCADE
    )`,
  ];

  for (const sql of schema) {
    const tableName = (sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/) || [])[1];
    await conn.query(sql);
    console.log(`  ✔ Table ready: ${tableName}`);
  }

  await conn.end();
  console.log('\n✅ Migration complete!');
}

migrate().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
