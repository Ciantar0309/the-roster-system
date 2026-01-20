// ============================================
// FILE 2: src/config/employees.ts
// EMPLOYEE CONFIGURATION
// ============================================

import { DayOfWeek } from './shops';

export type EmployeeType = 'full-time' | 'part-time' | 'manager';

export interface EmployeeConstraints {
  offDays?: DayOfWeek[];
  morningsOnly?: boolean;
  eveningsOnly?: boolean;
  maxShiftsPerWeek?: number;
  isEmergencyOnly?: boolean;
}

export interface EmployeeConfig {
  id: string;
  name: string;
  company: 'CMZ' | 'C&S';
  type: EmployeeType;
  maxHours: number;
  primaryShop: string;
  secondaryShops?: string[];
  constraints?: EmployeeConstraints;
  isActive: boolean;
}

// ============================================
// EMPLOYEE DATA
// ============================================

export const EMPLOYEES: EmployeeConfig[] = [
  // ========== C&S - HAMRUN (6 primary) ==========
  { id: 'kamal', name: 'Kamal', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'hamrun', secondaryShops: [], isActive: true },
  { id: 'laxmi', name: 'Laxmi', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'hamrun', secondaryShops: [], isActive: true },
  { id: 'arjun', name: 'Arjun', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'hamrun', secondaryShops: [], isActive: true },
  { id: 'imran', name: 'Imran', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'hamrun', secondaryShops: [], isActive: true },
  { id: 'gopal', name: 'Gopal', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'hamrun', secondaryShops: [], isActive: true },
  { id: 'passang', name: 'Passang', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'hamrun', secondaryShops: ['mellieha', 'tigne-point'], isActive: true },

  // ========== C&S - TIGNE POINT (1 primary) ==========
  { id: 'ciro', name: 'Ciro', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'tigne-point', secondaryShops: ['hamrun'], isActive: true },

  // ========== C&S - SIGGIEWI (2 primary) ==========
  { id: 'ricky', name: 'Ricky', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'siggiewi', secondaryShops: ['hamrun'], constraints: { offDays: ['monday'] }, isActive: true },
  { id: 'anus', name: 'Anus', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'siggiewi', secondaryShops: ['hamrun'], constraints: { offDays: ['wednesday'] }, isActive: true },

  // ========== C&S - MARSAXLOKK (2 primary) ==========
  { id: 'carina', name: 'Carina', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'marsaxlokk', secondaryShops: ['hamrun'], isActive: true },
  { id: 'pradib', name: 'Pradib', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'marsaxlokk', secondaryShops: ['marsascala'], isActive: true },

  // ========== C&S - MARSASCALA (2 primary) ==========
  { id: 'sirjana', name: 'Sirjana', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'marsascala', secondaryShops: ['tigne-point'], isActive: true },
  { id: 'anup', name: 'Anup', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'marsascala', secondaryShops: [], isActive: true },

  // ========== C&S - MELLIEHA (2 primary) ==========
  { id: 'hasan', name: 'Hasan', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'mellieha', secondaryShops: [], isActive: true },
  { id: 'anju', name: 'Anju', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'mellieha', secondaryShops: [], isActive: true },

  // ========== C&S - RABAT (2 primary) ==========
  { id: 'aronia', name: 'Aronia', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'rabat', secondaryShops: ['hamrun'], isActive: true },
  { id: 'joanne', name: 'Joanne', company: 'C&S', type: 'full-time', maxHours: 40, primaryShop: 'rabat', secondaryShops: ['fgura', 'carters', 'zabbar'], isActive: true },

  // ========== CMZ - FGURA (3 full-time + 1 manager) ==========
  { id: 'caroline', name: 'Caroline', company: 'CMZ', type: 'full-time', maxHours: 40, primaryShop: 'fgura', secondaryShops: [], isActive: true },
  { id: 'chantel', name: 'Chantel', company: 'CMZ', type: 'full-time', maxHours: 40, primaryShop: 'fgura', secondaryShops: [], isActive: true },
  { id: 'claire', name: 'Claire', company: 'CMZ', type: 'full-time', maxHours: 40, primaryShop: 'fgura', secondaryShops: [], isActive: true },
  { id: 'maria', name: 'Maria', company: 'CMZ', type: 'manager', maxHours: 40, primaryShop: 'fgura', secondaryShops: ['carters', 'zabbar'], constraints: { isEmergencyOnly: true }, isActive: true },

  // ========== CMZ - CARTERS (4 primary) ==========
  { id: 'anthony', name: 'Anthony', company: 'CMZ', type: 'full-time', maxHours: 40, primaryShop: 'carters', secondaryShops: [], isActive: true },
  { id: 'joseph', name: 'Joseph', company: 'CMZ', type: 'full-time', maxHours: 40, primaryShop: 'carters', secondaryShops: [], constraints: { morningsOnly: true }, isActive: true },
  { id: 'mariella', name: 'Mariella', company: 'CMZ', type: 'full-time', maxHours: 40, primaryShop: 'carters', secondaryShops: [], isActive: true },
  { id: 'rabi', name: 'Rabi', company: 'CMZ', type: 'full-time', maxHours: 40, primaryShop: 'carters', secondaryShops: ['zabbar'], isActive: true },

  // ========== CMZ - ZABBAR (2 primary) ==========
  { id: 'priscilla', name: 'Priscilla', company: 'CMZ', type: 'full-time', maxHours: 40, primaryShop: 'zabbar', secondaryShops: [], isActive: true },
  { id: 'amy', name: 'Amy', company: 'CMZ', type: 'full-time', maxHours: 40, primaryShop: 'zabbar', secondaryShops: [], isActive: true },

  // ========== CMZ - PART-TIMERS ==========
  { id: 'rose', name: 'Rose', company: 'CMZ', type: 'part-time', maxHours: 30, primaryShop: 'carters', secondaryShops: ['fgura', 'zabbar'], isActive: true },
  { id: 'danae', name: 'Danae', company: 'CMZ', type: 'part-time', maxHours: 30, primaryShop: 'fgura', secondaryShops: ['carters', 'zabbar'], isActive: true },
  { id: 'aimee', name: 'Aimee', company: 'CMZ', type: 'part-time', maxHours: 30, primaryShop: 'fgura', secondaryShops: ['carters', 'zabbar'], isActive: true }
];

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getEmployee(id: string): EmployeeConfig | undefined {
  return EMPLOYEES.find(e => e.id === id);
}

export function getEmployeeByName(name: string): EmployeeConfig | undefined {
  return EMPLOYEES.find(e => e.name.toLowerCase() === name.toLowerCase());
}

export function getActiveEmployees(): EmployeeConfig[] {
  return EMPLOYEES.filter(e => e.isActive);
}

export function getEmployeesByCompany(company: 'CMZ' | 'C&S'): EmployeeConfig[] {
  return EMPLOYEES.filter(e => e.company === company && e.isActive);
}

export function getEmployeesByShop(shopId: string, primaryOnly: boolean = true): EmployeeConfig[] {
  if (primaryOnly) {
    return EMPLOYEES.filter(e => e.primaryShop === shopId && e.isActive);
  } else {
    return EMPLOYEES.filter(e => e.secondaryShops?.includes(shopId) && e.isActive);
  }
}

export function getPrimaryEmployees(shopId: string): EmployeeConfig[] {
  return EMPLOYEES.filter(e => e.primaryShop === shopId && e.isActive);
}

export function getSecondaryEmployees(shopId: string): EmployeeConfig[] {
  return EMPLOYEES.filter(e => e.secondaryShops?.includes(shopId) && e.isActive);
}

export function getFullTimers(): EmployeeConfig[] {
  return EMPLOYEES.filter(e => e.type === 'full-time' && e.isActive);
}

export function getPartTimers(): EmployeeConfig[] {
  return EMPLOYEES.filter(e => e.type === 'part-time' && e.isActive);
}

// These now accept employee ID (string) for easier use
export function canWorkDay(empId: string, day: DayOfWeek): boolean {
  const emp = getEmployee(empId);
  if (!emp) return false;
  if (emp.constraints?.offDays?.includes(day)) return false;
  return true;
}

export function canWorkShift(empId: string, shiftType: 'am' | 'pm'): boolean {
  const emp = getEmployee(empId);
  if (!emp) return false;
  if (emp.constraints?.morningsOnly && shiftType === 'pm') return false;
  if (emp.constraints?.eveningsOnly && shiftType === 'am') return false;
  return true;
}

export function isEmergencyOnly(empId: string): boolean {
  const emp = getEmployee(empId);
  return emp?.constraints?.isEmergencyOnly === true;
}
