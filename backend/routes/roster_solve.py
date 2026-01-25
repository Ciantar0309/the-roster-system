# backend/routes/roster_solve.py
"""
Flask route for roster solving API
"""

from flask import Blueprint, request, jsonify
import sys
import os
import traceback

# Add paths for imports
ROUTES_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(ROUTES_DIR)
SOLVER_DIR = os.path.join(BACKEND_DIR, 'solver')

# Add solver directory to path so we can import roster_solver directly
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
    DAYS_OF_WEEK
)

roster_solve_bp = Blueprint('roster_solve', __name__)


@roster_solve_bp.route('/api/roster/solve', methods=['POST'])
def solve_roster():
    """
    POST /api/roster/solve
    
    Request body:
    {
        weekStart: "2026-01-26",
        employees: [...],
        shops: [...],
        shopRequirements: {...},
        excludedEmployeeIds: [31],
        amOnlyEmployees: ["Joseph"],
        fixedDaysOff: {...},
        previousWeekSundayShifts: [...]
    }
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Required fields
        week_start = data.get('weekStart')
        raw_employees = data.get('employees', [])
        raw_shops = data.get('shops', [])
        
        if not week_start:
            return jsonify({'error': 'weekStart is required'}), 400
        
        # Optional fields
        excluded_ids = set(data.get('excludedEmployeeIds', [31]))
        am_only_names = set(data.get('amOnlyEmployees', ['Joseph']))
        fixed_days_off_raw = data.get('fixedDaysOff', {})
        previous_sunday_shifts = data.get('previousWeekSundayShifts', [])
        
        print(f"\n{'='*60}")
        print(f"ROSTER SOLVE REQUEST")
        print(f"{'='*60}")
        print(f"Week Start: {week_start}")
        print(f"Employees: {len(raw_employees)}")
        print(f"Shops: {len(raw_shops)}")
        print(f"Excluded IDs: {excluded_ids}")
        print(f"AM-Only: {am_only_names}")
        
        # Build Employee objects
        employees = []
        for emp_data in raw_employees:
            emp_id = emp_data.get('id')
            if emp_id in excluded_ids:
                continue
            if not emp_data.get('isActive', True):
                continue
            
            emp_name = emp_data.get('name', '')
            is_am_only = emp_name in am_only_names
            
            employees.append(Employee(
                id=emp_id,
                name=emp_name,
                company=emp_data.get('company', 'CMZ'),
                employment_type=emp_data.get('employmentType', 'full-time'),
                weekly_hours=emp_data.get('weeklyHours', 40),
                is_active=True,
                am_only=is_am_only,
                primary_shop_id=emp_data.get('primaryShopId'),
                secondary_shop_ids=emp_data.get('secondaryShopIds', [])
            ))
        
        print(f"Active employees: {len(employees)}")
        
        # Build ShopAssignment objects
        assignments = []
        for shop_data in raw_shops:
            shop_id = shop_data.get('id')
            assigned = shop_data.get('assignedEmployees', [])
            
            if isinstance(assigned, str):
                import json
                try:
                    assigned = json.loads(assigned)
                except:
                    assigned = []
            
            for emp_data in assigned:
                emp_id = emp_data.get('id') if isinstance(emp_data, dict) else emp_data
                if emp_id and emp_id not in excluded_ids:
                    assignments.append(ShopAssignment(
                        employee_id=emp_id,
                        shop_id=shop_id,
                        is_primary=False
                    ))
        
        print(f"Shop assignments: {len(assignments)}")
        
        # Build LeaveRequest objects (from employees or separate endpoint)
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
                    day_lower = day.lower()
                    if day_lower in DAYS_OF_WEEK:
                        day_indices.append(DAYS_OF_WEEK.index(day_lower))
            if day_indices:
                fixed_days_off[emp_key_lower] = day_indices
        
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
        
        result = solver.solve(time_limit_seconds=90)
        
        return jsonify(result)
        
    except Exception as e:
        print(f"\nSOLVER ERROR:")
        traceback.print_exc()
        print("="*50)
        
        return jsonify({
            'success': False,
            'status': 'ERROR',
            'message': str(e),
            'shifts': [],
            'employeeHours': {}
        }), 500
