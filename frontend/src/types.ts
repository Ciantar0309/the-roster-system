// ============ Company & Employment Types ============
export type Company = 'CMZ' | 'CS' | 'Both';
export type EmploymentType = 'full-time' | 'part-time' | 'student';
export type EmployeeRole = 'staff' | 'supervisor' | 'manager';

// ============ Navigation Types ============
export type ViewType = 
  | 'dashboard' 
  | 'schedule' 
  | 'roster'
  | 'employees' 
  | 'shops' 
  | 'leave' 
  | 'swaps' 
  | 'reports' 
  | 'settings'
  | 'my-schedule'
  | 'my-leave'
  | 'my-swaps'
  | 'profile'
  | 'portal'
  | 'payscales'
  | 'overtime'
  | 'users';

export interface NavigationItem {
  id: ViewType;
  label: string;
  icon?: string;
}

export const ADMIN_NAVIGATION: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'roster', label: 'Roster', icon: 'Calendar' },
  { id: 'shops', label: 'Shops', icon: 'Store' },
  { id: 'employees', label: 'Employees', icon: 'Users' },
  { id: 'leave', label: 'Leave Requests', icon: 'ClipboardList' },
  { id: 'swaps', label: 'Shift Swaps', icon: 'Repeat' },
  { id: 'overtime', label: 'Overtime', icon: 'Clock' },
  { id: 'payscales', label: 'Pay Scales', icon: 'DollarSign' },
  { id: 'users', label: 'Users', icon: 'Users' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
];

export const EMPLOYEE_NAVIGATION: NavigationItem[] = [
  { id: 'portal', label: 'My Portal', icon: 'LayoutDashboard' },
  { id: 'roster', label: 'My Roster', icon: 'Calendar' },
  { id: 'my-leave', label: 'My Leave', icon: 'ClipboardList' },
  { id: 'my-swaps', label: 'My Swaps', icon: 'Repeat' },
  { id: 'profile', label: 'Profile', icon: 'Users' },
];

// ============ Days of Week ============
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type DayOfWeekFull = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DAYS_OF_WEEK_FULL: DayOfWeekFull[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const DAY_SHORT_TO_FULL: Record<DayOfWeek, DayOfWeekFull> = {
  'Mon': 'Monday',
  'Tue': 'Tuesday',
  'Wed': 'Wednesday',
  'Thu': 'Thursday',
  'Fri': 'Friday',
  'Sat': 'Saturday',
  'Sun': 'Sunday',
};

export const DAY_FULL_TO_SHORT: Record<DayOfWeekFull, DayOfWeek> = {
  'Monday': 'Mon',
  'Tuesday': 'Tue',
  'Wednesday': 'Wed',
  'Thursday': 'Thu',
  'Friday': 'Fri',
  'Saturday': 'Sat',
  'Sunday': 'Sun',
};

// ============ Pay Scale ============
export interface PayScale {
  id: string;
  name: string;
  grade?: string;
  hourlyRate: number;
  overtimeRate?: number;
  overtimeMultiplier?: number;
  weekendRate?: number;
}

export const DEFAULT_PAY_SCALES: PayScale[] = [
  { id: 'scale1', name: 'Standard', grade: 'Entry', hourlyRate: 12.50, overtimeRate: 18.75, overtimeMultiplier: 1.5 },
  { id: 'scale2', name: 'Senior', grade: 'Junior', hourlyRate: 15.00, overtimeRate: 22.50, overtimeMultiplier: 1.5 },
  { id: 'scale3', name: 'Supervisor', grade: 'Senior', hourlyRate: 18.00, overtimeRate: 27.00, overtimeMultiplier: 1.5 },
  { id: 'scale4', name: 'Manager', grade: 'Manager', hourlyRate: 22.00, overtimeRate: 33.00, overtimeMultiplier: 1.5 },
];

// ============ Allowance ============
export interface Allowance {
  id: string;
  name: string;
  description: string;
  type: 'fixed' | 'hourly' | 'percentage';
  value: number;
}

export const DEFAULT_ALLOWANCES: Allowance[] = [
  { id: 'transport', name: 'Transport Allowance', description: 'Monthly transport subsidy', type: 'fixed', value: 50 },
  { id: 'meal', name: 'Meal Allowance', description: 'Daily meal allowance', type: 'fixed', value: 8 },
  { id: 'phone', name: 'Phone Allowance', description: 'Monthly phone credit', type: 'fixed', value: 25 },
  { id: 'performance', name: 'Performance Bonus', description: 'Based on performance review', type: 'percentage', value: 5 },
  { id: 'night', name: 'Night Shift Premium', description: 'Extra pay for night shifts', type: 'hourly', value: 2.50 },
];

// ============ Employee ============
export interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company: Company;
  employmentType: EmploymentType;
  role: EmployeeRole;
  weeklyHours: number;
  payScaleId: string;
  allowanceIds: string[];
  excludeFromRoster: boolean;
  hasSystemAccess: boolean;
  systemRole?: 'admin' | 'manager' | 'employee';
  idNumber?: string;
  taxNumber?: string;
  ssnNumber?: string;
  tcnNumber?: string;
  tcnExpiry?: string;
  iban?: string;
  primaryShopId?: number;
  secondaryShopIds?: number[];
  fixedDayOff?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============ Shop Requirements ============
export interface ShopDayRequirement {
  day: DayOfWeek;
  amStaff: number;
  pmStaff: number;
  allowFullDay?: boolean;
  isMandatory?: boolean;
  amStart?: string;
  amEnd?: string;
  pmStart?: string;
  pmEnd?: string;
}

export type DayRequirement = ShopDayRequirement;

export const DEFAULT_SHOP_REQUIREMENTS: ShopDayRequirement[] = [
  { day: 'Mon', amStaff: 2, pmStaff: 2, allowFullDay: false, isMandatory: false, amStart: '06:30', amEnd: '14:30', pmStart: '14:00', pmEnd: '21:30' },
  { day: 'Tue', amStaff: 2, pmStaff: 2, allowFullDay: false, isMandatory: false, amStart: '06:30', amEnd: '14:30', pmStart: '14:00', pmEnd: '21:30' },
  { day: 'Wed', amStaff: 2, pmStaff: 2, allowFullDay: false, isMandatory: false, amStart: '06:30', amEnd: '14:30', pmStart: '14:00', pmEnd: '21:30' },
  { day: 'Thu', amStaff: 2, pmStaff: 2, allowFullDay: false, isMandatory: false, amStart: '06:30', amEnd: '14:30', pmStart: '14:00', pmEnd: '21:30' },
  { day: 'Fri', amStaff: 2, pmStaff: 2, allowFullDay: false, isMandatory: false, amStart: '06:30', amEnd: '14:30', pmStart: '14:00', pmEnd: '21:30' },
  { day: 'Sat', amStaff: 2, pmStaff: 2, allowFullDay: false, isMandatory: false, amStart: '06:30', amEnd: '14:30', pmStart: '14:00', pmEnd: '21:30' },
  { day: 'Sun', amStaff: 1, pmStaff: 1, allowFullDay: false, isMandatory: false, amStart: '06:30', amEnd: '14:30', pmStart: '14:00', pmEnd: '21:30' },
];

// ============ Special Shift Request ============
export interface SpecialShift {
  start: string;
  end: string;
  count?: number;
  notes?: string;
}

export interface SpecialShiftRequest {
  id: string;
  day: DayOfWeek;
  shifts: SpecialShift[];
  notes?: string;
}

// ============ Fixed Day Off ============
export interface FixedDayOff {
  employeeId: number;
  employeeName: string;
  day: DayOfWeek;
}

// ============ Special Day Rule ============
export interface SpecialDayRule {
  day: DayOfWeek;
  rule: 'one_off_one_full' | 'all_full' | 'all_split' | 'custom';
  description?: string;
}

// ============ Shop Rules ============
export interface ShopRules {
  mandatory_days?: string[];
  fixed_days_off?: { person: string; day: string }[];
  full_day_effect?: string;
  sunday_closed?: boolean;
  dayInDayOut?: boolean;
  dayInDayOutFlexible?: boolean;
  splitPreferred?: boolean;
  fullDayOnlyDays?: string[];
  sundayMaxStaff?: number;
  sundayExactStaff?: number;
  preferFullDays?: boolean;
  allowShortShifts?: boolean;
  allowExtendedShifts?: boolean;
  allowMiddayShifts?: boolean;
  minStaffAM?: number;
  maxStaffAM?: number;
  minStaffPM?: number;
  maxStaffPM?: number;
  overtimeHardCap?: number;
  special_shifts?: Record<string, { start: string; end: string; required_staff: number }[]>;
}

// ============ Shop ============
export interface Shop {
  id: number;
  name: string;
  company: 'CMZ' | 'CS';
  isActive: boolean;
  openTime: string;
  closeTime: string;
  address?: string;
  phone?: string;
  requirements: ShopDayRequirement[];
  specialRequests: SpecialShiftRequest[];
  fixedDaysOff?: FixedDayOff[];
  specialDayRules?: SpecialDayRule[];
  assignedEmployees: { employeeId: number; isPrimary: boolean }[];
  rules?: ShopRules;
  minStaffAtOpen?: number;
minStaffMidday?: number;
minStaffAtClose?: number;
canBeSolo?: boolean;
}


// ============ Shift ============
export interface Shift {
  id: number | string;
  date: string;
  shopId: number;
  shopName: string;
  employeeId: number;
  employeeName: string;
  startTime: string;
  endTime: string;
  hours: number;
  shiftType: 'AM' | 'PM' | 'FULL' | 'AM_SHORT' | 'PM_SHORT' | 'AM_EXT' | 'PM_EXT' | 'MIDDAY' | 'CUSTOM' | string;
  company: string;
}

// ============ Swap Types ============
export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface BackendShift {
  id: number | string;
  date: string;
  shopId: number;
  shopName: string;
  employeeId: number;
  employeeName: string;
  startTime: string;
  endTime: string;
  hours: number;
  shiftType: string;
  company: string;
}

export interface ShiftSwapRequest {
  id: number | string;
  requesterId: number | string;
  requesterName?: string;
  requesterShiftId?: number | string;
  targetId?: number | string;
  targetName?: string;
  targetEmployeeId?: number | string;
  originalShiftId?: number | string;
  originalShift?: BackendShift;
  targetShiftId?: number | string;
  targetShift?: BackendShift;
  status: SwapStatus;
  reason?: string;
  createdAt: string;
  updatedAt?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  reviewNotes?: string;
}

// ============ Current User ============
export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'manager' | 'employee';
  employeeId?: number;
  company?: Company;
}

// ============ Leave Types ============
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type LeaveType = 'annual' | 'sick' | 'personal' | 'unpaid' | 'other';

export interface LeaveRequest {
  id: number | string;
  employeeId: number | string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  type: LeaveType;
  status: LeaveStatus;
  reason?: string;
  createdAt?: string;
  submittedAt?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  managerResponse?: string;
}

// ============ Profile Update Notification ============
export interface ProfileUpdateNotification {
  id: string;
  employeeId: number | string;
  employeeName: string;
  field?: string;
  oldValue?: string;
  newValue?: string;
  changes?: Record<string, { old: string; new: string }>;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: number;
}

// ============ Roster ============
export interface Roster {
  id?: number;
  weekStart: string;
  weekEnd?: string;
  status: 'draft' | 'published' | 'archived';
  shifts: Shift[];
  createdAt?: string;
  updatedAt?: string;
}
