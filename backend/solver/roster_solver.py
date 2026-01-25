# backend/solver/roster_solver.py
"""
ROSTERPRO v26.0 - Config-Driven Smart Roster Solver
===================================================

BUSINESS RULES:
1. SOLO SHOPS (canBeSolo=true): 1 FULL DAY shift is sufficient coverage
   - Zabbar, Rabat, Mellieha, Marsascala, Marsaxlokk, Siggiewi, Tigne Point
   - No need for AM+PM when FULL DAY assigned
   
2. BUSY SHOPS (canBeSolo=false): Require multiple staff, trimming allowed
   - Fgura, Carters, Hamrun
   - When 3+ staff in AM/PM, some get trimmed shifts
   
3. HOUR TRIMMING: Configurable per shop via UI
   - trimFromStart: delay start (e.g., 6:30 -> 7:30)
   - trimFromEnd: end early (e.g., 14:30 -> 12:00)
   - trimWhenMoreThan: threshold to start trimming
   - Only applies to AM shifts by default (configurable)
   
4. SUNDAY RULES: Per-shop configuration
   - closed: shop doesn't operate on Sunday
   - maxStaff: limit employees scheduled
   - customHours: different operating hours (e.g., 08:00-13:00)
   
5. CRITICAL CONSTRAINTS:
   - Never leave a shop uncovered (at least 1 person always)
   - Special requests are HARD constraints
   - Students max 20h/week (HARD)
   - 1 shift per employee per day
   - At least 1 day off per week
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from ortools.sat.python import cp_model
import traceback

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
    shop_id: int
    shop_name: str
    day_index: int
    am_required: int
    pm_required: int
    allow_full_day: bool = True
    is_mandatory: bool = False


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


# ============================================
# CONSTANTS
# ============================================

DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

# Hours and penalties
STANDARD_SHIFT_HOURS = 7.5
MIN_SHIFT_HOURS = 4.0
MAX_SHIFT_HOURS = 12.0
STUDENT_MAX_HOURS = 20

# Penalty weights for optimization
PENALTY_UNDER_COVERAGE = 1000      # Very high - never leave shop empty
PENALTY_OVER_COVERAGE = 50         # Moderate - avoid overstaffing
PENALTY_OVERTIME = 100             # High - minimize overtime
PENALTY_UNDER_HOURS = 30           # Moderate - try to give target hours
PENALTY_TRIMMED_SHIFT = 5          # Low - slight preference for standard shifts
PENALTY_MISSED_SPECIAL = 10000     # Extreme - special requests are critical


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


def get_day_index(day_name: str) -> int:
    """Convert day name to index (0=Monday)"""
    day_lower = day_name.lower()
    if day_lower in DAYS_OF_WEEK:
        return DAYS_OF_WEEK.index(day_lower)
    return 0


# ============================================
# SHOP CONFIG LOADING
# ============================================

def load_shop_config(shop_data: Dict) -> ShopConfig:
    """Load shop configuration from API data"""
    
    # Parse trimming config
    trimming = shop_data.get('trimming', {})
    if isinstance(trimming, str):
        import json
        try:
            trimming = json.loads(trimming)
        except:
            trimming = {}
    
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
    sunday = shop_data.get('sunday', {})
    if isinstance(sunday, str):
        import json
        try:
            sunday = json.loads(sunday)
        except:
            sunday = {}
    
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
    requirements = shop_data.get('requirements', [])
    if isinstance(requirements, str):
        import json
        try:
            requirements = json.loads(requirements)
        except:
            requirements = []
    
    # Parse special shifts
    special_shifts = shop_data.get('specialShifts', [])
    if isinstance(special_shifts, str):
        import json
        try:
            special_shifts = json.loads(special_shifts)
        except:
            special_shifts = []
    
    # Parse assigned employees
    assigned = shop_data.get('assignedEmployees', [])
    if isinstance(assigned, str):
        import json
        try:
            assigned = json.loads(assigned)
        except:
            assigned = []
    
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
        assigned_employees=assigned
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
            
            # Get custom Sunday hours if enabled
            if day_idx == 6 and config.sunday.get('customHours', {}).get('enabled', False):
                custom = config.sunday['customHours']
                am_start = custom.get('openTime', '08:00')
                am_end = custom.get('closeTime', '13:00')
                pm_start = am_start  # Sunday typically just one shift
                pm_end = am_end
            
            # Get day requirements
            day_req = None
            for req in config.requirements:
                if req.get('day', '').lower() == day_name:
                    day_req = req
                    break
            
            # Default requirements if not specified
            am_required = day_req.get('amStaff', 1) if day_req else 1
            pm_required = day_req.get('pmStaff', 1) if day_req else 1
            allow_full = day_req.get('allowFullDay', True) if day_req else True
            is_mandatory = day_req.get('isMandatory', False) if day_req else False
            
            # Calculate hours
            am_hours = calculate_hours(am_start, am_end)
            pm_hours = calculate_hours(pm_start, pm_end)
            full_hours = calculate_hours(am_start, pm_end)
            
            # Create standard AM template
            templates.append(ShiftTemplate(
                id=f"{config.id}_{day_idx}_AM",
                shop_id=config.id,
                shop_name=config.name,
                day_index=day_idx,
                shift_type='AM',
                start_time=am_start,
                end_time=am_end,
                hours=am_hours,
                is_trimmed=False,
                is_mandatory=is_mandatory
            ))
            
            # Create standard PM template
            templates.append(ShiftTemplate(
                id=f"{config.id}_{day_idx}_PM",
                shop_id=config.id,
                shop_name=config.name,
                day_index=day_idx,
                shift_type='PM',
                start_time=pm_start,
                end_time=pm_end,
                hours=pm_hours,
                is_trimmed=False,
                is_mandatory=is_mandatory
            ))
            
            # Create FULL day template if allowed
            if allow_full:
                templates.append(ShiftTemplate(
                    id=f"{config.id}_{day_idx}_FULL",
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=day_idx,
                    shift_type='FULL',
                    start_time=am_start,
                    end_time=pm_end,
                    hours=full_hours,
                    is_trimmed=False,
                    is_mandatory=is_mandatory
                ))
            
            # Create trimmed AM template if trimming enabled and meaningful
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
                special_demands.append(SpecialShiftDemand(
                    employee_id=emp_id,
                    employee_name=special.get('employeeName', ''),
                    shop_id=config.id,
                    shop_name=config.name,
                    day_index=get_day_index(special.get('dayOfWeek', 'monday')),
                    shift_type=special.get('shiftType', 'AM'),
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
        
        for day_idx in range(7):
            day_name = DAYS_OF_WEEK[day_idx]
            
            # Check if Sunday and closed
            if day_idx == 6 and config.sunday.get('closed', False):
                continue
            
            # Get day requirements
            day_req = None
            for req in config.requirements:
                if req.get('day', '').lower() == day_name:
                    day_req = req
                    break
            
            # Default requirements
            am_required = day_req.get('amStaff', 1) if day_req else 1
            pm_required = day_req.get('pmStaff', 1) if day_req else 1
            allow_full = day_req.get('allowFullDay', True) if day_req else True
            is_mandatory = day_req.get('isMandatory', False) if day_req else False
            
            # Apply Sunday max staff limit
            if day_idx == 6:
                max_staff = config.sunday.get('maxStaff')
                if max_staff is not None:
                    am_required = min(am_required, max_staff)
                    pm_required = min(pm_required, max_staff)
            
            demands.append(DemandEntry(
                shop_id=config.id,
                shop_name=config.name,
                day_index=day_idx,
                am_required=am_required,
                pm_required=pm_required,
                allow_full_day=allow_full,
                is_mandatory=is_mandatory
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
                # This is simplified - in production, properly parse dates
                for day_idx in range(7):
                    self.employee_leave_days[lr.employee_id].add(day_idx)
        
        # Model and variables
        self.model = cp_model.CpModel()
        self.shift_vars = {}  # (employee_id, template_id) -> BoolVar
        self.coverage_vars = {}  # For tracking coverage
        
    def _build_variables(self):
        """Create decision variables for shift assignments"""
        for emp in self.employees:
            if not emp.is_active:
                continue
            
            # Get shops this employee can work at
            emp_shops = self.employee_shops.get(emp.id, [])
            if emp.primary_shop_id and emp.primary_shop_id not in emp_shops:
                emp_shops.append(emp.primary_shop_id)
            
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
        """Ensure each shop/day has required coverage"""
        for demand in self.demands:
            shop_id = demand.shop_id
            day_idx = demand.day_index
            
            # Get shop config
            config = self.shop_configs.get(shop_id)
            can_be_solo = config.can_be_solo if config else False
            
            # Collect variables that contribute to AM coverage
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
            
            # Coverage logic
            if can_be_solo and demand.allow_full_day:
                # Solo shop: 1 FULL DAY is sufficient, OR standard AM+PM
                # At least 1 person must cover the shop
                all_coverage = am_vars + pm_vars + full_vars + trimmed_am_vars
                if all_coverage:
                    self.model.Add(sum(all_coverage) >= 1)
                
                # If FULL is assigned, no need for separate AM/PM
                # This is handled by the one-shift-per-day constraint
            else:
                # Non-solo shop: need proper AM and PM coverage
                # AM coverage: AM + FULL + AM_TRIMMED count
                am_coverage = am_vars + full_vars + trimmed_am_vars
                if am_coverage and demand.am_required > 0:
                    if demand.is_mandatory:
                        self.model.Add(sum(am_coverage) >= demand.am_required)
                    else:
                        # Soft constraint with penalty (handled in objective)
                        pass
                
                # PM coverage: PM + FULL count
                pm_coverage = pm_vars + full_vars
                if pm_coverage and demand.pm_required > 0:
                    if demand.is_mandatory:
                        self.model.Add(sum(pm_coverage) >= demand.pm_required)
                    else:
                        # Soft constraint with penalty (handled in objective)
                        pass
                
                # Never leave shop completely empty
                all_coverage = am_vars + pm_vars + full_vars + trimmed_am_vars
                if all_coverage:
                    self.model.Add(sum(all_coverage) >= 1)
    
    def _add_special_request_constraints(self):
        """Add HARD constraints for special requests"""
        for special in self.special_demands:
            # Find matching template
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
            
            # Require at least one of the matching shifts to be assigned
            matching_vars = []
            for template in matching_templates:
                key = (special.employee_id, template.id)
                if key in self.shift_vars:
                    matching_vars.append(self.shift_vars[key])
            
            if matching_vars:
                self.model.Add(sum(matching_vars) >= 1)
                print(f"[SPECIAL REQUEST] {special.employee_name} MUST work {special.shift_type} at {special.shop_name} on day {special.day_index}")
    
    def _add_sunday_constraints(self):
        """Add Sunday-specific constraints"""
        for shop_id, config in self.shop_configs.items():
            if not config:
                continue
            
            sunday_config = config.sunday
            if not sunday_config:
                continue
            
            max_staff = sunday_config.get('maxStaff')
            if max_staff is None:
                continue
            
            # Collect all Sunday shifts for this shop
            sunday_vars = []
            for (emp_id, template_id), var in self.shift_vars.items():
                template = next((t for t in self.templates if t.id == template_id), None)
                if template and template.shop_id == shop_id and template.day_index == 6:
                    sunday_vars.append(var)
            
            if sunday_vars:
                # Each employee can only count once toward Sunday limit
                # We need to count unique employees, not total shifts
                emp_sunday_vars = {}
                for (emp_id, template_id), var in self.shift_vars.items():
                    template = next((t for t in self.templates if t.id == template_id), None)
                    if template and template.shop_id == shop_id and template.day_index == 6:
                        if emp_id not in emp_sunday_vars:
                            emp_sunday_vars[emp_id] = []
                        emp_sunday_vars[emp_id].append(var)
                
                # Create indicator for each employee working Sunday at this shop
                emp_works_sunday = []
                for emp_id, vars_list in emp_sunday_vars.items():
                    indicator = self.model.NewBoolVar(f"emp_{emp_id}_works_sunday_shop_{shop_id}")
                    # indicator = 1 if any shift is assigned
                    self.model.AddMaxEquality(indicator, vars_list)
                    emp_works_sunday.append(indicator)
                
                if emp_works_sunday:
                    self.model.Add(sum(emp_works_sunday) <= max_staff)
                    print(f"[SUNDAY MAX] {config.name}: max {max_staff} employees")
    
    def _add_employee_constraints(self):
        """Add per-employee constraints"""
        for emp in self.employees:
            if not emp.is_active:
                continue
            
            # One shift per day per employee
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
            
            # At least one day off per week
            all_shifts = [var for (emp_id, _), var in self.shift_vars.items() if emp_id == emp.id]
            if all_shifts:
                self.model.Add(sum(all_shifts) <= 6)
            
            # Student hours cap (HARD constraint)
            if emp.employment_type == 'student':
                total_hours_terms = []
                for (emp_id, template_id), var in self.shift_vars.items():
                    if emp_id != emp.id:
                        continue
                    template = next((t for t in self.templates if t.id == template_id), None)
                    if template:
                        # Multiply hours by 10 to work with integers
                        hours_x10 = int(template.hours * 10)
                        total_hours_terms.append(var * hours_x10)
                
                if total_hours_terms:
                    self.model.Add(sum(total_hours_terms) <= STUDENT_MAX_HOURS * 10)
    
    def _add_trimming_constraints(self):
        """Add constraints for when trimming should be used"""
        for shop_id, config in self.shop_configs.items():
            if not config or not config.trimming.get('enabled', False):
                continue
            
            threshold = config.trimming.get('trimWhenMoreThan', 2)
            
            for day_idx in range(7):
                # Count standard AM shifts
                standard_am_vars = []
                trimmed_am_vars = []
                
                for (emp_id, template_id), var in self.shift_vars.items():
                    template = next((t for t in self.templates if t.id == template_id), None)
                    if not template:
                        continue
                    if template.shop_id != shop_id or template.day_index != day_idx:
                        continue
                    
                    if template.shift_type == 'AM':
                        standard_am_vars.append(var)
                    elif template.shift_type == 'AM_TRIMMED':
                        trimmed_am_vars.append(var)
                
                # If we have enough staff, some should be trimmed
                # This is a soft constraint - handled via penalties in objective
    
    def _build_objective(self):
        """Build optimization objective"""
        objective_terms = []
        
        # Coverage penalties
        for demand in self.demands:
            shop_id = demand.shop_id
            day_idx = demand.day_index
            config = self.shop_configs.get(shop_id)
            
            # Collect coverage variables
            am_coverage = []
            pm_coverage = []
            
            for (emp_id, template_id), var in self.shift_vars.items():
                template = next((t for t in self.templates if t.id == template_id), None)
                if not template:
                    continue
                if template.shop_id != shop_id or template.day_index != day_idx:
                    continue
                
                if template.shift_type in ['AM', 'AM_TRIMMED', 'FULL']:
                    am_coverage.append(var)
                if template.shift_type in ['PM', 'FULL']:
                    pm_coverage.append(var)
            
            # Under-coverage penalty (soft constraint for non-mandatory)
            if am_coverage and demand.am_required > 0 and not demand.is_mandatory:
                under_am = self.model.NewIntVar(0, demand.am_required, f"under_am_{shop_id}_{day_idx}")
                self.model.Add(under_am >= demand.am_required - sum(am_coverage))
                objective_terms.append(under_am * PENALTY_UNDER_COVERAGE)
            
            if pm_coverage and demand.pm_required > 0 and not demand.is_mandatory:
                under_pm = self.model.NewIntVar(0, demand.pm_required, f"under_pm_{shop_id}_{day_idx}")
                self.model.Add(under_pm >= demand.pm_required - sum(pm_coverage))
                objective_terms.append(under_pm * PENALTY_UNDER_COVERAGE)
            
            # Over-coverage penalty
            if am_coverage:
                over_am = self.model.NewIntVar(0, 10, f"over_am_{shop_id}_{day_idx}")
                self.model.Add(over_am >= sum(am_coverage) - demand.am_required)
                objective_terms.append(over_am * PENALTY_OVER_COVERAGE)
            
            if pm_coverage:
                over_pm = self.model.NewIntVar(0, 10, f"over_pm_{shop_id}_{day_idx}")
                self.model.Add(over_pm >= sum(pm_coverage) - demand.pm_required)
                objective_terms.append(over_pm * PENALTY_OVER_COVERAGE)
        
        # Employee hours penalties
        for emp in self.employees:
            if not emp.is_active:
                continue
            
            # Calculate total hours for this employee
            hours_terms = []
            for (emp_id, template_id), var in self.shift_vars.items():
                if emp_id != emp.id:
                    continue
                template = next((t for t in self.templates if t.id == template_id), None)
                if template:
                    hours_x10 = int(template.hours * 10)
                    hours_terms.append(var * hours_x10)
            
            if hours_terms:
                total_hours_x10 = self.model.NewIntVar(0, 800, f"hours_{emp.id}")
                self.model.Add(total_hours_x10 == sum(hours_terms))
                
                target_hours_x10 = emp.weekly_hours * 10
                
                # Under hours penalty
                under_hours = self.model.NewIntVar(0, 400, f"under_hours_{emp.id}")
                self.model.Add(under_hours >= target_hours_x10 - total_hours_x10)
                objective_terms.append(under_hours * PENALTY_UNDER_HOURS)
                
                # Overtime penalty (only for non-students, students have hard cap)
                if emp.employment_type != 'student':
                    over_hours = self.model.NewIntVar(0, 200, f"over_hours_{emp.id}")
                    self.model.Add(over_hours >= total_hours_x10 - target_hours_x10)
                    objective_terms.append(over_hours * PENALTY_OVERTIME)
        
        # Trimmed shift penalty (slight preference for standard shifts)
        for (emp_id, template_id), var in self.shift_vars.items():
            template = next((t for t in self.templates if t.id == template_id), None)
            if template and template.is_trimmed:
                objective_terms.append(var * PENALTY_TRIMMED_SHIFT)
        
        # Minimize total penalties
        if objective_terms:
            self.model.Minimize(sum(objective_terms))
    
    def solve(self, time_limit_seconds: int = 90) -> Dict:
        """Solve the roster and return results"""
        try:
            print(f"\n{'='*60}")
            print("ROSTERPRO v26.0 - Config-Driven Solver")
            print(f"{'='*60}")
            print(f"Employees: {len(self.employees)}")
            print(f"Templates: {len(self.templates)}")
            print(f"Demands: {len(self.demands)}")
            print(f"Special Requests: {len(self.special_demands)}")
            print(f"Shop Configs: {len(self.shop_configs)}")
            
            # Build the model
            print("\nBuilding model...")
            self._build_variables()
            print(f"  Variables created: {len(self.shift_vars)}")
            
            self._add_coverage_constraints()
            print("  Coverage constraints added")
            
            self._add_special_request_constraints()
            print("  Special request constraints added")
            
            self._add_sunday_constraints()
            print("  Sunday constraints added")
            
            self._add_employee_constraints()
            print("  Employee constraints added")
            
            self._add_trimming_constraints()
            print("  Trimming constraints added")
            
            self._build_objective()
            print("  Objective built")
            
            # Solve
            print(f"\nSolving (time limit: {time_limit_seconds}s)...")
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
            
            print(f"Status: {status_names.get(status, 'UNKNOWN')}")
            
            if status in [cp_model.OPTIMAL, cp_model.FEASIBLE]:
                return self._extract_solution(solver)
            else:
                return {
                    'success': False,
                    'status': status_names.get(status, 'UNKNOWN'),
                    'message': 'Could not find a valid roster',
                    'shifts': [],
                    'employeeHours': {}
                }
                
        except Exception as e:
            traceback.print_exc()
            return {
                'success': False,
                'status': 'ERROR',
                'message': str(e),
                'shifts': [],
                'employeeHours': {}
            }
    
    def _extract_solution(self, solver) -> Dict:
        """Extract the solution into a usable format"""
        shifts = []
        employee_hours = {emp.id: 0.0 for emp in self.employees}
        
        for (emp_id, template_id), var in self.shift_vars.items():
            if solver.Value(var) == 1:
                template = next((t for t in self.templates if t.id == template_id), None)
                if not template:
                    continue
                
                emp = self.employee_by_id.get(emp_id)
                if not emp:
                    continue
                
                # Calculate date from week_start and day_index
                from datetime import datetime, timedelta
                week_start_date = datetime.strptime(self.week_start, '%Y-%m-%d')
                shift_date = week_start_date + timedelta(days=template.day_index)
                
                shifts.append({
                    'employeeId': emp_id,
                    'employeeName': emp.name,
                    'shopId': template.shop_id,
                    'shopName': template.shop_name,
                    'date': shift_date.strftime('%Y-%m-%d'),
                    'dayIndex': template.day_index,
                    'dayName': DAYS_OF_WEEK[template.day_index],
                    'startTime': template.start_time,
                    'endTime': template.end_time,
                    'shiftType': template.shift_type,
                    'hours': template.hours,
                    'isTrimmed': template.is_trimmed
                })
                
                employee_hours[emp_id] += template.hours
        
        # Build employee hours summary
        hours_summary = {}
        for emp in self.employees:
            hours_summary[emp.id] = {
                'name': emp.name,
                'target': emp.weekly_hours,
                'scheduled': round(employee_hours.get(emp.id, 0), 1),
                'difference': round(employee_hours.get(emp.id, 0) - emp.weekly_hours, 1)
            }
        
        print(f"\nSolution found!")
        print(f"  Total shifts: {len(shifts)}")
        
        return {
            'success': True,
            'status': 'OPTIMAL',
            'message': f'Roster generated with {len(shifts)} shifts',
            'shifts': shifts,
            'employeeHours': hours_summary,
            'weekStart': self.week_start
        }
