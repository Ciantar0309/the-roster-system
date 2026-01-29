// backend/src/database.ts
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'rosterpro.db');
const db = new Database(dbPath);

// Helper to add column if it doesn't exist
function addColumnIfNotExists(table: string, column: string, type: string, defaultValue?: string) {
  const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  const columnExists = tableInfo.some(col => col.name === column);
  
  if (!columnExists) {
    const defaultClause = defaultValue !== undefined ? ` DEFAULT ${defaultValue}` : '';
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}${defaultClause}`).run();
    console.log(`Added column ${column} to ${table}`);
  }
}

// Initialize database
export function initializeDatabase() {
  // Create shops table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT,
      phone TEXT,
      company TEXT DEFAULT 'CMZ',
      openTime TEXT DEFAULT '06:30',
      closeTime TEXT DEFAULT '21:30',
      isActive INTEGER DEFAULT 1,
      requirements TEXT DEFAULT '[]',
      minStaffAtOpen INTEGER DEFAULT 1,
      minStaffMidday INTEGER DEFAULT 2,
      minStaffAtClose INTEGER DEFAULT 1,
      canBeSolo INTEGER DEFAULT 0,
      specialShifts TEXT DEFAULT '[]',
      fixedDaysOff TEXT DEFAULT '[]',
      specialDayRules TEXT DEFAULT '[]',
      specialRequests TEXT DEFAULT '[]',
      assignedEmployees TEXT DEFAULT '[]',
      rules TEXT,
      trimming TEXT DEFAULT '{"enabled":false,"trimAM":true,"trimPM":false,"minShiftHours":4,"trimFromStart":1,"trimFromEnd":2,"trimWhenMoreThan":2}',
      sunday TEXT DEFAULT '{"closed":false,"maxStaff":null,"customHours":{"enabled":false,"openTime":"08:00","closeTime":"13:00"}}',
      staffingConfig TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create employees table
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE,
      phone TEXT,
      company TEXT DEFAULT 'CMZ',
      employmentType TEXT DEFAULT 'full-time',
      role TEXT DEFAULT 'staff',
      weeklyHours INTEGER DEFAULT 40,
      primaryShopId INTEGER,
      secondaryShopIds TEXT DEFAULT '[]',
      isActive INTEGER DEFAULT 1,
      startDate TEXT,
      profilePhoto TEXT,
      payScaleId TEXT,
      allowanceIds TEXT DEFAULT '[]',
      emergencyContact TEXT,
      emergencyPhone TEXT,
      notes TEXT,
      excludeFromRoster INTEGER DEFAULT 0,
      hasSystemAccess INTEGER DEFAULT 0,
      systemRole TEXT,
      idNumber TEXT,
      taxNumber TEXT,
      ssnNumber TEXT,
      tcnNumber TEXT,
      tcnExpiry TEXT,
      iban TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (primaryShopId) REFERENCES shops(id)
    )
  `);

  // Create shifts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      employeeId INTEGER NOT NULL,
      employeeName TEXT,
      shopId INTEGER NOT NULL,
      shopName TEXT,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      hours REAL DEFAULT 0,
      shiftType TEXT DEFAULT 'AM',
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      isTrimmed INTEGER DEFAULT 0,
      company TEXT,
      weekStart TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      FOREIGN KEY (shopId) REFERENCES shops(id)
    )
  `);

  // Create leave_requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      employeeId INTEGER NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      type TEXT DEFAULT 'annual',
      status TEXT DEFAULT 'pending',
      reason TEXT,
      reviewedBy INTEGER,
      reviewedAt TEXT,
      reviewNotes TEXT,
      submittedAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      FOREIGN KEY (reviewedBy) REFERENCES employees(id)
    )
  `);

  // Create swap_requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS swap_requests (
      id TEXT PRIMARY KEY,
      requesterId INTEGER NOT NULL,
      targetEmployeeId INTEGER,
      requesterShiftId TEXT,
      targetShiftId TEXT,
      status TEXT DEFAULT 'pending',
      reason TEXT,
      reviewedBy INTEGER,
      reviewedAt TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requesterId) REFERENCES employees(id),
      FOREIGN KEY (targetEmployeeId) REFERENCES employees(id)
    )
  `);

  // Create profile_updates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile_updates (
      id TEXT PRIMARY KEY,
      employeeId INTEGER NOT NULL,
      employeeName TEXT,
      field TEXT,
      oldValue TEXT,
      newValue TEXT,
      changes TEXT,
      status TEXT DEFAULT 'pending',
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    )
  `);

  // Create pay_scales table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pay_scales (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      hourlyRate REAL NOT NULL,
      overtimeMultiplier REAL DEFAULT 1.5,
      weekendMultiplier REAL DEFAULT 1.25,
      holidayMultiplier REAL DEFAULT 2.0,
      company TEXT
    )
  `);

  // Create users table for authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      employeeId INTEGER,
      role TEXT DEFAULT 'employee',
      isActive INTEGER DEFAULT 1,
      inviteToken TEXT,
      inviteExpires TEXT,
      lastLogin TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    )
  `);

  // Run migrations for new columns on existing tables
  addColumnIfNotExists('shops', 'specialShifts', 'TEXT', "'[]'");
  addColumnIfNotExists('shops', 'fixedDaysOff', 'TEXT', "'[]'");
  addColumnIfNotExists('shops', 'specialDayRules', 'TEXT', "'[]'");
  addColumnIfNotExists('shops', 'specialRequests', 'TEXT', "'[]'");
  addColumnIfNotExists('shops', 'assignedEmployees', 'TEXT', "'[]'");
  addColumnIfNotExists('shops', 'rules', 'TEXT', 'NULL');
  addColumnIfNotExists('shops', 'trimming', 'TEXT', `'{"enabled":false,"trimAM":true,"trimPM":false,"minShiftHours":4,"trimFromStart":1,"trimFromEnd":2,"trimWhenMoreThan":2}'`);
  addColumnIfNotExists('shops', 'sunday', 'TEXT', `'{"closed":false,"maxStaff":null,"customHours":{"enabled":false,"openTime":"08:00","closeTime":"13:00"}}'`);
  addColumnIfNotExists('shops', 'staffingConfig', 'TEXT', 'NULL');
  
  addColumnIfNotExists('shifts', 'isTrimmed', 'INTEGER', '0');
  addColumnIfNotExists('shifts', 'hours', 'REAL', '0');
  addColumnIfNotExists('shifts', 'employeeName', 'TEXT', 'NULL');
  addColumnIfNotExists('shifts', 'shopName', 'TEXT', 'NULL');
  addColumnIfNotExists('shifts', 'company', 'TEXT', 'NULL');
  addColumnIfNotExists('shifts', 'weekStart', 'TEXT', 'NULL');

  addColumnIfNotExists('employees', 'excludeFromRoster', 'INTEGER', '0');
  addColumnIfNotExists('employees', 'hasSystemAccess', 'INTEGER', '0');
  addColumnIfNotExists('employees', 'systemRole', 'TEXT', 'NULL');
  addColumnIfNotExists('employees', 'allowanceIds', 'TEXT', "'[]'");
  addColumnIfNotExists('employees', 'idNumber', 'TEXT', 'NULL');
  addColumnIfNotExists('employees', 'taxNumber', 'TEXT', 'NULL');
  addColumnIfNotExists('employees', 'ssnNumber', 'TEXT', 'NULL');
  addColumnIfNotExists('employees', 'tcnNumber', 'TEXT', 'NULL');
  addColumnIfNotExists('employees', 'tcnExpiry', 'TEXT', 'NULL');
  addColumnIfNotExists('employees', 'iban', 'TEXT', 'NULL');

  addColumnIfNotExists('users', 'inviteToken', 'TEXT', 'NULL');
  addColumnIfNotExists('users', 'inviteExpires', 'TEXT', 'NULL');
  addColumnIfNotExists('users', 'isActive', 'INTEGER', '1');

  addColumnIfNotExists('pay_scales', 'company', 'TEXT', 'NULL');

  addColumnIfNotExists('leave_requests', 'submittedAt', 'TEXT', 'NULL');

  addColumnIfNotExists('profile_updates', 'employeeName', 'TEXT', 'NULL');
  addColumnIfNotExists('profile_updates', 'changes', 'TEXT', 'NULL');

  console.log('Database initialized successfully');
}

export default db;
