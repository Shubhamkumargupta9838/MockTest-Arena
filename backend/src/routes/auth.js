const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');
const pool = require('../db/connection');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';
const JWT_COOKIE_NAME = 'mocktest_jwt';
const JWT_COOKIE_MAX_AGE = Number(process.env.JWT_COOKIE_MAX_AGE) || 24 * 60 * 60 * 1000;

function getJwtCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: JWT_COOKIE_MAX_AGE,
  };
}

function getJwtSecret() {
  if (!process.env.JWT_SECRET) {
    const err = new Error('JWT_SECRET is not configured');
    err.statusCode = 500;
    throw err;
  }
  return process.env.JWT_SECRET;
}

function toPublicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    provider: user.provider,
    role: user.role || 'user',
  };
}

function signAuthToken(user) {
  const publicUser = toPublicUser(user);
  return jwt.sign(
    {
      sub: String(publicUser.id || publicUser.email || publicUser.name),
      role: publicUser.role,
      user: publicUser,
    },
    getJwtSecret(),
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function sendAuthResponse(res, user, message = 'Login successful') {
  const publicUser = toPublicUser(user);
  const token = signAuthToken(publicUser);

  res.cookie(JWT_COOKIE_NAME, token, getJwtCookieOptions());
  res.json({
    status: 'ok',
    message,
    user: publicUser,
  });
}

function getCookie(req, name) {
  const cookieHeader = req.get('cookie') || '';
  for (const part of cookieHeader.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex === -1) continue;

    const key = part.slice(0, separatorIndex).trim();
    if (key === name) {
      return decodeURIComponent(part.slice(separatorIndex + 1).trim());
    }
  }
  return null;
}

function getAuthToken(req) {
  const cookieToken = getCookie(req, JWT_COOKIE_NAME);
  if (cookieToken) return cookieToken;

  const header = req.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) return null;
  return token;
}

function verifyAuthToken(req, res, next) {
  try {
    const token = getAuthToken(req);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }

    const payload = jwt.verify(token, getJwtSecret());
    req.auth = payload;
    req.user = payload.user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }
}

async function findUserById(id) {
  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, provider, provider_id, role FROM users WHERE id = ? LIMIT 1',
    [id]
  );
  return rows[0] || null;
}

async function findUserByEmail(email) {
  const [rows] = await pool.query(
    'SELECT id, name, email, password_hash, provider, provider_id, role FROM users WHERE email = ? LIMIT 1',
    [email]
  );
  return rows[0] || null;
}

async function findOrCreateGoogleUser(googleUser) {
  const providerId = googleUser.sub;
  const email = String(googleUser.email || '').trim().toLowerCase();
  const name = googleUser.name || email.split('@')[0] || 'Google user';

  if (!email) {
    const err = new Error('Google did not return an email address');
    err.statusCode = 400;
    throw err;
  }

  if (googleUser.email_verified === false) {
    const err = new Error('Google email is not verified');
    err.statusCode = 401;
    throw err;
  }

  const [providerRows] = await pool.query(
    'SELECT id, name, email, provider, provider_id, role FROM users WHERE provider = ? AND provider_id = ? LIMIT 1',
    ['google', providerId]
  );
  if (providerRows[0]) return providerRows[0];

  const existing = await findUserByEmail(email);
  if (existing) {
    await pool.query(
      'UPDATE users SET provider = ?, provider_id = ? WHERE id = ?',
      ['google', providerId, existing.id]
    );
    return { ...existing, provider: 'google', provider_id: providerId };
  }

  const [result] = await pool.query(
    'INSERT INTO users (name, email, provider, provider_id) VALUES (?, ?, ?, ?)',
    [name, email, 'google', providerId]
  );

  return findUserById(result.insertId);
}

async function verifyGoogleCredential(credential) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    const err = new Error('GOOGLE_CLIENT_ID is not configured');
    err.statusCode = 500;
    throw err;
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    return ticket.getPayload();
  } catch (err) {
    err.statusCode = 401;
    throw err;
  }
}

function requireAuth(req, res, next) {
  verifyAuthToken(req, res, () => {
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }
    next();
  });
}

function requireUser(req, res, next) {
  verifyAuthToken(req, res, () => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    next();
  });
}

router.get('/google-client-id', (req, res) => {
  res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });
});

router.post('/google', async (req, res, next) => {
  try {
    const credential = req.body.credential;
    if (!credential) {
      return res.status(400).json({ error: 'Google credential is required' });
    }

    const googleUser = await verifyGoogleCredential(credential);
    const user = await findOrCreateGoogleUser(googleUser);
    sendAuthResponse(res, user, 'Google login successful');
  } catch (err) {
    next(err);
  }
});

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();

    if (!cleanName || !cleanEmail || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await pool.query(
      'INSERT INTO users (name, email, password_hash, provider) VALUES (?, ?, ?, ?)',
      [cleanName, cleanEmail, passwordHash, 'local']
    );

    res.status(201).json({
      status: 'ok',
      message: 'Registration successful. Please login to continue.',
    });
  } catch (err) {
    next(err);
  }
});

router.post('/user/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const matches = await bcrypt.compare(password, user.password_hash);
    if (!matches) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    sendAuthResponse(res, user);
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return sendAuthResponse(res, {
        id: 'admin',
        name: username,
        email: '',
        provider: 'local',
        role: 'admin',
      });
    }

    const user = await findUserByEmail(String(username).trim().toLowerCase());
    if (user?.role === 'admin' && user.password_hash) {
      const matches = await bcrypt.compare(password, user.password_hash);
      if (matches) {
        return sendAuthResponse(res, user);
      }
    }

    res.status(401).json({ error: 'Invalid credentials' });
  } catch (err) {
    next(err);
  }
});

router.get('/me', (req, res) => {
  const token = getAuthToken(req);
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const payload = jwt.verify(token, getJwtSecret());
    const user = payload.user;
    return res.json({
      user,
      authenticated: true,
      admin: user?.role === 'admin',
    });
  } catch (err) {
    return res.json({ authenticated: false });
  }
});

router.post('/logout', (req, res) => {
  const { maxAge, ...cookieOptions } = getJwtCookieOptions();
  res.clearCookie(JWT_COOKIE_NAME, cookieOptions);
  res.json({ status: 'ok', message: 'Logged out' });
});

module.exports = { router, requireAuth, requireUser };
