const db = require('better-sqlite3')('rosterpro.db');
const pradib = db.prepare("SELECT * FROM employees WHERE name LIKE '%Pradib%'").get();
console.log('PRADIB:', pradib);
const shops = db.prepare('SELECT id, name, staffingConfig, specialShifts FROM shops WHERE isActive = 1').all();
shops.forEach(s => {
  console.log('---' + s.name + '---');
  if (s.specialShifts) console.log('SpecialShifts:', s.specialShifts);
  if (s.staffingConfig) {
    const cfg = JSON.parse(s.staffingConfig);
    if (cfg.weeklySchedule) {
      cfg.weeklySchedule.forEach(d => {
        if (d.isMandatory) console.log(d.day + ': MANDATORY');
      });
    }
  }
});
