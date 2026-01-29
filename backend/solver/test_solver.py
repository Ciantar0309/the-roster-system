import sys
sys.path.insert(0, '.')
from roster_solver import *

import json
import sqlite3

print("=" * 60)
print("SOLVER DIAGNOSTIC TEST")
print("=" * 60)

conn = sqlite3.connect('../rosterpro.db')
conn.row_factory = sqlite3.Row

shops_raw = conn.execute('SELECT * FROM shops WHERE isActive = 1').fetchall()
shops = []
for s in shops_raw:
    shop = dict(s)
    for field in ['staffingConfig', 'assignedEmployees', 'requirements', 'specialShifts', 'trimming', 'sunday']:
        if shop.get(field) and isinstance(shop[field], str):
            try:
                shop[field] = json.loads(shop[field])
            except:
                pass
    shops.append(shop)

print(f'Loaded {len(shops)} shops')

emps_raw = conn.execute('SELECT * FROM employees').fetchall()
employees = []
for e in emps_raw:
    emp = dict(e)
    if emp.get('secondaryShopIds') and isinstance(emp['secondaryShopIds'], str):
        try:
            emp['secondaryShopIds'] = json.loads(emp['secondaryShopIds'])
        except:
            emp['secondaryShopIds'] = []
    employees.append(emp)

print(f'Loaded {len(employees)} employees')

emp_objects = []
for emp in employees:
    if not emp.get('weeklyHours') or emp['weeklyHours'] <= 0:
        continue
    emp_objects.append(Employee(
        id=emp['id'],
        name=emp['name'],
        company=emp.get('company', 'CMZ'),
        employment_type=emp.get('employmentType', 'full-time'),
        weekly_hours=emp.get('weeklyHours', 40),
        is_active=True,
        am_only=False,
        primary_shop_id=emp.get('primaryShopId'),
        secondary_shop_ids=emp.get('secondaryShopIds', []) or []
    ))

print(f'Built {len(emp_objects)} employee objects')

templates, special_demands = build_templates_from_config(shops)
demands = build_demands_from_config(shops)

print(f'Built {len(templates)} templates')
print(f'Built {len(demands)} demands')

assignments = []
for shop in shops:
    shop_id = shop['id']
    assigned = shop.get('assignedEmployees', [])
    if isinstance(assigned, str):
        assigned = json.loads(assigned) if assigned else []
    for emp_data in assigned:
        emp_id = emp_data.get('id') if isinstance(emp_data, dict) else emp_data
        if emp_id:
            assignments.append(ShopAssignment(
                employee_id=emp_id,
                shop_id=shop_id,
                is_primary=emp_data.get('isPrimary', False) if isinstance(emp_data, dict) else False
            ))

print(f'Built {len(assignments)} assignments')

shop_configs = {}
for shop in shops:
    config = load_shop_config(shop)
    shop_configs[config.id] = config

solver = RosterSolver(
    employees=emp_objects,
    templates=templates,
    demands=demands,
    assignments=assignments,
    leave_requests=[],
    week_start='2026-02-02',
    fixed_days_off={},
    previous_week_sunday_shifts=[],
    shop_rules={},
    special_demands=special_demands,
    shop_configs=shop_configs
)

result = solver.solve(time_limit_seconds=120)

print("=" * 60)
print(f"RESULT: {result['status']}")
print(f"SHIFTS: {len(result['shifts'])}")
print("=" * 60)
