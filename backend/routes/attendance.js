const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireRole } = require('../middleware/auth');

// Helper to validate YYYY-MM-DD date format
const isValidDate = (dateString) => {
  if (!dateString) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  const parsed = new Date(dateString);
  return !isNaN(parsed.getTime());
};

// Helper to validate HH:MM or HH:MM:SS time format
const isValidTime = (timeString) => {
  if (!timeString) return false;
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
  return timeRegex.test(timeString);
};

// Helper to normalize time string to HH:MM:SS
const normalizeTime = (timeString) => {
  if (!timeString) return null;
  const parts = timeString.split(':');
  if (parts.length === 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
  }
  if (parts.length === 3) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
  }
  return timeString;
};

// Helper to get local date string YYYY-MM-DD
function getLocalDateString(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Helper to get local time string HH:MM:SS
function getLocalTimeString(d = new Date()) {
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  return `${h}:${min}:${s}`;
}

// Helper to format date object or string to YYYY-MM-DD (prevents timezone shift)
function formatLocalDate(dateVal) {
  if (!dateVal) return null;
  if (typeof dateVal === 'string') return dateVal.split('T')[0];
  if (dateVal instanceof Date) {
    const y = dateVal.getFullYear();
    const m = String(dateVal.getMonth() + 1).padStart(2, '0');
    const d = String(dateVal.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return dateVal;
}

// Helper to format attendance record
function formatAttendance(record) {
  if (!record) return record;
  return {
    ...record,
    attendance_date: formatLocalDate(record.attendance_date),
    employee_name: record.employee_name || `${record.first_name || ''} ${record.last_name || ''}`.trim()
  };
}

function getAttendanceSnapshot(record) {
  if (!record) return null;
  return {
    id: Number(record.id),
    employee_id: record.employee_id,
    attendance_date: formatLocalDate(record.attendance_date),
    check_in: record.check_in,
    check_out: record.check_out,
    status: record.status,
    notes: record.notes
  };
}

async function writeAttendanceAudit(connection, { recordId, employeeId, actor, action, reason = null, beforeData = null, afterData = null }) {
  await connection.query(
    `INSERT INTO attendance_audit_logs (
      attendance_id, employee_id, actor_user_id, actor_role, action, reason, before_data, after_data
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      recordId,
      employeeId,
      actor.id,
      actor.role,
      action,
      reason,
      beforeData ? JSON.stringify(getAttendanceSnapshot(beforeData)) : null,
      afterData ? JSON.stringify(getAttendanceSnapshot(afterData)) : null
    ]
  );
}

async function withAttendanceTransaction(work) {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const result = await work(connection);
    await connection.commit();
    return result;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Attendance transaction rollback failed:', rollbackError.message);
    }
    throw error;
  } finally {
    connection.release();
  }
}

// Helper to find employee by numeric primary key (id) or employee_id string
async function findEmployeeByIdOrCode(identifier) {
  if (!identifier) return null;
  const strId = String(identifier).trim();
  if (/^\d+$/.test(strId)) {
    const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [Number(strId)]);
    if (rows.length > 0) return rows[0];
  }
  const [rows] = await db.query('SELECT * FROM employees WHERE employee_id = ?', [strId]);
  return rows.length > 0 ? rows[0] : null;
}

// Helper to query single attendance record by ID with joined employee details
async function getAttendanceRecordById(id, queryClient = db, lockForUpdate = false) {
  const query = `
    SELECT 
      a.id,
      a.employee_id,
      CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
      e.first_name,
      e.last_name,
      e.department,
      e.position,
      e.status AS employee_status,
      a.attendance_date,
      a.check_in,
      a.check_out,
      a.status,
      a.notes,
      a.created_at,
      a.updated_at
    FROM attendance a
    LEFT JOIN employees e ON a.employee_id = e.employee_id
    WHERE a.id = ?${lockForUpdate ? ' FOR UPDATE' : ''}
  `;
  const [rows] = await queryClient.query(query, [id]);
  return rows.length > 0 ? formatAttendance(rows[0]) : null;
}

/**
 * 1. GET /api/attendance
 * Retrieve attendance records with optional filtering
 * Query params:
 *   - date: specific date (YYYY-MM-DD)
 *   - start_date & end_date: date range
 *   - employee_id: filter by employee code
 *   - status: Present, Late, Absent, Leave
 *   - search: query across employee_id, first_name, last_name, department
 */
router.get('/', async (req, res) => {
  try {
    const { date, start_date, end_date, employee_id, status, search } = req.query;

    let query = `
      SELECT 
        a.id,
        a.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.first_name,
        e.last_name,
        e.department,
        e.position,
        e.status AS employee_status,
        a.attendance_date,
        a.check_in,
        a.check_out,
        a.status,
        a.notes,
        a.created_at,
        a.updated_at
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE 1=1
    `;
    const params = [];

    // Filter by specific single date
    if (date && date.trim()) {
      query += ' AND a.attendance_date = ?';
      params.push(date.trim());
    }

    // Filter by date range
    if (start_date && start_date.trim()) {
      query += ' AND a.attendance_date >= ?';
      params.push(start_date.trim());
    }
    if (end_date && end_date.trim()) {
      query += ' AND a.attendance_date <= ?';
      params.push(end_date.trim());
    }

    // Filter by employee_id
    if (employee_id && employee_id.trim()) {
      query += ' AND a.employee_id = ?';
      params.push(employee_id.trim());
    }

    // Filter by status
    if (status && status.trim()) {
      query += ' AND a.status = ?';
      params.push(status.trim());
    }

    // Search query across employee ID or name
    if (search && search.trim()) {
      query += ' AND (a.employee_id LIKE ? OR e.first_name LIKE ? OR e.last_name LIKE ? OR e.department LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY a.attendance_date DESC, (CASE WHEN a.check_in IS NULL THEN 1 ELSE 0 END), a.check_in DESC, a.id DESC';

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows.map(formatAttendance)
    });
  } catch (error) {
    console.error('Error fetching attendance records:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching attendance records.'
    });
  }
});

/**
 * 2. GET /api/attendance/reports
 * Attendance report statistics and records for a date range
 */
router.get('/reports', async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    if (!isValidDate(start_date) || !isValidDate(end_date) || start_date > end_date) {
      return res.status(400).json({
        success: false,
        message: 'Valid start_date and end_date values are required, with start_date on or before end_date.'
      });
    }

    const [summaryRows] = await db.query(`
      SELECT
        COUNT(*) AS total_records,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) AS leave_count,
        SUM(CASE WHEN check_in IS NOT NULL THEN 1 ELSE 0 END) AS checked_in_count,
        SUM(CASE WHEN check_out IS NOT NULL THEN 1 ELSE 0 END) AS checked_out_count
      FROM attendance
      WHERE attendance_date BETWEEN ? AND ?
    `, [start_date, end_date]);

    const [employeeRows] = await db.query(`
      SELECT
        COUNT(*) AS total_active_employees,
        COUNT(DISTINCT a.employee_id) AS active_recorded_count
      FROM employees e
      LEFT JOIN attendance a
        ON a.employee_id = e.employee_id
        AND a.attendance_date BETWEEN ? AND ?
      WHERE e.status = 'Active'
    `, [start_date, end_date]);

    const [records] = await db.query(`
      SELECT
        a.employee_id,
        CONCAT(e.first_name, ' ', e.last_name) AS employee_name,
        e.department,
        a.attendance_date,
        a.check_in,
        a.check_out,
        CASE
          WHEN a.check_in IS NOT NULL AND a.check_out IS NOT NULL
            THEN FLOOR(MOD(TIME_TO_SEC(a.check_out) - TIME_TO_SEC(a.check_in), 86400) / 60)
          ELSE NULL
        END AS duration_minutes,
        a.status
      FROM attendance a
      LEFT JOIN employees e ON a.employee_id = e.employee_id
      WHERE a.attendance_date BETWEEN ? AND ?
      ORDER BY a.attendance_date DESC, a.employee_id ASC
    `, [start_date, end_date]);

    const summary = summaryRows[0] || {};
    const employeeSummary = employeeRows[0] || {};
    const totalActive = Number(employeeSummary.total_active_employees || 0);
    const activeRecorded = Number(employeeSummary.active_recorded_count || 0);

    return res.status(200).json({
      success: true,
      start_date,
      end_date,
      data: {
        summary: {
          total_records: Number(summary.total_records || 0),
          total_active_employees: totalActive,
          present_count: Number(summary.present_count || 0),
          late_count: Number(summary.late_count || 0),
          absent_count: Number(summary.absent_count || 0),
          leave_count: Number(summary.leave_count || 0),
          checked_in_count: Number(summary.checked_in_count || 0),
          checked_out_count: Number(summary.checked_out_count || 0),
          not_yet_recorded_count: Math.max(totalActive - activeRecorded, 0)
        },
        records: records.map(formatAttendance)
      }
    });
  } catch (error) {
    console.error('Error fetching attendance report:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching attendance report.'
    });
  }
});

/**
 * 3. GET /api/attendance/summary
 * Attendance statistics for a specific date (defaults to today)
 */
router.get('/summary', async (req, res) => {
  try {
    const targetDate = req.query.date && req.query.date.trim() ? req.query.date.trim() : getLocalDateString();

    const [rows] = await db.query(`
      SELECT 
        COUNT(*) AS total_records,
        SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) AS present_count,
        SUM(CASE WHEN status = 'Late' THEN 1 ELSE 0 END) AS late_count,
        SUM(CASE WHEN status = 'Absent' THEN 1 ELSE 0 END) AS absent_count,
        SUM(CASE WHEN status = 'Leave' THEN 1 ELSE 0 END) AS leave_count,
        SUM(CASE WHEN check_in IS NOT NULL THEN 1 ELSE 0 END) AS checked_in_count,
        SUM(CASE WHEN check_out IS NOT NULL THEN 1 ELSE 0 END) AS checked_out_count,
        SUM(CASE WHEN check_in IS NOT NULL AND check_out IS NULL THEN 1 ELSE 0 END) AS currently_working_count
      FROM attendance
      WHERE attendance_date = ?
    `, [targetDate]);

    // Count active employees with a record for this date without creating attendance rows.
    const [empRows] = await db.query(`
      SELECT
        COUNT(*) AS total_active,
        COUNT(DISTINCT a.employee_id) AS active_recorded
      FROM employees e
      LEFT JOIN attendance a
        ON a.employee_id = e.employee_id
        AND a.attendance_date = ?
      WHERE e.status = "Active"
    `, [targetDate]);

    const summary = rows[0] || {};
    const totalActive = empRows[0]?.total_active || 0;
    const activeRecorded = empRows[0]?.active_recorded || 0;

    return res.status(200).json({
      success: true,
      date: targetDate,
      data: {
        total_records: Number(summary.total_records || 0),
        present_count: Number(summary.present_count || 0),
        late_count: Number(summary.late_count || 0),
        absent_count: Number(summary.absent_count || 0),
        leave_count: Number(summary.leave_count || 0),
        checked_in_count: Number(summary.checked_in_count || 0),
        checked_out_count: Number(summary.checked_out_count || 0),
        currently_working_count: Number(summary.currently_working_count || 0),
        total_active_employees: Number(totalActive),
        not_yet_recorded_count: Math.max(Number(totalActive) - Number(activeRecorded), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching attendance summary:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching attendance summary.'
    });
  }
});

/**
 * 3. GET /api/attendance/:id
 * Retrieve a single attendance record by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid attendance ID format.'
      });
    }

    const record = await getAttendanceRecordById(Number(id));
    if (!record) {
      return res.status(404).json({
        success: false,
        message: `Attendance record with ID '${id}' not found.`
      });
    }

    return res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    console.error('Error retrieving attendance record:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving attendance record.'
    });
  }
});

/**
 * 4. POST /api/attendance/check-in
 * Record check-in for an employee
 * Body parameters:
 *   - employee_id: required (string or database id)
 *   - date: optional (YYYY-MM-DD, defaults to today)
 *   - time: optional (HH:MM or HH:MM:SS, defaults to current time)
 *   - status: optional (Present, Late, Absent, Leave). Defaults based on check-in time.
 *   - notes: optional remark string
 * Requirement: Prevent an employee from checking in more than once on the same date.
 */
router.post('/check-in', requireRole('Administrator', 'HR Staff'), async (req, res) => {
  try {
    let { employee_id, date, time, status, notes } = req.body;

    // Validate employee_id
    if (!employee_id || !String(employee_id).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: employee_id is required.'
      });
    }

    const employee = await findEmployeeByIdOrCode(employee_id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with ID '${employee_id}'.`
      });
    }

    // Resolve date (defaults to today's local date)
    const targetDate = date && String(date).trim() ? String(date).trim() : getLocalDateString();
    if (!isValidDate(targetDate)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: date must be in YYYY-MM-DD format.'
      });
    }

    // Resolve time (defaults to current local time)
    const rawTime = time && String(time).trim() ? String(time).trim() : getLocalTimeString();
    if (!isValidTime(rawTime)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: time must be in HH:MM or HH:MM:SS format.'
      });
    }
    const checkInTime = normalizeTime(rawTime);

    // Determine status: if not explicitly supplied, automatically set 'Late' after 09:15:00, otherwise 'Present'
    let attendanceStatus = 'Present';
    if (status && String(status).trim()) {
      const trimmedStatus = String(status).trim();
      const validStatuses = ['Present', 'Late', 'Absent', 'Leave'];
      if (!validStatuses.includes(trimmedStatus)) {
        return res.status(400).json({
          success: false,
          message: "Validation error: status must be one of 'Present', 'Late', 'Absent', 'Leave'."
        });
      }
      attendanceStatus = trimmedStatus;
    } else {
      // Default: Check if check-in time is after 09:15:00
      if (checkInTime > '09:15:00') {
        attendanceStatus = 'Late';
      }
    }

    const sanitizedNotes = notes && String(notes).trim() ? String(notes).trim() : null;

    const result = await withAttendanceTransaction(async (connection) => {
      const [existingRows] = await connection.query(
        'SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ? FOR UPDATE',
        [employee.employee_id, targetDate]
      );

      if (existingRows.length > 0) {
        const existing = existingRows[0];
        if (existing.check_in) {
          return {
            status: 409,
            body: {
              success: false,
              message: `Check-in denied: Employee '${employee.first_name} ${employee.last_name}' (${employee.employee_id}) has already checked in on ${targetDate} at ${existing.check_in}.`
            }
          };
        }

        const beforeRecord = await getAttendanceRecordById(existing.id, connection, true);
        await connection.query(
          'UPDATE attendance SET check_in = ?, status = ?, notes = COALESCE(?, notes) WHERE id = ?',
          [checkInTime, attendanceStatus, sanitizedNotes, existing.id]
        );
        const afterRecord = await getAttendanceRecordById(existing.id, connection);
        await writeAttendanceAudit(connection, {
          recordId: existing.id,
          employeeId: employee.employee_id,
          actor: req.user,
          action: 'CHECK_IN',
          beforeData: beforeRecord,
          afterData: afterRecord
        });
        return {
          status: 200,
          body: {
            success: true,
            message: `Check-in recorded successfully for ${employee.first_name} ${employee.last_name} (${employee.employee_id}) at ${checkInTime}.`,
            data: afterRecord
          }
        };
      }

      const [insertResult] = await connection.query(`
        INSERT INTO attendance (employee_id, attendance_date, check_in, status, notes)
        VALUES (?, ?, ?, ?, ?)
      `, [employee.employee_id, targetDate, checkInTime, attendanceStatus, sanitizedNotes]);
      const afterRecord = await getAttendanceRecordById(insertResult.insertId, connection);
      await writeAttendanceAudit(connection, {
        recordId: insertResult.insertId,
        employeeId: employee.employee_id,
        actor: req.user,
        action: 'CHECK_IN',
        afterData: afterRecord
      });
      return {
        status: 201,
        body: {
          success: true,
          message: `Check-in recorded successfully for ${employee.first_name} ${employee.last_name} (${employee.employee_id}) at ${checkInTime}. Status: ${attendanceStatus}.`,
          data: afterRecord
        }
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: An attendance record already exists for this employee on this date.'
      });
    }

    console.error('Error during check-in:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while recording check-in.'
    });
  }
});

/**
 * 5. POST /api/attendance/check-out
 * Record check-out for an employee
 * Body parameters:
 *   - employee_id: required
 *   - date: optional (YYYY-MM-DD, defaults to today)
 *   - time: optional (HH:MM or HH:MM:SS, defaults to current time)
 *   - notes: optional remark string
 */
router.post('/check-out', requireRole('Administrator', 'HR Staff'), async (req, res) => {
  try {
    let { employee_id, date, time, notes } = req.body;

    // Validate employee_id
    if (!employee_id || !String(employee_id).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: employee_id is required.'
      });
    }

    const employee = await findEmployeeByIdOrCode(employee_id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with ID '${employee_id}'.`
      });
    }

    // Resolve date (defaults to today's local date)
    const targetDate = date && String(date).trim() ? String(date).trim() : getLocalDateString();
    if (!isValidDate(targetDate)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: date must be in YYYY-MM-DD format.'
      });
    }

    // Resolve time (defaults to current local time)
    const rawTime = time && String(time).trim() ? String(time).trim() : getLocalTimeString();
    if (!isValidTime(rawTime)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: time must be in HH:MM or HH:MM:SS format.'
      });
    }
    const checkOutTime = normalizeTime(rawTime);

    const sanitizedNotes = notes && String(notes).trim() ? String(notes).trim() : null;

    const result = await withAttendanceTransaction(async (connection) => {
      const [rows] = await connection.query(
        'SELECT * FROM attendance WHERE employee_id = ? AND attendance_date = ? FOR UPDATE',
        [employee.employee_id, targetDate]
      );
      if (rows.length === 0) {
        return {
          status: 404,
          body: {
            success: false,
            message: `Cannot check out: No attendance record found for employee '${employee.first_name} ${employee.last_name}' (${employee.employee_id}) on ${targetDate}. Employee must check in before checking out.`
          }
        };
      }

      const record = rows[0];
      if (!record.check_in) {
        return {
          status: 400,
          body: {
            success: false,
            message: `Cannot check out: Employee '${employee.first_name} ${employee.last_name}' does not have a recorded check-in time on ${targetDate}.`
          }
        };
      }
      if (record.check_out) {
        return {
          status: 409,
          body: {
            success: false,
            message: `Check-out already completed: Employee '${employee.first_name} ${employee.last_name}' has already checked out on ${targetDate} at ${record.check_out}.`
          }
        };
      }

      const beforeRecord = await getAttendanceRecordById(record.id, connection, true);
      await connection.query(
        'UPDATE attendance SET check_out = ?, notes = COALESCE(?, notes) WHERE id = ?',
        [checkOutTime, sanitizedNotes, record.id]
      );
      const afterRecord = await getAttendanceRecordById(record.id, connection);
      await writeAttendanceAudit(connection, {
        recordId: record.id,
        employeeId: employee.employee_id,
        actor: req.user,
        action: 'CHECK_OUT',
        beforeData: beforeRecord,
        afterData: afterRecord
      });
      return {
        status: 200,
        body: {
          success: true,
          message: `Check-out recorded successfully for ${employee.first_name} ${employee.last_name} (${employee.employee_id}) at ${checkOutTime}.`,
          data: afterRecord
        }
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error during check-out:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while recording check-out.'
    });
  }
});

/**
 * 6. POST /api/attendance
 * General attendance entry (e.g. manual record creation for Absent, Leave, or specific entry)
 */
router.post('/', requireRole('Administrator'), async (req, res) => {
  try {
    let { employee_id, attendance_date, check_in, check_out, status, notes } = req.body;

    if (!employee_id || !String(employee_id).trim()) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: employee_id is required.'
      });
    }

    const employee = await findEmployeeByIdOrCode(employee_id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with ID '${employee_id}'.`
      });
    }

    const targetDate = attendance_date && String(attendance_date).trim() ? String(attendance_date).trim() : getLocalDateString();
    if (!isValidDate(targetDate)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: attendance_date must be in YYYY-MM-DD format.'
      });
    }

    // Validate status
    const validStatuses = ['Present', 'Late', 'Absent', 'Leave'];
    const chosenStatus = status && validStatuses.includes(String(status).trim()) ? String(status).trim() : 'Present';

    // Validate times if provided
    let normalizedCheckIn = null;
    if (check_in && String(check_in).trim()) {
      const rawIn = String(check_in).trim();
      if (!isValidTime(rawIn)) {
        return res.status(400).json({
          success: false,
          message: 'Validation error: check_in time must be in HH:MM or HH:MM:SS format.'
        });
      }
      normalizedCheckIn = normalizeTime(rawIn);
    }

    let normalizedCheckOut = null;
    if (check_out && String(check_out).trim()) {
      const rawOut = String(check_out).trim();
      if (!isValidTime(rawOut)) {
        return res.status(400).json({
          success: false,
          message: 'Validation error: check_out time must be in HH:MM or HH:MM:SS format.'
        });
      }
      normalizedCheckOut = normalizeTime(rawOut);
    }

    const sanitizedNotes = notes && String(notes).trim() ? String(notes).trim() : null;

    const result = await withAttendanceTransaction(async (connection) => {
      const [existing] = await connection.query(
        'SELECT id FROM attendance WHERE employee_id = ? AND attendance_date = ? FOR UPDATE',
        [employee.employee_id, targetDate]
      );
      if (existing.length > 0) {
        return {
          status: 409,
          body: {
            success: false,
            message: `An attendance record already exists for employee '${employee.employee_id}' on ${targetDate}. Use update instead.`
          }
        };
      }

      const [insertResult] = await connection.query(`
        INSERT INTO attendance (
          employee_id, attendance_date, check_in, check_out, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?)
      `, [
        employee.employee_id,
        targetDate,
        normalizedCheckIn,
        normalizedCheckOut,
        chosenStatus,
        sanitizedNotes
      ]);
      const newRecord = await getAttendanceRecordById(insertResult.insertId, connection);
      await writeAttendanceAudit(connection, {
        recordId: insertResult.insertId,
        employeeId: employee.employee_id,
        actor: req.user,
        action: 'MANUAL_CREATE',
        afterData: newRecord
      });
      return {
        status: 201,
        body: {
          success: true,
          message: 'Attendance record created successfully.',
          data: newRecord
        }
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      return res.status(409).json({
        success: false,
        message: 'Conflict: An attendance record already exists for this employee on this date.'
      });
    }

    console.error('Error creating attendance record:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating attendance record.'
    });
  }
});

/**
 * 7. PUT /api/attendance/:id
 * Update an existing attendance record
 */
router.put('/:id', requireRole('Administrator', 'HR Staff'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid attendance ID format.'
      });
    }

    const body = req.body || {};
    if (body.reason != null && typeof body.reason !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Edit reason must be a string.'
      });
    }
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
    if (Buffer.byteLength(reason, 'utf8') > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Edit reason must be 2000 UTF-8 bytes or fewer.'
      });
    }
    if (req.user.role === 'HR Staff' && !reason) {
      return res.status(400).json({
        success: false,
        message: 'A non-empty reason is required for HR Staff attendance edits.'
      });
    }

    const result = await withAttendanceTransaction(async (connection) => {
      const existing = await getAttendanceRecordById(Number(id), connection, true);
      if (!existing) {
        return {
          status: 404,
          body: { success: false, message: `Attendance record with ID '${id}' not found.` }
        };
      }

      let { attendance_date, check_in, check_out, status, notes } = body;

      const updatedDate = attendance_date !== undefined ? String(attendance_date).trim() : existing.attendance_date;
      if (updatedDate && !isValidDate(updatedDate)) {
        return {
          status: 400,
          body: { success: false, message: 'Validation error: attendance_date must be in YYYY-MM-DD format.' }
        };
      }

      let updatedCheckIn = existing.check_in;
      if (check_in !== undefined) {
        if (check_in && String(check_in).trim()) {
          const raw = String(check_in).trim();
          if (!isValidTime(raw)) {
            return {
              status: 400,
              body: { success: false, message: 'Validation error: check_in time must be in HH:MM or HH:MM:SS format.' }
            };
          }
          updatedCheckIn = normalizeTime(raw);
        } else {
          updatedCheckIn = null;
        }
      }

      let updatedCheckOut = existing.check_out;
      if (check_out !== undefined) {
        if (check_out && String(check_out).trim()) {
          const raw = String(check_out).trim();
          if (!isValidTime(raw)) {
            return {
              status: 400,
              body: { success: false, message: 'Validation error: check_out time must be in HH:MM or HH:MM:SS format.' }
            };
          }
          updatedCheckOut = normalizeTime(raw);
        } else {
          updatedCheckOut = null;
        }
      }

      let updatedStatus = existing.status;
      if (status !== undefined && status && String(status).trim()) {
        const validStatuses = ['Present', 'Late', 'Absent', 'Leave'];
        const st = String(status).trim();
        if (!validStatuses.includes(st)) {
          return {
            status: 400,
            body: { success: false, message: "Validation error: status must be one of 'Present', 'Late', 'Absent', 'Leave'." }
          };
        }
        updatedStatus = st;
      }

      const updatedNotes = notes !== undefined ? (notes && String(notes).trim() ? String(notes).trim() : null) : existing.notes;

      if (updatedDate !== existing.attendance_date) {
        const [colliding] = await connection.query(
          'SELECT id FROM attendance WHERE employee_id = ? AND attendance_date = ? AND id != ?',
          [existing.employee_id, updatedDate, existing.id]
        );
        if (colliding.length > 0) {
          return {
            status: 409,
            body: { success: false, message: `Cannot update date: An attendance record already exists for ${existing.employee_id} on ${updatedDate}.` }
          };
        }
      }

      await connection.query(`
        UPDATE attendance SET
          attendance_date = ?,
          check_in = ?,
          check_out = ?,
          status = ?,
          notes = ?
        WHERE id = ?
      `, [updatedDate, updatedCheckIn, updatedCheckOut, updatedStatus, updatedNotes, existing.id]);

      const updatedRecord = await getAttendanceRecordById(existing.id, connection);
      await writeAttendanceAudit(connection, {
        recordId: existing.id,
        employeeId: existing.employee_id,
        actor: req.user,
        action: 'UPDATE',
        reason: reason || null,
        beforeData: existing,
        afterData: updatedRecord
      });

      return {
        status: 200,
        body: { success: true, message: 'Attendance record updated successfully.', data: updatedRecord }
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error updating attendance record:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating attendance record.'
    });
  }
});

/**
 * 8. DELETE /api/attendance/:id
 * Delete an attendance record
 */
router.delete('/:id', requireRole('Administrator'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid attendance ID format.'
      });
    }

    const result = await withAttendanceTransaction(async (connection) => {
      const existing = await getAttendanceRecordById(Number(id), connection, true);
      if (!existing) {
        return {
          status: 404,
          body: { success: false, message: `Attendance record with ID '${id}' not found.` }
        };
      }

      await connection.query('DELETE FROM attendance WHERE id = ?', [Number(id)]);
      await writeAttendanceAudit(connection, {
        recordId: existing.id,
        employeeId: existing.employee_id,
        actor: req.user,
        action: 'DELETE',
        beforeData: existing
      });
      return {
        status: 200,
        body: {
          success: true,
          message: `Attendance record #${id} for ${existing.employee_name} (${existing.attendance_date}) deleted successfully.`
        }
      };
    });

    return res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Error deleting attendance record:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while deleting attendance record.'
    });
  }
});

module.exports = router;
