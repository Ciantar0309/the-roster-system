"""
ROSTERPRO v32.6 — Pattern-Based Solver
======================================
32.0  original
32.1  flexible-day fix, no consecutive FULL, higher OT penalties
32.2  post-solve trimming keeps at-close headcount; full-timers >= 40h (hard)
32.3  per-shop trimming from DB; no FULL at big shops; Sunday maxStaff fix
32.4  Fgura/Carters Sunday fix: 2 FULL shifts 08:00-13:00
32.5  Everyone gets 1 day off Mon-Fri
32.6  Progressive OT penalty - spread overtime evenly, don't pile on one person

Public API unchanged:
    build_templates_from_config, build_demands_from_config, RosterSolver
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple
from ortools.sat.python import cp_model
from datetime import datetime, timedelta
import json, re

# ────────────────────────────────────────────────────────────────────────────
# CONSTANTS
# ────────────────────────────────────────────────────────────────────────────
BIG_STAFF_SHOPS = {"Hamrun", "Carters", "Fgura"}
EXCLUDED_EMPLOYEES = {"Maria"}
DAYS_OF_WEEK = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
DAY_NAME_MAP = {0: "Mon", 1: "Tue", 2: "Wed", 3: "Thu", 4: "Fri", 5: "Sat", 6: "Sun"}

WEEK_TARGET = {
    "fulltime": 40, "full-time": 40,
    "parttime": 30, "part-time": 30,
    "student": 20
}
OT_CAP = 10
MAX_FULLDAY_PER_SHOP = 2

# Penalties
PENALTY_UNDER_MINIMUM = 100_000
PENALTY_UNDER_TARGET = 500
PENALTY_OVER_COVERAGE = 20
PENALTY_OVERTIME = 300
PENALTY_EXCESSIVE_OT = 1000
PENALTY_UNDER_HOURS = 2000
PENALTY_CROSS_SHOP = 30
PENALTY_FULL_SHIFT = 300
PENALTY_FULL_SHIFT_BIG = 3000

# Progressive OT penalties (new)
PENALTY_OT_TIER1 = 200   # 2-5h OT
PENALTY_OT_TIER2 = 500   # 5-10h OT
PENALTY_OT_TIER3 = 1000  # 10h+ OT

# ────────────────────────────────────────────────────────────────────────────
# DATA MODELS
# ────────────────────────────────────────────────────────────────────────────
@dataclass
class Employee:
    id: int
    name: str
    company: str
    employment_type: str
    weekly_hours: int
    is_active: bool = True
    am_only: bool = False
    pm_only: bool = False
    primary_shop_id: Optional[int] = None
    secondary_shop_ids: List[int] = field(default_factory=list)


@dataclass
class LeaveRequest:
    employee_id: int
    start_date: str
    end_date: str
    leave_type: str

@dataclass
class ShopAssignment:
    employee_id: int
    shop_id: int
    is_primary: bool

@dataclass
class ShiftTemplate:
    id: str
    shop_id: int
    shop_name: str
    day_index: int
    shift_type: str  # AM, PM, FULL
    start_time: str
    end_time: str
    hours: float
    is_mandatory: bool = False

@dataclass
class DemandEntry:
    shop_id: int
    shop_name: str
    day_index: int
    min_am: int
    min_pm: int
    target_am: int
    target_pm: int
    is_mandatory: bool
    is_solo: bool
    max_staff: int = 10

@dataclass
class SpecialShiftDemand:
    shop_id: int
    shop_name: str
    day_index: int
    shift_type: str
    employee_id: Optional[int]
    start_time: str
    end_time: str

@dataclass
class StaffingConfig:
    coverage_mode: str = "flexible"
    full_day_counts_as_both: bool = True
    never_below_minimum: bool = True
    weekly_schedule: List[Dict] = field(default_factory=list)

@dataclass
class ShopConfig:
    id: int
    name: str
    company: str
    open_time: str
    close_time: str
    is_active: bool
    can_be_solo: bool
    min_staff_at_close: int
    sunday: Dict
    special_shifts: List
    staffing_config: Optional[StaffingConfig]
    # Trimming config
    trim_enabled: bool = True
    trim_am: bool = True
    trim_pm: bool = False
    trim_from_start: int = 1
    trim_from_end: int = 2
    trim_when_more_than: int = 2

# ────────────────────────────────────────────────────────────────────────────
# HELPERS
# ────────────────────────────────────────────────────────────────────────────
def get_day_index(day_name: str) -> int:
    mapping = {"mon": 0, "tue": 1, "wed": 2, "thu": 3, "fri": 4, "sat": 5, "sun": 6,
               "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
               "friday": 4, "saturday": 5, "sunday": 6}
    return mapping.get(day_name.lower(), -1)

def parse_time(t: str) -> int:
    """Convert HH:MM to minutes since midnight."""
    if not t:
        return 0
    parts = t.split(":")
    return int(parts[0]) * 60 + int(parts[1])

def format_time(mins: int) -> str:
    h, m = divmod(mins, 60)
    return f"{h:02d}:{m:02d}"

def calculate_hours(start: str, end: str) -> float:
    return max(0, (parse_time(end) - parse_time(start)) / 60)

def safe_json_parse(s: Any, default: Any = None):
    if s is None:
        return default
    if isinstance(s, (dict, list)):
        return s
    try:
        return json.loads(s)
    except:
        return default

def get_employee_target_hours(emp_type: str) -> int:
    return WEEK_TARGET.get(emp_type.lower().replace(" ", ""), 40)

# ────────────────────────────────────────────────────────────────────────────
# LOADERS
# ────────────────────────────────────────────────────────────────────────────
def load_staffing_config(raw: Any) -> Optional[StaffingConfig]:
    data = safe_json_parse(raw, None)
    if not data:
        return None
    return StaffingConfig(
        coverage_mode=data.get("coverageMode", "flexible"),
        full_day_counts_as_both=data.get("fullDayCountsAsBoth", True),
        never_below_minimum=data.get("neverBelowMinimum", True),
        weekly_schedule=data.get("weeklySchedule", [])
    )

def load_shop_config(raw: Dict) -> ShopConfig:
    sunday = safe_json_parse(raw.get("sunday"), {}) or {}
    special_shifts = safe_json_parse(raw.get("specialShifts"), []) or []
    staffing = load_staffing_config(raw.get("staffingConfig"))
    trimming = safe_json_parse(raw.get("trimming"), {}) or {}
    
    return ShopConfig(
        id=raw["id"],
        name=raw["name"],
        company=raw.get("company", ""),
        open_time=raw.get("openTime", "06:30"),
        close_time=raw.get("closeTime", "21:30"),
        is_active=bool(raw.get("isActive", 1)),
        can_be_solo=False if raw["name"] in BIG_STAFF_SHOPS else bool(raw.get("canBeSolo", False)),
        min_staff_at_close=raw.get("minStaffAtClose", 1),
        sunday=sunday,
        special_shifts=special_shifts,
        staffing_config=staffing,
        trim_enabled=trimming.get("enabled", True),
        trim_am=trimming.get("trimAM", True),
        trim_pm=trimming.get("trimPM", False),
        trim_from_start=trimming.get("trimFromStart", 1),
        trim_from_end=trimming.get("trimFromEnd", 2),
        trim_when_more_than=trimming.get("trimWhenMoreThan", 2)
    )

# ────────────────────────────────────────────────────────────────────────────
# BUILDERS
# ────────────────────────────────────────────────────────────────────────────
def build_templates_from_config(shop_configs) -> List[ShiftTemplate]:
    templates = []
    
    # Handle both dict and list input
    if isinstance(shop_configs, list):
        configs = shop_configs
    else:
        configs = shop_configs.values()
    
    for cfg in configs:
        # If cfg is a dict (raw data), convert it
        if isinstance(cfg, dict):
            cfg = load_shop_config(cfg)
        
        if not cfg.is_active:
            continue
        
        staffing = cfg.staffing_config
        sunday_closed = cfg.sunday.get("closed", False) if isinstance(cfg.sunday, dict) else False
        
        for day_idx in range(7):
            # Skip Sunday if closed
            if day_idx == 6 and sunday_closed:
                continue

            # Get times for this day
            sunday_dict = cfg.sunday if isinstance(cfg.sunday, dict) else {}
            if day_idx == 6 and sunday_dict.get("customHours", {}).get("enabled", False):
                custom = sunday_dict["customHours"]
                day_open = custom.get("openTime", cfg.open_time)
                day_close = custom.get("closeTime", cfg.close_time)
                print(f"    [DEBUG] {cfg.name} Sunday customHours: {day_open} - {day_close}")
            else:
                day_open = cfg.open_time
                day_close = cfg.close_time
            
            open_mins = parse_time(day_open)
            close_mins = parse_time(day_close)
            day_length = close_mins - open_mins
            midpoint = (open_mins + close_mins) // 2
            
            # For short days (6 hours or less), only create FULL template
            if day_length <= 360:  # 6 hours = 360 minutes
                full_hours = calculate_hours(day_open, day_close)
                templates.append(ShiftTemplate(
                    id=f"{cfg.id}_{day_idx}_FULL",
                    shop_id=cfg.id,
                    shop_name=cfg.name,
                    day_index=day_idx,
                    shift_type="FULL",
                    start_time=day_open,
                    end_time=day_close,
                    hours=full_hours,
                    is_mandatory=False
                ))
                print(f"    {cfg.name} {DAY_NAME_MAP[day_idx]}: FULL only ({day_open}-{day_close}, {full_hours}h)")
                continue  # Skip AM/PM creation for short days
            
            am_start = day_open
            am_end = format_time(midpoint)
            pm_start = format_time(midpoint)
            pm_end = day_close
            
            am_hours = calculate_hours(am_start, am_end)
            pm_hours = calculate_hours(pm_start, pm_end)
            full_hours = calculate_hours(am_start, pm_end)

            # Get day config from staffing
            day_config = None
            if staffing and staffing.weekly_schedule:
                day_name = DAY_NAME_MAP.get(day_idx, "")
                for d in staffing.weekly_schedule:
                    if d.get("day", "")[:3].lower() == day_name.lower()[:3]:
                        day_config = d
                        break
            
            is_mandatory = day_config.get("isMandatory", False) if day_config else False
            
            is_solo = cfg.can_be_solo and cfg.name not in BIG_STAFF_SHOPS
            
            # Solo shops: FULL, AM, PM templates
            if is_solo:
                templates.append(ShiftTemplate(
                    id=f"{cfg.id}_{day_idx}_FULL",
                    shop_id=cfg.id,
                    shop_name=cfg.name,
                    day_index=day_idx,
                    shift_type="FULL",
                    start_time=am_start,
                    end_time=pm_end,
                    hours=full_hours,
                    is_mandatory=is_mandatory
                ))
                templates.append(ShiftTemplate(
                    id=f"{cfg.id}_{day_idx}_AM",
                    shop_id=cfg.id,
                    shop_name=cfg.name,
                    day_index=day_idx,
                    shift_type="AM",
                    start_time=am_start,
                    end_time=am_end,
                    hours=am_hours,
                    is_mandatory=is_mandatory
                ))
                templates.append(ShiftTemplate(
                    id=f"{cfg.id}_{day_idx}_PM",
                    shop_id=cfg.id,
                    shop_name=cfg.name,
                    day_index=day_idx,
                    shift_type="PM",
                    start_time=pm_start,
                    end_time=pm_end,
                    hours=pm_hours,
                    is_mandatory=is_mandatory
                ))
            else:
                # Non-solo: AM, PM, FULL
                templates.append(ShiftTemplate(
                    id=f"{cfg.id}_{day_idx}_AM",
                    shop_id=cfg.id,
                    shop_name=cfg.name,
                    day_index=day_idx,
                    shift_type="AM",
                    start_time=am_start,
                    end_time=am_end,
                    hours=am_hours,
                    is_mandatory=is_mandatory
                ))
                templates.append(ShiftTemplate(
                    id=f"{cfg.id}_{day_idx}_PM",
                    shop_id=cfg.id,
                    shop_name=cfg.name,
                    day_index=day_idx,
                    shift_type="PM",
                    start_time=pm_start,
                    end_time=pm_end,
                    hours=pm_hours,
                    is_mandatory=is_mandatory
                ))
                templates.append(ShiftTemplate(
                    id=f"{cfg.id}_{day_idx}_FULL",
                    shop_id=cfg.id,
                    shop_name=cfg.name,
                    day_index=day_idx,
                    shift_type="FULL",
                    start_time=am_start,
                    end_time=pm_end,
                    hours=full_hours,
                    is_mandatory=is_mandatory
                ))
    
    return templates, []  # (templates, special_demands)


def build_demands_from_config(shop_configs) -> List[DemandEntry]:
    demands = []
    
    # Handle both dict and list input
    if isinstance(shop_configs, list):
        configs = shop_configs
    else:
        configs = shop_configs.values()
    
    for cfg in configs:
        # If cfg is a dict (raw data), convert it
        if isinstance(cfg, dict):
            cfg = load_shop_config(cfg)
        
        if not cfg.is_active:
            continue
        
        staffing = cfg.staffing_config
        sunday_dict = cfg.sunday if isinstance(cfg.sunday, dict) else {}
        sunday_closed = sunday_dict.get("closed", False)
        sunday_max = sunday_dict.get("maxStaff") or 4
        
        for day_idx in range(7):
            if day_idx == 6 and sunday_closed:
                continue
            
            is_solo = cfg.can_be_solo and cfg.name not in BIG_STAFF_SHOPS
            
            # ──────────────────────────────────────────────────────────
            # SPECIAL CASE: Fgura/Carters Sunday - 2 FULL shifts only
            # ──────────────────────────────────────────────────────────
            if day_idx == 6 and cfg.name in ('Fgura', 'Carters'):
                demands.append(DemandEntry(
                    shop_id=cfg.id,
                    shop_name=cfg.name,
                    day_index=6,
                    min_am=0,
                    min_pm=0,
                    target_am=0,
                    target_pm=0,
                    is_mandatory=True,
                    is_solo=False,
                    max_staff=2
                ))
                print(f"    {cfg.name} Sun: 2 FULL shifts demand (08:00-13:00)")
                continue  # Skip normal demand creation
            
            # Defaults
            min_am, min_pm = 1, 1
            target_am, target_pm = 2, 2
            max_staff = 10
            is_mandatory = False
            
            # Get from staffing config
            if staffing and staffing.weekly_schedule:
                day_name = DAY_NAME_MAP.get(day_idx, "")
                for d in staffing.weekly_schedule:
                    if d.get("day", "")[:3].lower() == day_name.lower()[:3]:
                        min_am = d.get("minAM", 1)
                        min_pm = d.get("minPM", 1)
                        target_am = d.get("targetAM", min_am)
                        target_pm = d.get("targetPM", min_pm)
                        max_staff = d.get("maxStaff", 10)
                        is_mandatory = d.get("isMandatory", False)
                        break
            
            # Sunday override for max staff
            if day_idx == 6:
                max_staff = min(max_staff or 10, sunday_max or 4)
            
            # Hamrun Sunday: 2 AM + 2 PM
            if day_idx == 6 and cfg.name == 'Hamrun':
                min_am = 2
                min_pm = 2
                target_am = 2
                target_pm = 2
                max_staff = 4
            
            if is_solo:
                min_am, min_pm = 1, 1
                target_am, target_pm = 1, 1
                max_staff = 2
            
            demands.append(DemandEntry(
                shop_id=cfg.id,
                shop_name=cfg.name,
                day_index=day_idx,
                min_am=min_am,
                min_pm=min_pm,
                target_am=target_am,
                target_pm=target_pm,
                is_mandatory=is_mandatory,
                is_solo=is_solo,
                max_staff=max_staff
            ))
    
    return demands


# ────────────────────────────────────────────────────────────────────────────
# TRIMMING & BALANCING
# ────────────────────────────────────────────────────────────────────────────
def apply_trimming(shifts: List[Dict], employee_hours: Dict[int, float], 
                   _shop_configs) -> Tuple[List[Dict], Dict[int, float]]:
    """Skip old trimming - balance_and_extend_hours handles everything"""
    print("\n[TRIMMING PASS]")
    print("  Skipping - balance_and_extend_hours will handle adjustments")
    return shifts, employee_hours


def balance_and_extend_hours(shifts: List[Dict], employee_hours: Dict[int, float],
                              employees: List, shop_configs) -> Tuple[List[Dict], Dict[int, float]]:
    """
    Post-solve balancing:
    1. Hamrun: Apply specific trimming rules (ALWAYS 2+ coverage!)
    2. CMZ: Extend under-hours employees
    """
    from collections import defaultdict
    from datetime import datetime
    
    print("\n[BALANCING HOURS]")
    
    # Build employee info
    emp_map = {}
    emp_targets = {}
    for e in employees:
        emp_map[e.id] = e
        if e.weekly_hours and e.weekly_hours > 0:
            emp_targets[e.id] = e.weekly_hours
        elif e.employment_type.lower() in ('student',):
            emp_targets[e.id] = 20
        elif e.employment_type.lower() in ('part-time', 'parttime'):
            emp_targets[e.id] = 30
        else:
            emp_targets[e.id] = 40
    
    # Group shifts
    shifts_by_shop_day = defaultdict(list)
    for i, s in enumerate(shifts):
        key = (s["shopName"], s["date"])
        shifts_by_shop_day[key].append(i)
    
    shifts_by_emp = defaultdict(list)
    for i, s in enumerate(shifts):
        shifts_by_emp[s["employeeId"]].append(i)
    
    changes_made = 0
    
    # ─────────────────────────────────────────────────────────────────
    # STEP 1: HAMRUN - Apply trimming rules (ALWAYS 2+ until PM!)
    # ─────────────────────────────────────────────────────────────────
    print("\n  [Step 1: Hamrun trimming - ALWAYS 2+ coverage until PM]")
    
    for (shop_name, date), indices in shifts_by_shop_day.items():
        if shop_name != "Hamrun":
            continue
        
        shift_date = datetime.strptime(date, "%Y-%m-%d")
        if shift_date.weekday() == 6:  # Skip Sunday
            continue
        
        am_shifts = [i for i in indices if shifts[i]["shiftType"] == "AM"]
        am_count = len(am_shifts)
        
        if am_count < 3:
            continue
        
        # Sort by overtime (most OT first)
        overtime_sorted = sorted(am_shifts, 
                                key=lambda i: -employee_hours.get(shifts[i]["employeeId"], 0))
        
        if am_count >= 4:
            # 4+ AM staff: 
            # 2 people (most OT): 06:30-12:00 (5.5h)
            # 2 people (least OT): 08:30-14:00 (5.5h) - cover until PM
            print(f"    {date}: {am_count} AM staff - applying 4-staff rule")
            
            for idx in overtime_sorted[:2]:
                s = shifts[idx]
                old_hours = s["hours"]
                s["startTime"] = "06:30"
                s["endTime"] = "12:00"
                s["hours"] = 5.5
                s["isTrimmed"] = True
                hour_diff = old_hours - 5.5
                employee_hours[s["employeeId"]] -= hour_diff
                changes_made += 1
                print(f"      {s['employeeName']}: -> 06:30-12:00 (5.5h)")
            
            for idx in overtime_sorted[2:4]:
                s = shifts[idx]
                old_hours = s["hours"]
                s["startTime"] = "08:30"
                s["endTime"] = "14:00"
                s["hours"] = 5.5
                s["isTrimmed"] = True
                hour_diff = old_hours - 5.5
                employee_hours[s["employeeId"]] -= hour_diff
                changes_made += 1
                print(f"      {s['employeeName']}: -> 08:30-14:00 (5.5h)")
        
        elif am_count == 3:
            # 3 AM staff - MUST keep 2 people until PM!
            # Person 1 (least OT): stays full 06:30-14:00 (ANCHOR 1)
            # Person 2 (mid OT): stays full 06:30-14:00 (ANCHOR 2)
            # Person 3 (most OT): 08:30-12:30 (4h) - only this one trimmed
            print(f"    {date}: 3 AM staff - trimming only 1 person (keeping 2 until PM)")
            
            # Sort by OT ascending (least first = anchors)
            least_ot_first = sorted(am_shifts, 
                                   key=lambda i: employee_hours.get(shifts[i]["employeeId"], 0))
            
            # Person 1 & 2 (least OT) stay full - ANCHORS
            for idx in least_ot_first[:2]:
                s = shifts[idx]
                print(f"      {s['employeeName']}: ANCHOR stays {s['startTime']}-{s['endTime']} ({s['hours']}h)")
            
            # Person 3 (most OT): 08:30-12:30 (4h)
            idx3 = least_ot_first[2]
            s3 = shifts[idx3]
            old_hours3 = s3["hours"]
            s3["startTime"] = "08:30"
            s3["endTime"] = "12:30"
            s3["hours"] = 4.0
            s3["isTrimmed"] = True
            hour_diff3 = old_hours3 - 4.0
            employee_hours[s3["employeeId"]] -= hour_diff3
            changes_made += 1
            print(f"      {s3['employeeName']}: -> 08:30-12:30 (4h) [TRIMMED]")
    
    # ─────────────────────────────────────────────────────────────────
    # STEP 2: CMZ - Extend under-hours (rounded)
    # ─────────────────────────────────────────────────────────────────
    print("\n  [Step 2: CMZ - Extending under-hours]")
    
    for emp_id, indices in shifts_by_emp.items():
        emp = emp_map.get(emp_id)
        if not emp:
            continue
        
        target = emp_targets.get(emp_id, 40)
        current = employee_hours.get(emp_id, 0)
        needed = target - current
        
        if needed < 1:
            continue
        
        emp_shops = set(shifts[i]["shopName"] for i in indices)
        if not emp_shops.intersection({"Fgura", "Carters"}):
            continue
        
        print(f"    {emp.name}: needs +{needed:.0f}h")
        needed = round(needed)
        
        extendable = [i for i in indices 
                     if datetime.strptime(shifts[i]["date"], "%Y-%m-%d").weekday() != 6]
        
        if not extendable:
            continue
        
        hours_per_shift = max(1, needed // len(extendable))
        
        for idx in extendable:
            if needed <= 0:
                break
            
            s = shifts[idx]
            current_hours = s["hours"]
            can_add = min(hours_per_shift, needed, 8 - current_hours)
            can_add = round(can_add)
            
            if can_add >= 1:
                if s["shiftType"] == "AM":
                    end_mins = parse_time(s["endTime"])
                    s["endTime"] = format_time(end_mins + (can_add * 60))
                else:
                    start_mins = parse_time(s["startTime"])
                    s["startTime"] = format_time(max(360, start_mins - (can_add * 60)))
                
                s["hours"] = current_hours + can_add
                employee_hours[emp_id] += can_add
                needed -= can_add
                changes_made += 1
                print(f"      {s['date']}: +{can_add}h")
    
    print(f"\n  [Summary] Changes made: {changes_made}")
    
    return shifts, employee_hours


# ────────────────────────────────────────────────────────────────────────────
# SOLVER
# ────────────────────────────────────────────────────────────────────────────
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
        previous_week_sunday_shifts: Dict[int, bool],
        shop_rules: Dict[int, Dict],
        special_demands: List[SpecialShiftDemand],
        shop_configs: Dict[int, ShopConfig]
    ):
        self.employees = [e for e in employees if e.name not in EXCLUDED_EMPLOYEES and e.is_active]
        self.templates = templates
        self.demands = demands
        self.assignments = assignments
        self.leave = leave_requests
        self.week_start = datetime.strptime(week_start, "%Y-%m-%d")
        self.fixed_days_off = fixed_days_off
        self.prev_sunday = previous_week_sunday_shifts
        self.shop_rules = shop_rules
        self.special_demands = special_demands
        self.shop_configs = shop_configs
        
        self.model = cp_model.CpModel()
        self.shift_vars: Dict[Tuple[int, str], Any] = {}
        
        print(f"\n[ROSTERPRO v32.6] Pattern-Based Solver")
        print(f"Employees: {len(self.employees)} | Templates: {len(self.templates)} | Demands: {len(self.demands)}")
        print(f"Excluded: {EXCLUDED_EMPLOYEES} | Special Requests: {len(self.special_demands)}")

    def _shops_for_emp(self, emp: Employee) -> set:
        """Get shops this employee can work at."""
        assigned = {a.shop_id for a in self.assignments if a.employee_id == emp.id}
        if assigned:
            return assigned
        # Default: all shops of same company
        if isinstance(self.shop_configs, dict):
            configs = self.shop_configs.values()
        else:
            configs = self.shop_configs
        return {cfg.id for cfg in configs if cfg.company == emp.company and cfg.is_active}

    def _is_primary(self, emp_id: int, shop_id: int) -> bool:
        for a in self.assignments:
            if a.employee_id == emp_id and a.shop_id == shop_id:
                return a.is_primary
        return False

    def _build_variables(self):
        print("\n[BUILDING MODEL]")
        for e in self.employees:
            eligible_shops = self._shops_for_emp(e)

            for t in self.templates:
                if t.shop_id not in eligible_shops:
                    continue
                key = (e.id, t.id)
                self.shift_vars[key] = self.model.NewBoolVar(f"shift_{e.id}_{t.id}")
        print(f"Variables: {len(self.shift_vars)}")
        
        # Debug: check which employees can work where
        print("\n[DEBUG] Employee-Shop Eligibility:")
        for e in self.employees[:5]:  # Just first 5
            shops = self._shops_for_emp(e)
            shop_names = [self.shop_configs[sid].name for sid in shops if sid in self.shop_configs]
            print(f"  {e.name} ({e.company}): {shop_names}")

        # Debug: show assignments for Hamrun
        print("\n[DEBUG] Hamrun Assignments:")
        hamrun_id = None
        if isinstance(self.shop_configs, dict):
            for sid, cfg in self.shop_configs.items():
                if cfg.name == "Hamrun":
                    hamrun_id = sid
                    break
        else:
            for cfg in self.shop_configs:
                if cfg.name == "Hamrun":
                    hamrun_id = cfg.id
                    break
        if hamrun_id:
            for a in self.assignments:
                if a.shop_id == hamrun_id:
                    emp = next((e for e in self.employees if e.id == a.employee_id), None)
                    print(f"  {emp.name if emp else a.employee_id} - {'PRIMARY' if a.is_primary else 'SECONDARY'}")

    def _add_coverage_constraints(self):
        print("\n[COVERAGE CONSTRAINTS]")
        for d in self.demands:
            if isinstance(self.shop_configs, dict):
                cfg = self.shop_configs.get(d.shop_id)
            else:
                cfg = next((c for c in self.shop_configs if c.id == d.shop_id), None)
            
            solo_str = "SOLO" if d.is_solo else f"min {d.min_am}AM/{d.min_pm}PM"
            print(f"  {d.shop_name} {DAY_NAME_MAP.get(d.day_index, '?')}: {solo_str}, maxStaff={d.max_staff}")
            
            am = []
            pm = []
            full = []
            
            for (eid, tid), v in self.shift_vars.items():
                tt = next((x for x in self.templates if x.id == tid), None)
                if not tt or tt.shop_id != d.shop_id or tt.day_index != d.day_index:
                    continue
                if tt.shift_type == "AM":
                    am.append(v)
                elif tt.shift_type == "PM":
                    pm.append(v)
                else:
                    full.append(v)
            
            am_cov = am + full
            pm_cov = pm + full
            all_vars = am + pm + full
            
            # ──────────────────────────────────────────────────────────
            # SPECIAL: Fgura/Carters Sundays - exactly 2 FULL shifts
            # ──────────────────────────────────────────────────────────
            if d.day_index == 6 and d.shop_name in ('Fgura', 'Carters'):
                if full:
                    self.model.Add(sum(full) >= 2)
                    self.model.Add(sum(full) <= 2)
                    print(f"    -> {d.shop_name} Sun: requiring exactly 2 FULL shifts (08:00-13:00)")
                else:
                    print(f"    WARNING: {d.shop_name} Sun - no FULL variables found!")
                if all_vars:
                    self.model.Add(sum(all_vars) <= 2)
                continue  # Skip normal AM/PM logic
            
            # ──────────────────────────────────────────────────────────
            # SPECIAL: Hamrun Sundays - 2 AM + 2 PM (no FULL)
            # ──────────────────────────────────────────────────────────
            if d.day_index == 6 and d.shop_name == 'Hamrun':
                if am:
                    self.model.Add(sum(am) >= 2)
                if pm:
                    self.model.Add(sum(pm) >= 2)
                if full:
                    self.model.Add(sum(full) == 0)
                if all_vars:
                    self.model.Add(sum(all_vars) <= 4)
                continue

            if d.is_solo:
                # Solo shop: Either 1 FULL OR (1 AM + 1 PM), never mixed
                if am_cov:
                    self.model.Add(sum(am_cov) >= 1)
                if pm_cov:
                    self.model.Add(sum(pm_cov) >= 1)
                
                # If any FULL, no AM or PM allowed (exclusive)
                if full and am and pm:
                    has_full = self.model.NewBoolVar(f"has_full_{d.shop_id}_{d.day_index}")
                    self.model.Add(sum(full) >= 1).OnlyEnforceIf(has_full)
                    self.model.Add(sum(full) == 0).OnlyEnforceIf(has_full.Not())
                    self.model.Add(sum(am) == 0).OnlyEnforceIf(has_full)
                    self.model.Add(sum(pm) == 0).OnlyEnforceIf(has_full)
                
                # Max 1 FULL, max 2 total
                if full:
                    self.model.Add(sum(full) <= 1)
                if all_vars:
                    self.model.Add(sum(all_vars) <= 2)
            else:
                # Non-solo BIG SHOPS
                if d.shop_name in BIG_STAFF_SHOPS:
                    # Sunday special case: limited staff, allow FULL
                    if d.day_index == 6:  # Sunday
                        if am_cov:
                            self.model.Add(sum(am_cov) >= 1)
                        if pm_cov:
                            self.model.Add(sum(pm_cov) >= 1)
                        if full:
                            self.model.Add(sum(full) <= 2)
                    else:
                        # Mon-Sat: HARD minimum 2 AM and 2 PM
                        if am_cov:
                            self.model.Add(sum(am_cov) >= 2)
                        if pm_cov:
                            self.model.Add(sum(pm_cov) >= 2)
                        # NO full shifts Mon-Sat - force AM/PM splits
                        if full:
                            self.model.Add(sum(full) == 0)
                else:
                    if am_cov:
                        self.model.Add(sum(am_cov) >= 1)
                    if pm_cov:
                        self.model.Add(sum(pm_cov) >= 1)
                    if full:
                        self.model.Add(sum(full) <= MAX_FULLDAY_PER_SHOP)

                # MANDATORY days: enforce target coverage
                if d.is_mandatory:
                    if am_cov:
                        self.model.Add(sum(am_cov) >= d.target_am)
                    if pm_cov:
                        self.model.Add(sum(pm_cov) >= d.target_pm)
                
                # Max staff
                if all_vars:
                    self.model.Add(sum(all_vars) <= d.max_staff)

    def _add_special_constraints(self):
        print("\n[SPECIAL REQUEST CONSTRAINTS]")
        if not self.special_demands:
            print("  No special requests")
            return
        for sd in self.special_demands:
            print(f"  {sd.shop_name} day {sd.day_index}: {sd.shift_type} {sd.start_time}-{sd.end_time}")

    def _add_employee_constraints(self):
        print("\n[EMPLOYEE CONSTRAINTS]")
        
        # ──────────────────────────────────────────────────────────
        # LEAVE REQUESTS - Block shifts on leave days
        # ──────────────────────────────────────────────────────────
        leave_blocked = 0
        for lr in self.leave:
            leave_start = datetime.strptime(lr.start_date, "%Y-%m-%d")
            leave_end = datetime.strptime(lr.end_date, "%Y-%m-%d")
            
            for day_idx in range(7):
                shift_date = self.week_start + timedelta(days=day_idx)
                if leave_start <= shift_date <= leave_end:
                    # Block all shifts for this employee on this day
                    for (eid, tid), v in self.shift_vars.items():
                        if eid != lr.employee_id:
                            continue
                        t = next((x for x in self.templates if x.id == tid), None)
                        if t and t.day_index == day_idx:
                            self.model.Add(v == 0)
                            leave_blocked += 1
        
        if leave_blocked > 0:
            print(f"  Leave requests: blocked {leave_blocked} shift options")
        
        for e in self.employees:
            emp_vars = [(tid, v) for (eid, tid), v in self.shift_vars.items() if eid == e.id]
            
            # Max 1 shift per day
            for day_idx in range(7):
                day_vars = [v for tid, v in emp_vars 
                           if any(t.id == tid and t.day_index == day_idx for t in self.templates)]
                if day_vars:
                    self.model.Add(sum(day_vars) <= 1)
            
            # ──────────────────────────────────────────────────────────
            # At least 1 day off Mon-Fri (max 4 shifts Mon-Fri)
            # ──────────────────────────────────────────────────────────
            weekday_vars = []
            for day_idx in range(5):  # Mon=0 to Fri=4
                day_shifts = [v for tid, v in emp_vars 
                             if any(t.id == tid and t.day_index == day_idx for t in self.templates)]
                weekday_vars.extend(day_shifts)
            
            if weekday_vars:
                # Max 4 shifts Mon-Fri = at least 1 day off
                self.model.Add(sum(weekday_vars) <= 4)
            
            # Max 6 shifts per week (entire week)
            all_emp_vars = [v for _, v in emp_vars]
            if all_emp_vars:
                self.model.Add(sum(all_emp_vars) <= 6)
            
            # No consecutive FULL days
            for day_idx in range(6):
                full_today = [v for tid, v in emp_vars 
                             if any(t.id == tid and t.day_index == day_idx and t.shift_type == "FULL" 
                                   for t in self.templates)]
                full_tomorrow = [v for tid, v in emp_vars 
                                if any(t.id == tid and t.day_index == day_idx + 1 and t.shift_type == "FULL" 
                                      for t in self.templates)]
                if full_today and full_tomorrow:
                    self.model.Add(sum(full_today) + sum(full_tomorrow) <= 1)
            
            # Student cap: 20h
            if e.employment_type.lower() == "student":
                hour_terms = []
                for tid, v in emp_vars:
                    t = next((x for x in self.templates if x.id == tid), None)
                    if t:
                        hour_terms.append(v * int(t.hours * 10))
                if hour_terms:
                    self.model.Add(sum(hour_terms) <= 200)
        
        print("  All employees: max 4 shifts Mon-Fri (1 day off required)")

    def _build_objective(self):
        print("\n[BUILDING OBJECTIVE]")
        terms = []
        
        for e in self.employees:
            emp_vars = [(tid, v) for (eid, tid), v in self.shift_vars.items() if eid == e.id]
            
            # Get target - use weekly_hours if set, otherwise use employment type
            if e.weekly_hours and e.weekly_hours > 0:
                target = e.weekly_hours * 10
            else:
                target = get_employee_target_hours(e.employment_type) * 10
            
            # Calculate total hours for this employee
            hour_terms = []
            for tid, v in emp_vars:
                t = next((x for x in self.templates if x.id == tid), None)
                if t and t.day_index != 6:  # Exclude Sunday from weekly hours target
                    hour_terms.append(v * int(t.hours * 10))
            
            if hour_terms:
                total = self.model.NewIntVar(0, 600, f"hours_{e.id}")
                self.model.Add(total == sum(hour_terms))
                
                under = self.model.NewIntVar(0, 500, f"under_{e.id}")
                over = self.model.NewIntVar(0, 200, f"over_{e.id}")
                exc = self.model.NewIntVar(0, 100, f"exc_{e.id}")
                
                self.model.Add(under >= target - total)
                self.model.Add(over >= total - target)
                self.model.Add(exc >= total - target - OT_CAP * 10)
                
                terms.extend([
                    under * PENALTY_UNDER_HOURS,
                    over * PENALTY_OVERTIME,
                    exc * PENALTY_EXCESSIVE_OT
                ])
                
                # ──────────────────────────────────────────────────────────
                # PROGRESSIVE OT PENALTY - Spread the load!
                # The MORE overtime someone has, the HIGHER the penalty
                # This prevents piling 12h OT on one person
                # ──────────────────────────────────────────────────────────
                over_2h = self.model.NewIntVar(0, 200, f"over2_{e.id}")
                over_5h = self.model.NewIntVar(0, 200, f"over5_{e.id}")
                over_10h = self.model.NewIntVar(0, 200, f"over10_{e.id}")
                
                self.model.Add(over_2h >= total - target - 20)   # Over 2h
                self.model.Add(over_5h >= total - target - 50)   # Over 5h
                self.model.Add(over_10h >= total - target - 100) # Over 10h
                
                terms.append(over_2h * PENALTY_OT_TIER1)   # Extra penalty for 2h+ OT
                terms.append(over_5h * PENALTY_OT_TIER2)   # Extra penalty for 5h+ OT
                terms.append(over_10h * PENALTY_OT_TIER3)  # Extra penalty for 10h+ OT
        
        # FULL shift penalties
        for (eid, tid), v in self.shift_vars.items():
            t = next((x for x in self.templates if x.id == tid), None)
            if t and t.shift_type == "FULL":
                if t.shop_name in BIG_STAFF_SHOPS:
                    terms.append(v * PENALTY_FULL_SHIFT_BIG)
                else:
                    terms.append(v * PENALTY_FULL_SHIFT)

        # Penalty for unbalanced AM/PM at big shops
        PENALTY_UNBALANCED = 500
        for d in self.demands:
            if d.is_solo or d.shop_name not in BIG_STAFF_SHOPS:
                continue
            am = []
            pm = []
            for (eid, tid), v in self.shift_vars.items():
                tt = next((x for x in self.templates if x.id == tid), None)
                if not tt or tt.shop_id != d.shop_id or tt.day_index != d.day_index:
                    continue
                if tt.shift_type == "AM":
                    am.append(v)
                elif tt.shift_type == "PM":
                    pm.append(v)
            if am and pm:
                # Penalize difference between AM-only and PM-only
                am_count = self.model.NewIntVar(0, 10, f"am_cnt_{d.shop_id}_{d.day_index}")
                pm_count = self.model.NewIntVar(0, 10, f"pm_cnt_{d.shop_id}_{d.day_index}")
                self.model.Add(am_count == sum(am))
                self.model.Add(pm_count == sum(pm))
                diff_pos = self.model.NewIntVar(0, 10, f"diff_pos_{d.shop_id}_{d.day_index}")
                diff_neg = self.model.NewIntVar(0, 10, f"diff_neg_{d.shop_id}_{d.day_index}")
                self.model.Add(diff_pos >= am_count - pm_count)
                self.model.Add(diff_neg >= pm_count - am_count)
                terms.append(diff_pos * PENALTY_UNBALANCED)
                terms.append(diff_neg * PENALTY_UNBALANCED)
            
        # Penalty for PM > AM at big shops (prefer AM stronger)
        PENALTY_PM_STRONGER = 300
        for d in self.demands:
            if d.is_solo or d.shop_name not in BIG_STAFF_SHOPS:
                continue
            am = []
            pm = []
            for (eid, tid), v in self.shift_vars.items():
                tt = next((x for x in self.templates if x.id == tid), None)
                if not tt or tt.shop_id != d.shop_id or tt.day_index != d.day_index:
                    continue
                if tt.shift_type == "AM":
                    am.append(v)
                elif tt.shift_type == "PM":
                    pm.append(v)
            if am and pm:
                # Penalize when PM > AM
                pm_excess = self.model.NewIntVar(0, 10, f"pm_excess_{d.shop_id}_{d.day_index}")
                self.model.Add(pm_excess >= sum(pm) - sum(am))
                terms.append(pm_excess * PENALTY_PM_STRONGER)
        
        # Cross-shop penalty
        for e in self.employees:
            primary_shops = {a.shop_id for a in self.assignments 
                           if a.employee_id == e.id and a.is_primary}
            for (eid, tid), v in self.shift_vars.items():
                if eid != e.id:
                    continue
                t = next((x for x in self.templates if x.id == tid), None)
                if t and t.shop_id not in primary_shops:
                    terms.append(v * PENALTY_CROSS_SHOP)
        
        print(f"{len(terms)} terms")
        print("  Progressive OT penalties: 2h+/5h+/10h+ tiers active")
        if terms:
            self.model.Minimize(sum(terms))

    def solve(self, time_limit_seconds: int = 120) -> Dict:
        self._build_variables()
        self._add_coverage_constraints()
        self._add_special_constraints()
        self._add_employee_constraints()
        self._build_objective()
        
        print(f"\n[SOLVING] Time limit: {time_limit_seconds}s")
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = time_limit_seconds
        status = solver.Solve(self.model)
        
        status_name = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.MODEL_INVALID: "MODEL_INVALID",
            cp_model.UNKNOWN: "UNKNOWN"
        }.get(status, "UNKNOWN")
        
        print(f"[RESULT] {status_name}")
        
        if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
            return {"success": False, "status": status_name, "error": "Could not find feasible solution"}
        
        shifts = []
        emp_hours: Dict[int, float] = {e.id: 0 for e in self.employees}
        
        for (eid, tid), v in self.shift_vars.items():
            if solver.Value(v) == 1:
                t = next((x for x in self.templates if x.id == tid), None)
                e = next((x for x in self.employees if x.id == eid), None)
                if t and e:
                    shift_date = self.week_start + timedelta(days=t.day_index)
                    shifts.append({
                        "id": f"{eid}_{tid}",
                        "date": shift_date.strftime("%Y-%m-%d"),
                        "shopId": t.shop_id,
                        "shopName": t.shop_name,
                        "employeeId": eid,
                        "employeeName": e.name,
                        "startTime": t.start_time,
                        "endTime": t.end_time,
                        "hours": t.hours,
                        "shiftType": t.shift_type,
                        "isTrimmed": False
                    })
                    emp_hours[eid] += t.hours
        
        # Apply trimming
        shifts, emp_hours = apply_trimming(shifts, emp_hours, self.shop_configs)
        
        # Balance and extend hours
        shifts, emp_hours = balance_and_extend_hours(shifts, emp_hours, self.employees, self.shop_configs)
        
        # Print coverage summary
        print("\n[COVERAGE SUMMARY]")
        from collections import defaultdict
        by_shop_day = defaultdict(lambda: {"AM": 0, "PM": 0, "FULL": 0})
        for s in shifts:
            by_shop_day[(s["shopName"], s["date"])][s["shiftType"]] += 1
        for (shop, date), counts in sorted(by_shop_day.items()):
            print(f"  {shop} {date}: AM={counts['AM']}, PM={counts['PM']}, FULL={counts['FULL']}")
        
        # Print employee hours
        print("\n[EMPLOYEE HOURS]")
        total_ot = 0
        for e in self.employees:
            hours = emp_hours.get(e.id, 0)
            # Use weekly_hours if set
            if e.weekly_hours and e.weekly_hours > 0:
                target = e.weekly_hours
            else:
                target = get_employee_target_hours(e.employment_type)
            ot = max(0, hours - target)
            total_ot += ot
            ot_str = f" [+{ot:.1f}h OT]" if ot > 0 else ""
            print(f"  {e.name}: {hours:.1f}h/{target}h{ot_str}")
        print(f"\n[OVERTIME TOTAL] {total_ot:.1f}h")
        print(f"[SHIFTS GENERATED] {len(shifts)}")
        
        return {
            "success": True,
            "status": status_name,
            "shifts": shifts,
            "employeeHours": {str(k): v for k, v in emp_hours.items()}
        }
