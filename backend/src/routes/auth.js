const express = require('express');
const router = express.Router();

// Simple hardcoded admin credentials (in production, use a database)
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

// Middleware to check if user is authenticated
function requireAuth(req, res, next) {
  if (!req.session || !req.session.adminUser) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  next();
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.adminUser = { username };
    return res.json({ status: 'ok', message: 'Login successful' });
  }

  res.status(401).json({ error: 'Invalid credentials' });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (req.session && req.session.adminUser) {
    return res.json({ user: req.session.adminUser, authenticated: true });
  }
  res.json({ authenticated: false });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(() => {
      res.json({ status: 'ok', message: 'Logged out' });
    });
  } else {
    res.json({ status: 'ok' });
  }
});

module.exports = { router, requireAuth };
