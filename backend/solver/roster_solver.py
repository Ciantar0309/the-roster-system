#!/usr/bin/env python3
"""
ROSTERPRO v15.3 - Cross-week day-in/day-out support + Hamrun mandatory days + overtime trimming
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Set
from datetime import datetime, timedelta
import json

from ortools.sat.python import cp_model

# ──────────────────────────────────────────────────────────────────────────────
# Data classes
# ──────────────────────────────────────────────────────────────────────────────
@dataclass
class Employee:
    id: int
    name: str
    company: str  # 'CS' or 'CMZ'
    employment_type: str = 'full-time'
    primaryShopId: Optional[int] = None
    secondaryShopIds: List[int] = field(default_factory=list)
    am_only: bool = False
    excluded: bool = False

@dataclass
class ShiftTemplate:
    id: int
    shop_id: int
    shop_name: str
    day_index: int  # 0=Mon, 6=Sun
    shift_type: str  # 'AM', 'PM', 'FULL'
    start_time: str  # 'HH:MM'
    end_time: str

@dataclass
class ShopDayDemand:
    shop_id: int
    shop_name: str
    day_index: int
    am_required: int
    pm_required: int

@dataclass
class LeaveRequest:
    employee_id: int
    start_date: str  # 'YYYY-MM-DD'
    end_date: str

@dataclass
class ShopAssignment:
    employee_id: int
    shop_id: int
    is_primary: bool


# ──────────────────────────────────────────────────────────────────────────────
# Helper functions
# ──────────────────────────────────────────────────────────────────────────────
def calculate_hours(start: str, end: str) -> float:
    """Convert 'HH:MM' start/end to decimal hours."""
    sh, sm = map(int, start.split(':'))
    eh, em = map(int, end.split(':'))
    return (eh * 60 + em - sh * 60 - sm) / 60.0


def _day_name(idx: int) -> str:
    return ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]


# ──────────────────────────────────────────────────────────────────────────────
# Build helpers (templates / demands from config)
# ──────────────────────────────────────────────────────────────────────────────
def build_templates_from_config(shop_requirements: List[dict], shops: List[dict]) -> List[ShiftTemplate]:
    """Generate ShiftTemplate list from frontend shopRequirements & shops."""
    shop_map = {s['id']: s['name'] for s in shops}
    templates: List[ShiftTemplate] = []
    tid = 0
    for req in shop_requirements:
        shop_id = req['shopId']
        shop_name = shop_map.get(shop_id, f'Shop{shop_id}')
        for day_idx in range(7):
            day_cfg = req.get('days', {}).get(str(day_idx), {})
            if not day_cfg:
                continue
            open_time = day_cfg.get('open', '09:00')
            close_time = day_cfg.get('close', '18:00')
            mid_time = day_cfg.get('mid', '13:30')
            # AM
            templates.append(ShiftTemplate(tid, shop_id, shop_name, day_idx, 'AM', open_time, mid_time))
            tid += 1
            # PM
            templates.append(ShiftTemplate(tid, shop_id, shop_name, day_idx, 'PM', mid_time, close_time))
            tid += 1
            # FULL
            templates.append(ShiftTemplate(tid, shop_id, shop_name, day_idx, 'FULL', open_time, close_time))
            tid += 1
    return templates


def build_demands_from_config(shop_requirements: List[dict], shops: List[dict]) -> List[ShopDayDemand]:
    """Generate ShopDayDemand list from frontend shopRequirements & shops."""
    shop_map = {s['id']: s['name'] for s in shops}
    demands: List[ShopDayDemand] = []
    for req in shop_requirements:
        shop_id = req['shopId']
        shop_name = shop_map.get(shop_id, f'Shop{shop_id}')
        for day_idx in range(7):
            day_cfg = req.get('days', {}).get(str(day_idx), {})
            am_req = day_cfg.get('am', 0)
            pm_req = day_cfg.get('pm', 0)
            demands.append(ShopDayDemand(shop_id, shop_name, day_idx, am_req, pm_req))
    return demands


# ──────────────────────────────────────────────────────────────────────────────
# Roster Solver
# ──────────────────────────────────────────────────────────────────────────────
class RosterSolver:
    # Shop groupings
    SHOP_PREFERS_SPLIT = {'rabat', 'siggiewi', 'marsaxlokk', 'hamrun'}
    SHOP_PREFERS_FULL = {'mellieha', 'tigne point', 'marsascala'}
    SHOP_ONE_FULL_ONE_OFF = {'rabat': [2, 6]}  # Wed=2, Sun=6
    DAY_IN_DAY_OUT_SHOPS = {'tigne point', 'mellieha', 'marsascala'}
    SINGLE_PERSON_SHOPS = {'tigne point', 'mellieha', 'marsascala', 'siggiewi', 'marsaxlokk', 'rabat'}
    HAMRUN_SUNDAY_STAFF = {'am': 2, 'pm': 2}
    MAX_FULL_PER_SHOP_DAY = 1

    # === NEW: Hamrun mandatory days with exact headcount ===
    HAMRUN_MANDATORY_DAYS = [0, 5]  # Mon=0, Sat=5

    # Targets / caps
    FT_TARGET = 40
    PT_TARGET = 30
    FT_MAX = 42
    PT_MAX = 32

    # Penalties (objective weights)
    PENALTY_UNCOVERED = 1000
    PENALTY_UNDER_HOURS = 10
    PENALTY_OVER_HOURS = 20
    PENALTY_SECONDARY = 5
    PENALTY_WRONG_SHIFT_PREF = 3
    PENALTY_EXTRA_FULL = 15

    def __init__(
        self,
        employees: List[Employee],
        templates: List[ShiftTemplate],
        demands: List[ShopDayDemand],
        assignments: List[ShopAssignment],
        leave_requests: List[LeaveRequest],
        week_start: str,
        fixed_days_off: Optional[Dict[str, int]] = None,
        previous_week_sunday_shifts: Optional[List[dict]] = None,
    ):
        self.employees = [e for e in employees if not e.excluded]
        self.templates = templates
        self.demands = demands
        self.assignments = assignments
        self.leave_requests = leave_requests
        self.week_start = week_start
        self.fixed_days_off = fixed_days_off or {}
        self.previous_week_sunday_shifts = previous_week_sunday_shifts or []

        self._leave_map: Dict[int, Set[int]] = self._build_leave_map()
        self._eligibility_map, self._is_primary_map = self._build_eligibility_maps()
        self._shop_names: Dict[int, str] = self._build_shop_names()
        self._sunday_workers_by_shop: Dict[int, Set[int]] = self._build_sunday_workers_map()

    # ── helpers ──────────────────────────────────────────────────────────────
    def _build_shop_names(self) -> Dict[int, str]:
        names: Dict[int, str] = {}
        for t in self.templates:
            names[t.shop_id] = t.shop_name
        return names

    def _build_leave_map(self) -> Dict[int, Set[int]]:
        """Map employee_id -> set of day_indices on leave."""
        ws = datetime.strptime(self.week_start, '%Y-%m-%d')
        leave_map: Dict[int, Set[int]] = {}
        for lr in self.leave_requests:
            start = datetime.strptime(lr.start_date, '%Y-%m-%d')
            end = datetime.strptime(lr.end_date, '%Y-%m-%d')
            for day_offset in range(7):
                d = ws + timedelta(days=day_offset)
                if start <= d <= end:
                    leave_map.setdefault(lr.employee_id, set()).add(day_offset)
        return leave_map

    def _build_eligibility_maps(self) -> Tuple[Dict[int, Set[int]], Dict[Tuple[int, int], bool]]:
        elig: Dict[int, Set[int]] = {}
        prim: Dict[Tuple[int, int], bool] = {}
        for a in self.assignments:
            elig.setdefault(a.employee_id, set()).add(a.shop_id)
            prim[(a.employee_id, a.shop_id)] = a.is_primary
        return elig, prim

    def _build_sunday_workers_map(self) -> Dict[int, Set[int]]:
        """Map shop_id -> set of employee_ids who worked Sunday last week."""
        m: Dict[int, Set[int]] = {}
        for s in self.previous_week_sunday_shifts:
            sid = s.get('shopId')
            eid = s.get('employeeId')
            if sid is not None and eid is not None:
                m.setdefault(sid, set()).add(eid)
        return m

    def _can_work(self, emp: Employee, t: ShiftTemplate) -> bool:
        # eligibility by shop
        if t.shop_id not in self._eligibility_map.get(emp.id, set()):
            return False
        # on leave
        if t.day_index in self._leave_map.get(emp.id, set()):
            return False
        # fixed day off
        if self.fixed_days_off.get(emp.name.lower()) == t.day_index:
            return False
        # am_only employees cannot work PM or FULL
        if emp.am_only and t.shift_type in ('PM', 'FULL'):
            return False
        return True

    def _get_shop_employees(self, shop_id: int) -> List[Employee]:
        return [e for e in self.employees if shop_id in self._eligibility_map.get(e.id, set())]

    # ── main solve ───────────────────────────────────────────────────────────
    def solve(self, time_limit_seconds: int = 60) -> dict:
        model = cp_model.CpModel()

        # ─── Variables ───
        x: Dict[Tuple[int, int], cp_model.IntVar] = {}
        for emp in self.employees:
            for t in self.templates:
                if self._can_work(emp, t):
                    x[(emp.id, t.id)] = model.NewBoolVar(f'x_{emp.id}_{t.id}')

        # uncovered slots
        uncovered_am: Dict[Tuple[int, int], cp_model.IntVar] = {}
        uncovered_pm: Dict[Tuple[int, int], cp_model.IntVar] = {}
        for d in self.demands:
            uncovered_am[(d.shop_id, d.day_index)] = model.NewIntVar(0, d.am_required, f'uncov_am_{d.shop_id}_{d.day_index}')
            uncovered_pm[(d.shop_id, d.day_index)] = model.NewIntVar(0, d.pm_required, f'uncov_pm_{d.shop_id}_{d.day_index}')

        # hours
        hours_mon_sat: Dict[int, cp_model.IntVar] = {}
        hours_sunday: Dict[int, cp_model.IntVar] = {}
        under_hours: Dict[int, cp_model.IntVar] = {}
        over_hours: Dict[int, cp_model.IntVar] = {}
        for emp in self.employees:
            hours_mon_sat[emp.id] = model.NewIntVar(0, 60 * 100, f'hms_{emp.id}')
            hours_sunday[emp.id] = model.NewIntVar(0, 12 * 100, f'hsun_{emp.id}')
            under_hours[emp.id] = model.NewIntVar(0, 50 * 100, f'under_{emp.id}')
            over_hours[emp.id] = model.NewIntVar(0, 50 * 100, f'over_{emp.id}')

        # ─── Link hours to assignments ───
        for emp in self.employees:
            ms_terms = []
            sun_terms = []
            for t in self.templates:
                key = (emp.id, t.id)
                if key in x:
                    h = int(calculate_hours(t.start_time, t.end_time) * 100)
                    if t.day_index < 6:
                        ms_terms.append(h * x[key])
                    else:
                        sun_terms.append(h * x[key])
            model.Add(hours_mon_sat[emp.id] == sum(ms_terms) if ms_terms else 0)
            model.Add(hours_sunday[emp.id] == sum(sun_terms) if sun_terms else 0)

        # ─── Coverage constraints (AM / PM) ───
        for d in self.demands:
            am_terms = []
            pm_terms = []
            for t in self.templates:
                if t.shop_id != d.shop_id or t.day_index != d.day_index:
                    continue
                for emp in self.employees:
                    key = (emp.id, t.id)
                    if key not in x:
                        continue
                    if t.shift_type in ('AM', 'FULL'):
                        am_terms.append(x[key])
                    if t.shift_type in ('PM', 'FULL'):
                        pm_terms.append(x[key])
            model.Add(sum(am_terms) + uncovered_am[(d.shop_id, d.day_index)] >= d.am_required)
            model.Add(sum(pm_terms) + uncovered_pm[(d.shop_id, d.day_index)] >= d.pm_required)

        # ─── At most 1 shift per employee per day ───
        for emp in self.employees:
            for day_idx in range(7):
                day_shifts = [x[(emp.id, t.id)] for t in self.templates if (emp.id, t.id) in x and t.day_index == day_idx]
                if day_shifts:
                    model.Add(sum(day_shifts) <= 1)

        # ─── Hours deviation ───
        for emp in self.employees:
            target = self.FT_TARGET if emp.employment_type == 'full-time' else self.PT_TARGET
            cap = self.FT_MAX if emp.employment_type == 'full-time' else self.PT_MAX
            total = hours_mon_sat[emp.id] + hours_sunday[emp.id]
            model.Add(total - under_hours[emp.id] + over_hours[emp.id] == target * 100)
            model.Add(total <= cap * 100)

        # ─── Rabat Wed/Sun: exactly 1 FULL, no AM/PM ───
        rabat_id: Optional[int] = None
        for sid, sname in self._shop_names.items():
            if sname.lower() == 'rabat':
                rabat_id = sid
                break
        if rabat_id is not None:
            for day_idx in self.SHOP_ONE_FULL_ONE_OFF.get('rabat', []):
                full_shifts = [x[(e.id, t.id)] for t in self.templates if t.shop_id == rabat_id and t.day_index == day_idx and t.shift_type == 'FULL' for e in self.employees if (e.id, t.id) in x]
                if full_shifts:
                    model.Add(sum(full_shifts) == 1)
                for t in self.templates:
                    if t.shop_id == rabat_id and t.day_index == day_idx and t.shift_type in ('AM', 'PM'):
                        for e in self.employees:
                            if (e.id, t.id) in x:
                                model.Add(x[(e.id, t.id)] == 0)

        # ─── Max 1 FULL per shop per day (general) ───
        for sid in set(t.shop_id for t in self.templates):
            special_days = self.SHOP_ONE_FULL_ONE_OFF.get(self._shop_names.get(sid, '').lower(), [])
            for day_idx in range(7):
                if day_idx in special_days:
                    continue
                full_shifts = [x[(e.id, t.id)] for t in self.templates if t.shop_id == sid and t.day_index == day_idx and t.shift_type == 'FULL' for e in self.employees if (e.id, t.id) in x]
                if full_shifts:
                    model.Add(sum(full_shifts) <= self.MAX_FULL_PER_SHOP_DAY)

        # ─── Hamrun Sunday: exactly 2 AM, 2 PM, no FULL ───
        hamrun_id: Optional[int] = None
        for sid, sname in self._shop_names.items():
            if sname.lower() == 'hamrun':
                hamrun_id = sid
                break
        if hamrun_id is not None:
            for t in self.templates:
                if t.shop_id == hamrun_id and t.day_index == 6 and t.shift_type == 'FULL':
                    for e in self.employees:
                        if (e.id, t.id) in x:
                            model.Add(x[(e.id, t.id)] == 0)
            am_sun = [x[(e.id, t.id)] for t in self.templates if t.shop_id == hamrun_id and t.day_index == 6 and t.shift_type == 'AM' for e in self.employees if (e.id, t.id) in x]
            pm_sun = [x[(e.id, t.id)] for t in self.templates if t.shop_id == hamrun_id and t.day_index == 6 and t.shift_type == 'PM' for e in self.employees if (e.id, t.id) in x]
            if am_sun:
                model.Add(sum(am_sun) == self.HAMRUN_SUNDAY_STAFF['am'])
            if pm_sun:
                model.Add(sum(pm_sun) == self.HAMRUN_SUNDAY_STAFF['pm'])

        # === NEW: Issue 4 - Hamrun Monday & Saturday EXACT headcount ===
        if hamrun_id is not None:
            for day_idx in self.HAMRUN_MANDATORY_DAYS:
                day_demand = next((d for d in self.demands if d.shop_id == hamrun_id and d.day_index == day_idx), None)
                if day_demand is None:
                    continue
                am_templates = [t for t in self.templates if t.shop_id == hamrun_id and t.day_index == day_idx and t.shift_type == 'AM']
                pm_templates = [t for t in self.templates if t.shop_id == hamrun_id and t.day_index == day_idx and t.shift_type == 'PM']
                # AM constraint
                if day_demand.am_required > 0 and am_templates:
                    am_vars = [x[(e.id, t.id)] for t in am_templates for e in self.employees if (e.id, t.id) in x]
                    if am_vars:
                        model.Add(sum(am_vars) == day_demand.am_required)
                        print(f"✅ HARD: Hamrun {_day_name(day_idx)} must have exactly {day_demand.am_required} AM staff")
                # PM constraint
                if day_demand.pm_required > 0 and pm_templates:
                    pm_vars = [x[(e.id, t.id)] for t in pm_templates for e in self.employees if (e.id, t.id) in x]
                    if pm_vars:
                        model.Add(sum(pm_vars) == day_demand.pm_required)
                        print(f"✅ HARD: Hamrun {_day_name(day_idx)} must have exactly {day_demand.pm_required} PM staff")

        # ─── Day-in / Day-out (within week) ───
        for sid, sname in self._shop_names.items():
            if sname.lower() not in self.DAY_IN_DAY_OUT_SHOPS:
                continue
            for emp in self._get_shop_employees(sid):
                for day_idx in range(6):
                    shifts_today = [x[(emp.id, t.id)] for t in self.templates if t.shop_id == sid and t.day_index == day_idx and (emp.id, t.id) in x]
                    shifts_tomorrow = [x[(emp.id, t.id)] for t in self.templates if t.shop_id == sid and t.day_index == day_idx + 1 and (emp.id, t.id) in x]
                    if shifts_today and shifts_tomorrow:
                        model.Add(sum(shifts_today) + sum(shifts_tomorrow) <= 1)

        # ─── Cross-week day-in / day-out ───
        for sid, workers in self._sunday_workers_by_shop.items():
            sname = self._shop_names.get(sid, '').lower()
            if sname not in self.DAY_IN_DAY_OUT_SHOPS:
                continue
            for eid in workers:
                mon_shifts = [x[(eid, t.id)] for t in self.templates if t.shop_id == sid and t.day_index == 0 and (eid, t.id) in x]
                for v in mon_shifts:
                    model.Add(v == 0)

        # ─── Single-person shops: exactly 1 person per day ───
        for sid, sname in self._shop_names.items():
            if sname.lower() not in self.SINGLE_PERSON_SHOPS:
                continue
            special_days = self.SHOP_ONE_FULL_ONE_OFF.get(sname.lower(), [])
            for day_idx in range(7):
                if day_idx in special_days:
                    continue
                all_shifts = [x[(e.id, t.id)] for t in self.templates if t.shop_id == sid and t.day_index == day_idx for e in self.employees if (e.id, t.id) in x]
                if all_shifts:
                    model.Add(sum(all_shifts) == 1)

        # ─── Objective ───
        obj_terms = []
        for k, v in uncovered_am.items():
            obj_terms.append(self.PENALTY_UNCOVERED * v)
        for k, v in uncovered_pm.items():
            obj_terms.append(self.PENALTY_UNCOVERED * v)
        for emp in self.employees:
            obj_terms.append(self.PENALTY_UNDER_HOURS * under_hours[emp.id])
            obj_terms.append(self.PENALTY_OVER_HOURS * over_hours[emp.id])
        for emp in self.employees:
            for t in self.templates:
                key = (emp.id, t.id)
                if key not in x:
                    continue
                if not self._is_primary_map.get((emp.id, t.shop_id), False):
                    obj_terms.append(self.PENALTY_SECONDARY * x[key])
                shop_pref = self._shop_names.get(t.shop_id, '').lower()
                if shop_pref in self.SHOP_PREFERS_SPLIT and t.shift_type == 'FULL':
                    obj_terms.append(self.PENALTY_WRONG_SHIFT_PREF * x[key])
                if shop_pref in self.SHOP_PREFERS_FULL and t.shift_type in ('AM', 'PM'):
                    obj_terms.append(self.PENALTY_WRONG_SHIFT_PREF * x[key])
                if t.shift_type == 'FULL':
                    obj_terms.append(self.PENALTY_EXTRA_FULL * x[key])
        model.Minimize(sum(obj_terms))

        # ─── Solve ───
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        status = solver.Solve(model)

        status_name = {
            cp_model.OPTIMAL: 'OPTIMAL',
            cp_model.FEASIBLE: 'FEASIBLE',
            cp_model.INFEASIBLE: 'INFEASIBLE',
            cp_model.MODEL_INVALID: 'MODEL_INVALID',
            cp_model.UNKNOWN: 'UNKNOWN',
        }.get(status, 'UNKNOWN')

        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {'status': status_name, 'shifts': [], 'uncovered': {}, 'employee_summary': {}}

        # ─── Extract solution ───
        ws = datetime.strptime(self.week_start, '%Y-%m-%d')
        shifts_out: List[dict] = []
        emp_map = {e.id: e for e in self.employees}
        for emp in self.employees:
            for t in self.templates:
                key = (emp.id, t.id)
                if key in x and solver.Value(x[key]) == 1:
                    shift_date = (ws + timedelta(days=t.day_index)).strftime('%Y-%m-%d')
                    shifts_out.append({
                        'id': len(shifts_out) + 1,
                        'date': shift_date,
                        'shopId': t.shop_id,
                        'shopName': t.shop_name,
                        'employeeId': emp.id,
                        'employeeName': emp.name,
                        'startTime': t.start_time,
                        'endTime': t.end_time,
                        'hours': calculate_hours(t.start_time, t.end_time),
                        'shiftType': t.shift_type,
                        'company': emp.company,
                    })

        # uncovered summary
        uncovered_summary: Dict[str, int] = {}
        for (sid, day_idx), v in uncovered_am.items():
            val = solver.Value(v)
            if val > 0:
                uncovered_summary[f'{self._shop_names.get(sid, sid)}_AM_day{day_idx}'] = val
        for (sid, day_idx), v in uncovered_pm.items():
            val = solver.Value(v)
            if val > 0:
                uncovered_summary[f'{self._shop_names.get(sid, sid)}_PM_day{day_idx}'] = val

        # employee summary
        emp_summary: Dict[str, dict] = {}
        for emp in self.employees:
            emp_shifts = [s for s in shifts_out if s['employeeId'] == emp.id]
            target = self.FT_TARGET if emp.employment_type == 'full-time' else self.PT_TARGET
            emp_summary[emp.name] = {
                'hoursMonSat': sum(s['hours'] for s in emp_shifts if s['date'] != (ws + timedelta(days=6)).strftime('%Y-%m-%d')),
                'hoursSunday': sum(s['hours'] for s in emp_shifts if s['date'] == (ws + timedelta(days=6)).strftime('%Y-%m-%d')),
                'target': target,
                'daysWorked': len(set(s['date'] for s in emp_shifts)),
                'amShifts': sum(1 for s in emp_shifts if s['shiftType'] == 'AM'),
                'pmShifts': sum(1 for s in emp_shifts if s['shiftType'] == 'PM'),
                'fullShifts': sum(1 for s in emp_shifts if s['shiftType'] == 'FULL'),
            }

        result = {
            'status': status_name,
            'shifts': shifts_out,
            'uncovered': uncovered_summary,
            'employee_summary': emp_summary,
        }

        # === NEW: Issue 5 - Post-processing to trim overtime ===
        if status_name in ('OPTIMAL', 'FEASIBLE'):
            result['shifts'] = self._optimize_overtime(result['shifts'])

        return result

    # ══════════════════════════════════════════════════════════════════════════
    # Issue 5: Overtime trimming post-processing
    # ══════════════════════════════════════════════════════════════════════════
    def _optimize_overtime(self, shifts: List[dict]) -> List[dict]:
        """
        After the solver has found a feasible schedule, attempt to remove shifts
        from employees who are over their target hours, provided that the shop
        still meets minimum staffing.
        """
        emp_map = {e.id: e for e in self.employees}

        # Calculate hours per employee
        emp_hours: Dict[int, float] = {}
        emp_shifts: Dict[int, List[dict]] = {}
        for s in shifts:
            eid = s['employeeId']
            emp_hours[eid] = emp_hours.get(eid, 0) + s['hours']
            emp_shifts.setdefault(eid, []).append(s)

        # Identify employees in overtime
        overtime_emps: List[Tuple[int, float]] = []
        for eid, total in emp_hours.items():
            emp = emp_map.get(eid)
            if emp is None:
                continue
            target = self.FT_TARGET if emp.employment_type == 'full-time' else self.PT_TARGET
            if total > target:
                overtime_emps.append((eid, total - target))
        overtime_emps.sort(key=lambda x: -x[1])

        if not overtime_emps:
            print("⏱️ No overtime detected – skipping trimming")
            return shifts

        print(f"⏱️ {len(overtime_emps)} employees in overtime – attempting trim")

        # Group shifts by (shopId, date, shiftType) for staffing checks
        staffing: Dict[Tuple[int, str, str], List[dict]] = {}
        for s in shifts:
            key = (s['shopId'], s['date'], s['shiftType'])
            staffing.setdefault(key, []).append(s)

        shifts_to_remove: Set[int] = set()

        for eid, overtime in overtime_emps:
            emp = emp_map.get(eid)
            if emp is None:
                continue
            remaining_overtime = overtime
            for s in list(emp_shifts.get(eid, [])):
                if remaining_overtime <= 0:
                    break
                key = (s['shopId'], s['date'], s['shiftType'])
                current_staff = [sh for sh in staffing.get(key, []) if sh['id'] not in shifts_to_remove]
                shop_name = s.get('shopName', '').lower()
                min_required = 1 if shop_name in self.SINGLE_PERSON_SHOPS else 2
                if len(current_staff) > min_required:
                    shifts_to_remove.add(s['id'])
                    remaining_overtime -= s['hours']
                    print(f"✂️ Removing {emp.name}'s {s['shiftType']} at {s['shopName']} on {s['date']} (-{s['hours']}h)")

        optimized = [s for s in shifts if s['id'] not in shifts_to_remove]
        print(f"✅ Trimmed {len(shifts_to_remove)} shifts; {len(optimized)} remain")
        return optimized
