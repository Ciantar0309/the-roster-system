// backend/src/database.ts
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Simple wrapper that mimics better-sqlite3 sync API but actually runs async
// This is a hack but keeps server.ts changes minimal
class Database {
  prepare(sql: string) {
    // Convert ? to $1, $2, etc for postgres
    let paramIndex = 0;
    const pgSql = sql.replace(/\?/g, () => `$${++paramIndex}`);
    
    return {
      run: (...params: any[]) => {
        return pool.query(pgSql, params).then(r => ({ 
          changes: r.rowCount, 
          lastInsertRowid: r.rows[0]?.id 
        }));
      },
      get: (...params: any[]) => {
        return pool.query(pgSql, params).then(r => r.rows[0]);
      },
      all: (...params: any[]) => {
        return pool.query(pgSql, params).then(r => r.rows);
      }
    };
  }
  
  exec(sql: string) {
    return pool.query(sql);
  }
  
  transaction(fn: (items: any[]) => void) {
    return async (items: any[]) => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        for (const item of items) {
          await fn([item]);
        }
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    };
  }
}

const db = new Database();

export async function initializeDatabase() {
  try {
    // Create tables with Postgres syntax
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shops (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        address TEXT,
        phone TEXT,
        company TEXT DEFAULT 'CMZ',
        "openTime" TEXT DEFAULT '06:30',
        "closeTime" TEXT DEFAULT '21:30',
        "isActive" INTEGER DEFAULT 1,
        requirements TEXT DEFAULT '[]',
        "minStaffAtOpen" INTEGER DEFAULT 1,
        "minStaffMidday" INTEGER DEFAULT 2,
        "minStaffAtClose" INTEGER DEFAULT 1,
        "canBeSolo" INTEGER DEFAULT 0,
        "specialShifts" TEXT DEFAULT '[]',
        "fixedDaysOff" TEXT DEFAULT '[]',
        "specialDayRules" TEXT DEFAULT '[]',
        "specialRequests" TEXT DEFAULT '[]',
        "assignedEmployees" TEXT DEFAULT '[]',
        rules TEXT,
        trimming TEXT,
        sunday TEXT,
        "staffingConfig" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS employees (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT,
        phone TEXT,
        company TEXT DEFAULT 'CMZ',
        "employmentType" TEXT DEFAULT 'full-time',
        role TEXT DEFAULT 'staff',
        "weeklyHours" INTEGER DEFAULT 40,
        "primaryShopId" INTEGER,
        "secondaryShopIds" TEXT DEFAULT '[]',
        "isActive" INTEGER DEFAULT 1,
        "startDate" TEXT,
        "profilePhoto" TEXT,
        "payScaleId" TEXT,
        "allowanceIds" TEXT DEFAULT '[]',
        "emergencyContact" TEXT,
        "emergencyPhone" TEXT,
        notes TEXT,
        "excludeFromRoster" INTEGER DEFAULT 0,
        "hasSystemAccess" INTEGER DEFAULT 0,
        "systemRole" TEXT,
        "idNumber" TEXT,
        "taxNumber" TEXT,
        "ssnNumber" TEXT,
        "tcnNumber" TEXT,
        "tcnExpiry" TEXT,
        iban TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS shifts (
        id TEXT PRIMARY KEY,
        "employeeId" INTEGER NOT NULL,
        "employeeName" TEXT,
        "shopId" INTEGER NOT NULL,
        "shopName" TEXT,
        date TEXT NOT NULL,
        "startTime" TEXT NOT NULL,
        "endTime" TEXT NOT NULL,
        hours REAL DEFAULT 0,
        "shiftType" TEXT DEFAULT 'AM',
        status TEXT DEFAULT 'scheduled',
        notes TEXT,
        "isTrimmed" INTEGER DEFAULT 0,
        company TEXT,
        "weekStart" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id TEXT PRIMARY KEY,
        "employeeId" INTEGER NOT NULL,
        "startDate" TEXT NOT NULL,
        "endDate" TEXT NOT NULL,
        type TEXT DEFAULT 'annual',
        status TEXT DEFAULT 'pending',
        reason TEXT,
        "reviewedBy" INTEGER,
        "reviewedAt" TEXT,
        "reviewNotes" TEXT,
        "submittedAt" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS swap_requests (
        id TEXT PRIMARY KEY,
        "requesterId" INTEGER NOT NULL,
        "targetEmployeeId" INTEGER,
        "requesterShiftId" TEXT,
        "targetShiftId" TEXT,
        status TEXT DEFAULT 'pending',
        reason TEXT,
        "reviewedBy" INTEGER,
        "reviewedAt" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS profile_updates (
        id TEXT PRIMARY KEY,
        "employeeId" INTEGER NOT NULL,
        "employeeName" TEXT,
        field TEXT,
        "oldValue" TEXT,
        "newValue" TEXT,
        changes TEXT,
        status TEXT DEFAULT 'pending',
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS pay_scales (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        "hourlyRate" REAL NOT NULL,
        "overtimeMultiplier" REAL DEFAULT 1.5,
        "weekendMultiplier" REAL DEFAULT 1.25,
        "holidayMultiplier" REAL DEFAULT 2.0,
        company TEXT
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        "employeeId" INTEGER,
        role TEXT DEFAULT 'employee',
        "isActive" INTEGER DEFAULT 1,
        "inviteToken" TEXT,
        "inviteExpires" TEXT,
        "lastLogin" TEXT,
        "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
}

export default db;
