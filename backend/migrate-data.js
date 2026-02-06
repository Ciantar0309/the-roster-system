const Database = require('better-sqlite3');
const path = require('path');

// Open local SQLite database
const db = new Database(path.join(__dirname, 'rosterpro.db'));

// Get all data
const employees = db.prepare('SELECT * FROM employees').all();
const shops = db.prepare('SELECT * FROM shops').all();

console.log(`Found ${employees.length} employees`);
console.log(`Found ${shops.length} shops`);

// Output as JSON for copying
console.log('\n=== EMPLOYEES ===\n');
console.log(JSON.stringify(employees));

console.log('\n=== SHOPS ===\n');
console.log(JSON.stringify(shops));
