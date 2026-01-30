# backend/routes/roster_solve.py
"""
Flask route for roster solving API - v3 Pattern-Based
"""

from flask import Blueprint, request, jsonify
import sys
import os
import traceback
import json

# Add paths
ROUTES_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(ROUTES_DIR)
SOLVER_DIR = os.path.join(BACKEND_DIR, 'solver')
sys.path.insert(0, SOLVER_DIR)

from roster_solver import (
    RosterSolver,
    Employee,
    LeaveRequest,
    ShopAssignment,
    SpecialShiftDemand,
    build_templates_from_config,
    build_demands_from_config,
    load_shop_config,
    DAYS_OF_WEEK,
    get_day_index,
    EXCLUDED_EMPLOYEES
)

roster_solve_bp = Blueprint('roster_solve', __name__)


def safe_json_parse(value, default):
    """Safely parse JSON string or return as-is if already parsed"""
    if value is None:
        return default
    if isinstance(value, str):
        try:
            return json.loads(value)
        except:
            return default
    return value


@roster_solve_bp.route('/api/roster/solve', methods=['POST'])
def solve_roster():
    """POST /api/roster/solve"""
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        week_start = data.get('weekStart')
        raw_employees = data.get('employees', [])
        raw_shops = data.get('shops', [])
        
        if not week_start:
            return jsonify({'error': 'weekStart is required'}), 400
        
        excluded_ids = set(data.get('excludedEmployeeIds', []))
        am_only_names = set(data.get('amOnlyEmployees', []))
        fixed_days_off_raw = data.get('fixedDaysOff', {})
        previous_sunday_shifts = data.get('previousWeekSundayShifts', [])
        
        print(f"\n{'='*60}")
        print(f"ROSTER SOLVE REQUEST")
        print(f"{'='*60}")
        print(f"Week Start: {week_start}")
        print(f"Employees received: {len(raw_employees)}")
        print(f"Shops received: {len(raw_shops)}")
        
        # Parse shop JSON fields
        parsed_shops = []
        for shop in raw_shops:
            parsed = dict(shop)
            parsed['staffingConfig'] = safe_json_parse(shop.get('staffingConfig'), None)
            parsed['assignedEmployees'] = safe_json_parse(shop.get('assignedEmployees'), [])
            parsed['requirements'] = safe_json_parse(shop.get('requirements'), [])
            parsed['specialShifts'] = safe_json_parse(shop.get('specialShifts'), [])
            parsed['trimming'] = safe_json_parse(shop.get('trimming'), {})
            parsed['sunday'] = safe_json_parse(shop.get('sunday'), {})
            parsed['rules'] = safe_json_parse(shop.get('rules'), {})
            
            # Debug first shop
            if shop.get('id') == 1:
                print(f"\n[DEBUG] {shop.get('name')} staffingConfig:")
                if parsed['staffingConfig']:
                    ws = parsed['staffingConfig'].get('weeklySchedule', [])
                    if ws:
                        print(f"  Mon: {ws[0]}")
            
            parsed_shops.append(parsed)
        
        raw_shops = parsed_shops
        
        # Build employees (C5: exclude Maria)
        employees = []
        for emp_data in raw_employees:
            emp_id = emp_data.get('id')
            emp_name = emp_data.get('name', '')
            
            # Skip excluded
            if emp_id in excluded_ids:
                continue
            if emp_name in EXCLUDED_EMPLOYEES:
                print(f"  Excluding {emp_name} (never rostered)")
                continue
            if not emp_data.get('isActive', True):
                continue
            if emp_data.get('excludeFromRoster', False):
                continue
            
            weekly_hours = emp_data.get('weeklyHours', 40)
            if not weekly_hours or weekly_hours <= 0:
                continue
            
            employees.append(Employee(
                id=emp_id,
                name=emp_name,
                company=emp_data.get('company', 'CMZ'),
                employment_type=emp_data.get('employmentType', 'full-time'),
                weekly_hours=weekly_hours,
                is_active=True,
                am_only=emp_name in am_only_names,
                primary_shop_id=emp_data.get('primaryShopId'),
                secondary_shop_ids=safe_json_parse(emp_data.get('secondaryShopIds'), [])
            ))
        
        print(f"Active employees: {len(employees)}")
        
        # Build assignments
        assignments = []
        for shop_data in raw_shops:
            shop_id = shop_data.get('id')
            assigned = shop_data.get('assignedEmployees', [])
            
            for emp_data in assigned:
                if isinstance(emp_data, dict):
                    emp_id = emp_data.get('id') or emp_data.get('employeeId')
                    is_primary = emp_data.get('isPrimary', False)
                else:
                    emp_id = emp_data
                    is_primary = False
                
                if emp_id and emp_id not in excluded_ids:
                    exists = any(a.employee_id == emp_id and a.shop_id == shop_id for a in assignments)
                    if not exists:
                        assignments.append(ShopAssignment(
                            employee_id=emp_id,
                            shop_id=shop_id,
                            is_primary=is_primary
                        ))
        
        # Add from employee primary/secondary
        for emp in employees:
            if emp.primary_shop_id:
                exists = any(a.employee_id == emp.id and a.shop_id == emp.primary_shop_id for a in assignments)
                if not exists:
                    assignments.append(ShopAssignment(
                        employee_id=emp.id,
                        shop_id=emp.primary_shop_id,
                        is_primary=True
                    ))
            
            for sec_id in (emp.secondary_shop_ids or []):
                if sec_id:
                    exists = any(a.employee_id == emp.id and a.shop_id == sec_id for a in assignments)
                    if not exists:
                        assignments.append(ShopAssignment(
                            employee_id=emp.id,
                            shop_id=sec_id,
                            is_primary=False
                        ))
        
        print(f"Shop assignments: {len(assignments)}")
        
        # Leave requests
        leave_requests = []
        for emp_data in raw_employees:
            for leave in emp_data.get('leaveRequests', []):
                if leave.get('status') == 'approved':
                    leave_requests.append(LeaveRequest(
                        employee_id=emp_data.get('id'),
                        start_date=leave.get('startDate', ''),
                        end_date=leave.get('endDate', ''),
                        status='approved'
                    ))
        
        print(f"Leave requests: {len(leave_requests)}")
        
        # Fixed days off
        fixed_days_off = {}
        for emp_key, days in fixed_days_off_raw.items():
            emp_lower = emp_key.lower()
            indices = []
            for day in days:
                if isinstance(day, int):
                    indices.append(day)
                elif isinstance(day, str):
                    indices.append(get_day_index(day))
            if indices:
                fixed_days_off[emp_lower] = indices
        
        if fixed_days_off:
            print(f"Fixed days off: {fixed_days_off}")
        
        # Build shop configs
        shop_configs = {}
        for shop_data in raw_shops:
            config = load_shop_config(shop_data)
            shop_configs[config.id] = config
        
        print(f"Shop configs: {len(shop_configs)}")
        
        # Shop rules
        shop_rules = {}
        for shop_data in raw_shops:
            shop_rules[shop_data.get('id')] = {
                'canBeSolo': shop_data.get('canBeSolo', False),
                'trimming': shop_data.get('trimming', {}),
                'sunday': shop_data.get('sunday', {})
            }
        
        # Build templates and demands
        templates, special_demands = build_templates_from_config(raw_shops)
        demands = build_demands_from_config(raw_shops)
        
        print(f"Templates: {len(templates)}")
        print(f"Demands: {len(demands)}")
        print(f"Special demands: {len(special_demands)}")
        
        # Create solver
        solver = RosterSolver(
            employees=employees,
            templates=templates,
            demands=demands,
            assignments=assignments,
            leave_requests=leave_requests,
            week_start=week_start,
            fixed_days_off=fixed_days_off,
            previous_week_sunday_shifts=previous_sunday_shifts,
            shop_rules=shop_rules,
            special_demands=special_demands,
            shop_configs=shop_configs
        )
        
        result = solver.solve(time_limit_seconds=120)
        
        return jsonify(result)
    
    except Exception as e:
        print(f"\nSOLVER ERROR:")
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'status': 'ERROR',
            'message': str(e),
            'shifts': [],
            'employeeHours': {}
        }), 500
