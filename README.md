# RosterPro - Intelligent Staff Scheduling System

[![Version](https://img.shields.io/badge/version-31.0-blue.svg)](https://github.com/Ciantar0309/the-roster-system)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

RosterPro is a full-stack staff scheduling and roster management system designed for multi-location retail businesses. It uses constraint-based optimization (Google OR-Tools) to automatically generate optimal staff schedules while respecting business rules, employee preferences, and labor regulations.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Solver Logic](#solver-logic)
- [Shop Configuration](#shop-configuration)
- [Staffing Configuration](#staffing-configuration)
- [Employee Management](#employee-management)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### Core Features
- **Automated Roster Generation** - AI-powered scheduling using Google OR-Tools CP-SAT solver
- **Multi-Location Support** - Manage 10+ shops with different staffing requirements
- **Flexible Shift Types** - AM, PM, Full Day, and Trimmed shifts
- **Employee Management** - Track hours, assignments, leave requests, and availability
- **Real-time Optimization** - Generate feasible rosters in under 2 minutes

### Staffing Modes
- **Flexible Mode** - Solver decides optimal mix of AM, PM, and Full Day shifts
- **Split Mode** - Only AM + PM shifts (no full days)
- **Full Day Only Mode** - Solo shops with single full-day coverage

### Business Rules
- **Hard Constraints** (Must be satisfied):
  - Minimum staffing levels per shop/day
  - Maximum 1 shift per employee per day
  - At least 1 day off per week per employee
  - Student employees capped at 20 hours/week
  - Special requests (specific employee must work specific shift)

- **Soft Constraints** (Optimized):
  - Target staffing levels (penalized if not met)
  - Employee weekly hours targets
  - Overtime minimization (allowed but penalized)
  - Fair distribution of hours

### Additional Features
- Leave request management (vacation, sick, personal)
- Shift swap requests between employees
- Employee availability tracking
- Sunday custom hours support
- Shop-specific rules (solo shops, mandatory days)
- Real-time coverage summary
- Overtime tracking and reporting

---

## Architecture

Copy
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │ │ │ │ │ │ │ Frontend │────▶│ Express API │────▶│ Python Solver │ │ (React/Vite) │ │ (Port 3001) │ │ (Port 3002) │ │ │ │ │ │ │ └─────────────────┘ └─────────────────┘ └─────────────────┘ │ │ │ │ ▼ │ │ ┌─────────────────┐ │ │ │ │ │ └──────────────▶│ SQLite DB │◀────────────┘ │ (rosterpro.db) │ │ │ └─────────────────┘


### Data Flow
1. User requests roster generation from Frontend (React)
2. Frontend calls Express API (`POST /api/roster/solve`)
3. Express reads shop/employee data from SQLite database
4. Express forwards request to Python Solver (Flask)
5. Python Solver uses OR-Tools to generate optimal schedule
6. Results returned through Express to Frontend
7. User can view, edit, and save the generated roster

---

## Tech Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **date-fns** - Date manipulation

### Backend (Express)
- **Node.js** - Runtime
- **Express.js** - Web framework
- **TypeScript** - Type safety
- **better-sqlite3** - SQLite database driver
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **cors** - Cross-origin resource sharing

### Backend (Solver)
- **Python 3.10+** - Runtime
- **Flask** - Web framework
- **Google OR-Tools** - Constraint programming solver
- **sqlite3** - Database access

### Database
- **SQLite** - Lightweight relational database

---

## Project Structure

the-roster-system/ ├── frontend/ # React frontend application │ ├── src/ │ │ ├── App.tsx # Main application component │ │ ├── App.css # Application styles │ │ ├── main.tsx # Entry point │ │ ├── index.css # Global styles │ │ ├── types.ts # TypeScript type definitions │ │ ├── components/ # Reusable UI components │ │ ├── lib/ # Utility libraries │ │ └── assets/ # Static assets │ ├── package.json │ ├── vite.config.ts │ ├── tailwind.config.js │ └── tsconfig.json │ ├── backend/ # Backend services │ ├── src/ │ │ ├── server.ts # Express server (Port 3001) │ │ ├── database.ts # Database initialization & schema │ │ └── email.ts # Email notification service │ ├── solver/ │ │ ├── roster_solver.py # Main solver logic (OR-Tools) │ │ ├── roster_api.py # Flask API server (Port 3002) │ │ └── init.py │ ├── routes/ │ │ ├── roster_solve.py # Solver route handler │ │ └── init.py │ ├── rosterpro.db # SQLite database file │ ├── package.json │ └── tsconfig.json │ ├── src/ # Legacy/shared source │ ├── index.ts │ ├── test-db.ts │ ├── config/ │ ├── lib/ │ ├── services/ │ └── types/ │ ├── package.json # Root package.json ├── tsconfig.json # Root TypeScript config └── README.md # This file


---

## Installation

### Prerequisites
- **Node.js** 18+ (with npm)
- **Python** 3.10+
- **pip** (Python package manager)

### Step 1: Clone the Repository
```bash
git clone https://github.com/Ciantar0309/the-roster-system.git
cd the-roster-system
Step 2: Install Frontend Dependencies
Copycd frontend
npm install
Step 3: Install Backend (Express) Dependencies
Copycd ../backend
npm install
Step 4: Install Python Dependencies
Copycd solver
pip install flask flask-cors ortools
Step 5: Initialize Database
The database is automatically initialized when you first run the Express server. To seed with sample data:

Copycurl -X POST http://localhost:3001/api/seed
Configuration
Environment Variables (Optional)
Create a .env file in the backend directory:

JWT_SECRET=your-secret-key-change-in-production
PORT=3001
Shop Configuration
Shops are configured with the following properties:

name - Shop name
company - Company identifier (CS, CMZ)
isActive - Whether shop is active
openTime / closeTime - Operating hours
canBeSolo - Whether shop can be operated by 1 person
staffingConfig - Detailed staffing requirements (see below)
Staffing Configuration Schema
Copy{
  "coverageMode": "flexible",
  "fullDayCountsAsBoth": true,
  "neverBelowMinimum": true,
  "weeklySchedule": [
    {
      "day": "Mon",
      "minAM": 4,
      "minPM": 2,
      "targetAM": 4,
      "targetPM": 2,
      "minFullDay": 0,
      "maxStaff": 6,
      "isMandatory": true
    }
  ]
}
Running the Application
You need 3 terminals running simultaneously:

Terminal 1: Express Backend (Port 3001)
Copycd backend
npx ts-node src/server.ts
Expected output:

Server running on http://localhost:3001
Database initialized
Terminal 2: Python Solver (Port 3002)
Copycd backend/solver
python roster_api.py
Expected output:

🚀 Starting RosterPro Solver API on port 3002...
 * Running on http://127.0.0.1:3002
Terminal 3: Frontend (Port 5173)
Copycd frontend
npm run dev
Expected output:

VITE v5.x.x ready in xxx ms
➜ Local: http://localhost:5173/
Access the Application
Open your browser to: http://localhost:5173

Database Schema
Tables
shops
Column	Type	Description
id	INTEGER	Primary key
name	TEXT	Shop name
company	TEXT	Company (CS/CMZ)
isActive	INTEGER	Active status (0/1)
openTime	TEXT	Opening time (HH:MM)
closeTime	TEXT	Closing time (HH:MM)
canBeSolo	INTEGER	Solo shop flag (0/1)
staffingConfig	TEXT	JSON staffing configuration
assignedEmployees	TEXT	JSON array of assigned employee IDs
requirements	TEXT	JSON legacy requirements
specialShifts	TEXT	JSON special shift requests
trimming	TEXT	JSON trimming configuration
sunday	TEXT	JSON Sunday-specific rules
rules	TEXT	JSON additional rules
employees
Column	Type	Description
id	INTEGER	Primary key
name	TEXT	Employee name
email	TEXT	Email address
phone	TEXT	Phone number
company	TEXT	Company (CS/CMZ)
employmentType	TEXT	full-time/part-time/student
role	TEXT	Job role
weeklyHours	INTEGER	Contracted weekly hours
primaryShopId	INTEGER	Primary shop assignment
secondaryShopIds	TEXT	JSON array of secondary shops
excludeFromRoster	INTEGER	Exclude from scheduling (0/1)
shifts
Column	Type	Description
id	TEXT	Unique shift ID
date	TEXT	Shift date (YYYY-MM-DD)
shopId	INTEGER	Shop ID
employeeId	INTEGER	Employee ID
startTime	TEXT	Start time (HH:MM)
endTime	TEXT	End time (HH:MM)
hours	REAL	Shift duration in hours
shiftType	TEXT	AM/PM/FULL
weekStart	TEXT	Week start date
leave_requests
Column	Type	Description
id	TEXT	Unique request ID
employeeId	INTEGER	Employee ID
type	TEXT	vacation/sick/personal
startDate	TEXT	Start date
endDate	TEXT	End date
status	TEXT	pending/approved/rejected
reason	TEXT	Request reason
users
Column	Type	Description
id	INTEGER	Primary key
email	TEXT	Login email
password	TEXT	Hashed password
employeeId	INTEGER	Linked employee
role	TEXT	admin/manager/employee
isActive	INTEGER	Account status
API Documentation
Base URLs
Express API: http://localhost:3001/api
Solver API: http://localhost:3002/api
Shops
Get All Shops
CopyGET /api/shops
Create Shop
CopyPOST /api/shops
Content-Type: application/json

{
  "name": "Shop Name",
  "company": "CS",
  "isActive": true,
  "openTime": "09:00",
  "closeTime": "18:00",
  "canBeSolo": false,
  "staffingConfig": {...}
}
Update Shop
CopyPATCH /api/shops/:id
Content-Type: application/json

{
  "staffingConfig": {...}
}
Employees
Get All Employees
CopyGET /api/employees
Create Employee
CopyPOST /api/employees
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "company": "CS",
  "employmentType": "full-time",
  "weeklyHours": 40,
  "primaryShopId": 1
}
Roster
Generate Roster
CopyPOST /api/roster/solve
Content-Type: application/json

{
  "weekStart": "2026-02-02",
  "excludedEmployeeIds": [],
  "amOnlyEmployees": ["Joseph"],
  "fixedDaysOff": {
    "ricky": [0],
    "anus": [2]
  }
}
Response:

Copy{
  "status": "FEASIBLE",
  "shifts": [
    {
      "id": "shift_1_0_AM_2",
      "date": "2026-02-02",
      "shopId": 1,
      "shopName": "Hamrun",
      "employeeId": 2,
      "employeeName": "Kamal",
      "startTime": "06:30",
      "endTime": "14:30",
      "hours": 8.0,
      "shiftType": "AM"
    }
  ],
  "employeeHours": {
    "2": 40.0,
    "3": 42.5
  }
}
Save Roster
CopyPOST /api/roster/save
Content-Type: application/json

{
  "weekStart": "2026-02-02",
  "shifts": [...]
}
Load Roster
CopyGET /api/roster/load?weekStart=2026-02-02
Leave Requests
Get All Leave Requests
CopyGET /api/leave
Create Leave Request
CopyPOST /api/leave
Content-Type: application/json

{
  "employeeId": 2,
  "type": "vacation",
  "startDate": "2026-02-10",
  "endDate": "2026-02-14",
  "reason": "Family holiday"
}
Approve/Reject Leave
CopyPATCH /api/leave/:id
Content-Type: application/json

{
  "status": "approved",
  "reviewedBy": 1
}
Authentication
Login
CopyPOST /api/auth/login
Content-Type: application/json

{
  "email": "admin@rosterpro.com",
  "password": "password123"
}
Verify Token
CopyGET /api/auth/me
Authorization: Bearer <token>
Solver Logic
Overview
The roster solver uses Google OR-Tools CP-SAT (Constraint Programming - Satisfiability) solver to find optimal staff schedules.

Constraint Hierarchy
Hard Constraints (Must be satisfied)
Minimum Staffing: Each shop must have at least minAM staff in morning and minPM in afternoon
One Shift Per Day: An employee can only work one shift per day
One Day Off: Each employee must have at least 1 day off per week
Student Hours Cap: Students cannot exceed 20 hours/week
Special Requests: If configured, specific employees MUST work specific shifts
Soft Constraints (Penalized in objective)
Target Staffing: Try to reach targetAM/targetPM (penalized if below)
Employee Hours: Try to give employees their contracted hours
Overtime: Allowed but lightly penalized
Over-staffing: Slightly penalized to avoid waste
Penalty Weights
CopyPENALTY_UNDER_MINIMUM = 100000    # EXTREME - must meet minimum
PENALTY_UNDER_TARGET = 500        # High - try to meet target
PENALTY_OVER_COVERAGE = 20        # Low - slight preference against overstaffing
PENALTY_OVERTIME = 5              # Very low - overtime is fine
PENALTY_UNDER_HOURS = 20          # Low - try to give contracted hours
PENALTY_EXCESSIVE_OVERTIME = 50   # Moderate - avoid 60h weeks
PENALTY_MISSED_SPECIAL = 100000   # EXTREME - special requests must be met
Coverage Modes
Flexible (Default)
Solver decides optimal mix of AM, PM, and FULL shifts
Full day shifts count toward both AM and PM coverage
Best for most shops
Split
Only AM and PM shifts (no full days)
Use when you need different people for morning/afternoon
Full Day Only
Only full day shifts
For solo shops where one person covers the entire day
Solver Output
============================================================
ROSTERPRO v31.0 - Overtime-Enabled Solver
============================================================
Employees: 31
Templates: 210
Demands: 70
Special Requests: 0

[BUILDING MODEL]
  Variables created: 1216

[COVERAGE CONSTRAINTS - HARD]
  Hamrun monday: min=4AM/2PM, available=16AM/16PM vars
  ...

[SOLVING] Time limit: 120s

[RESULT] Status: FEASIBLE

[COVERAGE SUMMARY]
  Hamrun MON: AM=4/4 ✓, PM=2/2 ✓
  ...

[EMPLOYEE HOURS]
  Kamal: 40.0h / 40h
  Arjun: 42.0h / 40h [+2.0h OT]
  ...

[OVERTIME SUMMARY]
  18 employees with overtime, total: 47.0h

[RESULT] Generated 137 shifts
Shop Configuration
Current Shops
Shop	Company	Type	Mon Staff	canBeSolo
Hamrun	CS	Busy	4 AM / 2 PM	No
Tigne Point	CS	Solo	1 AM / 1 PM	Yes
Siggiewi	CS	Solo	1 AM / 1 PM	Yes
Marsaxlokk	CS	Solo	1 AM / 1 PM	Yes
Marsascala	CS	Solo	1 AM / 1 PM	Yes
Mellieha	CS	Solo	1 AM / 1 PM	Yes
Rabat	CS	Solo	1 AM / 1 PM	Yes
Fgura	CMZ	Busy	3 AM / 2 PM	No
Carters	CMZ	Busy	3 AM / 2 PM	No
Zabbar	CMZ	Solo	1 AM / 1 PM	Yes
Updating Shop Configuration
Via API:

Copycurl -X PATCH http://localhost:3001/api/shops/1 \
  -H "Content-Type: application/json" \
  -d '{
    "staffingConfig": {
      "coverageMode": "flexible",
      "fullDayCountsAsBoth": true,
      "weeklySchedule": [
        {"day": "Mon", "minAM": 4, "minPM": 2, "targetAM": 4, "targetPM": 2, "maxStaff": 6, "isMandatory": true},
        {"day": "Tue", "minAM": 3, "minPM": 2, "targetAM": 3, "targetPM": 2, "maxStaff": 5, "isMandatory": false}
      ]
    }
  }'
Via Database:

Copycd backend
node -e "
const db = require('better-sqlite3')('./rosterpro.db');
const config = {
  coverageMode: 'flexible',
  weeklySchedule: [
    {day: 'Mon', minAM: 4, minPM: 2, targetAM: 4, targetPM: 2, maxStaff: 6}
  ]
};
db.prepare('UPDATE shops SET staffingConfig = ? WHERE id = ?').run(JSON.stringify(config), 1);
console.log('Updated!');
"
Staffing Configuration
Schema Definition
Copyinterface StaffingConfig {
  coverageMode: 'flexible' | 'split' | 'fullDayOnly';
  fullDayCountsAsBoth: boolean;  // Does a full-day shift count for AM AND PM?
  neverBelowMinimum: boolean;    // Enforce minimum as hard constraint
  weeklySchedule: DayConfig[];
}

interface DayConfig {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  minAM: number;      // HARD minimum for morning (must meet)
  minPM: number;      // HARD minimum for afternoon (must meet)
  targetAM: number;   // SOFT target for morning (try to meet)
  targetPM: number;   // SOFT target for afternoon (try to meet)
  minFullDay: number; // Minimum full-day shifts
  maxStaff: number;   // Maximum total staff for the day
  isMandatory: boolean; // Is this a mandatory coverage day?
}
Example Configurations
Busy Shop (Hamrun)
Copy{
  "coverageMode": "flexible",
  "fullDayCountsAsBoth": true,
  "neverBelowMinimum": true,
  "weeklySchedule": [
    {"day": "Mon", "minAM": 4, "minPM": 2, "targetAM": 4, "targetPM": 2, "maxStaff": 6, "isMandatory": true},
    {"day": "Tue", "minAM": 3, "minPM": 2, "targetAM": 3, "targetPM": 2, "maxStaff": 5, "isMandatory": false},
    {"day": "Wed", "minAM": 3, "minPM": 2, "targetAM": 3, "targetPM": 2, "maxStaff": 5, "isMandatory": false},
    {"day": "Thu", "minAM": 3, "minPM": 2, "targetAM": 3, "targetPM": 2, "maxStaff": 5, "isMandatory": false},
    {"day": "Fri", "minAM": 3, "minPM": 2, "targetAM": 3, "targetPM": 2, "maxStaff": 5, "isMandatory": false},
    {"day": "Sat", "minAM": 3, "minPM": 2, "targetAM": 3, "targetPM": 2, "maxStaff": 5, "isMandatory": true},
    {"day": "Sun", "minAM": 2, "minPM": 2, "targetAM": 2, "targetPM": 2, "maxStaff": 4, "isMandatory": false}
  ]
}
Solo Shop (Siggiewi)
Copy{
  "coverageMode": "flexible",
  "fullDayCountsAsBoth": true,
  "neverBelowMinimum": true,
  "weeklySchedule": [
    {"day": "Mon", "minAM": 1, "minPM": 1, "targetAM": 1, "targetPM": 1, "maxStaff": 2, "isMandatory": false},
    {"day": "Tue", "minAM": 1, "minPM": 1, "targetAM": 1, "targetPM": 1, "maxStaff": 2, "isMandatory": false},
    {"day": "Wed", "minAM": 1, "minPM": 1, "targetAM": 1, "targetPM": 1, "maxStaff": 2, "isMandatory": false},
    {"day": "Thu", "minAM": 1, "minPM": 1, "targetAM": 1, "targetPM": 1, "maxStaff": 2, "isMandatory": false},
    {"day": "Fri", "minAM": 1, "minPM": 1, "targetAM": 1, "targetPM": 1, "maxStaff": 2, "isMandatory": false},
    {"day": "Sat", "minAM": 1, "minPM": 1, "targetAM": 1, "targetPM": 1, "maxStaff": 2, "isMandatory": false},
    {"day": "Sun", "minAM": 1, "minPM": 1, "targetAM": 1, "targetPM": 1, "maxStaff": 2, "isMandatory": false}
  ]
}
Employee Management
Employee Types
Type	Weekly Hours	Overtime	Notes
Full-time	40h	Allowed	Standard employees
Part-time	20-30h	Allowed	Reduced hours
Student	20h max	NOT allowed	Legal limit enforced
Assigning Employees to Shops
Employees can be assigned to:

Primary Shop: Their main work location
Secondary Shops: Additional locations they can cover
Copycd backend
node -e "
const db = require('better-sqlite3')('./rosterpro.db');

// Assign employee 2 (Kamal) to primary shop 1 (Hamrun)
// and secondary shops 2, 3 (Tigne Point, Siggiewi)
db.prepare('UPDATE employees SET primaryShopId = ?, secondaryShopIds = ? WHERE id = ?')
  .run(1, JSON.stringify([2, 3]), 2);

console.log('Employee assigned!');
"
Populating Shop Assignments
Run this to auto-assign employees based on their primaryShopId and secondaryShopIds:

Copycd backend
node -e "
const db = require('better-sqlite3')('./rosterpro.db');
const employees = db.prepare('SELECT * FROM employees').all();
const shops = db.prepare('SELECT id FROM shops').all();

for (const shop of shops) {
  const assigned = [];
  for (const emp of employees) {
    if (emp.primaryShopId === shop.id) {
      assigned.push({id: emp.id, isPrimary: true});
    }
    const secondary = emp.secondaryShopIds ? JSON.parse(emp.secondaryShopIds) : [];
    if (secondary.includes(shop.id)) {
      assigned.push({id: emp.id, isPrimary: false});
    }
  }
  db.prepare('UPDATE shops SET assignedEmployees = ? WHERE id = ?')
    .run(JSON.stringify(assigned), shop.id);
  console.log('Shop', shop.id, ':', assigned.length, 'employees');
}
console.log('Done!');
"
Troubleshooting
Common Issues
1. "Could not generate a feasible roster"
Cause: Staffing requirements exceed available employee hours.

Solution:

Copy# Check total hours needed vs available
cd backend
node -e "
const db = require('better-sqlite3')('./rosterpro.db');
const shops = db.prepare('SELECT * FROM shops WHERE isActive = 1').all();
const employees = db.prepare('SELECT * FROM employees WHERE weeklyHours > 0').all();

let totalShifts = 0;
for (const shop of shops) {
  const cfg = JSON.parse(shop.staffingConfig || '{}');
  const ws = cfg.weeklySchedule || [];
  for (const day of ws) {
    totalShifts += (day.minAM || 1) + (day.minPM || 1);
  }
}

const totalHours = employees.reduce((sum, e) => sum + e.weeklyHours, 0);
const hoursNeeded = totalShifts * 7.5;

console.log('Shifts needed/week:', totalShifts);
console.log('Hours needed:', hoursNeeded);
console.log('Hours available:', totalHours);
console.log('Feasible:', totalHours >= hoursNeeded ? 'YES' : 'NO - reduce requirements or add staff');
"
2. Solver shows "(defaults) 1AM/1PM" instead of actual config
Cause: staffingConfig not being parsed correctly.

Solution: Ensure roster_solve.py (v3) is using safe_json_parse on staffingConfig:

Copyparsed_shop['staffingConfig'] = safe_json_parse(shop.get('staffingConfig'), None)
3. "No employees assigned to shops"
Solution: Run the employee assignment script (see Employee Management section).

4. Python solver not starting
Check:

Copy# Verify Python version
python --version  # Should be 3.10+

# Verify OR-Tools installed
pip show ortools

# If not installed
pip install ortools flask flask-cors
5. Express can't connect to Python solver
Check:

Python solver running on port 3002
No firewall blocking localhost connections
Express proxy endpoint correctly configured
Debug Mode
Enable verbose logging in solver:

Copy# In roster_solver.py, set debug flag
DEBUG = True
Check Express logs:

Copy# Express terminal should show:
Proxying roster solve request to Python solver...
FIRST SHOP STAFFING CONFIG: {"coverageMode":"flexible",...}
Solver response: FEASIBLE, 137 shifts
Database Reset
To start fresh:

Copycd backend
rm rosterpro.db
npx ts-node src/server.ts  # Recreates database
curl -X POST http://localhost:3001/api/seed  # Optional: seed sample data
Contributing
Fork the repository
Create a feature branch (git checkout -b feature/amazing-feature)
Commit your changes (git commit -m 'Add amazing feature')
Push to the branch (git push origin feature/amazing-feature)
Open a Pull Request
Code Style
TypeScript: Follow ESLint configuration
Python: Follow PEP 8
Commits: Use conventional commit messages
License
This project is licensed under the MIT License - see the LICENSE file for details.

Support
For issues and questions:

Open a GitHub issue
Contact: [Your contact info]
Acknowledgments
Google OR-Tools - Constraint programming solver
React - UI framework
Express - Node.js web framework
Flask - Python web framework
