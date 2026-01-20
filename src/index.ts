// ============================================
// THE ROSTER SYSTEM - MAIN SERVER
// Connected to Supabase
// ============================================

import express from 'express';
import cors from 'cors';
import { generateRoster } from './services/roster-generator';
import { supabase } from './lib/supabase';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// ============================================
// API ROUTES
// ============================================

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all shops from Supabase
app.get('/api/shops', async (req, res) => {
  const { data, error } = await supabase
    .from('shops')
    .select('*')
    .order('name');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// Get all employees from Supabase
app.get('/api/employees', async (req, res) => {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .order('name');

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// Get employee rules
app.get('/api/employees/:id/rules', async (req, res) => {
  const { data, error } = await supabase
    .from('employee_rules')
    .select('*')
    .eq('employee_id', req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// Get shop hours
app.get('/api/shops/:id/hours', async (req, res) => {
  const { data, error } = await supabase
    .from('shop_hours')
    .select('*')
    .eq('shop_id', req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// Get shop staffing requirements
app.get('/api/shops/:id/staffing', async (req, res) => {
  const { data, error } = await supabase
    .from('shop_staffing')
    .select('*')
    .eq('shop_id', req.params.id);

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// ============================================
// LEAVE REQUESTS
// ============================================

// Get all leave requests
app.get('/api/leave', async (req, res) => {
  const { data, error } = await supabase
    .from('leave_requests')
    .select(`
      *,
      employees (name)
    `)
    .order('start_date', { ascending: false });

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// Create leave request
app.post('/api/leave', async (req, res) => {
  const { employee_id, leave_type, start_date, end_date, reason } = req.body;

  const { data, error } = await supabase
    .from('leave_requests')
    .insert({
      employee_id,
      leave_type,
      start_date,
      end_date,
      reason,
      status: 'pending'
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// Update leave request status
app.patch('/api/leave/:id', async (req, res) => {
  const { status } = req.body;

  const { data, error } = await supabase
    .from('leave_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: error.message });
    return;
  }

  res.json(data);
});

// ============================================
// ROSTER GENERATION
// ============================================

// Generate roster
app.post('/api/roster/generate', (req, res) => {
  try {
    const { weekStartDate } = req.body;
    
    if (!weekStartDate) {
      res.status(400).json({ error: 'weekStartDate is required (YYYY-MM-DD format)' });
      return;
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`GENERATING ROSTER FOR WEEK: ${weekStartDate}`);
    console.log('='.repeat(60));

    const roster = generateRoster(weekStartDate);

    res.json({
      success: true,
      data: roster
    });
  } catch (error) {
    console.error('Roster generation failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Get roster summary (for testing)
app.get('/api/roster/test', (req, res) => {
  try {
    // Use next Monday as default
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 1 : (8 - dayOfWeek);
    const nextMonday = new Date(today);
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    
    const weekStartDate = nextMonday.toISOString().split('T')[0];
    
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST ROSTER GENERATION FOR: ${weekStartDate}`);
    console.log('='.repeat(60));

    const roster = generateRoster(weekStartDate);

    res.json({
      success: true,
      weekStartDate,
      summary: {
        totalShifts: roster.summary.totalShifts,
        coverage: roster.summary.coverage,
        employeesAt40h: roster.summary.employeesAt40h,
        unfilledSlots: roster.data.unfilledSlots.length
      },
      data: roster
    });
  } catch (error) {
    console.error('Test roster failed:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// ============================================
// START SERVER
// ============================================

const startServer = async () => {
  // Test Supabase connection
  const { data: shops, error } = await supabase.from('shops').select('*');
  
  if (error) {
    console.error('❌ Supabase connection failed:', error.message);
    process.exit(1);
  }

  const { data: employees } = await supabase.from('employees').select('*');

  app.listen(PORT, () => {
    console.log('\n' + '='.repeat(60));
    console.log('THE ROSTER SYSTEM');
    console.log('='.repeat(60));
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`✅ Supabase connected`);
    console.log(`Shops loaded: ${shops?.length || 0}`);
    console.log(`Employees loaded: ${employees?.length || 0}`);
    console.log('='.repeat(60));
    console.log('\nEndpoints:');
    console.log('  GET  /api/health          - Health check');
    console.log('  GET  /api/shops           - List all shops');
    console.log('  GET  /api/employees       - List all employees');
    console.log('  GET  /api/leave           - List leave requests');
    console.log('  POST /api/leave           - Create leave request');
    console.log('  POST /api/roster/generate - Generate roster');
    console.log('  GET  /api/roster/test     - Test roster generation');
    console.log('='.repeat(60) + '\n');
  });
};

startServer();
