const db = require('./db');

const createAttendanceTableSql = `
  CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL,
    attendance_date DATE NOT NULL,
    check_in TIME NULL,
    check_out TIME NULL,
    status ENUM('Present', 'Late', 'Absent', 'Leave') NOT NULL DEFAULT 'Present',
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_employee_date (employee_id, attendance_date),
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) 
      REFERENCES employees(employee_id) 
      ON UPDATE CASCADE 
      ON DELETE RESTRICT
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

const createUsersTableSql = `
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Administrator', 'HR Staff') NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    token_version INT UNSIGNED NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
`;

async function initDatabase() {
  try {
    console.log('Connecting to database and verifying attendance table...');
    await db.query(createAttendanceTableSql);
    await db.query(createUsersTableSql);
    console.log('Attendance table created or verified successfully.');
    
    const [tables] = await db.query('SHOW TABLES');
    console.log('Current database tables:', tables.map(t => Object.values(t)[0]));

    const [cols] = await db.query('DESCRIBE attendance');
    console.log('Attendance table columns:');
    cols.forEach(col => {
      console.log(` - ${col.Field} (${col.Type}) Nullable: ${col.Null} Key: ${col.Key} Default: ${col.Default}`);
    });
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

if (require.main === module) {
  initDatabase()
    .then(() => {
      console.log('DB init finished successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('DB init failed:', err.message);
      process.exit(1);
    });
}

module.exports = { initDatabase };
