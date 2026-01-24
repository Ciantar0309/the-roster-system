from flask import Blueprint, request, jsonify

import sys
import os

BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOLVER_DIR = os.path.join(BACKEND_DIR, 'solver')

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if SOLVER_DIR not in sys.path:
    sys.path.insert(0, SOLVER_DIR)

from solver.roster_solver import (
    RosterSolver, Employee, LeaveRequest, ShopAssignment,
    build_templates_from_config, build_demands_from_config
)

roster_solve_bp = Blueprint("roster_solve", __name__)

DAY_MAP = {"Mon": 0, "Tue": 1, "Wed": 2, "Thu": 3, "Fri": 4, "Sat": 5, "Sun": 6}

@roster_solve_bp.route("/api/roster/solve", methods=["POST"])
def solve_roster():
    try:
        data = request.get_json() or {}

        for k in ["weekStart", "employees", "shops", "shopRequirements"]:
            if k not in data:
                return jsonify({"status": "ERROR", "error": f"Missing field: {k}"}), 400

        # ---- employees ----
        excluded_ids = set(data.get("excludedEmployeeIds", [31]))
        am_only_names = set(n.lower() for n in data.get("amOnlyEmployees", ["Joseph"]))

        employees = []
        for e in data["employees"]:
            if e.get("excludeFromRoster") or e.get("id") in excluded_ids:
                continue

            employees.append(Employee(
                id=e["id"],
                name=e["name"],
                company=e.get("company", "CS"),
                employment_type=e.get("employmentType", "full-time"),
                primaryShopId=e.get("primaryShopId"),
                secondaryShopIds=e.get("secondaryShopIds", []),
                am_only=e["name"].lower() in am_only_names,
                excluded=False
            ))

        # ---- assignments ----
        assignments = []
        for shop in data["shops"]:
            for ae in shop.get("assignedEmployees", []) or []:
                assignments.append(ShopAssignment(
                    employee_id=ae["employeeId"],
                    shop_id=shop["id"],
                    is_primary=ae.get("isPrimary", False)
                ))

        # ---- leave requests ----
        leave_requests = []
        for lr in data.get("leaveRequests", []) or []:
            if lr.get("status") != "approved":
                continue
            leave_requests.append(LeaveRequest(
                employee_id=lr["employeeId"],
                start_date=lr["startDate"],
                end_date=lr["endDate"]
            ))

        # ---- fixed days off ----
        fixed_raw = data.get("fixedDaysOff", {}) or {}
        fixed_days_off = {}
        for name, v in fixed_raw.items():
            key = (name or "").strip().lower()
            if isinstance(v, int):
                fixed_days_off[key] = v
            elif isinstance(v, str) and v:
                fixed_days_off[key] = DAY_MAP.get(v[:3].title(), -1)

        # ---- previous week Sunday shifts ----
        previous_week_sunday_shifts = data.get("previousWeekSundayShifts", []) or []
        
        if previous_week_sunday_shifts:
            print(f"📅 Received {len(previous_week_sunday_shifts)} Sunday shifts from previous week")

        # ---- Extract shop rules from shops data ----
        shop_rules = {}
        for shop in data["shops"]:
            shop_name = shop["name"].lower()
            shop_rules[shop_name] = {
                "id": shop["id"],
                "name": shop["name"],
                "specialRequests": shop.get("specialRequests", []),
                "rules": shop.get("rules", {}),
                "requirements": shop.get("requirements", [])
            }
        
        print(f"📋 Shop rules loaded for: {list(shop_rules.keys())}")

        # ---- build templates + demands ----
        templates = build_templates_from_config(data["shopRequirements"], data["shops"])
        demands = build_demands_from_config(data["shopRequirements"], data["shops"], shop_rules)

        solver = RosterSolver(
            employees=employees,
            templates=templates,
            demands=demands,
            assignments=assignments,
            leave_requests=leave_requests,
            week_start=data["weekStart"],
            fixed_days_off=fixed_days_off,
            previous_week_sunday_shifts=previous_week_sunday_shifts,
            shop_rules=shop_rules
        )

        result = solver.solve(time_limit_seconds=60)
        return jsonify(result), 200

    except Exception as e:
        import traceback
        print("=" * 50)
        print("SOLVER ERROR:")
        print(traceback.format_exc())
        print("=" * 50)
        return jsonify({
            "status": "ERROR",
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500
