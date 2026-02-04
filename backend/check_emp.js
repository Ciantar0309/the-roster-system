const db = require('better-sqlite3')('rosterpro.db');
const r = db.prepare("SELECT name, company, employmentType FROM employees WHERE name IN ('Joseph', 'Imran', 'Claire', 'Chantel')").all();
r.forEach(x => console.log(x.name, x.company, x.employmentType));
