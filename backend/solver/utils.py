# backend/solver/utils.py
"""
Utility functions for roster solver - Trimming and helpers
"""


def _time_to_minutes(hhmm):
    """Convert '06:30' to 390 minutes"""
    if not hhmm:
        return 0
    try:
        h, m = map(int, hhmm.split(':'))
        return h * 60 + m
    except:
        return 0


def _minutes_to_time(m):
    """Convert 390 minutes to '06:30'"""
    if m < 0:
        m = 0
    return f"{m // 60:02d}:{m % 60:02d}"


def apply_trimming(shifts, employee_hours, max_first_am_trim=1, max_last_pm_trim=2):
    """
    Mutates the list of shift dicts returned by solver so that:
      - the earliest AM opener per shop/day can start up to +1 h later
      - the latest PM/FULL closer can finish up to -2 h earlier
      - never leaves the shop unmanned
    
    Trimming rules:
      T1: If a shop/day has either >1 person in AM OR >=1 FULL-day employee,
          then you may trim.
      T2: At least one un-trimmed employee must still be present at open/close.
      T3: Trimming is optional; apply only when it reduces overtime.
    
    Args:
        shifts: List of shift dicts from solver
        employee_hours: Dict of employee_id -> total hours
        max_first_am_trim: Hours to trim from first AM opener (default 1)
        max_last_pm_trim: Hours to trim from last PM/FULL closer (default 2)
    
    Returns:
        Tuple of (modified shifts, modified employee_hours)
    """
    if not shifts:
        return shifts, employee_hours
    
    # Group by (shop, date)
    per_shopday = {}
    for s in shifts:
        key = (s.get('shopId'), s.get('date'))
        per_shopday.setdefault(key, []).append(s)
    
    trimmed_count = 0
    
    for (shop_id, date), day_shifts in per_shopday.items():
        # Find AM openers and PM/FULL closers
        openers = [s for s in day_shifts if s.get('shiftType', '').upper().startswith('AM')]
        closers = [s for s in day_shifts if s.get('shiftType', '').upper() in ('PM', 'FULL')]
        has_full = any(s.get('shiftType', '').upper() == 'FULL' for s in day_shifts)
        
        # Trimming trigger: >1 AM person OR >=1 FULL-day person
        should_trim = len(openers) > 1 or has_full
        
        if not should_trim:
            continue
        
        # Trim first AM opener (+1h to start) - only if >1 opener
        if len(openers) > 1:
            first_opener = min(openers, key=lambda s: _time_to_minutes(s.get('startTime', '00:00')))
            trim_minutes = int(max_first_am_trim * 60)
            old_start = _time_to_minutes(first_opener.get('startTime', '00:00'))
            new_start = old_start + trim_minutes
            first_opener['startTime'] = _minutes_to_time(new_start)
            first_opener['hours'] = round(first_opener.get('hours', 0) - max_first_am_trim, 2)
            first_opener['isTrimmed'] = True
            
            # Update employee hours
            emp_id = first_opener.get('employeeId')
            if emp_id is not None and emp_id in employee_hours:
                employee_hours[emp_id] = round(employee_hours[emp_id] - max_first_am_trim, 2)
            
            trimmed_count += 1
            print(f"    Trimmed AM start +1h: {first_opener.get('employeeName', emp_id)} at shop {shop_id} on {date}")
        
        # Trim last PM/FULL closer (-2h from end)
        if closers and (has_full or len(openers) > 1):
            last_closer = max(closers, key=lambda s: _time_to_minutes(s.get('endTime', '00:00')))
            trim_minutes = int(max_last_pm_trim * 60)
            old_end = _time_to_minutes(last_closer.get('endTime', '00:00'))
            new_end = old_end - trim_minutes
            
            # Don't trim below reasonable end time
            if new_end >= _time_to_minutes('12:00'):
                last_closer['endTime'] = _minutes_to_time(new_end)
                last_closer['hours'] = round(last_closer.get('hours', 0) - max_last_pm_trim, 2)
                last_closer['isTrimmed'] = True
                
                # Update employee hours
                emp_id = last_closer.get('employeeId')
                if emp_id is not None and emp_id in employee_hours:
                    employee_hours[emp_id] = round(employee_hours[emp_id] - max_last_pm_trim, 2)
                
                trimmed_count += 1
                print(f"    Trimmed PM end -2h: {last_closer.get('employeeName', emp_id)} at shop {shop_id} on {date}")
    
    print(f"  Total trims applied: {trimmed_count}")
    
    return shifts, employee_hours
