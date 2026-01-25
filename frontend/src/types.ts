// frontend/src/types.ts

// ============================================
// ENUMS AND BASIC TYPES
// ============================================

export type Company = 'CMZ' | 'CS' | 'Both';
export type ShopCompany = 'CMZ' | 'CS'; // Shops can only be one company

export type EmploymentType = 'full-time' | 'part-time' | 'student';

export type EmployeeRole = 'barista' | 'supervisor' | 'manager' | 'admin';

export type ViewType =
  | 'dashboard'
  | 'roster'
  | 'employees'
  | 'shops'
  | 'leave'
  | 'swaps'
  | 'reports'
  | 'settings'
  | 'profile'
  | 'my-roster'
  | 'my-leave'
  | 'my-swaps';

// ============================================
// NAVIGATION
// ============================================

export interface NavigationItem {
  id: ViewType;
  label: string;
  icon: string;
}

export const ADMIN_NAVIGATION: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'roster', label: 'Roster', icon: 'Calendar' },
  { id: 'employees', label: 'Employees', icon: 'Users' },
  { id: 'shops', label: 'Shops', icon: 'Store' },
  { id: 'leave', label: 'Leave Requests', icon: 'CalendarOff' },
  { id: 'swaps', label: 'Shift Swaps', icon: 'ArrowLeftRight' },
  { id: 'reports', label: 'Reports', icon: 'BarChart3' },
  { id: 'settings', label: 'Settings', icon: 'Settings' }
];

export const EMPLOYEE_NAVIGATION: NavigationItem[] = [
  { id: 'my-roster', label: 'My Roster', icon: 'Calendar' },
  { id: 'my-leave', label: 'Request Leave', icon: 'CalendarOff' },
  { id: 'my-swaps', label: 'Swap Shifts', icon: 'ArrowLeftRight' },
  { id: 'profile', label: 'Profile', icon: 'User' }
];

// ============================================
// DAYS OF WEEK
// ============================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

export const DAY_SHORT_TO_FULL: Record<string, DayOfWeek> = {
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday'
};

export const DAY_FULL_TO_SHORT: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun'
};

// ============================================
// PAY SCALES AND ALLOWANCES
// ============================================

export interface PayScale {
  id: string;
  name: string;
  hourlyRate: number;
  overtimeMultiplier: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
}

export const DEFAULT_PAY_SCALES: PayScale[] = [
  { id: 'standard', name: 'Standard', hourlyRate: 12.5, overtimeMultiplier: 1.5, weekendMultiplier: 1.25, holidayMultiplier: 2.0 },
  { id: 'senior', name: 'Senior', hourlyRate: 15.0, overtimeMultiplier: 1.5, weekendMultiplier: 1.25, holidayMultiplier: 2.0 },
  { id: 'supervisor', name: 'Supervisor', hourlyRate: 18.0, overtimeMultiplier: 1.5, weekendMultiplier: 1.25, holidayMultiplier: 2.0 },
  { id: 'manager', name: 'Manager', hourlyRate: 22.0, overtimeMultiplier: 1.5, weekendMultiplier: 1.25, holidayMultiplier: 2.0 }
];

export interface Allowance {
  id: string;
  name: string;
  amount: number;
  type: 'fixed' | 'percentage' | 'per-hour';
}

export const DEFAULT_ALLOWANCES: Allowance[] = [
  { id: 'transport', name: 'Transport', amount: 50, type: 'fixed' },
  { id: 'meal', name: 'Meal', amount: 8, type: 'fixed' },
  { id: 'phone', name: 'Phone', amount: 25, type: 'fixed' },
  { id: 'performance', name: 'Performance', amount: 5, type: 'percentage' },
  { id: 'night-shift', name: 'Night Shift Premium', amount: 2.5, type: 'per-hour' }
];

// ============================================
// EMPLOYEE
// ============================================

export interface Employee {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company: Company;
  employmentType: EmploymentType;
  role: EmployeeRole;
  weeklyHours: number;
  primaryShopId: number | null;
  secondaryShopIds: number[];
  isActive: boolean;
  startDate?: string;
  profilePhoto?: string;
  payScaleId?: string;
  allowances?: string[];
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
}

// ============================================
// SHOP REQUIREMENTS AND SCHEDULING
// ============================================

export interface ShopDayRequirement {
  day: DayOfWeek;
  amStaff: number;
  pmStaff: number;
  amStart?: string;
  amEnd?: string;
  pmStart?: string;
  pmEnd?: string;
  allowFullDay: boolean;
  isMandatory: boolean;
}

export const DEFAULT_SHOP_REQUIREMENTS: ShopDayRequirement[] = DAYS_OF_WEEK.map(day => ({
  day,
  amStaff: day === 'sunday' ? 1 : 2,
  pmStaff: day === 'sunday' ? 1 : 2,
  amStart: '06:30',
  amEnd: '14:30',
  pmStart: '14:00',
  pmEnd: '21:30',
  allowFullDay: true,
  isMandatory: false
}));

// ============================================
// SPECIAL SHIFTS AND REQUESTS
// ============================================

export interface SpecialShift {
  id: string;
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  employeeId?: number;
  notes?: string;
}

export interface SpecialShiftRequest {
  id: string;
  employeeId: number;
  employeeName?: string;
  shopId: number;
  shopName?: string;
  dayOfWeek: DayOfWeek;
  shiftType: 'AM' | 'PM' | 'FULL';
  startTime?: string;
  endTime?: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: string;
}

// ============================================
// FIXED DAYS OFF AND SPECIAL RULES
// ============================================

export interface FixedDayOff {
  employeeId: number;
  employeeName?: string;
  dayOfWeek: DayOfWeek;
  reason?: string;
}

export interface SpecialDayRule {
  dayOfWeek: DayOfWeek;
  rule: 'closed' | 'reduced-hours' | 'extra-staff';
  customOpenTime?: string;
  customCloseTime?: string;
  staffMultiplier?: number;
  notes?: string;
}

// ============================================
// SHOP RULES
// ============================================

export interface ShopRules {
  minStaffAtOpen: number;
  minStaffMidday: number;
  minStaffAtClose: number;
  maxOvertimePerWeek: number;
  allowSplitShifts: boolean;
  specialShifts?: SpecialShift[];
}

// ============================================
// TRIMMING AND SUNDAY CONFIG (NEW)
// ============================================

export interface TrimmingConfig {
  enabled: boolean;
  trimAM: boolean;
  trimPM: boolean;
  minShiftHours: number;
  trimFromStart: number;
  trimFromEnd: number;
  trimWhenMoreThan: number;
}

export const DEFAULT_TRIMMING_CONFIG: TrimmingConfig = {
  enabled: false,
  trimAM: true,
  trimPM: false,
  minShiftHours: 4,
  trimFromStart: 1,
  trimFromEnd: 2,
  trimWhenMoreThan: 2
};

export interface SundayConfig {
  closed: boolean;
  maxStaff: number | null;
  customHours: {
    enabled: boolean;
    openTime: string;
    closeTime: string;
  } | null;
}

export const DEFAULT_SUNDAY_CONFIG: SundayConfig = {
  closed: false,
  maxStaff: null,
  customHours: {
    enabled: false,
    openTime: '08:00',
    closeTime: '13:00'
  }
};

// ============================================
// SHOP
// ============================================

export interface Shop {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  company: ShopCompany;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  requirements: ShopDayRequirement[];
  minStaffAtOpen: number;
  minStaffMidday: number;
  minStaffAtClose: number;
  canBeSolo: boolean;
  specialShifts: SpecialShift[];
  fixedDaysOff: FixedDayOff[];
  specialDayRules: SpecialDayRule[];
  assignedEmployees?: Employee[];
  trimming?: TrimmingConfig;
  sunday?: SundayConfig;
}

// ============================================
// SHIFT
// ============================================

export interface Shift {
  id: number;
  employeeId: number;
  employeeName?: string;
  shopId: number;
  shopName?: string;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: 'AM' | 'PM' | 'FULL';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  isTrimmed?: boolean;
}

export interface BackendShift {
  id?: number;
  employee_id: number;
  shop_id: number;
  date: string;
  start_time: string;
  end_time: string;
  shift_type: 'AM' | 'PM' | 'FULL';
  status?: string;
  notes?: string;
  is_trimmed?: boolean;
}

// ============================================
// SHIFT SWAP
// ============================================

export interface ShiftSwapRequest {
  id: number;
  requesterId: number;
  requesterName?: string;
  targetId: number;
  targetName?: string;
  requesterShiftId: number;
  targetShiftId: number;
  requesterShiftDate?: string;
  targetShiftDate?: string;
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt?: string;
}

// ============================================
// USER AND AUTH
// ============================================

export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: EmployeeRole;
  employeeId?: number;
  shopId?: number;
}

// ============================================
// LEAVE
// ============================================

export interface LeaveRequest {
  id: number;
  employeeId: number;
  employeeName?: string;
  startDate: string;
  endDate: string;
  type: 'annual' | 'sick' | 'personal' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  reviewNotes?: string;
}

// ============================================
// PROFILE AND NOTIFICATIONS
// ============================================

export interface ProfileUpdateNotification {
  id: number;
  employeeId: number;
  employeeName: string;
  field: string;
  oldValue: string;
  newValue: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

// ============================================
// ROSTER
// ============================================

export interface Roster {
  id: number;
  weekStart: string;
  weekEnd: string;
  status: 'draft' | 'published' | 'archived';
  shifts: Shift[];
  createdAt?: string;
  publishedAt?: string;
}
