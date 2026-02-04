const db = require('better-sqlite3')('rosterpro.db');
const r = db.prepare(
  SELECT e.name, s.name as shop, sa.isPrimary 
  FROM shop_assignments sa 
  JOIN employees e ON sa.employeeId = e.id 
  JOIN shops s ON sa.shopId = s.id 
  WHERE s.name = 'Hamrun'
).all();
console.log('Hamrun assignments:');
r.forEach(x => console.log('  ' + x.name + ' - ' + (x.isPrimary ? 'PRIMARY' : 'SECONDARY')));
console.log('Total: ' + r.length);
