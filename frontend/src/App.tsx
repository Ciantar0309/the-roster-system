// frontend/src/App.tsx
import React, { useState, useEffect, useMemo } from 'react';
import LoginPage from './components/LoginPage';
import UsersView from './components/UsersView';
import InviteAcceptPage from './components/InviteAcceptPage';
import { 
  LayoutDashboard, Store, Calendar, Clock, Users, Settings, 
  ChevronLeft, ChevronRight, Menu, X, LogOut,
  DollarSign, ClipboardList, Repeat, Play, RefreshCw, 
  Filter, Save, Plus, Edit2, Trash2, Check, Bell, Eye, EyeOff, Sun, Database
} from 'lucide-react';
import { format, parseISO, startOfWeek, addDays, startOfDay, endOfDay, isToday } from 'date-fns';

import type { 
  Shop, Employee, BackendShift, LeaveRequest, ShiftSwapRequest,
  CurrentUser, ViewType, DayOfWeek, PayScale, Allowance,
  ProfileUpdateNotification
} from './types';


import { 
  DEFAULT_PAY_SCALES, DEFAULT_ALLOWANCES, DAYS_OF_WEEK,
  DEFAULT_SHOP_REQUIREMENTS, ADMIN_NAVIGATION, EMPLOYEE_NAVIGATION
} from './types';

import { 
  GlassCard, Avatar, Badge, Modal, FormInput, 
  FormSelect, AnimatedButton, StatCard, LoadingSpinner,
  ToggleButtonGroup, ConfirmDialog,
} from './components/ui';
import ShopsView from './components/ShopsView';
import EmployeesView from './components/EmployeesView';
import LeaveView from './components/LeaveView';
import SwapsView from './components/SwapsView';


// ============== API CONFIG ==============

const API_BASE_URL = 'http://localhost:3001/api';

// ============== SAMPLE DATA ==============

const SAMPLE_USER: CurrentUser = {
  id: 1,
  name: 'Admin User',
  email: 'admin@rosterpro.com',
  role: 'admin',
  company: 'Both',
  employeeId: undefined,
};

const SAMPLE_SHOPS: Shop[] = [
  {
    id: 1,
    name: 'Hamrun',
    company: 'CS',
    isActive: true,
    openTime: '06:30',
    closeTime: '21:30',
    requirements: [
      { day: 'Mon', amStaff: 4, pmStaff: 2, isMandatory: true },
      { day: 'Tue', amStaff: 3, pmStaff: 2 },
      { day: 'Wed', amStaff: 3, pmStaff: 2 },
      { day: 'Thu', amStaff: 3, pmStaff: 2 },
      { day: 'Fri', amStaff: 3, pmStaff: 2 },
      { day: 'Sat', amStaff: 4, pmStaff: 2, isMandatory: true },
      { day: 'Sun', amStaff: 2, pmStaff: 2 }
    ],
    specialRequests: [],
    assignedEmployees: [
      { employeeId: 1, isPrimary: true },
      { employeeId: 2, isPrimary: true },
      { employeeId: 3, isPrimary: true },
      { employeeId: 4, isPrimary: true },
      { employeeId: 5, isPrimary: true },
      { employeeId: 6, isPrimary: true },
      { employeeId: 7, isPrimary: true }
    ],
    rules: { 
      mandatory_days: ['Monday', 'Saturday'], 
      full_day_effect: 'reduces_am',
      sundayExactStaff: 4
    }
  },
  {
    id: 2,
    name: 'Tigne Point',
    company: 'CS',
    isActive: true,
    openTime: '08:30',
    closeTime: '20:30',
    requirements: [
      { day: 'Mon', amStaff: 1, pmStaff: 1 },
      { day: 'Tue', amStaff: 1, pmStaff: 1 },
      { day: 'Wed', amStaff: 1, pmStaff: 1 },
      { day: 'Thu', amStaff: 1, pmStaff: 1 },
      { day: 'Fri', amStaff: 1, pmStaff: 1 },
      { day: 'Sat', amStaff: 1, pmStaff: 1 },
      { day: 'Sun', amStaff: 1, pmStaff: 1 }
    ],
    specialRequests: [],
    assignedEmployees: [{ employeeId: 8, isPrimary: true }],
    rules: { 
      dayInDayOut: true,
      preferFullDays: true,
      full_day_effect: 'reduces_am' 
    }
  },
  {
    id: 3,
    name: 'Siggiewi',
    company: 'CS',
    isActive: true,
    openTime: '06:30',
    closeTime: '21:30',
    requirements: [
      { day: 'Mon', amStaff: 1, pmStaff: 1 },
      { day: 'Tue', amStaff: 1, pmStaff: 1 },
      { day: 'Wed', amStaff: 1, pmStaff: 1 },
      { day: 'Thu', amStaff: 1, pmStaff: 1 },
      { day: 'Fri', amStaff: 1, pmStaff: 1 },
      { day: 'Sat', amStaff: 1, pmStaff: 1 },
      { day: 'Sun', amStaff: 1, pmStaff: 1 }
    ],
    specialRequests: [
      { id: 'sig-sat', day: 'Sat', shifts: [{ start: '06:30', end: '14:00' }, { start: '10:00', end: '21:30' }] }
    ],
    assignedEmployees: [
      { employeeId: 9, isPrimary: true },
      { employeeId: 10, isPrimary: true }
    ],
    rules: { 
      dayInDayOut: true,
      preferFullDays: true,
      fixed_days_off: [{ person: 'Ricky', day: 'Monday' }, { person: 'Anus', day: 'Wednesday' }],
      full_day_effect: 'reduces_am'
    }
  },
  {
    id: 4,
    name: 'Marsaxlokk',
    company: 'CS',
    isActive: true,
    openTime: '06:30',
    closeTime: '21:30',
    requirements: [
      { day: 'Mon', amStaff: 1, pmStaff: 1 },
      { day: 'Tue', amStaff: 1, pmStaff: 1 },
      { day: 'Wed', amStaff: 1, pmStaff: 1 },
      { day: 'Thu', amStaff: 1, pmStaff: 1 },
      { day: 'Fri', amStaff: 1, pmStaff: 1 },
      { day: 'Sat', amStaff: 1, pmStaff: 1 },
      { day: 'Sun', amStaff: 1, pmStaff: 1 }
    ],
    specialRequests: [],
    assignedEmployees: [
      { employeeId: 11, isPrimary: true },
      { employeeId: 12, isPrimary: true }
    ],
    rules: { 
      dayInDayOut: true,
      preferFullDays: true,
      full_day_effect: 'reduces_am' 
    }
  },
  {
    id: 5,
    name: 'Marsascala',
    company: 'CS',
    isActive: true,
    openTime: '06:30',
    closeTime: '21:30',
    requirements: [
      { day: 'Mon', amStaff: 1, pmStaff: 1 },
      { day: 'Tue', amStaff: 1, pmStaff: 1 },
      { day: 'Wed', amStaff: 1, pmStaff: 1 },
      { day: 'Thu', amStaff: 1, pmStaff: 1 },
      { day: 'Fri', amStaff: 1, pmStaff: 1 },
      { day: 'Sat', amStaff: 1, pmStaff: 1 },
      { day: 'Sun', amStaff: 1, pmStaff: 1 }
    ],
    specialRequests: [
      { id: 'mars-sat', day: 'Sat', shifts: [{ start: '06:30', end: '21:30' }, { start: '06:30', end: '15:00' }] },
      { id: 'mars-sun', day: 'Sun', shifts: [{ start: '10:00', end: '16:00' }, { start: '06:30', end: '21:30' }] }
    ],
    assignedEmployees: [
      { employeeId: 13, isPrimary: true },
      { employeeId: 14, isPrimary: true }
    ],
    rules: { 
      dayInDayOut: true,
      preferFullDays: true,
      full_day_effect: 'reduces_am' 
    }
  },
  {
    id: 6,
    name: 'Mellieha',
    company: 'CS',
    isActive: true,
    openTime: '06:30',
    closeTime: '21:30',
    requirements: [
      { day: 'Mon', amStaff: 1, pmStaff: 1 },
      { day: 'Tue', amStaff: 1, pmStaff: 1 },
      { day: 'Wed', amStaff: 1, pmStaff: 1 },
      { day: 'Thu', amStaff: 1, pmStaff: 1 },
      { day: 'Fri', amStaff: 1, pmStaff: 1 },
      { day: 'Sat', amStaff: 1, pmStaff: 1 },
      { day: 'Sun', amStaff: 1, pmStaff: 1 }
    ],
    specialRequests: [],
    assignedEmployees: [
      { employeeId: 17, isPrimary: true },
      { employeeId: 18, isPrimary: true }
    ],
    rules: { 
      dayInDayOut: true,
      preferFullDays: true,
      full_day_effect: 'reduces_am' 
    }
  },
  {
    id: 7,
    name: 'Rabat',
    company: 'CS',
    isActive: true,
    openTime: '06:30',
    closeTime: '21:30',
    requirements: [
      { day: 'Mon', amStaff: 1, pmStaff: 1 },
      { day: 'Tue', amStaff: 1, pmStaff: 1 },
      { day: 'Wed', amStaff: 1, pmStaff: 1 },
      { day: 'Thu', amStaff: 1, pmStaff: 1 },
      { day: 'Fri', amStaff: 1, pmStaff: 1 },
      { day: 'Sat', amStaff: 1, pmStaff: 1 },
      { day: 'Sun', amStaff: 1, pmStaff: 1 }
    ],
    specialRequests: [],
    assignedEmployees: [
      { employeeId: 15, isPrimary: true },
      { employeeId: 16, isPrimary: true }
    ],
    rules: { 
      splitPreferred: true,
      fullDayOnlyDays: ['Wed', 'Sun'],
      full_day_effect: 'reduces_am' 
    }
  },
  {
    id: 8,
    name: 'Fgura',
    company: 'CMZ',
    isActive: true,
    openTime: '07:00',
    closeTime: '19:00',
    requirements: [
      { day: 'Mon', amStaff: 3, pmStaff: 2 },
      { day: 'Tue', amStaff: 2, pmStaff: 2 },
      { day: 'Wed', amStaff: 2, pmStaff: 2 },
      { day: 'Thu', amStaff: 2, pmStaff: 2 },
      { day: 'Fri', amStaff: 3, pmStaff: 2 },
      { day: 'Sat', amStaff: 3, pmStaff: 2 },
      { day: 'Sun', amStaff: 2, pmStaff: 0 }
    ],
    specialRequests: [],
    assignedEmployees: [
      { employeeId: 21, isPrimary: true },
      { employeeId: 22, isPrimary: true },
      { employeeId: 23, isPrimary: true }
    ],
    rules: { 
      sundayMaxStaff: 2,
      full_day_effect: 'reduces_am' 
    }
  },
  {
    id: 9,
    name: 'Carters',
    company: 'CMZ',
    isActive: true,
    openTime: '07:00',
    closeTime: '19:00',
    requirements: [
      { day: 'Mon', amStaff: 3, pmStaff: 2 },
      { day: 'Tue', amStaff: 3, pmStaff: 2 },
      { day: 'Wed', amStaff: 3, pmStaff: 2 },
      { day: 'Thu', amStaff: 3, pmStaff: 2 },
      { day: 'Fri', amStaff: 3, pmStaff: 2 },
      { day: 'Sat', amStaff: 3, pmStaff: 2 },
      { day: 'Sun', amStaff: 2, pmStaff: 0 }
    ],
    specialRequests: [],
    assignedEmployees: [
      { employeeId: 20, isPrimary: true },
      { employeeId: 24, isPrimary: true },
      { employeeId: 29, isPrimary: true },
      { employeeId: 30, isPrimary: true }
    ],
    rules: { 
      sundayMaxStaff: 2,
      full_day_effect: 'reduces_am' 
    }
  },
  {
    id: 10,
    name: 'Zabbar',
    company: 'CMZ',
    isActive: true,
    openTime: '07:00',
    closeTime: '19:00',
    requirements: [
      { day: 'Mon', amStaff: 2, pmStaff: 1 },
      { day: 'Tue', amStaff: 1, pmStaff: 1 },
      { day: 'Wed', amStaff: 1, pmStaff: 1 },
      { day: 'Thu', amStaff: 1, pmStaff: 1 },
      { day: 'Fri', amStaff: 1, pmStaff: 1 },
      { day: 'Sat', amStaff: 2, pmStaff: 1 },
      { day: 'Sun', amStaff: 0, pmStaff: 0 }
    ],
    specialRequests: [],
    assignedEmployees: [
      { employeeId: 19, isPrimary: true },
      { employeeId: 27, isPrimary: true }
    ],
    rules: { 
      sunday_closed: true, 
      full_day_effect: 'reduces_am' 
    }
  }
];



const SAMPLE_EMPLOYEES: Employee[] = [
  // C&S Hamrun Staff
  { id: 1, name: 'Kamal', email: 'kamal@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [] },
  { id: 2, name: 'Laxmi', email: 'laxmi@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [] },
  { id: 3, name: 'Arjun', email: 'arjun@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [] },
  { id: 4, name: 'Imran', email: 'imran@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [2, 3, 4, 5, 6, 7] },
  { id: 5, name: 'Gopal', email: 'gopal@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [2, 3, 4, 5, 6, 7] },
  { id: 6, name: 'Guarav', email: 'guarav@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [2, 3, 4, 5, 6, 7] },
  { id: 7, name: 'Passang', email: 'passang@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [2, 6] },
  
  // C&S Tigne Point Staff
  { id: 8, name: 'Ciro', email: 'ciro@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 2, secondaryShopIds: [] },
  
  // C&S Siggiewi Staff
  { id: 9, name: 'Ricky', email: 'ricky@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 3, secondaryShopIds: [1] },
  { id: 10, name: 'Anus', email: 'anus@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 3, secondaryShopIds: [] },
  
  // C&S Marsaxlokk Staff
  { id: 11, name: 'Carina', email: 'carina@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 4, secondaryShopIds: [1] },
  { id: 12, name: 'Pradib', email: 'pradib@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 4, secondaryShopIds: [5] },
  
  // C&S Marsascala Staff
  { id: 13, name: 'Sirjana', email: 'sirjana@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 5, secondaryShopIds: [2] },
  { id: 14, name: 'Anup', email: 'anup@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 5, secondaryShopIds: [] },
  
  // C&S Rabat Staff
  { id: 15, name: 'Aronia', email: 'aronia@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 7, secondaryShopIds: [1] },
  { id: 16, name: 'Joanne', email: 'joanne@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 7, secondaryShopIds: [] },
  
  // C&S Mellieha Staff
  { id: 17, name: 'Hasan', email: 'hasan@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 6, secondaryShopIds: [] },
  { id: 18, name: 'Anju', email: 'anju@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 6, secondaryShopIds: [] },
  
  // CMZ Zabbar Staff
  { id: 19, name: 'Amy', email: 'amy@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 10, secondaryShopIds: [8] },
  
  // CMZ Carters Staff
  { id: 20, name: 'Anthony', email: 'anthony@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 9, secondaryShopIds: [] },
  
  // CMZ Fgura Staff
  { id: 21, name: 'Caroline', email: 'caroline@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 8, secondaryShopIds: [] },
  { id: 22, name: 'Chantel', email: 'chantel@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 8, secondaryShopIds: [10] },
  { id: 23, name: 'Claire', email: 'claire@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 8, secondaryShopIds: [] },
  
  // CMZ Carters Staff (continued)
  { id: 24, name: 'Joseph', email: 'joseph@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 9, secondaryShopIds: [] },
  { id: 25, name: 'Rose', email: 'rose@company.com', company: 'CMZ', employmentType: 'part-time', role: 'staff', weeklyHours: 20, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 9, secondaryShopIds: [8] },
  
  // CMZ Floaters
  { id: 26, name: 'Danae', email: 'danae@company.com', company: 'CMZ', employmentType: 'part-time', role: 'staff', weeklyHours: 20, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 8, secondaryShopIds: [9, 10] },
  
  // CMZ Zabbar Staff (continued)
  { id: 27, name: 'Priscilla', email: 'priscilla@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 10, secondaryShopIds: [] },
  
  // CMZ Floaters (continued)
  { id: 28, name: 'Aimee', email: 'aimee@company.com', company: 'CMZ', employmentType: 'part-time', role: 'staff', weeklyHours: 20, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 8, secondaryShopIds: [9, 10] },
  
  // CMZ Carters Staff (continued)
  { id: 29, name: 'Mariella', email: 'mariella@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 9, secondaryShopIds: [] },
  { id: 30, name: 'Rabi', email: 'rabi@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 9, secondaryShopIds: [] },
  
  // Special - Works for both companies (excluded from roster - manual only)
  { id: 31, name: 'Maria', email: 'maria@company.com', company: 'Both', employmentType: 'full-time', role: 'manager', weeklyHours: 40, payScaleId: 'manager', allowanceIds: [], excludeFromRoster: true, hasSystemAccess: true, systemRole: 'admin', primaryShopId: 1, secondaryShopIds: [2, 3, 4, 5, 6, 7, 8, 9, 10] }
];


// ============== ICON MAP ==============

const IconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  Store,
  Calendar,
  Clock,
  Users,
  Settings,
  DollarSign,
  ClipboardList,
  Repeat,
};

// ============== SIDEBAR ==============

interface SidebarProps {
  activeView: ViewType;
  setActiveView: (view: ViewType) => void;
  currentUser: CurrentUser;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isEmployeePreview: boolean;
  setIsEmployeePreview: (preview: boolean) => void;
  onLogout: () => void;
}


function Sidebar({ 
  activeView, 
  setActiveView, 
  currentUser,
  isCollapsed,
  setIsCollapsed,
  isEmployeePreview,
  setIsEmployeePreview,
  onLogout
}: SidebarProps) {
  const navigation = isEmployeePreview ? EMPLOYEE_NAVIGATION : 
    (currentUser.role === 'admin' || currentUser.role === 'manager') 
      ? ADMIN_NAVIGATION 
      : EMPLOYEE_NAVIGATION;

  return (
    <aside className={`fixed left-0 top-0 h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white transition-all duration-300 z-40 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                RosterPro
              </h1>
              <p className="text-xs text-slate-400">v12.6</p>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            {isCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* User Info */}
      {!isCollapsed && (
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <Avatar name={currentUser.name} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{currentUser.name}</p>
              <p className="text-xs text-slate-400 capitalize">{currentUser.role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="p-2 flex-1">
        <ul className="space-y-1">
          {navigation.map(item => {
            const Icon = (item.icon && IconMap[item.icon]) || LayoutDashboard;
            const isActive = activeView === item.id;
            
            return (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Admin Preview Toggle */}
      {(currentUser.role === 'admin' || currentUser.role === 'manager') && !isCollapsed && (
        <div className="p-4 border-t border-slate-700">
          <button
            onClick={() => setIsEmployeePreview(!isEmployeePreview)}
            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              isEmployeePreview 
                ? 'bg-purple-600 text-white' 
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {isEmployeePreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {isEmployeePreview ? 'Exit Employee View' : 'Preview Employee View'}
          </button>
        </div>
      )}

      {/* Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      )}
    </aside>
  );
}

// ============== PART-TIMER AVAILABILITY MODAL ==============

interface PartTimerAvailability {
  employeeId: number;
  employeeName: string;
  company: string;
  primaryShopId?: number;
  primaryShopName?: string;
  availability: {
    [key in DayOfWeek]?: {
      available: boolean;
      start?: string;
      end?: string;
    };
  };
}

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  shops: Shop[];
  weekStart: Date;
  availability: PartTimerAvailability[];
  onSave: (availability: PartTimerAvailability[]) => void;
}

function AvailabilityModal({ 
  isOpen, 
  onClose, 
  employees,
  shops,
  weekStart,
  availability,
  onSave 
}: AvailabilityModalProps) {
  const [localAvailability, setLocalAvailability] = useState<PartTimerAvailability[]>([]);
  const [companyFilter, setCompanyFilter] = useState<'all' | 'CMZ' | 'CS'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Get part-time employees only
  const partTimeEmployees = useMemo(() => 
    employees.filter(emp => emp.employmentType === 'part-time'),
    [employees]
  );

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen) {
      if (availability.length > 0) {
        setLocalAvailability(availability);
      } else {
        const defaultAvailability: PartTimerAvailability[] = partTimeEmployees.map(emp => {
          const primaryShop = shops.find(s => s.id === emp.primaryShopId);
          return {
            employeeId: emp.id,
            employeeName: emp.name,
            company: emp.company,
            primaryShopId: emp.primaryShopId,
            primaryShopName: primaryShop?.name,
            availability: DAYS_OF_WEEK.reduce((acc, day) => {
              if (day) {
                acc[day] = { available: false, start: '06:30', end: '21:30' };
              }
              return acc;
            }, {} as PartTimerAvailability['availability'])
          };
        });
        setLocalAvailability(defaultAvailability);
      }
      setSearchTerm('');
      setCompanyFilter('all');
    }
  }, [isOpen, availability, partTimeEmployees, shops]);

  // Filter employees
  const filteredAvailability = useMemo(() => {
    return localAvailability.filter(emp => {
      const matchesCompany = companyFilter === 'all' || emp.company === companyFilter || emp.company === 'Both';
      const matchesSearch = emp.employeeName.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCompany && matchesSearch;
    });
  }, [localAvailability, companyFilter, searchTerm]);

  const toggleDay = (employeeId: number, day: DayOfWeek) => {
    setLocalAvailability(prev => prev.map(emp => 
      emp.employeeId === employeeId
        ? {
            ...emp,
            availability: {
              ...emp.availability,
              [day]: {
                ...emp.availability[day],
                available: !emp.availability[day]?.available
              }
            }
          }
        : emp
    ));
  };

  const toggleAllDays = (employeeId: number, available: boolean) => {
    setLocalAvailability(prev => prev.map(emp => 
      emp.employeeId === employeeId
        ? {
            ...emp,
            availability: DAYS_OF_WEEK.reduce((acc, day) => {
              if (day) {
                acc[day] = { ...emp.availability[day], available };
              }
              return acc;
            }, {} as PartTimerAvailability['availability'])
          }
        : emp
    ));
  };

  const updateTime = (employeeId: number, day: DayOfWeek, field: 'start' | 'end', value: string) => {
    setLocalAvailability(prev => prev.map(emp => 
      emp.employeeId === employeeId
        ? {
            ...emp,
            availability: {
              ...emp.availability,
              [day]: {
                ...emp.availability[day],
                [field]: value
              }
            }
          }
        : emp
    ));
  };

const updateAllTimes = (employeeId: number, field: 'start' | 'end', value: string) => {
  setLocalAvailability(prev => prev.map(emp => 
    emp.employeeId === employeeId
      ? {
          ...emp,
          availability: DAYS_OF_WEEK.reduce((acc, day) => {
            if (day) {
              acc[day] = { 
                available: emp.availability[day]?.available ?? false,
                start: field === 'start' ? value : (emp.availability[day]?.start ?? '06:30'),
                end: field === 'end' ? value : (emp.availability[day]?.end ?? '21:30')
              };
            }
            return acc;
          }, {} as PartTimerAvailability['availability'])
        }
      : emp
  ));
};


  const handleSave = () => {
    onSave(localAvailability);
    onClose();
  };

  // Format week dates for display
  const weekDates = useMemo(() => {
    return DAYS_OF_WEEK.map((day, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      return {
        day,
        date: date.getDate(),
        month: date.toLocaleDateString('en-US', { month: 'short' })
      };
    });
  }, [weekStart]);

  // Count available days per employee
  const getAvailableDaysCount = (emp: PartTimerAvailability) => {
    return Object.values(emp.availability).filter(d => d?.available).length;
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Part-Timer Availability" 
      size="xl"
    >
      <div className="space-y-4">
        {/* Header Info */}
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                Week: {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {
                  new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                }
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {partTimeEmployees.length} part-time employees — Click days to toggle availability
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-700">{partTimeEmployees.length}</p>
              <p className="text-xs text-blue-600">Part-timers</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search employees..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <ToggleButtonGroup
            value={companyFilter}
            onChange={setCompanyFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'CMZ', label: 'CMZ' },
              { value: 'CS', label: 'CS' },
            ]}
          />
        </div>

        {partTimeEmployees.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No part-time employees found</p>
            <p className="text-sm mt-1">Add part-time employees to set their availability</p>
          </div>
        ) : filteredAvailability.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No employees match your filters</p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {filteredAvailability.map(emp => {
              const availableDays = getAvailableDaysCount(emp);
              
              return (
                <div key={emp.employeeId} className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                  {/* Employee Header */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.employeeName} size="md" />
                      <div>
                        <h4 className="font-semibold text-gray-900">{emp.employeeName}</h4>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant={emp.company === 'CMZ' ? 'purple' : 'warning'} className="text-xs">
                            {emp.company}
                          </Badge>
                          {emp.primaryShopName && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <Store className="w-3 h-3" />
                              {emp.primaryShopName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{availableDays}/7</p>
                        <p className="text-xs text-gray-500">days available</p>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => toggleAllDays(emp.employeeId, true)}
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                        >
                          All ✓
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleAllDays(emp.employeeId, false)}
                          className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Day Grid */}
                  <div className="p-4">
                    <div className="grid grid-cols-7 gap-2">
                      {weekDates.map(({ day, date, month }) => {
                        if (!day) return null;
                        const dayAvail = emp.availability[day];
                        const isAvailable = dayAvail?.available || false;

                        return (
                          <div key={day} className="text-center">
                            <div className="text-xs font-medium text-gray-600 mb-1">{day}</div>
                            <div className="text-xs text-gray-400 mb-2">{month} {date}</div>
                            <button
                              type="button"
                              onClick={() => toggleDay(emp.employeeId, day)}
                              className={`w-full py-3 rounded-lg text-sm font-medium transition-all ${
                                isAvailable
                                  ? 'bg-green-500 text-white shadow-md hover:bg-green-600'
                                  : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                              }`}
                            >
                              {isAvailable ? '✓' : '−'}
                            </button>
                            {isAvailable && (
                              <div className="mt-2 space-y-1">
                                <input
                                  type="time"
                                  value={dayAvail?.start || '06:30'}
                                  onChange={(e) => updateTime(emp.employeeId, day, 'start', e.target.value)}
                                  className="w-full text-xs p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                                />
                                <input
                                  type="time"
                                  value={dayAvail?.end || '21:30'}
                                  onChange={(e) => updateTime(emp.employeeId, day, 'end', e.target.value)}
                                  className="w-full text-xs p-1.5 border border-gray-200 rounded focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Quick time set */}
                    {availableDays > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-500">Set all times:</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="time"
                              defaultValue="06:30"
                              onChange={(e) => updateAllTimes(emp.employeeId, 'start', e.target.value)}
                              className="px-2 py-1 border border-gray-200 rounded text-sm"
                            />
                            <span className="text-gray-400">to</span>
                            <input
                              type="time"
                              defaultValue="21:30"
                              onChange={(e) => updateAllTimes(emp.employeeId, 'end', e.target.value)}
                              className="px-2 py-1 border border-gray-200 rounded text-sm"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            {filteredAvailability.reduce((acc, emp) => acc + getAvailableDaysCount(emp), 0)} total available days set
          </p>
          <div className="flex gap-3">
            <AnimatedButton variant="secondary" onClick={onClose}>
              Cancel
            </AnimatedButton>
            <AnimatedButton icon={Check} onClick={handleSave}>
              Save Availability
            </AnimatedButton>
          </div>
        </div>
      </div>
    </Modal>
  );
}



// ============== DASHBOARD VIEW ==============

interface DashboardViewProps {
  shops: Shop[];
  employees: Employee[];
  shifts: BackendShift[];
  leaveRequests: LeaveRequest[];
  swapRequests: ShiftSwapRequest[];
  profileUpdateNotifications: ProfileUpdateNotification[];
  onNavigate: (view: ViewType) => void;
  onGenerateRoster: () => void;
  onOpenAvailability: () => void;
  onSyncData: () => void;
  onApproveProfileUpdate: (id: string) => void;
  onRejectProfileUpdate: (id: string) => void;
}



function DashboardView({ 
  shops, 
  employees, 
  shifts, 
  leaveRequests, 
  swapRequests,
  profileUpdateNotifications,
  onNavigate,
  onGenerateRoster,
  onOpenAvailability,
  onSyncData,
  onApproveProfileUpdate,
  onRejectProfileUpdate
}: DashboardViewProps) {

  const stats = useMemo(() => {
    const activeShops = shops.filter(s => s.isActive).length;
    const activeEmployees = employees.filter(e => !e.excludeFromRoster).length;
    const pendingLeave = leaveRequests.filter(r => r.status === 'pending').length;
    const pendingSwaps = swapRequests.filter(r => r.status === 'pending').length;
    const todayShifts = shifts.filter(s => {
      const shiftDate = typeof s.date === 'string' ? parseISO(s.date) : s.date;
      return isToday(shiftDate);
    }).length;

    const totalHoursThisWeek = shifts.reduce((acc, s) => acc + s.hours, 0);
    
    return {
      activeShops,
      activeEmployees,
      pendingLeave,
      pendingSwaps,
      todayShifts,
      totalHoursThisWeek,
    };
  }, [shops, employees, shifts, leaveRequests, swapRequests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          icon={Store}
          label="Active Shops"
          value={stats.activeShops}
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Users}
          label="Active Employees"
          value={stats.activeEmployees}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          icon={Calendar}
          label="Today's Shifts"
          value={stats.todayShifts}
          gradient="from-purple-500 to-purple-600"
        />
        <StatCard
          icon={Clock}
          label="Hours This Week"
          value={stats.totalHoursThisWeek}
          subtext="Total scheduled"
          gradient="from-orange-500 to-orange-600"
        />
        <StatCard
          icon={ClipboardList}
          label="Pending Leave"
          value={stats.pendingLeave}
          gradient="from-yellow-500 to-amber-500"
        />
        <StatCard
          icon={Repeat}
          label="Pending Swaps"
          value={stats.pendingSwaps}
          gradient="from-pink-500 to-rose-500"
        />
      </div>

      {/* Quick Actions */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button 
            onClick={onGenerateRoster}
            className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
          >
            <Play className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Generate Roster</span>
          </button>
          <button 
            onClick={() => onNavigate('employees')}
            className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-xl hover:bg-green-100 transition-colors"
          >
            <Users className="w-6 h-6 text-green-600" />
            <span className="text-sm font-medium text-green-700">Add Employee</span>
          </button>
          <button 
            onClick={() => onNavigate('shops')}
            className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
          >
            <Store className="w-6 h-6 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Add Shop</span>
          </button>
          <button 
            onClick={onSyncData}
            className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-xl hover:bg-orange-100 transition-colors"
          >
            <RefreshCw className="w-6 h-6 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">Sync Data</span>
          </button>
        </div>
      </GlassCard>

      {/* Part-Timer Availability Quick Access */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Part-Timer Availability</h2>
            <p className="text-sm text-gray-600 mt-1">
              Set availability for {employees.filter(e => e.employmentType === 'part-time').length} part-time employees
            </p>
          </div>
          <AnimatedButton icon={Calendar} onClick={onOpenAvailability}>
            Set Availability
          </AnimatedButton>
        </div>
      </GlassCard>

      {/* Profile Update Requests */}
      {profileUpdateNotifications.filter(n => n.status === 'pending').length > 0 && (
        <GlassCard className="p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-500" />
              Profile Update Requests
            </h2>
            <Badge variant="warning">
              {profileUpdateNotifications.filter(n => n.status === 'pending').length}
            </Badge>
          </div>
          <div className="space-y-3">
            {profileUpdateNotifications.filter(n => n.status === 'pending').map(notification => (
              <div key={notification.id} className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div>
                  <p className="font-medium">{notification.employeeName}</p>
                  <p className="text-xs text-gray-500">
                    {format(parseISO(notification.createdAt), 'MMM d, yyyy h:mm a')}
                  </p>
                  <div className="mt-2 text-sm">
                    {notification.changes && Object.entries(notification.changes).map(([field, change]) => (
                      <p key={field} className="text-gray-600">
                        <span className="font-medium capitalize">{field.replace(/([A-Z])/g, ' $1').trim()}:</span>{' '}
                        {change.old && <span className="line-through text-red-400">{change.old}</span>}{' '}
                        → <span className="text-green-600">{change.new}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <AnimatedButton 
                    variant="danger" 
                    size="sm" 
                    onClick={() => onRejectProfileUpdate(notification.id)}
                  >
                    Reject
                  </AnimatedButton>
                  <AnimatedButton 
                    variant="primary" 
                    size="sm" 
                    onClick={() => onApproveProfileUpdate(notification.id)}
                  >
                    Approve
                  </AnimatedButton>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

       
      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Approvals</h2>
          {stats.pendingLeave + stats.pendingSwaps === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Check className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No pending approvals</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaveRequests.filter(r => r.status === 'pending').slice(0, 3).map(request => {
                const employee = employees.find(e => e.id === request.employeeId);
                return (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar name={employee?.name || 'Unknown'} size="sm" />
                      <div>
                        <p className="font-medium text-sm">{employee?.name}</p>
                        <p className="text-xs text-gray-500">Leave Request</p>
                      </div>
                    </div>
                    <Badge variant="warning">Pending</Badge>
                  </div>
                );
              })}
              {swapRequests.filter(r => r.status === 'pending').slice(0, 3).map(request => {
                const requester = employees.find(e => e.id === request.requesterId);
                return (
                  <div key={request.id} className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar name={requester?.name || 'Unknown'} size="sm" />
                      <div>
                        <p className="font-medium text-sm">{requester?.name}</p>
                        <p className="text-xs text-gray-500">Shift Swap</p>
                      </div>
                    </div>
                    <Badge variant="purple">Pending</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Today's Schedule */}
        <GlassCard className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Schedule</h2>
          {stats.todayShifts === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No shifts scheduled today</p>
            </div>
          ) : (
            <div className="space-y-3">
              {shifts.filter(s => {
                const shiftDate = typeof s.date === 'string' ? parseISO(s.date) : s.date;
                return isToday(shiftDate);
              }).slice(0, 5).map(shift => (
                <div key={shift.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Avatar name={shift.employeeName} size="sm" />
                    <div>
                      <p className="font-medium text-sm">{shift.employeeName}</p>
                      <p className="text-xs text-gray-500">{shift.shopName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{shift.startTime} - {shift.endTime}</p>
                    <p className="text-xs text-gray-500">{shift.hours}h</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

// ============== ROSTER VIEW ==============

interface RosterViewProps {
  shops: Shop[];
  employees: Employee[];
  shifts: BackendShift[];
  setShifts: React.Dispatch<React.SetStateAction<BackendShift[]>>;
  leaveRequests: LeaveRequest[];
}


function RosterView({ shops, employees, shifts, setShifts, leaveRequests }: RosterViewProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [companyFilter, setCompanyFilter] = useState<'all' | 'CMZ' | 'CS'>('all');
  const [shopFilter, setShopFilter] = useState<string>('all');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [selectedShift, setSelectedShift] = useState<BackendShift | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [partTimerAvailability, setPartTimerAvailability] = useState<PartTimerAvailability[]>([]);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [selectedShopsForAction, setSelectedShopsForAction] = useState<number[]>([]);

  // Load saved roster when week changes
  useEffect(() => {
    loadRosterFromBackend(currentWeekStart);
  }, [currentWeekStart]);


  // Get week dates
  const weekDates = useMemo(() => {
    return DAYS_OF_WEEK.map((day, index) => ({
      day,
      date: addDays(currentWeekStart, index),
      dateStr: format(addDays(currentWeekStart, index), 'yyyy-MM-dd'),
    }));
  }, [currentWeekStart]);

  // Filter shifts for current week
  const weekShifts = useMemo(() => {
    const weekStart = startOfDay(currentWeekStart);
    const weekEnd = endOfDay(addDays(currentWeekStart, 6));
    
    const filtered = shifts.filter(shift => {
      const shiftDate = typeof shift.date === 'string' ? parseISO(shift.date) : shift.date;
      const inWeek = shiftDate >= weekStart && shiftDate <= weekEnd;
      const matchesCompany = companyFilter === 'all' || shift.company === companyFilter;
      const matchesShop = shopFilter === 'all' || shift.shopId === parseInt(shopFilter);
      return inWeek && matchesCompany && matchesShop;
    });
    
    console.log('📊 weekShifts count:', filtered.length);
    
    return filtered;
  }, [shifts, currentWeekStart, companyFilter, shopFilter]);





  // Group shifts by date and shop
  const shiftsByDateAndShop = useMemo(() => {
    const grouped: Record<string, Record<number, BackendShift[]>> = {};
    
    weekDates.forEach(({ dateStr }) => {
      grouped[dateStr] = {};
      shops.forEach(shop => {
        grouped[dateStr][shop.id] = [];
      });
    });
    
    weekShifts.forEach(shift => {
      // Convert shift.date to string if it's a Date object
      const shiftDateStr = typeof shift.date === 'string' 
        ? shift.date 
        : format(shift.date, 'yyyy-MM-dd');
      
      if (grouped[shiftDateStr] && grouped[shiftDateStr][shift.shopId]) {
        grouped[shiftDateStr][shift.shopId].push(shift);
      }
    });
    
    return grouped;
  }, [weekDates, weekShifts, shops]);


  // Filter shops by company
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      if (!shop.isActive) return false;
      if (companyFilter === 'all') return true;
      return shop.company === companyFilter;
    });
  }, [shops, companyFilter]);

  // Navigation
  const goToPreviousWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const goToNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));


  const handleGenerateRoster = async () => {
    console.log('=== ROSTER GENERATION v13.0 - CP-SAT SOLVER ===');
    console.log('Week starting:', format(currentWeekStart, 'yyyy-MM-dd'));
    
    setIsGenerating(true);
    
    try {
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      
      // Build shop requirements from your existing config
      type DayPattern = { am: number; pm: number; full: number };
      type DayReq = {
        closed?: boolean;
        patterns: DayPattern[];
        amTimes: { start: string; end: string }[];
        pmTimes: { start: string; end: string }[];
        fullTimes: { start: string; end: string }[];
      };

      const P = (am: number, pm: number, full: number): DayPattern => ({ am, pm, full });

      // Common pattern for "1 or 0 / 1 or 0 / if used then 1"
      const ONEONE_OR_FULL1: DayPattern[] = [P(1, 1, 0), P(0, 0, 1)];

      type DayCode = DayOfWeek;

      type ShopReq = {
        type: 'single' | 'multi';
      } & Partial<Record<DayCode, DayReq>>;

      const SHOP_REQUIREMENTS: Record<string, ShopReq> = {
        'Tigne Point': {
          type: 'single',
          Mon: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'08:30',end:'14:30'}], pmTimes: [{start:'14:30',end:'20:30'}], fullTimes: [{start:'08:30',end:'20:30'}] },
          Tue: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'08:30',end:'14:30'}], pmTimes: [{start:'14:30',end:'20:30'}], fullTimes: [{start:'08:30',end:'20:30'}] },
          Wed: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'08:30',end:'14:30'}], pmTimes: [{start:'14:30',end:'20:30'}], fullTimes: [{start:'08:30',end:'20:30'}] },
          Thu: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'08:30',end:'14:30'}], pmTimes: [{start:'14:30',end:'20:30'}], fullTimes: [{start:'08:30',end:'20:30'}] },
          Fri: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'08:30',end:'14:30'}], pmTimes: [{start:'14:30',end:'20:30'}], fullTimes: [{start:'08:30',end:'20:30'}] },
          Sat: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'08:30',end:'14:30'}], pmTimes: [{start:'14:30',end:'20:30'}], fullTimes: [{start:'08:30',end:'20:30'}] },
          Sun: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'08:30',end:'14:30'}], pmTimes: [{start:'14:30',end:'20:30'}], fullTimes: [{start:'08:30',end:'20:30'}] },
        },

        'Siggiewi': {
          type: 'single',
          Mon: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Tue: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Wed: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Thu: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Fri: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Sat: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'10:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Sun: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'13:30'}], pmTimes: [{start:'13:30',end:'20:30'}], fullTimes: [{start:'06:30',end:'20:30'}] },
        },

        'Marsaxlokk': {
          type: 'single',
          Mon: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Tue: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Wed: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Thu: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Fri: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Sat: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Sun: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
        },

        'Marsascala': {
          type: 'single',
          Mon: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Tue: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Wed: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Thu: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Fri: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Sat: { patterns: [P(1,1,0)], amTimes: [{start:'06:30',end:'15:00'}], pmTimes: [{start:'16:30',end:'21:30'}], fullTimes: [] },
          Sun: { patterns: [P(1,1,0)], amTimes: [{start:'10:00',end:'16:00'}], pmTimes: [{start:'16:30',end:'21:30'}], fullTimes: [] },
        },

        'Mellieha': {
          type: 'single',
          Mon: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Tue: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Wed: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Thu: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Fri: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Sat: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Sun: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
        },

        'Rabat': {
          type: 'single',
          Mon: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Tue: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Wed: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Thu: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Fri: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Sat: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
          Sun: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'06:30',end:'14:00'}], pmTimes: [{start:'14:00',end:'21:30'}], fullTimes: [{start:'06:30',end:'21:30'}] },
        },

        'Hamrun': {
          type: 'multi',
          Mon: { patterns: [P(4,2,0)], 
                 amTimes: [{start:'06:30',end:'14:00'}],
                 pmTimes: [{start:'14:00',end:'21:30'}],
                 fullTimes: [{start:'06:30',end:'21:30'}]
          },
          Tue: { patterns: [P(3,2,0), P(2,1,1)], 
                 amTimes: [{start:'06:30',end:'14:00'}],
                 pmTimes: [{start:'14:00',end:'21:30'}],
                 fullTimes: [{start:'06:30',end:'21:30'}]
          },
          Wed: { patterns: [P(3,2,0), P(2,1,1)], 
                 amTimes: [{start:'06:30',end:'14:00'}],
                 pmTimes: [{start:'14:00',end:'21:30'}],
                 fullTimes: [{start:'06:30',end:'21:30'}]
          },
          Thu: { patterns: [P(3,2,0), P(2,1,1)], 
                 amTimes: [{start:'06:30',end:'14:00'}],
                 pmTimes: [{start:'14:00',end:'21:30'}],
                 fullTimes: [{start:'06:30',end:'21:30'}]
          },
          Fri: { patterns: [P(3,2,0), P(2,1,1)], 
                 amTimes: [{start:'06:30',end:'14:00'}],
                 pmTimes: [{start:'14:00',end:'21:30'}],
                 fullTimes: [{start:'06:30',end:'21:30'}]
          },
          Sat: { patterns: [P(4,2,0)], 
                 amTimes: [{start:'06:30',end:'14:00'}],
                 pmTimes: [{start:'14:00',end:'21:30'}],
                 fullTimes: [{start:'06:30',end:'21:30'}]
          },
          Sun: { patterns: [P(2,2,0)], 
                 amTimes: [{start:'06:30',end:'14:00'}],
                 pmTimes: [{start:'14:00',end:'21:30'}],
                 fullTimes: []
          },
        },


        'Fgura': {
          type: 'multi',
          Mon: { patterns: [P(3,2,0), P(2,1,1)], amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Tue: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Wed: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Thu: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Fri: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'13:30'}], pmTimes: [{start:'13:30',end:'20:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Sat: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'14:00'}], pmTimes: [{start:'14:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Sun: { patterns: [P(2,0,0)], amTimes: [{start:'08:00',end:'13:00'}], pmTimes: [], fullTimes: [] },
        },

        'Carters': {
          type: 'multi',
          Mon: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Tue: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Wed: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Thu: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Fri: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'13:30'}], pmTimes: [{start:'13:30',end:'20:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Sat: { patterns: [P(3,2,0), P(1,1,1)], amTimes: [{start:'07:00',end:'14:00'}], pmTimes: [{start:'14:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Sun: { patterns: [P(2,0,0)], amTimes: [{start:'08:00',end:'13:00'}], pmTimes: [], fullTimes: [] },
        },

        'Zabbar': {
          type: 'multi',
          Mon: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Tue: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Wed: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Thu: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Fri: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Sat: { patterns: ONEONE_OR_FULL1, amTimes: [{start:'07:00',end:'13:00'}], pmTimes: [{start:'13:00',end:'19:00'}], fullTimes: [{start:'07:00',end:'19:00'}] },
          Sun: { closed: true, patterns: [P(0,0,0)], amTimes: [], pmTimes: [], fullTimes: [] },
        },
      };

      // Get previous week's Sunday shifts for day-in-day-out constraint
      const previousSunday = addDays(currentWeekStart, -1);
      const previousSundayStr = format(previousSunday, 'yyyy-MM-dd');

      const previousWeekSundayShifts = shifts
        .filter(s => {
          const shiftDate = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
          return shiftDate === previousSundayStr;
        })
        .map(s => ({
          shopId: s.shopId,
          employeeId: s.employeeId,
          shiftType: s.shiftType
        }));

      console.log('📅 Previous Sunday shifts:', previousWeekSundayShifts);

      // Prepare payload for solver
      const solverPayload = {
        weekStart: weekStartStr,
        employees: employees.map(e => ({
          id: e.id,
          name: e.name,
          company: e.company,
          employmentType: e.employmentType,
          primaryShopId: e.primaryShopId,
          secondaryShopIds: e.secondaryShopIds || [],
          excludeFromRoster: e.excludeFromRoster || false
        })),
        
        shops: shops.map(s => ({
          id: s.id,
          name: s.name,
          company: s.company,
          assignedEmployees: s.assignedEmployees || [],
          requirements: s.requirements,
          specialRequests: s.specialRequests,
          rules: s.rules,
          openTime: s.openTime,
          closeTime: s.closeTime
        })),

        shopRequirements: SHOP_REQUIREMENTS,
        leaveRequests: leaveRequests.filter(l => l.status === 'approved').map(l => ({
          employeeId: l.employeeId,
          startDate: typeof l.startDate === 'string' ? l.startDate : format(l.startDate, 'yyyy-MM-dd'),
          endDate: typeof l.endDate === 'string' ? l.endDate : format(l.endDate, 'yyyy-MM-dd'),
          status: l.status
        })),
        fixedDaysOff: {
          'Ricky': 'Mon',
          'Anus': 'Wed'
        },
        amOnlyEmployees: ['Joseph'],
        excludedEmployeeIds: [31],
        previousWeekSundayShifts: previousWeekSundayShifts
      };

      console.log('📤 PAYLOAD TO SOLVER:');
      console.log('  - Shops:', solverPayload.shops?.length);
      console.log('  - First shop rules:', solverPayload.shops?.[0]?.rules);
      console.log('  - First shop specialRequests:', solverPayload.shops?.[0]?.specialRequests);
      console.log('  - First shop requirements:', solverPayload.shops?.[0]?.requirements);
      
      const fgura = solverPayload.shops.find((s: { name: string }) => s.name === 'Fgura');
      const carters = solverPayload.shops.find((s: { name: string }) => s.name === 'Carters');
      console.log('🏪 FGURA RULES:', fgura?.rules);
      console.log('🏪 CARTERS RULES:', carters?.rules);

      console.log('📤 Sending to solver:', solverPayload);
      
      // Call the Python solver
      const response = await fetch('http://localhost:3002/api/roster/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solverPayload)
      });
      
      if (!response.ok) {
        throw new Error(`Solver returned ${response.status}`);
      }
      
      const result = await response.json();
      console.log('📥 Solver result:', result);
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.status === 'INFEASIBLE') {
        console.error('❌ No feasible solution found');
        alert('Could not generate a feasible roster. Check staff availability and requirements.');
        return;
      }
      
      // Convert solver shifts to app format
      const generatedShifts: BackendShift[] = result.shifts.map((s: {
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
      }, idx: number) => ({
        id: `shift-${Date.now()}-${idx}`,
        date: s.date,
        shopId: s.shopId,
        shopName: s.shopName,
        employeeId: s.employeeId,
        employeeName: s.employeeName,
        startTime: s.startTime,
        endTime: s.endTime,
        hours: s.hours,
        shiftType: s.shiftType as 'AM' | 'PM' | 'FULL' | 'CUSTOM',
        company: s.company
      }));
      
      console.log(`✅ Generated ${generatedShifts.length} shifts`);
      
      // Log uncovered demand
      if (result.uncovered && result.uncovered.length > 0) {
        console.warn('⚠️ Uncovered demand:', result.uncovered);
      }
      
      // Log employee summary
      console.log('👥 Employee Summary:');
      if (result.employee_summary) {
        Object.entries(result.employee_summary).forEach(([name, data]: [string, unknown]) => {
          const empData = data as { totalHours: number; target: number; daysWorked: number };
          console.log(`  ${name}: ${empData.totalHours}h (target: ${empData.target}h) - ${empData.daysWorked} days`);
        });
      }

      // Update state
      const otherWeekShifts = shifts.filter(s => {
        const shiftDate = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
        return !shiftDate.startsWith(weekStartStr.substring(0, 7));
      });
      
      setShifts([...otherWeekShifts, ...generatedShifts]);
      
      // Save to backend
      await saveRosterToBackend(weekStartStr, generatedShifts);
      
      console.log('✅ ROSTER GENERATION COMPLETE');
      
    } catch (error) {
      console.error('❌ Generation error:', error);
      alert(`Roster generation failed: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };


  // Save roster to backend
  const saveRosterToBackend = async (weekStart: string, shiftsToSave: BackendShift[]) => {
    console.log('Attempting to save roster:', weekStart, shiftsToSave.length, 'shifts');
    try {
      const response = await fetch(`${API_BASE_URL}/roster/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, shifts: shiftsToSave })
      });
      if (response.ok) {
        console.log(`✅ Roster saved for week ${weekStart}`);
      } else {
        console.error('Save failed with status:', response.status);
      }
    } catch (error) {
      console.error('Failed to save roster:', error);
    }
  };


  // Load roster from backend
  const loadRosterFromBackend = async (weekStart: Date) => {
    try {
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      console.log('📥 Loading roster for week:', weekKey);
      
      const response = await fetch(`http://localhost:3001/api/roster/load?weekStart=${weekKey}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📥 Loaded roster data:', data);
        
        if (data.shifts && data.shifts.length > 0) {
          // Convert date strings back to Date objects
          const loadedShifts = data.shifts.map((s: BackendShift) => ({
            ...s,
            date: new Date(s.date)
          }));
          
          setShifts(loadedShifts);
          console.log(`✅ Loaded ${loadedShifts.length} shifts for week ${weekKey}`);
        } else {
          console.log('📭 No shifts found for week', weekKey);
        }
      } else if (response.status === 404) {
        console.log('📭 No roster found for week', weekKey);
      } else {
        console.error('Failed to load roster:', response.status);
      }
    } catch (error) {
      console.error('Error loading roster:', error);
    }
  };


  // Clear roster for specific shops
  const handleClearRoster = (shopIds: number[]) => {
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndDate = addDays(currentWeekStart, 6);
    const weekEndStr = format(weekEndDate, 'yyyy-MM-dd');
    
    setShifts(prev => {
      const updated = prev.filter(shift => {
        const shiftDateStr = typeof shift.date === 'string' 
          ? shift.date.substring(0, 10)
          : format(shift.date, 'yyyy-MM-dd');
        
        const inWeek = shiftDateStr >= weekStartStr && shiftDateStr <= weekEndStr;
        
        return !(inWeek && shopIds.includes(shift.shopId));
      });
      
      // Auto-save the cleared roster
      const weekShifts = updated.filter(s => {
        const d = typeof s.date === 'string' ? s.date.substring(0, 10) : format(s.date, 'yyyy-MM-dd');
        return d >= weekStartStr && d <= weekEndStr;
      });
      saveRosterToBackend(weekStartStr, weekShifts);
      
      return updated;
    });
  };


  // Export to CSV (Excel)
  const exportToCSV = () => {
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
    
    // Filter shifts for current week
    const weekEnd = addDays(currentWeekStart, 6);
    const exportShifts = shifts.filter(s => {
      const d = typeof s.date === 'string' ? parseISO(s.date) : s.date;
      return d >= currentWeekStart && d <= weekEnd;
    });
    
    // Sort by date, then shop, then start time
    exportShifts.sort((a, b) => {
      const dateA = typeof a.date === 'string' ? a.date : format(a.date, 'yyyy-MM-dd');
      const dateB = typeof b.date === 'string' ? b.date : format(b.date, 'yyyy-MM-dd');
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      if (a.shopName !== b.shopName) return a.shopName.localeCompare(b.shopName);
      return a.startTime.localeCompare(b.startTime);
    });
    
    // Create CSV content
    const headers = ['Date', 'Day', 'Shop', 'Employee', 'Start', 'End', 'Hours', 'Type'];
    const rows = exportShifts.map(s => {
      const dateStr = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
      const dayName = format(parseISO(dateStr), 'EEE');
      return [
        dateStr,
        dayName,
        s.shopName,
        s.employeeName,
        s.startTime,
        s.endTime,
        s.hours.toString(),
        s.shiftType
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `roster_${weekStartStr}_to_${weekEndStr}.csv`;
    link.click();
    
    console.log(`📊 Exported ${exportShifts.length} shifts to CSV`);
  };

  // Export to PDF (printable HTML)
  const exportToPDF = () => {
    const weekStartStr = format(currentWeekStart, 'MMMM d');
    const weekEndStr = format(addDays(currentWeekStart, 6), 'MMMM d, yyyy');
    
    // Filter shifts for current week
    const weekEnd = addDays(currentWeekStart, 6);
    const exportShifts = shifts.filter(s => {
      const d = typeof s.date === 'string' ? parseISO(s.date) : s.date;
      return d >= currentWeekStart && d <= weekEnd;
    });
    
    // Group by shop
    const shopGroups: Record<string, BackendShift[]> = {};
    exportShifts.forEach(s => {
      if (!shopGroups[s.shopName]) shopGroups[s.shopName] = [];
      shopGroups[s.shopName].push(s);
    });
    
    // Build HTML
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Roster ${weekStartStr} - ${weekEndStr}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #1e40af; margin-bottom: 5px; }
          h2 { color: #374151; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px; }
          .subtitle { color: #6b7280; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { background: #f3f4f6; padding: 10px; text-align: left; border: 1px solid #e5e7eb; }
          td { padding: 8px 10px; border: 1px solid #e5e7eb; }
          tr:nth-child(even) { background: #f9fafb; }
          .shift-am { background: #dcfce7; }
          .shift-pm { background: #fef9c3; }
          .shift-full { background: #f3e8ff; }
          .total-row { font-weight: bold; background: #e5e7eb; }
          @media print { 
            body { padding: 0; }
            h2 { page-break-before: auto; }
          }
        </style>
      </head>
      <body>
        <h1>Weekly Roster</h1>
        <p class="subtitle">${weekStartStr} - ${weekEndStr}</p>
        
        ${Object.entries(shopGroups).map(([shopName, shopShifts]) => {
          shopShifts.sort((a, b) => {
            const dateA = typeof a.date === 'string' ? a.date : format(a.date, 'yyyy-MM-dd');
            const dateB = typeof b.date === 'string' ? b.date : format(b.date, 'yyyy-MM-dd');
            if (dateA !== dateB) return dateA.localeCompare(dateB);
            return a.startTime.localeCompare(b.startTime);
          });
          
          const totalHours = shopShifts.reduce((sum, s) => sum + s.hours, 0);
          
          return `
            <h2>${shopName}</h2>
            <table>
              <thead>
                <tr>
                  <th>Day</th>
                  <th>Date</th>
                  <th>Employee</th>
                  <th>Start</th>
                  <th>End</th>
                  <th>Hours</th>
                </tr>
              </thead>
              <tbody>
                ${shopShifts.map(s => {
                  const dateStr = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
                  const dayName = format(parseISO(dateStr), 'EEE');
                  const shiftClass = s.shiftType === 'AM' ? 'shift-am' : 
                                     s.shiftType === 'PM' ? 'shift-pm' : 
                                     s.shiftType === 'FULL' ? 'shift-full' : '';
                  return `
                    <tr class="${shiftClass}">
                      <td>${dayName}</td>
                      <td>${dateStr}</td>
                      <td>${s.employeeName}</td>
                      <td>${s.startTime}</td>
                      <td>${s.endTime}</td>
                      <td>${s.hours}h</td>
                    </tr>
                  `;
                }).join('')}
                <tr class="total-row">
                  <td colspan="5">Total Hours</td>
                  <td>${totalHours}h</td>
                </tr>
              </tbody>
            </table>
          `;
        }).join('')}
        
        <p style="margin-top: 30px; color: #9ca3af; font-size: 12px;">
          Generated by RosterPro — ${new Date().toLocaleString()}
        </p>
      </body>
      </html>
    `;
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
    
    console.log(`📄 Exported ${exportShifts.length} shifts to PDF`);
  };


  // Handle shift click
  const handleShiftClick = (shift: BackendShift) => {
    setSelectedShift(shift);
    setSelectedDate(typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd'));
    setSelectedShopId(shift.shopId);
    setShowShiftModal(true);
  };

  // Handle add shift
  const handleAddShift = (dateStr: string, shopId: number) => {
    setSelectedShift(null);
    setSelectedDate(dateStr);
    setSelectedShopId(shopId);
    setShowShiftModal(true);
  };

  // Save shift
  const handleSaveShift = (shiftData: Partial<BackendShift>) => {
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    
    if (selectedShift) {
      // Edit existing
      setShifts(prev => {
        const updated = prev.map(s => 
          s.id === selectedShift.id ? { ...s, ...shiftData } : s
        );
        // Auto-save
        const weekEnd = addDays(currentWeekStart, 6);
        const weekShifts = updated.filter(s => {
          const d = typeof s.date === 'string' ? parseISO(s.date) : s.date;
          return d >= currentWeekStart && d <= weekEnd;
        });
        saveRosterToBackend(weekStartStr, weekShifts);
        return updated;
      });
    } else if (selectedDate && selectedShopId) {
      // Add new
      const shop = shops.find(s => s.id === selectedShopId);
      const employee = employees.find(e => e.id === shiftData.employeeId);
      
      const newShift: BackendShift = {
        id: `shift-${Date.now()}`,
        date: selectedDate,
        shopId: selectedShopId,
        shopName: shop?.name || 'Unknown',
        employeeId: shiftData.employeeId || 0,
        employeeName: employee?.name || 'Unknown',
        startTime: shiftData.startTime || '09:00',
        endTime: shiftData.endTime || '17:00',
        hours: shiftData.hours || 8,
        shiftType: (shiftData.shiftType || 'CUSTOM') as 'AM' | 'PM' | 'FULL' | 'CUSTOM',
        company: shop?.company || 'CMZ',
      };
      
      setShifts(prev => {
        const updated = [...prev, newShift];
        // Auto-save
        const weekEnd = addDays(currentWeekStart, 6);
        const weekShifts = updated.filter(s => {
          const d = typeof s.date === 'string' ? parseISO(s.date) : s.date;
          return d >= currentWeekStart && d <= weekEnd;
        });
        saveRosterToBackend(weekStartStr, weekShifts);
        return updated;
      });
    }
    setShowShiftModal(false);
    setSelectedShift(null);
  };

  // Delete shift
  const handleDeleteShift = (shiftId: string | number) => {
  const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
  
  setShifts(prev => {
    const updated = prev.filter(s => s.id !== shiftId && s.id !== String(shiftId));
      // Auto-save
      const weekEnd = addDays(currentWeekStart, 6);
      const weekShifts = updated.filter(s => {
        const d = typeof s.date === 'string' ? parseISO(s.date) : s.date;
        return d >= currentWeekStart && d <= weekEnd;
      });
      saveRosterToBackend(weekStartStr, weekShifts);
      return updated;
    });
    
    setShowShiftModal(false);
    setSelectedShift(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Roster</h1>
          <p className="text-gray-600 mt-1">
            {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AnimatedButton variant="ghost" size="sm" onClick={exportToCSV}>
            📊 Excel
          </AnimatedButton>
          <AnimatedButton variant="ghost" size="sm" onClick={exportToPDF}>
            📄 PDF
          </AnimatedButton>
          
          <AnimatedButton 
            variant="secondary" 
            icon={Calendar} 
            onClick={() => setShowAvailabilityModal(true)}
          >
            Part-Timer Availability
          </AnimatedButton>
          
          <AnimatedButton 
            variant="danger" 
            icon={Trash2} 
            onClick={() => {
              setSelectedShopsForAction([]);
              setShowClearModal(true);
            }}
          >
            Clear Roster
          </AnimatedButton>
          
          <AnimatedButton 
            icon={Play} 
            onClick={() => {
              setSelectedShopsForAction(filteredShops.map(s => s.id));
              setShowGenerateModal(true);
            }}
          >
            Generate Roster
          </AnimatedButton>
        </div>
      </div>

      {/* Controls */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Week Navigation */}
          <div className="flex items-center gap-2">
            <AnimatedButton variant="ghost" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </AnimatedButton>
            <AnimatedButton variant="secondary" size="sm" onClick={goToToday}>
              Today
            </AnimatedButton>
            <AnimatedButton variant="ghost" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </AnimatedButton>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Filter:</span>
            </div>
            <ToggleButtonGroup
              value={companyFilter}
              onChange={setCompanyFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'CMZ', label: 'CMZ' },
                { value: 'CS', label: 'CS' },
              ]}
            />
            <select
              value={shopFilter}
              onChange={(e) => setShopFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Shops</option>
              {filteredShops.map(shop => (
                <option key={shop.id} value={shop.id}>{shop.name}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Roster Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          {/* Header Row */}
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="p-3 bg-gray-100 rounded-lg font-medium text-gray-700">
              Shop
            </div>
            {weekDates.map(({ day, date, dateStr }) => (
              <div 
                key={dateStr}
                className={`p-3 rounded-lg text-center ${
                  isToday(date) 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'bg-gray-100 text-gray-700'
                }`}
              >
                <div className="font-medium">{day}</div>
                <div className="text-sm">{format(date, 'MMM d')}</div>
              </div>
            ))}
          </div>

          {/* Shop Rows */}
          {filteredShops.map(shop => (
            <div key={shop.id} className="grid grid-cols-8 gap-2 mb-2">
              {/* Shop Name */}
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="font-medium text-gray-900">{shop.name}</div>
                <Badge variant={shop.company === 'CMZ' ? 'purple' : 'warning'} className="mt-1">
                  {shop.company}
                </Badge>
              </div>

              {/* Day Cells */}
              {weekDates.map(({ dateStr, date }) => {
                const dayShifts = shiftsByDateAndShop[dateStr]?.[shop.id] || [];
                
                return (
                  <div 
                    key={`${shop.id}-${dateStr}`}
                    className={`p-2 rounded-lg border min-h-[100px] ${
                      isToday(date) 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    <div className="space-y-1 min-h-[80px]">
                      {dayShifts.map(shift => {
                        // Determine shift type and color
                        const getShiftColor = () => {
                          const type = (shift.shiftType || '').toUpperCase();
                          
                          if (type === 'FULL' || type === 'FULLDAY' || type.includes('FULL')) {
                            return 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700';
                          }
                          if (type === 'PM' || type === 'EVENING' || type.includes('PM')) {
                            return 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700';
                          }
                          if (type === 'AM' || type === 'MORNING' || type.includes('AM')) {
                            return 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700';
                          }
                          
                          if (shift.hours >= 10) {
                            return 'from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700';
                          }
                          
                          const startHour = parseInt(shift.startTime?.split(':')[0] || '0');
                          if (startHour >= 12) {
                            return 'from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700';
                          }
                          
                          return 'from-green-500 to-green-600 hover:from-green-600 hover:to-green-700';
                        };
                        
                        const employee = employees.find(e => e.id === shift.employeeId);
                        const empType = employee?.employmentType === 'full-time' ? 'FT' : 'PT';
                        
                        return (
                          <button
                            key={shift.id}
                            onClick={() => handleShiftClick(shift)}
                            className={`w-full text-left p-1.5 bg-gradient-to-r ${getShiftColor()} text-white rounded text-xs transition-all relative`}
                          >
                            <span className="absolute top-1 right-1 bg-white/20 px-1 rounded text-[10px] font-medium">
                              {shift.hours}h
                            </span>
                            <div className="font-medium truncate pr-8">{shift.employeeName}</div>
                            <div className="flex justify-between items-center mt-0.5">
                              <span className="opacity-80">{shift.startTime}-{shift.endTime}</span>
                              <span className="bg-white/20 px-1 rounded text-[10px] font-medium">{empType}</span>
                            </div>
                          </button>
                        );
                      })}
                      
                      {/* Always show Add button */}
                      <button
                        onClick={() => handleAddShift(dateStr, shop.id)}
                        className="w-full py-1 flex items-center justify-center text-gray-400 hover:text-green-500 hover:bg-green-50 rounded border border-dashed border-gray-300 hover:border-green-400 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>


      {/* Shift Modal */}
      <ShiftModal
        isOpen={showShiftModal}
        onClose={() => {
          setShowShiftModal(false);
          setSelectedShift(null);
        }}
        shift={selectedShift}
        employees={employees}
        shop={shops.find(s => s.id === selectedShopId)}
        date={selectedDate}
        onSave={handleSaveShift}
        onDelete={selectedShift ? () => handleDeleteShift(String(selectedShift.id)) : undefined}
      />
      
      {/* Part-Timer Availability Modal */}
      <AvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        employees={employees}
        shops={shops}
        weekStart={currentWeekStart}
        availability={partTimerAvailability}
        onSave={(availability) => {
          setPartTimerAvailability(availability);
        }}
      />
      
      {/* Generate Roster Modal */}
      <Modal
        isOpen={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Roster"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Select which shops to generate roster for:</p>
          
          {/* Quick Select Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedShopsForAction(filteredShops.map(s => s.id))}
              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => setSelectedShopsForAction([])}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear All
            </button>
            <button
              type="button"
              onClick={() => setSelectedShopsForAction(
                shops.filter(s => s.isActive && s.company === 'CMZ').map(s => s.id)
              )}
              className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
            >
              CMZ Only
            </button>
            <button
              type="button"
              onClick={() => setSelectedShopsForAction(
                shops.filter(s => s.isActive && s.company === 'CS').map(s => s.id)
              )}
              className="px-3 py-1 text-sm bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
            >
              CS Only
            </button>
          </div>
          
          {/* Shop Checkboxes */}
          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {filteredShops.map(shop => (
              <label
                key={shop.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedShopsForAction.includes(shop.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedShopsForAction(prev => [...prev, shop.id]);
                    } else {
                      setSelectedShopsForAction(prev => prev.filter(id => id !== shop.id));
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                />
                <span className="flex-1 font-medium">{shop.name}</span>
                <Badge variant={shop.company === 'CMZ' ? 'purple' : 'warning'}>{shop.company}</Badge>
              </label>
            ))}
          </div>
          
          <div className="text-sm text-gray-500">
            {selectedShopsForAction.length} shop(s) selected
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <AnimatedButton variant="secondary" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton
              icon={Play}
              onClick={async () => {
                // Clear selected shops first
                handleClearRoster(selectedShopsForAction);
                
                // Small delay to ensure state updates
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Generate for ALL shops at once (proper hour tracking)
                await handleGenerateRoster();

                setShowGenerateModal(false);
                setSelectedShopsForAction([]);
              }}
              disabled={selectedShopsForAction.length === 0 || isGenerating}
              loading={isGenerating}
            >
              Generate {selectedShopsForAction.length} Shop(s)
            </AnimatedButton>
          </div>
        </div>
      </Modal>

      {/* Clear Roster Modal */}
      <Modal
        isOpen={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Clear Roster"
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              ⚠️ This will remove all shifts for the selected shops for the current week. This action cannot be undone.
            </p>
          </div>
          
          <p className="text-gray-600 text-sm">Select which shops to clear:</p>
          
          {/* Quick Select Buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setSelectedShopsForAction(filteredShops.map(s => s.id))}
              className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={() => setSelectedShopsForAction([])}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            >
              Clear Selection
            </button>
          </div>
          
          {/* Shop Checkboxes */}
          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {filteredShops.map(shop => {
              const shopShiftCount = weekShifts.filter(s => s.shopId === shop.id).length;
              return (
                <label
                  key={shop.id}
                  className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedShopsForAction.includes(shop.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedShopsForAction(prev => [...prev, shop.id]);
                      } else {
                        setSelectedShopsForAction(prev => prev.filter(id => id !== shop.id));
                      }
                    }}
                    className="w-4 h-4 text-red-600 rounded focus:ring-red-500"
                  />
                  <span className="flex-1 font-medium">{shop.name}</span>
                  <span className="text-sm text-gray-500">{shopShiftCount} shifts</span>
                  <Badge variant={shop.company === 'CMZ' ? 'purple' : 'warning'}>{shop.company}</Badge>
                </label>
              );
            })}
          </div>
          
          <div className="text-sm text-gray-500">
            {selectedShopsForAction.length} shop(s) selected
          </div>
          
          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <AnimatedButton variant="secondary" onClick={() => setShowClearModal(false)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton
              variant="danger"
              icon={Trash2}
              onClick={() => {
                handleClearRoster(selectedShopsForAction);
                setShowClearModal(false);
                setSelectedShopsForAction([]);
              }}
              disabled={selectedShopsForAction.length === 0}
            >
              Clear {selectedShopsForAction.length} Shop(s)
            </AnimatedButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ============== SHIFT MODAL ==============

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  shift: BackendShift | null;
  employees: Employee[];
  shop?: Shop;
  date: string | null;
  onSave: (data: Partial<BackendShift>) => void;
  onDelete?: () => void;
}

function ShiftModal({ isOpen, onClose, shift, employees, shop, date, onSave, onDelete }: ShiftModalProps) {
  const [formData, setFormData] = useState({
    employeeId: '',
    startTime: '09:00',
    endTime: '17:00',
  });

  React.useEffect(() => {
    if (isOpen) {
      if (shift) {
        setFormData({
          employeeId: String(shift.employeeId),
          startTime: shift.startTime,
          endTime: shift.endTime,
        });
      } else {
        setFormData({
          employeeId: '',
          startTime: shop?.openTime || '09:00',
          endTime: '17:00',
        });
      }
    }
  }, [isOpen, shift, shop]);

  // Calculate hours
  const calculateHours = (start: string, end: string): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return Math.max(0, (endMinutes - startMinutes) / 60);
  };

  const hours = calculateHours(formData.startTime, formData.endTime);

  // Filter employees by shop company
  const availableEmployees = useMemo(() => {
    if (!shop) return employees.filter(e => !e.excludeFromRoster);
    return employees.filter(e => {
      if (e.excludeFromRoster) return false;
      if (e.company === 'Both') return true;
      return e.company === shop.company;
    });
  }, [employees, shop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId) return;

    onSave({
      employeeId: parseInt(formData.employeeId),
      startTime: formData.startTime,
      endTime: formData.endTime,
      hours,
      shiftType: hours >= 7 ? 'FULL' : hours >= 4 ? 'AM' : 'CUSTOM',
    });
  };

  const employeeOptions = [
    { value: '', label: 'Select Employee' },
    ...availableEmployees.map(emp => ({
      value: String(emp.id),
      label: `${emp.name} (${emp.employmentType})`,
    })),
  ];

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={shift ? 'Edit Shift' : 'Add Shift'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Info */}
        <div className="p-3 bg-gray-50 rounded-lg text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-gray-500">Shop:</span>
              <p className="font-medium">{shop?.name || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-500">Date:</span>
              <p className="font-medium">
                {date 
                  ? format(typeof date === 'string' ? parseISO(date) : date, 'EEE, MMM d, yyyy') 
                  : 'Unknown'}
              </p>
            </div>
          </div>
        </div>

        <FormSelect
          label="Employee"
          value={formData.employeeId}
          onChange={(value) => setFormData(prev => ({ ...prev, employeeId: value }))}
          options={employeeOptions}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Start Time"
            type="time"
            value={formData.startTime}
            onChange={(value) => setFormData(prev => ({ ...prev, startTime: value }))}
            required
          />
          <FormInput
            label="End Time"
            type="time"
            value={formData.endTime}
            onChange={(value) => setFormData(prev => ({ ...prev, endTime: value }))}
            required
          />
        </div>

        <div className="p-3 bg-blue-50 rounded-lg">
          <span className="text-blue-700 text-sm">
            Total Hours: <strong>{hours.toFixed(1)}h</strong>
          </span>
        </div>

        <div className="flex justify-between gap-3 pt-4 border-t">
          {onDelete && (
            <AnimatedButton variant="danger" icon={Trash2} onClick={onDelete}>
              Delete
            </AnimatedButton>
          )}
          <div className="flex-1" />
          <AnimatedButton variant="secondary" onClick={onClose}>
            Cancel
          </AnimatedButton>
          <AnimatedButton type="submit" icon={Save}>
            {shift ? 'Save Changes' : 'Add Shift'}
          </AnimatedButton>
        </div>
      </form>
    </Modal>
  );
}

// ============== OVERTIME VIEW ==============

interface OvertimeViewProps {
  employees: Employee[];
  shifts: BackendShift[];
}

function OvertimeView({ employees, shifts }: OvertimeViewProps) {
  const [dateRange, setDateRange] = useState<'week' | 'month' | 'custom'>('week');
  const [companyFilter, setCompanyFilter] = useState<'all' | 'CMZ' | 'CS'>('all');
  const [customStartDate, setCustomStartDate] = useState(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  const [customEndDate, setCustomEndDate] = useState(format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6), 'yyyy-MM-dd'));

  // Get date range boundaries
  const dateRangeBounds = useMemo(() => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    
    switch (dateRange) {
      case 'week':
        return {
          start: currentWeekStart,
          end: addDays(currentWeekStart, 6),
          label: `${format(currentWeekStart, 'MMM d')} - ${format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}`
        };
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
          start: monthStart,
          end: monthEnd,
          label: format(today, 'MMMM yyyy')
        };
      case 'custom':
        return {
          start: parseISO(customStartDate),
          end: parseISO(customEndDate),
          label: `${format(parseISO(customStartDate), 'MMM d')} - ${format(parseISO(customEndDate), 'MMM d, yyyy')}`
        };
      default:
        return {
          start: currentWeekStart,
          end: addDays(currentWeekStart, 6),
          label: 'This Week'
        };
    }
  }, [dateRange, customStartDate, customEndDate]);

  // Calculate weeks in range for proper target calculation
  const weeksInRange = useMemo(() => {
    const days = Math.ceil((dateRangeBounds.end.getTime() - dateRangeBounds.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, days / 7);
  }, [dateRangeBounds]);

  // Calculate overtime for each employee
  const overtimeData = useMemo(() => {
    return employees
      .filter(emp => !emp.excludeFromRoster)
      .filter(emp => companyFilter === 'all' || emp.company === companyFilter || emp.company === 'Both')
      .map(emp => {
        // Filter shifts within date range
        const empShifts = shifts.filter(s => {
          if (s.employeeId !== emp.id) return false;
          const shiftDate = typeof s.date === 'string' ? parseISO(s.date) : s.date;
          return shiftDate >= dateRangeBounds.start && shiftDate <= dateRangeBounds.end;
        });
        
        const totalHours = empShifts.reduce((acc, s) => acc + s.hours, 0);
        const targetHours = emp.weeklyHours * weeksInRange;
        const regularHours = Math.min(totalHours, targetHours);
        const overtimeHours = Math.max(0, totalHours - targetHours);
        
        const payScale = DEFAULT_PAY_SCALES.find(ps => ps.id === emp.payScaleId);
        const baseRate = payScale?.hourlyRate || 10;
        const overtimeRate = baseRate * (payScale?.overtimeMultiplier || 1.5);
        
        const basePay = regularHours * baseRate;
        const overtimePay = overtimeHours * overtimeRate;
        const totalPay = basePay + overtimePay;

        return {
          employee: emp,
          totalHours,
          regularHours,
          overtimeHours,
          targetHours,
          basePay,
          overtimePay,
          totalPay,
          shiftsCount: empShifts.length,
        };
      })
      .sort((a, b) => b.overtimeHours - a.overtimeHours);
  }, [employees, shifts, companyFilter, dateRangeBounds, weeksInRange]);


  const totals = useMemo(() => ({
    totalHours: overtimeData.reduce((acc, d) => acc + d.totalHours, 0),
    overtimeHours: overtimeData.reduce((acc, d) => acc + d.overtimeHours, 0),
    totalPay: overtimeData.reduce((acc, d) => acc + d.totalPay, 0),
    overtimePay: overtimeData.reduce((acc, d) => acc + d.overtimePay, 0),
  }), [overtimeData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overtime Tracking</h1>
          <p className="text-gray-600 mt-1">Monitor employee hours and overtime costs</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Clock}
          label="Total Hours"
          value={totals.totalHours.toFixed(1)}
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Clock}
          label="Overtime Hours"
          value={totals.overtimeHours.toFixed(1)}
          gradient="from-orange-500 to-red-500"
        />
        <StatCard
          icon={DollarSign}
          label="Total Pay"
          value={`€${totals.totalPay.toFixed(2)}`}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          icon={DollarSign}
          label="Overtime Cost"
          value={`€${totals.overtimePay.toFixed(2)}`}
          gradient="from-purple-500 to-purple-600"
        />
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <ToggleButtonGroup
            value={dateRange}
            onChange={setDateRange}
            options={[
              { value: 'week', label: 'This Week' },
              { value: 'month', label: 'This Month' },
              { value: 'custom', label: 'Custom' },
            ]}
          />
          {dateRange === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              <span className="text-gray-500">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
          <ToggleButtonGroup
            value={companyFilter}
            onChange={setCompanyFilter}
            options={[
              { value: 'all', label: 'All Companies' },
              { value: 'CMZ', label: 'CMZ' },
              { value: 'CS', label: 'CS' },
            ]}
          />
          <div className="ml-auto text-sm text-gray-600">
            {dateRangeBounds.label}
          </div>
        </div>
      </GlassCard>


      {/* Employee Overtime Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-4 font-medium text-gray-700">Employee</th>
                <th className="text-center p-4 font-medium text-gray-700">Shifts</th>
                <th className="text-center p-4 font-medium text-gray-700">Regular</th>
                <th className="text-center p-4 font-medium text-gray-700">Overtime</th>
                <th className="text-center p-4 font-medium text-gray-700">Total Hours</th>
                <th className="text-right p-4 font-medium text-gray-700">Base Pay</th>
                <th className="text-right p-4 font-medium text-gray-700">OT Pay</th>
                <th className="text-right p-4 font-medium text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {overtimeData.map(({ employee, shiftsCount, regularHours, overtimeHours, totalHours, basePay, overtimePay, totalPay }) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={employee.name} size="sm" />
                      <div>
                        <p className="font-medium text-gray-900">{employee.name}</p>
                        <p className="text-xs text-gray-500">{employee.company} • {employee.weeklyHours}h/week</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center text-gray-600">{shiftsCount}</td>
                  <td className="p-4 text-center text-gray-600">{regularHours.toFixed(1)}h</td>
                  <td className="p-4 text-center">
                    {overtimeHours > 0 ? (
                      <Badge variant="danger">{overtimeHours.toFixed(1)}h</Badge>
                    ) : (
                      <span className="text-gray-400">0h</span>
                    )}
                  </td>
                  <td className="p-4 text-center font-medium">{totalHours.toFixed(1)}h</td>
                  <td className="p-4 text-right text-gray-600">€{basePay.toFixed(2)}</td>
                  <td className="p-4 text-right text-orange-600 font-medium">€{overtimePay.toFixed(2)}</td>
                  <td className="p-4 text-right font-bold text-gray-900">€{totalPay.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}

// ============== PAY SCALES VIEW ==============

function PayScalesView() {
  const [payScales, setPayScales] = useState<PayScale[]>(DEFAULT_PAY_SCALES);
  const [allowances, setAllowances] = useState<Allowance[]>(DEFAULT_ALLOWANCES);
  
  // Modal states
  const [showPayScaleModal, setShowPayScaleModal] = useState(false);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [editingPayScale, setEditingPayScale] = useState<PayScale | null>(null);
  const [editingAllowance, setEditingAllowance] = useState<Allowance | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'payscale' | 'allowance'; id: string } | null>(null);

  // Pay Scale form state
  const [payScaleForm, setPayScaleForm] = useState({
    name: '',
    grade: 'Entry',
    hourlyRate: 8.50,
    overtimeMultiplier: 1.5
  });

  // Allowance form state
  const [allowanceForm, setAllowanceForm] = useState({
    name: '',
    type: 'fixed' as 'fixed' | 'hourly' | 'percentage',
    value: 0,
    description: ''
  });

  // Open Add Pay Scale modal
  const handleAddPayScale = () => {
    setEditingPayScale(null);
    setPayScaleForm({
      name: '',
      grade: 'Entry',
      hourlyRate: 8.50,
      overtimeMultiplier: 1.5
    });
    setShowPayScaleModal(true);
  };

  // Open Edit Pay Scale modal
  const handleEditPayScale = (scale: PayScale) => {
    setEditingPayScale(scale);
    setPayScaleForm({
      name: scale.name,
      grade: scale.grade || 'Entry',
      hourlyRate: scale.hourlyRate,
      overtimeMultiplier: scale.overtimeMultiplier || 1.5
    });
    setShowPayScaleModal(true);
  };

  // Save Pay Scale
  const handleSavePayScale = () => {
    if (!payScaleForm.name.trim()) return;

    const hourlyRate = payScaleForm.hourlyRate || 8.50;
    const overtimeMultiplier = payScaleForm.overtimeMultiplier || 1.5;

    if (editingPayScale) {
      // Update existing
      setPayScales(prev => prev.map(s => 
        s.id === editingPayScale.id 
          ? { 
              ...s, 
              name: payScaleForm.name,
              grade: payScaleForm.grade,
              hourlyRate: hourlyRate,
              overtimeMultiplier: overtimeMultiplier,
              overtimeRate: hourlyRate * overtimeMultiplier
            }
          : s
      ));
    } else {
      // Add new
      const newScale: PayScale = {
        id: `scale-${Date.now()}`,
        name: payScaleForm.name,
        grade: payScaleForm.grade || 'Entry',
        hourlyRate: hourlyRate,
        overtimeMultiplier: overtimeMultiplier,
        overtimeRate: hourlyRate * overtimeMultiplier
      };
      setPayScales(prev => [...prev, newScale]);
    }
    setShowPayScaleModal(false);
  };

  // Delete Pay Scale
  const handleDeletePayScale = (id: string) => {
    setPayScales(prev => prev.filter(s => s.id !== id));
    setShowDeleteConfirm(null);
  };

  // Open Add Allowance modal
  const handleAddAllowance = () => {
    setEditingAllowance(null);
    setAllowanceForm({
      name: '',
      type: 'fixed',
      value: 0,
      description: ''
    });
    setShowAllowanceModal(true);
  };

  // Open Edit Allowance modal
  const handleEditAllowance = (allowance: Allowance) => {
    setEditingAllowance(allowance);
    setAllowanceForm({
      name: allowance.name,
      type: allowance.type,
      value: allowance.value,
      description: allowance.description || ''
    });
    setShowAllowanceModal(true);
  };

  // Save Allowance
  const handleSaveAllowance = () => {
    if (!allowanceForm.name.trim()) return;

    if (editingAllowance) {
      // Update existing
      setAllowances(prev => prev.map(a => 
        a.id === editingAllowance.id 
          ? { 
              id: a.id,
              name: allowanceForm.name,
              type: allowanceForm.type,
              value: allowanceForm.value,
              description: allowanceForm.description || ''
            }
          : a
      ));
    } else {
      // Add new
      const newAllowance: Allowance = {
        id: `allowance-${Date.now()}`,
        name: allowanceForm.name,
        type: allowanceForm.type,
        value: allowanceForm.value,
        description: allowanceForm.description || ''
      };
      setAllowances(prev => [...prev, newAllowance]);
    }
    setShowAllowanceModal(false);
  };

  // Delete Allowance
  const handleDeleteAllowance = (id: string) => {
    setAllowances(prev => prev.filter(a => a.id !== id));
    setShowDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pay Scales & Allowances</h1>
          <p className="text-gray-600 mt-1">Manage pay grades and employee allowances</p>
        </div>
        <AnimatedButton icon={Plus} onClick={handleAddPayScale}>
          Add Pay Scale
        </AnimatedButton>
      </div>

      {/* Pay Scales */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pay Scales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payScales.map(scale => (
            <div key={scale.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900">{scale.name}</h3>
                <Badge variant="info">{scale.grade}</Badge>
              </div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Hourly Rate:</span>
                  <span className="font-medium">€{scale.hourlyRate.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">OT Multiplier:</span>
                  <span className="font-medium">{scale.overtimeMultiplier || 1.5}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">OT Rate:</span>
                  <span className="font-medium text-orange-600">€{(scale.hourlyRate * (scale.overtimeMultiplier || 1.5)).toFixed(2)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                <AnimatedButton variant="ghost" size="xs" icon={Edit2} onClick={() => handleEditPayScale(scale)}>
                  Edit
                </AnimatedButton>
                <AnimatedButton variant="ghost" size="xs" icon={Trash2} onClick={() => setShowDeleteConfirm({ type: 'payscale', id: scale.id })}>
                  Delete
                </AnimatedButton>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Allowances */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Allowances & Bonuses</h2>
          <AnimatedButton variant="secondary" size="sm" icon={Plus} onClick={handleAddAllowance}>
            Add Allowance
          </AnimatedButton>
        </div>
        <div className="space-y-3">
          {allowances.map(allowance => (
            <div key={allowance.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <h3 className="font-medium text-gray-900">{allowance.name}</h3>
                <p className="text-sm text-gray-500">{allowance.description}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge variant={allowance.type === 'fixed' ? 'success' : allowance.type === 'hourly' ? 'info' : 'warning'}>
                    {allowance.type}
                  </Badge>
                  <p className="font-semibold text-gray-900 mt-1">
                    {allowance.type === 'fixed' && `€${allowance.value}/month`}
                    {allowance.type === 'hourly' && `€${allowance.value}/hour`}
                    {allowance.type === 'percentage' && `${allowance.value}%`}
                  </p>
                </div>
                <AnimatedButton variant="ghost" size="sm" icon={Edit2} onClick={() => handleEditAllowance(allowance)}>
                  Edit
                </AnimatedButton>
                <AnimatedButton variant="ghost" size="sm" icon={Trash2} onClick={() => setShowDeleteConfirm({ type: 'allowance', id: allowance.id })}>
                  Delete
                </AnimatedButton>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Pay Scale Modal */}
      <Modal 
        isOpen={showPayScaleModal} 
        onClose={() => setShowPayScaleModal(false)} 
        title={editingPayScale ? 'Edit Pay Scale' : 'Add Pay Scale'}
      >
        <div className="space-y-4">
          <FormInput
            label="Scale Name"
            value={payScaleForm.name}
            onChange={(value) => setPayScaleForm(prev => ({ ...prev, name: value }))}
            placeholder="e.g., Senior Staff"
            required
          />
          <FormSelect
            label="Grade"
            value={payScaleForm.grade}
            onChange={(value) => setPayScaleForm(prev => ({ ...prev, grade: value }))}
            options={[
              { value: 'Entry', label: 'Entry' },
              { value: 'Junior', label: 'Junior' },
              { value: 'Senior', label: 'Senior' },
              { value: 'Supervisor', label: 'Supervisor' },
              { value: 'Manager', label: 'Manager' },
            ]}
          />
          <FormInput
            label="Hourly Rate (€)"
            type="number"
            value={payScaleForm.hourlyRate}
            onChange={(value) => setPayScaleForm(prev => ({ ...prev, hourlyRate: parseFloat(value) || 0 }))}
            placeholder="8.50"
            required
          />
          <FormInput
            label="Overtime Multiplier"
            type="number"
            value={payScaleForm.overtimeMultiplier}
            onChange={(value) => setPayScaleForm(prev => ({ ...prev, overtimeMultiplier: parseFloat(value) || 1.5 }))}
            placeholder="1.5"
            required
          />
          <div className="p-3 bg-orange-50 rounded-lg">
            <p className="text-sm text-orange-700">
              <strong>Overtime Rate:</strong> €{((payScaleForm.hourlyRate || 0) * (payScaleForm.overtimeMultiplier || 1.5)).toFixed(2)}
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <AnimatedButton variant="secondary" onClick={() => setShowPayScaleModal(false)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton icon={Check} onClick={handleSavePayScale}>
              {editingPayScale ? 'Save Changes' : 'Add Pay Scale'}
            </AnimatedButton>
          </div>
        </div>
      </Modal>

      {/* Allowance Modal */}
      <Modal 
        isOpen={showAllowanceModal} 
        onClose={() => setShowAllowanceModal(false)} 
        title={editingAllowance ? 'Edit Allowance' : 'Add Allowance'}
      >
        <div className="space-y-4">
          <FormInput
            label="Allowance Name"
            value={allowanceForm.name}
            onChange={(value) => setAllowanceForm(prev => ({ ...prev, name: value }))}
            placeholder="e.g., Transport Allowance"
            required
          />
          <FormSelect
            label="Type"
            value={allowanceForm.type}
            onChange={(value) => setAllowanceForm(prev => ({ ...prev, type: value as 'fixed' | 'hourly' | 'percentage' }))}
            options={[
              { value: 'fixed', label: 'Fixed (per month)' },
              { value: 'hourly', label: 'Hourly (per hour worked)' },
              { value: 'percentage', label: 'Percentage (of base pay)' },
            ]}
          />
          <FormInput
            label={allowanceForm.type === 'percentage' ? 'Percentage (%)' : 'Amount (€)'}
            type="number"
            value={allowanceForm.value}
            onChange={(value) => setAllowanceForm(prev => ({ ...prev, value: parseFloat(value) || 0 }))}
            placeholder={allowanceForm.type === 'percentage' ? '10' : '50'}
            required
          />
          <FormInput
            label="Description"
            value={allowanceForm.description}
            onChange={(value) => setAllowanceForm(prev => ({ ...prev, description: value }))}
            placeholder="Brief description of this allowance"
          />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <AnimatedButton variant="secondary" onClick={() => setShowAllowanceModal(false)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton icon={Check} onClick={handleSaveAllowance}>
              {editingAllowance ? 'Save Changes' : 'Add Allowance'}
            </AnimatedButton>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm !== null}
        onClose={() => setShowDeleteConfirm(null)}
        onConfirm={() => {
          if (showDeleteConfirm?.type === 'payscale') {
            handleDeletePayScale(showDeleteConfirm.id);
          } else if (showDeleteConfirm?.type === 'allowance') {
            handleDeleteAllowance(showDeleteConfirm.id);
          }
        }}
        title={showDeleteConfirm?.type === 'payscale' ? 'Delete Pay Scale' : 'Delete Allowance'}
        message="Are you sure you want to delete this? This action cannot be undone."
      />
    </div>
  );
}


// ============== SETTINGS VIEW ==============

function SettingsView({ 
  currentUser, 
  onSyncToDatabase,
  darkMode,
  setDarkMode,
  notificationsEnabled,
  setNotificationsEnabled
}: { 
  currentUser: CurrentUser; 
  onSyncToDatabase?: () => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  notificationsEnabled: boolean;
  setNotificationsEnabled: (value: boolean) => void;
}) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    if (onSyncToDatabase) {
      await onSyncToDatabase();
    }
    setIsSyncing(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and system preferences</p>
      </div>

      {/* Profile */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
        <div className="flex items-center gap-4 mb-6">
          <Avatar name={currentUser.name} size="lg" />
          <div>
            <h3 className="font-semibold text-gray-900">{currentUser.name}</h3>
            <p className="text-gray-500">{currentUser.email}</p>
            <Badge variant="info" className="mt-1">{currentUser.role}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Full Name"
            value={currentUser.name}
            onChange={() => {}}
            disabled
          />
          <FormInput
            label="Email"
            type="email"
            value={currentUser.email}
            onChange={() => {}}
            disabled
          />
        </div>
      </GlassCard>

      {/* Database Sync */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Database</h2>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Sync to Database</h3>
            <p className="text-sm text-gray-500">Save all shops and employees to the database for persistence</p>
          </div>
          <AnimatedButton 
            onClick={handleSync} 
            disabled={isSyncing}
            icon={Database}
          >
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </AnimatedButton>
        </div>
      </GlassCard>

      {/* System Preferences */}
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Dark Mode</h3>
              <p className="text-sm text-gray-500">Toggle dark theme (coming soon)</p>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              <Sun className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Notifications</h3>
              <p className="text-sm text-gray-500">Enable push notifications</p>
            </div>
            <button 
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                notificationsEnabled ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}
            >
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}



// ============== EMPLOYEE PORTAL VIEW ==============

interface EmployeePortalViewProps {
  employee: Employee;
  shifts: BackendShift[];
  shops: Shop[];
  employees: Employee[];
  leaveRequests: LeaveRequest[];
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  swapRequests: ShiftSwapRequest[];
  setSwapRequests: React.Dispatch<React.SetStateAction<ShiftSwapRequest[]>>;
  onProfileUpdate: (notification: ProfileUpdateNotification) => void;
  onEmployeeUpdate: (updatedEmployee: Employee) => void;
}


function EmployeePortalView({ 
  employee, 
  shifts, 
  shops, 
  employees,
  leaveRequests,
  setLeaveRequests,
  swapRequests,
  setSwapRequests,
  onProfileUpdate,
  onEmployeeUpdate
}: EmployeePortalViewProps) {

  const [activeTab, setActiveTab] = useState<'roster' | 'leave' | 'swaps' | 'details' | 'hours'>('roster');
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<BackendShift | null>(null);
  
  // Leave form state
  const [leaveForm, setLeaveForm] = useState({
    type: 'annual' as 'annual' | 'sick' | 'personal' | 'unpaid',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  });
  
  // Details editing state
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [detailsUpdateSuccess, setDetailsUpdateSuccess] = useState(false);
  const [detailsForm, setDetailsForm] = useState({
    phone: employee.phone || '',
    idNumber: employee.idNumber || '',
    taxNumber: employee.taxNumber || '',
    ssnNumber: employee.ssnNumber || '',
    tcnNumber: employee.tcnNumber || '',
    tcnExpiry: employee.tcnExpiry || '',
    iban: employee.iban || '',
  });

  // Get employee's primary shop
  const primaryShop = shops.find(s => s.id === employee.primaryShopId);
  
  // Get week dates
  const weekDates = useMemo(() => {
    return DAYS_OF_WEEK.map((day, index) => ({
      day,
      date: addDays(currentWeekStart, index),
      dateStr: format(addDays(currentWeekStart, index), 'yyyy-MM-dd'),
    }));
  }, [currentWeekStart]);

  // Filter shifts for this employee and current week
  const myShifts = useMemo(() => {
    const weekEnd = addDays(currentWeekStart, 6);
    return shifts.filter(shift => {
      const shiftDate = typeof shift.date === 'string' ? parseISO(shift.date) : shift.date;
      return shift.employeeId === employee.id && 
             shiftDate >= currentWeekStart && 
             shiftDate <= weekEnd;
    }).sort((a, b) => {
      const dateA = typeof a.date === 'string' ? a.date : format(a.date, 'yyyy-MM-dd');
      const dateB = typeof b.date === 'string' ? b.date : format(b.date, 'yyyy-MM-dd');
      return dateA.localeCompare(dateB);
    });
  }, [shifts, employee.id, currentWeekStart]);

  // Calculate weekly hours
  const weeklyHours = useMemo(() => {
    return myShifts.reduce((acc, shift) => acc + shift.hours, 0);
  }, [myShifts]);

  // Get my leave requests
  const myLeaveRequests = useMemo(() => {
    return leaveRequests.filter(r => r.employeeId === employee.id)
      .sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
  }, [leaveRequests, employee.id]);

  // Get my swap requests
  const mySwapRequests = useMemo(() => {
    return swapRequests.filter(r => 
      r.requesterId === employee.id || r.targetEmployeeId === employee.id
    ).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [swapRequests, employee.id]);

  // Calculate Saturday leave count for current year
  const saturdayLeaveCount = useMemo(() => {
    const currentYear = new Date().getFullYear();
    let totalSaturdays = 0;
    
    leaveRequests.forEach(request => {
      if (request.employeeId !== employee.id) return;
      if (request.status !== 'approved') return;
      
      // Check each day in the leave range for Saturdays
      const start = parseISO(request.startDate);
      const end = parseISO(request.endDate);
      
      let current = new Date(start);
      while (current <= end) {
        // 6 = Saturday
        if (current.getDay() === 6 && current.getFullYear() === currentYear) {
          totalSaturdays++;
        }
        current.setDate(current.getDate() + 1);
      }
    });
    
    return totalSaturdays;
  }, [leaveRequests, employee.id]);


  // Navigation
  const goToPreviousWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const goToNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Submit leave request
  const handleSubmitLeave = () => {
    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      employeeId: employee.id,
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    setLeaveRequests(prev => [...prev, newRequest]);
    setShowLeaveModal(false);
    setLeaveForm({
      type: 'annual',
      startDate: format(new Date(), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      reason: ''
    });
  };

  // Request shift swap
  const handleRequestSwap = (targetEmployeeId: number, targetShiftId: string) => {
    if (!selectedShiftForSwap) return;
    
    const newSwap: ShiftSwapRequest = {
      id: `swap-${Date.now()}`,
      requesterId: employee.id,
      requesterShiftId: selectedShiftForSwap.id,
      targetEmployeeId,
      targetShiftId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setSwapRequests(prev => [...prev, newSwap]);
    setShowSwapModal(false);
    setSelectedShiftForSwap(null);
  };

  // Get shift color
  const getShiftColor = (shift: BackendShift) => {
    const type = (shift.shiftType || '').toUpperCase();
    if (type.includes('FULL') || shift.hours >= 10) return 'from-purple-500 to-purple-600';
    if (type.includes('PM') || parseInt(shift.startTime?.split(':')[0] || '0') >= 12) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };
  
  // Handle save details
  const handleSaveDetails = async () => {
    // Create notification for admins/managers
    const notification: ProfileUpdateNotification = {
      id: `profile-update-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      changes: {},
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    // Track what changed - changes is initialized above so we can use it directly
    const changes = notification.changes!;
    
    if (detailsForm.phone !== (employee.phone || '')) {
      changes.phone = { old: employee.phone || '', new: detailsForm.phone };
    }
    if (detailsForm.idNumber !== (employee.idNumber || '')) {
      changes.idNumber = { old: employee.idNumber || '', new: detailsForm.idNumber };
    }
    if (detailsForm.taxNumber !== (employee.taxNumber || '')) {
      changes.taxNumber = { old: employee.taxNumber || '', new: detailsForm.taxNumber };
    }
    if (detailsForm.ssnNumber !== (employee.ssnNumber || '')) {
      changes.ssnNumber = { old: employee.ssnNumber || '', new: detailsForm.ssnNumber };
    }
    if (detailsForm.tcnNumber !== (employee.tcnNumber || '')) {
      changes.tcnNumber = { old: employee.tcnNumber || '', new: detailsForm.tcnNumber };
    }
    if (detailsForm.tcnExpiry !== (employee.tcnExpiry || '')) {
      changes.tcnExpiry = { old: employee.tcnExpiry || '', new: detailsForm.tcnExpiry };
    }
    if (detailsForm.iban !== (employee.iban || '')) {
      changes.iban = { old: employee.iban || '', new: detailsForm.iban };
    }

    // Only send notification if something changed
    if (Object.keys(changes).length > 0) {
      onProfileUpdate(notification);
      
      // Update employee data
      const updatedEmployee: Employee = {
        ...employee,
        phone: detailsForm.phone,
        idNumber: detailsForm.idNumber,
        taxNumber: detailsForm.taxNumber,
        ssnNumber: detailsForm.ssnNumber,
        tcnNumber: detailsForm.tcnNumber,
        tcnExpiry: detailsForm.tcnExpiry,
        iban: detailsForm.iban,
      };
      onEmployeeUpdate(updatedEmployee);
      
      console.log('📧 Profile update notification sent:', notification);
    }
    
    setIsEditingDetails(false);
    setDetailsUpdateSuccess(true);
    setTimeout(() => setDetailsUpdateSuccess(false), 5000);
  };


  const tabs = [
    { id: 'roster', label: 'My Roster', icon: Calendar },
    { id: 'leave', label: 'Leave', icon: ClipboardList },
    { id: 'swaps', label: 'Swaps', icon: Repeat },
    { id: 'hours', label: 'My Hours', icon: Clock },
    { id: 'details', label: 'My Details', icon: Users },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {employee.name}</h1>
          <p className="text-gray-600 mt-1">
            {primaryShop?.name || 'No primary shop'} • {employee.employmentType === 'full-time' ? 'Full-Time' : 'Part-Time'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-gray-500">This Week</p>
            <p className="text-2xl font-bold text-blue-600">{weeklyHours}h</p>
          </div>
          <Avatar name={employee.name} size="lg" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'roster' && (
        <div className="space-y-4">
          {/* Week Navigation */}
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AnimatedButton variant="ghost" size="sm" onClick={goToPreviousWeek}>
                  <ChevronLeft className="w-4 h-4" />
                </AnimatedButton>
                <AnimatedButton variant="secondary" size="sm" onClick={goToToday}>
                  Today
                </AnimatedButton>
                <AnimatedButton variant="ghost" size="sm" onClick={goToNextWeek}>
                  <ChevronRight className="w-4 h-4" />
                </AnimatedButton>
              </div>
              <p className="font-medium text-gray-700">
                {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}
              </p>
            </div>
          </GlassCard>

          {/* Weekly Roster Grid */}
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map(({ day, date, dateStr }) => {
              const dayShift = myShifts.find(s => {
                const shiftDateStr = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
                return shiftDateStr === dateStr;
              });
              const isCurrentDay = isToday(date);
              
              return (
                <div 
                  key={dateStr}
                  className={`rounded-xl border-2 overflow-hidden ${
                    isCurrentDay ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className={`p-2 text-center ${isCurrentDay ? 'bg-blue-100' : 'bg-gray-50'}`}>
                    <p className="font-medium text-gray-700">{day}</p>
                    <p className="text-sm text-gray-500">{format(date, 'MMM d')}</p>
                  </div>
                  <div className="p-3 min-h-[120px]">
                    {dayShift ? (
                      <div 
                        className={`p-3 rounded-lg bg-gradient-to-r ${getShiftColor(dayShift)} text-white cursor-pointer hover:shadow-lg transition-shadow`}
                        onClick={() => {
                          setSelectedShiftForSwap(dayShift);
                          setShowSwapModal(true);
                        }}
                      >
                        <p className="font-bold text-lg">{dayShift.startTime}</p>
                        <p className="text-sm opacity-90">to {dayShift.endTime}</p>
                        <div className="mt-2 pt-2 border-t border-white/30">
                          <p className="text-xs opacity-80">{dayShift.shopName}</p>
                          <p className="font-semibold">{dayShift.hours}h</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400">
                        <p className="text-sm">Day Off</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Summary */}
          <GlassCard className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600">Weekly Summary</p>
                <p className="text-lg font-semibold">{myShifts.length} shifts • {weeklyHours} hours</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">
                    {myShifts.filter(s => s.shiftType?.toUpperCase().includes('AM')).length}
                  </p>
                  <p className="text-xs text-gray-500">AM Shifts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {myShifts.filter(s => s.shiftType?.toUpperCase().includes('PM')).length}
                  </p>
                  <p className="text-xs text-gray-500">PM Shifts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">
                    {myShifts.filter(s => s.hours >= 10).length}
                  </p>
                  <p className="text-xs text-gray-500">Full Days</p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">My Leave Requests</h2>
            <AnimatedButton icon={Plus} onClick={() => setShowLeaveModal(true)}>
              Request Leave
            </AnimatedButton>
          </div>

          {myLeaveRequests.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No leave requests yet</p>
              <p className="text-sm text-gray-500 mt-1">Click "Request Leave" to submit one</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {myLeaveRequests.map(request => (
                <GlassCard key={request.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={
                          request.type === 'sick' ? 'danger' :
                          request.type === 'annual' ? 'success' :
                          request.type === 'personal' ? 'info' : 'warning'
                        }>
                          {request.type.charAt(0).toUpperCase() + request.type.slice(1)}
                        </Badge>
                        <Badge variant={
                          request.status === 'approved' ? 'success' :
                          request.status === 'rejected' ? 'danger' : 'warning'
                        }>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="mt-2 font-medium">
                        {format(parseISO(request.startDate), 'MMM d, yyyy')} 
                        {request.startDate !== request.endDate && (
                          <> - {format(parseISO(request.endDate), 'MMM d, yyyy')}</>
                        )}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      Submitted {format(parseISO(request.submittedAt || new Date().toISOString()), 'MMM d, yyyy')}
                    </p>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'swaps' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Shift Swap Requests</h2>
          <p className="text-sm text-gray-600">Click on a shift in "My Roster" to request a swap</p>

          {mySwapRequests.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <Repeat className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No swap requests</p>
              <p className="text-sm text-gray-500 mt-1">Click on a shift to request a swap</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {mySwapRequests.map(swap => {
                const isRequester = swap.requesterId === employee.id;
                const otherPerson = employees.find(e => 
                  e.id === (isRequester ? swap.targetEmployeeId : swap.requesterId)
                );
                
                return (
                  <GlassCard key={swap.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Avatar name={otherPerson?.name || 'Unknown'} size="sm" />
                        <div>
                          <p className="font-medium">
                            {isRequester ? 'Swap with' : 'Swap request from'} {otherPerson?.name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {format(parseISO(swap.createdAt), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        swap.status === 'approved' ? 'success' :
                        swap.status === 'rejected' ? 'danger' : 'warning'
                      }>
                        {swap.status}
                      </Badge>
                    </div>
                  </GlassCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'hours' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Hours Summary</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              icon={Clock}
              label="This Week"
              value={`${weeklyHours}h`}
              subtext={`Target: ${employee.weeklyHours}h`}
              gradient="from-blue-500 to-blue-600"
            />
            <StatCard
              icon={Calendar}
              label="Shifts This Week"
              value={myShifts.length}
              gradient="from-green-500 to-emerald-500"
            />
            <StatCard
              icon={Clock}
              label="Avg Hours/Shift"
              value={myShifts.length > 0 ? (weeklyHours / myShifts.length).toFixed(1) + 'h' : '0h'}
              gradient="from-purple-500 to-purple-600"
            />
            <StatCard
              icon={Calendar}
              label="Saturday Leave"
              value={`${saturdayLeaveCount}/4`}
              subtext="Used this year"
              gradient={saturdayLeaveCount >= 4 ? "from-red-500 to-red-600" : "from-orange-500 to-orange-600"}
            />
          </div>


          <GlassCard className="p-4">
            <h3 className="font-medium mb-3">Hours vs Target</h3>
            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className={`absolute h-full rounded-full transition-all ${
                  weeklyHours >= employee.weeklyHours ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min((weeklyHours / employee.weeklyHours) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-600">{weeklyHours}h worked</span>
              <span className="text-gray-600">{employee.weeklyHours}h target</span>
            </div>
            {weeklyHours > employee.weeklyHours && (
              <p className="text-orange-600 text-sm mt-2">
                ⚠️ {(weeklyHours - employee.weeklyHours).toFixed(1)}h overtime this week
              </p>
            )}
          </GlassCard>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">My Details</h2>
            {!isEditingDetails ? (
              <AnimatedButton icon={Edit2} onClick={() => setIsEditingDetails(true)} className="bg-red-500 hover:bg-red-600 text-white">
                ✏️ Edit Details
              </AnimatedButton>
            ) : (
              <div className="flex gap-2">
                <AnimatedButton variant="secondary" onClick={() => {
                  setIsEditingDetails(false);
                  setDetailsForm({
                    phone: employee.phone || '',
                    idNumber: employee.idNumber || '',
                    taxNumber: employee.taxNumber || '',
                    ssnNumber: employee.ssnNumber || '',
                    tcnNumber: employee.tcnNumber || '',
                    tcnExpiry: employee.tcnExpiry || '',
                    iban: employee.iban || '',
                  });
                }}>
                  Cancel
                </AnimatedButton>
                <AnimatedButton icon={Save} onClick={handleSaveDetails}>
                  Save Changes
                </AnimatedButton>
              </div>
            )}
          </div>
          
          {detailsUpdateSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium">✅ Your changes have been saved and sent to management for review.</p>
            </div>
          )}
          
          <GlassCard className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar name={employee.name} size="lg" />
              <div>
                <h3 className="text-xl font-bold">{employee.name}</h3>
                <p className="text-gray-600">{employee.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={employee.company === 'CMZ' ? 'purple' : 'warning'}>
                    {employee.company}
                  </Badge>
                  <Badge variant={employee.employmentType === 'full-time' ? 'success' : 'info'}>
                    {employee.employmentType}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Basic Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="font-medium">{employee.name}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-medium">{employee.email}</p>
                </div>
                {isEditingDetails ? (
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <label className="text-sm text-blue-600 font-medium">Phone</label>
                    <input
                      type="tel"
                      value={detailsForm.phone}
                      onChange={(e) => setDetailsForm(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter phone number"
                    />
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{employee.phone || 'Not set'}</p>
                  </div>
                )}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Role</p>
                  <p className="font-medium capitalize">{employee.role}</p>
                </div>
              </div>
            </div>

            {/* Employment Info */}
            <div className="mb-6">
              <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Employment</h4>
              <p className="text-sm text-gray-500 mb-3">Contact your manager to update employment details.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Company</p>
                  <p className="font-medium">{employee.company}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Employment Type</p>
                  <p className="font-medium capitalize">{employee.employmentType}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Primary Shop</p>
                  <p className="font-medium">{primaryShop?.name || 'Not assigned'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Weekly Hours Target</p>
                  <p className="font-medium">{employee.weeklyHours}h</p>
                </div>
              </div>
            </div>

            {/* Personal Info - Editable */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3 border-b pb-2">Personal Information</h4>
              {isEditingDetails ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
                  <p className="text-sm text-blue-700">✏️ Edit mode - Your changes will be sent to management for review.</p>
                </div>
              ) : (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-sm text-yellow-700">💡 Click "Edit Details" to update your personal information.</p>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {isEditingDetails ? (
                  <>
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <label className="text-sm text-blue-600 font-medium">ID Number</label>
                      <input type="text" value={detailsForm.idNumber} onChange={(e) => setDetailsForm(prev => ({ ...prev, idNumber: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="National ID number" />
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <label className="text-sm text-blue-600 font-medium">Tax Number</label>
                      <input type="text" value={detailsForm.taxNumber} onChange={(e) => setDetailsForm(prev => ({ ...prev, taxNumber: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Tax ID" />
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <label className="text-sm text-blue-600 font-medium">Social Security Number</label>
                      <input type="text" value={detailsForm.ssnNumber} onChange={(e) => setDetailsForm(prev => ({ ...prev, ssnNumber: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="SSN" />
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <label className="text-sm text-blue-600 font-medium">TCN Number</label>
                      <input type="text" value={detailsForm.tcnNumber} onChange={(e) => setDetailsForm(prev => ({ ...prev, tcnNumber: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="TCN" />
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <label className="text-sm text-blue-600 font-medium">TCN Expiry Date</label>
                      <input type="date" value={detailsForm.tcnExpiry} onChange={(e) => setDetailsForm(prev => ({ ...prev, tcnExpiry: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                      <label className="text-sm text-blue-600 font-medium">IBAN</label>
                      <input type="text" value={detailsForm.iban} onChange={(e) => setDetailsForm(prev => ({ ...prev, iban: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Bank IBAN" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">ID Number</p>
                      <p className="font-medium">{employee.idNumber || '—'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Tax Number</p>
                      <p className="font-medium">{employee.taxNumber || '—'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">Social Security Number</p>
                      <p className="font-medium">{employee.ssnNumber || '—'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">TCN Number</p>
                      <p className="font-medium">{employee.tcnNumber || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">TCN Expiry</p>
                      <p className="font-medium">{employee.tcnExpiry || 'N/A'}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-500">IBAN</p>
                      <p className="font-medium">{employee.iban || '—'}</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Leave Request Modal */}
      <Modal
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        title="Request Leave"
        size="md"
      >
        <div className="space-y-4">
          <FormSelect
            label="Leave Type"
            value={leaveForm.type}
            onChange={(value) => setLeaveForm(prev => ({ ...prev, type: value as typeof leaveForm.type }))}
            options={[
              { value: 'annual', label: 'Annual Leave' },
              { value: 'sick', label: 'Sick Leave' },
              { value: 'personal', label: 'Personal Leave' },
              { value: 'unpaid', label: 'Unpaid Leave' },
            ]}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="Start Date"
              type="date"
              value={leaveForm.startDate}
              onChange={(value) => setLeaveForm(prev => ({ ...prev, startDate: value }))}
              required
            />
            <FormInput
              label="End Date"
              type="date"
              value={leaveForm.endDate}
              onChange={(value) => setLeaveForm(prev => ({ ...prev, endDate: value }))}
              required
            />
          </div>
          <FormInput
            label="Reason (optional)"
            value={leaveForm.reason}
            onChange={(value) => setLeaveForm(prev => ({ ...prev, reason: value }))}
            placeholder="Brief reason for leave..."
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t">
            <AnimatedButton variant="secondary" onClick={() => setShowLeaveModal(false)}>
              Cancel
            </AnimatedButton>
            <AnimatedButton icon={Check} onClick={handleSubmitLeave}>
              Submit Request
            </AnimatedButton>
          </div>
        </div>
      </Modal>

      {/* Swap Request Modal */}
      <Modal
        isOpen={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          setSelectedShiftForSwap(null);
        }}
        title="Request Shift Swap"
        size="md"
      >
        {selectedShiftForSwap && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Your shift to swap:</p>
              <p className="font-bold text-blue-800">
                {format(typeof selectedShiftForSwap.date === 'string' ? parseISO(selectedShiftForSwap.date) : selectedShiftForSwap.date, 'EEEE, MMMM d')}
              </p>
              <p className="text-blue-700">
                {selectedShiftForSwap.startTime} - {selectedShiftForSwap.endTime} at {selectedShiftForSwap.shopName}
              </p>
            </div>

            <div>
              <p className="font-medium mb-2">Select a colleague to swap with:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {employees
                  .filter(e => e.id !== employee.id && !e.excludeFromRoster && 
                    (e.company === employee.company || e.company === 'Both'))
                  .map(colleague => {
                    const selectedShiftDate = typeof selectedShiftForSwap.date === 'string' 
                      ? selectedShiftForSwap.date 
                      : format(selectedShiftForSwap.date, 'yyyy-MM-dd');
                    
                    const colleagueShift = shifts.find(s => {
                      const shiftDate = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
                      return s.employeeId === colleague.id && shiftDate === selectedShiftDate;
                    });
                    
                    return (
                      <button
                        key={colleague.id}
                        onClick={() => handleRequestSwap(colleague.id, colleagueShift?.id?.toString() || '')}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={colleague.name} size="sm" />
                          <div>
                            <p className="font-medium">{colleague.name}</p>
                            <p className="text-sm text-gray-500">
                              {colleagueShift 
                                ? `Working: ${colleagueShift.startTime} - ${colleagueShift.endTime}`
                                : 'Day off'
                              }
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <AnimatedButton variant="secondary" onClick={() => {
                setShowSwapModal(false);
                setSelectedShiftForSwap(null);
              }}>
                Cancel
              </AnimatedButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ============== MAIN APP COMPONENT ==============

export default function App() {

  const syncToDatabase = async () => {
    try {
      // Save all shops
      for (const shop of shops) {
        await fetch(`${API_BASE_URL}/shops`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(shop)
        });
      }
      
      // Save all employees
      for (const employee of employees) {
        await fetch(`${API_BASE_URL}/employees`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(employee)
        });
      }
      
      console.log('✅ Synced to database:', shops.length, 'shops,', employees.length, 'employees');
      alert('Data synced to database successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed - check console');
    }
  };

  // State
  const [activeView, setActiveView] = useState<ViewType>('dashboard');
  const [currentUser, setCurrentUser] = useState<CurrentUser>(SAMPLE_USER);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isEmployeePreview, setIsEmployeePreview] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<unknown>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);


  // Check for existing login on startup
  useEffect(() => {
    // Check if this is an invite link FIRST
    const path = window.location.pathname;
    if (path.startsWith('/invite/')) {
      const token = path.replace('/invite/', '');
      setInviteToken(token);
      setIsCheckingAuth(false);
      return; // Exit early - don't check auth
    }
    
    // Otherwise, check for existing login
    const checkAuth = async () => {
      const token = localStorage.getItem('rosterpro_token');
      const savedUser = localStorage.getItem('rosterpro_user');
      
      if (token && savedUser) {
        try {
          // Verify token is still valid
          const response = await fetch('http://localhost:3001/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (response.ok) {
            const data = await response.json();
            setAuthToken(token);
            setAuthUser(data.user);
            setIsAuthenticated(true);
            
            // Update currentUser with logged-in user data
            if (data.user) {
              setCurrentUser({
                id: data.user.id,
                name: data.user.employeeName || data.user.email.split('@')[0],
                email: data.user.email,
                role: data.user.role || 'employee',
                company: data.user.company || 'Both',
                employeeId: data.user.employeeId,
              });
            }
          } else {
            // Token invalid, clear storage
            localStorage.removeItem('rosterpro_token');
            localStorage.removeItem('rosterpro_user');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
        }
      }
      setIsCheckingAuth(false);
    };
    
    checkAuth();
  }, []);


// Handle login
const handleLogin = (token: string, user: unknown) => {
  setAuthToken(token);
  setAuthUser(user);
  setIsAuthenticated(true);
  
  // Update currentUser with logged-in user data
  if (user && typeof user === 'object') {
    const userData = user as { id: number; employeeName?: string; email: string; role?: string; company?: string; employeeId?: number };
setCurrentUser({
  id: userData.id,
  name: userData.employeeName || userData.email.split('@')[0],
  email: userData.email,
  role: (userData.role as 'admin' | 'manager' | 'employee') || 'employee',
  company: (userData.company as 'CMZ' | 'CS' | 'Both' | undefined) || 'Both',
  employeeId: userData.employeeId,
});
  }
};



  // Handle logout
  const handleLogout = () => {
    localStorage.removeItem('rosterpro_token');
    localStorage.removeItem('rosterpro_user');
    setAuthToken(null);
    setAuthUser(null);
    setIsAuthenticated(false);
  };

  // Data state
  // Data state
const [shops, setShops] = useState<Shop[]>([]);
const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<BackendShift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [partTimerAvailability, setPartTimerAvailability] = useState<PartTimerAvailability[]>([]);
  const [profileUpdateNotifications, setProfileUpdateNotifications] = useState<ProfileUpdateNotification[]>([]);

  // Debug: Track employee changes
  useEffect(() => {
    console.log('👥 Employees updated:', employees.length, 'total,', 
      employees.filter(e => !e.excludeFromRoster).length, 'active');
  }, [employees]);

  // Debug: Track shifts changes  
  useEffect(() => {
    console.log('📅 Shifts updated:', shifts.length, 'total');
  }, [shifts]);

  // Load current week's roster on startup
  useEffect(() => {
    const loadCurrentWeekRoster = async () => {
      const today = new Date();
      const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
      const weekKey = format(currentWeekStart, 'yyyy-MM-dd');
      
      try {
        const response = await fetch(`${API_BASE_URL}/roster/load?weekStart=${weekKey}`);
        if (response.ok) {
          const data = await response.json();
          if (data.shifts && data.shifts.length > 0) {
            console.log(`✅ Loaded ${data.shifts.length} shifts for current week`);
            setShifts(data.shifts);
          }
        }
      } catch (error) {
        console.error('Failed to load current week roster:', error);
      }
    };
    
    // Only load after initial data is loaded
    if (!isLoading && employees.length > 0) {
      loadCurrentWeekRoster();
    }
  }, [isLoading, employees.length]);

  // Load initial data
useEffect(() => {
  const loadData = async () => {
    setIsLoading(true);
    
    try {
      // Load shops from API
      const shopsResponse = await fetch(`${API_BASE_URL}/shops`);
      let loadedShops: Shop[] = [];
      
      if (shopsResponse.ok) {
        const shopsData = await shopsResponse.json();
        
        loadedShops = shopsData.map((shop: any) => {
          // USE DATABASE VALUES - don't overwrite with SHOP_CONFIG
          return {
            id: shop.id,
            name: shop.name,
            company: shop.company,
            isActive: shop.isActive ?? true,
            address: shop.address || '',
            phone: shop.phone || '',
            openTime: shop.openTime || '06:00',
            closeTime: shop.closeTime || '21:00',
            // USE THE VALUES FROM DATABASE
            requirements: shop.requirements || [],
            specialRequests: shop.specialRequests || [],
            fixedDaysOff: shop.fixedDaysOff || [],
            specialDayRules: shop.specialDayRules || [],
            assignedEmployees: shop.assignedEmployees || [],
            rules: shop.rules || {},
            minStaffAtOpen: shop.minStaffAtOpen || 1,
            minStaffMidday: shop.minStaffMidday || 1,
            minStaffAtClose: shop.minStaffAtClose || 1,
            canBeSolo: shop.canBeSolo || false,
          };
        });
      }

      // Load employees from API
      const employeesResponse = await fetch(`${API_BASE_URL}/employees`);
      let loadedEmployees: Employee[] = [];
      
      if (employeesResponse.ok) {
        const employeesData = await employeesResponse.json();
        
        loadedEmployees = employeesData.map((emp: {
          id: number;
          name: string;
          email: string;
          phone?: string;
          company: string;
          employmentType?: string;
          role?: string;
          weeklyHours?: number;
          payScaleId?: string;
          allowanceIds?: string[];
          excludeFromRoster?: boolean;
          hasSystemAccess?: boolean;
          systemRole?: string;
          idNumber?: string;
          taxNumber?: string;
          ssnNumber?: string;
          tcnNumber?: string;
          tcnExpiry?: string;
          iban?: string;
          primaryShopId?: number;
          secondaryShopIds?: number[];
        }) => ({
          id: emp.id,
          name: emp.name,
          email: emp.email,
          phone: emp.phone || '',
          company: emp.company,
          employmentType: emp.employmentType || 'full-time',
          role: emp.role || 'staff',
          weeklyHours: emp.weeklyHours || 40,
          payScaleId: emp.payScaleId || 'scale1',
          allowanceIds: emp.allowanceIds || [],
          excludeFromRoster: emp.excludeFromRoster || false,
          hasSystemAccess: emp.hasSystemAccess || false,
          systemRole: emp.systemRole,
          idNumber: emp.idNumber || '',
          taxNumber: emp.taxNumber || '',
          ssnNumber: emp.ssnNumber || '',
          tcnNumber: emp.tcnNumber || '',
          tcnExpiry: emp.tcnExpiry || '',
          iban: emp.iban || '',
          primaryShopId: emp.primaryShopId,
          secondaryShopIds: emp.secondaryShopIds || [],
        }));
      }

      // Load leave requests
      try {
        const leaveResponse = await fetch(`${API_BASE_URL}/leave`);
        if (leaveResponse.ok) {
          const leaveData = await leaveResponse.json();
          if (leaveData.length > 0) {
            setLeaveRequests(leaveData);
            console.log(' Loaded leave requests:', leaveData.length);
          }
        }
      } catch (err) {
        console.error('Failed to load leave requests:', err);
      }

      // Load swap requests
      try {
        const swapsResponse = await fetch(`${API_BASE_URL}/swaps`);
        if (swapsResponse.ok) {
          const swapsData = await swapsResponse.json();
          if (swapsData.length > 0) {
            setSwapRequests(swapsData);
            console.log(' Loaded swap requests:', swapsData.length);
          }
        }
      } catch (err) {
        console.error('Failed to load swap requests:', err);
      }

      // Load profile updates
      try {
        const profileResponse = await fetch(`${API_BASE_URL}/profile-updates`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.length > 0) {
            setProfileUpdateNotifications(profileData);
            console.log(' Loaded profile updates:', profileData.length);
          }
        }
      } catch (err) {
        console.error('Failed to load profile updates:', err);
      }

      // Link employees to shops
      const shopsWithEmployees = loadedShops.map(shop => {
        const assignedEmployees = loadedEmployees
          .filter(emp => 
            emp.primaryShopId === shop.id || 
            (emp.secondaryShopIds || []).includes(shop.id)
          )
          .map(emp => ({
            employeeId: emp.id,
            isPrimary: emp.primaryShopId === shop.id
          }));

        if (shop.name === 'Hamrun') console.log('Hamrun assigned:', assignedEmployees);

        return { ...shop, assignedEmployees };
      });

      // Set state with loaded data or fallback to samples
      if (shopsWithEmployees.length > 0) {
        setShops(shopsWithEmployees);
      } else {
        setShops(SAMPLE_SHOPS);
      }

      if (loadedEmployees.length > 0) {
        setEmployees(loadedEmployees);
      } else {
        setEmployees(SAMPLE_EMPLOYEES);
      }

      console.log('Loaded shops with config:', shopsWithEmployees);
      console.log('First employee employmentType:', loadedEmployees[0]?.employmentType);

    } catch (error) {
      console.error('Error loading data:', error);
      setShops(SAMPLE_SHOPS);
      setEmployees(SAMPLE_EMPLOYEES);
    } finally {
      setIsLoading(false);
    }
  };

  loadData();
}, []);





  // Handle employee preview mode - reset view if needed
  useEffect(() => {
    if (isEmployeePreview) {
      const employeeViews: ViewType[] = ['portal', 'roster', 'leave', 'swaps', 'settings'];
      if (!employeeViews.includes(activeView)) {
        setActiveView('portal');
      }
    }
  }, [isEmployeePreview, activeView]);


  // Render loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading RosterPro...</p>
        </div>
      </div>
    );
  }

  // Render view content
  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return (
          <DashboardView
            shops={shops}
            employees={employees}
            shifts={shifts}
            leaveRequests={leaveRequests}
            swapRequests={swapRequests}
            profileUpdateNotifications={profileUpdateNotifications}
            onNavigate={setActiveView}
            onGenerateRoster={() => {
              setActiveView('roster');
            }}
            onOpenAvailability={() => setShowAvailabilityModal(true)}
            onSyncData={() => {
              window.location.reload();
            }}
            onApproveProfileUpdate={(id) => {
              setProfileUpdateNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, status: 'approved' as const } : n)
              );
            }}
            onRejectProfileUpdate={(id) => {
              setProfileUpdateNotifications(prev => 
                prev.map(n => n.id === id ? { ...n, status: 'rejected' as const } : n)
              );
            }}
          />
        );


      case 'roster':
        // If employee preview mode, filter to only show shops where employee is working
        if (isEmployeePreview) {
          const previewEmployee = employees.find(e => e.id === currentUser.employeeId) || employees[0];
          const currentWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
          const weekEnd = addDays(currentWeek, 6);
          
          // Get shop IDs where this employee has shifts this week
          const employeeShopIds = [...new Set(
            shifts
              .filter(s => {
                const shiftDate = typeof s.date === 'string' ? parseISO(s.date) : s.date;
                return s.employeeId === previewEmployee.id && 
                       shiftDate >= currentWeek && 
                       shiftDate <= weekEnd;
              })
              .map(s => s.shopId)
          )];
          
          // Filter shops to only those where employee is working
          const employeeShops = shops.filter(s => employeeShopIds.includes(s.id));
          
          return (
            <RosterView
              shops={employeeShops.length > 0 ? employeeShops : shops.filter(s => s.id === previewEmployee.primaryShopId)}
              employees={employees}
              shifts={shifts}
              setShifts={setShifts}
              leaveRequests={leaveRequests}
            />
          );
        }
        
        return (
          <RosterView
            shops={shops}
            employees={employees}
            shifts={shifts}
            setShifts={setShifts}
            leaveRequests={leaveRequests}
          />
        );


      case 'shops':
        return (
          <ShopsView
            shops={shops}
            setShops={setShops}
            employees={employees}
            setEmployees={setEmployees}
          />
        );

      case 'employees':
        return (
          <EmployeesView
            employees={employees}
            setEmployees={setEmployees}
            shops={shops}
            setShops={setShops}
          />
        );


      case 'payscales':
        return <PayScalesView />;

      case 'overtime':
        return (
          <OvertimeView
            employees={employees}
            shifts={shifts}
          />
        );

      case 'leave':
        return (
          <LeaveView
            leaveRequests={leaveRequests}
            setLeaveRequests={setLeaveRequests}
            employees={employees}
            currentUser={currentUser}
          />
        );

      case 'swaps':
        return (
          <SwapsView
            swapRequests={swapRequests}
            setSwapRequests={setSwapRequests}
            employees={employees}
            shifts={shifts}
            setShifts={setShifts}
            currentUser={currentUser}
          />
        );

      case 'settings':
        return (
          <SettingsView 
            currentUser={currentUser} 
            onSyncToDatabase={syncToDatabase} 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
            notificationsEnabled={notificationsEnabled} 
            setNotificationsEnabled={setNotificationsEnabled}
          />
        );

      case 'portal':
        const portalEmployee = employees.find(e => e.id === currentUser.employeeId) || employees[0];
        return (
          <EmployeePortalView
            employee={portalEmployee}
            shifts={shifts}
            shops={shops}
            employees={employees}
            leaveRequests={leaveRequests}
            setLeaveRequests={setLeaveRequests}
            swapRequests={swapRequests}
            setSwapRequests={setSwapRequests}
            onProfileUpdate={(notification) => {
              setProfileUpdateNotifications(prev => [...prev, notification]);
            }}
            onEmployeeUpdate={(updatedEmployee) => {
              setEmployees(prev => prev.map(e => 
                e.id === updatedEmployee.id ? updatedEmployee : e
              ));
            }}
          />
        );

      case 'users':
        return (
          <UsersView
            employees={employees}
            shops={shops}
          />
        );

      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-700">View not found</h2>
            <p className="text-gray-500 mt-2">Select a view from the sidebar</p>
          </div>
        );
    }
  };


  // Show loading while checking auth
  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading RosterPro...</p>
        </div>
      </div>
    );
  }

  // Show invite page if invite token present
  if (inviteToken) {
    return (
      <InviteAcceptPage 
        token={inviteToken} 
        onComplete={() => {
          setInviteToken(null);
          window.history.pushState({}, '', '/');
        }} 
      />
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Suppress unused variable warnings
  void authToken;
  void authUser;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode 
        ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white' 
        : 'bg-gradient-to-br from-slate-100 to-slate-200'
    }`}>
      {/* Sidebar */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        currentUser={currentUser}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
        isEmployeePreview={isEmployeePreview}
        setIsEmployeePreview={setIsEmployeePreview}
        onLogout={handleLogout}
      />

      {/* Main Content */}
      <main className={`transition-all duration-300 ${
        sidebarCollapsed ? 'ml-16' : 'ml-64'
      }`}>
        {/* Top Bar */}
        <header className={`sticky top-0 z-30 backdrop-blur-sm border-b transition-colors duration-300 ${
          darkMode 
            ? 'bg-slate-800/80 border-slate-700' 
            : 'bg-white/80 border-gray-200'
        }`}>
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              {isEmployeePreview && (
                <Badge variant="purple" className="animate-pulse">
                  <Eye className="w-3 h-3 mr-1" />
                  Employee Preview Mode
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              {/* Notifications Bell */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative"
                >
                  <Bell className="w-5 h-5" />
                  {(leaveRequests.filter(r => r.status === 'pending').length + 
                    swapRequests.filter(r => r.status === 'pending').length) > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
                
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200">
                      <h3 className="font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {leaveRequests.filter(r => r.status === 'pending').length === 0 &&
                       swapRequests.filter(r => r.status === 'pending').length === 0 ? (
                        <div className="p-4 text-center text-gray-500">
                          No pending notifications
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {leaveRequests.filter(r => r.status === 'pending').map(request => {
                            const employee = employees.find(e => e.id === request.employeeId);
                            return (
                              <div 
                                key={request.id} 
                                className="p-3 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  setActiveView('leave');
                                  setShowNotifications(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                                    <ClipboardList className="w-4 h-4 text-yellow-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">Leave Request</p>
                                    <p className="text-xs text-gray-500">{employee?.name} - {request.type}</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                          {swapRequests.filter(r => r.status === 'pending').map(request => {
                            const requester = employees.find(e => e.id === request.requesterId);
                            return (
                              <div 
                                key={request.id} 
                                className="p-3 hover:bg-gray-50 cursor-pointer"
                                onClick={() => {
                                  setActiveView('swaps');
                                  setShowNotifications(false);
                                }}
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                                    <Repeat className="w-4 h-4 text-purple-600" />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-gray-900">Swap Request</p>
                                    <p className="text-xs text-gray-500">{requester?.name} wants to swap</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* User Avatar */}
              <div className="flex items-center gap-2">
                <Avatar name={currentUser.name} size="sm" />
                <span className="text-sm font-medium text-gray-700 hidden md:block">
                  {currentUser.name}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          {renderContent()}
        </div>

        {/* Footer */}
        <footer className={`border-t px-6 py-4 mt-8 transition-colors duration-300 ${
          darkMode 
            ? 'border-slate-700 bg-slate-800/50 text-slate-400' 
            : 'border-gray-200 bg-white/50'
        }`}>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>RosterPro v12.6 - Trapped Employee Guaranteed Coverage</p>
            <p>© 2024 RosterPro. All rights reserved.</p>
          </div>
        </footer>
      </main>

      {/* Part-Timer Availability Modal */}
      <AvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        employees={employees}
        shops={shops}
        weekStart={startOfWeek(new Date(), { weekStartsOn: 1 })}
        availability={partTimerAvailability}
        onSave={(availability) => {
          setPartTimerAvailability(availability);
          console.log('Saved availability:', availability);
        }}
      />
    </div>
  );
}
