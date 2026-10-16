const express = require('express');
const bcrypt = require('bcrypt');
const db = require('../db');

const router = express.Router();
const SALT_ROUNDS = 12;
const VALID_ROLES = ['Administrator', 'HR Staff'];
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password) =>
  typeof password === 'string' && Buffer.byteLength(password, 'utf8') >= 12 && Buffer.byteLength(password, 'utf8') <= 72;
const publicUser = (user) => ({
  id: Number(user.id),
  email: user.email,
  full_name: user.full_name,
  role: user.role,
  is_active: Boolean(user.is_active),
  created_at: user.created_at
});

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, email, full_name, role, is_active, created_at FROM users ORDER BY full_name, id'
    );
    return res.json({ success: true, data: rows.map(publicUser) });
  } catch (error) {
    console.error('User list failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load user accounts.' });
  }
});

router.post('/', async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const fullName = typeof req.body?.full_name === 'string' ? req.body.full_name.trim() : '';
  const { password, role } = req.body || {};

  if (!email || email.length > 190 || !isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (fullName.length < 2 || fullName.length > 100) {
    return res.status(400).json({ success: false, message: 'Full name must be between 2 and 100 characters.' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ success: false, message: 'Password must be between 12 and 72 UTF-8 bytes.' });
  }
  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ success: false, message: 'Role must be Administrator or HR Staff.' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const [result] = await db.query(
      'INSERT INTO users (email, full_name, password_hash, role) VALUES (?, ?, ?, ?)',
      [email, fullName, passwordHash, role]
    );
    const [rows] = await db.query(
      'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    return res.status(201).json({ success: true, data: publicUser(rows[0]) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    console.error('User creation failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to create the user account.' });
  }
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id)) {
    return res.status(400).json({ success: false, message: 'Invalid user ID.' });
  }

  const body = req.body || {};
  const allowedKeys = new Set(['role', 'is_active', 'password']);
  if (Object.keys(body).some((key) => !allowedKeys.has(key))) {
    return res.status(400).json({ success: false, message: 'Unsupported user account field.' });
  }
  if (body.role !== undefined && !VALID_ROLES.includes(body.role)) {
    return res.status(400).json({ success: false, message: 'Role must be Administrator or HR Staff.' });
  }
  if (body.is_active !== undefined && typeof body.is_active !== 'boolean') {
    return res.status(400).json({ success: false, message: 'is_active must be a boolean.' });
  }
  if (body.password !== undefined && !isValidPassword(body.password)) {
    return res.status(400).json({ success: false, message: 'Password must be between 12 and 72 UTF-8 bytes.' });
  }
  if (body.role === undefined && body.is_active === undefined && body.password === undefined) {
    return res.status(400).json({ success: false, message: 'Provide a role, active status, or password to update.' });
  }

  try {
    const [userRows] = await db.query(
      'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ? LIMIT 1',
      [Number(id)]
    );
    const currentUser = userRows[0];
    if (!currentUser) return res.status(404).json({ success: false, message: 'User account not found.' });

    const nextRole = body.role === undefined ? currentUser.role : body.role;
    const nextIsActive = body.is_active === undefined ? Boolean(currentUser.is_active) : body.is_active;
    const isDemotingActiveAdmin = currentUser.role === 'Administrator'
      && Boolean(currentUser.is_active)
      && (nextRole !== 'Administrator' || !nextIsActive);

    if (isDemotingActiveAdmin) {
      if (Number(id) === req.user.id) {
        return res.status(409).json({ success: false, message: 'You cannot deactivate or demote your own administrator account.' });
      }
      const [adminRows] = await db.query(
        "SELECT COUNT(*) AS count FROM users WHERE role = 'Administrator' AND is_active = 1"
      );
      if (Number(adminRows[0].count) <= 1) {
        return res.status(409).json({ success: false, message: 'The last active administrator cannot be deactivated or demoted.' });
      }
    }

    const passwordHash = body.password === undefined
      ? null
      : await bcrypt.hash(body.password, SALT_ROUNDS);
    await db.query(
      `UPDATE users
       SET role = ?, is_active = ?, password_hash = COALESCE(?, password_hash), token_version = token_version + 1
       WHERE id = ?`,
      [nextRole, nextIsActive ? 1 : 0, passwordHash, Number(id)]
    );

    const [updatedRows] = await db.query(
      'SELECT id, email, full_name, role, is_active, created_at FROM users WHERE id = ?',
      [Number(id)]
    );
    return res.json({ success: true, data: publicUser(updatedRows[0]) });
  } catch (error) {
    console.error('User account update failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to update the user account.' });
  }
});

module.exports = router;
