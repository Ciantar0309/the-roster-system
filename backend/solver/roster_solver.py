# backend/solver/roster_solver.py
"""
ROSTERPRO v32.0 - Pattern-Based Roster Solver
==============================================

Based on Deli Roster Scheduler Spec v1.1

COVERAGE PATTERNS:
  PatternA    = { AM:3, PM:2, FULL:0 }  - Busy shops
  PatternB    = { AM:1, PM:1, FULL:1 }  - Mixed
  PatternSolo = { AM:0, PM:0, FULL:1 }  - Solo shops only

HARD CONSTRAINTS:
  C1: Employee.company == Shop.company
  C2: Main-shop priority before secondary use
  C3: Weekly hours: target <= actual <= target + OT_CAP (10h)
  C4: Honour all Special Requests
  C5: Maria is never rostered
  C6: Hamrun, Carters, Fgura -> PatternSolo NOT permitted
  C7: <= 2 FULL-day people per shop/day
  C8: No split shift unless Special Request asks
  C9: Trimming rules respected

SOFT GOALS:
  G1: Minimize overtime total
  G2: Fair overtime distribution
  G3: Minimize cross-shop assignments
  G4: Minimize idle hours (below target)

TRIMMING RULES:
  T1: If >1 AM person OR >=1 FULL present, may trim:
      - 1h from earliest AM start
      - 2h from latest PM/FULL end
  T2: At least one un-trimmed employee at open/close
  T3: Apply only when it reduces overtime
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from ortools.sat.python import cp_model
import traceback
import json

# Import trimming utility
try:
    from utils import apply_trimming
except ImportError:
    # Fallback if utils not found
    def apply_trimming(shifts, employee_hours, **kwargs):
        return shifts, employee_hours


# ============================================
# CONSTANTS
# ============================================

# Big staff shops - NEVER solo, PatternSolo forbidden
BIG_STAFF_SHOPS = {'Hamrun', 'Carters', 'Fgura'}

# Employees to NEVER roster
EXCLUDED_EMPLOYEES = {'Maria'}

# Days of week
DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
DAYS_SHORT = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

# Day name mapping
DAY_NAME_MAP = {
    'mon': 0, 'monday': 0,
    'tue': 1, 'tuesday': 1,
    'wed': 2, 'wednesday': 2,
    'thu': 3, 'thursday': 3,
    'fri': 4, 'friday': 4,
    'sat': 5, 'saturday': 5,
    'sun': 6, 'sunday': 6
}

# Contract hours targets
WEEK_TARGET = {
    'full-time': 40,
    'fulltime': 40,
    'part-time': 30,
    'parttime': 30,
    'student': 20
}

# Overtime cap
OT_CAP = 10  # max overtime hours per employee

# Shift hours
STANDARD_SHIFT_HOURS = 7.5
MIN_SHIFT_HOURS = 4.0
MAX_SHIFT_HOURS = 15.0

# Max full-day employees per shop per day
MAX_FULLDAY_PER_SHOP = 2

# Penalty weights
PENALTY_UNDER_MINIMUM = 100000     # Must meet minimum staffing
PENALTY_UNDER_TARGET = 500         # Try to meet target staffing
PENALTY_OVER_COVERAGE = 20         # Slight preference against overstaffing
PENALTY_OVERTIME = 50              # Discourage overtime
PENALTY_EXCESSIVE_OT = 200         # Strongly discourage excessive OT
PENALTY_UNDER_HOURS = 100          # Try to give contracted hours
PENALTY_CROSS_SHOP = 30            # Prefer main shop
PENALTY_MISSED_SPECIAL = 100000    # Special requests must be met


# ============================================
# HELPER FUNCTIONS
# ============================================

def normalize_day_name(day: str) -> str:
    """Convert any day format to full lowercase name"""
    if not day:
        return 'monday'
    day_lower = day.lower().strip()
    if day_lower in DAY_NAME_MAP:
        return DAYS_OF_WEEK[DAY_NAME_MAP[day_lower]]
    if len(day_lower) >= 3:
        short = day_lower[:3]
        if short in DAY_NAME_MAP:
            return DAYS_OF_WEEK[DAY_NAME_MAP[short]]
    return day_lower


def get_day_index(day_name: str) -> int:
    """Convert day name to index (0=Monday)"""
    if not day_name:
        return 0
    day_lower = day_name.lower().strip()
    if day_lower in DAY_NAME_MAP:
        return DAY_NAME_MAP[day_lower]
    if len(day_lower) >= 3:
        short = day_lower[:3]
        if short in DAY_NAME_MAP:
            return DAY_NAME_MAP[short]
    return 0


def parse_time(time_str: str) -> int:
    """Convert HH:MM to minutes since midnight"""
    if not time_str:
        return 0
    try:
        parts = time_str.split(':')
        return int(parts[0]) * 60 + int(parts[1])
    except:
        return 0


def format_time(minutes: int) -> str:
    """Convert minutes since midnight to HH:MM"""
    if minutes < 0:
        minutes = 0
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


def calculate_hours(start: str, end: str) -> float:
    """Calculate shift duration in hours"""
    start_mins = parse_time(start)
    end_mins = parse_time(end)
    return round((end_mins - start_mins) / 60.0, 2)


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


def get_employee_target_hours(employment_type: str) -> int:
    """Get target weekly hours for employment type"""
    if not employment_type:
        return 40
    emp_type = employment_type.lower().replace('-', '').replace('_', '')
    return WEEK_TARGET.get(emp_type, 40)


# ============================================
# DATA CLASSES
# ============================================

@dataclass
class Employee:
    id: int
    name: str
    company: str
    employment_type: str
    weekly_hours: int
    is_active: bool = True
    am_only: bool = False
    primary_shop_id: Optional[int] = None
    secondary_shop_ids: List[int] = field(default_factory=list)


@dataclass
class LeaveRequest:
    employee_id: int
    start_date: str
    end_date: str
    status: str = 'approved'


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
    day_index: int
    shift_type: str  # 'AM', 'PM', 'FULL'
    start_time: str
    end_time: str
    hours: float
    is_trimmed: bool = False
    is_mandatory: bool = False


@dataclass
class DemandEntry:
    """Staffing demand for a shop on a specific day"""
    shop_id: int
    shop_name: str
    day_index: int
    target_am: int = 1
    target_pm: int = 1
    min_am: int = 1
    min_pm: int = 1
    min_full_day: int = 0
    max_staff: int = 10
    allow_full_day: bool = True
    full_day_counts_as_both: bool = True
    is_mandatory: bool = False
    coverage_mode: str = 'flexible'
    is_solo: bool = False


@dataclass
class SpecialShiftDemand:
    """Special request - HARD constraint"""
    employee_id: int
    employee_name: str
    shop_id: int
    shop_name: str
    day_index: int
    shift_type: str
    start_time: Optional[str] = None
    end_time: Optional[str] = None


@dataclass
class StaffingConfig:
    coverage_mode: str = 'flexible'
    min_at_opening: int = 1
    min_at_closing: int = 1
    weekly_schedule: List[Dict] = field(default_factory=list)
    full_day_counts_as_both: bool = True
    never_below_minimum: bool = True


@dataclass
class ShopConfig:
    id: int
    name: str
    company: str
    open_time: str
    close_time: str
    is_active: bool
    can_be_solo: bool
    min_staff_at_open: int
    min_staff_midday: int
    min_staff_at_close: int
    requirements: List[Dict]
    trimming: Dict
    sunday: Dict
    special_shifts: List[Dict] = field(default_factory=list)
    assigned_employees: List[Dict] = field(default_factory=list)
    staffing_config: Optional[StaffingConfig] = None


# ============================================
# CONFIG LOADING
# ============================================

def load_staffing_config(data: Any) -> Optional[StaffingConfig]:
    """Load staffing configuration from API data"""
    if not data:
        return None
    
    parsed = safe_json_parse(data, None)
    if not parsed:
        return None
    
    weekly = parsed.get('weeklySchedule', [])
    if isinstance(weekly, str):
        weekly = safe_json_parse(weekly, [])
    
    rules = parsed.get('rules', {})
    if isinstance(rules, str):
        rules = safe_json_parse(rules, {})
    
    full_day_counts = parsed.get('fullDayCountsAsBoth', rules.get('fullDayCountsAsBoth', True))
    never_below = parsed.get('neverBelowMinimum', rules.get('neverBelowMinimum', True))
    
    min_staff = parsed.get('minimumStaff', {})
    if isinstance(min_staff, str):
        min_staff = safe_json_parse(min_staff, {})
    
    return StaffingConfig(
        coverage_mode=parsed.get('coverageMode', 'flexible'),
        min_at_opening=min_staff.get('atOpening', 1),
        min_at_closing=min_staff.get('atClosing', 1),
        weekly_schedule=weekly,
        full_day_counts_as_both=full_day_counts,
        never_below_minimum=never_below
    )


def load_shop_config(shop_data: Dict) -> ShopConfig:
    """Load shop configuration from API data"""
    
    shop_name = shop_data.get('name', 'Unknown')
    
    # FORCE: Big staff shops can NEVER be solo
    if shop_name in BIG_STAFF_SHOPS:
        can_be_solo = False
    else:
        can_be_solo = shop_data.get('canBeSolo', False)
    
    trimming = safe_json_parse(shop_data.get('trimming'), {})
    default_trimming = {
        'enabled': True,
        'trimAM': True,
        'trimPM': True,
        'minShiftHours': 4,
        'trimFromStart': 1,
        'trimFromEnd': 2,
        'trimWhenMoreThan': 1
    }
    trimming = {**default_trimming, **trimming}
    
    sunday = safe_json_parse(shop_data.get('sunday'), {})
    default_sunday = {
        'closed': False,
        'maxStaff': None,
        'customHours': {
            'enabled': False,
            'openTime': '08:00',
            'closeTime': '13:00'
        }
    }
    sunday = {**default_sunday, **sunday}
    if sunday.get('customHours') is None:
        sunday['customHours'] = default_sunday['customHours']
    
    requirements = safe_json_parse(shop_data.get('requirements'), [])
    special_shifts = safe_json_parse(shop_data.get('specialShifts'), [])
    assigned = safe_json_parse(shop_data.get('assignedEmployees'), [])
    staffing_config = load_staffing_config(shop_data.get('staffingConfig'))
    
    return ShopConfig(
        id=shop_data.get('id', 0),
        name=shop_name,
        company=shop_data.get('company', 'CMZ'),
        open_time=shop_data.get('openTime', '06:30'),
        close_time=shop_data.get('closeTime', '21:30'),
        is_active=shop_data.get('isActive', True),
        can_be_solo=can_be_solo,
        min_staff_at_open=shop_data.get('minStaffAtOpen', 1),
        min_staff_midday=shop_data.get('minStaffMidday', 2),
        min_staff_at_close=shop_data.get('minStaffAtClose', 1),
        requirements=requirements,
        trimming=trimming,
        sunday=sunday,
        special_shifts=special_shifts,
        assigned_employees=assigned,
        staffing_config=staffing_config
    )


# ============================================
# TEMPLATE AND DEMAND BUILDING
# ============================================

def build_templates_from_config(shops: List[Dict]) -> Tuple[List[ShiftTemplate], List[SpecialShiftDemand]]:
    """Build shift templates from shop configurations"""
    templates = []
    special_demands = []
    
    for shop_data in shops:
        config = load_shop_config(shop_data)
        
        if not config.is_active:
            continue
        
        staffing = config.staffing_config
        coverage_mode = staffing.coverage_mode if staffing else 'flexible'
        
        # Build day config lookup by index
        day_config_by_index = {}
        if staffing and staffing.weekly_schedule:
            for dc in staffing.weekly_schedule:
                dc_day = dc.get('day', '')
                if dc_day:
                    idx = get_day_index(dc_day)
                    day_config_by_index[idx] = dc
        
        # Calculate shift times
        open_mins = parse_time(config.open_time)
        close_mins = parse_time(config.close_time)
        midpoint = (open_mins + close_mins) // 2
        
        am_start = config.open_time
        am_end = format_time(midpoint + 30)
        pm_start = format_time(midpoint - 30)
        pm_end = config.close_time
        
        for day_idx in range(7):
            # Check Sunday closed
            if day_idx == 6 and config.sunday.get('closed', False):
                continue
            
            day_am_start, day_am_end = am_start, am_end
            day_pm_start, day_pm_end = pm_start, pm_end
            
            # Sunday custom hours
            if day_idx == 6 and config.sunday.get('customHours', {}).get('enabled', False):
                custom = config.sunday['customHours']
                day_am_start = custom.get('openTime', '08:00')
                day_pm_end = custom.get('closeTime', '13:00')
                day_am_end = day_pm_end
                day_pm_start = day_am_start
            
            day_config = day_config_by_index.get(day_idx)
            is_mandatory = day_config.get('isMandatory', False) if day_config else False
            
            am_hours = calculate_hours(day_am_start, day_am_end)
            pm_hours = calculate_hours(day_pm_start, day_pm_end)
            full_hours = calculate_hours(day_am_start, day_pm_end)
            
            # Determine if solo shop
            is_solo = config.can_be_solo and config.name not in BIG_STAFF_SHOPS
            
            if is_solo:
                # Solo shops: primarily FULL shifts, but allow AM/PM for flexibility
                templates.append(ShiftTemplate(
                    id=f"{config.id}_{day_idx}_FULL",
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type='FULL',
                    start_time=day_am_start,
                    end_time=day_pm_end,
                    hours=full_hours,
                    is_mandatory=is_mandatory
                ))
                # Also add AM/PM for PatternB flexibility
                templates.append(ShiftTemplate(
                    id=f"{config.id}_{day_idx}_AM",
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type='AM',
                    start_time=day_am_start,
                    end_time=day_am_end,
                    hours=am_hours,
                    is_mandatory=is_mandatory
                ))
                templates.append(ShiftTemplate(
                    id=f"{config.id}_{day_idx}_PM",
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type='PM',
                    start_time=day_pm_start,
                    end_time=day_pm_end,
                    hours=pm_hours,
                    is_mandatory=is_mandatory
                ))
            else:
                # Non-solo shops: AM, PM, and limited FULL
                templates.append(ShiftTemplate(
                    id=f"{config.id}_{day_idx}_AM",
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type='AM',
                    start_time=day_am_start,
                    end_time=day_am_end,
                    hours=am_hours,
                    is_mandatory=is_mandatory
                ))
                templates.append(ShiftTemplate(
                    id=f"{config.id}_{day_idx}_PM",
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type='PM',
                    start_time=day_pm_start,
                    end_time=day_pm_end,
                    hours=pm_hours,
                    is_mandatory=is_mandatory
                ))
                templates.append(ShiftTemplate(
                    id=f"{config.id}_{day_idx}_FULL",
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type='FULL',
                    start_time=day_am_start,
                    end_time=day_pm_end,
                    hours=full_hours,
                    is_mandatory=is_mandatory
                ))
        
        # Process special shifts
        for special in config.special_shifts:
            emp_id = special.get('employeeId')
            if emp_id:
                day_idx = get_day_index(special.get('dayOfWeek', 'monday'))
                special_demands.append(SpecialShiftDemand(
                    employee_id=emp_id,
                    employee_name=special.get('employeeName', f'Employee {emp_id}'),
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type=special.get('shiftType', 'AM').upper(),
                    start_time=special.get('startTime'),
                    end_time=special.get('endTime')
                ))
    
    return templates, special_demands


def build_demands_from_config(shops: List[Dict]) -> List[DemandEntry]:
    """Build demand entries from shop configurations"""
    demands = []
    
    for shop_data in shops:
        config = load_shop_config(shop_data)
        
        if not config.is_active:
            continue
        
        staffing = config.staffing_config
        coverage_mode = staffing.coverage_mode if staffing else 'flexible'
        full_day_counts_as_both = staffing.full_day_counts_as_both if staffing else True
        
        # Determine if solo
        is_solo = config.can_be_solo and config.name not in BIG_STAFF_SHOPS
        
        print(f"\n[DEMANDS] Building for {config.name} (mode={coverage_mode}, solo={is_solo}):")
        
        # Build day config lookup
        day_config_by_index = {}
        if staffing and staffing.weekly_schedule:
            for dc in staffing.weekly_schedule:
                dc_day = dc.get('day', '')
                if dc_day:
                    idx = get_day_index(dc_day)
                    day_config_by_index[idx] = dc
        
        for day_idx in range(7):
            day_name = DAYS_OF_WEEK[day_idx]
            
            # Sunday closed check
            if day_idx == 6 and config.sunday.get('closed', False):
                print(f"  {day_name}: CLOSED")
                continue
            
            day_config = day_config_by_index.get(day_idx)
            
            if day_config:
                min_am = day_config.get('minAM', 1)
                min_pm = day_config.get('minPM', 1)
                target_am = day_config.get('targetAM') or min_am
                target_pm = day_config.get('targetPM') or min_pm
                min_full_day = day_config.get('minFullDay', 0)
                max_staff = day_config.get('maxStaff', 10)
                is_mandatory = day_config.get('isMandatory', False)
                
                print(f"  {day_name}: target={target_am}AM/{target_pm}PM, min={min_am}AM/{min_pm}PM, max={max_staff}")
            else:
                # Defaults based on shop type
                if is_solo:
                    # Solo: 1 person full day
                    min_am, min_pm = 1, 1
                    target_am, target_pm = 1, 1
                    min_full_day = 1
                    max_staff = 2
                else:
                    # Non-solo: basic coverage
                    min_am, min_pm = 1, 1
                    target_am, target_pm = 2, 2
                    min_full_day = 0
                    max_staff = 6
                
                is_mandatory = False
                print(f"  {day_name}: (defaults) {target_am}AM/{target_pm}PM, solo={is_solo}")
            
            # Sunday max staff limit
            if day_idx == 6:
                sunday_max = config.sunday.get('maxStaff')
                if sunday_max is not None:
                    target_am = min(target_am, sunday_max)
                    target_pm = min(target_pm, sunday_max)
                    min_am = min(min_am, sunday_max)
                    min_pm = min(min_pm, sunday_max)
                    max_staff = min(max_staff, sunday_max)
            
            demands.append(DemandEntry(
                shop_id=config.id,
                shop_name=config.name,
                day_index=day_idx,
                target_am=target_am,
                target_pm=target_pm,
                min_am=min_am,
                min_pm=min_pm,
                min_full_day=min_full_day,
                max_staff=max_staff,
                allow_full_day=True,
                full_day_counts_as_both=full_day_counts_as_both,
                is_mandatory=is_mandatory,
                coverage_mode=coverage_mode,
                is_solo=is_solo
            ))
    
    return demands


# ============================================
# ROSTER SOLVER CLASS
# ============================================

class RosterSolver:
    def __init__(
        self,
        employees: List[Employee],
        templates: List[ShiftTemplate],
        demands: List[DemandEntry],
        assignments: List[ShopAssignment],
        leave_requests: List[LeaveRequest],
        week_start: str,
        fixed_days_off: Dict[str, List[int]],
        previous_week_sunday_shifts: List[int],
        shop_rules: Dict[int, Dict],
        special_demands: List[SpecialShiftDemand],
        shop_configs: Dict[int, ShopConfig] = None
    ):
        self.employees = employees
        self.templates = templates
        self.demands = demands
        self.assignments = assignments
        self.leave_requests = leave_requests
        self.week_start = week_start
        self.fixed_days_off = fixed_days_off
        self.previous_week_sunday_shifts = previous_week_sunday_shifts
        self.shop_rules = shop_rules
        self.special_demands = special_demands
        self.shop_configs = shop_configs or {}
        
        # Filter out excluded employees (C5: Maria never rostered)
        self.employees = [e for e in self.employees if e.name not in EXCLUDED_EMPLOYEES]
        
        # Build lookups
        self.employee_by_id = {e.id: e for e in self.employees}
        
        self.templates_by_shop_day = {}
        for t in templates:
            key = (t.shop_id, t.day_index)
            if key not in self.templates_by_shop_day:
                self.templates_by_shop_day[key] = []
            self.templates_by_shop_day[key].append(t)
        
        self.employee_shops = {}
        for a in assignments:
            if a.employee_id not in self.employee_shops:
                self.employee_shops[a.employee_id] = {'primary': None, 'secondary': []}
            if a.is_primary:
                self.employee_shops[a.employee_id]['primary'] = a.shop_id
            else:
                self.employee_shops[a.employee_id]['secondary'].append(a.shop_id)
        
        # Add from employee data
        for emp in self.employees:
            if emp.id not in self.employee_shops:
                self.employee_shops[emp.id] = {'primary': None, 'secondary': []}
            if emp.primary_shop_id:
                self.employee_shops[emp.id]['primary'] = emp.primary_shop_id
            for sid in (emp.secondary_shop_ids or []):
                if sid not in self.employee_shops[emp.id]['secondary']:
                    self.employee_shops[emp.id]['secondary'].append(sid)
        
        self.employee_leave_days = {}
        for lr in leave_requests:
            if lr.status == 'approved':
                if lr.employee_id not in self.employee_leave_days:
                    self.employee_leave_days[lr.employee_id] = set()
                for day_idx in range(7):
                    self.employee_leave_days[lr.employee_id].add(day_idx)
        
        self.demands_by_shop_day = {}
        for d in demands:
            key = (d.shop_id, d.day_index)
            self.demands_by_shop_day[key] = d
        
        self.model = cp_model.CpModel()
        self.shift_vars = {}
    
    def _get_employee_shops(self, emp_id: int) -> List[int]:
        """Get all shops an employee can work at"""
        shops = []
        if emp_id in self.employee_shops:
            data = self.employee_shops[emp_id]
            if data['primary']:
                shops.append(data['primary'])
            shops.extend(data['secondary'])
        return list(set(shops))
    
    def _is_primary_shop(self, emp_id: int, shop_id: int) -> bool:
        """Check if shop is employee's primary"""
        if emp_id in self.employee_shops:
            return self.employee_shops[emp_id]['primary'] == shop_id
        return False
    
    def _build_variables(self):
        """Create decision variables for shift assignments"""
        for emp in self.employees:
            if not emp.is_active:
                continue
            
            emp_shops = self._get_employee_shops(emp.id)
            
            for template in self.templates:
                # C1: Company match
                config = self.shop_configs.get(template.shop_id)
                if config and config.company != emp.company and emp.company != 'BOTH':
                    continue
                
                # Shop assignment check
                if template.shop_id not in emp_shops:
                    continue
                
                # Leave check
                if emp.id in self.employee_leave_days:
                    if template.day_index in self.employee_leave_days[emp.id]:
                        continue
                
                # Fixed days off
                emp_key = emp.name.lower()
                if emp_key in self.fixed_days_off:
                    if template.day_index in self.fixed_days_off[emp_key]:
                        continue
                
                # AM-only constraint
                if emp.am_only and template.shift_type in ['PM', 'FULL']:
                    continue
                
                var_name = f"shift_{emp.id}_{template.id}"
                self.shift_vars[(emp.id, template.id)] = self.model.NewBoolVar(var_name)
    
    def _add_coverage_constraints(self):
        """Add coverage constraints - respecting patterns"""
        print("\n[COVERAGE CONSTRAINTS]")
        
        for demand in self.demands:
            shop_id = demand.shop_id
            day_idx = demand.day_index
            
            config = self.shop_configs.get(shop_id)
            shop_name = config.name if config else demand.shop_name
            
            # C6: Force big shops to never be solo
            is_solo = demand.is_solo and shop_name not in BIG_STAFF_SHOPS
            
            # Collect variables
            am_vars = []
            pm_vars = []
            full_vars = []
            
            for (emp_id, template_id), var in self.shift_vars.items():
                template = next((t for t in self.templates if t.id == template_id), None)
                if not template:
                    continue
                if template.shop_id != shop_id or template.day_index != day_idx:
                    continue
                
                if template.shift_type == 'AM':
                    am_vars.append(var)
                elif template.shift_type == 'PM':
                    pm_vars.append(var)
                elif template.shift_type == 'FULL':
                    full_vars.append(var)
            
            # C7: Max 2 FULL-day per shop/day
            if full_vars:
                self.model.Add(sum(full_vars) <= MAX_FULLDAY_PER_SHOP)
            
            # Coverage calculation
            if demand.full_day_counts_as_both:
                am_coverage = am_vars + full_vars
                pm_coverage = pm_vars + full_vars
            else:
                am_coverage = am_vars
                pm_coverage = pm_vars
            
            day_name = DAYS_OF_WEEK[day_idx][:3].upper()
            print(f"  {shop_name} {day_name}: min={demand.min_am}AM/{demand.min_pm}PM, solo={is_solo}, fullMax=2")
            
            if is_solo:
                # Solo shop: need FULL day coverage
                # Either 1 FULL shift, OR both AM and PM
                if full_vars:
                    # AM coverage = AM shifts + FULL shifts
                    self.model.Add(sum(am_vars) + sum(full_vars) >= 1)
                    # PM coverage = PM shifts + FULL shifts
                    self.model.Add(sum(pm_vars) + sum(full_vars) >= 1)
                else:
                    # No FULL option - need both AM and PM
                    if am_vars:
                        self.model.Add(sum(am_vars) >= 1)
                    if pm_vars:
                        self.model.Add(sum(pm_vars) >= 1)
            else:
                # Non-solo: must have AM and PM coverage
                if am_coverage and demand.min_am > 0:
                    self.model.Add(sum(am_coverage) >= demand.min_am)
                if pm_coverage and demand.min_pm > 0:
                    self.model.Add(sum(pm_coverage) >= demand.min_pm)
            
            # Max staff
            if demand.max_staff < 10:
                all_unique = list(set(am_vars + pm_vars + full_vars))
                if all_unique:
                    # Count unique employees
                    emp_day_vars = {}
                    for (emp_id, template_id), var in self.shift_vars.items():
                        template = next((t for t in self.templates if t.id == template_id), None)
                        if template and template.shop_id == shop_id and template.day_index == day_idx:
                            if emp_id not in emp_day_vars:
                                emp_day_vars[emp_id] = []
                            emp_day_vars[emp_id].append(var)
                    
                    if emp_day_vars:
                        emp_indicators = []
                        for eid, vlist in emp_day_vars.items():
                            ind = self.model.NewBoolVar(f"emp_{eid}_at_{shop_id}_{day_idx}")
                            self.model.AddMaxEquality(ind, vlist)
                            emp_indicators.append(ind)
                        self.model.Add(sum(emp_indicators) <= demand.max_staff)
    
    def _add_special_request_constraints(self):
        """C4: Honour all Special Requests"""
        print("\n[SPECIAL REQUEST CONSTRAINTS]")
        
        if not self.special_demands:
            print("  No special requests")
            return
        
        for special in self.special_demands:
            matching = []
            for template in self.templates:
                if (template.shop_id == special.shop_id and
                    template.day_index == special.day_index):
                    if special.shift_type == 'FULL' and template.shift_type == 'FULL':
                        matching.append(template)
                    elif special.shift_type == 'AM' and template.shift_type == 'AM':
                        matching.append(template)
                    elif special.shift_type == 'PM' and template.shift_type == 'PM':
                        matching.append(template)
            
            vars_for_special = []
            for t in matching:
                key = (special.employee_id, t.id)
                if key in self.shift_vars:
                    vars_for_special.append(self.shift_vars[key])
            
            if vars_for_special:
                self.model.Add(sum(vars_for_special) >= 1)
                print(f"  REQUIRED: {special.employee_name} -> {special.shop_name} {DAYS_OF_WEEK[special.day_index][:3]} {special.shift_type}")
            else:
                print(f"  WARNING: Cannot fulfill {special.employee_name} request")
    
    def _add_employee_constraints(self):
        """Add per-employee constraints"""
        print("\n[EMPLOYEE CONSTRAINTS]")
        
        for emp in self.employees:
            if not emp.is_active:
                continue
            
            # One shift per day
            for day_idx in range(7):
                day_shifts = []
                for (emp_id, template_id), var in self.shift_vars.items():
                    if emp_id != emp.id:
                        continue
                    template = next((t for t in self.templates if t.id == template_id), None)
                    if template and template.day_index == day_idx:
                        day_shifts.append(var)
                
                if day_shifts:
                    self.model.Add(sum(day_shifts) <= 1)
            
            # At least 1 day off per week
            all_shifts = [var for (eid, _), var in self.shift_vars.items() if eid == emp.id]
            if all_shifts:
                self.model.Add(sum(all_shifts) <= 6)
            
            # C3: Hours constraints
            target = get_employee_target_hours(emp.employment_type)
            max_hours = target + OT_CAP
            
            # Student hard cap
            if emp.employment_type.lower() == 'student':
                hours_terms = []
                for (eid, tid), var in self.shift_vars.items():
                    if eid != emp.id:
                        continue
                    template = next((t for t in self.templates if t.id == tid), None)
                    if template:
                        hours_terms.append(var * int(template.hours * 10))
                
                if hours_terms:
                    self.model.Add(sum(hours_terms) <= 200)  # 20h * 10
    
    def _build_objective(self):
        """Build optimization objective"""
        print("\n[BUILDING OBJECTIVE]")
        terms = []
        
        # G1: Minimize overtime
        for emp in self.employees:
            if not emp.is_active:
                continue
            
            hours_terms = []
            for (eid, tid), var in self.shift_vars.items():
                if eid != emp.id:
                    continue
                template = next((t for t in self.templates if t.id == tid), None)
                if template:
                    hours_terms.append(var * int(template.hours * 10))
            
            if hours_terms:
                total = self.model.NewIntVar(0, 600, f"hours_{emp.id}")
                self.model.Add(total == sum(hours_terms))
                
                target = get_employee_target_hours(emp.employment_type) * 10
                
                # Under hours penalty (G4)
                under = self.model.NewIntVar(0, 500, f"under_{emp.id}")
                self.model.Add(under >= target - total)
                terms.append(under * PENALTY_UNDER_HOURS)
                
                # Overtime penalty (G1)
                over = self.model.NewIntVar(0, 200, f"over_{emp.id}")
                self.model.Add(over >= total - target)
                terms.append(over * PENALTY_OVERTIME)
                
                # Excessive OT penalty
                excessive = self.model.NewIntVar(0, 100, f"excessive_{emp.id}")
                self.model.Add(excessive >= total - (target + 50))  # > 5h OT
                terms.append(excessive * PENALTY_EXCESSIVE_OT)
        
        # G3: Prefer main shop
        for (emp_id, template_id), var in self.shift_vars.items():
            template = next((t for t in self.templates if t.id == template_id), None)
            if template and not self._is_primary_shop(emp_id, template.shop_id):
                terms.append(var * PENALTY_CROSS_SHOP)
        
        # Coverage penalties
        for demand in self.demands:
            shop_id = demand.shop_id
            day_idx = demand.day_index
            
            am_cov = []
            pm_cov = []
            
            for (eid, tid), var in self.shift_vars.items():
                template = next((t for t in self.templates if t.id == tid), None)
                if not template or template.shop_id != shop_id or template.day_index != day_idx:
                    continue
                if template.shift_type in ['AM', 'FULL']:
                    am_cov.append(var)
                if template.shift_type in ['PM', 'FULL']:
                    pm_cov.append(var)
            
            # Under target penalty
            if am_cov:
                under_am = self.model.NewIntVar(0, 10, f"under_am_{shop_id}_{day_idx}")
                self.model.Add(under_am >= demand.target_am - sum(am_cov))
                terms.append(under_am * PENALTY_UNDER_TARGET)
            
            if pm_cov:
                under_pm = self.model.NewIntVar(0, 10, f"under_pm_{shop_id}_{day_idx}")
                self.model.Add(under_pm >= demand.target_pm - sum(pm_cov))
                terms.append(under_pm * PENALTY_UNDER_TARGET)
            
            # Over coverage penalty
            if am_cov:
                over_am = self.model.NewIntVar(0, 10, f"over_am_{shop_id}_{day_idx}")
                self.model.Add(over_am >= sum(am_cov) - demand.target_am)
                terms.append(over_am * PENALTY_OVER_COVERAGE)
        
        if terms:
            self.model.Minimize(sum(terms))
            print(f"  Objective has {len(terms)} terms")
    
    def solve(self, time_limit_seconds: int = 120) -> Dict:
        """Solve the roster"""
        try:
            print(f"\n{'='*60}")
            print("ROSTERPRO v32.0 - Pattern-Based Solver")
            print(f"{'='*60}")
            print(f"Employees: {len(self.employees)}")
            print(f"Templates: {len(self.templates)}")
            print(f"Demands: {len(self.demands)}")
            print(f"Special Requests: {len(self.special_demands)}")
            print(f"Excluded: {EXCLUDED_EMPLOYEES}")
            
            print("\n[BUILDING MODEL]")
            self._build_variables()
            print(f"  Variables: {len(self.shift_vars)}")
            
            if not self.shift_vars:
                return {
                    'success': False,
                    'status': 'NO_VARIABLES',
                    'shifts': [],
                    'employeeHours': {},
                    'message': 'No valid shift assignments possible'
                }
            
            self._add_coverage_constraints()
            self._add_special_request_constraints()
            self._add_employee_constraints()
            self._build_objective()
            
            print(f"\n[SOLVING] Time limit: {time_limit_seconds}s")
            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = time_limit_seconds
            solver.parameters.num_search_workers = 8
            
            status = solver.Solve(self.model)
            
            status_names = {
                cp_model.OPTIMAL: 'OPTIMAL',
                cp_model.FEASIBLE: 'FEASIBLE',
                cp_model.INFEASIBLE: 'INFEASIBLE',
                cp_model.MODEL_INVALID: 'MODEL_INVALID',
                cp_model.UNKNOWN: 'UNKNOWN'
            }
            status_str = status_names.get(status, 'UNKNOWN')
            print(f"\n[RESULT] Status: {status_str}")
            
            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                # Extract shifts
                shifts = []
                employee_hours = {emp.id: 0.0 for emp in self.employees}
                
                for (emp_id, template_id), var in self.shift_vars.items():
                    if solver.Value(var) == 1:
                        template = next((t for t in self.templates if t.id == template_id), None)
                        emp = self.employee_by_id.get(emp_id)
                        
                        if template and emp:
                            # Calculate date
                            from datetime import datetime, timedelta
                            week_start_date = datetime.strptime(self.week_start, '%Y-%m-%d')
                            shift_date = week_start_date + timedelta(days=template.day_index)
                            
                            shifts.append({
                                'id': f"{template.id}_{emp_id}",
                                'date': shift_date.strftime('%Y-%m-%d'),
                                'shopId': template.shop_id,
                                'shopName': template.shop_name,
                                'employeeId': emp_id,
                                'employeeName': emp.name,
                                'startTime': template.start_time,
                                'endTime': template.end_time,
                                'hours': template.hours,
                                'shiftType': template.shift_type,
                                'isTrimmed': False
                            })
                            employee_hours[emp_id] += template.hours
                
                # === TRIMMING PASS ===
                print("\n[TRIMMING PASS]")
                shifts, employee_hours = apply_trimming(
                    shifts=shifts,
                    employee_hours=employee_hours,
                    max_first_am_trim=1,
                    max_last_pm_trim=2
                )
                
                # Coverage summary
                print("\n[COVERAGE SUMMARY]")
                for demand in self.demands:
                    day_shifts = [s for s in shifts if s['shopId'] == demand.shop_id and 
                                  datetime.strptime(s['date'], '%Y-%m-%d').weekday() == demand.day_index]
                    am_count = len([s for s in day_shifts if s['shiftType'] in ['AM', 'FULL']])
                    pm_count = len([s for s in day_shifts if s['shiftType'] in ['PM', 'FULL']])
                    day_name = DAYS_OF_WEEK[demand.day_index][:3].upper()
                    print(f"  {demand.shop_name} {day_name}: AM={am_count}/{demand.target_am}, PM={pm_count}/{demand.target_pm}")
                
                # Employee hours summary
                print("\n[EMPLOYEE HOURS]")
                total_ot = 0
                for emp in self.employees:
                    hours = employee_hours.get(emp.id, 0)
                    target = get_employee_target_hours(emp.employment_type)
                    ot = max(0, hours - target)
                    total_ot += ot
                    ot_str = f" [+{ot:.1f}h OT]" if ot > 0 else ""
                    print(f"  {emp.name}: {hours:.1f}h / {target}h{ot_str}")
                
                print(f"\n[OVERTIME TOTAL] {total_ot:.1f}h")
                print(f"[SHIFTS GENERATED] {len(shifts)}")
                
                return {
                    'success': True,
                    'status': status_str,
                    'shifts': shifts,
                    'employeeHours': {str(k): v for k, v in employee_hours.items()},
                    'overtimeTotal': total_ot,
                    'objective': solver.ObjectiveValue()
                }
            else:
                print("\n[ERROR] Solver failed")
                print("  Possible causes:")
                print("  - Not enough employees for coverage")
                print("  - Conflicting constraints")
                print("  - Special requests impossible")
                
                return {
                    'success': False,
                    'status': status_str,
                    'shifts': [],
                    'employeeHours': {},
                    'message': 'Could not generate feasible roster'
                }
        
        except Exception as e:
            print(f"\n[EXCEPTION] {str(e)}")
            traceback.print_exc()
            return {
                'success': False,
                'status': 'ERROR',
                'shifts': [],
                'employeeHours': {},
                'message': str(e)
            }
