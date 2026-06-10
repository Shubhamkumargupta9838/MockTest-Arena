require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const path    = require('path');
const { requestLogger, errorHandler } = require('./middleware');

const examRoutes   = require('./routes/exams');
const quizRoutes   = require('./routes/quizzes');
const resultRoutes = require('./routes/results');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Core middleware ───────────────────────────────────────
app.use(requestLogger);
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? false
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001', 'http://127.0.0.1:3001'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'mocktest-secret-dev',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
}));

// ── Rate limiting ─────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ── API Routes ────────────────────────────────────────────
app.use('/api/exams',   examRoutes);
app.use('/api/quiz',    quizRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/upload',  uploadRoutes);
app.use('/api/admin',   adminRoutes);

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ── Serve React build in production ──────────────────────
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../frontend/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/build/index.html'));
  });
}

// ── Error handler (must be last) ─────────────────────────
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`\n🚀 MockTest Arena API  →  http://localhost:${PORT}`);
  console.log(`   React frontend      →  http://localhost:3000\n`);
});

module.exports = app;
