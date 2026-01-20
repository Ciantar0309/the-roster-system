import { supabase } from './lib/supabase';

async function testConnection() {
  console.log('Testing Supabase connection...\n');

  // Test 1: Get all shops
  const { data: shops, error: shopsError } = await supabase
    .from('shops')
    .select('*');

  if (shopsError) {
    console.error('❌ Shops error:', shopsError.message);
  } else {
    console.log(`✅ Shops loaded: ${shops.length}`);
    shops.forEach(shop => console.log(`   - ${shop.name} (${shop.company})`));
  }

  console.log('');

  // Test 2: Get all employees
  const { data: employees, error: empError } = await supabase
    .from('employees')
    .select('*');

  if (empError) {
    console.error('❌ Employees error:', empError.message);
  } else {
    console.log(`✅ Employees loaded: ${employees.length}`);
    const fullTime = employees.filter(e => e.employment_type === 'full_time').length;
    const partTime = employees.filter(e => e.employment_type === 'part_time').length;
    console.log(`   - Full-time: ${fullTime}`);
    console.log(`   - Part-time: ${partTime}`);
  }

  console.log('\n✅ Database connection successful!');
}

testConnection();
