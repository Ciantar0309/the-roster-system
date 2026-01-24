# backend/solver/roster_solver.py
"""
ROSTERPRO v23.0 - Smart Roster Solver
=====================================

BOSS'S RULES:
1. NEVER leave a shop uncovered - someone must be there AM AND PM
2. Meet the ACTUAL staffing requirements (amStaff/pmStaff per day)
3. No overtime unless absolutely necessary
4. Everyone gets their hours (40/30/20)

PRIORITY ORDER:
1. COVERAGE - Every shop meets its amStaff/pmStaff requirements
2. HOURS - Everyone hits target
3. NO OVERTIME - Trim, swap, do whatever
4. LAST RESORT - Overtime (never for students)
"""

from ortools.sat.python import cp_model
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Any
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ============== DATA CLASSES ==============

@dataclass
class Employee:
    id: int
    name: str
    company: str = "CS"
    employment_type: str = "full-time"
    primaryShopId: Optional[int] = None
    secondaryShopIds: List[int] = field(default_factory=list)
    am_only: bool = False
    excluded: bool = False
    weekly_hours: int = 40

@dataclass
class LeaveRequest:
    employee_id: int
    start_date: str
    end_date: str

@dataclass
class ShopAssignment:
    employee_id: int
    shop_id: int
    is_primary: bool = False

@dataclass
class ShiftTemplate:
    id: str
    shop_id: int
    shop_name: str
    company: str
    shift_type: str
    start_time: str
    end_time: str
    hours: float
    day: Optional[str] = None

@dataclass
class DemandEntry:
    shop_id: int
    shop_name: str
    day: str
    shift_type: str
    required: int
    is_mandatory: bool = False
    allow_full_day: bool = True

# ============== CONSTANTS ==============

HOURS_TARGET = {
    'full-time': 40,
    'part-time': 30,
    'student': 20,
}

HOURS_MAX = {
    'full-time': 48,
    'part-time': 40,
    'student': 20,  # NEVER overtime
}

MIN_SHIFT_HOURS = 4.0
MAX_SHIFT_HOURS = 8.0

# Penalties - higher = less preferred
PENALTY_UNCOVERED = 100000      # Shop not covered - DISASTER
PENALTY_UNDER_STAFF = 50000     # Below required staff count
PENALTY_STUDENT_OT = 100000     # Student overtime - NEVER
PENALTY_OVERTIME = 5000         # Regular overtime - avoid
PENALTY_UNDER_HOURS = 1000      # Under target hours
PENALTY_OVER_HOURS = 2000       # Over target (but not OT threshold)
PENALTY_FULL_DAY = 5            # Slight preference for splits
PENALTY_IMBALANCE = 100         # Hours imbalance between employees

DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
DAY_TO_INDEX = {day: i for i, day in enumerate(DAYS)}


# ============== HELPER FUNCTIONS ==============

def build_templates_from_config(shop_requirements: Dict, shops: List[Dict]) -> List[ShiftTemplate]:
    """Build shift templates from shop configuration."""
    templates = []
    
    shop_by_id = {s['id']: s for s in shops}
    shop_by_name = {s['name'].lower(): s for s in shops}
    
    for shop_key, requirements in shop_requirements.items():
        shop = None
        if isinstance(shop_key, int):
            shop = shop_by_id.get(shop_key)
        elif isinstance(shop_key, str):
            try:
                shop_id = int(shop_key)
                shop = shop_by_id.get(shop_id)
            except ValueError:
                shop = shop_by_name.get(shop_key.lower())
        
        if not shop or not shop.get('isActive', True):
            continue
        
        shop_id = shop['id']
        shop_name = shop.get('name', f'Shop {shop_id}')
        company = shop.get('company', 'CS')
        open_time = shop.get('openTime', '06:30')
        close_time = shop.get('closeTime', '21:30')
        
        # Calculate hours
        open_h, open_m = map(int, open_time.split(':'))
        close_h, close_m = map(int, close_time.split(':'))
        open_decimal = open_h + open_m / 60
        close_decimal = close_h + close_m / 60
        full_hours = close_decimal - open_decimal
        
        # Calculate midpoint for AM/PM split
        mid_time = (open_decimal + close_decimal) / 2
        mid_h = int(mid_time)
        mid_m = int((mid_time - mid_h) * 60)
        mid_time_str = f'{mid_h:02d}:{mid_m:02d}'
        
        am_hours = mid_time - open_decimal
        pm_hours = close_decimal - mid_time
        
        # Standard templates
        templates.append(ShiftTemplate(
            id=f'{shop_id}_AM',
            shop_id=shop_id,
            shop_name=shop_name,
            company=company,
            shift_type='AM',
            start_time=open_time,
            end_time=mid_time_str,
            hours=round(am_hours, 2)
        ))
        
        templates.append(ShiftTemplate(
            id=f'{shop_id}_PM',
            shop_id=shop_id,
            shop_name=shop_name,
            company=company,
            shift_type='PM',
            start_time=mid_time_str,
            end_time=close_time,
            hours=round(pm_hours, 2)
        ))
        
        templates.append(ShiftTemplate(
            id=f'{shop_id}_FULL',
            shop_id=shop_id,
            shop_name=shop_name,
            company=company,
            shift_type='FULL',
            start_time=open_time,
            end_time=close_time,
            hours=round(full_hours, 2)
        ))
        
        # Custom shifts from special requests
        for req in shop.get('specialRequests', []):
            day = req.get('day')
            for i, shift in enumerate(req.get('shifts', [])):
                start = shift.get('start', open_time)
                end = shift.get('end', close_time)
                
                start_h, start_m = map(int, start.split(':'))
                end_h, end_m = map(int, end.split(':'))
                hours = (end_h + end_m/60) - (start_h + start_m/60)
                
                templates.append(ShiftTemplate(
                    id=f'{shop_id}_CUSTOM_{day}_{i}',
                    shop_id=shop_id,
                    shop_name=shop_name,
                    company=company,
                    shift_type='CUSTOM',
                    start_time=start,
                    end_time=end,
                    hours=round(hours, 2),
                    day=day
                ))
    
    logger.info(f"Built {len(templates)} shift templates")
    return templates


def build_demands_from_config(shop_requirements: Dict, shops: List[Dict], shop_rules: Dict = None) -> List[DemandEntry]:
    """Build demand entries from shop configuration."""
    demands = []
    
    shop_by_id = {s['id']: s for s in shops}
    shop_by_name = {s['name'].lower(): s for s in shops}
    
    for shop_key, requirements in shop_requirements.items():
        shop = None
        if isinstance(shop_key, int):
            shop = shop_by_id.get(shop_key)
        elif isinstance(shop_key, str):
            try:
                shop_id = int(shop_key)
                shop = shop_by_id.get(shop_id)
            except ValueError:
                shop = shop_by_name.get(shop_key.lower())
        
        if not shop or not shop.get('isActive', True):
            continue
        
        shop_id = shop['id']
        shop_name = shop.get('name', f'Shop {shop_id}')
        shop_reqs = shop.get('requirements', [])
        rules = shop.get('rules', {})
        sunday_closed = rules.get('sunday_closed', False)
        
        logger.info(f"Building demands for {shop_name} (ID: {shop_id})")
        logger.info(f"  Requirements from DB: {shop_reqs}")
        
        for day in DAYS:
            if day == 'Sun' and sunday_closed:
                logger.info(f"  {day}: CLOSED (sunday_closed rule)")
                continue
            
            # Find the requirement for this day
            day_req = None
            for req in shop_reqs:
                if req.get('day') == day:
                    day_req = req
                    break
            
            # Default if no requirement found
            if not day_req:
                day_req = {'amStaff': 1, 'pmStaff': 1, 'allowFullDay': True, 'isMandatory': False}
                logger.info(f"  {day}: Using defaults (no config found)")
            
            am_staff = day_req.get('amStaff', 1)
            pm_staff = day_req.get('pmStaff', 1)
            allow_full = day_req.get('allowFullDay', True)
            is_mandatory = day_req.get('isMandatory', False)
            
            # Ensure at least 1 for coverage
            am_staff = max(am_staff, 1)
            pm_staff = max(pm_staff, 1)
            
            logger.info(f"  {day}: AM={am_staff}, PM={pm_staff}, mandatory={is_mandatory}")
            
            demands.append(DemandEntry(
                shop_id=shop_id,
                shop_name=shop_name,
                day=day,
                shift_type='AM',
                required=am_staff,
                is_mandatory=is_mandatory,
                allow_full_day=allow_full
            ))
            
            demands.append(DemandEntry(
                shop_id=shop_id,
                shop_name=shop_name,
                day=day,
                shift_type='PM',
                required=pm_staff,
                is_mandatory=is_mandatory,
                allow_full_day=allow_full
            ))
    
    logger.info(f"Built {len(demands)} demand entries")
    return demands


# ============== MAIN SOLVER CLASS ==============

class RosterSolver:
    """Smart roster solver - covers shops, hits hours, avoids overtime."""
    
    def __init__(
        self,
        employees: List[Employee],
        templates: List[ShiftTemplate],
        demands: List[DemandEntry],
        assignments: List[ShopAssignment],
        leave_requests: List[LeaveRequest],
        week_start: str,
        fixed_days_off: Dict[str, str] = None,
        previous_week_sunday_shifts: List[Dict] = None,
        shop_rules: Dict = None
    ):
        self.employees = [e for e in employees if not e.excluded]
        self.templates = templates
        self.demands = demands
        self.assignments = assignments
        self.leave_requests = leave_requests
        self.week_start = datetime.strptime(week_start, '%Y-%m-%d')
        self.fixed_days_off = fixed_days_off or {}
        self.previous_week_sunday_shifts = previous_week_sunday_shifts or []
        self.shop_rules = shop_rules or {}
        
        self.model = cp_model.CpModel()
        self.shifts: Dict[Tuple, Any] = {}
        self.shift_hours: Dict[Tuple, float] = {}
        
        # Build lookups
        self.emp_by_id = {e.id: e for e in self.employees}
        self.template_by_id = {t.id: t for t in self.templates}
        
        # Employee shops - which shops can each employee work at?
        self.emp_shops: Dict[int, List[int]] = {}
        for emp in self.employees:
            shops_list = []
            if emp.primaryShopId:
                shops_list.append(emp.primaryShopId)
            if emp.secondaryShopIds:
                shops_list.extend(emp.secondaryShopIds)
            self.emp_shops[emp.id] = shops_list
        
        # Also add from assignments
        for assign in self.assignments:
            if assign.employee_id not in self.emp_shops:
                self.emp_shops[assign.employee_id] = []
            if assign.shop_id not in self.emp_shops[assign.employee_id]:
                self.emp_shops[assign.employee_id].append(assign.shop_id)
        
        # Leave lookup - which dates is each employee on leave?
        self.leave_dates: Dict[int, set] = {}
        for lr in self.leave_requests:
            if lr.employee_id not in self.leave_dates:
                self.leave_dates[lr.employee_id] = set()
            start = datetime.strptime(lr.start_date, '%Y-%m-%d')
            end = datetime.strptime(lr.end_date, '%Y-%m-%d')
            current = start
            while current <= end:
                self.leave_dates[lr.employee_id].add(current.strftime('%Y-%m-%d'))
                current += timedelta(days=1)
        
        # Group templates by shop
        self.templates_by_shop: Dict[int, List[ShiftTemplate]] = {}
        for t in self.templates:
            if t.shop_id not in self.templates_by_shop:
                self.templates_by_shop[t.shop_id] = []
            self.templates_by_shop[t.shop_id].append(t)
        
        # Group demands by shop and day
        self.demands_by_shop_day: Dict[Tuple[int, str], List[DemandEntry]] = {}
        for d in self.demands:
            key = (d.shop_id, d.day)
            if key not in self.demands_by_shop_day:
                self.demands_by_shop_day[key] = []
            self.demands_by_shop_day[key].append(d)
        
        logger.info(f"Solver initialized: {len(self.employees)} employees, {len(self.templates)} templates, {len(self.demands)} demands")
    
    def _is_on_leave(self, emp_id: int, day: str) -> bool:
        """Check if employee is on leave for a given day."""
        day_idx = DAY_TO_INDEX.get(day, 0)
        date = self.week_start + timedelta(days=day_idx)
        return date.strftime('%Y-%m-%d') in self.leave_dates.get(emp_id, set())
    
    def _has_fixed_day_off(self, emp: Employee, day: str) -> bool:
        """Check if employee has a fixed day off."""
        name_lower = emp.name.lower().strip()
        fixed_day = self.fixed_days_off.get(name_lower, None)
        
        if fixed_day is None:
            return False
        
        # Handle if it's a day index (0-6) instead of day name
        if isinstance(fixed_day, int):
            day_idx = DAY_TO_INDEX.get(day, -1)
            return fixed_day == day_idx
        
        # Handle if it's a day name string
        if isinstance(fixed_day, str):
            return fixed_day.lower() == day.lower()
        
        return False
    
    def build_variables(self):
        """Create shift assignment variables."""
        logger.info("Building variables...")
        
        for emp in self.employees:
            emp_id = emp.id
            emp_shop_ids = self.emp_shops.get(emp_id, [])
            
            if not emp_shop_ids:
                logger.warning(f"Employee {emp.name} has no shop assignments")
                continue
            
            for shop_id in emp_shop_ids:
                shop_templates = self.templates_by_shop.get(shop_id, [])
                
                for day in DAYS:
                    # Skip if on leave
                    if self._is_on_leave(emp_id, day):
                        continue
                    
                    # Skip if fixed day off
                    if self._has_fixed_day_off(emp, day):
                        continue
                    
                    for template in shop_templates:
                        # Day-specific templates (custom shifts)
                        if template.day and template.day != day:
                            continue
                        
                        # AM-only employees can't work PM or FULL
                        if emp.am_only and template.shift_type in ['PM', 'FULL']:
                            continue
                        
                        key = (emp_id, shop_id, day, template.shift_type, template.id)
                        self.shifts[key] = self.model.NewBoolVar(
                            f'shift_{emp_id}_{shop_id}_{day}_{template.shift_type}'
                        )
                        self.shift_hours[key] = template.hours
        
        logger.info(f"Created {len(self.shifts)} shift variables")
    
    def add_coverage_constraints(self):
        """Ensure every shop meets its staffing requirements."""
        logger.info("Adding coverage constraints...")
        
        # Get unique shop-day combinations
        shop_days = set()
        for d in self.demands:
            shop_days.add((d.shop_id, d.day))
        
        for shop_id, day in shop_days:
            demands_for_day = self.demands_by_shop_day.get((shop_id, day), [])
            if not demands_for_day:
                continue
            
            # Find all shifts for this shop/day
            am_shifts = []
            pm_shifts = []
            full_shifts = []
            
            for key, var in self.shifts.items():
                emp_id, s_id, d, shift_type, template_id = key
                if s_id != shop_id or d != day:
                    continue
                
                if shift_type == 'AM':
                    am_shifts.append(var)
                elif shift_type == 'PM':
                    pm_shifts.append(var)
                elif shift_type == 'FULL':
                    full_shifts.append(var)
                elif shift_type == 'CUSTOM':
                    # Custom shifts - check times to determine AM/PM coverage
                    template = self.template_by_id.get(template_id)
                    if template:
                        start_h = int(template.start_time.split(':')[0])
                        end_h = int(template.end_time.split(':')[0])
                        # If starts before noon, contributes to AM
                        if start_h < 12:
                            am_shifts.append(var)
                        # If ends after 2pm, contributes to PM
                        if end_h >= 14:
                            pm_shifts.append(var)
            
            # Get required staff counts from demands
            am_required = 1
            pm_required = 1
            am_mandatory = False
            pm_mandatory = False
            
            for demand in demands_for_day:
                if demand.shift_type == 'AM':
                    am_required = demand.required
                    am_mandatory = demand.is_mandatory
                elif demand.shift_type == 'PM':
                    pm_required = demand.required
                    pm_mandatory = demand.is_mandatory
            
            # Log what we're enforcing
            shop_name = demands_for_day[0].shop_name if demands_for_day else f"Shop {shop_id}"
            logger.info(f"  {shop_name} {day}: AM>={am_required} (mandatory={am_mandatory}), PM>={pm_required} (mandatory={pm_mandatory})")
            
            # AM COVERAGE: AM shifts + FULL shifts count toward AM requirement
            am_coverage = am_shifts + full_shifts
            if am_coverage:
                if am_mandatory:
                    # Mandatory = exact count required
                    self.model.Add(sum(am_coverage) == am_required)
                    logger.info(f"    -> AM constraint: EXACTLY {am_required}")
                else:
                    # Non-mandatory = at least this many (HARD constraint!)
                    self.model.Add(sum(am_coverage) >= am_required)
                    logger.info(f"    -> AM constraint: AT LEAST {am_required}")
            else:
                logger.warning(f"    -> NO AM shifts available for {shop_name} on {day}!")
            
            # PM COVERAGE: PM shifts + FULL shifts count toward PM requirement
            pm_coverage = pm_shifts + full_shifts
            if pm_coverage:
                if pm_mandatory:
                    # Mandatory = exact count required
                    self.model.Add(sum(pm_coverage) == pm_required)
                    logger.info(f"    -> PM constraint: EXACTLY {pm_required}")
                else:
                    # Non-mandatory = at least this many (HARD constraint!)
                    self.model.Add(sum(pm_coverage) >= pm_required)
                    logger.info(f"    -> PM constraint: AT LEAST {pm_required}")
            else:
                logger.warning(f"    -> NO PM shifts available for {shop_name} on {day}!")
    
    def add_employee_constraints(self):
        """One shift per day max, at least 1 day off per week."""
        logger.info("Adding employee constraints...")
        
        for emp in self.employees:
            emp_id = emp.id
            
            # ONE SHIFT PER DAY (can't work AM and PM at different shops)
            for day in DAYS:
                day_shifts = [var for key, var in self.shifts.items() 
                              if key[0] == emp_id and key[2] == day]
                if day_shifts:
                    self.model.Add(sum(day_shifts) <= 1)
            
            # AT LEAST 1 DAY OFF per week
            week_shifts = [var for key, var in self.shifts.items() if key[0] == emp_id]
            if week_shifts:
                self.model.Add(sum(week_shifts) <= 6)
            
            # AM-only constraint (belt and suspenders - also checked in variable creation)
            if emp.am_only:
                for key, var in self.shifts.items():
                    if key[0] == emp_id and key[3] in ['PM', 'FULL']:
                        self.model.Add(var == 0)
    
    def add_hours_constraints(self):
        """Students can NEVER exceed their max hours."""
        logger.info("Adding hours constraints...")
        
        for emp in self.employees:
            if emp.employment_type == 'student':
                emp_id = emp.id
                hour_terms = []
                
                for key, var in self.shifts.items():
                    if key[0] == emp_id:
                        hours = self.shift_hours[key]
                        hour_terms.append((var, int(hours * 10)))  # Scale by 10 for precision
                
                if hour_terms:
                    total = sum(var * hrs for var, hrs in hour_terms)
                    max_hrs = HOURS_MAX['student']
                    self.model.Add(total <= int(max_hrs * 10))
                    logger.info(f"  Student {emp.name}: max {max_hrs}h (HARD)")
    
    def add_objective(self):
        """Minimize: under-staffing, overtime, hours imbalance."""
        logger.info("Adding objective function...")
        
        penalties = []
        
        # HOURS PENALTIES
        for emp in self.employees:
            emp_id = emp.id
            emp_type = emp.employment_type
            target = HOURS_TARGET.get(emp_type, 40)
            max_hrs = HOURS_MAX.get(emp_type, 48)
            
            hour_terms = []
            for key, var in self.shifts.items():
                if key[0] == emp_id:
                    hours = self.shift_hours[key]
                    hour_terms.append(var * int(hours * 10))
            
            if hour_terms:
                total = sum(hour_terms)
                target_x10 = int(target * 10)
                max_x10 = int(max_hrs * 10)
                
                # Under hours penalty
                under = self.model.NewIntVar(0, target_x10, f'under_{emp_id}')
                self.model.AddMaxEquality(under, [target_x10 - total, 0])
                penalties.append(under * PENALTY_UNDER_HOURS)
                
                # Over target penalty (soft)
                over_target = self.model.NewIntVar(0, 200, f'over_target_{emp_id}')
                self.model.AddMaxEquality(over_target, [total - target_x10, 0])
                penalties.append(over_target * PENALTY_OVER_HOURS)
                
                # Overtime penalty (hard for students via constraint, soft penalty for others)
                if emp_type == 'student':
                    # Already constrained - add massive penalty as backup
                    overtime = self.model.NewIntVar(0, 200, f'ot_{emp_id}')
                    self.model.AddMaxEquality(overtime, [total - max_x10, 0])
                    penalties.append(overtime * PENALTY_STUDENT_OT)
                else:
                    # Penalize overtime for non-students
                    overtime = self.model.NewIntVar(0, 200, f'ot_{emp_id}')
                    self.model.AddMaxEquality(overtime, [total - int(40 * 10), 0])
                    penalties.append(overtime * PENALTY_OVERTIME)
        
        # Small penalty for FULL days (prefer splits when coverage is equal)
        for key, var in self.shifts.items():
            if key[3] == 'FULL':
                penalties.append(var * PENALTY_FULL_DAY)
        
        if penalties:
            self.model.Minimize(sum(penalties))
            logger.info(f"Objective has {len(penalties)} penalty terms")
    
    def solve(self, time_limit_seconds: int = 60) -> Dict:
        """Solve the roster and return results."""
        logger.info("=" * 50)
        logger.info("STARTING SOLVER")
        logger.info("=" * 50)
        
        self.build_variables()
        self.add_coverage_constraints()
        self.add_employee_constraints()
        self.add_hours_constraints()
        self.add_objective()
        
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        solver.parameters.num_search_workers = 8
        
        logger.info(f"Solving with {time_limit_seconds}s time limit...")
        status = solver.Solve(self.model)
        
        status_name = solver.StatusName(status)
        logger.info(f"Solver status: {status_name}")
        
        if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
            return self._extract_solution(solver, status)
        else:
            logger.error(f"No solution found: {status_name}")
            return {
                'status': 'INFEASIBLE',
                'error': f'No solution found: {status_name}',
                'shifts': [],
                'message': 'The constraints could not be satisfied. Check staffing requirements vs available employees.'
            }
    
    def _extract_solution(self, solver: cp_model.CpSolver, status: int) -> Dict:
        """Extract the solution into shift assignments."""
        shifts = []
        employee_hours: Dict[int, float] = {e.id: 0.0 for e in self.employees}
        employee_days: Dict[int, int] = {e.id: 0 for e in self.employees}
        
        for key, var in self.shifts.items():
            if solver.Value(var) == 1:
                emp_id, shop_id, day, shift_type, template_id = key
                
                emp = self.emp_by_id.get(emp_id)
                template = self.template_by_id.get(template_id)
                
                if not emp or not template:
                    continue
                
                hours = template.hours
                employee_hours[emp_id] += hours
                employee_days[emp_id] += 1
                
                day_idx = DAY_TO_INDEX[day]
                shift_date = self.week_start + timedelta(days=day_idx)
                
                shifts.append({
                    'id': f'{emp_id}_{shop_id}_{day}_{shift_type}',
                    'employeeId': emp_id,
                    'employeeName': emp.name,
                    'shopId': shop_id,
                    'shopName': template.shop_name,
                    'date': shift_date.strftime('%Y-%m-%d'),
                    'day': day,
                    'startTime': template.start_time,
                    'endTime': template.end_time,
                    'hours': round(hours, 2),
                    'shiftType': shift_type,
                    'company': template.company,
                })
        
        # Build employee summary
        employee_summary = {}
        for emp in self.employees:
            hours = employee_hours.get(emp.id, 0)
            days = employee_days.get(emp.id, 0)
            target = HOURS_TARGET.get(emp.employment_type, 40)
            
            employee_summary[emp.name] = {
                'totalHours': round(hours, 2),
                'target': target,
                'daysWorked': days,
                'status': 'OK' if abs(hours - target) <= 4 else ('UNDER' if hours < target else 'OVER')
            }
        
        # Log summary
        logger.info("=" * 50)
        logger.info("SOLUTION SUMMARY")
        logger.info("=" * 50)
        logger.info(f"Total shifts: {len(shifts)}")
        logger.info(f"Total hours: {sum(s['hours'] for s in shifts):.1f}")
        logger.info("")
        logger.info("Employee hours:")
        for name, data in sorted(employee_summary.items()):
            status_icon = "✅" if data['status'] == 'OK' else "⚠️"
            logger.info(f"  {status_icon} {name}: {data['totalHours']}h / {data['target']}h ({data['daysWorked']} days)")
        
        return {
            'status': 'OK',
            'shifts': shifts,
            'employee_summary': employee_summary,
            'stats': {
                'totalShifts': len(shifts),
                'totalHours': round(sum(s['hours'] for s in shifts), 2),
                'solverStatus': 'optimal' if status == cp_model.OPTIMAL else 'feasible'
            }
        }
