# backend/routes/roster_solve.py
"""
Flask route for roster solving API - FIXED VERSION v2
"""

from flask import Blueprint, request, jsonify
import sys
import os
import traceback
import json

# Add paths for imports
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
    DAY_NAME_MAP,
    get_day_index
)

roster_solve_bp = Blueprint('roster_solve', __name__)


def safe_json_parse(value, default):
    """Safely parse JSON string or return value if already parsed"""
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
    """
    POST /api/roster/solve
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        week_start = data.get('weekStart')
        raw_employees = data.get('employees', [])
        raw_shops = data.get('shops', [])
        
        if not week_start:
            return jsonify({'error': 'weekStart is required'}), 400
        
        # Optional fields
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
        
        # Parse JSON fields in shops
        parsed_shops = []
        for shop in raw_shops:
            parsed_shop = dict(shop)
            for field in ['staffingConfig', 'assignedEmployees', 'requirements', 'specialShifts', 'trimming', 'sunday', 'rules', 'fixedDaysOff', 'specialDayRules']:
                if field in parsed_shop:
                    parsed_shop[field] = safe_json_parse(parsed_shop[field], [] if field in ['assignedEmployees', 'requirements', 'specialShifts', 'fixedDaysOff', 'specialDayRules'] else {})
            parsed_shops.append(parsed_shop)
        
        raw_shops = parsed_shops
        
        # Build Employee objects
        employees = []
        for emp_data in raw_employees:
            emp_id = emp_data.get('id')
            if emp_id in excluded_ids:
                continue
            if not emp_data.get('isActive', True):
                continue
            if emp_data.get('excludeFromRoster', False):
                continue
            
            emp_name = emp_data.get('name', '')
            is_am_only = emp_name in am_only_names
            
            secondary_shop_ids = safe_json_parse(emp_data.get('secondaryShopIds'), [])
            
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
                am_only=is_am_only,
                primary_shop_id=emp_data.get('primaryShopId'),
                secondary_shop_ids=secondary_shop_ids if secondary_shop_ids else []
            ))
        
        print(f"Active employees: {len(employees)}")
        
        # Build ShopAssignment objects from shop.assignedEmployees
        assignments = []
        for shop_data in raw_shops:
            shop_id = shop_data.get('id')
            assigned = shop_data.get('assignedEmployees', [])
            
            # Already parsed above, but double-check
            if isinstance(assigned, str):
                assigned = safe_json_parse(assigned, [])
            
            if not assigned:
                continue
                
            for emp_data in assigned:
                if isinstance(emp_data, dict):
                    emp_id = emp_data.get('id') or emp_data.get('employeeId')
                    is_primary = emp_data.get('isPrimary', False)
                else:
                    emp_id = emp_data
                    is_primary = False
                    
                if emp_id and emp_id not in excluded_ids:
                    exists = any(
                        a.employee_id == emp_id and a.shop_id == shop_id 
                        for a in assignments
                    )
                    if not exists:
                        assignments.append(ShopAssignment(
                            employee_id=emp_id,
                            shop_id=shop_id,
                            is_primary=is_primary
                        ))
        
        # Also add assignments from employee primaryShopId and secondaryShopIds
        for emp in employees:
            if emp.primary_shop_id:
                exists = any(
                    a.employee_id == emp.id and a.shop_id == emp.primary_shop_id 
                    for a in assignments
                )
                if not exists:
                    assignments.append(ShopAssignment(
                        employee_id=emp.id,
                        shop_id=emp.primary_shop_id,
                        is_primary=True
                    ))
            
            for sec_shop_id in (emp.secondary_shop_ids or []):
                if sec_shop_id:
                    exists = any(
                        a.employee_id == emp.id and a.shop_id == sec_shop_id 
                        for a in assignments
                    )
                    if not exists:
                        assignments.append(ShopAssignment(
                            employee_id=emp.id,
                            shop_id=sec_shop_id,
                            is_primary=False
                        ))
        
        print(f"Shop assignments: {len(assignments)}")
        
        # Build LeaveRequest objects
        leave_requests = []
        for emp_data in raw_employees:
            emp_leaves = emp_data.get('leaveRequests', [])
            for leave in emp_leaves:
                if leave.get('status') == 'approved':
                    leave_requests.append(LeaveRequest(
                        employee_id=emp_data.get('id'),
                        start_date=leave.get('startDate', ''),
                        end_date=leave.get('endDate', ''),
                        status='approved'
                    ))
        
        print(f"Leave requests: {len(leave_requests)}")
        
        # Parse fixed days off
        fixed_days_off = {}
        for emp_key, days in fixed_days_off_raw.items():
            emp_key_lower = emp_key.lower()
            day_indices = []
            for day in days:
                if isinstance(day, int):
                    day_indices.append(day)
                elif isinstance(day, str):
                    idx = get_day_index(day)
                    day_indices.append(idx)
            if day_indices:
                fixed_days_off[emp_key_lower] = day_indices
        
        if fixed_days_off:
            print(f"Fixed days off: {fixed_days_off}")
        
        # Build shop configs
        shop_configs = {}
        for shop_data in raw_shops:
            config = load_shop_config(shop_data)
            shop_configs[config.id] = config
        
        print(f"Shop configs loaded: {len(shop_configs)}")
        
        # Build shop rules (for backward compatibility)
        shop_rules = {}
        for shop_data in raw_shops:
            shop_id = shop_data.get('id')
            shop_rules[shop_id] = {
                'canBeSolo': shop_data.get('canBeSolo', False),
                'minStaffAtOpen': shop_data.get('minStaffAtOpen', 1),
                'minStaffMidday': shop_data.get('minStaffMidday', 2),
                'minStaffAtClose': shop_data.get('minStaffAtClose', 1),
                'trimming': shop_data.get('trimming', {}),
                'sunday': shop_data.get('sunday', {})
            }
        
        # Build templates and demands from shop config
        templates, special_demands = build_templates_from_config(raw_shops)
        demands = build_demands_from_config(raw_shops)
        
        print(f"Templates: {len(templates)}")
        print(f"Demands: {len(demands)}")
        print(f"Special demands: {len(special_demands)}")
        
        # Create and run solver
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
