const db = require('better-sqlite3')('rosterpro.db');
const cols = db.prepare('PRAGMA table_info(shops)').all();
console.log('Shop columns:', cols.map(c => c.name).join(', '));
const shop = db.prepare("SELECT * FROM shops WHERE name = 'Hamrun'").get();
console.log('Hamrun full data:', JSON.stringify(shop, null, 2));
