
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const db = require('./db');
const { initDatabase } = require('./init_db');
const authRoutes = require('./routes/auth');
const employeeRoutes = require('./routes/employees');
const attendanceRoutes = require('./routes/attendance');
const userRoutes = require('./routes/users');
const { authenticate, requireRole } = require('./middleware/auth');

const app = express();

app.disable('x-powered-by');

const allowedOrigins = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_ORIGIN
].filter(Boolean));

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error('Origin is not allowed.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json({ limit: '1mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, requireRole('Administrator'), userRoutes);
app.use('/api/employees', authenticate, requireRole('Administrator', 'HR Staff'), (req, res, next) => {
  if (req.method === 'GET' || req.method === 'HEAD') return next();
  return requireRole('Administrator')(req, res, next);
}, employeeRoutes);
app.use('/api/attendance', authenticate, requireRole('Administrator', 'HR Staff'), attendanceRoutes);

app.get('/', (req, res) => {
  res.json({
    message: 'Lode Hexosa Administration Attendance API is running!'
  });
});

app.get('/api/test-db', authenticate, requireRole('Administrator'), async (req, res) => {
  try {
    const [rows] = await db.query('SELECT DATABASE() AS databaseName');
    res.json({
      message: 'MySQL connected successfully!',
      database: rows[0].databaseName
    });
  } catch (error) {
    console.error('Database error:', error.message);
    res.status(500).json({ message: 'Database connection failed.' });
  }
});

const PORT = process.env.PORT || 5000;

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database tables:', err.message);
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT} (with DB warnings)`);
    });
  });
