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
      trimming TEXT DEFAULT '{"enabled":false,"trimAM":true,"trimPM":false,"minShiftHours":4,"trimFromStart":1,"trimFromEnd":2,"trimWhenMoreThan":2}',
      sunday TEXT DEFAULT '{"closed":false,"maxStaff":null,"customHours":{"enabled":false,"openTime":"08:00","closeTime":"13:00"}}',
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
      role TEXT DEFAULT 'barista',
      weeklyHours INTEGER DEFAULT 40,
      primaryShopId INTEGER,
      secondaryShopIds TEXT DEFAULT '[]',
      isActive INTEGER DEFAULT 1,
      startDate TEXT,
      profilePhoto TEXT,
      payScaleId TEXT,
      allowances TEXT DEFAULT '[]',
      emergencyContact TEXT,
      emergencyPhone TEXT,
      notes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (primaryShopId) REFERENCES shops(id)
    )
  `);

  // Create shifts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId INTEGER NOT NULL,
      shopId INTEGER NOT NULL,
      date TEXT NOT NULL,
      startTime TEXT NOT NULL,
      endTime TEXT NOT NULL,
      shiftType TEXT DEFAULT 'AM',
      status TEXT DEFAULT 'scheduled',
      notes TEXT,
      isTrimmed INTEGER DEFAULT 0,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      updatedAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      FOREIGN KEY (shopId) REFERENCES shops(id)
    )
  `);

  // Create leave_requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId INTEGER NOT NULL,
      startDate TEXT NOT NULL,
      endDate TEXT NOT NULL,
      type TEXT DEFAULT 'annual',
      status TEXT DEFAULT 'pending',
      reason TEXT,
      reviewedBy INTEGER,
      reviewedAt TEXT,
      reviewNotes TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employeeId) REFERENCES employees(id),
      FOREIGN KEY (reviewedBy) REFERENCES employees(id)
    )
  `);

  // Create swap_requests table
  db.exec(`
    CREATE TABLE IF NOT EXISTS swap_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requesterId INTEGER NOT NULL,
      targetId INTEGER NOT NULL,
      requesterShiftId INTEGER NOT NULL,
      targetShiftId INTEGER NOT NULL,
      status TEXT DEFAULT 'pending',
      reason TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (requesterId) REFERENCES employees(id),
      FOREIGN KEY (targetId) REFERENCES employees(id),
      FOREIGN KEY (requesterShiftId) REFERENCES shifts(id),
      FOREIGN KEY (targetShiftId) REFERENCES shifts(id)
    )
  `);

  // Create profile_updates table
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile_updates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employeeId INTEGER NOT NULL,
      field TEXT NOT NULL,
      oldValue TEXT,
      newValue TEXT,
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
      holidayMultiplier REAL DEFAULT 2.0
    )
  `);

  // Create users table for authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      employeeId INTEGER,
      role TEXT DEFAULT 'barista',
      lastLogin TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employeeId) REFERENCES employees(id)
    )
  `);

  // Run migrations for new columns
  addColumnIfNotExists('shops', 'specialShifts', 'TEXT', "'[]'");
  addColumnIfNotExists('shops', 'fixedDaysOff', 'TEXT', "'[]'");
  addColumnIfNotExists('shops', 'specialDayRules', 'TEXT', "'[]'");
  addColumnIfNotExists('shops', 'specialRequests', 'TEXT', "'[]'");
  addColumnIfNotExists('shops', 'trimming', 'TEXT', `'{"enabled":false,"trimAM":true,"trimPM":false,"minShiftHours":4,"trimFromStart":1,"trimFromEnd":2,"trimWhenMoreThan":2}'`);
  addColumnIfNotExists('shops', 'sunday', 'TEXT', `'{"closed":false,"maxStaff":null,"customHours":{"enabled":false,"openTime":"08:00","closeTime":"13:00"}}'`);
  addColumnIfNotExists('shifts', 'isTrimmed', 'INTEGER', '0');

  console.log('Database initialized successfully');
}

export default db;
