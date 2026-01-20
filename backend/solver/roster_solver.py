"""
Roster Solver using OR-Tools CP-SAT
===================================
Constraint-based roster generation that respects all business rules.
ROSTERPRO v15.1 - Fixed coverage gaps and day-in/day-out
"""

from ortools.sat.python import cp_model
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple
from datetime import datetime, timedelta
import json


@dataclass
class Employee:
    id: int
    name: str
    company: str  # 'CS' or 'CMZ'
    employment_type: str  # 'full-time' or 'part-time'
    primary_shop_id: Optional[int]
    secondary_shop_ids: List[int]
    am_only: bool = False  # e.g., Joseph
    excluded: bool = False


@dataclass
class ShiftTemplate:
    id: str
    shop_id: int
    shop_name: str
    day_index: int  # 0=Mon, 6=Sun
    shift_type: str  # 'AM', 'PM', 'FULL'
    start_time: str
    end_time: str
    hours: float
    covers_am: int  # 1 if covers AM demand, 0 otherwise
    covers_pm: int  # 1 if covers PM demand, 0 otherwise


@dataclass
class ShopDayDemand:
    shop_id: int
    shop_name: str
    company: str
    day_index: int
    demand_am: int
    demand_pm: int
    closed: bool = False


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


# ============== SHOP CONFIGURATION ==============

# Shop shift preferences
SHOP_PREFERS_SPLIT = {'Rabat', 'Siggiewi', 'Marsaxlokk', 'Hamrun'}  # Prefer AM/PM splits
SHOP_PREFERS_FULL = {'Mellieha', 'Tigne Point', 'Marsascala'}  # Prefer full day (day-in/day-out)

# Special rules: 1 FULL, 1 OFF (hard constraint)
SHOP_ONE_FULL_ONE_OFF = {
    'Rabat': [2, 6],  # Wednesday and Sunday
}

# Day-in/day-out shops - employees should NOT work consecutive days (HARD constraint)
DAY_IN_DAY_OUT_SHOPS = {'Tigne Point', 'Mellieha', 'Marsascala'}

# Single-person shops (only 1 employee works per day)
SINGLE_PERSON_SHOPS = {'Tigne Point', 'Mellieha', 'Marsascala', 'Siggiewi', 'Marsaxlokk', 'Rabat'}

# Maximum FULL shifts per shop per day
MAX_FULL_PER_SHOP_DAY = 1

# Hamrun Sunday special
HAMRUN_SUNDAY_STAFF = {'am': 2, 'pm': 2}

# Minimum gap between shifts to ensure coverage (in hours)
# If AM ends before this time, PM must start at or before this time
COVERAGE_HANDOFF_LATEST = 14.5  # 14:30 - PM must start by this time if AM ends early


class RosterSolver:
    """
    CP-SAT based roster solver.
    """
    
    def __init__(
        self,
        employees: List[Employee],
        templates: List[ShiftTemplate],
        demands: List[ShopDayDemand],
        assignments: List[ShopAssignment],
        leave_requests: List[LeaveRequest],
        week_start: str,
        fixed_days_off: Dict[str, int] = None,
    ):
        self.employees = {e.id: e for e in employees if not e.excluded}
        self.templates = templates
        self.demands = demands
        self.assignments = assignments
        self.leave_requests = leave_requests
        self.week_start = week_start
        self.fixed_days_off = fixed_days_off or {}
        
        # Build eligibility map: employee_id -> set of shop_ids
        self.eligibility: Dict[int, set] = {}
        self.is_primary: Dict[Tuple[int, int], bool] = {}
        
        for a in assignments:
            if a.employee_id not in self.eligibility:
                self.eligibility[a.employee_id] = set()
            self.eligibility[a.employee_id].add(a.shop_id)
            self.is_primary[(a.employee_id, a.shop_id)] = a.is_primary
        
        # Build leave map
        self.leave_days: Dict[int, set] = {}
        self._build_leave_map()
        
        # Build shop name lookup
        self.shop_names: Dict[int, str] = {}
        self.shop_ids: Dict[str, int] = {}
        for d in demands:
            self.shop_names[d.shop_id] = d.shop_name
            self.shop_ids[d.shop_name] = d.shop_id
        
        # Hour limits
        self.FT_TARGET = 40
        self.PT_TARGET = 30
        self.FT_MAX = 42
        self.PT_MAX = 32
        
        # Penalties
        self.PENALTY_UNCOVERED = 1000
        self.PENALTY_UNDER_HOURS = 10
        self.PENALTY_OVER_HOURS = 20
        self.PENALTY_SECONDARY = 5
        self.PENALTY_WRONG_SHIFT_PREF = 8
        self.PENALTY_EXTRA_FULL = 50
        
    def _build_leave_map(self):
        """Build map of employee -> days on leave."""
        week_start_date = datetime.strptime(self.week_start, '%Y-%m-%d')
        
        for lr in self.leave_requests:
            if lr.employee_id not in self.leave_days:
                self.leave_days[lr.employee_id] = set()
                
            leave_start = datetime.strptime(lr.start_date, '%Y-%m-%d')
            leave_end = datetime.strptime(lr.end_date, '%Y-%m-%d')
            
            for day_idx in range(7):
                check_date = week_start_date + timedelta(days=day_idx)
                if leave_start <= check_date <= leave_end:
                    self.leave_days[lr.employee_id].add(day_idx)
    
    def _can_work(self, emp_id: int, template: ShiftTemplate) -> bool:
        """Check if employee can work this template."""
        emp = self.employees.get(emp_id)
        if not emp:
            return False
            
        # Company match
        shop_company = None
        for d in self.demands:
            if d.shop_id == template.shop_id:
                shop_company = d.company
                break
        if shop_company and emp.company != shop_company:
            return False
            
        # Eligibility
        if emp_id not in self.eligibility:
            return False
        if template.shop_id not in self.eligibility[emp_id]:
            return False
            
        # Leave
        if emp_id in self.leave_days and template.day_index in self.leave_days[emp_id]:
            return False
            
        # Fixed day off
        emp_name_lower = emp.name.lower()
        if emp_name_lower in self.fixed_days_off:
            if self.fixed_days_off[emp_name_lower] == template.day_index:
                return False
                
        # AM-only
        if emp.am_only and template.shift_type in ['PM', 'FULL']:
            return False
            
        return True
    
    def _get_shop_employees(self, shop_id: int) -> List[int]:
        """Get list of employee IDs eligible for a shop."""
        result = []
        for emp_id in self.employees:
            if emp_id in self.eligibility and shop_id in self.eligibility[emp_id]:
                result.append(emp_id)
        return result
    
    def _time_to_hours(self, time_str: str) -> float:
        """Convert time string to decimal hours."""
        parts = time_str.split(':')
        return int(parts[0]) + int(parts[1]) / 60
    
    def solve(self, time_limit_seconds: int = 30) -> Dict:
        """Solve the roster problem."""
        model = cp_model.CpModel()
        
        # ========== VARIABLES ==========
        x = {}
        for emp_id in self.employees:
            for t in self.templates:
                if self._can_work(emp_id, t):
                    x[(emp_id, t.id)] = model.NewBoolVar(f'x_{emp_id}_{t.id}')
        
        # Slack variables for uncovered demand
        uncovered_am = {}
        uncovered_pm = {}
        for d in self.demands:
            if not d.closed:
                uncovered_am[(d.shop_id, d.day_index)] = model.NewIntVar(
                    0, max(1, d.demand_am), f'uncov_am_{d.shop_id}_{d.day_index}'
                )
                uncovered_pm[(d.shop_id, d.day_index)] = model.NewIntVar(
                    0, max(1, d.demand_pm), f'uncov_pm_{d.shop_id}_{d.day_index}'
                )
        
        # Hours worked
        hours_mon_sat = {}
        hours_sunday = {}
        for emp_id in self.employees:
            hours_mon_sat[emp_id] = model.NewIntVar(0, 100 * 10, f'hours_monsat_{emp_id}')
            hours_sunday[emp_id] = model.NewIntVar(0, 50 * 10, f'hours_sun_{emp_id}')
        
        # Deviation from target
        under_hours = {}
        over_hours = {}
        for emp_id, emp in self.employees.items():
            target = self.FT_TARGET if emp.employment_type == 'full-time' else self.PT_TARGET
            under_hours[emp_id] = model.NewIntVar(0, target * 10, f'under_{emp_id}')
            over_hours[emp_id] = model.NewIntVar(0, 20 * 10, f'over_{emp_id}')
        
        # ========== CONSTRAINTS ==========
        
        # 1. Coverage constraints
        for d in self.demands:
            if d.closed:
                continue
                
            # AM coverage
            am_terms = []
            for t in self.templates:
                if t.shop_id == d.shop_id and t.day_index == d.day_index and t.covers_am:
                    for emp_id in self.employees:
                        if (emp_id, t.id) in x:
                            am_terms.append(x[(emp_id, t.id)])
            
            if am_terms:
                model.Add(sum(am_terms) + uncovered_am[(d.shop_id, d.day_index)] >= d.demand_am)
            elif d.demand_am > 0:
                model.Add(uncovered_am[(d.shop_id, d.day_index)] >= d.demand_am)
            
            # PM coverage
            pm_terms = []
            for t in self.templates:
                if t.shop_id == d.shop_id and t.day_index == d.day_index and t.covers_pm:
                    for emp_id in self.employees:
                        if (emp_id, t.id) in x:
                            pm_terms.append(x[(emp_id, t.id)])
            
            if pm_terms:
                model.Add(sum(pm_terms) + uncovered_pm[(d.shop_id, d.day_index)] >= d.demand_pm)
            elif d.demand_pm > 0:
                model.Add(uncovered_pm[(d.shop_id, d.day_index)] >= d.demand_pm)
        
        # 2. One shift per employee per day (across ALL shops)
        for emp_id in self.employees:
            for day_idx in range(7):
                day_shifts = []
                for t in self.templates:
                    if t.day_index == day_idx and (emp_id, t.id) in x:
                        day_shifts.append(x[(emp_id, t.id)])
                if day_shifts:
                    model.Add(sum(day_shifts) <= 1)
        
        # 3. Hours calculation and caps
        for emp_id, emp in self.employees.items():
            max_hours = self.FT_MAX if emp.employment_type == 'full-time' else self.PT_MAX
            
            mon_sat_terms = []
            for t in self.templates:
                if t.day_index < 6 and (emp_id, t.id) in x:
                    mon_sat_terms.append(int(t.hours * 10) * x[(emp_id, t.id)])
            
            if mon_sat_terms:
                model.Add(hours_mon_sat[emp_id] == sum(mon_sat_terms))
                model.Add(hours_mon_sat[emp_id] <= max_hours * 10)
            else:
                model.Add(hours_mon_sat[emp_id] == 0)
            
            sun_terms = []
            for t in self.templates:
                if t.day_index == 6 and (emp_id, t.id) in x:
                    sun_terms.append(int(t.hours * 10) * x[(emp_id, t.id)])
            
            if sun_terms:
                model.Add(hours_sunday[emp_id] == sum(sun_terms))
            else:
                model.Add(hours_sunday[emp_id] == 0)
            
            target = self.FT_TARGET if emp.employment_type == 'full-time' else self.PT_TARGET
            target_scaled = target * 10
            
            model.Add(under_hours[emp_id] >= target_scaled - hours_mon_sat[emp_id])
            model.Add(over_hours[emp_id] >= hours_mon_sat[emp_id] - target_scaled)
        
        # 4. Rabat Wed/Sun - exactly 1 FULL shift
        for shop_name, day_indices in SHOP_ONE_FULL_ONE_OFF.items():
            shop_id = self.shop_ids.get(shop_name)
            if shop_id is None:
                continue
            
            shop_employees = self._get_shop_employees(shop_id)
            
            for day_idx in day_indices:
                full_templates = [
                    t for t in self.templates 
                    if t.shop_id == shop_id and t.day_index == day_idx and t.shift_type == 'FULL'
                ]
                
                if not full_templates:
                    print(f"⚠️ No FULL template for {shop_name} day {day_idx}")
                    continue
                
                full_shift_vars = []
                for t in full_templates:
                    for emp_id in shop_employees:
                        if (emp_id, t.id) in x:
                            full_shift_vars.append(x[(emp_id, t.id)])
                
                if full_shift_vars:
                    model.Add(sum(full_shift_vars) == 1)
                    print(f"✅ Constraint: {shop_name} day {day_idx} = exactly 1 FULL shift")
                
                # No AM or PM shifts on these days
                for t in self.templates:
                    if t.shop_id == shop_id and t.day_index == day_idx and t.shift_type in ['AM', 'PM']:
                        for emp_id in shop_employees:
                            if (emp_id, t.id) in x:
                                model.Add(x[(emp_id, t.id)] == 0)
        
        # 5. Max 1 FULL per shop per day (except special cases)
        for d in self.demands:
            if d.closed:
                continue
            
            shop_name = self.shop_names.get(d.shop_id, '')
            
            if shop_name in SHOP_ONE_FULL_ONE_OFF and d.day_index in SHOP_ONE_FULL_ONE_OFF[shop_name]:
                continue
            
            full_vars = []
            for t in self.templates:
                if t.shop_id == d.shop_id and t.day_index == d.day_index and t.shift_type == 'FULL':
                    for emp_id in self.employees:
                        if (emp_id, t.id) in x:
                            full_vars.append(x[(emp_id, t.id)])
            
            if full_vars:
                model.Add(sum(full_vars) <= MAX_FULL_PER_SHOP_DAY)
        
        # 6. Hamrun Sunday: exactly 2 AM + 2 PM, no FULL
        hamrun_id = self.shop_ids.get('Hamrun')
        if hamrun_id:
            sunday_idx = 6
            
            am_vars = []
            for t in self.templates:
                if t.shop_id == hamrun_id and t.day_index == sunday_idx and t.shift_type == 'AM':
                    for emp_id in self.employees:
                        if (emp_id, t.id) in x:
                            am_vars.append(x[(emp_id, t.id)])
            
            if am_vars:
                model.Add(sum(am_vars) == HAMRUN_SUNDAY_STAFF['am'])
                print(f"✅ Constraint: Hamrun Sunday = exactly {HAMRUN_SUNDAY_STAFF['am']} AM shifts")
            
            pm_vars = []
            for t in self.templates:
                if t.shop_id == hamrun_id and t.day_index == sunday_idx and t.shift_type == 'PM':
                    for emp_id in self.employees:
                        if (emp_id, t.id) in x:
                            pm_vars.append(x[(emp_id, t.id)])
            
            if pm_vars:
                model.Add(sum(pm_vars) == HAMRUN_SUNDAY_STAFF['pm'])
                print(f"✅ Constraint: Hamrun Sunday = exactly {HAMRUN_SUNDAY_STAFF['pm']} PM shifts")
            
            full_vars = []
            for t in self.templates:
                if t.shop_id == hamrun_id and t.day_index == sunday_idx and t.shift_type == 'FULL':
                    for emp_id in self.employees:
                        if (emp_id, t.id) in x:
                            full_vars.append(x[(emp_id, t.id)])
            
            if full_vars:
                model.Add(sum(full_vars) == 0)
                print(f"✅ Constraint: Hamrun Sunday = no FULL shifts")
        
        # 7. DAY-IN/DAY-OUT: No consecutive days for single-person shops (HARD constraint)
        for shop_name in DAY_IN_DAY_OUT_SHOPS:
            shop_id = self.shop_ids.get(shop_name)
            if shop_id is None:
                continue
            
            shop_employees = self._get_shop_employees(shop_id)
            
            for emp_id in shop_employees:
                for day_idx in range(6):  # Mon-Sat (pairs: 0-1, 1-2, 2-3, 3-4, 4-5, 5-6)
                    # Get all shift vars for today and tomorrow at this shop
                    today_vars = []
                    tomorrow_vars = []
                    
                    for t in self.templates:
                        if t.shop_id == shop_id:
                            if t.day_index == day_idx and (emp_id, t.id) in x:
                                today_vars.append(x[(emp_id, t.id)])
                            if t.day_index == day_idx + 1 and (emp_id, t.id) in x:
                                tomorrow_vars.append(x[(emp_id, t.id)])
                    
                    # Hard constraint: can't work both consecutive days
                    if today_vars and tomorrow_vars:
                        model.Add(sum(today_vars) + sum(tomorrow_vars) <= 1)
            
            print(f"✅ Constraint: {shop_name} = day-in/day-out (no consecutive days)")
        
        # 8. Single-person shops: exactly 1 person per day (either AM+PM split or FULL)
        for shop_name in SINGLE_PERSON_SHOPS:
            shop_id = self.shop_ids.get(shop_name)
            if shop_id is None:
                continue
            
            # Skip special 1-FULL-1-OFF days (already handled)
            for day_idx in range(7):
                if shop_name in SHOP_ONE_FULL_ONE_OFF and day_idx in SHOP_ONE_FULL_ONE_OFF[shop_name]:
                    continue
                
                # Skip day-in/day-out shops that use FULL (they need 1 FULL per day)
                if shop_name in DAY_IN_DAY_OUT_SHOPS:
                    # For day-in/day-out, we want exactly 1 FULL shift
                    full_vars = []
                    for t in self.templates:
                        if t.shop_id == shop_id and t.day_index == day_idx and t.shift_type == 'FULL':
                            for emp_id in self.employees:
                                if (emp_id, t.id) in x:
                                    full_vars.append(x[(emp_id, t.id)])
                    
                    if full_vars:
                        model.Add(sum(full_vars) == 1)
                    continue
                
                # For split shops (Siggiewi, Marsaxlokk, Rabat on non-special days):
                # Either 1 AM + 1 PM from same person, OR 1 FULL
                # This is handled by coverage constraints already
        
        # ========== OBJECTIVE ==========
        objective_terms = []
        
        # Uncovered demand penalty
        for key in uncovered_am:
            objective_terms.append(self.PENALTY_UNCOVERED * uncovered_am[key])
        for key in uncovered_pm:
            objective_terms.append(self.PENALTY_UNCOVERED * uncovered_pm[key])
        
        # Hours deviation penalty
        for emp_id in self.employees:
            objective_terms.append(self.PENALTY_UNDER_HOURS * under_hours[emp_id])
            objective_terms.append(self.PENALTY_OVER_HOURS * over_hours[emp_id])
        
        # Secondary shop penalty
        for (emp_id, t_id), var in x.items():
            t = next(t for t in self.templates if t.id == t_id)
            if not self.is_primary.get((emp_id, t.shop_id), False):
                objective_terms.append(self.PENALTY_SECONDARY * var)
        
        # Shift preference penalty
        for (emp_id, t_id), var in x.items():
            t = next(t for t in self.templates if t.id == t_id)
            shop_name = self.shop_names.get(t.shop_id, '')
            
            # Penalize FULL shifts in shops that prefer split
            if shop_name in SHOP_PREFERS_SPLIT and t.shift_type == 'FULL':
                if shop_name in SHOP_ONE_FULL_ONE_OFF and t.day_index in SHOP_ONE_FULL_ONE_OFF[shop_name]:
                    pass  # No penalty for mandated FULL days
                else:
                    objective_terms.append(self.PENALTY_WRONG_SHIFT_PREF * var)
            
            # Penalize AM/PM splits in shops that prefer full day
            if shop_name in SHOP_PREFERS_FULL and t.shift_type in ['AM', 'PM']:
                objective_terms.append(self.PENALTY_WRONG_SHIFT_PREF * var)
        
        model.Minimize(sum(objective_terms))
        
        # ========== SOLVE ==========
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        status = solver.Solve(model)
        
        # ========== EXTRACT SOLUTION ==========
        result = {
            'status': 'OPTIMAL' if status == cp_model.OPTIMAL else 
                      'FEASIBLE' if status == cp_model.FEASIBLE else 'INFEASIBLE',
            'shifts': [],
            'uncovered': [],
            'employee_summary': []
        }
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            for (emp_id, t_id), var in x.items():
                if solver.Value(var) == 1:
                    t = next(t for t in self.templates if t.id == t_id)
                    emp = self.employees[emp_id]
                    
                    week_start_date = datetime.strptime(self.week_start, '%Y-%m-%d')
                    shift_date = week_start_date + timedelta(days=t.day_index)
                    
                    result['shifts'].append({
                        'date': shift_date.strftime('%Y-%m-%d'),
                        'shopId': t.shop_id,
                        'shopName': t.shop_name,
                        'employeeId': emp_id,
                        'employeeName': emp.name,
                        'startTime': t.start_time,
                        'endTime': t.end_time,
                        'hours': t.hours,
                        'shiftType': t.shift_type,
                        'company': emp.company
                    })
            
            for (shop_id, day_idx), var in uncovered_am.items():
                val = solver.Value(var)
                if val > 0:
                    result['uncovered'].append({
                        'shopId': shop_id, 'dayIndex': day_idx, 'type': 'AM', 'count': val
                    })
            for (shop_id, day_idx), var in uncovered_pm.items():
                val = solver.Value(var)
                if val > 0:
                    result['uncovered'].append({
                        'shopId': shop_id, 'dayIndex': day_idx, 'type': 'PM', 'count': val
                    })
            
            for emp_id, emp in self.employees.items():
                mon_sat = solver.Value(hours_mon_sat[emp_id]) / 10
                sun = solver.Value(hours_sunday[emp_id]) / 10
                target = self.FT_TARGET if emp.employment_type == 'full-time' else self.PT_TARGET
                
                am_count = pm_count = full_count = 0
                days_worked = set()
                for (e_id, t_id), var in x.items():
                    if e_id == emp_id and solver.Value(var) == 1:
                        t = next(t for t in self.templates if t.id == t_id)
                        days_worked.add(t.day_index)
                        if t.shift_type == 'AM':
                            am_count += 1
                        elif t.shift_type == 'PM':
                            pm_count += 1
                        elif t.shift_type == 'FULL':
                            full_count += 1
                
                result['employee_summary'].append({
                    'employeeId': emp_id,
                    'employeeName': emp.name,
                    'company': emp.company,
                    'type': emp.employment_type,
                    'target': target,
                    'hoursMonSat': mon_sat,
                    'hoursSunday': sun,
                    'daysWorked': len(days_worked),
                    'amShifts': am_count,
                    'pmShifts': pm_count,
                    'fullShifts': full_count
                })
        
        return result


def calculate_hours(start: str, end: str) -> float:
    """Calculate hours between two time strings."""
    start_parts = start.split(':')
    end_parts = end.split(':')
    start_h = int(start_parts[0]) + int(start_parts[1]) / 60
    end_h = int(end_parts[0]) + int(end_parts[1]) / 60
    return end_h - start_h


def build_templates_from_config(shop_requirements: Dict, shops: List[Dict]) -> List[ShiftTemplate]:
    """Build ShiftTemplate list from shop requirements config."""
    templates = []
    template_id = 0
    
    day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    for shop in shops:
        shop_name = shop['name']
        shop_id = shop['id']
        
        if shop_name not in shop_requirements:
            continue
            
        req = shop_requirements[shop_name]
        
        for day_idx, day_name in enumerate(day_names):
            if day_name not in req:
                continue
                
            day_req = req[day_name]
            
            if day_req.get('closed', False):
                continue
            
            am_times = day_req.get('amTimes', []) or []
            pm_times = day_req.get('pmTimes', []) or []
            full_times = day_req.get('fullTimes', []) or []
            
            # AM template
            if am_times:
                am = am_times[0]
                hours = calculate_hours(am['start'], am['end'])
                templates.append(ShiftTemplate(
                    id=f't_{template_id}',
                    shop_id=shop_id,
                    shop_name=shop_name,
                    day_index=day_idx,
                    shift_type='AM',
                    start_time=am['start'],
                    end_time=am['end'],
                    hours=hours,
                    covers_am=1,
                    covers_pm=0
                ))
                template_id += 1
            
            # PM template
            if pm_times:
                pm = pm_times[0]
                hours = calculate_hours(pm['start'], pm['end'])
                templates.append(ShiftTemplate(
                    id=f't_{template_id}',
                    shop_id=shop_id,
                    shop_name=shop_name,
                    day_index=day_idx,
                    shift_type='PM',
                    start_time=pm['start'],
                    end_time=pm['end'],
                    hours=hours,
                    covers_am=0,
                    covers_pm=1
                ))
                template_id += 1
            
            # FULL template
            if full_times:
                fd = full_times[0]
                hours = calculate_hours(fd['start'], fd['end'])
                templates.append(ShiftTemplate(
                    id=f't_{template_id}',
                    shop_id=shop_id,
                    shop_name=shop_name,
                    day_index=day_idx,
                    shift_type='FULL',
                    start_time=fd['start'],
                    end_time=fd['end'],
                    hours=hours,
                    covers_am=1,
                    covers_pm=1
                ))
                template_id += 1
    
    return templates


def build_demands_from_config(shop_requirements: Dict, shops: List[Dict]) -> List[ShopDayDemand]:
    """Build ShopDayDemand list from shop requirements config."""
    demands = []
    day_names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    
    for shop in shops:
        shop_name = shop['name']
        shop_id = shop['id']
        company = shop.get('company', 'CS')
        
        if shop_name not in shop_requirements:
            continue
            
        req = shop_requirements[shop_name]
        
        for day_idx, day_name in enumerate(day_names):
            if day_name not in req:
                demands.append(ShopDayDemand(
                    shop_id=shop_id,
                    shop_name=shop_name,
                    company=company,
                    day_index=day_idx,
                    demand_am=0,
                    demand_pm=0,
                    closed=True
                ))
                continue
                
            day_req = req[day_name]
            closed = day_req.get('closed', False)
            
            patterns = day_req.get('patterns') or [{'am': 0, 'pm': 0, 'full': 0}]
            p0 = patterns[0]
            
            demand_am = int(p0.get('am', 0))
            demand_pm = int(p0.get('pm', 0))
            
            # Special handling for 1-FULL-1-OFF days
            if shop_name in SHOP_ONE_FULL_ONE_OFF and day_idx in SHOP_ONE_FULL_ONE_OFF[shop_name]:
                demand_am = 1
                demand_pm = 1
            
            # Special handling for day-in/day-out shops (need 1 FULL = covers both)
            if shop_name in DAY_IN_DAY_OUT_SHOPS:
                demand_am = 1
                demand_pm = 1
            
            # Special handling for Hamrun Sunday
            if shop_name == 'Hamrun' and day_idx == 6:
                demand_am = HAMRUN_SUNDAY_STAFF['am']
                demand_pm = HAMRUN_SUNDAY_STAFF['pm']
            
            demands.append(ShopDayDemand(
                shop_id=shop_id,
                shop_name=shop_name,
                company=company,
                day_index=day_idx,
                demand_am=demand_am,
                demand_pm=demand_pm,
                closed=closed
            ))
    
    return demands
