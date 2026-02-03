const db = require('better-sqlite3')('rosterpro.db');
const shops = db.prepare("SELECT name, staffingConfig FROM shops WHERE isActive = 1").all();
shops.forEach(s => {
  console.log('=== ' + s.name + ' ===');
  if (s.staffingConfig) {
    const cfg = JSON.parse(s.staffingConfig);
    console.log('trimAM:', cfg.trimAM);
    console.log('trimPM:', cfg.trimPM);
    console.log('trimming:', cfg.trimming);
  }
});
