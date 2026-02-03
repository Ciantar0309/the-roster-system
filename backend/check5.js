const db = require('better-sqlite3')('rosterpro.db');
const pradib = db.prepare("SELECT * FROM employees WHERE name = 'Pradib'").get();
console.log('=== PRADIB ===');
console.log('ID:', pradib.id);
console.log('Company:', pradib.company);
console.log('Primary Shop:', pradib.primaryShopId);
console.log('Secondary Shops:', pradib.secondaryShopIds);
console.log('Excluded:', pradib.excludeFromRoster);

console.log('\n=== SHOPS ===');
const shops = db.prepare('SELECT id, name, company FROM shops WHERE isActive = 1').all();
shops.forEach(s => console.log('Shop ' + s.id + ': ' + s.name + ' (' + s.company + ')'));
