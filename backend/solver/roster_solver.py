# backend/solver/roster_solver.py
"""
ROSTERPRO v31.0 - Overtime-Enabled Config-Driven Roster Solver
===============================================================

KEY BEHAVIORS:
- Staffing requirements (minAM/minPM) = HARD CONSTRAINT (must be met)
- Employee weekly hours = SOFT CONSTRAINT (overtime allowed, lightly penalized)
- Student 20h/week = HARD CONSTRAINT (legal requirement)
- 1 day off per week = HARD CONSTRAINT (labor law)
- 1 shift per day per person = HARD CONSTRAINT (can't be in two places)

COVERAGE MODES:
1. SPLIT: Only AM + PM shifts allowed (no FULL)
2. FLEXIBLE: Solver decides optimal mix of AM, PM, FULL
3. FULL_DAY_ONLY: Only FULL shifts (solo coverage)

CONSTRAINT LEVELS:
- HARD (minimum): Never go below minAM/minPM - solver MUST satisfy
- SOFT (target): Try to reach targetAM/targetPM - penalized if not met
- SPECIAL REQUESTS: HARD constraint - employee MUST work specified shift
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from ortools.sat.python import cp_model
import traceback
import json

# ============================================
# DATA CLASSES
# ============================================

@dataclass
class Employee:
    id: int
    name: str
    company: str
    employment_type: str  # 'full-time', 'part-time', 'student'
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
    day_index: int  # 0=Monday, 6=Sunday
    shift_type: str  # 'AM', 'PM', 'FULL', 'AM_TRIMMED', 'PM_TRIMMED'
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
    # TARGET values (soft constraint - penalized if not met)
    target_am: int = 1
    target_pm: int = 1
    # MINIMUM values (hard constraint - MUST be met)
    min_am: int = 1
    min_pm: int = 1
    min_full_day: int = 0
    max_staff: int = 10
    allow_full_day: bool = True
    full_day_counts_as_both: bool = True
    is_mandatory: bool = False
    coverage_mode: str = 'flexible'  # 'split', 'flexible', 'fullDayOnly'


@dataclass 
class SpecialShiftDemand:
    """Special request that must be fulfilled as a HARD constraint"""
    employee_id: int
    employee_name: str
    shop_id: int
    shop_name: str
    day_index: int
    shift_type: str  # 'AM', 'PM', 'FULL'
    start_time: Optional[str] = None
    end_time: Optional[str] = None


@dataclass
class StaffingConfig:
    """Staffing configuration from UI"""
    coverage_mode: str = 'flexible'  # 'split', 'flexible', 'fullDayOnly'
    min_at_opening: int = 1
    min_at_closing: int = 1
    weekly_schedule: List[Dict] = field(default_factory=list)
    full_day_counts_as_both: bool = True
    never_below_minimum: bool = True


@dataclass
class ShopConfig:
    """Complete shop configuration from database"""
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
# CONSTANTS
# ============================================

DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
DAYS_SHORT = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']

# Short day name mapping - handles ALL formats (case-insensitive)
DAY_NAME_MAP = {
    'mon': 0, 'monday': 0,
    'tue': 1, 'tuesday': 1,
    'wed': 2, 'wednesday': 2,
    'thu': 3, 'thursday': 3,
    'fri': 4, 'friday': 4,
    'sat': 5, 'saturday': 5,
    'sun': 6, 'sunday': 6
}


def normalize_day_name(day: str) -> str:
    """Convert any day format to full lowercase name"""
    if not day:
        return 'monday'
    day_lower = day.lower().strip()
    
    # Direct lookup
    if day_lower in DAY_NAME_MAP:
        return DAYS_OF_WEEK[DAY_NAME_MAP[day_lower]]
    
    # Try first 3 chars
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
    
    # Direct lookup
    if day_lower in DAY_NAME_MAP:
        return DAY_NAME_MAP[day_lower]
    
    # Try first 3 chars
    if len(day_lower) >= 3:
        short = day_lower[:3]
        if short in DAY_NAME_MAP:
            return DAY_NAME_MAP[short]
    
    return 0


def day_index_to_short(idx: int) -> str:
    """Convert day index to short name (Mon, Tue, etc.)"""
    if 0 <= idx < 7:
        return DAYS_SHORT[idx]
    return 'mon'


# Hours constants
STANDARD_SHIFT_HOURS = 7.5
MIN_SHIFT_HOURS = 4.0
MAX_SHIFT_HOURS = 15.0
STUDENT_MAX_HOURS = 20
MAX_WEEKLY_HOURS = 60  # Allow up to 60 hours (overtime OK)

# Penalty weights for optimization
# COVERAGE - these are critical
PENALTY_UNDER_MINIMUM = 100000     # EXTREME - MUST meet minimum staffing
PENALTY_UNDER_TARGET = 500         # High - try to meet target
PENALTY_OVER_COVERAGE = 20         # Low - slight preference against overstaffing

# EMPLOYEE HOURS - overtime is allowed
PENALTY_OVERTIME = 5               # VERY LOW - overtime is fine, just track it
PENALTY_UNDER_HOURS = 20           # Low - try to give people their hours
PENALTY_EXCESSIVE_OVERTIME = 50    # Moderate - avoid giving someone 60h if possible

# OTHER
PENALTY_TRIMMED_SHIFT = 3          # Very low - slight preference for standard shifts
PENALTY_MISSED_SPECIAL = 100000    # EXTREME - special requests must be fulfilled


# ============================================
# UTILITY FUNCTIONS
# ============================================

def parse_time(time_str: str) -> int:
    """Convert HH:MM to minutes since midnight"""
    if not time_str:
        return 0
    parts = time_str.split(':')
    return int(parts[0]) * 60 + int(parts[1])


def format_time(minutes: int) -> str:
    """Convert minutes since midnight to HH:MM"""
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours:02d}:{mins:02d}"


def calculate_hours(start: str, end: str) -> float:
    """Calculate shift duration in hours"""
    start_mins = parse_time(start)
    end_mins = parse_time(end)
    return (end_mins - start_mins) / 60.0


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


# ============================================
# SHOP CONFIG LOADING
# ============================================

def load_staffing_config(data: Any) -> Optional[StaffingConfig]:
    """Load staffing configuration from API data"""
    if not data:
        return None
    
    parsed = safe_json_parse(data, None)
    if not parsed:
        return None
    
    # Parse weekly schedule
    weekly = parsed.get('weeklySchedule', [])
    if isinstance(weekly, str):
        weekly = safe_json_parse(weekly, [])
    
    # Get flags - check both top-level and nested in 'rules'
    rules = parsed.get('rules', {})
    if isinstance(rules, str):
        rules = safe_json_parse(rules, {})
    
    full_day_counts = parsed.get('fullDayCountsAsBoth', rules.get('fullDayCountsAsBoth', True))
    never_below = parsed.get('neverBelowMinimum', rules.get('neverBelowMinimum', True))
    
    # Parse minimumStaff
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
    
    # Parse trimming config
    trimming = safe_json_parse(shop_data.get('trimming'), {})
    
    # Ensure trimming has all required fields
    default_trimming = {
        'enabled': False,
        'trimAM': True,
        'trimPM': False,
        'minShiftHours': 4,
        'trimFromStart': 1,
        'trimFromEnd': 2,
        'trimWhenMoreThan': 2
    }
    trimming = {**default_trimming, **trimming}
    
    # Parse sunday config
    sunday = safe_json_parse(shop_data.get('sunday'), {})
    
    # Ensure sunday has all required fields
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
    
    # Parse requirements
    requirements = safe_json_parse(shop_data.get('requirements'), [])
    
    # Parse special shifts
    special_shifts = safe_json_parse(shop_data.get('specialShifts'), [])
    
    # Parse assigned employees
    assigned = safe_json_parse(shop_data.get('assignedEmployees'), [])
    
    # Parse staffing config
    staffing_config = load_staffing_config(shop_data.get('staffingConfig'))
    
    return ShopConfig(
        id=shop_data.get('id', 0),
        name=shop_data.get('name', 'Unknown'),
        company=shop_data.get('company', 'CMZ'),
        open_time=shop_data.get('openTime', '06:30'),
        close_time=shop_data.get('closeTime', '21:30'),
        is_active=shop_data.get('isActive', True),
        can_be_solo=shop_data.get('canBeSolo', False),
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
        
        # Get staffing config (may be None)
        staffing = config.staffing_config
        coverage_mode = staffing.coverage_mode if staffing else 'flexible'
        
        # Build a lookup for weekly schedule by day INDEX
        day_config_by_index = {}
        if staffing and staffing.weekly_schedule:
            for dc in staffing.weekly_schedule:
                dc_day = dc.get('day', '')
                if dc_day:
                    idx = get_day_index(dc_day)
                    day_config_by_index[idx] = dc
        
        # Calculate shift times based on shop hours
        open_mins = parse_time(config.open_time)
        close_mins = parse_time(config.close_time)
        midpoint = (open_mins + close_mins) // 2
        
        # Standard shift times
        am_start = config.open_time
        am_end = format_time(midpoint + 30)  # 30 min overlap
        pm_start = format_time(midpoint - 30)  # 30 min overlap
        pm_end = config.close_time
        
        # Trimmed shift times (if enabled)
        trim_cfg = config.trimming
        trimmed_am_start = format_time(open_mins + int(trim_cfg.get('trimFromStart', 1) * 60))
        trimmed_am_end = format_time(midpoint + 30 - int(trim_cfg.get('trimFromEnd', 2) * 60))
        
        for day_idx in range(7):
            day_name = DAYS_OF_WEEK[day_idx]
            
            # Check if Sunday and closed
            if day_idx == 6 and config.sunday.get('closed', False):
                continue
            
            # Store original times for this day
            day_am_start, day_am_end = am_start, am_end
            day_pm_start, day_pm_end = pm_start, pm_end
            
            # Get custom Sunday hours if enabled
            if day_idx == 6 and config.sunday.get('customHours', {}).get('enabled', False):
                custom = config.sunday['customHours']
                day_am_start = custom.get('openTime', '08:00')
                day_am_end = custom.get('closeTime', '13:00')
                day_pm_start = day_am_start  # Sunday typically just one shift
                day_pm_end = day_am_end
            
            # Get day config from our lookup (by INDEX, not name)
            day_config = day_config_by_index.get(day_idx)
            
            # Get day requirements (legacy fallback)
            day_req = None
            for req in config.requirements:
                req_day = req.get('day', '')
                if get_day_index(req_day) == day_idx:
                    day_req = req
                    break
            
            # Determine if day is mandatory
            is_mandatory = False
            if day_config:
                is_mandatory = day_config.get('isMandatory', False)
            elif day_req:
                is_mandatory = day_req.get('isMandatory', False)
            
            # Calculate hours
            am_hours = calculate_hours(day_am_start, day_am_end)
            pm_hours = calculate_hours(day_pm_start, day_pm_end)
            full_hours = calculate_hours(day_am_start, day_pm_end)
            
            # Create templates based on coverage mode
            if coverage_mode == 'fullDayOnly':
                # ONLY create FULL templates
                templates.append(ShiftTemplate(
                    id=f"{config.id}_{day_idx}_FULL",
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type='FULL',
                    start_time=day_am_start,
                    end_time=day_pm_end,
                    hours=full_hours,
                    is_trimmed=False,
                    is_mandatory=is_mandatory
                ))
            elif coverage_mode == 'split':
                # ONLY create AM and PM templates (no FULL)
                templates.append(ShiftTemplate(
                    id=f"{config.id}_{day_idx}_AM",
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type='AM',
                    start_time=day_am_start,
                    end_time=day_am_end,
                    hours=am_hours,
                    is_trimmed=False,
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
                    is_trimmed=False,
                    is_mandatory=is_mandatory
                ))
                
                # Add trimmed AM if enabled and not solo
                if (trim_cfg.get('enabled', False) and 
                    trim_cfg.get('trimAM', True) and 
                    not config.can_be_solo):
                    
                    trimmed_hours = calculate_hours(trimmed_am_start, trimmed_am_end)
                    min_hours = trim_cfg.get('minShiftHours', 4)
                    
                    if trimmed_hours >= min_hours:
                        templates.append(ShiftTemplate(
                            id=f"{config.id}_{day_idx}_AM_TRIMMED",
                            shop_id=config.id,
                            shop_name=config.name,
                            day_index=day_idx,
                            shift_type='AM_TRIMMED',
                            start_time=trimmed_am_start,
                            end_time=trimmed_am_end,
                            hours=trimmed_hours,
                            is_trimmed=True,
                            is_mandatory=False
                        ))
            else:
                # FLEXIBLE: create all types
                templates.append(ShiftTemplate(
                    id=f"{config.id}_{day_idx}_AM",
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type='AM',
                    start_time=day_am_start,
                    end_time=day_am_end,
                    hours=am_hours,
                    is_trimmed=False,
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
                    is_trimmed=False,
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
                    is_trimmed=False,
                    is_mandatory=is_mandatory
                ))
                
                # Add trimmed AM if enabled and not solo
                if (trim_cfg.get('enabled', False) and 
                    trim_cfg.get('trimAM', True) and 
                    not config.can_be_solo):
                    
                    trimmed_hours = calculate_hours(trimmed_am_start, trimmed_am_end)
                    min_hours = trim_cfg.get('minShiftHours', 4)
                    
                    if trimmed_hours >= min_hours:
                        templates.append(ShiftTemplate(
                            id=f"{config.id}_{day_idx}_AM_TRIMMED",
                            shop_id=config.id,
                            shop_name=config.name,
                            day_index=day_idx,
                            shift_type='AM_TRIMMED',
                            start_time=trimmed_am_start,
                            end_time=trimmed_am_end,
                            hours=trimmed_hours,
                            is_trimmed=True,
                            is_mandatory=False
                        ))
        
        # Process special shifts as special demands
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
                print(f"  [SPECIAL SHIFT] {special.get('employeeName', emp_id)} -> {config.name} on {DAYS_OF_WEEK[day_idx]} ({special.get('shiftType', 'AM')})")
    
    return templates, special_demands


def build_demands_from_config(shops: List[Dict]) -> List[DemandEntry]:
    """Build demand entries from shop configurations with TARGET and MINIMUM support"""
    demands = []
    
    for shop_data in shops:
        config = load_shop_config(shop_data)
        
        if not config.is_active:
            continue
        
        # Get staffing config
        staffing = config.staffing_config
        coverage_mode = staffing.coverage_mode if staffing else 'flexible'
        full_day_counts_as_both = staffing.full_day_counts_as_both if staffing else True
        
        print(f"\n[DEMANDS] Building for {config.name} (mode={coverage_mode}):")
        
        # Build a lookup for weekly schedule by day INDEX
        day_config_by_index = {}
        if staffing and staffing.weekly_schedule:
            for dc in staffing.weekly_schedule:
                dc_day = dc.get('day', '')
                if dc_day:
                    idx = get_day_index(dc_day)
                    day_config_by_index[idx] = dc
        
        for day_idx in range(7):
            day_name = DAYS_OF_WEEK[day_idx]
            
            # Check if Sunday and closed
            if day_idx == 6 and config.sunday.get('closed', False):
                print(f"  {day_name}: CLOSED")
                continue
            
            # Get day config from our lookup (by INDEX)
            day_config = day_config_by_index.get(day_idx)
            
            # Get day requirements (legacy fallback)
            day_req = None
            for req in config.requirements:
                req_day = req.get('day', '')
                if get_day_index(req_day) == day_idx:
                    day_req = req
                    break
            
            # Determine requirements - separate TARGET and MINIMUM
            if day_config:
                # Use new staffing config with TARGET and MINIMUM
                min_am = day_config.get('minAM', 1)
                min_pm = day_config.get('minPM', 1)
                # TARGET falls back to MIN if not specified or None
                target_am = day_config.get('targetAM')
                target_pm = day_config.get('targetPM')
                if target_am is None:
                    target_am = min_am
                if target_pm is None:
                    target_pm = min_pm
                
                min_full_day = day_config.get('minFullDay', 0)
                max_staff = day_config.get('maxStaff', 10)
                is_mandatory = day_config.get('isMandatory', False)
                allow_full = coverage_mode != 'split'
                
                print(f"  {day_name}: target={target_am}AM/{target_pm}PM, min={min_am}AM/{min_pm}PM, max={max_staff}")
            elif day_req:
                # Legacy requirements - use same value for target and min
                target_am = day_req.get('amStaff', 1)
                target_pm = day_req.get('pmStaff', 1)
                min_am = target_am
                min_pm = target_pm
                min_full_day = 0
                max_staff = day_req.get('maxStaff', 10) if day_req.get('maxStaff') else 10
                allow_full = day_req.get('allowFullDay', True)
                is_mandatory = day_req.get('isMandatory', False)
                
                print(f"  {day_name}: (legacy) staff={target_am}AM/{target_pm}PM, max={max_staff}")
            else:
                # Defaults
                target_am = 1
                target_pm = 1
                min_am = 1
                min_pm = 1
                min_full_day = 0
                max_staff = 10
                allow_full = coverage_mode != 'split'
                is_mandatory = False
                
                print(f"  {day_name}: (defaults) 1AM/1PM")
            
            # Apply Sunday max staff limit
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
                allow_full_day=allow_full,
                full_day_counts_as_both=full_day_counts_as_both,
                is_mandatory=is_mandatory,
                coverage_mode=coverage_mode
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
        
        # Build lookup structures
        self.employee_by_id = {e.id: e for e in employees}
        self.templates_by_shop_day = {}
        for t in templates:
            key = (t.shop_id, t.day_index)
            if key not in self.templates_by_shop_day:
                self.templates_by_shop_day[key] = []
            self.templates_by_shop_day[key].append(t)
        
        # Build employee-shop assignment map
        self.employee_shops = {}
        for a in assignments:
            if a.employee_id not in self.employee_shops:
                self.employee_shops[a.employee_id] = []
            self.employee_shops[a.employee_id].append(a.shop_id)
        
        # Build leave lookup (employee_id -> set of day indices)
        self.employee_leave_days = {}
        for lr in leave_requests:
            if lr.status == 'approved':
                if lr.employee_id not in self.employee_leave_days:
                    self.employee_leave_days[lr.employee_id] = set()
                # Convert dates to day indices for this week
                for day_idx in range(7):
                    self.employee_leave_days[lr.employee_id].add(day_idx)
        
        # Build demand lookup
        self.demands_by_shop_day = {}
        for d in demands:
            key = (d.shop_id, d.day_index)
            self.demands_by_shop_day[key] = d
        
        # Model and variables
        self.model = cp_model.CpModel()
        self.shift_vars = {}  # (employee_id, template_id) -> BoolVar
        
    def _build_variables(self):
        """Create decision variables for shift assignments"""
        for emp in self.employees:
            if not emp.is_active:
                continue
            
            # Get shops this employee can work at
            emp_shops = self.employee_shops.get(emp.id, [])
            if emp.primary_shop_id and emp.primary_shop_id not in emp_shops:
                emp_shops.append(emp.primary_shop_id)
            for sec_id in emp.secondary_shop_ids:
                if sec_id not in emp_shops:
                    emp_shops.append(sec_id)
            
            for template in self.templates:
                # Check if employee can work at this shop
                if template.shop_id not in emp_shops:
                    continue
                
                # Check if employee is on leave
                if emp.id in self.employee_leave_days:
                    if template.day_index in self.employee_leave_days[emp.id]:
                        continue
                
                # Check fixed days off
                emp_key = emp.name.lower()
                if emp_key in self.fixed_days_off:
                    if template.day_index in self.fixed_days_off[emp_key]:
                        continue
                
                # Check AM-only constraint
                if emp.am_only and template.shift_type in ['PM', 'FULL']:
                    continue
                
                # Create variable
                var_name = f"shift_{emp.id}_{template.id}"
                self.shift_vars[(emp.id, template.id)] = self.model.NewBoolVar(var_name)
    
    def _add_coverage_constraints(self):
        """
        Ensure each shop/day has required coverage.
        
        HARD CONSTRAINTS:
        - Must meet minimum staffing (minAM/minPM)
        - These are business requirements that MUST be satisfied
        """
        print("\n[COVERAGE CONSTRAINTS - HARD]")
        
        for demand in self.demands:
            shop_id = demand.shop_id
            day_idx = demand.day_index
            
            # Get shop config
            config = self.shop_configs.get(shop_id)
            can_be_solo = config.can_be_solo if config else False
            
            # Collect variables that contribute to coverage
            am_vars = []
            pm_vars = []
            full_vars = []
            trimmed_am_vars = []
            
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
                elif template.shift_type == 'AM_TRIMMED':
                    trimmed_am_vars.append(var)
            
            # Calculate effective coverage based on mode
            coverage_mode = demand.coverage_mode
            full_counts_as_both = demand.full_day_counts_as_both
            
            if full_counts_as_both:
                am_coverage = am_vars + full_vars + trimmed_am_vars
                pm_coverage = pm_vars + full_vars
            else:
                am_coverage = am_vars + trimmed_am_vars
                pm_coverage = pm_vars
            
            day_name = DAYS_OF_WEEK[day_idx]
            print(f"  {demand.shop_name} {day_name}: min={demand.min_am}AM/{demand.min_pm}PM, available={len(am_coverage)}AM/{len(pm_coverage)}PM vars")
            
            # === HARD CONSTRAINTS (MINIMUM STAFFING) ===
            if coverage_mode == 'fullDayOnly':
                # Only FULL shifts - require minimum
                min_required = max(demand.min_am, demand.min_pm, demand.min_full_day, 1)
                if full_vars:
                    self.model.Add(sum(full_vars) >= min_required)
                    if demand.max_staff < 10:
                        self.model.Add(sum(full_vars) <= demand.max_staff)
                    
            elif coverage_mode == 'split':
                # Only AM + PM (no FULL)
                if am_coverage and demand.min_am > 0:
                    self.model.Add(sum(am_coverage) >= demand.min_am)
                if pm_coverage and demand.min_pm > 0:
                    self.model.Add(sum(pm_coverage) >= demand.min_pm)
                    
            else:
                # FLEXIBLE mode
                if can_be_solo:
                    # Solo shop: at least 1 person covering the day
                    all_coverage = am_vars + pm_vars + full_vars + trimmed_am_vars
                    if all_coverage:
                        self.model.Add(sum(all_coverage) >= 1)
                else:
                    # Regular shop: enforce MINIMUM staffing (HARD)
                    if am_coverage and demand.min_am > 0:
                        self.model.Add(sum(am_coverage) >= demand.min_am)
                    if pm_coverage and demand.min_pm > 0:
                        self.model.Add(sum(pm_coverage) >= demand.min_pm)
                    
                    # Also ensure never completely empty
                    all_coverage = am_vars + pm_vars + full_vars + trimmed_am_vars
                    if all_coverage:
                        self.model.Add(sum(all_coverage) >= 1)
            
            # === MAX STAFF CONSTRAINT ===
            if demand.max_staff < 10:
                emp_works = {}
                for (emp_id, template_id), var in self.shift_vars.items():
                    template = next((t for t in self.templates if t.id == template_id), None)
                    if template and template.shop_id == shop_id and template.day_index == day_idx:
                        if emp_id not in emp_works:
                            emp_works[emp_id] = []
                        emp_works[emp_id].append(var)
                
                if emp_works:
                    emp_indicators = []
                    for emp_id, vars_list in emp_works.items():
                        indicator = self.model.NewBoolVar(f"emp_{emp_id}_works_{shop_id}_{day_idx}")
                        self.model.AddMaxEquality(indicator, vars_list)
                        emp_indicators.append(indicator)
                    
                    if emp_indicators:
                        self.model.Add(sum(emp_indicators) <= demand.max_staff)
    
    def _add_special_request_constraints(self):
        """
        Add HARD constraints for special requests.
        These MUST be fulfilled - the solver will fail if impossible.
        """
        print("\n[SPECIAL REQUEST CONSTRAINTS - HARD]")
        
        if not self.special_demands:
            print("  No special requests")
            return
        
        for special in self.special_demands:
            # Find matching template(s)
            matching_templates = []
            for template in self.templates:
                if (template.shop_id == special.shop_id and 
                    template.day_index == special.day_index):
                    # Match shift type
                    if special.shift_type == 'FULL' and template.shift_type == 'FULL':
                        matching_templates.append(template)
                    elif special.shift_type == 'AM' and template.shift_type in ['AM', 'AM_TRIMMED']:
                        matching_templates.append(template)
                    elif special.shift_type == 'PM' and template.shift_type == 'PM':
                        matching_templates.append(template)
            
            # Collect matching variables for this employee
            matching_vars = []
            for template in matching_templates:
                key = (special.employee_id, template.id)
                if key in self.shift_vars:
                    matching_vars.append(self.shift_vars[key])
            
            if matching_vars:
                # HARD CONSTRAINT: Employee MUST work at least one of these shifts
                self.model.Add(sum(matching_vars) >= 1)
                print(f"  REQUIRED: {special.employee_name} MUST work {special.shift_type} at {special.shop_name} on {DAYS_OF_WEEK[special.day_index]}")
            else:
                print(f"  WARNING: Cannot fulfill request for {special.employee_name} - not assigned to shop or no matching shift!")
    
    def _add_employee_constraints(self):
        """
        Add per-employee constraints.
        
        HARD CONSTRAINTS:
        - Max 1 shift per day (can't be in two places at once)
        - At least 1 day off per week (labor law)
        - Students max 20h/week (legal requirement)
        
        SOFT CONSTRAINTS (handled in objective):
        - Target weekly hours (overtime is allowed but penalized)
        """
        print("\n[EMPLOYEE CONSTRAINTS]")
        
        for emp in self.employees:
            if not emp.is_active:
                continue
            
            # === HARD: One shift per day per employee ===
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
            
            # === HARD: At least one day off per week ===
            all_shifts = [var for (emp_id, _), var in self.shift_vars.items() if emp_id == emp.id]
            if all_shifts:
                self.model.Add(sum(all_shifts) <= 6)
            
            # === HARD: Student hours cap (legal requirement) ===
            if emp.employment_type == 'student':
                total_hours_terms = []
                for (emp_id, template_id), var in self.shift_vars.items():
                    if emp_id != emp.id:
                        continue
                    template = next((t for t in self.templates if t.id == template_id), None)
                    if template:
                        hours_x10 = int(template.hours * 10)
                        total_hours_terms.append(var * hours_x10)
                
                if total_hours_terms:
                    self.model.Add(sum(total_hours_terms) <= STUDENT_MAX_HOURS * 10)
                    print(f"  {emp.name}: Student - HARD cap {STUDENT_MAX_HOURS}h/week")
            
            # NOTE: Regular employees have NO hard hour cap - overtime is allowed
            # Overtime will be tracked and lightly penalized in objective
    
    def _build_objective(self):
        """
        Build optimization objective.
        
        PRIORITIES (highest to lowest):
        1. Meet minimum staffing (handled by hard constraints)
        2. Meet target staffing (soft penalty)
        3. Distribute hours fairly (soft penalty)
        4. Minimize excessive overtime (soft penalty)
        """
        print("\n[BUILDING OBJECTIVE]")
        objective_terms = []
        
        # === COVERAGE PENALTIES ===
        for demand in self.demands:
            shop_id = demand.shop_id
            day_idx = demand.day_index
            
            # Collect coverage variables
            am_coverage = []
            pm_coverage = []
            full_coverage = []
            
            for (emp_id, template_id), var in self.shift_vars.items():
                template = next((t for t in self.templates if t.id == template_id), None)
                if not template:
                    continue
                if template.shop_id != shop_id or template.day_index != day_idx:
                    continue
                
                if template.shift_type in ['AM', 'AM_TRIMMED']:
                    am_coverage.append(var)
                if template.shift_type == 'PM':
                    pm_coverage.append(var)
                if template.shift_type == 'FULL':
                    full_coverage.append(var)
            
            # Determine effective coverage based on mode
            if demand.full_day_counts_as_both:
                am_effective = am_coverage + full_coverage
                pm_effective = pm_coverage + full_coverage
            else:
                am_effective = am_coverage
                pm_effective = pm_coverage
            
            # --- Under TARGET penalty (soft - try to meet targets) ---
            if am_effective and demand.target_am > 0:
                under_target_am = self.model.NewIntVar(0, demand.target_am, f"under_target_am_{shop_id}_{day_idx}")
                self.model.Add(under_target_am >= demand.target_am - sum(am_effective))
                objective_terms.append(under_target_am * PENALTY_UNDER_TARGET)
            
            if pm_effective and demand.target_pm > 0:
                under_target_pm = self.model.NewIntVar(0, demand.target_pm, f"under_target_pm_{shop_id}_{day_idx}")
                self.model.Add(under_target_pm >= demand.target_pm - sum(pm_effective))
                objective_terms.append(under_target_pm * PENALTY_UNDER_TARGET)
            
            # --- Over coverage penalty (very light) ---
            if am_effective:
                over_am = self.model.NewIntVar(0, 10, f"over_am_{shop_id}_{day_idx}")
                self.model.Add(over_am >= sum(am_effective) - demand.target_am)
                objective_terms.append(over_am * PENALTY_OVER_COVERAGE)
            
            if pm_effective:
                over_pm = self.model.NewIntVar(0, 10, f"over_pm_{shop_id}_{day_idx}")
                self.model.Add(over_pm >= sum(pm_effective) - demand.target_pm)
                objective_terms.append(over_pm * PENALTY_OVER_COVERAGE)
        
        # === EMPLOYEE HOURS PENALTIES (SOFT - overtime allowed) ===
        for emp in self.employees:
            if not emp.is_active:
                continue
            
            hours_terms = []
            for (emp_id, template_id), var in self.shift_vars.items():
                if emp_id != emp.id:
                    continue
                template = next((t for t in self.templates if t.id == template_id), None)
                if template:
                    hours_x10 = int(template.hours * 10)
                    hours_terms.append(var * hours_x10)
            
            if hours_terms:
                # Allow up to 60 hours (significant overtime OK)
                total_hours_x10 = self.model.NewIntVar(0, MAX_WEEKLY_HOURS * 10, f"hours_{emp.id}")
                self.model.Add(total_hours_x10 == sum(hours_terms))
                
                target_hours_x10 = emp.weekly_hours * 10
                
                # Under hours penalty (try to give people their contracted hours)
                under_hours = self.model.NewIntVar(0, 500, f"under_hours_{emp.id}")
                self.model.Add(under_hours >= target_hours_x10 - total_hours_x10)
                objective_terms.append(under_hours * PENALTY_UNDER_HOURS)
                
                # Overtime penalty (VERY LOW - overtime is fine)
                if emp.employment_type != 'student':
                    over_hours = self.model.NewIntVar(0, 300, f"over_hours_{emp.id}")
                    self.model.Add(over_hours >= total_hours_x10 - target_hours_x10)
                    objective_terms.append(over_hours * PENALTY_OVERTIME)
                    
                    # Excessive overtime penalty (moderate - avoid giving someone 60h)
                    excessive_ot = self.model.NewIntVar(0, 200, f"excessive_ot_{emp.id}")
                    # Penalize hours over 50
                    self.model.Add(excessive_ot >= total_hours_x10 - 500)
                    objective_terms.append(excessive_ot * PENALTY_EXCESSIVE_OVERTIME)
        
        # === TRIMMED SHIFT PENALTY (very light preference for standard shifts) ===
        for (emp_id, template_id), var in self.shift_vars.items():
            template = next((t for t in self.templates if t.id == template_id), None)
            if template and template.is_trimmed:
                objective_terms.append(var * PENALTY_TRIMMED_SHIFT)
        
        # Minimize total penalties
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
            print(f"  Objective has {len(objective_terms)} terms")
    
    def solve(self, time_limit_seconds: int = 120) -> Dict:
        """Solve the roster and return results"""
        try:
            print(f"\n{'='*60}")
            print("ROSTERPRO v31.0 - Overtime-Enabled Solver")
            print(f"{'='*60}")
            print(f"Employees: {len(self.employees)}")
            print(f"Templates: {len(self.templates)}")
            print(f"Demands: {len(self.demands)}")
            print(f"Special Requests: {len(self.special_demands)}")
            print(f"Shop Configs: {len(self.shop_configs)}")
            print(f"Assignments: {len(self.assignments)}")
            
            # Build the model
            print("\n[BUILDING MODEL]")
            self._build_variables()
            print(f"  Variables created: {len(self.shift_vars)}")
            
            if len(self.shift_vars) == 0:
                print("\n[ERROR] No shift variables created! Check employee-shop assignments.")
                return {
                    'success': False,
                    'status': 'NO_VARIABLES',
                    'shifts': [],
                    'employeeHours': {},
                    'message': 'No employees can be assigned to any shifts. Check shop assignments.'
                }
            
            self._add_coverage_constraints()
            self._add_special_request_constraints()
            self._add_employee_constraints()
            self._build_objective()
            
            # Solve
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
                # Extract solution
                shifts = []
                employee_hours = {emp.id: 0.0 for emp in self.employees}
                
                # Count coverage for verification
                coverage_count = {}
                
                for (emp_id, template_id), var in self.shift_vars.items():
                    if solver.Value(var) == 1:
                        template = next((t for t in self.templates if t.id == template_id), None)
                        if not template:
                            continue
                        
                        emp = self.employee_by_id.get(emp_id)
                        if not emp:
                            continue
                        
                        # Calculate actual date
                        from datetime import datetime, timedelta
                        week_start_date = datetime.strptime(self.week_start, '%Y-%m-%d')
                        shift_date = week_start_date + timedelta(days=template.day_index)
                        
                        shift = {
                            'id': f"{emp_id}_{template_id}_{self.week_start}",
                            'employeeId': emp_id,
                            'employeeName': emp.name,
                            'shopId': template.shop_id,
                            'shopName': template.shop_name,
                            'date': shift_date.strftime('%Y-%m-%d'),
                            'dayIndex': template.day_index,
                            'shiftType': template.shift_type,
                            'startTime': template.start_time,
                            'endTime': template.end_time,
                            'hours': template.hours,
                            'company': emp.company
                        }
                        shifts.append(shift)
                        employee_hours[emp_id] += template.hours
                        
                        # Track coverage
                        key = (template.shop_id, template.day_index)
                        if key not in coverage_count:
                            coverage_count[key] = {'am': 0, 'pm': 0, 'full': 0}
                        
                        if template.shift_type in ['AM', 'AM_TRIMMED']:
                            coverage_count[key]['am'] += 1
                        elif template.shift_type == 'PM':
                            coverage_count[key]['pm'] += 1
                        elif template.shift_type == 'FULL':
                            coverage_count[key]['full'] += 1
                
                # Log coverage summary
                print(f"\n[COVERAGE SUMMARY]")
                for demand in self.demands:
                    key = (demand.shop_id, demand.day_index)
                    actual = coverage_count.get(key, {'am': 0, 'pm': 0, 'full': 0})
                    
                    if demand.full_day_counts_as_both:
                        am_eff = actual['am'] + actual['full']
                        pm_eff = actual['pm'] + actual['full']
                    else:
                        am_eff = actual['am']
                        pm_eff = actual['pm']
                    
                    am_ok = "✓" if am_eff >= demand.min_am else "✗"
                    pm_ok = "✓" if pm_eff >= demand.min_pm else "✗"
                    
                    day_name = DAYS_OF_WEEK[demand.day_index][:3].upper()
                    print(f"  {demand.shop_name} {day_name}: AM={am_eff}/{demand.min_am} {am_ok}, PM={pm_eff}/{demand.min_pm} {pm_ok}")
                
                # Log employee hours
                print(f"\n[EMPLOYEE HOURS]")
                overtime_employees = []
                for emp in self.employees:
                    hours = employee_hours.get(emp.id, 0)
                    if hours > 0:
                        ot_indicator = ""
                        if hours > emp.weekly_hours:
                            ot_hours = hours - emp.weekly_hours
                            ot_indicator = f" [+{ot_hours:.1f}h OT]"
                            overtime_employees.append((emp.name, ot_hours))
                        print(f"  {emp.name}: {hours:.1f}h / {emp.weekly_hours}h{ot_indicator}")
                
                if overtime_employees:
                    print(f"\n[OVERTIME SUMMARY]")
                    total_ot = sum(ot for _, ot in overtime_employees)
                    print(f"  {len(overtime_employees)} employees with overtime, total: {total_ot:.1f}h")
                
                print(f"\n[RESULT] Generated {len(shifts)} shifts")
                print(f"  Objective value: {solver.ObjectiveValue()}")
                
                return {
                    'success': True,
                    'status': status_str,
                    'shifts': shifts,
                    'employeeHours': employee_hours,
                    'objectiveValue': solver.ObjectiveValue(),
                    'message': f'Generated {len(shifts)} shifts'
                }
            
            else:
                print(f"\n[ERROR] Solver failed: {status_str}")
                print("This usually means:")
                print("  - Not enough employees assigned to shops")
                print("  - Staffing requirements too high for available staff")
                print("  - Conflicting constraints (e.g., special requests)")
                
                return {
                    'success': False,
                    'status': status_str,
                    'shifts': [],
                    'employeeHours': {},
                    'message': f'Could not find a valid roster. Status: {status_str}'
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
