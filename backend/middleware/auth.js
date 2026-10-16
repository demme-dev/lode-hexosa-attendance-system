const jwt = require('jsonwebtoken');
const db = require('../db');
const { jwtSecret } = require('../auth_config');

const COOKIE_NAME = 'lh_session';
const TOKEN_ISSUER = 'lode-hexosa';
const TOKEN_AUDIENCE = 'lode-hexosa-admin';

function getSessionToken(req) {
  const cookieHeader = req.headers.cookie || '';
  for (const part of cookieHeader.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== COOKIE_NAME) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return null;
    }
  }
  return null;
}

function verifySessionToken(token) {
  return jwt.verify(token, jwtSecret, {
    algorithms: ['HS256'],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE
  });
}

async function authenticate(req, res, next) {
  const token = getSessionToken(req);
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  let claims;
  try {
    claims = verifySessionToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  if (!/^\d+$/.test(String(claims.sub)) || !Number.isInteger(claims.ver)) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    const [rows] = await db.query(
      `SELECT id, email, full_name, role, is_active, token_version
       FROM users WHERE id = ? LIMIT 1`,
      [Number(claims.sub)]
    );
    const user = rows[0];
    if (!user || !user.is_active || Number(user.token_version) !== claims.ver) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }

    req.user = {
      id: Number(user.id),
      email: user.email,
      full_name: user.full_name,
      role: user.role
    };
    req.sessionClaims = claims;
    return next();
  } catch (error) {
    console.error('Authentication lookup failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to verify the session.' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

module.exports = {
  COOKIE_NAME,
  TOKEN_ISSUER,
  TOKEN_AUDIENCE,
  getSessionToken,
  verifySessionToken,
  authenticate,
  requireRole
};
