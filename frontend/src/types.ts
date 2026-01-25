// frontend/src/types.ts

// ============================================
// ENUMS AND BASIC TYPES
// ============================================

export type Company = 'CMZ' | 'CS' | 'Both';
export type ShopCompany = 'CMZ' | 'CS' | 'Both'; // Allow 'Both' for compatibility

export type EmploymentType = 'full-time' | 'part-time' | 'student';

// REMOVED 'barista' as requested
export type EmployeeRole = 'supervisor' | 'manager' | 'admin' | 'staff';

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
  | 'my-swaps'
  | 'portal'
  | 'payscales'
  | 'overtime'
  | 'users';

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
export type DayOfWeekShort = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

export const DAYS_OF_WEEK_SHORT: DayOfWeekShort[] = [
  'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'
];

export const DAY_SHORT_TO_FULL: Record<string, DayOfWeek> = {
  mon: 'monday', Mon: 'monday',
  tue: 'tuesday', Tue: 'tuesday',
  wed: 'wednesday', Wed: 'wednesday',
  thu: 'thursday', Thu: 'thursday',
  fri: 'friday', Fri: 'friday',
  sat: 'saturday', Sat: 'saturday',
  sun: 'sunday', Sun: 'sunday'
};

export const DAY_FULL_TO_SHORT: Record<DayOfWeek, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu',
  friday: 'Fri', saturday: 'Sat', sunday: 'Sun'
};

// ============================================
// PAY SCALES AND ALLOWANCES
// ============================================

export interface PayScale {
  id: string;
  name: string;
  grade?: string;
  hourlyRate: number;
  overtimeMultiplier: number;
  overtimeRate?: number;
  weekendMultiplier: number;
  holidayMultiplier: number;
}

export const DEFAULT_PAY_SCALES: PayScale[] = [
  { id: 'standard', name: 'Standard', grade: 'A', hourlyRate: 12.5, overtimeMultiplier: 1.5, overtimeRate: 1.5, weekendMultiplier: 1.25, holidayMultiplier: 2.0 },
  { id: 'senior', name: 'Senior', grade: 'B', hourlyRate: 15.0, overtimeMultiplier: 1.5, overtimeRate: 1.5, weekendMultiplier: 1.25, holidayMultiplier: 2.0 },
  { id: 'supervisor', name: 'Supervisor', grade: 'C', hourlyRate: 18.0, overtimeMultiplier: 1.5, overtimeRate: 1.5, weekendMultiplier: 1.25, holidayMultiplier: 2.0 },
  { id: 'manager', name: 'Manager', grade: 'D', hourlyRate: 22.0, overtimeMultiplier: 1.5, overtimeRate: 1.5, weekendMultiplier: 1.25, holidayMultiplier: 2.0 }
];

export interface Allowance {
  id: string;
  name: string;
  amount: number;
  value?: number;
  description?: string;
  type: 'fixed' | 'percentage' | 'per-hour' | 'hourly';
}

export const DEFAULT_ALLOWANCES: Allowance[] = [
  { id: 'transport', name: 'Transport', amount: 50, value: 50, description: 'Monthly transport allowance', type: 'fixed' },
  { id: 'meal', name: 'Meal', amount: 8, value: 8, description: 'Daily meal allowance', type: 'fixed' },
  { id: 'phone', name: 'Phone', amount: 25, value: 25, description: 'Monthly phone allowance', type: 'fixed' },
  { id: 'performance', name: 'Performance', amount: 5, value: 5, description: 'Performance bonus', type: 'percentage' },
  { id: 'night-shift', name: 'Night Shift Premium', amount: 2.5, value: 2.5, description: 'Night shift premium', type: 'per-hour' }
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
  role: EmployeeRole | string;
  weeklyHours: number;
  primaryShopId?: number | null;
  secondaryShopIds?: number[];
  isActive?: boolean;
  startDate?: string;
  profilePhoto?: string;
  payScaleId?: string;
  allowances?: string[];
  allowanceIds?: string[];
  emergencyContact?: string;
  emergencyPhone?: string;
  notes?: string;
  excludeFromRoster?: boolean;
  hasSystemAccess?: boolean;
  systemRole?: string;
  idNumber?: string;
  taxNumber?: string;
  ssnNumber?: string;
  tcnNumber?: string;
  tcnExpiry?: string;
  iban?: string;
}

// ============================================
// SHOP REQUIREMENTS
// ============================================

export interface ShopDayRequirement {
  day?: DayOfWeek | DayOfWeekShort | string;
  amStaff?: number;
  pmStaff?: number;
  amStart?: string;
  amEnd?: string;
  pmStart?: string;
  pmEnd?: string;
  allowFullDay?: boolean;
  isMandatory?: boolean;
  // Legacy indexed format
  Mon?: number;
  Tue?: number;
  Wed?: number;
  Thu?: number;
  Fri?: number;
  Sat?: number;
  Sun?: number;
}

export type ShopReq = ShopDayRequirement;

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
// SPECIAL SHIFTS
// ============================================

export interface SpecialShift {
  id?: string;
  dayOfWeek?: DayOfWeek | string;
  day?: string;
  startTime?: string;
  endTime?: string;
  employeeId?: number;
  notes?: string;
  shifts?: Array<{ start: string; end: string }>;
}

export interface SpecialShiftRequest {
  id: string;
  employeeId: number;
  employeeName?: string;
  shopId: number;
  shopName?: string;
  dayOfWeek: DayOfWeek | string;
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
  employeeId?: number;
  employeeName?: string;
  dayOfWeek?: DayOfWeek | string;
  reason?: string;
  person?: string;
  day?: string;
}

export interface SpecialDayRule {
  dayOfWeek?: DayOfWeek | string;
  rule?: 'closed' | 'reduced-hours' | 'extra-staff';
  customOpenTime?: string;
  customCloseTime?: string;
  staffMultiplier?: number;
  notes?: string;
}

// ============================================
// SHOP RULES
// ============================================

export interface ShopRules {
  minStaffAtOpen?: number;
  minStaffMidday?: number;
  minStaffAtClose?: number;
  maxOvertimePerWeek?: number;
  allowSplitShifts?: boolean;
  specialShifts?: SpecialShift[];
  mandatory_days?: string[];
  full_day_effect?: string;
  sundayExactStaff?: number;
  sundayMaxStaff?: number;
  dayInDayOut?: boolean;
  preferFullDays?: boolean;
  fixed_days_off?: Array<{ person: string; day: string }>;
  splitPreferred?: boolean;
  fullDayOnlyDays?: string[];
  sunday_closed?: boolean;
}

// ============================================
// TRIMMING AND SUNDAY CONFIG
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
  customHours: { enabled: false, openTime: '08:00', closeTime: '13:00' }
};

// ============================================
// SHOP
// ============================================

export interface ShopAssignedEmployee {
  employeeId: number;
  isPrimary?: boolean;
  id?: number;
  name?: string;
}

export interface Shop {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  company: Company;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  requirements?: ShopDayRequirement[];
  minStaffAtOpen?: number;
  minStaffMidday?: number;
  minStaffAtClose?: number;
  canBeSolo?: boolean;
  specialShifts?: SpecialShift[];
  fixedDaysOff?: FixedDayOff[];
  specialDayRules?: SpecialDayRule[];
  assignedEmployees?: ShopAssignedEmployee[] | Employee[] | Array<{ employeeId: number; isPrimary?: boolean }>;
  trimming?: TrimmingConfig;
  sunday?: SundayConfig;
  specialRequests?: SpecialShift[];
  rules?: ShopRules;
}

// ============================================
// SHIFT
// ============================================

export type ShiftType = 'AM' | 'PM' | 'FULL' | 'CUSTOM';

export interface Shift {
  id: number | string;
  employeeId: number;
  employeeName?: string;
  shopId: number;
  shopName?: string;
  date: string;
  startTime: string;
  endTime: string;
  hours?: number;
  shiftType: ShiftType;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
  isTrimmed?: boolean;
  company?: Company;
}

export interface BackendShift {
  id?: number | string;
  employee_id?: number;
  shop_id?: number;
  start_time?: string;
  end_time?: string;
  shift_type?: ShiftType;
  is_trimmed?: boolean;
  employee_name?: string;
  shop_name?: string;
  employeeId?: number;
  shopId?: number;
  startTime?: string;
  endTime?: string;
  shiftType?: ShiftType;
  isTrimmed?: boolean;
  employeeName?: string;
  shopName?: string;
  date: string;
  hours?: number;
  status?: string;
  notes?: string;
  company?: Company;
}

export function normalizeShift(bs: BackendShift): Shift {
  return {
    id: bs.id ?? 0,
    employeeId: bs.employeeId ?? bs.employee_id ?? 0,
    employeeName: bs.employeeName ?? bs.employee_name,
    shopId: bs.shopId ?? bs.shop_id ?? 0,
    shopName: bs.shopName ?? bs.shop_name,
    date: bs.date,
    startTime: bs.startTime ?? bs.start_time ?? '',
    endTime: bs.endTime ?? bs.end_time ?? '',
    hours: bs.hours,
    shiftType: bs.shiftType ?? bs.shift_type ?? 'FULL',
    status: (bs.status as Shift['status']) ?? 'scheduled',
    notes: bs.notes,
    isTrimmed: bs.isTrimmed ?? bs.is_trimmed,
    company: bs.company
  };
}

// ============================================
// SHIFT SWAP
// ============================================

export interface ShiftSwapRequest {
  id: number | string;
  requesterId: number;
  requesterName?: string;
  targetId?: number;
  targetEmployeeId?: number;
  targetName?: string;
  requesterShiftId: number | string;
  targetShiftId?: number | string;
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
  role: EmployeeRole | string;
  company?: Company;
  employeeId?: number;
  shopId?: number;
}

// ============================================
// LEAVE
// ============================================

export interface LeaveRequest {
  id: number | string;
  employeeId: number;
  employeeName?: string;
  startDate: string;
  endDate: string;
  type: 'annual' | 'sick' | 'personal' | 'unpaid';
  status: 'pending' | 'approved' | 'rejected';
  reason?: string;
  createdAt?: string;
  submittedAt?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  reviewNotes?: string;
}

// ============================================
// PROFILE NOTIFICATIONS
// ============================================

export interface ProfileUpdateNotification {
  id: number | string;
  employeeId: number;
  employeeName: string;
  field: string;
  oldValue: string;
  newValue: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  changes?: Record<string, { old: string; new: string }>;
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

// ============================================
// PART-TIMER AVAILABILITY
// ============================================

export interface PartTimerAvailability {
  employeeId: number;
  employeeName: string;
  company: Company | string;
  primaryShopId?: number | null;
  primaryShopName?: string;
  availability: {
    [key in DayOfWeek]?: {
      available: boolean;
      start?: string;
      end?: string;
    };
  };
}

// ============================================
// COMPONENT PROPS
// ============================================

export interface ShopsViewProps {
  onNavigate?: (view: string) => void;
  shops?: Shop[];
  setShops?: React.Dispatch<React.SetStateAction<Shop[]>>;
  employees?: Employee[];
  setEmployees?: React.Dispatch<React.SetStateAction<Employee[]>>;
}
