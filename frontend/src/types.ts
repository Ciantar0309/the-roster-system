// frontend/src/types.ts
// ============== CORE TYPES ==============

export type Company = 'CMZ' | 'CS' | 'Both';
export type ViewType = 'dashboard' | 'roster' | 'employees' | 'shops' | 'leave' | 'swaps' | 'overtime' | 'payscales' | 'settings' | 'portal' | 'users';
export type UserRole = 'admin' | 'manager' | 'employee';
export type EmploymentType = 'full-time' | 'part-time';
export type EmployeeRole = 'staff' | 'supervisor' | 'manager';
export type ShiftType = 'AM' | 'PM' | 'FULL' | 'CUSTOM';
export type LeaveStatus = 'pending' | 'approved' | 'rejected';
export type SwapStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

// ============== SHOP TYPES ==============

export interface ShiftRequirement {
  day: DayOfWeek;
  amStaff: number;
  pmStaff: number;
  amStart?: string;
  amEnd?: string;
  pmStart?: string;
  pmEnd?: string;
  isMandatory?: boolean;
}

export interface SpecialShiftRequest {
  id: string;
  day: DayOfWeek;
  shifts: {
    start: string;
    end: string;
    employeeId?: number;
    notes?: string;
  }[];
}

export interface Shop {
  id: number;
  name: string;
  company: Company;
  isActive: boolean;
  address?: string;
  phone?: string;
  openTime: string;
  closeTime: string;
  requirements: ShiftRequirement[];
  specialRequests: SpecialShiftRequest[];
  assignedEmployees: {
    employeeId: number;
    isPrimary: boolean;
  }[];
  rules?: {
    mandatory_days?: string[];
    fixed_days_off?: { person: string; day: string }[];
    full_day_effect?: string;
    sunday_closed?: boolean;
  };
}


// ============== EMPLOYEE TYPES ==============

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
  systemRole?: UserRole;
  // Personal details
  idNumber?: string;
  taxNumber?: string;
  ssnNumber?: string;
  tcnNumber?: string;
  tcnExpiry?: string;
  iban?: string;
  // Shop assignments
  primaryShopId?: number;
  secondaryShopIds: number[];
}

// ============== SHIFT TYPES ==============

export interface BackendShift {
  id: string;
  date: string;
  shopId: number;
  shopName: string;
  employeeId: number;
  employeeName: string;
  startTime: string;
  endTime: string;
  hours: number;
  shiftType: ShiftType;
  company: Company;
  isOvertime?: boolean;
}

// ============== LEAVE TYPES ==============

export interface LeaveRequest {
  id: string;
  employeeId: number;
  type: 'annual' | 'sick' | 'personal' | 'unpaid' | 'maternity' | 'paternity' | 'bereavement';
  startDate: string;
  endDate: string;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedBy?: number;
  reviewedAt?: string;
  managerResponse?: string;
}



// ============== SHIFT SWAP TYPES ==============

export interface ShiftSwapRequest {
  id: string;
  requesterId: number;
  requesterShiftId: string;
  targetEmployeeId: number;
  targetShiftId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedBy?: number;
  reviewedAt?: string;
}


// ============== USER TYPES ==============

export interface CurrentUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  company: Company;
  employeeId?: number;
}

export interface SystemInvite {
  id: string;
  email: string;
  role: UserRole;
  expiresAt: string;
  createdAt: string;
  usedAt?: string;
}

// ============== PAY TYPES ==============

export interface PayScale {
  id: string;
  name: string;
  grade: string;
  hourlyRate: number;
  overtimeMultiplier: number;
}

export interface Allowance {
  id: string;
  name: string;
  type: 'fixed' | 'hourly' | 'percentage';
  value: number;
  description?: string;
}

// ============== DEFAULT DATA ==============

export const DAYS_OF_WEEK: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DEFAULT_SHOP_REQUIREMENTS: ShiftRequirement[] = DAYS_OF_WEEK.map(day => ({
  day,
  amStaff: day === 'Sun' ? 1 : 2,
  pmStaff: day === 'Sun' ? 1 : 2,
  amStart: '06:00',
  amEnd: '14:00',
  pmStart: '14:00',
  pmEnd: '21:00',
}));

export const DEFAULT_PAY_SCALES: PayScale[] = [
  { id: 'scale1', name: 'Scale 1', grade: 'Entry', hourlyRate: 8.50, overtimeMultiplier: 1.5 },
  { id: 'scale2', name: 'Scale 2', grade: 'Junior', hourlyRate: 10.00, overtimeMultiplier: 1.5 },
  { id: 'scale3', name: 'Scale 3', grade: 'Senior', hourlyRate: 12.00, overtimeMultiplier: 1.5 },
  { id: 'supervisor', name: 'Supervisor', grade: 'Supervisor', hourlyRate: 14.00, overtimeMultiplier: 1.5 },
  { id: 'manager', name: 'Manager', grade: 'Manager', hourlyRate: 18.00, overtimeMultiplier: 2.0 },
];

export const DEFAULT_ALLOWANCES: Allowance[] = [
  { id: 'petrol', name: 'Petrol Allowance', type: 'fixed', value: 50, description: 'Monthly petrol allowance' },
  { id: 'mobile', name: 'Mobile Allowance', type: 'fixed', value: 25, description: 'Monthly mobile phone allowance' },
  { id: 'hourly-bonus', name: 'Hourly Bonus', type: 'hourly', value: 0.50, description: 'Per hour bonus' },
];

// ============== NAVIGATION ==============

export const ADMIN_NAVIGATION = [
  { id: 'dashboard' as ViewType, label: 'Dashboard', icon: 'LayoutDashboard' },
  { id: 'roster' as ViewType, label: 'Roster', icon: 'Calendar' },
  { id: 'shops' as ViewType, label: 'Shops', icon: 'Store' },
  { id: 'employees' as ViewType, label: 'Employees', icon: 'Users' },
  { id: 'payscales' as ViewType, label: 'Pay Scales', icon: 'DollarSign' },
  { id: 'overtime' as ViewType, label: 'Overtime', icon: 'Clock' },
  { id: 'leave' as ViewType, label: 'Leave', icon: 'ClipboardList' },
  { id: 'swaps' as ViewType, label: 'Shift Swaps', icon: 'Repeat' },
  { id: 'settings' as ViewType, label: 'Settings', icon: 'Settings' },
  { id: 'users' as ViewType, label: 'Users', icon: 'Users' },

];

export const EMPLOYEE_NAVIGATION: { id: ViewType; label: string; icon: string }[] = [
  { id: 'portal', label: 'My Portal', icon: 'LayoutDashboard' },
  { id: 'roster', label: 'Full Roster', icon: 'Calendar' },
  { id: 'leave', label: 'Leave', icon: 'ClipboardList' },
  { id: 'swaps', label: 'Swaps', icon: 'Repeat' },
  { id: 'settings', label: 'Settings', icon: 'Settings' },
];

export interface ProfileUpdateNotification {
  id: string;
  employeeId: number;
  employeeName: string;
  changes: {
    phone?: { old: string; new: string };
    idNumber?: { old: string; new: string };
    taxNumber?: { old: string; new: string };
    ssnNumber?: { old: string; new: string };
    tcnNumber?: { old: string; new: string };
    tcnExpiry?: { old: string; new: string };
    iban?: { old: string; new: string };
  };
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
}
