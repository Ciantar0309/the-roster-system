import express from 'express';
import cors from 'cors';
import db, { initializeDatabase } from './database';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { sendInviteEmail, sendLeaveStatusEmail, sendSwapStatusEmail } from './email';


const JWT_SECRET = process.env.JWT_SECRET || 'rosterpro-secret-key-change-in-production';


const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Initialize database on startup
initializeDatabase();

// ============== SHOPS ==============

// Get all shops
app.get('/api/shops', (req, res) => {
  try {
    const shops = db.prepare('SELECT * FROM shops').all();
    const parsed = shops.map((shop: any) => ({
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

// Create shop
app.post('/api/shops', (req, res) => {
  try {
    const shop = req.body;
    const stmt = db.prepare(`
      INSERT INTO shops (name, company, isActive, address, phone, openTime, closeTime, 
        requirements, specialRequests, fixedDaysOff, specialDayRules, assignedEmployees, rules,
        minStaffAtOpen, minStaffMidday, minStaffAtClose, canBeSolo, specialShifts, trimming, sunday)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(
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
      JSON.stringify(shop.sunday || null)
    );
    res.json({ success: true, id: result.lastInsertRowid, shop });
  } catch (error) {
    console.error('Error creating shop:', error);
    res.status(500).json({ error: 'Failed to create shop' });
  }
});

// Update shop (PATCH)
app.patch('/api/shops/:id', (req, res) => {
  try {
    const { id } = req.params;
    const shop = req.body;
    const stmt = db.prepare(`
      UPDATE shops SET 
        name = ?, company = ?, isActive = ?, address = ?, phone = ?, 
        openTime = ?, closeTime = ?, requirements = ?, specialRequests = ?, 
        fixedDaysOff = ?, specialDayRules = ?, assignedEmployees = ?, rules = ?,
        minStaffAtOpen = ?, minStaffMidday = ?, minStaffAtClose = ?, canBeSolo = ?,
        specialShifts = ?, trimming = ?, sunday = ?
      WHERE id = ?
    `);
    stmt.run(
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
      id
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({ error: 'Failed to update shop' });
  }
});

// Update shop (PUT) - same as PATCH
app.put('/api/shops/:id', (req, res) => {
  try {
    const { id } = req.params;
    const shop = req.body;
    const stmt = db.prepare(`
      UPDATE shops SET 
        name = ?, company = ?, isActive = ?, address = ?, phone = ?, 
        openTime = ?, closeTime = ?, requirements = ?, specialRequests = ?, 
        fixedDaysOff = ?, specialDayRules = ?, assignedEmployees = ?, rules = ?,
        minStaffAtOpen = ?, minStaffMidday = ?, minStaffAtClose = ?, canBeSolo = ?,
        specialShifts = ?, trimming = ?, sunday = ?
      WHERE id = ?
    `);
    stmt.run(
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
      id
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating shop:', error);
    res.status(500).json({ error: 'Failed to update shop' });
  }
});

// Delete shop
app.delete('/api/shops/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM shops WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shop:', error);
    res.status(500).json({ error: 'Failed to delete shop' });
  }
});



// ============== EMPLOYEES ==============

// Get all employees
app.get('/api/employees', (req, res) => {
  try {
    const employees = db.prepare('SELECT * FROM employees').all();
    const parsed = employees.map((emp: any) => ({
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

// Create employee
app.post('/api/employees', (req, res) => {
  try {
    const emp = req.body;
    const stmt = db.prepare(`
      INSERT INTO employees (id, name, email, phone, company, employmentType, role, weeklyHours, payScaleId, allowanceIds, excludeFromRoster, hasSystemAccess, systemRole, primaryShopId, secondaryShopIds, idNumber, taxNumber, ssnNumber, tcnNumber, tcnExpiry, iban)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      emp.id,
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
    );
    res.json({ success: true, employee: emp });
  } catch (error) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: 'Failed to create employee' });
  }
});

// Update employee
app.patch('/api/employees/:id', (req, res) => {
  try {
    const { id } = req.params;
    const emp = req.body;
    const stmt = db.prepare(`
      UPDATE employees SET 
        name = ?, email = ?, phone = ?, company = ?, employmentType = ?, 
        role = ?, weeklyHours = ?, payScaleId = ?, allowanceIds = ?,
        excludeFromRoster = ?, hasSystemAccess = ?, systemRole = ?,
        primaryShopId = ?, secondaryShopIds = ?, idNumber = ?, taxNumber = ?,
        ssnNumber = ?, tcnNumber = ?, tcnExpiry = ?, iban = ?
      WHERE id = ?
    `);
    stmt.run(
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
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating employee:', error);
    res.status(500).json({ error: 'Failed to update employee' });
  }
});

// Delete employee
app.delete('/api/employees/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM employees WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    res.status(500).json({ error: 'Failed to delete employee' });
  }
});

// ============== ROSTER/SHIFTS ==============

// Generate roster (keep existing logic for now - returns sample data)
app.get('/api/roster/generate', (req, res) => {
  const { weekStart, shopId } = req.query;
  console.log(`Generating roster for week: ${weekStart}, shop: ${shopId || 'all'}`);
  
  // For now, return empty - the frontend handles generation
  res.json({ shifts: [], message: 'Roster generation endpoint - frontend handles logic' });
});

// Save roster
app.post('/api/roster/save', (req, res) => {
  try {
    const { weekStart, shifts } = req.body;
    
    // Delete existing shifts for this week
    db.prepare('DELETE FROM shifts WHERE weekStart = ?').run(weekStart);
    
    // Insert new shifts
    const stmt = db.prepare(`
      INSERT INTO shifts (id, date, shopId, shopName, employeeId, employeeName, startTime, endTime, hours, shiftType, company, weekStart)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const insertMany = db.transaction((shifts: any[]) => {
      for (const shift of shifts) {
        stmt.run(
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
        );
      }
    });
    
    insertMany(shifts);
    console.log(`✅ Saved ${shifts.length} shifts for week ${weekStart}`);
    res.json({ success: true, count: shifts.length });
  } catch (error) {
    console.error('Error saving roster:', error);
    res.status(500).json({ error: 'Failed to save roster' });
  }
});

// Load roster
app.get('/api/roster/load', (req, res) => {
  try {
    const { weekStart } = req.query;
    const shifts = db.prepare('SELECT * FROM shifts WHERE weekStart = ?').all(weekStart);
    console.log(`📂 Loaded ${shifts.length} shifts for week ${weekStart}`);
    res.json({ shifts });
  } catch (error) {
    console.error('Error loading roster:', error);
    res.status(500).json({ error: 'Failed to load roster' });
  }
});

// Delete roster for week
app.delete('/api/roster/:weekStart', (req, res) => {
  try {
    const { weekStart } = req.params;
    const result = db.prepare('DELETE FROM shifts WHERE weekStart = ?').run(weekStart);
    console.log(`🗑️ Deleted ${result.changes} shifts for week ${weekStart}`);
    res.json({ success: true, deleted: result.changes });
  } catch (error) {
    console.error('Error deleting roster:', error);
    res.status(500).json({ error: 'Failed to delete roster' });
  }
});

// List all saved rosters
app.get('/api/roster/list', (req, res) => {
  try {
    const weeks = db.prepare('SELECT DISTINCT weekStart, COUNT(*) as shiftCount FROM shifts GROUP BY weekStart ORDER BY weekStart DESC').all();
    res.json(weeks);
  } catch (error) {
    console.error('Error listing rosters:', error);
    res.status(500).json({ error: 'Failed to list rosters' });
  }
});

// Update single shift
app.patch('/api/roster/shift/:id', (req, res) => {
  try {
    const { id } = req.params;
    const shift = req.body;
    const stmt = db.prepare(`
      UPDATE shifts SET 
        date = ?, shopId = ?, shopName = ?, employeeId = ?, employeeName = ?,
        startTime = ?, endTime = ?, hours = ?, shiftType = ?, company = ?
      WHERE id = ?
    `);
    stmt.run(
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
    );
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating shift:', error);
    res.status(500).json({ error: 'Failed to update shift' });
  }
});

// Add single shift
app.post('/api/roster/shift', (req, res) => {
  try {
    const shift = req.body;
    const stmt = db.prepare(`
      INSERT INTO shifts (id, date, shopId, shopName, employeeId, employeeName, startTime, endTime, hours, shiftType, company, weekStart)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
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
    );
    res.json({ success: true, shift });
  } catch (error) {
    console.error('Error adding shift:', error);
    res.status(500).json({ error: 'Failed to add shift' });
  }
});

// Delete single shift
app.delete('/api/roster/shift/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM shifts WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift:', error);
    res.status(500).json({ error: 'Failed to delete shift' });
  }
});

// ============== LEAVE REQUESTS ==============

// Get all leave requests
app.get('/api/leave', (req, res) => {
  try {
    const requests = db.prepare('SELECT * FROM leave_requests ORDER BY submittedAt DESC').all();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    res.status(500).json({ error: 'Failed to fetch leave requests' });
  }
});

// Create leave request
app.post('/api/leave', (req, res) => {
  try {
    const request = req.body;
    const stmt = db.prepare(`
      INSERT INTO leave_requests (id, employeeId, type, startDate, endDate, reason, status, submittedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      request.id,
      request.employeeId,
      request.type,
      request.startDate,
      request.endDate,
      request.reason || null,
      request.status || 'pending',
      request.submittedAt || new Date().toISOString()
    );
    res.json({ success: true, request });
  } catch (error) {
    console.error('Error creating leave request:', error);
    res.status(500).json({ error: 'Failed to create leave request' });
  }
});

// Update leave request (approve/reject)
app.patch('/api/leave/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy } = req.body;
    const stmt = db.prepare(`
      UPDATE leave_requests SET status = ?, reviewedBy = ?, reviewedAt = ? WHERE id = ?
    `);
    stmt.run(status, reviewedBy || null, new Date().toISOString(), id);
    
    // Send email notification
    if (status === 'approved' || status === 'rejected') {
      const leave = db.prepare(`
        SELECT lr.*, e.name as employeeName, e.email as employeeEmail
        FROM leave_requests lr
        JOIN employees e ON lr.employeeId = e.id
        WHERE lr.id = ?
      `).get(id) as any;

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


// Delete leave request
app.delete('/api/leave/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM leave_requests WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting leave request:', error);
    res.status(500).json({ error: 'Failed to delete leave request' });
  }
});


// ============== SWAP REQUESTS ==============

// Get all swap requests
app.get('/api/swaps', (req, res) => {
  try {
    const requests = db.prepare('SELECT * FROM swap_requests ORDER BY createdAt DESC').all();
    res.json(requests);
  } catch (error) {
    console.error('Error fetching swap requests:', error);
    res.status(500).json({ error: 'Failed to fetch swap requests' });
  }
});

// Create swap request
app.post('/api/swaps', (req, res) => {
  try {
    const request = req.body;
    const stmt = db.prepare(`
      INSERT INTO swap_requests (id, requesterId, requesterShiftId, targetEmployeeId, targetShiftId, status, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      request.id,
      request.requesterId,
      request.requesterShiftId || null,
      request.targetEmployeeId || null,
      request.targetShiftId || null,
      request.status || 'pending',
      request.createdAt || new Date().toISOString()
    );
    res.json({ success: true, request });
  } catch (error) {
    console.error('Error creating swap request:', error);
    res.status(500).json({ error: 'Failed to create swap request' });
  }
});

// Update swap request
app.patch('/api/swaps/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reviewedBy } = req.body;
    const stmt = db.prepare(`
      UPDATE swap_requests SET status = ?, reviewedBy = ?, reviewedAt = ? WHERE id = ?
    `);
    stmt.run(status, reviewedBy || null, new Date().toISOString(), id);
    
    // Send email notification
    if (status === 'approved' || status === 'rejected') {
      const swap = db.prepare(`
        SELECT sr.*, 
          e1.name as requesterName, e1.email as requesterEmail,
          e2.name as targetName
        FROM swap_requests sr
        JOIN employees e1 ON sr.requesterId = e1.id
        LEFT JOIN employees e2 ON sr.targetEmployeeId = e2.id
        WHERE sr.id = ?
      `).get(id) as any;

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

// Get all profile update notifications
app.get('/api/profile-updates', (req, res) => {
  try {
    const updates = db.prepare('SELECT * FROM profile_updates ORDER BY createdAt DESC').all();
    const parsed = updates.map((u: any) => ({
      ...u,
      changes: u.changes ? JSON.parse(u.changes) : {}
    }));
    res.json(parsed);
  } catch (error) {
    console.error('Error fetching profile updates:', error);
    res.status(500).json({ error: 'Failed to fetch profile updates' });
  }
});

// Create profile update notification
app.post('/api/profile-updates', (req, res) => {
  try {
    const notification = req.body;
    const stmt = db.prepare(`
      INSERT INTO profile_updates (id, employeeId, employeeName, changes, createdAt, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      notification.id,
      notification.employeeId,
      notification.employeeName,
      JSON.stringify(notification.changes || {}),
      notification.createdAt || new Date().toISOString(),
      notification.status || 'pending'
    );
    res.json({ success: true, notification });
  } catch (error) {
    console.error('Error creating profile update:', error);
    res.status(500).json({ error: 'Failed to create profile update' });
  }
});

// Update profile update status (approve/reject)
app.patch('/api/profile-updates/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE profile_updates SET status = ? WHERE id = ?').run(status, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating profile update:', error);
    res.status(500).json({ error: 'Failed to update profile update' });
  }
});

// ============== PAY SCALES ==============

// Get all pay scales
app.get('/api/payscales', (req, res) => {
  try {
    const scales = db.prepare('SELECT * FROM pay_scales').all();
    res.json(scales);
  } catch (error) {
    console.error('Error fetching pay scales:', error);
    res.status(500).json({ error: 'Failed to fetch pay scales' });
  }
});

// Create pay scale
app.post('/api/payscales', (req, res) => {
  try {
    const scale = req.body;
    const stmt = db.prepare(`
      INSERT INTO pay_scales (id, name, hourlyRate, overtimeMultiplier, company)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(scale.id, scale.name, scale.hourlyRate, scale.overtimeMultiplier || 1.5, scale.company || null);
    res.json({ success: true, scale });
  } catch (error) {
    console.error('Error creating pay scale:', error);
    res.status(500).json({ error: 'Failed to create pay scale' });
  }
});

// Update pay scale
app.patch('/api/payscales/:id', (req, res) => {
  try {
    const { id } = req.params;
    const scale = req.body;
    const stmt = db.prepare(`
      UPDATE pay_scales SET name = ?, hourlyRate = ?, overtimeMultiplier = ?, company = ? WHERE id = ?
    `);
    stmt.run(scale.name, scale.hourlyRate, scale.overtimeMultiplier || 1.5, scale.company || null, id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating pay scale:', error);
    res.status(500).json({ error: 'Failed to update pay scale' });
  }
});

// Delete pay scale
app.delete('/api/payscales/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM pay_scales WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting pay scale:', error);
    res.status(500).json({ error: 'Failed to delete pay scale' });
  }
});

// ============== SEED DATA ==============

// Endpoint to seed initial data (call once to populate database)
app.post('/api/seed', (req, res) => {
  try {
    // Check if data already exists
    const shopCount = db.prepare('SELECT COUNT(*) as count FROM shops').get() as any;
    if (shopCount.count > 0) {
      return res.json({ message: 'Database already has data', shops: shopCount.count });
    }

    // Seed shops
    const shops = [
      { id: 1, name: 'Hamrun CS', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '19:00', requirements: JSON.stringify({ am: 4, pm: 2 }), specialRequests: JSON.stringify(['Mon & Sat mandatory']), assignedEmployees: JSON.stringify([]), rules: JSON.stringify({ mandatoryDays: ['Monday', 'Saturday'] }) },
      { id: 2, name: 'Tigne Point CS', company: 'CS', isActive: 1, openTime: '10:00', closeTime: '20:00', requirements: JSON.stringify({ am: 1, pm: 1 }), specialRequests: JSON.stringify([]), assignedEmployees: JSON.stringify([]), rules: null },
      { id: 3, name: 'Siggiewi CS', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '18:00', requirements: JSON.stringify({ am: 1, pm: 1 }), specialRequests: JSON.stringify(['Ricky Mon OFF', 'Anus Wed OFF']), assignedEmployees: JSON.stringify([]), rules: JSON.stringify({ employeeDaysOff: { 'Ricky': 'Monday', 'Anus': 'Wednesday' } }) },
      { id: 4, name: 'Marsaxlokk CS', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '17:00', requirements: JSON.stringify({ am: 1, pm: 1 }), specialRequests: JSON.stringify([]), assignedEmployees: JSON.stringify([]), rules: null },
      { id: 5, name: 'Marsascala CS', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '18:00', requirements: JSON.stringify({ am: 1, pm: 1 }), specialRequests: JSON.stringify(['Special Sat/Sun shifts']), assignedEmployees: JSON.stringify([]), rules: null },
      { id: 6, name: 'Mellieha CS', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '18:00', requirements: JSON.stringify({ am: 1, pm: 1 }), specialRequests: JSON.stringify([]), assignedEmployees: JSON.stringify([]), rules: null },
      { id: 7, name: 'Rabat CS', company: 'CS', isActive: 1, openTime: '09:00', closeTime: '18:00', requirements: JSON.stringify({ am: 1, pm: 1 }), specialRequests: JSON.stringify([]), assignedEmployees: JSON.stringify([]), rules: null },
      { id: 8, name: 'Fgura CMZ', company: 'CMZ', isActive: 1, openTime: '09:00', closeTime: '19:00', requirements: JSON.stringify({ am: 3, pm: 2 }), specialRequests: JSON.stringify([]), assignedEmployees: JSON.stringify([]), rules: null },
      { id: 9, name: 'Carters CMZ', company: 'CMZ', isActive: 1, openTime: '09:00', closeTime: '19:00', requirements: JSON.stringify({ am: 3, pm: 2 }), specialRequests: JSON.stringify([]), assignedEmployees: JSON.stringify([]), rules: null },
      { id: 10, name: 'Zabbar CMZ', company: 'CMZ', isActive: 1, openTime: '09:00', closeTime: '18:00', requirements: JSON.stringify({ am: 2, pm: 2 }), specialRequests: JSON.stringify(['Sunday CLOSED']), assignedEmployees: JSON.stringify([]), rules: JSON.stringify({ closedDays: ['Sunday'] }) }
    ];

    const insertShop = db.prepare(`
      INSERT INTO shops (id, name, company, isActive, openTime, closeTime, requirements, specialRequests, assignedEmployees, rules)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const shop of shops) {
      insertShop.run(shop.id, shop.name, shop.company, shop.isActive, shop.openTime, shop.closeTime, shop.requirements, shop.specialRequests, shop.assignedEmployees, shop.rules);
    }

    // Seed employees
    const employees = [
      { id: 1, name: 'Admin User', email: 'admin@rosterpro.com', company: 'CS', employmentType: 'full-time', role: 'admin', weeklyHours: 40, primaryShopId: 1 },
      { id: 2, name: 'Kamal', email: 'kamal@rosterpro.com', company: 'CS', employmentType: 'full-time', role: 'sales', weeklyHours: 40, primaryShopId: 1 },
      { id: 3, name: 'Sarah Johnson', email: 'sarah@rosterpro.com', company: 'CS', employmentType: 'full-time', role: 'sales', weeklyHours: 40, primaryShopId: 2 },
      { id: 4, name: 'Mike Chen', email: 'mike@rosterpro.com', company: 'CMZ', employmentType: 'full-time', role: 'sales', weeklyHours: 40, primaryShopId: 8 },
      { id: 5, name: 'Emma Wilson', email: 'emma@rosterpro.com', company: 'CS', employmentType: 'part-time', role: 'sales', weeklyHours: 20, primaryShopId: 3 },
      { id: 6, name: 'Ricky', email: 'ricky@rosterpro.com', company: 'CS', employmentType: 'full-time', role: 'sales', weeklyHours: 40, primaryShopId: 3 },
      { id: 7, name: 'Anus', email: 'anus@rosterpro.com', company: 'CS', employmentType: 'full-time', role: 'sales', weeklyHours: 40, primaryShopId: 3 },
      { id: 8, name: 'David Brown', email: 'david@rosterpro.com', company: 'CMZ', employmentType: 'full-time', role: 'manager', weeklyHours: 45, primaryShopId: 9 },
      { id: 9, name: 'Lisa Garcia', email: 'lisa@rosterpro.com', company: 'CS', employmentType: 'part-time', role: 'sales', weeklyHours: 24, primaryShopId: 4 },
      { id: 10, name: 'James Taylor', email: 'james@rosterpro.com', company: 'CMZ', employmentType: 'full-time', role: 'sales', weeklyHours: 40, primaryShopId: 10 }
    ];

    const insertEmployee = db.prepare(`
      INSERT INTO employees (id, name, email, company, employmentType, role, weeklyHours, primaryShopId, allowanceIds, secondaryShopIds)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]')
    `);

    for (const emp of employees) {
      insertEmployee.run(emp.id, emp.name, emp.email, emp.company, emp.employmentType, emp.role, emp.weeklyHours, emp.primaryShopId);
    }

    console.log('✅ Database seeded with initial data');
    res.json({ success: true, message: 'Database seeded', shops: shops.length, employees: employees.length });
  } catch (error) {
    console.error('Error seeding database:', error);
    res.status(500).json({ error: 'Failed to seed database' });
  }
});

// ============== AUTHENTICATION ==============

// Register (admin only - or first user)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, employeeId, role } = req.body;
    
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create user
    const stmt = db.prepare(`
      INSERT INTO users (email, password, employeeId, role, isActive)
      VALUES (?, ?, ?, ?, 1)
    `);
    const result = stmt.run(email, hashedPassword, employeeId || null, role || 'employee');
    
    console.log('✅ User registered:', email);
    res.json({ success: true, userId: result.lastInsertRowid });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = db.prepare(`
      SELECT u.*, e.name as employeeName, e.company 
      FROM users u 
      LEFT JOIN employees e ON u.employeeId = e.id 
      WHERE u.email = ?
    `).get(email) as any;
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is disabled' });
    }
    
    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Update last login
    db.prepare('UPDATE users SET lastLogin = ? WHERE id = ?').run(new Date().toISOString(), user.id);
    
    // Create JWT token
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
    
    console.log('✅ User logged in:', email);
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

// Verify token (check if still logged in)
app.get('/api/auth/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Get fresh user data
    const user = db.prepare(`
      SELECT u.id, u.email, u.role, u.employeeId, e.name as employeeName, e.company
      FROM users u
      LEFT JOIN employees e ON u.employeeId = e.id
      WHERE u.id = ?
    `).get(decoded.userId) as any;
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Change password
app.post('/api/auth/change-password', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const { currentPassword, newPassword } = req.body;
    
    // Get user
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(decoded.userId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const validPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashedPassword, user.id);
    
    console.log('✅ Password changed for:', user.email);
    res.json({ success: true });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});
// ============== INVITE SYSTEM ==============

// Generate invite for employee
app.post('/api/auth/invite', async (req, res) => {
  try {
    const { email, employeeId, role } = req.body;
    
    // Check if user already exists
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    
    // Generate invite token
    const inviteToken = require('crypto').randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    
    // Create user with invite token (no password yet)
    const stmt = db.prepare(`
      INSERT INTO users (email, password, employeeId, role, isActive, inviteToken, inviteExpires)
      VALUES (?, '', ?, ?, 0, ?, ?)
    `);
    const result = stmt.run(email, employeeId || null, role || 'employee', inviteToken, inviteExpires);
    
    const inviteLink = `http://localhost:5173/invite/${inviteToken}`;
    
console.log('📧 Invite created for:', email);
console.log('🔗 Invite link:', inviteLink);

// Send invite email
const employeeName = employeeId ? 
  (db.prepare('SELECT name FROM employees WHERE id = ?').get(employeeId) as any)?.name : 
  null;
await sendInviteEmail(email, inviteLink, employeeName);

res.json({ 
  success: true, 
  userId: result.lastInsertRowid,
  inviteToken,
  inviteLink
});
  } catch (error) {
    console.error('Invite error:', error);
    res.status(500).json({ error: 'Failed to create invite' });
  }
});

// Verify invite token
app.get('/api/auth/invite/:token', (req, res) => {
  try {
    const { token } = req.params;
    
    const user = db.prepare(`
      SELECT u.*, e.name as employeeName 
      FROM users u 
      LEFT JOIN employees e ON u.employeeId = e.id 
      WHERE u.inviteToken = ?
    `).get(token) as any;
    
    if (!user) {
      return res.status(404).json({ error: 'Invalid invite link' });
    }
    
    if (new Date(user.inviteExpires) < new Date()) {
      return res.status(400).json({ error: 'Invite link has expired' });
    }
    
    if (user.isActive) {
      return res.status(400).json({ error: 'Account already activated' });
    }
    
    res.json({
      valid: true,
      email: user.email,
      employeeName: user.employeeName,
      role: user.role
    });
  } catch (error) {
    console.error('Verify invite error:', error);
    res.status(500).json({ error: 'Failed to verify invite' });
  }
});

// Accept invite and set password
app.post('/api/auth/invite/:token/accept', async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    
    const user = db.prepare('SELECT * FROM users WHERE inviteToken = ?').get(token) as any;
    
    if (!user) {
      return res.status(404).json({ error: 'Invalid invite link' });
    }
    
    if (new Date(user.inviteExpires) < new Date()) {
      return res.status(400).json({ error: 'Invite link has expired' });
    }
    
    if (user.isActive) {
      return res.status(400).json({ error: 'Account already activated' });
    }
    
    // Hash password and activate account
    const hashedPassword = await bcrypt.hash(password, 10);
    
    db.prepare(`
      UPDATE users 
      SET password = ?, isActive = 1, inviteToken = NULL, inviteExpires = NULL 
      WHERE id = ?
    `).run(hashedPassword, user.id);
    
    console.log('✅ Account activated:', user.email);
    
    res.json({ success: true, message: 'Account activated! You can now log in.' });
  } catch (error) {
    console.error('Accept invite error:', error);
    res.status(500).json({ error: 'Failed to activate account' });
  }
});

// List all invites (admin)
app.get('/api/auth/invites', (req, res) => {
  try {
    const invites = db.prepare(`
      SELECT u.id, u.email, u.role, u.inviteToken, u.inviteExpires, u.isActive, u.createdAt,
             e.name as employeeName
      FROM users u
      LEFT JOIN employees e ON u.employeeId = e.id
      ORDER BY u.createdAt DESC
    `).all();
    
    res.json(invites);
  } catch (error) {
    console.error('List invites error:', error);
    res.status(500).json({ error: 'Failed to list invites' });
  }
});

// Resend invite
app.post('/api/auth/invite/:id/resend', (req, res) => {
  try {
    const { id } = req.params;
    
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.isActive) {
      return res.status(400).json({ error: 'Account already activated' });
    }
    
    // Generate new token
    const inviteToken = require('crypto').randomBytes(32).toString('hex');
    const inviteExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    
    db.prepare('UPDATE users SET inviteToken = ?, inviteExpires = ? WHERE id = ?')
      .run(inviteToken, inviteExpires, id);
    
    const inviteLink = `http://localhost:5173/invite/${inviteToken}`;
    
    console.log('📧 Invite resent for:', user.email);
    console.log('🔗 New invite link:', inviteLink);
    
    res.json({ success: true, inviteToken, inviteLink });
  } catch (error) {
    console.error('Resend invite error:', error);
    res.status(500).json({ error: 'Failed to resend invite' });
  }
});

// Delete invite/user
app.delete('/api/auth/invite/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete invite error:', error);
    res.status(500).json({ error: 'Failed to delete invite' });
  }
});
// Update user
app.patch('/api/auth/user/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, employeeId, company, allowedShopIds } = req.body;
    
    const stmt = db.prepare(`
      UPDATE users 
      SET role = ?, employeeId = ?, company = ?, allowedShopIds = ?
      WHERE id = ?
    `);
    stmt.run(
      role,
      employeeId || null,
      company || 'Both',
      JSON.stringify(allowedShopIds || []),
      id
    );
    
    console.log('✅ User updated:', id);
    res.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});



// Start server
app.listen(PORT, () => {
  console.log(`🚀 RosterPro API running on http://localhost:${PORT}`);
  console.log('📁 Database: rosterpro.db');
});
