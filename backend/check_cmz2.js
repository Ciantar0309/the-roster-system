const db = require('better-sqlite3')('rosterpro.db');
const shops = db.prepare("SELECT id, name, staffingConfig FROM shops WHERE company = 'CMZ' AND isActive = 1").all();
let totalHours = 0;
shops.forEach(s => {
  console.log('=== ' + s.name + ' ===');
  if (s.staffingConfig) {
    const cfg = JSON.parse(s.staffingConfig);
    if (cfg.weeklySchedule) {
      cfg.weeklySchedule.forEach(day => {
        const am = (day.targetAM || 1) * 7;
        const pm = (day.targetPM || 1) * 7;
        totalHours += am + pm;
      });
    }
  }
});
console.log('CMZ shops total hours/week: ' + totalHours + 'h');
