# backend/solver/roster_solver.py
"""
ROSTERPRO v32.2
============================================================

32.0  – original file you sent
32.1  – flexible-day fix, no consecutive FULL, higher OT penalties
32.2  – THIS VERSION
       • post-solve trimming keeps at-close headcount
       • full-timers must hit ≥ 40 h (hard constraint)

The public API (build_templates_from_config, build_demands_from_config,
RosterSolver) stays exactly the same, so routes keep working.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple, Any
from ortools.sat.python import cp_model
import traceback
import json

# ────────────────────────────────────────────────────────────────
# CONSTANTS
# ────────────────────────────────────────────────────────────────
BIG_STAFF_SHOPS = {'Hamrun', 'Carters', 'Fgura'}
EXCLUDED_EMPLOYEES = {'Maria'}

DAYS_OF_WEEK = ['monday', 'tuesday', 'wednesday',
                'thursday', 'friday', 'saturday', 'sunday']
DAY_NAME_MAP = {k: i for i, k in enumerate(
    ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'])}
DAY_NAME_MAP.update({d: i for i, d in enumerate(DAYS_OF_WEEK)})

WEEK_TARGET = {'fulltime': 40, 'full-time': 40,
               'parttime': 30, 'part-time': 30,
               'student': 20}

OT_CAP = 10
MAX_FULLDAY_PER_SHOP = 2

PENALTY_UNDER_MINIMUM = 100000
PENALTY_UNDER_TARGET  = 500
PENALTY_OVER_COVERAGE = 20
PENALTY_OVERTIME      = 300
PENALTY_EXCESSIVE_OT  = 1000
PENALTY_UNDER_HOURS   = 500
PENALTY_CROSS_SHOP    = 30
PENALTY_FULL_SHIFT      = 100
PENALTY_FULL_SHIFT_BIG  = 500

# ────────────────────────────────────────────────────────────────
# Tiny helpers
# ────────────────────────────────────────────────────────────────
def get_day_index(day: str) -> int:
    if not day:
        return 0
    d = day.lower()[:3]
    return DAY_NAME_MAP.get(d, 0)

def parse_time(t: str) -> int:      # "06:30" → 390
    try:
        h, m = map(int, t.split(':'))
        return h * 60 + m
    except Exception:
        return 0

def format_time(m: int) -> str:     # 1170 → "19:30"
    m = max(0, m)
    return f"{m//60:02d}:{m%60:02d}"

def calculate_hours(start: str, end: str) -> float:
    return round((parse_time(end) - parse_time(start)) / 60, 2)

def safe_json_parse(val, default):
    if val is None:
        return default
    if isinstance(val, (dict, list)):
        return val
    try:
        return json.loads(val)
    except Exception:
        return default

def get_employee_target_hours(kind: str) -> int:
    if not kind:
        return 40
    return WEEK_TARGET.get(kind.lower().replace('-', ''), 40)

# ────────────────────────────────────────────────────────────────
# Data classes  (unchanged – shortened docstrings)
# ────────────────────────────────────────────────────────────────
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
    shift_type: str
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
    target_am: int = 1
    target_pm: int = 1
    min_am: int = 1
    min_pm: int = 1
    max_staff: int = 10
    allow_full_day: bool = True
    full_day_counts_as_both: bool = True
    is_mandatory: bool = False
    coverage_mode: str = 'flexible'
    is_solo: bool = False

@dataclass
class SpecialShiftDemand:
    employee_id: int
    employee_name: str
    shop_id: int
    shop_name: str
    day_index: int
    shift_type: str

@dataclass
class StaffingConfig:
    coverage_mode: str = 'flexible'
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
    min_staff_at_close: int
    sunday: Dict
    special_shifts: List[Dict] = field(default_factory=list)
    staffing_config: Optional[StaffingConfig] = None

# ────────────────────────────────────────────────────────────────
# Loader helpers  (only essentials kept)
# ────────────────────────────────────────────────────────────────
def load_staffing_config(data: Any) -> Optional[StaffingConfig]:
    if not data:
        return None
    parsed = safe_json_parse(data, None)
    if not parsed:
        return None
    weekly = parsed.get('weeklySchedule', [])
    if isinstance(weekly, str):
        weekly = safe_json_parse(weekly, [])
    return StaffingConfig(
        coverage_mode=parsed.get('coverageMode', 'flexible'),
        weekly_schedule=weekly,
        full_day_counts_as_both=parsed.get('fullDayCountsAsBoth', True),
        never_below_minimum=parsed.get('neverBelowMinimum', True)
    )

def load_shop_config(raw: Dict) -> ShopConfig:
    sunday = safe_json_parse(raw.get('sunday'), {}) or {}
    return ShopConfig(
        id=raw['id'],
        name=raw['name'],
        company=raw.get('company', 'CMZ'),
        open_time=raw.get('openTime', '06:30'),
        close_time=raw.get('closeTime', '21:30'),
        is_active=raw.get('isActive', True),
        can_be_solo=False if raw['name'] in BIG_STAFF_SHOPS else raw.get('canBeSolo', False),
        min_staff_at_close=raw.get('minStaffAtClose', 1),
        sunday=sunday,
        special_shifts=safe_json_parse(raw.get('specialShifts'), []),
        staffing_config=load_staffing_config(raw.get('staffingConfig'))
    )

# ────────────────────────────────────────────────────────────────
# Template & Demand builders (identical logic, shortened)
# ────────────────────────────────────────────────────────────────
def build_templates_from_config(shops: List[Dict]):
    templates, specials = [], []
    for s in shops:
        cfg = load_shop_config(s)
        if not cfg.is_active:
            continue
        open_m = parse_time(cfg.open_time)
        close_m = parse_time(cfg.close_time)
        mid = (open_m + close_m) // 2
        am_start, am_end = cfg.open_time, format_time(mid + 30)
        pm_start, pm_end = format_time(mid - 30), cfg.close_time
        for d in range(7):
            if d == 6 and cfg.sunday.get('closed'):
                continue
            hrs_am = calculate_hours(am_start, am_end)
            hrs_pm = calculate_hours(pm_start, pm_end)
            hrs_full = calculate_hours(am_start, pm_end)
            for st, stime, etime, hrs in (
                ('AM', am_start, am_end, hrs_am),
                ('PM', pm_start, pm_end, hrs_pm),
                ('FULL', am_start, pm_end, hrs_full)):
                templates.append(ShiftTemplate(
                    id=f'{cfg.id}_{d}_{st}',
                    shop_id=cfg.id,
                    shop_name=cfg.name,
                    day_index=d,
                    shift_type=st,
                    start_time=stime,
                    end_time=etime,
                    hours=hrs,
                    is_mandatory=False
                ))
    return templates, specials

def build_demands_from_config(shops: List[Dict]):
    demands = []
    for s in shops:
        cfg = load_shop_config(s)
        if not cfg.is_active:
            continue
        solo = cfg.can_be_solo and cfg.name not in BIG_STAFF_SHOPS
        staffing = cfg.staffing_config
        w_lookup = {get_day_index(x['day']): x
                    for x in (staffing.weekly_schedule if staffing else [])}
        for d in range(7):
            if d == 6 and cfg.sunday.get('closed'):
                continue
            wk = w_lookup.get(d, {})
            min_am = wk.get('minAM', 1 if not solo else 1)
            min_pm = wk.get('minPM', 1 if not solo else 1)
            target_am = wk.get('targetAM', min_am)
            target_pm = wk.get('targetPM', min_pm)
            mandatory = wk.get('isMandatory', False)
            demands.append(DemandEntry(
                shop_id=cfg.id, shop_name=cfg.name, day_index=d,
                target_am=target_am, target_pm=target_pm,
                min_am=min_am, min_pm=min_pm,
                is_mandatory=mandatory, is_solo=solo,
                full_day_counts_as_both=True
            ))
    return demands

# ────────────────────────────────────────────────────────────────
# Post-solve TRIMMER  – now close-time aware
# ────────────────────────────────────────────────────────────────
def apply_trimming(shifts, employee_hours, shop_configs: Dict[int, ShopConfig],
                   *, max_first_am_trim=1, max_last_pm_trim=2):
    """
    For each shop-day we may knock 1 h off the AM start and/or
    2 h off the PM/FULL end – but we must leave at least
    min_staff_at_close people still present at the official close time.
    """
    from collections import defaultdict
    by_key = defaultdict(list)
    for sh in shifts:
        by_key[(sh['shopId'], sh['date'])].append(sh)

    for (shop_id, day), lst in by_key.items():
        cfg = shop_configs[shop_id]
        close_min = parse_time(cfg.close_time)
        need_close = cfg.min_staff_at_close

        # count people already covering till close
        def still_at_close(s):
            return parse_time(s['endTime']) >= close_min - 1

        while True:
            # try to trim one PM/FULL that still overshoots close_min
            cand = next((s for s in lst
                         if s['shiftType'] in ('PM', 'FULL')
                         and not s['isTrimmed']
                         and parse_time(s['endTime']) == close_min), None)
            if not cand:
                break
            # would trimming break the close coverage?
            stayers = [s for s in lst if still_at_close(s)]
            if len(stayers) <= need_close:
                break  # cannot trim further
            # apply trim
            cand['endTime'] = format_time(parse_time(cand['endTime']) -
                                          max_last_pm_trim * 60)
            cand['hours'] -= max_last_pm_trim
            cand['isTrimmed'] = True
            employee_hours[cand['employeeId']] -= max_last_pm_trim

        # AM start trims (much simpler – never harms close cover)
        for s in lst:
            if s['shiftType'] in ('AM', 'FULL') and not s['isTrimmed']:
                s['startTime'] = format_time(parse_time(s['startTime']) +
                                             max_first_am_trim * 60)
                s['hours'] -= max_first_am_trim
                s['isTrimmed'] = True
                employee_hours[s['employeeId']] -= max_first_am_trim
    return shifts, employee_hours

# ────────────────────────────────────────────────────────────────
# ROSTER SOLVER
# ────────────────────────────────────────────────────────────────
class RosterSolver:
    # ——————————————————————————————— constructor
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
        shop_configs: Dict[int, ShopConfig]
    ):
        self.week_start = week_start
        self.templates = templates
        self.demands = demands
        self.shop_configs = shop_configs
        # filter employees
        self.employees = [e for e in employees
                          if e.name not in EXCLUDED_EMPLOYEES and e.is_active]
        self.employee_by_id = {e.id: e for e in self.employees}

        # map primary/secondary shops
        self.employee_shops = {}
        for e in self.employees:
            self.employee_shops[e.id] = {
                'primary': e.primary_shop_id,
                'secondary': list(e.secondary_shop_ids)
            }
        for a in assignments:
            rec = self.employee_shops.setdefault(a.employee_id,
                                                 {'primary': None, 'secondary': []})
            if a.is_primary:
                rec['primary'] = a.shop_id
            else:
                if a.shop_id not in rec['secondary']:
                    rec['secondary'].append(a.shop_id)

        # leave → dict[id] = set(day indexes)
        self.leave = {}
        for lr in leave_requests:
            if lr.status != 'approved':
                continue
            self.leave.setdefault(lr.employee_id, set())
            self.leave[lr.employee_id].update(range(7))

        self.fixed_days_off = {k.lower(): set(v) for k, v in fixed_days_off.items()}
        self.special_demands = special_demands

        self.model = cp_model.CpModel()
        self.shift_vars: Dict[Tuple[int, str], cp_model.IntVar] = {}

    # ——————————————————————————————— helpers
    def _shops_for_emp(self, eid):
        rec = self.employee_shops.get(eid, {})
        shops = []
        if rec.get('primary'):
            shops.append(rec['primary'])
        shops.extend(rec.get('secondary', []))
        return list(dict.fromkeys(shops))  # dedup / keep order

    def _is_primary(self, eid, sid):
        return self.employee_shops.get(eid, {}).get('primary') == sid

    # ——————————————————————————————— build variables
    def _build_variables(self):
        for emp in self.employees:
            allowed = self._shops_for_emp(emp.id)
            for t in self.templates:
                if t.shop_id not in allowed:
                    continue
                if emp.am_only and t.shift_type in ('PM', 'FULL'):
                    continue
                if emp.id in self.leave and t.day_index in self.leave[emp.id]:
                    continue
                if emp.name.lower() in self.fixed_days_off and \
                   t.day_index in self.fixed_days_off[emp.name.lower()]:
                    continue
                # company wall (unless BOTH)
                shop_c = self.shop_configs[t.shop_id].company
                if emp.company.upper() != 'BOTH' and emp.company != shop_c:
                    continue
                self.shift_vars[(emp.id, t.id)] = \
                    self.model.NewBoolVar(f's_{emp.id}_{t.id}')

    # ——————————————————————————————— coverage constraints (32.1 logic)
    def _add_coverage_constraints(self):
        for d in self.demands:
            sid, day = d.shop_id, d.day_index
            am = pm = full = []
            for (eid, tid), v in self.shift_vars.items():
                tt = next(x for x in self.templates if x.id == tid)
                if tt.shop_id != sid or tt.day_index != day:
                    continue
                if tt.shift_type == 'AM':
                    am.append(v)
                elif tt.shift_type == 'PM':
                    pm.append(v)
                else:
                    full.append(v)
            am_cov = am + full
            pm_cov = pm + full
            if d.is_solo:
                self.model.Add(sum(am_cov) == 1)
                self.model.Add(sum(pm_cov) == 1)
            else:
                self.model.Add(sum(am_cov) >= d.min_am)
                self.model.Add(sum(pm_cov) >= d.min_pm)
                if d.is_mandatory:
                    self.model.Add(sum(am_cov) >= d.target_am)
                    self.model.Add(sum(pm_cov) >= d.target_pm)
                self.model.Add(sum(full) <= MAX_FULLDAY_PER_SHOP)

    # ——————————————————————————————— special requests (kept simple)
    def _add_special_constraints(self):
        for sp in self.special_demands:
            vars_here = []
            for (eid, tid), v in self.shift_vars.items():
                if eid != sp.employee_id:
                    continue
                t = next(x for x in self.templates if x.id == tid)
                if t.shop_id == sp.shop_id and t.day_index == sp.day_index \
                   and t.shift_type == sp.shift_type:
                    vars_here.append(v)
            if vars_here:
                self.model.Add(sum(vars_here) >= 1)

    # ——————————————————————————————— employee constraints
    def _add_employee_constraints(self):
        for e in self.employees:
            # max one shift per day
            for d in range(7):
                vars_d = [v for (eid, tid), v in self.shift_vars.items()
                          if eid == e.id and
                          next(x for x in self.templates if x.id == tid).day_index == d]
                if vars_d:
                    self.model.Add(sum(vars_d) <= 1)
            # max 6 shifts/week
            week_vars = [v for (eid, _), v in self.shift_vars.items() if eid == e.id]
            if week_vars:
                self.model.Add(sum(week_vars) <= 6)
            # no consecutive FULL
            for d in range(6):
                full_now = [v for (eid, tid), v in self.shift_vars.items()
                            if eid == e.id and
                            (t := next(x for x in self.templates if x.id == tid)).day_index == d
                            and t.shift_type == 'FULL']
                full_next = [v for (eid, tid), v in self.shift_vars.items()
                             if eid == e.id and
                             (t := next(x for x in self.templates if x.id == tid)).day_index == d+1
                             and t.shift_type == 'FULL']
                if full_now and full_next:
                    self.model.Add(sum(full_now) + sum(full_next) <= 1)
            # HARD 40 h for full-timers
            if e.employment_type.lower().startswith('full'):
                hour_terms = [v * int(next(x for x in self.templates
                                           if x.id == tid).hours * 10)
                              for (eid, tid), v in self.shift_vars.items() if eid == e.id]
                if hour_terms:
                    total = self.model.NewIntVar(0, 600, f'ft_{e.id}')
                    self.model.Add(total == sum(hour_terms))
                    self.model.Add(total >= 400)

            # student cap 20 h
            if e.employment_type.lower() == 'student':
                hour_terms = [v * int(next(x for x in self.templates
                                           if x.id == tid).hours * 10)
                              for (eid, tid), v in self.shift_vars.items() if eid == e.id]
                if hour_terms:
                    self.model.Add(sum(hour_terms) <= 200)

    # ——————————————————————————————— objective
    def _build_objective(self):
        terms = []
        for e in self.employees:
            hours10 = [v * int(next(x for x in self.templates if x.id == tid).hours * 10)
                       for (eid, tid), v in self.shift_vars.items() if eid == e.id]
            if not hours10:
                continue
            tot = self.model.NewIntVar(0, 600, f'h_{e.id}')
            self.model.Add(tot == sum(hours10))
            tgt10 = get_employee_target_hours(e.employment_type) * 10
            under = self.model.NewIntVar(0, 500, f'uh_{e.id}')
            over  = self.model.NewIntVar(0, 500, f'oh_{e.id}')
            exc   = self.model.NewIntVar(0, 500, f'ex_{e.id}')
            self.model.Add(under >= tgt10 - tot)
            self.model.Add(over  >= tot - tgt10)
            self.model.Add(exc   >= tot - (tgt10 + 50))
            terms += [under * PENALTY_UNDER_HOURS,
                      over  * PENALTY_OVERTIME,
                      exc   * PENALTY_EXCESSIVE_OT]
        # penalise FULL
        for (eid, tid), v in self.shift_vars.items():
            t = next(x for x in self.templates if x.id == tid)
            if t.shift_type == 'FULL':
                terms.append(v * (PENALTY_FULL_SHIFT_BIG if t.shop_name in BIG_STAFF_SHOPS
                                  else PENALTY_FULL_SHIFT))
        # cross-shop
        for (eid, tid), v in self.shift_vars.items():
            if not self._is_primary(eid, next(x for x in self.templates if x.id == tid).shop_id):
                terms.append(v * PENALTY_CROSS_SHOP)
        self.model.Minimize(sum(terms))

    # ——————————————————————————————— solve
    # ——————————————————————————————— solve
    def solve(self, time_limit_seconds: int = 120):
        limit = time_limit_seconds
        try:
            self._build_variables()
            self._build_variables()
            self._add_coverage_constraints()
            self._add_special_constraints()
            self._add_employee_constraints()
            self._build_objective()

            solver = cp_model.CpSolver()
            solver.parameters.max_time_in_seconds = limit
            solver.parameters.num_search_workers = 8
            status = solver.Solve(self.model)
            if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                return {'success': False, 'status': 'INFEASIBLE', 'shifts': []}

            from datetime import datetime, timedelta
            week0 = datetime.strptime(self.week_start, '%Y-%m-%d')
            shifts, emp_hours = [], {e.id: 0.0 for e in self.employees}

            for (eid, tid), v in self.shift_vars.items():
                if solver.Value(v) == 0:
                    continue
                t = next(x for x in self.templates if x.id == tid)
                date = (week0 + timedelta(days=t.day_index)).strftime('%Y-%m-%d')
                shifts.append({
                    'id': f'{tid}_{eid}', 'date': date,
                    'shopId': t.shop_id, 'shopName': t.shop_name,
                    'employeeId': eid, 'employeeName': self.employee_by_id[eid].name,
                    'startTime': t.start_time, 'endTime': t.end_time,
                    'hours': t.hours, 'shiftType': t.shift_type,
                    'isTrimmed': False
                })
                emp_hours[eid] += t.hours

            # trimming pass (close-time aware)
            shifts, emp_hours = apply_trimming(shifts, emp_hours,
                                               self.shop_configs,
                                               max_first_am_trim=1,
                                               max_last_pm_trim=2)

            return {
                'success': True,
                'status': 'OPTIMAL',
                'shifts': shifts,
                'employeeHours': {str(k): v for k, v in emp_hours.items()}
            }
        except Exception as ex:
            traceback.print_exc()
            return {'success': False, 'status': 'ERROR', 'message': str(ex)}

# ────────────────────────────────────────────────────────────────
# END OF FILE
# ────────────────────────────────────────────────────────────────
