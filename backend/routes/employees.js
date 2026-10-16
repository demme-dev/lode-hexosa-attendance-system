const express = require('express');
const router = express.Router();
const db = require('../db');

// Helper to validate email format
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Helper to validate YYYY-MM-DD date format
const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;
  const parsed = new Date(dateString);
  return !isNaN(parsed.getTime());
};

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

// Helper to format employee record for consistent JSON response
function formatEmployee(emp) {
  if (!emp) return emp;
  return {
    ...emp,
    hire_date: formatLocalDate(emp.hire_date)
  };
}

// Helper to find employee by numeric primary key (id) or employee_id string
async function findEmployeeByIdOrCode(identifier) {
  if (/^\d+$/.test(identifier)) {
    const [rows] = await db.query('SELECT * FROM employees WHERE id = ?', [Number(identifier)]);
    if (rows.length > 0) return rows[0];
  }
  const [rows] = await db.query('SELECT * FROM employees WHERE employee_id = ?', [identifier]);
  return rows.length > 0 ? rows[0] : null;
}

/**
 * 1. POST /api/employees
 * Create a new employee
 */
router.post('/', async (req, res) => {
  try {
    let {
      employee_id,
      first_name,
      last_name,
      gender,
      department,
      position,
      phone,
      email,
      hire_date,
      status
    } = req.body;

    // Sanitize string inputs
    employee_id = typeof employee_id === 'string' ? employee_id.trim() : '';
    first_name = typeof first_name === 'string' ? first_name.trim() : '';
    last_name = typeof last_name === 'string' ? last_name.trim() : '';
    department = typeof department === 'string' && department.trim() ? department.trim() : null;
    position = typeof position === 'string' && position.trim() ? position.trim() : null;
    phone = typeof phone === 'string' && phone.trim() ? phone.trim() : null;
    email = typeof email === 'string' && email.trim() ? email.trim() : null;
    hire_date = hire_date ? String(hire_date).trim() : null;
    status = typeof status === 'string' && status.trim() ? status.trim() : 'Active';

    // Required field validation
    if (!employee_id || !first_name || !last_name) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: employee_id, first_name, and last_name are required fields.'
      });
    }

    // Gender validation
    if (gender) {
      gender = gender.trim();
      const validGenders = ['Male', 'Female', 'Other'];
      if (!validGenders.includes(gender)) {
        return res.status(400).json({
          success: false,
          message: "Validation error: gender must be 'Male', 'Female', or 'Other'."
        });
      }
    } else {
      gender = null;
    }

    // Status validation
    const validStatuses = ['Active', 'Inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Validation error: status must be either 'Active' or 'Inactive'."
      });
    }

    // Email format validation
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid email format.'
      });
    }

    // Hire date format validation
    if (hire_date) {
      if (!isValidDate(hire_date)) {
        return res.status(400).json({
          success: false,
          message: 'Validation error: hire_date must be in YYYY-MM-DD format.'
        });
      }
    }

    // Parameterized INSERT query
    const insertSql = `
      INSERT INTO employees (
        employee_id,
        first_name,
        last_name,
        gender,
        department,
        position,
        phone,
        email,
        hire_date,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      employee_id,
      first_name,
      last_name,
      gender,
      department,
      position,
      phone,
      email,
      hire_date,
      status
    ];

    const [result] = await db.query(insertSql, values);

    // Retrieve the newly created employee
    const [newRows] = await db.query('SELECT * FROM employees WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Employee created successfully.',
      data: formatEmployee(newRows[0])
    });
  } catch (error) {
    // Handle MySQL unique constraint violations (duplicate employee_id or email)
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      const sqlMsg = error.sqlMessage || '';
      if (sqlMsg.includes('employee_id')) {
        return res.status(409).json({
          success: false,
          message: `Conflict: An employee with employee_id '${req.body.employee_id}' already exists.`
        });
      }
      if (sqlMsg.includes('email')) {
        return res.status(409).json({
          success: false,
          message: `Conflict: An employee with email '${req.body.email}' already exists.`
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Conflict: A record with this unique employee_id or email already exists.'
      });
    }

    console.error('Error creating employee:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while creating employee.'
    });
  }
});

/**
 * 2. GET /api/employees
 * List all employees
 */
router.get('/', async (req, res) => {
  try {
    const { status, department, search } = req.query;

    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    // Optional filtering by status
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    // Optional filtering by department
    if (department) {
      query += ' AND department = ?';
      params.push(department);
    }

    // Optional search across employee_id, first_name, last_name, email
    if (search) {
      query += ' AND (employee_id LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      const term = `%${search}%`;
      params.push(term, term, term, term);
    }

    query += ' ORDER BY id ASC';

    const [rows] = await db.query(query, params);

    return res.status(200).json({
      success: true,
      count: rows.length,
      data: rows.map(formatEmployee)
    });
  } catch (error) {
    console.error('Error fetching employees:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while fetching employees.'
    });
  }
});

/**
 * 3. GET /api/employees/:id
 * Retrieve one employee by database ID or employee_id code
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await findEmployeeByIdOrCode(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with ID '${id}'.`
      });
    }

    return res.status(200).json({
      success: true,
      data: formatEmployee(employee)
    });
  } catch (error) {
    console.error('Error fetching employee:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while retrieving employee.'
    });
  }
});

/**
 * 4. PUT /api/employees/:id
 * Update employee details
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await findEmployeeByIdOrCode(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with ID '${id}'.`
      });
    }

    let {
      employee_id,
      first_name,
      last_name,
      gender,
      department,
      position,
      phone,
      email,
      hire_date,
      status
    } = req.body;

    // Fall back to existing values if not specified in request body
    const updatedEmployeeId = employee_id !== undefined ? String(employee_id).trim() : existing.employee_id;
    const updatedFirstName = first_name !== undefined ? String(first_name).trim() : existing.first_name;
    const updatedLastName = last_name !== undefined ? String(last_name).trim() : existing.last_name;
    const updatedDepartment = department !== undefined ? (department && String(department).trim() ? String(department).trim() : null) : existing.department;
    const updatedPosition = position !== undefined ? (position && String(position).trim() ? String(position).trim() : null) : existing.position;
    const updatedPhone = phone !== undefined ? (phone && String(phone).trim() ? String(phone).trim() : null) : existing.phone;
    const updatedEmail = email !== undefined ? (email && String(email).trim() ? String(email).trim() : null) : existing.email;
    const updatedHireDate = hire_date !== undefined ? (hire_date ? String(hire_date).trim() : null) : formatLocalDate(existing.hire_date);
    
    let updatedGender = gender !== undefined ? (gender && String(gender).trim() ? String(gender).trim() : null) : existing.gender;
    let updatedStatus = status !== undefined ? (status && String(status).trim() ? String(status).trim() : existing.status) : existing.status;

    // Required fields validation
    if (!updatedEmployeeId || !updatedFirstName || !updatedLastName) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: employee_id, first_name, and last_name cannot be empty.'
      });
    }

    // Gender validation
    if (updatedGender) {
      const validGenders = ['Male', 'Female', 'Other'];
      if (!validGenders.includes(updatedGender)) {
        return res.status(400).json({
          success: false,
          message: "Validation error: gender must be 'Male', 'Female', or 'Other'."
        });
      }
    }

    // Status validation
    const validStatuses = ['Active', 'Inactive'];
    if (!validStatuses.includes(updatedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Validation error: status must be either 'Active' or 'Inactive'."
      });
    }

    // Email validation
    if (updatedEmail && !isValidEmail(updatedEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: Invalid email format.'
      });
    }

    // Hire date validation
    if (updatedHireDate && !isValidDate(updatedHireDate)) {
      return res.status(400).json({
        success: false,
        message: 'Validation error: hire_date must be in YYYY-MM-DD format.'
      });
    }

    const updateSql = `
      UPDATE employees SET
        employee_id = ?,
        first_name = ?,
        last_name = ?,
        gender = ?,
        department = ?,
        position = ?,
        phone = ?,
        email = ?,
        hire_date = ?,
        status = ?
      WHERE id = ?
    `;

    const values = [
      updatedEmployeeId,
      updatedFirstName,
      updatedLastName,
      updatedGender,
      updatedDepartment,
      updatedPosition,
      updatedPhone,
      updatedEmail,
      updatedHireDate,
      updatedStatus,
      existing.id
    ];

    await db.query(updateSql, values);

    // Retrieve updated record
    const [updatedRows] = await db.query('SELECT * FROM employees WHERE id = ?', [existing.id]);

    return res.status(200).json({
      success: true,
      message: 'Employee updated successfully.',
      data: formatEmployee(updatedRows[0])
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.errno === 1062) {
      const sqlMsg = error.sqlMessage || '';
      if (sqlMsg.includes('employee_id')) {
        return res.status(409).json({
          success: false,
          message: `Conflict: An employee with employee_id '${req.body.employee_id}' already exists.`
        });
      }
      if (sqlMsg.includes('email')) {
        return res.status(409).json({
          success: false,
          message: `Conflict: An employee with email '${req.body.email}' already exists.`
        });
      }
      return res.status(409).json({
        success: false,
        message: 'Conflict: A record with this employee_id or email already exists.'
      });
    }

    console.error('Error updating employee:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating employee.'
    });
  }
});

/**
 * 5. PATCH /api/employees/:id/status
 * Activate or deactivate an employee
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await findEmployeeByIdOrCode(id);

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: `Employee not found with ID '${id}'.`
      });
    }

    let { status } = req.body;

    if (!status || typeof status !== 'string') {
      return res.status(400).json({
        success: false,
        message: "Validation error: 'status' is required and must be either 'Active' or 'Inactive'."
      });
    }

    status = status.trim();
    const validStatuses = ['Active', 'Inactive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Validation error: 'status' must be either 'Active' or 'Inactive'."
      });
    }

    await db.query('UPDATE employees SET status = ? WHERE id = ?', [status, existing.id]);

    const [updatedRows] = await db.query('SELECT * FROM employees WHERE id = ?', [existing.id]);

    return res.status(200).json({
      success: true,
      message: `Employee status successfully updated to '${status}'.`,
      data: formatEmployee(updatedRows[0])
    });
  } catch (error) {
    console.error('Error updating employee status:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while updating employee status.'
    });
  }
});

module.exports = router;
