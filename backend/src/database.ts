// backend/src/database.ts
import Database from 'better-sqlite3';
import path from 'path';

// Create database file in backend folder
const dbPath = path.join(__dirname, '..', 'rosterpro.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Helper function to safely add columns (migrations)
function addColumnIfNotExists(table: string, column: string, definition: string) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    console.log(`  ✅ Added column: ${table}.${column}`);
  } catch (e: any) {
    // Column already exists - this is fine
    if (!e.message.includes('duplicate column')) {
      console.error(`  ⚠️ Error adding ${table}.${column}:`, e.message);
    }
  }
}

// Initialize tables
export function initializeDatabase() {
  console.log('🔧 Initializing database...');

  // Shops table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      company TEXT NOT NULL,
      isActive INTEGER DEFAULT 1,
      address TEXT,
      phone TEXT,
      openTime TEXT DEFAULT '06:00',
      closeTime TEXT DEFAULT '21:00',
      requirements TEXT,
      specialRequests TEXT,
      fixedDaysOff TEXT,
      specialDayRules TEXT,
      assignedEmployees TEXT,
      rules TEXT,
      minStaffAtOpen INTEGER DEFAULT 1,
      minStaffMidday INTEGER DEFAULT 1,
      minStaffAtClose INTEGER DEFAULT 1,
      canBeSolo INTEGER DEFAULT 0
    )
  `);

  // Run migrations for shops table (in case columns don't exist)
  console.log('📦 Running shop migrations...');
  addColumnIfNotExists('shops', 'fixedDaysOff', 'TEXT');
  addColumnIfNotExists('shops', 'specialDayRules', 'TEXT');
  addColumnIfNotExists('shops', 'minStaffAtOpen', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('shops', 'minStaffMidday', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('shops', 'minStaffAtClose', 'INTEGER DEFAULT 1');
  addColumnIfNotExists('shops', 'canBeSolo', 'INTEGER DEFAULT 0');

  // Employees table
  db.exec(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT NOT NULL,
      employmentType TEXT DEFAULT 'full-time',
      role TEXT DEFAULT 'sales',
      weeklyHours INTEGER DEFAULT 40,
      payScaleId INTEGER,
      allowanceIds TEXT,
      excludeFromRoster INTEGER DEFAULT 0,
      hasSystemAccess INTEGER DEFAULT 0,
      systemRole TEXT,
      primaryShopId INTEGER,
      secondaryShopIds TEXT,
      idNumber TEXT,
      taxNumber TEXT,
      ssnNumber TEXT,
      tcnNumber TEXT,
      tcnExpiry TEXT,
      iban TEXT
    )
  `);

  // Shifts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shifts (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      shopId INTEGER NOT NULL,
      shopName TEXT,
      employeeId INTEGER NOT NULL,
      employeeName TEXT,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      hours REAL,
      shiftType TEXT,
      company TEXT,
      weekStart TEXT NOT NULL
    )
  `);

  // Leave requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      employeeId INTEGER NOT NULL,
      type TEXT NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'pending',
      submittedAt TEXT,
      reviewedBy INTEGER,
      reviewedAt TEXT
    )
  `);

  // Shift swap requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS swap_requests (
      id TEXT PRIMARY KEY,
      requesterId INTEGER NOT NULL,
      requesterShiftId TEXT,
      targetEmployeeId INTEGER,
      targetShiftId TEXT,
      status TEXT DEFAULT 'pending',
      createdAt TEXT,
      reviewedBy INTEGER,
      reviewedAt TEXT
    )
  `);

  // Profile update notifications table
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile_updates (
      id TEXT PRIMARY KEY,
      employeeId INTEGER NOT NULL,
      employeeName TEXT,
      changes TEXT,
      createdAt TEXT,
      status TEXT DEFAULT 'pending'
    )
  `);

  // Pay scales table
  db.exec(`
    CREATE TABLE IF NOT EXISTS pay_scales (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      hourlyRate REAL NOT NULL,
      overtimeMultiplier REAL DEFAULT 1.5,
      company TEXT
    )
  `);

  // Users table for authentication
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
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      lastLogin TEXT,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    )
  `);

  console.log('✅ Users table ready');
  console.log('✅ Database initialized at:', dbPath);
}

// Export the database instance
export default db;
