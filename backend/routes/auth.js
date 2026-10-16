const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { jwtSecret } = require('../auth_config');
const {
  COOKIE_NAME,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE,
  getSessionToken,
  verifySessionToken,
  authenticate
} = require('../middleware/auth');

const router = express.Router();
const SALT_ROUNDS = 12;
const SESSION_MAX_AGE = 30 * 60 * 1000;
const failedLoginAttempts = new Map();
let dummyPasswordHashPromise;

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password) =>
  typeof password === 'string' && Buffer.byteLength(password, 'utf8') >= 12 && Buffer.byteLength(password, 'utf8') <= 72;
const publicUser = (user) => ({
  id: Number(user.id),
  email: user.email,
  full_name: user.full_name,
  role: user.role
});
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  path: '/api',
  maxAge: SESSION_MAX_AGE
});

function clearSessionCookie(res) {
  const { maxAge, ...options } = cookieOptions();
  res.clearCookie(COOKIE_NAME, options);
}

function getLoginAttempt(key) {
  const now = Date.now();
  for (const [attemptKey, attempt] of failedLoginAttempts) {
    if (attempt.expiresAt <= now) failedLoginAttempts.delete(attemptKey);
  }
  return failedLoginAttempts.get(key);
}

function recordFailedLogin(key) {
  const previous = getLoginAttempt(key) || { count: 0 };
  const count = previous.count + 1;
  failedLoginAttempts.set(key, {
    count,
    expiresAt: Date.now() + (count >= 5 ? 15 * 60 * 1000 : 15 * 60 * 1000)
  });
}

function clearFailedLogin(key) {
  failedLoginAttempts.delete(key);
}

async function getDummyPasswordHash() {
  if (!dummyPasswordHashPromise) {
    dummyPasswordHashPromise = bcrypt.hash(crypto.randomBytes(32).toString('hex'), SALT_ROUNDS);
  }
  return dummyPasswordHashPromise;
}

router.post('/login', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || email.length > 190 || !isValidEmail(email) || !password || Buffer.byteLength(password, 'utf8') > 72) {
    return res.status(400).json({ success: false, message: 'Enter a valid email and password.' });
  }

  const attemptKey = `${req.ip}:${email}`;
  const attempt = getLoginAttempt(attemptKey);
  if (attempt && attempt.count >= 5) {
    return res.status(429).json({ success: false, message: 'Too many sign-in attempts. Try again later.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, email, full_name, password_hash, role, is_active, token_version
       FROM users WHERE email = ? LIMIT 1`,
      [email]
    );
    const user = rows[0];
    const passwordHash = user ? user.password_hash : await getDummyPasswordHash();
    const passwordMatches = await bcrypt.compare(password, passwordHash);

    if (!user || !user.is_active || !passwordMatches) {
      recordFailedLogin(attemptKey);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    clearFailedLogin(attemptKey);
    const token = jwt.sign(
      { ver: Number(user.token_version) },
      jwtSecret,
      {
        algorithm: 'HS256',
        subject: String(user.id),
        issuer: TOKEN_ISSUER,
        audience: TOKEN_AUDIENCE,
        expiresIn: '30m'
      }
    );
    res.cookie(COOKIE_NAME, token, cookieOptions());
    return res.status(200).json({ success: true, user: publicUser(user) });
  } catch (error) {
    console.error('Login failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to sign in right now.' });
  }
});

router.get('/me', authenticate, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.post('/logout', async (req, res) => {
  const token = getSessionToken(req);
  clearSessionCookie(res);
  if (!token) return res.json({ success: true });

  try {
    const claims = verifySessionToken(token);
    if (/^\d+$/.test(String(claims.sub)) && Number.isInteger(claims.ver)) {
      await db.query(
        'UPDATE users SET token_version = token_version + 1 WHERE id = ? AND token_version = ?',
        [Number(claims.sub), claims.ver]
      );
    }
  } catch (error) {
    if (error.name !== 'JsonWebTokenError' && error.name !== 'TokenExpiredError' && error.name !== 'NotBeforeError') {
      console.error('Logout session revocation failed:', error.message);
      return res.status(500).json({ success: false, message: 'Unable to complete logout.' });
    }
  }

  return res.json({ success: true });
});

module.exports = router;
