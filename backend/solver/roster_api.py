from flask import Flask, request, jsonify
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)

# Import solver after app is created
from roster_solver import (
    Employee, ShopAssignment, LeaveRequest, ShiftTemplate, DemandEntry,
    ShopConfig, SpecialShiftDemand, RosterSolver,
    build_templates_from_config, build_demands_from_config, load_shop_config
)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "version": "32.6"})

@app.route('/', methods=['GET'])
def index():
    return jsonify({"message": "RosterPro Solver API v32.6", "status": "running"})

@app.route('/api/roster/solve', methods=['POST'])
def solve_roster():
    try:
        data = request.get_json()
        
        # Parse employees
        employees = []
        for e in data.get('employees', []):
            employees.append(Employee(
                id=e['id'],
                name=e['name'],
                company=e.get('company', ''),
                employment_type=e.get('employmentType', 'full-time'),
                weekly_hours=e.get('weeklyHours', 40),
                is_active=e.get('isActive', True),
                am_only=e.get('amOnly', False),
                pm_only=e.get('pmOnly', False),
                primary_shop_id=e.get('primaryShopId'),
                secondary_shop_ids=e.get('secondaryShopIds', [])
            ))
        
        # Parse shop configs
        shop_configs = {}
        for s in data.get('shops', []):
            cfg = load_shop_config(s)
            shop_configs[cfg.id] = cfg
        
        # Build templates and demands
        templates, special = build_templates_from_config(shop_configs)
        demands = build_demands_from_config(shop_configs)
        
        # Parse assignments
        assignments = []
        for a in data.get('assignments', []):
            assignments.append(ShopAssignment(
                employee_id=a['employeeId'],
                shop_id=a['shopId'],
                is_primary=a.get('isPrimary', True)
            ))
        
        # Parse leave requests
        leave_requests = []
        for lr in data.get('leaveRequests', []):
            leave_requests.append(LeaveRequest(
                employee_id=lr['employeeId'],
                start_date=lr['startDate'],
                end_date=lr['endDate'],
                leave_type=lr.get('type', 'vacation')
            ))
        
        # Parse special demands
        special_demands = []
        for sd in data.get('specialDemands', []):
            special_demands.append(SpecialShiftDemand(
                shop_id=sd['shopId'],
                shop_name=sd.get('shopName', ''),
                day_index=sd['dayIndex'],
                shift_type=sd.get('shiftType', 'AM'),
                employee_id=sd.get('employeeId'),
                start_time=sd.get('startTime', ''),
                end_time=sd.get('endTime', '')
            ))
        
        # Create solver
        solver = RosterSolver(
            employees=employees,
            templates=templates,
            demands=demands,
            assignments=assignments,
            leave_requests=leave_requests,
            week_start=data.get('weekStart', '2026-02-02'),
            fixed_days_off=data.get('fixedDaysOff', {}),
            previous_week_sunday_shifts=data.get('previousWeekSundayShifts', {}),
            shop_rules=data.get('shopRules', {}),
            special_demands=special_demands,
            shop_configs=shop_configs
        )
        
        # Solve
        result = solver.solve(time_limit_seconds=120)
        
        return jsonify(result)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 3002))
    print(f"Starting RosterPro Solver API on port {port}...")
    app.run(host='0.0.0.0', port=port, debug=False)
