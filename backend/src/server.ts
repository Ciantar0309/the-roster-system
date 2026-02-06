import express from 'express';
import cors from 'cors';
import { initializeDatabase } from './database';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendInviteEmail, sendLeaveStatusEmail, sendSwapStatusEmail } from './email';

const JWT_SECRET = process.env.JWT_SECRET || 'rosterpro-secret-key-change-in-production';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Initialize database on startup
initializeDatabase().then(() => {
  console.log('Database ready');
}).catch(err => {
  console.error('Database init failed:', err);
});

// ============== HEALTH CHECK ==============
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============== SHOPS ==============

app.get('/api/shops', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM shops');
    const parsed = result.rows.map((shop: any) => ({
      ...shop,
      isActive: Boolean(shop.isActive),
      requirements: shop.requirements ? JSON.parse(shop.requirements) : [],
      specialRequests: shop.specialRequests ? JSON.parse(shop.specialRequests) : [],
      fixedDaysOff: shop.fixedDaysOff ? JSON.parse(shop.fixedDaysOff) : [],
      specialDayRules: shop.specialDayRules ? JSON.parse(shop.specialDayRules) : [],
      assignedEmployees: shop.assignedEmployees ? JSON.parse(shop.assignedEmployees) : [],
      rules: shop.rules ? JSON.parse(shop.rules) : null,
      specialShifts: shop.specialShifts ? JSON.parse(shop.specialShifts) : [],
      trimming: shop.trimming ? JSON.parse(shop.trimming) : null,
      sunday: shop.sunday ? JSON.parse(shop.sunday) : null,
      staffingConfig: shop.staffingConfig ? JSON.parse(shop.staffingConfig) : null,
      minStaffAtOpen: shop.minStaffAtOpen || 1,
      minStaffMidday: shop.minStaffMidday || 1,
      minStaffAtClose: shop.minStaffAtClose || 1,
      canBeSolo: Boolean(shop.canBeSolo)
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching shops:', error);
    res.status(500).json({ error: 'Failed to fetch shops' });
  }
});

app.post('/api/shops', async (req, res) => {
  try {
    const shop = req.body;
    
    const existing = await pool.query('SELECT id FROM shops WHERE name = $1', [shop.name]);
    if (existing.rows.length > 0) {
      return res.json({ success: true, id: existing.rows[0].id, existed: true });
    }
    
    const result = await pool.query(`
      INSERT INTO shops (name, company, "isActive", address, phone, "openTime", "closeTime", 
        requirements, "specialRequests", "fixedDaysOff", "specialDayRules", "assignedEmployees", rules,
        "minStaffAtOpen", "minStaffMidday", "minStaffAtClose", "canBeSolo", "specialShifts", trimming, sunday, "staffingConfig")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING id
    `, [
      shop.name,
      shop.company,
      shop.isActive ? 1 : 0,
      shop.address || null,
      shop.phone || null,
      shop.openTime || '06:30',
      shop.closeTime || '21:30',
      JSON.stringify(shop.requirements || []),
      JSON.stringify(shop.specialRequests || []),
      JSON.stringify(shop.fixedDaysOff || []),
      JSON.stringify(shop.specialDayRules || []),
      JSON.stringify(shop.assignedEmployees || []),
      JSON.stringify(shop.rules || null),
      shop.minStaffAtOpen || 1,
      shop.minStaffMidday || 1,
      shop.minStaffAtClose || 1,
      shop.canBeSolo ? 1 : 0,
      JSON.stringify(shop.specialShifts || []),
      JSON.stringify(shop.trimming || null),
      JSON.stringify(shop.sunday || null),
      JSON.stringify(shop.staffingConfig || null)
    ]);
    res.json({ success: true, id: result.rows[0].id, shop });
  } catch (error) {
    console.error('Error creating shop:', error);
    res.status(500).json({ error: 'Failed to create shop' });
  }
});

app.patch('/api/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    const current = await pool.query('SELECT * FROM shops WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'Shop not found' });
    }
    const currentShop = current.rows[0];
    
    const shop = {
      name: updates.name ?? currentShop.name,
      company: updates.company ?? currentShop.company,
      isActive: updates.isActive !== undefined ? updates.isActive : currentShop.isActive,
      address: updates.address ?? currentShop.address,
      phone: updates.phone ?? currentShop.phone,
      openTime: updates.openTime ?? currentShop.openTime,
      closeTime: updates.closeTime ?? currentShop.closeTime,
      requirements: updates.requirements ?? (currentShop.requirements ? JSON.parse(currentShop.requirements) : []),
      specialRequests: updates.specialRequests ?? (currentShop.specialRequests ? JSON.parse(currentShop.specialRequests) : []),
      fixedDaysOff: updates.fixedDaysOff ?? (currentShop.fixedDaysOff ? JSON.parse(currentShop.fixedDaysOff) : []),
      specialDayRules: updates.specialDayRules ?? (currentShop.specialDayRules ? JSON.parse(currentShop.specialDayRules) : []),
      assignedEmployees: updates.assignedEmployees ?? (currentShop.assignedEmployees ? JSON.parse(currentShop.assignedEmployees) : []),
      rules: updates.rules ?? (currentShop.rules ? JSON.parse(currentShop.rules) : null),
      minStaffAtOpen: updates.minStaffAtOpen ?? currentShop.minStaffAtOpen,
      minStaffMidday: updates.minStaffMidday ?? currentShop.minStaffMidday,
      minStaffAtClose: updates.minStaffAtClose ?? currentShop.minStaffAtClose,
      canBeSolo: updates.canBeSolo !== undefined ? updates.canBeSolo : currentShop.canBeSolo,
      specialShifts: updates.specialShifts ?? (currentShop.specialShifts ? JSON.parse(currentShop.specialShifts) : []),
      trimming: updates.trimming ?? (currentShop.trimming ? JSON.parse(currentShop.trimming) : null),
      sunday: updates.sunday ?? (currentShop.sunday ? JSON.parse(currentShop.sunday) : null),
      staffingConfig: updates.staffingConfig ?? (currentShop.staffingConfig ? JSON.parse(currentShop.staffingConfig) : null)
    };
    
    await pool.query(`
      UPDATE shops SET 
        name = $1, company = $2, "isActive" = $3, address = $4, phone = $5, 
        "openTime" = $6, "closeTime" = $7, requirements = $8, "specialRequests" = $9, 
        "fixedDaysOff" = $10, "specialDayRules" = $11, "assignedEmployees" = $12, rules = $13,
        "minStaffAtOpen" = $14, "minStaffMidday" = $15, "minStaffAtClose" = $16, "canBeSolo" = $17,
        "specialShifts" = $18, trimming = $19, sunday = $20, "staffingConfig" = $21
      WHERE id = $22
    `, [
      shop.name,
      shop.company,
      shop.isActive ? 1 : 0,
      shop.address || null,
      shop.phone || null,
      shop.openTime || '06:30',
      shop.closeTime || '21:30',
      JSON.stringify(shop.requirements || []),
      JSON.stringify(shop.specialRequests || []),
      JSON.stringify(shop.fixedDaysOff || []),
      JSON.stringify(shop.specialDayRules || []),
      JSON.stringify(shop.assignedEmployees || []),
      JSON.stringify(shop.rules || null),
      shop.minStaffAtOpen || 1,
      shop.minStaffMidday || 1,
      shop.minStaffAtClose || 1,
      shop.canBeSolo ? 1 : 0,
      JSON.stringify(shop.specialShifts || []),
      JSON.stringify(shop.trimming || null),
      JSON.stringify(shop.sunday || null),
      JSON.stringify(shop.staffingConfig || null),
      id
    ]);
    
    res.json({ success: true, shop });
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({ error: 'Failed to update shop' });
  }
});

app.put('/api/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shop = req.body;
    
    await pool.query(`
      UPDATE shops SET 
        name = $1, company = $2, "isActive" = $3, address = $4, phone = $5, 
        "openTime" = $6, "closeTime" = $7, requirements = $8, "specialRequests" = $9, 
        "fixedDaysOff" = $10, "specialDayRules" = $11, "assignedEmployees" = $12, rules = $13,
        "minStaffAtOpen" = $14, "minStaffMidday" = $15, "minStaffAtClose" = $16, "canBeSolo" = $17,
        "specialShifts" = $18, trimming = $19, sunday = $20, "staffingConfig" = $21
      WHERE id = $22
    `, [
      shop.name,
      shop.company,
      shop.isActive ? 1 : 0,
      shop.address || null,
      shop.phone || null,
      shop.openTime || '06:30',
      shop.closeTime || '21:30',
      JSON.stringify(shop.requirements || []),
      JSON.stringify(shop.specialRequests || []),
      JSON.stringify(shop.fixedDaysOff || []),
      JSON.stringify(shop.specialDayRules || []),
      JSON.stringify(shop.assignedEmployees || []),
      JSON.stringify(shop.rules || null),
      shop.minStaffAtOpen || 1,
      shop.minStaffMidday || 1,
      shop.minStaffAtClose || 1,
      shop.canBeSolo ? 1 : 0,
      JSON.stringify(shop.specialShifts || []),
      JSON.stringify(shop.trimming || null),
      JSON.stringify(shop.sunday || null),
      JSON.stringify(shop.staffingConfig || null),
      id
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({ error: 'Failed to update shop' });
  }
});

app.delete('/api/shops/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM shops WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shop:', error);
    res.status(500).json({ error: 'Failed to delete shop' });
  }
});

// ============== EMPLOYEES ==============

app.get('/api/employees', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM employees');
    const parsed = result.rows.map((emp: any) => ({
      ...emp,
      excludeFromRoster: Boolean(emp.excludeFromRoster),
      hasSystemAccess: Boolean(emp.hasSystemAccess),
      allowanceIds: emp.allowanceIds ? JSON.parse(emp.allowanceIds) : [],
      secondaryShopIds: emp.secondaryShopIds ? JSON.parse(emp.secondaryShopIds) : []
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees' });
  }
});

app.post('/api/employees', async (req, res) => {
  try {
    const emp = req.body;
    const result = await pool.query(`
      INSERT INTO employees (name, email, phone, company, "employmentType", role, "weeklyHours", "payScaleId", "allowanceIds", "excludeFromRoster", "hasSystemAccess", "systemRole", "primaryShopId", "secondaryShopIds", "idNumber", "taxNumber", "ssnNumber", "tcnNumber", "tcnExpiry", iban)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING id
    `, [
      emp.name,
      emp.email || null,
      emp.phone || null,
      emp.company,
      emp.employmentType || 'full-time',
      emp.role || 'sales',
      emp.weeklyHours || 40,
      emp.payScaleId || null,
      JSON.stringify(emp.allowanceIds || []),
      emp.excludeFromRoster ? 1 : 0,
      emp.hasSystemAccess ? 1 : 0,
      emp.systemRole || null,
      emp.primaryShopId || null,
      JSON.stringify(emp.secondaryShopIds || []),
      emp.idNumber || null,
      emp.taxNumber || null,
      emp.ssnNumber || null,
      emp.tcnNumber || null,
      emp.tcnExpiry || null,
      emp.iban || null
    ]);
    res.json({ success: true, employee: { ...emp, id: result.rows[0].id } });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

app.patch('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const emp = req.body;
    
    await pool.query(`
      UPDATE employees SET 
        name = $1, email = $2, phone = $3, company = $4, "employmentType" = $5, 
        role = $6, "weeklyHours" = $7, "payScaleId" = $8, "allowanceIds" = $9,
        "excludeFromRoster" = $10, "hasSystemAccess" = $11, "systemRole" = $12,
        "primaryShopId" = $13, "secondaryShopIds" = $14, "idNumber" = $15, "taxNumber" = $16,
        "ssnNumber" = $17, "tcnNumber" = $18, "tcnExpiry" = $19, iban = $20
      WHERE id = $21
    `, [
      emp.name,
      emp.email || null,
      emp.phone || null,
      emp.company,
      emp.employmentType || 'full-time',
      emp.role || 'sales',
      emp.weeklyHours || 40,
      emp.payScaleId || null,
      JSON.stringify(emp.allowanceIds || []),
      emp.excludeFromRoster ? 1 : 0,
      emp.hasSystemAccess ? 1 : 0,
      emp.systemRole || null,
      emp.primaryShopId || null,
      JSON.stringify(emp.secondaryShopIds || []),
      emp.idNumber || null,
      emp.taxNumber || null,
      emp.ssnNumber || null,
      emp.tcnNumber || null,
      emp.tcnExpiry || null,
      emp.iban || null,
      id
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM employees WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// ============== ROSTER SOLVE ==============

app.post('/api/roster/solve', async (req, res) => {
  try {
    console.log('\n========================================');
    console.log('ROSTER SOLVE REQUEST');
    console.log('========================================');
    
    const shopsResult = await pool.query('SELECT * FROM shops WHERE "isActive" = 1');
    const employeesResult = await pool.query('SELECT * FROM employees');
    const leaveResult = await pool.query("SELECT * FROM leave_requests WHERE status = 'approved'");
    
    const parsedShops = shopsResult.rows.map((shop: any) => {
      const staffingConfig = shop.staffingConfig ? JSON.parse(shop.staffingConfig) : null;
      return {
        id: shop.id,
        name: shop.name,
        company: shop.company,
        openTime: shop.openTime,
        closeTime: shop.closeTime,
        isActive: Boolean(shop.isActive),
        canBeSolo: Boolean(shop.canBeSolo),
        staffingConfig: staffingConfig,
        requirements: shop.requirements ? JSON.parse(shop.requirements) : [],
        specialRequests: shop.specialRequests ? JSON.parse(shop.specialRequests) : [],
        fixedDaysOff: shop.fixedDaysOff ? JSON.parse(shop.fixedDaysOff) : [],
        specialDayRules: shop.specialDayRules ? JSON.parse(shop.specialDayRules) : [],
        assignedEmployees: shop.assignedEmployees ? JSON.parse(shop.assignedEmployees) : [],
        rules: shop.rules ? JSON.parse(shop.rules) : null,
        specialShifts: shop.specialShifts ? JSON.parse(shop.specialShifts) : [],
        trimming: shop.trimming ? JSON.parse(shop.trimming) : null,
        sunday: shop.sunday ? JSON.parse(shop.sunday) : null
      };
    });
    
    const parsedEmployees = employeesResult.rows.map((emp: any) => ({
      ...emp,
      excludeFromRoster: Boolean(emp.excludeFromRoster),
      allowanceIds: emp.allowanceIds ? JSON.parse(emp.allowanceIds) : [],
      secondaryShopIds: emp.secondaryShopIds ? JSON.parse(emp.secondaryShopIds) : [],
      fixedDaysOff: emp.fixedDaysOff ? JSON.parse(emp.fixedDaysOff) : []
    }));
    
    const payload = {
      weekStart: req.body.weekStart || new Date().toISOString().split('T')[0],
      employees: parsedEmployees,
      shops: parsedShops,
      leaveRequests: leaveResult.rows,
      excludedEmployeeIds: req.body.excludedEmployeeIds || [],
      amOnlyEmployees: req.body.amOnlyEmployees || [],
      fixedDaysOff: req.body.fixedDaysOff || {},
      previousWeekSundayShifts: req.body.previousWeekSundayShifts || []
    };
    
    console.log(`Sending to Python solver: ${parsedShops.length} shops, ${parsedEmployees.length} employees`);
    
    const response = await fetch(`${process.env.SOLVER_URL || 'http://127.0.0.1:3002'}/api/roster/solve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const result = await response.json() as any;
    console.log(`Solver response: ${result.status}, ${result.shifts?.length || 0} shifts`);
    
    res.json(result);
  } catch (error: any) {
    console.error('Roster solve error:', error);
    res.status(500).json({ 
      error: 'Failed to generate roster', 
      details: error.message,
      shifts: [],
      employee_hours: {}
    });
  }
});

// ============== ROSTER/SHIFTS ==============

app.get('/api/roster/generate', (req, res) => {
  res.json({ shifts: [], message: 'Use /api/roster/solve instead' });
});

app.post('/api/roster/save', async (req, res) => {
  try {
    const { weekStart, shifts } = req.body;
    
    await pool.query('DELETE FROM shifts WHERE "weekStart" = $1', [weekStart]);
    
    for (const shift of shifts) {
      await pool.query(`
        INSERT INTO shifts (id, date, "shopId", "shopName", "employeeId", "employeeName", "startTime", "endTime", hours, "shiftType", company, "weekStart")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        shift.id,
        shift.date,
        shift.shopId,
        shift.shopName || '',
        shift.employeeId,
        shift.employeeName || '',
        shift.startTime,
        shift.endTime,
        shift.hours || 0,
        shift.shiftType || '',
        shift.company || '',
        weekStart
      ]);
    }
    
    console.log(`Saved ${shifts.length} shifts for week ${weekStart}`);
    res.json({ success: true, count: shifts.length });
  } catch (error) {
    console.error('Error saving roster:', error);
    res.status(500).json({ error: 'Failed to save roster' });
  }
});

app.get('/api/roster/load', async (req, res) => {
  try {
    const { weekStart } = req.query;
    const result = await pool.query('SELECT * FROM shifts WHERE "weekStart" = $1', [weekStart]);
    console.log(`Loaded ${result.rows.length} shifts for week ${weekStart}`);
    res.json({ shifts: result.rows });
  } catch (error) {
    console.error('Error loading roster:', error);
    res.status(500).json({ error: 'Failed to load roster' });
  }
});

app.delete('/api/roster/:weekStart', async (req, res) => {
  try {
    const { weekStart } = req.params;
    const result = await pool.query('DELETE FROM shifts WHERE "weekStart" = $1', [weekStart]);
    console.log(`Deleted shifts for week ${weekStart}`);
    res.json({ success: true, deleted: result.rowCount });
  } catch (error) {
    console.error('Error deleting roster:', error);
    res.status(500).json({ error: 'Failed to delete roster' });
  }
});

app.get('/api/roster/list', async (req, res) => {
  try {
    const result = await pool.query('SELECT DISTINCT "weekStart", COUNT(*) as "shiftCount" FROM shifts GROUP BY "weekStart" ORDER BY "weekStart" DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error listing rosters:', error);
    res.status(500).json({ error: 'Failed to list rosters' });
  }
});

app.patch('/api/roster/shift/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const shift = req.body;
    
    await pool.query(`
      UPDATE shifts SET 
        date = $1, "shopId" = $2, "shopName" = $3, "employeeId" = $4, "employeeName" = $5,
        "startTime" = $6, "endTime" = $7, hours = $8, "shiftType" = $9, company = $10
      WHERE id = $11
    `, [
      shift.date,
      shift.shopId,
      shift.shopName || '',
      shift.employeeId,
      shift.employeeName || '',
      shift.startTime,
      shift.endTime,
      shift.hours || 0,
      shift.shiftType || '',
      shift.company || '',
      id
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

app.post('/api/roster/shift', async (req, res) => {
  try {
    const shift = req.body;
    
    await pool.query(`
      INSERT INTO shifts (id, date, "shopId", "shopName", "employeeId", "employeeName", "startTime", "endTime", hours, "shiftType", company, "weekStart")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      shift.id,
      shift.date,
      shift.shopId,
      shift.shopName || '',
      shift.employeeId,
      shift.employeeName || '',
      shift.startTime,
      shift.endTime,
      shift.hours || 0,
      shift.shiftType || '',
      shift.company || '',
      shift.weekStart
    ]);
    res.json({ success: true, shift });
  } catch (error) {
    console.error('Error adding shift:', error);
    res.status(500).json({ error: 'Failed to add shift' });
  }
});

app.delete('/api/roster/shift/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM shifts WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

// ============== LEAVE REQUESTS ==============

app.get('/api/leave', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM leave_requests ORDER BY "submittedAt" DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

app.post('/api/leave', async (req, res) => {
  try {
    const request = req.body;
    
    await pool.query(`
      INSERT INTO leave_requests (id, "employeeId", type, "startDate", "endDate", reason, status, "submittedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      request.id,
      request.employeeId,
      request.type,
      request.startDate,
      request.endDate,
      request.reason || null,
      request.status || 'pending',
      request.submittedAt || new Date().toISOString()
    ]);
    res.json({ success: true, request });
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

app.patch('/api/leave/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy } = req.body;
    
    await pool.query(`
      UPDATE leave_requests SET status = $1, "reviewedBy" = $2, "reviewedAt" = $3 WHERE id = $4
    `, [status, reviewedBy || null, new Date().toISOString(), id]);
    
    if (status === 'approved' || status === 'rejected') {
      const leaveResult = await pool.query(`
        SELECT lr.*, e.name as "employeeName", e.email as "employeeEmail"
        FROM leave_requests lr
        JOIN employees e ON lr."employeeId" = e.id
        WHERE lr.id = $1
      `, [id]);

      const leave = leaveResult.rows[0];
      if (leave?.employeeEmail) {
        await sendLeaveStatusEmail(
          leave.employeeEmail,
          leave.employeeName,
          status,
          leave.type,
          leave.startDate,
          leave.endDate
        );
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating leave request:', error);
    res.status(500).json({ error: 'Failed to update leave request' });
  }
});

app.delete('/api/leave/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM leave_requests WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting leave request:', error);
    res.status(500).json({ error: 'Failed to delete leave request' });
  }
});

// ============== SWAP REQUESTS ==============

app.get('/api/swaps', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM swap_requests ORDER BY "createdAt" DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching swap requests:', error);
    res.status(500).json({ error: 'Failed to fetch swap requests' });
  }
});

app.post('/api/swaps', async (req, res) => {
  try {
    const request = req.body;
    
    await pool.query(`
      INSERT INTO swap_requests (id, "requesterId", "requesterShiftId", "targetEmployeeId", "targetShiftId", status, "createdAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      request.id,
      request.requesterId,
      request.requesterShiftId || null,
      request.targetEmployeeId || null,
      request.targetShiftId || null,
      request.status || 'pending',
      request.createdAt || new Date().toISOString()
    ]);
    res.json({ success: true, request });
  } catch (error) {
    console.error('Error creating swap request:', error);
    res.status(500).json({ error: 'Failed to create swap request' });
  }
});

app.patch('/api/swaps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy } = req.body;
    
    await pool.query(`
      UPDATE swap_requests SET status = $1, "reviewedBy" = $2, "reviewedAt" = $3 WHERE id = $4
    `, [status, reviewedBy || null, new Date().toISOString(), id]);
    
    if (status === 'approved' || status === 'rejected') {
      const swapResult = await pool.query(`
        SELECT sr.*, 
          e1.name as "requesterName", e1.email as "requesterEmail",
          e2.name as "targetName"
        FROM swap_requests sr
        JOIN employees e1 ON sr."requesterId" = e1.id
        LEFT JOIN employees e2 ON sr."targetEmployeeId" = e2.id
        WHERE sr.id = $1
      `, [id]);

      const swap = swapResult.rows[0];
      if (swap?.requesterEmail) {
        await sendSwapStatusEmail(
          swap.requesterEmail,
          swap.requesterName,
          status,
          swap.requesterShiftId || 'N/A',
          swap.targetName || 'N/A'
        );
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating swap request:', error);
    res.status(500).json({ error: 'Failed to update swap request' });
  }
});

// ============== PROFILE UPDATES ==============

app.get('/api/profile-updates', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM profile_updates ORDER BY "createdAt" DESC');
    const parsed = result.rows.map((u: any) => ({
      ...u,
      changes: u.changes ? JSON.parse(u.changes) : {}
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching profile updates:', error);
    res.status(500).json({ error: 'Failed to fetch profile updates' });
  }
});

app.post('/api/profile-updates', async (req, res) => {
  try {
    const notification = req.body;
    
    await pool.query(`
      INSERT INTO profile_updates (id, "employeeId", "employeeName", changes, "createdAt", status)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      notification.id,
      notification.employeeId,
      notification.employeeName,
      JSON.stringify(notification.changes || {}),
      notification.createdAt || new Date().toISOString(),
      notification.status || 'pending'
    ]);
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error creating profile update:', error);
    res.status(500).json({ error: 'Failed to create profile update' });
  }
});

app.patch('/api/profile-updates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    await pool.query('UPDATE profile_updates SET status = $1 WHERE id = $2', [status, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating profile update:', error);
    res.status(500).json({ error: 'Failed to update profile update' });
  }
});

// ============== PAY SCALES ==============

app.get('/api/payscales', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM pay_scales');
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching pay scales:', error);
    res.status(500).json({ error: 'Failed to fetch pay scales' });
  }
});

app.post('/api/payscales', async (req, res) => {
  try {
    const scale = req.body;
    
    await pool.query(`
      INSERT INTO pay_scales (id, name, "hourlyRate", "overtimeMultiplier", company)
      VALUES ($1, $2, $3, $4, $5)
    `, [scale.id, scale.name, scale.hourlyRate, scale.overtimeMultiplier || 1.5, scale.company || null]);
    res.json({ success: true, scale });
  } catch (error) {
    console.error('Error creating pay scale:', error);
    res.status(500).json({ error: 'Failed to create pay scale' });
  }
});

app.patch('/api/payscales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const scale = req.body;
    
    await pool.query(`
      UPDATE pay_scales SET name = $1, "hourlyRate" = $2, "overtimeMultiplier" = $3, company = $4 WHERE id = $5
    `, [scale.name, scale.hourlyRate, scale.overtimeMultiplier || 1.5, scale.company || null, id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating pay scale:', error);
    res.status(500).json({ error: 'Failed to update pay scale' });
  }
});

app.delete('/api/payscales/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM pay_scales WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pay scale:', error);
    res.status(500).json({ error: 'Failed to delete pay scale' });
  }
});

// ============== USERS MANAGEMENT ==============

app.get('/api/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT u.id, u.email, u.role, u."employeeId", u."isActive", u."lastLogin", u."createdAt",
             u."inviteToken", u."inviteExpires",
             e.name as "employeeName", e.company
      FROM users u
      LEFT JOIN employees e ON u."employeeId" = e.id
      ORDER BY u."createdAt" DESC
    `);
    
    const parsed = result.rows.map((u: any) => ({
      ...u,
      isActive: Boolean(u.isActive),
      isPending: !u.isActive && u.inviteToken !== null,
      status: !u.isActive && u.inviteToken ? 'pending' : (u.isActive ? 'active' : 'inactive')
    }));
    
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.patch('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, isActive, employeeId } = req.body;
    
    const current = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (current.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    const currentUser = current.rows[0];
    
    await pool.query(`
      UPDATE users SET role = $1, "isActive" = $2, "employeeId" = $3 WHERE id = $4
    `, [
      role ?? currentUser.role,
      isActive !== undefined ? (isActive ? 1 : 0) : currentUser.isActive,
      employeeId !== undefined ? employeeId : currentUser.employeeId,
      id
    ]);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.post('/api/users/:id/resend-invite', async (req, res) => {
  try {
    const { id } = req.params;
    const userResult = await pool.query(`
      SELECT u.*, e.name as "employeeName" 
      FROM users u 
      LEFT JOIN employees e ON u."employeeId" = e.id 
      WHERE u.id = $1
    `, [id]);
    
    const user = userResult.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.isActive) {
      return res.status(400).json({ error: 'User already active' });
    }
    
    const crypto = require('crypto');
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    await pool.query('UPDATE users SET "inviteToken" = $1, "inviteExpires" = $2 WHERE id = $3', [inviteToken, inviteExpires, id]);
    
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${inviteToken}`;
    await sendInviteEmail(user.email, inviteLink, user.employeeName);
    
    res.json({ success: true, inviteLink });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Failed to resend invite' });
  }
});

// ============== AUTHENTICATION ==============

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, employeeId, role } = req.body;
    
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(`
      INSERT INTO users (email, password, "employeeId", role, "isActive")
      VALUES ($1, $2, $3, $4, 1)
      RETURNING id
    `, [email, hashedPassword, employeeId || null, role || 'employee']);
    
    console.log('User registered:', email);
    res.json({ success: true, userId: result.rows[0].id });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query(`
      SELECT u.*, e.name as "employeeName", e.company 
      FROM users u 
      LEFT JOIN employees e ON u."employeeId" = e.id 
      WHERE u.email = $1
    `, [email]);
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    await pool.query('UPDATE users SET "lastLogin" = $1 WHERE id = $2', [new Date().toISOString(), user.id]);
    
    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        employeeId: user.employeeId 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('User logged in:', email);
    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId,
        employeeName: user.employeeName,
        company: user.company
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const result = await pool.query(`
      SELECT u.id, u.email, u.role, u."employeeId", e.name as "employeeName", e.company
      FROM users u
      LEFT JOIN employees e ON u."employeeId" = e.id
      WHERE u.id = $1
    `, [decoded.userId]);
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

app.post('/api/auth/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const { currentPassword, newPassword } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    const user = result.rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
    
    console.log('Password changed for:', user.email);
    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// ============== INVITE SYSTEM ==============

app.post('/api/auth/invite', async (req, res) => {
  try {
    const { email, employeeId, role } = req.body;
    
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    
    const crypto = require('crypto');
    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    const result = await pool.query(`
      INSERT INTO users (email, password, "employeeId", role, "isActive", "inviteToken", "inviteExpires")
      VALUES ($1, '', $2, $3, 0, $4, $5)
      RETURNING id
    `, [email, employeeId || null, role || 'employee', inviteToken, inviteExpires]);
    
    const inviteLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/invite/${inviteToken}`;
    
    console.log('Invite created for:', email);
    console.log('Invite link:', inviteLink);
    
    let employeeName = null;
    if (employeeId) {
      const empResult = await pool.query('SELECT name FROM employees WHERE id = $1', [employeeId]);
      employeeName = empResult.rows[0]?.name;
    }
    await sendInviteEmail(email, inviteLink, employeeName);
    
    res.json({ 
      success: true, 
      userId: result.rows[0].id,
      inviteToken,
      inviteLink
    });
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

app.get('/api/auth/invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await pool.query(`
      SELECT u.*, e.name as "employeeName" 
      FROM users u 
      LEFT JOIN employees e ON u."employeeId" = e.id 
      WHERE u."inviteToken" = $1
    `, [token]);
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'Invalid invite token' });
    }
    
    if (new Date(user.inviteExpires) < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }
    
    res.json({
      email: user.email,
      employeeName: user.employeeName,
      role: user.role
    });
  } catch (error) {
    console.error('Invite verification error:', error);
    res.status(500).json({ error: 'Failed to verify invite' });
  }
});
// Alias for frontend compatibility
app.get('/api/auth/verify-invite/:token', async (req, res) => {
  try {
    const { token } = req.params;
    
    const result = await pool.query(`
      SELECT u.*, e.name as "employeeName"
      FROM users u
      LEFT JOIN employees e ON u."employeeId" = e.id
      WHERE u."inviteToken" = $1
    `, [token]);
    
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'Invalid invite token' });
    }
    
    if (new Date(user.inviteExpires) < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }
    
    res.json({
      email: user.email,
      employeeName: user.employeeName,
      role: user.role
    });
  } catch (error) {
    console.error('Verify invite error:', error);
    res.status(500).json({ error: 'Failed to verify invite' });
  }
});


app.post('/api/auth/accept-invite', async (req, res) => {
  try {
    const { token, password } = req.body;
    
    const result = await pool.query('SELECT * FROM users WHERE "inviteToken" = $1', [token]);
    const user = result.rows[0];
    
    if (!user) {
      return res.status(404).json({ error: 'Invalid invite token' });
    }
    
    if (new Date(user.inviteExpires) < new Date()) {
      return res.status(400).json({ error: 'Invite has expired' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    await pool.query(`
      UPDATE users SET password = $1, "isActive" = 1, "inviteToken" = NULL, "inviteExpires" = NULL WHERE id = $2
    `, [hashedPassword, user.id]);
    
    const jwtToken = jwt.sign(
      { 
        userId: user.id, 
        email: user.email, 
        role: user.role,
        employeeId: user.employeeId 
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    console.log('Invite accepted for:', user.email);
    res.json({
      success: true,
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employeeId: user.employeeId
      }
    });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to accept invite' });
  }
});

// ============== SEED DATA ==============

app.post('/api/seed', async (req, res) => {
  try {
    const countResult = await pool.query('SELECT COUNT(*) as count FROM shops');
    if (parseInt(countResult.rows[0].count) > 0) {
      return res.json({ message: 'Database already has data', shops: countResult.rows[0].count });
    }

    const shops = [
      { id: 1, name: 'Hamrun', company: 'CS', isActive: 1, openTime: '06:30', closeTime: '21:30' },
      { id: 2, name: 'Tigne Point', company: 'CS', isActive: 1, openTime: '10:00', closeTime: '20:00' },
      { id: 3, name: 'Siggiewi', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '18:00' },
      { id: 4, name: 'Marsaxlokk', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '17:00' },
      { id: 5, name: 'Marsascala', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '18:00' },
      { id: 6, name: 'Mellieha', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '18:00' },
      { id: 7, name: 'Rabat', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '18:00' },
      { id: 8, name: 'Fgura', company: 'CMZ', isActive: 1, openTime: '09:00', closeTime: '19:00' },
      { id: 9, name: 'Carters', company: 'CMZ', isActive: 1, openTime: '09:00', closeTime: '19:00' },
      { id: 10, name: 'Zabbar', company: 'CMZ', isActive: 1, openTime: '09:00', closeTime: '18:00' }
    ];

    for (const shop of shops) {
      await pool.query(`
        INSERT INTO shops (name, company, "isActive", "openTime", "closeTime", requirements, "specialRequests", "assignedEmployees", rules, "staffingConfig")
        VALUES ($1, $2, $3, $4, $5, '[]', '[]', '[]', NULL, NULL)
      `, [shop.name, shop.company, shop.isActive, shop.openTime, shop.closeTime]);
    }

    console.log('Database seeded with initial data');
    res.json({ success: true, message: 'Database seeded', shops: shops.length });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

// ============== START SERVER ==============

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`RosterPro API Server running on port ${PORT}`);
  console.log(`========================================`);
  console.log(`API Base URL: http://localhost:${PORT}/api`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`========================================\n`);
});
