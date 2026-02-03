const db = require('better-sqlite3')('rosterpro.db');
const emps = db.prepare('SELECT id, name, primaryShopId, secondaryShopIds, company FROM employees WHERE excludeFromRoster = 0').all();
console.log('=== EMPLOYEES FOR MARSAXLOKK (shop 4) ===');
emps.forEach(e => {
  const secondary = e.secondaryShopIds ? JSON.parse(e.secondaryShopIds) : [];
  if (e.primaryShopId === 4 || secondary.includes(4)) {
    console.log(e.name + ' - Primary: ' + e.primaryShopId + ', Secondary: ' + JSON.stringify(secondary) + ', Company: ' + e.company);
  }
});
