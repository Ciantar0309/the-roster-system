const db = require('better-sqlite3')('rosterpro.db');
const cmz = db.prepare("SELECT name, employmentType, weeklyHours FROM employees WHERE company = 'CMZ' AND excludeFromRoster = 0").all();
let need = 0;
cmz.forEach(e => {
  console.log(e.name + ': ' + e.employmentType + ' ' + e.weeklyHours + 'h');
  if (e.employmentType.toLowerCase().includes('full')) need += 40;
});
console.log('CMZ full-timers need: ' + need + 'h/week');
