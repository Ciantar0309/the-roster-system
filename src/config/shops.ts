// ============================================
// THE ROSTER SYSTEM - SHOP CONFIGURATION
// ============================================

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface TimeRange {
  open: string;
  close: string;
}

export interface StaffingRequirement {
  am: number;
  pm: number;
}

export interface SpecialShift {
  start: string;
  end: string;
  label: string;
}

export interface DayConfig {
  hours: TimeRange | null;
  staffing: StaffingRequirement | null;
  specialShifts?: SpecialShift[];
}

export interface ShopConfig {
  id: string;
  name: string;
  company: 'CMZ' | 'C&S';
  isActive: boolean;
  schedule: Record<DayOfWeek, DayConfig>;
}

export const DAYS: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
export const WORKWEEK: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
export const STANDARD_SPLIT = '14:00';

export const SHOPS: ShopConfig[] = [
  {
    id: 'tigne-point',
    name: 'Tigne Point',
    company: 'CMZ',
    isActive: true,
    schedule: {
      monday: { hours: { open: '08:00', close: '20:30' }, staffing: { am: 1, pm: 1 } },
      tuesday: { hours: { open: '08:00', close: '20:30' }, staffing: { am: 1, pm: 1 } },
      wednesday: { hours: { open: '08:00', close: '20:30' }, staffing: { am: 1, pm: 1 } },
      thursday: { hours: { open: '08:00', close: '20:30' }, staffing: { am: 1, pm: 1 } },
      friday: { hours: { open: '08:00', close: '20:30' }, staffing: { am: 1, pm: 1 } },
      saturday: { hours: { open: '08:00', close: '20:30' }, staffing: { am: 1, pm: 1 } },
      sunday: { hours: { open: '08:00', close: '20:30' }, staffing: { am: 1, pm: 1 } }
    }
  },
  {
    id: 'siggiewi',
    name: 'Siggiewi',
    company: 'CMZ',
    isActive: true,
    schedule: {
      monday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      tuesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      wednesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      thursday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      friday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      saturday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 }, specialShifts: [{ start: '06:30', end: '14:00', label: 'early' }, { start: '14:00', end: '21:30', label: 'late' }] },
      sunday: { hours: { open: '07:30', close: '19:30' }, staffing: { am: 1, pm: 1 } }
    }
  },
  {
    id: 'marsaxlokk',
    name: 'Marsaxlokk',
    company: 'CMZ',
    isActive: true,
    schedule: {
      monday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      tuesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      wednesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      thursday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      friday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      saturday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 }, specialShifts: [{ start: '06:30', end: '14:00', label: 'early' }, { start: '14:00', end: '21:30', label: 'late' }] },
      sunday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } }
    }
  },
  {
    id: 'marsascala',
    name: 'Marsascala',
    company: 'CMZ',
    isActive: true,
    schedule: {
      monday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      tuesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      wednesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      thursday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      friday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      saturday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 }, specialShifts: [{ start: '06:30', end: '14:00', label: 'early' }, { start: '14:00', end: '21:30', label: 'late' }] },
      sunday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 }, specialShifts: [{ start: '06:30', end: '21:30', label: 'fullDay' }, { start: '10:00', end: '16:00', label: 'mid' }] }
    }
  },
  {
    id: 'mellieha',
    name: 'Mellieha',
    company: 'CMZ',
    isActive: true,
    schedule: {
      monday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      tuesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      wednesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      thursday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      friday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      saturday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 }, specialShifts: [{ start: '06:30', end: '14:00', label: 'early' }, { start: '14:00', end: '21:30', label: 'late' }] },
      sunday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } }
    }
  },
  {
    id: 'rabat',
    name: 'Rabat',
    company: 'CMZ',
    isActive: true,
    schedule: {
      monday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      tuesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      wednesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      thursday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } },
      friday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 }, specialShifts: [{ start: '06:30', end: '14:00', label: 'early' }, { start: '14:00', end: '21:30', label: 'late' }] },
      saturday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 }, specialShifts: [{ start: '06:30', end: '14:00', label: 'early' }, { start: '14:00', end: '21:30', label: 'late' }] },
      sunday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 1, pm: 1 } }
    }
  },
  {
    id: 'hamrun',
    name: 'Hamrun',
    company: 'CMZ',
    isActive: true,
    schedule: {
      monday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 4, pm: 2 } },
      tuesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 3, pm: 2 } },
      wednesday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 3, pm: 2 } },
      thursday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 3, pm: 2 } },
      friday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 3, pm: 2 } },
      saturday: { hours: { open: '06:30', close: '21:30' }, staffing: { am: 2, pm: 2 } },
      sunday: { hours: { open: '07:30', close: '19:30' }, staffing: { am: 2, pm: 2 } }
    }
  },
  {
    id: 'fgura',
    name: 'Fgura',
    company: 'C&S',
    isActive: true,
    schedule: {
      monday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 3, pm: 2 } },
      tuesday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 2, pm: 2 } },
      wednesday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 2, pm: 2 } },
      thursday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 3, pm: 2 } },
      friday: { hours: { open: '07:00', close: '20:00' }, staffing: { am: 3, pm: 2 } },
      saturday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 2, pm: 2 } },
      sunday: { hours: { open: '08:00', close: '13:00' }, staffing: { am: 2, pm: 0 } }
    }
  },
  {
    id: 'carters',
    name: 'Carters',
    company: 'C&S',
    isActive: true,
    schedule: {
      monday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 3, pm: 1 } },
      tuesday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 3, pm: 1 } },
      wednesday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 3, pm: 0 } },
      thursday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 3, pm: 1 } },
      friday: { hours: { open: '07:00', close: '20:00' }, staffing: { am: 3, pm: 1 } },
      saturday: { hours: { open: '07:00', close: '14:00' }, staffing: { am: 2, pm: 0 } },
      sunday: { hours: { open: '08:00', close: '13:00' }, staffing: { am: 2, pm: 0 } }
    }
  },
  {
    id: 'zabbar',
    name: 'Zabbar',
    company: 'C&S',
    isActive: true,
    schedule: {
      monday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 2, pm: 1 } },
      tuesday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 1, pm: 1 } },
      wednesday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 1, pm: 1 } },
      thursday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 1, pm: 1 } },
      friday: { hours: { open: '07:00', close: '19:00' }, staffing: { am: 1, pm: 1 } },
      saturday: { hours: { open: '07:00', close: '14:00' }, staffing: { am: 2, pm: 1 } },
      sunday: { hours: null, staffing: null }
    }
  }
];

// Helper functions
export function getShop(id: string): ShopConfig | undefined {
  return SHOPS.find(s => s.id === id);
}

export function getShopByName(name: string): ShopConfig | undefined {
  return SHOPS.find(s => s.name.toLowerCase() === name.toLowerCase());
}

export function getActiveShops(): ShopConfig[] {
  return SHOPS.filter(s => s.isActive);
}

export function getShopsByCompany(company: 'CMZ' | 'C&S'): ShopConfig[] {
  return SHOPS.filter(s => s.company === company && s.isActive);
}

export function isShopOpen(shopId: string, day: DayOfWeek): boolean {
  const shop = getShop(shopId);
  if (!shop) return false;
  const config = shop.schedule[day];
  return config.hours !== null;
}

export function getShopHours(shopId: string, day: DayOfWeek): TimeRange | null {
  const shop = getShop(shopId);
  if (!shop) return null;
  return shop.schedule[day].hours;
}

export function getStaffingNeeds(shopId: string, day: DayOfWeek): StaffingRequirement | null {
  const shop = getShop(shopId);
  if (!shop) return null;
  return shop.schedule[day].staffing;
}

export function getSpecialShifts(shopId: string, day: DayOfWeek): SpecialShift[] | undefined {
  const shop = getShop(shopId);
  if (!shop) return undefined;
  return shop.schedule[day].specialShifts;
}

export function calculateDuration(start: string, end: string): number {
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  return (endH * 60 + endM) - (startH * 60 + startM);
}

export function getAMShift(hours: TimeRange): { start: string; end: string } {
  return { start: hours.open, end: STANDARD_SPLIT };
}

export function getPMShift(hours: TimeRange): { start: string; end: string } {
  return { start: STANDARD_SPLIT, end: hours.close };
}
