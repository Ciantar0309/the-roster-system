// ============================================
// THE ROSTER SYSTEM - ROSTER GENERATOR v5.4
// No days off | Flexible shifts 5h-15h | Full coverage
// Trim overtime | Full day reduces AM | Failsafe with Maria
// ============================================

import {
  DayOfWeek,
  ShopConfig,
  getShop,
  getActiveShops,
  SHOPS
} from '../config/shops';

import {
  EmployeeConfig,
  getEmployee,
  getEmployeesByShop,
  EMPLOYEES
} from '../config/employees';

// Types
interface GeneratedShift {
  id: string;
  odooCode: string;
  shopId: string;
  shopName: string;
  employeeId: string;
  employeeName: string;
  day: DayOfWeek;
  date: string;
  startTime: string;
  endTime: string;
  hours: number;
  shiftType: 'morning' | 'evening' | 'fullDay';
  isOvertime: boolean;
}

interface UnfilledSlot {
  shopId: string;
  shopName: string;
  day: DayOfWeek;
  shiftType: 'AM' | 'PM';
  needed: number;
  filled: number;
}

interface EmployeeSummary {
  employeeId: string;
  employeeName: string;
  totalHours: number;
  weekdayHours: number;
  sundayHours: number;
  shifts: GeneratedShift[];
  daysWorked: number;
}

interface ShopCoverage {
  shopId: string;
  shopName: string;
  totalSlots: number;
  filledSlots: number;
  coverage: number;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

interface GeneratedRoster {
  weekStart: string;
  weekEnd: string;
  summary: {
    totalShifts: number;
    totalHours: number;
    coverage: number;
    employeesAt40h: number;
    employeesUnder40h: number;
    employeesOver40h: number;
    unfilledSlots: number;
  };
  data: {
    shifts: GeneratedShift[];
    unfilledSlots: UnfilledSlot[];
    employeeSummaries: EmployeeSummary[];
    shopCoverage: ShopCoverage[];
  };
  validation: ValidationResult;
}

// Constants
const FULL_TIME_TARGET = 40 * 60;
const FULL_TIME_MIN = 38 * 60;
const FULL_TIME_MAX = 42 * 60;
const PART_TIME_MAX = 30 * 60;
const MIN_SHIFT = 5 * 60;
const WEEKDAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const ALL_DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

// CMZ Employee Configuration
const CMZ_CONFIG = {
  fullTimers: {
    zabbar: ['amy', 'priscilla'],
    fgura: ['caroline', 'claire', 'chantel'],
    carters: ['rabi', 'anthony', 'joseph', 'mariella']
  },
  partTimers: {
    carters: ['rose'],
    allCMZ: ['danae', 'aimee']
  },
  secondary: {
    'chantel': ['zabbar'],
    'amy': ['fgura']
  },
  failsafe: ['maria']
};

// Shop configurations with staffing needs
const SHOP_CONFIG: Record<string, {
  company: 'CMZ' | 'CS';
  hours: Record<string, { open: string; close: string }>;
  staffing: Record<string, { am: number; pm: number }>;
  specialShifts?: Record<string, { start: string; end: string }[]>;
  notes?: string[];
}> = {
  'hamrun': {
    company: 'CS',
    hours: {
      'monday': { open: '06:30', close: '21:30' },
      'tuesday': { open: '06:30', close: '21:30' },
      'wednesday': { open: '06:30', close: '21:30' },
      'thursday': { open: '06:30', close: '21:30' },
      'friday': { open: '06:30', close: '21:30' },
      'saturday': { open: '06:30', close: '21:30' },
      'sunday': { open: '07:30', close: '19:30' }
    },
    staffing: {
      'monday': { am: 4, pm: 2 },
      'tuesday': { am: 3, pm: 2 },
      'wednesday': { am: 3, pm: 2 },
      'thursday': { am: 3, pm: 2 },
      'friday': { am: 3, pm: 2 },
      'saturday': { am: 4, pm: 2 },
      'sunday': { am: 2, pm: 2 }
    },
    notes: ['1 Full Day reduces 1 from AM']
  },
  'tigne-point': {
    company: 'CS',
    hours: {
      'monday': { open: '08:00', close: '20:30' },
      'tuesday': { open: '08:00', close: '20:30' },
      'wednesday': { open: '08:00', close: '20:30' },
      'thursday': { open: '08:00', close: '20:30' },
      'friday': { open: '08:00', close: '20:30' },
      'saturday': { open: '08:00', close: '20:30' },
      'sunday': { open: '08:00', close: '20:30' }
    },
    staffing: {
      'monday': { am: 1, pm: 1 },
      'tuesday': { am: 1, pm: 1 },
      'wednesday': { am: 1, pm: 1 },
      'thursday': { am: 1, pm: 1 },
      'friday': { am: 1, pm: 1 },
      'saturday': { am: 1, pm: 1 },
      'sunday': { am: 1, pm: 1 }
    }
  },
  'siggiewi': {
    company: 'CS',
    hours: {
      'monday': { open: '06:30', close: '21:30' },
      'tuesday': { open: '06:30', close: '21:30' },
      'wednesday': { open: '06:30', close: '21:30' },
      'thursday': { open: '06:30', close: '21:30' },
      'friday': { open: '06:30', close: '21:30' },
      'saturday': { open: '06:30', close: '21:30' },
      'sunday': { open: '07:30', close: '20:00' }
    },
    staffing: {
      'monday': { am: 1, pm: 1 },
      'tuesday': { am: 1, pm: 1 },
      'wednesday': { am: 1, pm: 1 },
      'thursday': { am: 1, pm: 1 },
      'friday': { am: 1, pm: 1 },
      'saturday': { am: 1, pm: 1 },
      'sunday': { am: 1, pm: 1 }
    },
    specialShifts: {
      'saturday': [
        { start: '06:30', end: '14:00' },
        { start: '10:00', end: '21:30' }
      ]
    },
    notes: ['Ricky Monday OFF', 'Anus Wednesday OFF']
  },
  'marsaxlokk': {
    company: 'CS',
    hours: {
      'monday': { open: '06:30', close: '21:30' },
      'tuesday': { open: '06:30', close: '21:30' },
      'wednesday': { open: '06:30', close: '21:30' },
      'thursday': { open: '06:30', close: '21:30' },
      'friday': { open: '06:30', close: '21:30' },
      'saturday': { open: '06:30', close: '21:30' },
      'sunday': { open: '06:30', close: '21:30' }
    },
    staffing: {
      'monday': { am: 1, pm: 1 },
      'tuesday': { am: 1, pm: 1 },
      'wednesday': { am: 1, pm: 1 },
      'thursday': { am: 1, pm: 1 },
      'friday': { am: 1, pm: 1 },
      'saturday': { am: 1, pm: 1 },
      'sunday': { am: 1, pm: 1 }
    }
  },
  'marsascala': {
    company: 'CS',
    hours: {
      'monday': { open: '06:30', close: '21:30' },
      'tuesday': { open: '06:30', close: '21:30' },
      'wednesday': { open: '06:30', close: '21:30' },
      'thursday': { open: '06:30', close: '21:30' },
      'friday': { open: '06:30', close: '21:30' },
      'saturday': { open: '06:30', close: '21:30' },
      'sunday': { open: '06:30', close: '21:30' }
    },
    staffing: {
      'monday': { am: 1, pm: 1 },
      'tuesday': { am: 1, pm: 1 },
      'wednesday': { am: 1, pm: 1 },
      'thursday': { am: 1, pm: 1 },
      'friday': { am: 1, pm: 1 },
      'saturday': { am: 2, pm: 1 },
      'sunday': { am: 2, pm: 2 }
    },
    specialShifts: {
      'saturday': [
        { start: '06:30', end: '21:30' },
        { start: '06:30', end: '15:00' }
      ],
      'sunday': [
        { start: '06:30', end: '21:30' },
        { start: '10:00', end: '16:00' }
      ]
    }
  },
  'mellieha': {
    company: 'CS',
    hours: {
      'monday': { open: '06:30', close: '21:30' },
      'tuesday': { open: '06:30', close: '21:30' },
      'wednesday': { open: '06:30', close: '21:30' },
      'thursday': { open: '06:30', close: '21:30' },
      'friday': { open: '06:30', close: '21:30' },
      'saturday': { open: '06:30', close: '21:30' },
      'sunday': { open: '06:30', close: '21:30' }
    },
    staffing: {
      'monday': { am: 1, pm: 1 },
      'tuesday': { am: 1, pm: 1 },
      'wednesday': { am: 1, pm: 1 },
      'thursday': { am: 1, pm: 1 },
      'friday': { am: 1, pm: 1 },
      'saturday': { am: 1, pm: 1 },
      'sunday': { am: 1, pm: 1 }
    }
  },
  'rabat': {
    company: 'CS',
    hours: {
      'monday': { open: '06:30', close: '21:30' },
      'tuesday': { open: '06:30', close: '21:30' },
      'wednesday': { open: '06:30', close: '21:30' },
      'thursday': { open: '06:30', close: '21:30' },
      'friday': { open: '06:30', close: '21:30' },
      'saturday': { open: '06:30', close: '21:30' },
      'sunday': { open: '06:30', close: '21:30' }
    },
    staffing: {
      'monday': { am: 1, pm: 1 },
      'tuesday': { am: 1, pm: 1 },
      'wednesday': { am: 1, pm: 1 },
      'thursday': { am: 1, pm: 1 },
      'friday': { am: 1, pm: 1 },
      'saturday': { am: 1, pm: 1 },
      'sunday': { am: 1, pm: 1 }
    }
  },
  'fgura': {
    company: 'CMZ',
    hours: {
      'monday': { open: '07:00', close: '19:00' },
      'tuesday': { open: '07:00', close: '19:00' },
      'wednesday': { open: '07:00', close: '19:00' },
      'thursday': { open: '07:00', close: '19:00' },
      'friday': { open: '07:00', close: '20:00' },
      'saturday': { open: '07:00', close: '19:00' },
      'sunday': { open: '08:00', close: '13:00' }
    },
    staffing: {
      'monday': { am: 3, pm: 2 },
      'tuesday': { am: 2, pm: 2 },
      'wednesday': { am: 2, pm: 2 },
      'thursday': { am: 2, pm: 2 },
      'friday': { am: 2, pm: 2 },
      'saturday': { am: 3, pm: 2 },
      'sunday': { am: 2, pm: 0 }
    },
    notes: ['1 Full Day reduces 1 from AM', 'Sunday 08:00-13:00 only']
  },
  'carters': {
    company: 'CMZ',
    hours: {
      'monday': { open: '07:00', close: '19:00' },
      'tuesday': { open: '07:00', close: '19:00' },
      'wednesday': { open: '07:00', close: '19:00' },
      'thursday': { open: '07:00', close: '19:00' },
      'friday': { open: '07:00', close: '20:00' },
      'saturday': { open: '07:00', close: '19:00' },
      'sunday': { open: '08:00', close: '13:00' }
    },
    staffing: {
      'monday': { am: 3, pm: 2 },
      'tuesday': { am: 3, pm: 2 },
      'wednesday': { am: 3, pm: 2 },
      'thursday': { am: 3, pm: 2 },
      'friday': { am: 3, pm: 2 },
      'saturday': { am: 3, pm: 2 },
      'sunday': { am: 2, pm: 0 }
    },
    notes: ['1 Full Day reduces 1 from AM']
  },
  'zabbar': {
    company: 'CMZ',
    hours: {
      'monday': { open: '07:00', close: '19:00' },
      'tuesday': { open: '07:00', close: '19:00' },
      'wednesday': { open: '07:00', close: '19:00' },
      'thursday': { open: '07:00', close: '19:00' },
      'friday': { open: '07:00', close: '19:00' },
      'saturday': { open: '07:00', close: '19:00' },
      'sunday': { open: 'CLOSED', close: 'CLOSED' }
    },
    staffing: {
      'monday': { am: 2, pm: 1 },
      'tuesday': { am: 2, pm: 1 },
      'wednesday': { am: 1, pm: 1 },
      'thursday': { am: 1, pm: 1 },
      'friday': { am: 1, pm: 1 },
      'saturday': { am: 2, pm: 1 },
      'sunday': { am: 0, pm: 0 }
    },
    notes: ['CLOSED Sunday']
  }
};

// Employee-specific rules
const EMPLOYEE_RULES: Record<string, { dayOff?: DayOfWeek; stubborn?: boolean; backup?: string[] }> = {
  'ciro': { stubborn: true },
  'ricky': { dayOff: 'monday' },
  'anus': { dayOff: 'wednesday' }
};

const TIGNE_BACKUP = ['sirjana', 'passang'];

// Part-timer IDs
const PART_TIMERS = ['rose', 'danae', 'aimee'];

class RosterGenerator {
  private shifts: GeneratedShift[] = [];
  private employeeHours: Map<string, number> = new Map();
  private employeeWeekdayHours: Map<string, number> = new Map();
  private employeeSundayHours: Map<string, number> = new Map();
  private employeeDailyShifts: Map<string, Map<DayOfWeek, number>> = new Map();
  private slotTracker: Map<string, { am: number; pm: number }> = new Map();
  private weekStartDate: string;
  private shiftCounter: number = 0;

  constructor(weekStartDate: string) {
    this.weekStartDate = weekStartDate;
    this.initializeTrackers();
  }

  private initializeTrackers(): void {
    EMPLOYEES.forEach(emp => {
      this.employeeHours.set(emp.id, 0);
      this.employeeWeekdayHours.set(emp.id, 0);
      this.employeeSundayHours.set(emp.id, 0);
      this.employeeDailyShifts.set(emp.id, new Map());
    });

    Object.keys(SHOP_CONFIG).forEach(shopId => {
      ALL_DAYS.forEach(day => {
        const key = `${shopId}-${day}`;
        const staffing = SHOP_CONFIG[shopId].staffing[day] || { am: 0, pm: 0 };
        this.slotTracker.set(key, { am: staffing.am, pm: staffing.pm });
      });
    });
  }

  private isPartTimer(empId: string): boolean {
    return PART_TIMERS.includes(empId);
  }

  private getMaxHours(empId: string): number {
    return this.isPartTimer(empId) ? PART_TIME_MAX : FULL_TIME_MAX;
  }

  private getShopHours(shopId: string, day: DayOfWeek): { open: string; close: string } | null {
    const config = SHOP_CONFIG[shopId];
    if (!config) return null;
    const hours = config.hours[day];
    if (!hours || hours.open === 'CLOSED') return null;
    return hours;
  }

  private calculateHours(start: string, end: string): number {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return (endH * 60 + endM - startH * 60 - startM) / 60;
  }

  private getEmployeeCurrentHours(empId: string, weekdayOnly: boolean = false): number {
    if (weekdayOnly) {
      return this.employeeWeekdayHours.get(empId) || 0;
    }
    return this.employeeHours.get(empId) || 0;
  }

  private canAssignEmployee(empId: string, day: DayOfWeek, hours: number): boolean {
    const emp = getEmployee(empId);
    if (!emp || !emp.isActive) return false;

    const rules = EMPLOYEE_RULES[empId];
    if (rules?.dayOff === day) return false;

    const dailyShifts = this.employeeDailyShifts.get(empId)?.get(day) || 0;
    if (dailyShifts >= 2) return false;
    if (dailyShifts >= 1 && hours > 8) return false;

    const maxHours = this.getMaxHours(empId);

    if (day !== 'sunday') {
      const weekdayHours = this.employeeWeekdayHours.get(empId) || 0;
      if (weekdayHours + (hours * 60) > maxHours) return false;
    }

    return true;
  }

  private hasShiftOnDay(empId: string, day: DayOfWeek, shopId: string): boolean {
    return this.shifts.some(s => s.employeeId === empId && s.day === day && s.shopId === shopId);
  }

  private addShift(
    shopId: string,
    empId: string,
    day: DayOfWeek,
    start: string,
    end: string,
    shiftType: 'morning' | 'evening' | 'fullDay'
  ): GeneratedShift | null {
    const shop = getShop(shopId);
    const emp = getEmployee(empId);
    if (!shop || !emp) return null;

    const hours = this.calculateHours(start, end);
    if (hours < 0.5) return null;

    // Check for duplicate shift
    const existingShift = this.shifts.find(s => 
      s.employeeId === empId && 
      s.day === day && 
      s.startTime === start && 
      s.endTime === end
    );
    if (existingShift) {
      console.log(`    ! Duplicate shift skipped: ${emp.name} ${day} ${start}-${end}`);
      return null;
    }

    this.shiftCounter++;
    const shift: GeneratedShift = {
      id: `shift-${this.shiftCounter}`,
      odooCode: `${shop.id.toUpperCase()}-${day.substring(0, 3).toUpperCase()}-${this.shiftCounter}`,
      shopId: shop.id,
      shopName: shop.name,
      employeeId: emp.id,
      employeeName: emp.name,
      day,
      date: this.getDateForDay(day),
      startTime: start,
      endTime: end,
      hours,
      shiftType,
      isOvertime: false
    };

    this.shifts.push(shift);

    const hoursInMinutes = hours * 60;
    this.employeeHours.set(empId, (this.employeeHours.get(empId) || 0) + hoursInMinutes);
    
    if (day === 'sunday') {
      this.employeeSundayHours.set(empId, (this.employeeSundayHours.get(empId) || 0) + hoursInMinutes);
    } else {
      this.employeeWeekdayHours.set(empId, (this.employeeWeekdayHours.get(empId) || 0) + hoursInMinutes);
    }

    const dailyMap = this.employeeDailyShifts.get(empId);
    if (dailyMap) {
      const current = dailyMap.get(day) || 0;
      dailyMap.set(day, current + (shiftType === 'fullDay' ? 2 : 1));
    }

    console.log(`    + ${emp.name} -> ${shop.name} ${day} ${start}-${end} (${hours.toFixed(1)}h)`);
    return shift;
  }

  private decrementSlot(shopId: string, day: DayOfWeek, slotType: 'am' | 'pm', isFullDay: boolean = false): void {
    const key = `${shopId}-${day}`;
    const slots = this.slotTracker.get(key);
    if (slots) {
      if (isFullDay) {
        slots.am = Math.max(0, slots.am - 1);
        slots.pm = Math.max(0, slots.pm - 1);
      } else {
        slots[slotType] = Math.max(0, slots[slotType] - 1);
      }
    }
  }

  private getDateForDay(day: DayOfWeek): string {
    const dayIndex = ALL_DAYS.indexOf(day);
    const start = new Date(this.weekStartDate);
    start.setDate(start.getDate() + dayIndex);
    return start.toISOString().split('T')[0];
  }

  private getSlotsNeeded(shopId: string, day: DayOfWeek): { am: number; pm: number } {
    const key = `${shopId}-${day}`;
    return this.slotTracker.get(key) || { am: 0, pm: 0 };
  }

  // ===== PHASE 1: TIGNE POINT (Ciro + Backup) =====
  private assignTignePoint(): void {
    console.log('\n=== TIGNE POINT ===');
    const shopId = 'tigne-point';

    ALL_DAYS.forEach(day => {
      const hours = this.getShopHours(shopId, day);
      if (!hours) return;

      const slots = this.getSlotsNeeded(shopId, day);
      const midPoint = '14:00';

      if (slots.am > 0 && this.canAssignEmployee('ciro', day, 6)) {
        this.addShift(shopId, 'ciro', day, hours.open, midPoint, 'morning');
        this.decrementSlot(shopId, day, 'am');
      }

      if (slots.pm > 0) {
        for (const backupId of TIGNE_BACKUP) {
          if (this.canAssignEmployee(backupId, day, 6.5)) {
            this.addShift(shopId, backupId, day, midPoint, hours.close, 'evening');
            this.decrementSlot(shopId, day, 'pm');
            break;
          }
        }
      }
    });
  }

  // ===== PHASE 2: SIGGIEWI (Special Saturday + Day offs) =====
  private assignSiggiewi(): void {
    console.log('\n=== SIGGIEWI ===');
    const shopId = 'siggiewi';
    const primary = ['ricky', 'anus'];

    ALL_DAYS.forEach(day => {
      const hours = this.getShopHours(shopId, day);
      if (!hours) return;

      const slots = this.getSlotsNeeded(shopId, day);
      const config = SHOP_CONFIG[shopId];

      if (day === 'saturday' && config.specialShifts?.saturday) {
        const specialShifts = config.specialShifts.saturday;
        let shiftIndex = 0;
        for (const empId of primary) {
          if (shiftIndex < specialShifts.length && this.canAssignEmployee(empId, day, 8)) {
            const special = specialShifts[shiftIndex];
            this.addShift(shopId, empId, day, special.start, special.end, 'morning');
            this.decrementSlot(shopId, day, 'am');
            shiftIndex++;
          }
        }
        return;
      }

      const availablePrimary = primary.filter(id => this.canAssignEmployee(id, day, 15));
      
      if (availablePrimary.length > 0) {
        const emp = availablePrimary[0];
        this.addShift(shopId, emp, day, hours.open, hours.close, 'fullDay');
        this.decrementSlot(shopId, day, 'am', true);
      } else {
        if (slots.am > 0) {
          for (const empId of primary) {
            if (this.canAssignEmployee(empId, day, 7.5)) {
              this.addShift(shopId, empId, day, hours.open, '14:00', 'morning');
              this.decrementSlot(shopId, day, 'am');
              break;
            }
          }
        }
        if (slots.pm > 0) {
          for (const empId of primary) {
            if (this.canAssignEmployee(empId, day, 7.5)) {
              this.addShift(shopId, empId, day, '14:00', hours.close, 'evening');
              this.decrementSlot(shopId, day, 'pm');
              break;
            }
          }
        }
      }
    });
  }

  // ===== PHASE 3: TWO-PERSON C&S SHOPS =====
  private assignTwoPersonShop(shopId: string, primaryStaff: string[]): void {
    console.log(`\n=== ${shopId.toUpperCase()} ===`);

    ALL_DAYS.forEach(day => {
      const hours = this.getShopHours(shopId, day);
      if (!hours) return;

      const slots = this.getSlotsNeeded(shopId, day);
      const config = SHOP_CONFIG[shopId];

      if (config.specialShifts?.[day]) {
        const specialShifts = config.specialShifts[day];
        let shiftIndex = 0;
        for (const empId of primaryStaff) {
          if (shiftIndex < specialShifts.length && this.canAssignEmployee(empId, day, 8)) {
            const special = specialShifts[shiftIndex];
            const shiftHours = this.calculateHours(special.start, special.end);
            const shiftType = shiftHours > 10 ? 'fullDay' : (special.start < '12:00' ? 'morning' : 'evening');
            this.addShift(shopId, empId, day, special.start, special.end, shiftType);
            if (shiftType === 'fullDay') {
              this.decrementSlot(shopId, day, 'am', true);
            } else {
              this.decrementSlot(shopId, day, special.start < '12:00' ? 'am' : 'pm');
            }
            shiftIndex++;
          }
        }
        return;
      }

      const dayIndex = ALL_DAYS.indexOf(day);
      const orderedStaff = dayIndex % 2 === 0 ? primaryStaff : [...primaryStaff].reverse();

      let assigned = false;
      for (const empId of orderedStaff) {
        if (this.canAssignEmployee(empId, day, 15)) {
          this.addShift(shopId, empId, day, hours.open, hours.close, 'fullDay');
          this.decrementSlot(shopId, day, 'am', true);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        if (slots.am > 0) {
          for (const empId of orderedStaff) {
            if (this.canAssignEmployee(empId, day, 7.5)) {
              this.addShift(shopId, empId, day, hours.open, '14:00', 'morning');
              this.decrementSlot(shopId, day, 'am');
              break;
            }
          }
        }
        if (slots.pm > 0) {
          for (const empId of orderedStaff) {
            if (this.canAssignEmployee(empId, day, 7.5)) {
              this.addShift(shopId, empId, day, '14:00', hours.close, 'evening');
              this.decrementSlot(shopId, day, 'pm');
              break;
            }
          }
        }
      }
    });
  }

  // ===== PHASE 4: HAMRUN (High staffing needs) =====
  private assignHamrun(): void {
    console.log('\n=== HAMRUN ===');
    const shopId = 'hamrun';
    const primaryStaff = ['kamal', 'laxmi', 'arjun', 'imran', 'gopal', 'passang'];

    ALL_DAYS.forEach(day => {
      const hours = this.getShopHours(shopId, day);
      if (!hours) return;

      let slots = this.getSlotsNeeded(shopId, day);
      const midPoint = '14:00';

      let fullDaysAssigned = 0;
      for (const empId of primaryStaff) {
        if (slots.am > 1 && slots.pm > 0 && fullDaysAssigned < 1) {
          if (this.canAssignEmployee(empId, day, 15)) {
            this.addShift(shopId, empId, day, hours.open, hours.close, 'fullDay');
            this.decrementSlot(shopId, day, 'am', true);
            fullDaysAssigned++;
            slots = this.getSlotsNeeded(shopId, day);
          }
        }
      }

      for (const empId of primaryStaff) {
        if (slots.am <= 0) break;
        if (this.canAssignEmployee(empId, day, 7.5)) {
          this.addShift(shopId, empId, day, hours.open, midPoint, 'morning');
          this.decrementSlot(shopId, day, 'am');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      for (const empId of primaryStaff) {
        if (slots.pm <= 0) break;
        if (this.canAssignEmployee(empId, day, 7.5)) {
          this.addShift(shopId, empId, day, midPoint, hours.close, 'evening');
          this.decrementSlot(shopId, day, 'pm');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }
    });
  }

  // ===== PHASE 5: ZABBAR (Amy + Priscilla primary, Chantel secondary) =====
  private assignZabbar(): void {
    console.log('\n=== ZABBAR ===');
    const shopId = 'zabbar';
    const primaryStaff = ['amy', 'priscilla'];
    const secondaryStaff = ['chantel'];

    WEEKDAYS.forEach(day => {
      const hours = this.getShopHours(shopId, day);
      if (!hours) return;

      let slots = this.getSlotsNeeded(shopId, day);
      const midPoint = '13:00';
      const closeTime = hours.close;

      // Sort by lowest hours first
      const sortedPrimary = [...primaryStaff].sort((a, b) => {
        const hoursA = this.employeeWeekdayHours.get(a) || 0;
        const hoursB = this.employeeWeekdayHours.get(b) || 0;
        return hoursA - hoursB;
      });

      // Try full days first
      let fullDaysAssigned = 0;
      const maxFullDays = Math.min(slots.am - 1, slots.pm);

      for (const empId of sortedPrimary) {
        if (fullDaysAssigned >= maxFullDays || slots.am <= 1 || slots.pm <= 0) break;
        const currentHours = (this.employeeWeekdayHours.get(empId) || 0) / 60;
        if (currentHours < 30 && this.canAssignEmployee(empId, day, 12)) {
          this.addShift(shopId, empId, day, hours.open, closeTime, 'fullDay');
          this.decrementSlot(shopId, day, 'am', true);
          fullDaysAssigned++;
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      // Fill AM with primary
      for (const empId of sortedPrimary) {
        if (slots.am <= 0) break;
        if (this.canAssignEmployee(empId, day, 6)) {
          this.addShift(shopId, empId, day, hours.open, midPoint, 'morning');
          this.decrementSlot(shopId, day, 'am');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      // Fill PM with primary
      for (const empId of sortedPrimary) {
        if (slots.pm <= 0) break;
        if (this.canAssignEmployee(empId, day, 6)) {
          this.addShift(shopId, empId, day, midPoint, closeTime, 'evening');
          this.decrementSlot(shopId, day, 'pm');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      // If still gaps, use Chantel (secondary)
      if (slots.am > 0 || slots.pm > 0) {
        for (const empId of secondaryStaff) {
          if (slots.am > 0 && this.canAssignEmployee(empId, day, 6)) {
            this.addShift(shopId, empId, day, hours.open, midPoint, 'morning');
            this.decrementSlot(shopId, day, 'am');
            slots = this.getSlotsNeeded(shopId, day);
          }
          if (slots.pm > 0 && this.canAssignEmployee(empId, day, 6)) {
            this.addShift(shopId, empId, day, midPoint, closeTime, 'evening');
            this.decrementSlot(shopId, day, 'pm');
            slots = this.getSlotsNeeded(shopId, day);
          }
        }
      }
    });
  }

  // ===== PHASE 6: FGURA (Caroline, Claire, Chantel + part-timers) =====
  private assignFgura(): void {
    console.log('\n=== FGURA ===');
    const shopId = 'fgura';
    const fullTimers = ['caroline', 'claire', 'chantel'];
    const partTimers = ['danae', 'aimee', 'rose'];

    ALL_DAYS.forEach(day => {
      const hours = this.getShopHours(shopId, day);
      if (!hours) return;

      let slots = this.getSlotsNeeded(shopId, day);
      
      // Sunday special
      if (day === 'sunday') {
        const allStaff = [...fullTimers, ...partTimers];
        for (const empId of allStaff) {
          if (slots.am <= 0) break;
          if (this.canAssignEmployee(empId, day, 5)) {
            this.addShift(shopId, empId, day, hours.open, '13:00', 'morning');
            this.decrementSlot(shopId, day, 'am');
            slots = this.getSlotsNeeded(shopId, day);
          }
        }
        return;
      }

      const midPoint = '13:00';
      const closeTime = hours.close;

      // Sort full-timers by lowest hours
      const sortedFullTimers = [...fullTimers].sort((a, b) => {
        const hoursA = this.employeeWeekdayHours.get(a) || 0;
        const hoursB = this.employeeWeekdayHours.get(b) || 0;
        return hoursA - hoursB;
      });

      // Try full days first with full-timers
      let fullDaysAssigned = 0;
      const maxFullDays = Math.min(slots.am - 1, slots.pm);

      for (const empId of sortedFullTimers) {
        if (fullDaysAssigned >= maxFullDays || slots.am <= 1) break;
        const currentHours = (this.employeeWeekdayHours.get(empId) || 0) / 60;
        if (currentHours < 30 && this.canAssignEmployee(empId, day, 12)) {
          this.addShift(shopId, empId, day, hours.open, closeTime, 'fullDay');
          this.decrementSlot(shopId, day, 'am', true);
          fullDaysAssigned++;
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      // Fill AM with full-timers first
      for (const empId of sortedFullTimers) {
        if (slots.am <= 0) break;
        if (this.canAssignEmployee(empId, day, 6)) {
          this.addShift(shopId, empId, day, hours.open, midPoint, 'morning');
          this.decrementSlot(shopId, day, 'am');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      // Fill PM with full-timers
      for (const empId of sortedFullTimers) {
        if (slots.pm <= 0) break;
        if (this.canAssignEmployee(empId, day, 6)) {
          this.addShift(shopId, empId, day, midPoint, closeTime, 'evening');
          this.decrementSlot(shopId, day, 'pm');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      // Then part-timers for remaining slots
      for (const empId of partTimers) {
        if (slots.am <= 0) break;
        if (this.canAssignEmployee(empId, day, 6)) {
          this.addShift(shopId, empId, day, hours.open, midPoint, 'morning');
          this.decrementSlot(shopId, day, 'am');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      for (const empId of partTimers) {
        if (slots.pm <= 0) break;
        if (this.canAssignEmployee(empId, day, 6)) {
          this.addShift(shopId, empId, day, midPoint, closeTime, 'evening');
          this.decrementSlot(shopId, day, 'pm');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }
    });
  }

  // ===== PHASE 7: CARTERS (Rabi, Anthony, Joseph, Mariella + Rose part-timer) =====
  private assignCarters(): void {
    console.log('\n=== CARTERS ===');
    const shopId = 'carters';
    const fullTimers = ['rabi', 'anthony', 'joseph', 'mariella'];
    const partTimers = ['rose', 'danae', 'aimee'];

    ALL_DAYS.forEach(day => {
      const hours = this.getShopHours(shopId, day);
      if (!hours) return;

      let slots = this.getSlotsNeeded(shopId, day);
      
      // Sunday special
      if (day === 'sunday') {
        const allStaff = [...fullTimers, ...partTimers];
        for (const empId of allStaff) {
          if (slots.am <= 0) break;
          if (this.canAssignEmployee(empId, day, 5)) {
            this.addShift(shopId, empId, day, hours.open, '13:00', 'morning');
            this.decrementSlot(shopId, day, 'am');
            slots = this.getSlotsNeeded(shopId, day);
          }
        }
        return;
      }

      const midPoint = '13:00';
      const closeTime = hours.close;

      // Sort full-timers by lowest hours
      const sortedFullTimers = [...fullTimers].sort((a, b) => {
        const hoursA = this.employeeWeekdayHours.get(a) || 0;
        const hoursB = this.employeeWeekdayHours.get(b) || 0;
        return hoursA - hoursB;
      });

      // Try full days first
      let fullDaysAssigned = 0;
      const maxFullDays = Math.min(slots.am - 1, slots.pm);

      for (const empId of sortedFullTimers) {
        if (fullDaysAssigned >= maxFullDays || slots.am <= 1) break;
        const currentHours = (this.employeeWeekdayHours.get(empId) || 0) / 60;
        if (currentHours < 30 && this.canAssignEmployee(empId, day, 12)) {
          this.addShift(shopId, empId, day, hours.open, closeTime, 'fullDay');
          this.decrementSlot(shopId, day, 'am', true);
          fullDaysAssigned++;
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      // Fill AM with full-timers
      for (const empId of sortedFullTimers) {
        if (slots.am <= 0) break;
        if (this.canAssignEmployee(empId, day, 6)) {
          this.addShift(shopId, empId, day, hours.open, midPoint, 'morning');
          this.decrementSlot(shopId, day, 'am');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      // Fill PM with full-timers
      for (const empId of sortedFullTimers) {
        if (slots.pm <= 0) break;
        if (this.canAssignEmployee(empId, day, 6)) {
          this.addShift(shopId, empId, day, midPoint, closeTime, 'evening');
          this.decrementSlot(shopId, day, 'pm');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      // Then part-timers
      for (const empId of partTimers) {
        if (slots.am <= 0) break;
        if (this.canAssignEmployee(empId, day, 6)) {
          this.addShift(shopId, empId, day, hours.open, midPoint, 'morning');
          this.decrementSlot(shopId, day, 'am');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }

      for (const empId of partTimers) {
        if (slots.pm <= 0) break;
        if (this.canAssignEmployee(empId, day, 6)) {
          this.addShift(shopId, empId, day, midPoint, closeTime, 'evening');
          this.decrementSlot(shopId, day, 'pm');
          slots = this.getSlotsNeeded(shopId, day);
        }
      }
    });
  }

  // ===== PHASE 8: FILL REMAINING GAPS =====
  private fillGaps(): void {
    console.log('\n=== FILLING GAPS ===');

    const getAvailableEmployeesByCompany = (company: 'CMZ' | 'CS', shopId: string): EmployeeConfig[] => {
      let companyEmployees: string[];
      
      if (company === 'CMZ') {
        // For CMZ, prioritize based on shop
        if (shopId === 'zabbar') {
          companyEmployees = ['amy', 'priscilla', 'chantel', 'danae', 'aimee'];
        } else if (shopId === 'fgura') {
          companyEmployees = ['caroline', 'claire', 'chantel', 'amy', 'danae', 'aimee', 'rose'];
        } else if (shopId === 'carters') {
          companyEmployees = ['rabi', 'anthony', 'joseph', 'mariella', 'rose', 'danae', 'aimee'];
        } else {
          companyEmployees = ['caroline', 'chantel', 'claire', 'danae', 'aimee', 'anthony', 'joseph', 'mariella', 'rabi', 'priscilla', 'amy', 'rose'];
        }
      } else {
        // C&S employees
        companyEmployees = ['kamal', 'laxmi', 'arjun', 'imran', 'gopal', 'passang', 'sirjana', 'ricky', 'anus', 'carina', 'pradib', 'anup', 'hasan', 'anju', 'aronia', 'joanne'];
      }
      
      return EMPLOYEES
        .filter(e => e.isActive && companyEmployees.includes(e.id))
        .filter(e => e.id !== 'ciro')
        .sort((a, b) => {
          const hoursA = this.employeeWeekdayHours.get(a.id) || 0;
          const hoursB = this.employeeWeekdayHours.get(b.id) || 0;
          return hoursA - hoursB;
        });
    };

    const dayPriority: DayOfWeek[] = ['saturday', 'friday', 'thursday', 'wednesday', 'tuesday', 'monday', 'sunday'];

    for (let pass = 0; pass < 5; pass++) {
      dayPriority.forEach(day => {
        Object.keys(SHOP_CONFIG).forEach(shopId => {
          const hours = this.getShopHours(shopId, day);
          if (!hours) return;

          let slots = this.getSlotsNeeded(shopId, day);
          if (slots.am <= 0 && slots.pm <= 0) return;

          const config = SHOP_CONFIG[shopId];
          const company = config.company;
          const isCMZ = company === 'CMZ';
          const midPoint = isCMZ ? '13:00' : '14:00';

          const employees = getAvailableEmployeesByCompany(company, shopId);

          while (slots.am > 0) {
            let filled = false;
            for (const emp of employees) {
              const weekdayHours = (this.employeeWeekdayHours.get(emp.id) || 0) / 60;
              const maxTarget = this.isPartTimer(emp.id) ? 30 : 40;
              const hoursNeeded = maxTarget - weekdayHours;
              
              if (hoursNeeded < 2.5) continue;
              
              const maxAMHours = this.calculateHours(hours.open, midPoint);
              const shiftHours = Math.min(Math.max(hoursNeeded, 5), maxAMHours);
              const actualShift = hoursNeeded < 5 ? hoursNeeded : shiftHours;
              
              const [startH, startM] = hours.open.split(':').map(Number);
              const endMinutes = startH * 60 + startM + (actualShift * 60);
              const endH = Math.floor(endMinutes / 60);
              const endM = endMinutes % 60;
              const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
              
              if (this.canAssignEmployee(emp.id, day, actualShift)) {
                this.addShift(shopId, emp.id, day, hours.open, endTime, 'morning');
                this.decrementSlot(shopId, day, 'am');
                console.log(`  Gap: ${emp.name} -> ${shopId} ${day} AM (${actualShift.toFixed(1)}h)`);
                slots = this.getSlotsNeeded(shopId, day);
                filled = true;
                break;
              }
            }
            if (!filled) break;
          }

          while (slots.pm > 0) {
            let filled = false;
            for (const emp of employees) {
              const weekdayHours = (this.employeeWeekdayHours.get(emp.id) || 0) / 60;
              const maxTarget = this.isPartTimer(emp.id) ? 30 : 40;
              const hoursNeeded = maxTarget - weekdayHours;
              
              if (hoursNeeded < 2.5) continue;
              
              const maxPMHours = this.calculateHours(midPoint, hours.close);
              const shiftHours = Math.min(Math.max(hoursNeeded, 5), maxPMHours);
              const actualShift = hoursNeeded < 5 ? hoursNeeded : shiftHours;
              
              const [startH, startM] = midPoint.split(':').map(Number);
              const endMinutes = startH * 60 + startM + (actualShift * 60);
              const endH = Math.floor(endMinutes / 60);
              const endM = endMinutes % 60;
              const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
              
              if (this.canAssignEmployee(emp.id, day, actualShift)) {
                this.addShift(shopId, emp.id, day, midPoint, endTime, 'evening');
                this.decrementSlot(shopId, day, 'pm');
                console.log(`  Gap: ${emp.name} -> ${shopId} ${day} PM (${actualShift.toFixed(1)}h)`);
                slots = this.getSlotsNeeded(shopId, day);
                filled = true;
                break;
              }
            }
            if (!filled) break;
          }
        });
      });
    }

    // Special fix: Marsascala Sunday PM
    const marsascalaSundaySlots = this.getSlotsNeeded('marsascala', 'sunday');
    if (marsascalaSundaySlots.pm > 0) {
      const csEmployees = ['kamal', 'laxmi', 'arjun', 'imran', 'gopal', 'passang', 'ricky', 'anus', 'carina', 'pradib', 'hasan', 'anju', 'aronia', 'joanne'];
      for (const empId of csEmployees) {
        const weekdayHours = (this.employeeWeekdayHours.get(empId) || 0) / 60;
        if (weekdayHours >= 38 && this.canAssignEmployee(empId, 'sunday', 7.5)) {
          this.addShift('marsascala', empId, 'sunday', '14:00', '21:30', 'evening');
          this.decrementSlot('marsascala', 'sunday', 'pm');
          console.log(`  Gap: ${empId} -> marsascala sunday PM (bonus)`);
          break;
        }
      }
    }

    // Fix Fgura Saturday AM with part-timers
    const fguraSatSlots = this.getSlotsNeeded('fgura', 'saturday');
    if (fguraSatSlots.am > 0) {
      for (const ptId of ['rose', 'danae', 'aimee']) {
        const hours = (this.employeeWeekdayHours.get(ptId) || 0) / 60;
        if (hours < 30 && this.canAssignEmployee(ptId, 'saturday', 6)) {
          this.addShift('fgura', ptId, 'saturday', '07:00', '13:00', 'morning');
          this.decrementSlot('fgura', 'saturday', 'am');
          console.log(`  Gap: ${ptId} -> fgura saturday AM (6.0h)`);
          break;
        }
      }
    }
  }

  // ===== PHASE 9: FAILSAFE WITH MARIA =====
  private failsafe(): void {
    console.log('\n=== FAILSAFE (Maria) ===');
    
    // Check for any remaining unfilled slots
    let hasUnfilled = false;
    Object.keys(SHOP_CONFIG).forEach(shopId => {
      ALL_DAYS.forEach(day => {
        const slots = this.getSlotsNeeded(shopId, day);
        if (slots.am > 0 || slots.pm > 0) {
          hasUnfilled = true;
        }
      });
    });

    if (!hasUnfilled) {
      console.log('  No unfilled slots - Maria not needed');
      return;
    }

    console.log('  Activating Maria for unfilled slots...');
    
    // Maria can work any C&S shop
    const mariaShops = ['hamrun', 'tigne-point', 'siggiewi', 'marsaxlokk', 'marsascala', 'mellieha', 'rabat'];
    
    Object.keys(SHOP_CONFIG).forEach(shopId => {
      if (!mariaShops.includes(shopId)) return;
      
      ALL_DAYS.forEach(day => {
        const hours = this.getShopHours(shopId, day);
        if (!hours) return;

        let slots = this.getSlotsNeeded(shopId, day);
        const midPoint = '14:00';

        if (slots.am > 0 && this.canAssignEmployee('maria', day, 7.5)) {
          this.addShift(shopId, 'maria', day, hours.open, midPoint, 'morning');
          this.decrementSlot(shopId, day, 'am');
          console.log(`  Maria -> ${shopId} ${day} AM`);
          slots = this.getSlotsNeeded(shopId, day);
        }

        if (slots.pm > 0 && this.canAssignEmployee('maria', day, 7.5)) {
          this.addShift(shopId, 'maria', day, midPoint, hours.close, 'evening');
          this.decrementSlot(shopId, day, 'pm');
          console.log(`  Maria -> ${shopId} ${day} PM`);
        }
      });
    });
  }

  // ===== PHASE 10: BALANCE HOURS (Trim Overtime) =====
  private balanceHours(): void {
    console.log('\n=== BALANCING HOURS ===');

    console.log('  Trimming overtime...');
    EMPLOYEES.forEach(emp => {
      if (!emp.isActive) return;
      
      const maxTarget = this.isPartTimer(emp.id) ? 30 : 40;
      const weekdayHours = (this.employeeWeekdayHours.get(emp.id) || 0) / 60;
      
      if (weekdayHours > maxTarget) {
        const excess = weekdayHours - maxTarget;
        console.log(`  ${emp.name}: ${weekdayHours.toFixed(1)}h (${excess.toFixed(1)}h over)`);
        
        const empShifts = this.shifts
          .filter(s => s.employeeId === emp.id && s.day !== 'sunday')
          .filter(s => s.shiftType !== 'fullDay')
          .sort((a, b) => b.hours - a.hours);
        
        if (empShifts.length > 0) {
          const shiftToTrim = empShifts[0];
          const newHours = shiftToTrim.hours - excess;
          
          if (newHours >= 4) {
            const [startH, startM] = shiftToTrim.startTime.split(':').map(Number);
            const newEndMinutes = startH * 60 + startM + (newHours * 60);
            const newEndH = Math.floor(newEndMinutes / 60);
            const newEndM = newEndMinutes % 60;
            const newEndTime = `${newEndH.toString().padStart(2, '0')}:${newEndM.toString().padStart(2, '0')}`;
            
            console.log(`    Trimming ${shiftToTrim.shopName} ${shiftToTrim.day} ${shiftToTrim.startTime}-${shiftToTrim.endTime} (${shiftToTrim.hours}h) -> ${shiftToTrim.startTime}-${newEndTime} (${newHours.toFixed(1)}h)`);
            
            shiftToTrim.endTime = newEndTime;
            shiftToTrim.hours = newHours;
            
            const excessMinutes = excess * 60;
            this.employeeHours.set(emp.id, (this.employeeHours.get(emp.id) || 0) - excessMinutes);
            this.employeeWeekdayHours.set(emp.id, (this.employeeWeekdayHours.get(emp.id) || 0) - excessMinutes);
          }
        }
      }
    });

    console.log('\n  Staff needing hours:');
    EMPLOYEES.forEach(emp => {
      if (!emp.isActive) return;
      
      const maxTarget = this.isPartTimer(emp.id) ? 30 : 40;
      const weekdayHours = (this.employeeWeekdayHours.get(emp.id) || 0) / 60;
      const needed = maxTarget - weekdayHours;

      if (needed >= 5) {
        console.log(`    ${emp.name}: ${weekdayHours.toFixed(1)}h (needs ${needed.toFixed(1)}h more)`);
      }
    });
  }

  // ===== BUILD RESULTS =====
  private buildResult(): GeneratedRoster {
    const unfilledSlots: UnfilledSlot[] = [];
    
    Object.keys(SHOP_CONFIG).forEach(shopId => {
      ALL_DAYS.forEach(day => {
        const slots = this.getSlotsNeeded(shopId, day);
        const shop = getShop(shopId);
        if (!shop) return;

        if (slots.am > 0) {
          unfilledSlots.push({
            shopId,
            shopName: shop.name,
            day,
            shiftType: 'AM',
            needed: SHOP_CONFIG[shopId].staffing[day]?.am || 0,
            filled: (SHOP_CONFIG[shopId].staffing[day]?.am || 0) - slots.am
          });
        }
        if (slots.pm > 0) {
          unfilledSlots.push({
            shopId,
            shopName: shop.name,
            day,
            shiftType: 'PM',
            needed: SHOP_CONFIG[shopId].staffing[day]?.pm || 0,
            filled: (SHOP_CONFIG[shopId].staffing[day]?.pm || 0) - slots.pm
          });
        }
      });
    });

    const employeeSummaries: EmployeeSummary[] = EMPLOYEES.map(emp => ({
      employeeId: emp.id,
      employeeName: emp.name,
      totalHours: (this.employeeHours.get(emp.id) || 0) / 60,
      weekdayHours: (this.employeeWeekdayHours.get(emp.id) || 0) / 60,
      sundayHours: (this.employeeSundayHours.get(emp.id) || 0) / 60,
      shifts: this.shifts.filter(s => s.employeeId === emp.id),
      daysWorked: new Set(this.shifts.filter(s => s.employeeId === emp.id).map(s => s.day)).size
    }));

    const shopCoverage: ShopCoverage[] = Object.keys(SHOP_CONFIG).map(shopId => {
      const shop = getShop(shopId);
      let totalSlots = 0;
      let filledSlots = 0;

      ALL_DAYS.forEach(day => {
        const staffing = SHOP_CONFIG[shopId].staffing[day];
        if (staffing) {
          totalSlots += staffing.am + staffing.pm;
          const remaining = this.getSlotsNeeded(shopId, day);
          filledSlots += (staffing.am - remaining.am) + (staffing.pm - remaining.pm);
        }
      });

      return {
        shopId,
        shopName: shop?.name || shopId,
        totalSlots,
        filledSlots,
        coverage: totalSlots > 0 ? (filledSlots / totalSlots) * 100 : 100
      };
    });

    const totalSlots = shopCoverage.reduce((sum, s) => sum + s.totalSlots, 0);
    const totalFilled = shopCoverage.reduce((sum, s) => sum + s.filledSlots, 0);

    const at40h = employeeSummaries.filter(e => {
      const isPartTime = this.isPartTimer(e.employeeId);
      if (isPartTime) {
        return e.weekdayHours >= 25 && e.weekdayHours <= 30;
      }
      return e.weekdayHours >= 38 && e.weekdayHours <= 42;
    }).length;

    const under40h = employeeSummaries.filter(e => {
      const emp = getEmployee(e.employeeId);
      if (!emp?.isActive) return false;
      const isPartTime = this.isPartTimer(e.employeeId);
      if (isPartTime) {
        return e.weekdayHours < 25;
      }
      return e.weekdayHours < 38;
    }).length;

    const over40h = employeeSummaries.filter(e => {
      const isPartTime = this.isPartTimer(e.employeeId);
      if (isPartTime) {
        return e.weekdayHours > 30;
      }
      return e.weekdayHours > 42;
    }).length;

    return {
      weekStart: this.weekStartDate,
      weekEnd: this.getDateForDay('sunday'),
      summary: {
        totalShifts: this.shifts.length,
        totalHours: this.shifts.reduce((sum, s) => sum + s.hours, 0),
        coverage: totalSlots > 0 ? (totalFilled / totalSlots) * 100 : 100,
        employeesAt40h: at40h,
        employeesUnder40h: under40h,
        employeesOver40h: over40h,
        unfilledSlots: unfilledSlots.length
      },
      data: {
        shifts: this.shifts,
        unfilledSlots,
        employeeSummaries,
        shopCoverage
      },
      validation: this.validate(unfilledSlots, employeeSummaries)
    };
  }

  private validate(unfilledSlots: UnfilledSlot[], employeeSummaries: EmployeeSummary[]): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    unfilledSlots.forEach(slot => {
      errors.push(`${slot.shopName} ${slot.day} ${slot.shiftType}: needs staff`);
    });

    employeeSummaries.forEach(emp => {
      const employee = getEmployee(emp.employeeId);
      if (!employee?.isActive) return;
      
      const isPartTime = this.isPartTimer(emp.employeeId);
      const maxTarget = isPartTime ? 30 : 40;
      const minTarget = isPartTime ? 0 : 38;
      
      if (emp.weekdayHours < minTarget) {
        warnings.push(`${emp.employeeName}: ${emp.weekdayHours.toFixed(1)}h (under ${maxTarget}h)`);
      } else if (emp.weekdayHours > maxTarget + 2) {
        errors.push(`${emp.employeeName}: ${emp.weekdayHours.toFixed(1)}h (over ${maxTarget}h)`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public generate(): GeneratedRoster {
    console.log('\n============================================================');
    console.log('GENERATING ROSTER v5.4');
    console.log('Full-timers: 40h | Part-timers: 30h max | Failsafe: Maria');
    console.log('============================================================');

    // Phase 1: Tigne Point (Ciro + backup)
    this.assignTignePoint();

    // Phase 2: Siggiewi (special Saturday + day offs)
    this.assignSiggiewi();

    // Phase 3: Two-person C&S shops
    this.assignTwoPersonShop('marsaxlokk', ['carina', 'pradib']);
    this.assignTwoPersonShop('marsascala', ['anup', 'sirjana']);
    this.assignTwoPersonShop('mellieha', ['hasan', 'anju']);
    this.assignTwoPersonShop('rabat', ['aronia', 'joanne']);

    // Phase 4: Hamrun (high staffing)
    this.assignHamrun();

    // Phase 5: Zabbar (Amy + Priscilla primary, Chantel secondary)
    this.assignZabbar();

    // Phase 6: Fgura (Caroline, Claire, Chantel + part-timers)
    this.assignFgura();

    // Phase 7: Carters (Rabi, Anthony, Joseph, Mariella + Rose)
    this.assignCarters();

    // Phase 8: Fill gaps
    this.fillGaps();

    // Phase 9: Failsafe with Maria
    this.failsafe();

    // Phase 10: Balance hours (trim overtime)
    this.balanceHours();

    // Build and return result
    const result = this.buildResult();

    // Print summary
    console.log('\n============================================================');
    console.log('ROSTER COMPLETE');
    console.log(`Shifts: ${result.summary.totalShifts} | Coverage: ${result.summary.coverage.toFixed(1)}%`);
    console.log(`Unfilled: ${result.summary.unfilledSlots} | At target: ${result.summary.employeesAt40h} | Under: ${result.summary.employeesUnder40h} | Over: ${result.summary.employeesOver40h}`);
    console.log('============================================================');

    if (result.data.unfilledSlots.length > 0) {
      console.log('\nUNFILLED SLOTS:');
      result.data.unfilledSlots.forEach(slot => {
        console.log(`  - ${slot.shopName} ${slot.day} ${slot.shiftType}`);
      });
    }

    console.log('\nEMPLOYEE HOURS (Mon-Sat | +Sun):');
    console.log('  FULL-TIMERS (40h target):');
    result.data.employeeSummaries
      .filter(e => !this.isPartTimer(e.employeeId) && getEmployee(e.employeeId)?.isActive)
      .sort((a, b) => b.weekdayHours - a.weekdayHours)
      .forEach(emp => {
        const status = emp.weekdayHours >= 38 ? '✓' : '↓';
        const sunStr = emp.sundayHours > 0 ? ` +${emp.sundayHours.toFixed(0)}h Sun` : '';
        console.log(`    ${status} ${emp.employeeName.padEnd(12)} ${emp.weekdayHours.toFixed(1)}h${sunStr}`);
      });

    console.log('  PART-TIMERS (30h max):');
    result.data.employeeSummaries
      .filter(e => this.isPartTimer(e.employeeId) && getEmployee(e.employeeId)?.isActive)
      .sort((a, b) => b.weekdayHours - a.weekdayHours)
      .forEach(emp => {
        const status = emp.weekdayHours <= 30 ? '✓' : '↑';
        const sunStr = emp.sundayHours > 0 ? ` +${emp.sundayHours.toFixed(0)}h Sun` : '';
        console.log(`    ${status} ${emp.employeeName.padEnd(12)} ${emp.weekdayHours.toFixed(1)}h${sunStr}`);
      });

    return result;
  }
}

// Export function
export function generateRoster(weekStartDate: string): GeneratedRoster {
  const generator = new RosterGenerator(weekStartDate);
  return generator.generate();
}
