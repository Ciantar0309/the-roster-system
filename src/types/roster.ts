// ============================================================
// ROSTER TYPES
// The Roster System - Type definitions for roster generation
// ============================================================

import { DayOfWeek } from '../config/shops';

export type ShiftType = 'am' | 'pm' | 'fullDay';

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  shopId: string;
  shopName: string;
  day: DayOfWeek;
  date: string;
  startTime: string;
  endTime: string;
  shiftType: ShiftType;
  duration: number; // in hours
}

export interface EmployeeWeekSummary {
  employeeId: string;
  employeeName: string;
  weekdayHours: number;
  sundayHours: number;
  totalHours: number;
  shiftsCount: number;
  amCount: number;
  pmCount: number;
  fullDayCount: number;
  status: 'under' | 'good' | 'over';
}

export interface ShopDayCoverage {
  shopId: string;
  shopName: string;
  day: DayOfWeek;
  required: {
    am: number;
    pm: number;
  };
  assigned: {
    am: number;
    pm: number;
  };
  isCovered: boolean;
  shifts: Shift[];
}

export interface SlotRequirement {
  shopId: string;
  shopName: string;
  day: DayOfWeek;
  slotType: 'am' | 'pm';
  startTime: string;
  endTime: string;
  required: number;
  assigned: number;
  assignedEmployees: string[];
}

export interface UnfilledSlot {
  shopId: string;
  shopName: string;
  day: DayOfWeek;
  slotType: 'am' | 'pm';
  startTime: string;
  endTime: string;
  needed: number;
}

export interface RosterValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GeneratedRoster {
  weekStartDate: string;
  weekEndDate: string;
  shifts: Shift[];
  employeeSummaries: EmployeeWeekSummary[];
  shopCoverage: ShopDayCoverage[];
  unfilledSlots: UnfilledSlot[];
  validation: RosterValidation;
  stats: {
    totalShifts: number;
    totalHoursAssigned: number;
    coveragePercentage: number;
    employeesAt40h: number;
    employeesUnder40h: number;
    employeesOver40h: number;
  };
}

export interface EmployeeTracker {
  employeeId: string;
  employeeName: string;
  weekdayMinutes: number;
  sundayMinutes: number;
  totalMinutes: number;
  shifts: Shift[];
  daysWorked: Set<DayOfWeek>;
  amCount: number;
  pmCount: number;
}
