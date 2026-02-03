const db = require('better-sqlite3')('rosterpro.db');
const shops = db.prepare('SELECT name, specialShifts FROM shops WHERE specialShifts IS NOT NULL AND specialShifts != \"[]\"').all();
shops.forEach(s => {
  console.log('=== ' + s.name + ' ===');
  const shifts = JSON.parse(s.specialShifts);
  shifts.forEach(sh => console.log(JSON.stringify(sh)));
});
