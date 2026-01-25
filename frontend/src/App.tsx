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
  ADMIN_NAVIGATION, EMPLOYEE_NAVIGATION
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
  { id: 1, name: 'Kamal', email: 'kamal@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [] },
  { id: 2, name: 'Laxmi', email: 'laxmi@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [] },
  { id: 3, name: 'Arjun', email: 'arjun@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [] },
  { id: 4, name: 'Imran', email: 'imran@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [2, 3, 4, 5, 6, 7] },
  { id: 5, name: 'Gopal', email: 'gopal@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [2, 3, 4, 5, 6, 7] },
  { id: 6, name: 'Guarav', email: 'guarav@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [2, 3, 4, 5, 6, 7] },
  { id: 7, name: 'Passang', email: 'passang@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 1, secondaryShopIds: [2, 6] },
  { id: 8, name: 'Ciro', email: 'ciro@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 2, secondaryShopIds: [] },
  { id: 9, name: 'Ricky', email: 'ricky@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 3, secondaryShopIds: [1] },
  { id: 10, name: 'Anus', email: 'anus@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 3, secondaryShopIds: [] },
  { id: 11, name: 'Carina', email: 'carina@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 4, secondaryShopIds: [1] },
  { id: 12, name: 'Pradib', email: 'pradib@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 4, secondaryShopIds: [5] },
  { id: 13, name: 'Sirjana', email: 'sirjana@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 5, secondaryShopIds: [2] },
  { id: 14, name: 'Anup', email: 'anup@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 5, secondaryShopIds: [] },
  { id: 15, name: 'Aronia', email: 'aronia@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 7, secondaryShopIds: [1] },
  { id: 16, name: 'Joanne', email: 'joanne@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 7, secondaryShopIds: [] },
  { id: 17, name: 'Hasan', email: 'hasan@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 6, secondaryShopIds: [] },
  { id: 18, name: 'Anju', email: 'anju@company.com', company: 'CS', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 6, secondaryShopIds: [] },
  { id: 19, name: 'Amy', email: 'amy@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 10, secondaryShopIds: [8] },
  { id: 20, name: 'Anthony', email: 'anthony@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 9, secondaryShopIds: [] },
  { id: 21, name: 'Caroline', email: 'caroline@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 8, secondaryShopIds: [] },
  { id: 22, name: 'Chantel', email: 'chantel@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 8, secondaryShopIds: [10] },
  { id: 23, name: 'Claire', email: 'claire@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 8, secondaryShopIds: [] },
  { id: 24, name: 'Joseph', email: 'joseph@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 9, secondaryShopIds: [] },
  { id: 25, name: 'Rose', email: 'rose@company.com', company: 'CMZ', employmentType: 'part-time', role: 'staff', weeklyHours: 20, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 9, secondaryShopIds: [8] },
  { id: 26, name: 'Danae', email: 'danae@company.com', company: 'CMZ', employmentType: 'part-time', role: 'staff', weeklyHours: 20, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 8, secondaryShopIds: [9, 10] },
  { id: 27, name: 'Priscilla', email: 'priscilla@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 10, secondaryShopIds: [] },
  { id: 28, name: 'Aimee', email: 'aimee@company.com', company: 'CMZ', employmentType: 'part-time', role: 'staff', weeklyHours: 20, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 8, secondaryShopIds: [9, 10] },
  { id: 29, name: 'Mariella', email: 'mariella@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 9, secondaryShopIds: [] },
  { id: 30, name: 'Rabi', email: 'rabi@company.com', company: 'CMZ', employmentType: 'full-time', role: 'staff', weeklyHours: 40, payScaleId: 'scale2', allowanceIds: [], excludeFromRoster: false, hasSystemAccess: false, primaryShopId: 9, secondaryShopIds: [] },
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

  const partTimeEmployees = useMemo(() => 
    employees.filter(emp => emp.employmentType === 'part-time'),
    [employees]
  );

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
            primaryShopId: emp.primaryShopId ?? undefined,
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
        <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                Week: {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {
                  new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                }
              </p>
              <p className="text-xs text-blue-600 mt-1">
                {partTimeEmployees.length} part-time employees - Click days to toggle availability
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-700">{partTimeEmployees.length}</p>
              <p className="text-xs text-blue-600">Part-timers</p>
            </div>
          </div>
        </div>

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
                          All
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
                              {isAvailable ? '✓' : '×'}
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
  onApproveProfileUpdate: (id: string | number) => void;
  onRejectProfileUpdate: (id: string | number) => void;
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

    const totalHoursThisWeek = shifts.reduce((acc, s) => acc + (s.hours ?? 0), 0);
    
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">Welcome back! Here's your overview.</p>
      </div>

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                      <Avatar name={employee?.name ?? 'Unknown'} size="sm" />
                      <div>
                        <p className="font-medium text-sm">{employee?.name ?? 'Unknown'}</p>
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
                      <Avatar name={requester?.name ?? 'Unknown'} size="sm" />
                      <div>
                        <p className="font-medium text-sm">{requester?.name ?? 'Unknown'}</p>
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
                    <Avatar name={shift.employeeName ?? ''} size="sm" />
                    <div>
                      <p className="font-medium text-sm">{shift.employeeName ?? 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{shift.shopName ?? 'Unknown'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-sm">{shift.startTime ?? ''} - {shift.endTime ?? ''}</p>
                    <p className="text-xs text-gray-500">{shift.hours ?? 0}h</p>
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

  useEffect(() => {
    loadRosterFromBackend(currentWeekStart);
  }, [currentWeekStart]);

  const weekDates = useMemo(() => {
    return DAYS_OF_WEEK.map((day, index) => ({
      day,
      date: addDays(currentWeekStart, index),
      dateStr: format(addDays(currentWeekStart, index), 'yyyy-MM-dd'),
    }));
  }, [currentWeekStart]);

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
    
    return filtered;
  }, [shifts, currentWeekStart, companyFilter, shopFilter]);

  const shiftsByDateAndShop = useMemo(() => {
    const grouped: Record<string, Record<number, BackendShift[]>> = {};
    
    weekDates.forEach(({ dateStr }) => {
      grouped[dateStr] = {};
      shops.forEach(shop => {
        grouped[dateStr][shop.id] = [];
      });
    });
    
    weekShifts.forEach(shift => {
      const shiftDateStr = typeof shift.date === 'string' 
        ? shift.date 
        : format(shift.date, 'yyyy-MM-dd');
      
      if (grouped[shiftDateStr] && grouped[shiftDateStr][shift.shopId ?? 0]) {
        grouped[shiftDateStr][shift.shopId ?? 0].push(shift);
      }
    });
    
    return grouped;
  }, [weekDates, weekShifts, shops]);

  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      if (!shop.isActive) return false;
      if (companyFilter === 'all') return true;
      return shop.company === companyFilter;
    });
  }, [shops, companyFilter]);

  const goToPreviousWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const goToNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const saveRosterToBackend = async (weekStart: string, shiftsToSave: BackendShift[]) => {
    try {
      const response = await fetch(`${API_BASE_URL}/roster/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, shifts: shiftsToSave })
      });
      if (response.ok) {
        console.log(`Roster saved for week ${weekStart}`);
      }
    } catch (error) {
      console.error('Failed to save roster:', error);
    }
  };

  const loadRosterFromBackend = async (weekStart: Date) => {
    try {
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      const response = await fetch(`${API_BASE_URL}/roster/load?weekStart=${weekKey}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.shifts && data.shifts.length > 0) {
          const loadedShifts = data.shifts.map((s: BackendShift) => ({
            ...s,
            date: new Date(s.date)
          }));
          setShifts(loadedShifts);
        }
      }
    } catch (error) {
      console.error('Error loading roster:', error);
    }
  };

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
        return !(inWeek && shopIds.includes(shift.shopId ?? 0));
      });
      
      const weekShiftsToSave = updated.filter(s => {
        const d = typeof s.date === 'string' ? s.date.substring(0, 10) : format(s.date, 'yyyy-MM-dd');
        return d >= weekStartStr && d <= weekEndStr;
      });
      saveRosterToBackend(weekStartStr, weekShiftsToSave);
      
      return updated;
    });
  };

  const exportToCSV = () => {
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(addDays(currentWeekStart, 6), 'yyyy-MM-dd');
    const weekEnd = addDays(currentWeekStart, 6);
    
    const exportShifts = shifts.filter(s => {
      const d = typeof s.date === 'string' ? parseISO(s.date) : s.date;
      return d >= currentWeekStart && d <= weekEnd;
    });
    
    exportShifts.sort((a, b) => {
      const dateA = typeof a.date === 'string' ? a.date : format(a.date, 'yyyy-MM-dd');
      const dateB = typeof b.date === 'string' ? b.date : format(b.date, 'yyyy-MM-dd');
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      if ((a.shopName ?? '') !== (b.shopName ?? '')) return (a.shopName ?? '').localeCompare(b.shopName ?? '');
      return (a.startTime ?? '').localeCompare(b.startTime ?? '');
    });
    
    const headers = ['Date', 'Day', 'Shop', 'Employee', 'Start', 'End', 'Hours', 'Type'];
    const rows = exportShifts.map(s => {
      const dateStr = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
      const dayName = format(parseISO(dateStr), 'EEE');
      return [
        dateStr,
        dayName,
        s.shopName ?? '',
        s.employeeName ?? '',
        s.startTime ?? '',
        s.endTime ?? '',
        String(s.hours ?? 0),
        s.shiftType ?? ''
      ];
    });
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `roster_${weekStartStr}_to_${weekEndStr}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const weekStartStr = format(currentWeekStart, 'MMMM d');
    const weekEndStr = format(addDays(currentWeekStart, 6), 'MMMM d, yyyy');
    const weekEnd = addDays(currentWeekStart, 6);
    
    const exportShifts = shifts.filter(s => {
      const d = typeof s.date === 'string' ? parseISO(s.date) : s.date;
      return d >= currentWeekStart && d <= weekEnd;
    });
    
    const shopGroups: Record<string, BackendShift[]> = {};
    exportShifts.forEach(s => {
      const shopName = s.shopName ?? 'Unknown';
      if (!shopGroups[shopName]) shopGroups[shopName] = [];
      shopGroups[shopName].push(s);
    });
    
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
          .total-row { font-weight: bold; background: #e5e7eb; }
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
            return (a.startTime ?? '').localeCompare(b.startTime ?? '');
          });
          const totalHours = shopShifts.reduce((sum, s) => sum + (s.hours ?? 0), 0);
          return `
            <h2>${shopName}</h2>
            <table>
              <thead><tr><th>Day</th><th>Date</th><th>Employee</th><th>Start</th><th>End</th><th>Hours</th></tr></thead>
              <tbody>
                ${shopShifts.map(s => {
                  const dateStr = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
                  const dayName = format(parseISO(dateStr), 'EEE');
                  return `<tr><td>${dayName}</td><td>${dateStr}</td><td>${s.employeeName ?? ''}</td><td>${s.startTime ?? ''}</td><td>${s.endTime ?? ''}</td><td>${s.hours ?? 0}h</td></tr>`;
                }).join('')}
                <tr class="total-row"><td colspan="5">Total Hours</td><td>${totalHours}h</td></tr>
              </tbody>
            </table>
          `;
        }).join('')}
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const handleShiftClick = (shift: BackendShift) => {
    setSelectedShift(shift);
    setSelectedDate(typeof shift.date === 'string' ? shift.date : format(shift.date, 'yyyy-MM-dd'));
    setSelectedShopId(shift.shopId ?? null);
    setShowShiftModal(true);
  };

  const handleAddShift = (dateStr: string, shopId: number) => {
    setSelectedShift(null);
    setSelectedDate(dateStr);
    setSelectedShopId(shopId);
    setShowShiftModal(true);
  };

  const handleSaveShift = (shiftData: Partial<BackendShift>) => {
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    
    if (selectedShift) {
      setShifts(prev => {
        const updated = prev.map(s => 
          s.id === selectedShift.id ? { ...s, ...shiftData } : s
        );
        const weekEnd = addDays(currentWeekStart, 6);
        const weekShiftsToSave = updated.filter(s => {
          const d = typeof s.date === 'string' ? parseISO(s.date) : s.date;
          return d >= currentWeekStart && d <= weekEnd;
        });
        saveRosterToBackend(weekStartStr, weekShiftsToSave);
        return updated;
      });
    } else if (selectedDate && selectedShopId) {
      const shop = shops.find(s => s.id === selectedShopId);
      const employee = employees.find(e => e.id === shiftData.employeeId);
      
      const newShift: BackendShift = {
        id: `shift-${Date.now()}`,
        date: selectedDate,
        shopId: selectedShopId,
        shopName: shop?.name ?? 'Unknown',
        employeeId: shiftData.employeeId ?? 0,
        employeeName: employee?.name ?? 'Unknown',
        startTime: shiftData.startTime ?? '09:00',
        endTime: shiftData.endTime ?? '17:00',
        hours: shiftData.hours ?? 8,
        shiftType: shiftData.shiftType ?? 'CUSTOM',
        company: shop?.company ?? 'CMZ',
      };
      
      setShifts(prev => {
        const updated = [...prev, newShift];
        const weekEnd = addDays(currentWeekStart, 6);
        const weekShiftsToSave = updated.filter(s => {
          const d = typeof s.date === 'string' ? parseISO(s.date) : s.date;
          return d >= currentWeekStart && d <= weekEnd;
        });
        saveRosterToBackend(weekStartStr, weekShiftsToSave);
        return updated;
      });
    }
    setShowShiftModal(false);
    setSelectedShift(null);
  };

  const handleDeleteShift = (shiftId: string | number) => {
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    
    setShifts(prev => {
      const updated = prev.filter(s => s.id !== shiftId && String(s.id) !== String(shiftId));
      const weekEnd = addDays(currentWeekStart, 6);
      const weekShiftsToSave = updated.filter(s => {
        const d = typeof s.date === 'string' ? parseISO(s.date) : s.date;
        return d >= currentWeekStart && d <= weekEnd;
      });
      saveRosterToBackend(weekStartStr, weekShiftsToSave);
      return updated;
    });
    
    setShowShiftModal(false);
    setSelectedShift(null);
  };

  const handleGenerateRoster = async () => {
    setIsGenerating(true);
    try {
      const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
      
      const solverPayload = {
        weekStart: weekStartStr,
        employees: employees.map(e => ({
          id: e.id,
          name: e.name,
          company: e.company,
          employmentType: e.employmentType,
          primaryShopId: e.primaryShopId,
          secondaryShopIds: e.secondaryShopIds || [],
          excludeFromRoster: e.excludeFromRoster || false,
          weeklyHours: e.weeklyHours
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
        leaveRequests: leaveRequests.filter(l => l.status === 'approved').map(l => ({
          employeeId: l.employeeId,
          startDate: l.startDate,
          endDate: l.endDate,
          status: l.status
        })),
        fixedDaysOff: { 'Ricky': 'Mon', 'Anus': 'Wed' },
        amOnlyEmployees: ['Joseph'],
        excludedEmployeeIds: [31]
      };
      
      const response = await fetch('http://localhost:3002/api/roster/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(solverPayload)
      });
      
      if (!response.ok) throw new Error(`Solver returned ${response.status}`);
      
      const result = await response.json();
      
      if (result.error) throw new Error(result.error);
      if (result.status === 'INFEASIBLE') {
        alert('Could not generate a feasible roster. Check staff availability and requirements.');
        return;
      }
      
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
      
      const otherWeekShifts = shifts.filter(s => {
        const shiftDate = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
        return !shiftDate.startsWith(weekStartStr.substring(0, 7));
      });
      
      setShifts([...otherWeekShifts, ...generatedShifts]);
      await saveRosterToBackend(weekStartStr, generatedShifts);
      
    } catch (error) {
      console.error('Generation error:', error);
      alert(`Roster generation failed: ${error}`);
    } finally {
      setIsGenerating(false);
    }
  };
  // RosterView JSX return
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Weekly Roster</h1>
          <p className="text-gray-600 mt-1">
            {format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AnimatedButton variant="ghost" size="sm" onClick={exportToCSV}>Export Excel</AnimatedButton>
          <AnimatedButton variant="ghost" size="sm" onClick={exportToPDF}>Export PDF</AnimatedButton>
          <AnimatedButton variant="secondary" icon={Calendar} onClick={() => setShowAvailabilityModal(true)}>
            Part-Timer Availability
          </AnimatedButton>
          <AnimatedButton variant="danger" icon={Trash2} onClick={() => { setSelectedShopsForAction([]); setShowClearModal(true); }}>
            Clear Roster
          </AnimatedButton>
          <AnimatedButton icon={Play} onClick={() => { setSelectedShopsForAction(filteredShops.map(s => s.id)); setShowGenerateModal(true); }}>
            Generate Roster
          </AnimatedButton>
        </div>
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AnimatedButton variant="ghost" size="sm" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </AnimatedButton>
            <AnimatedButton variant="secondary" size="sm" onClick={goToToday}>Today</AnimatedButton>
            <AnimatedButton variant="ghost" size="sm" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </AnimatedButton>
          </div>
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

      <div className="overflow-x-auto">
        <div className="min-w-[1000px]">
          <div className="grid grid-cols-8 gap-2 mb-2">
            <div className="p-3 bg-gray-100 rounded-lg font-medium text-gray-700">Shop</div>
            {weekDates.map(({ day, date, dateStr }) => (
              <div 
                key={dateStr}
                className={`p-3 rounded-lg text-center ${isToday(date) ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
              >
                <div className="font-medium">{day}</div>
                <div className="text-sm">{format(date, 'MMM d')}</div>
              </div>
            ))}
          </div>

          {filteredShops.map(shop => (
            <div key={shop.id} className="grid grid-cols-8 gap-2 mb-2">
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <div className="font-medium text-gray-900">{shop.name}</div>
                <Badge variant={shop.company === 'CMZ' ? 'purple' : 'warning'} className="mt-1">{shop.company}</Badge>
              </div>
              {weekDates.map(({ dateStr, date }) => {
                const dayShifts = shiftsByDateAndShop[dateStr]?.[shop.id] || [];
                return (
                  <div 
                    key={`${shop.id}-${dateStr}`}
                    className={`p-2 rounded-lg border min-h-[100px] ${isToday(date) ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'}`}
                  >
                    <div className="space-y-1 min-h-[80px]">
                      {dayShifts.map(shift => {
                        const getShiftColor = () => {
                          const type = (shift.shiftType || '').toUpperCase();
                          if (type === 'FULL' || (shift.hours ?? 0) >= 10) return 'from-purple-500 to-purple-600';
                          if (type === 'PM') return 'from-yellow-500 to-yellow-600';
                          return 'from-green-500 to-green-600';
                        };
                        const employee = employees.find(e => e.id === shift.employeeId);
                        const empType = employee?.employmentType === 'full-time' ? 'FT' : 'PT';
                        
                        return (
                          <button
                            key={shift.id}
                            onClick={() => handleShiftClick(shift)}
                            className={`w-full text-left p-1.5 bg-gradient-to-r ${getShiftColor()} text-white rounded text-xs transition-all relative`}
                          >
                            <span className="absolute top-1 right-1 bg-white/20 px-1 rounded text-[10px] font-medium">{shift.hours ?? 0}h</span>
                            <div className="font-medium truncate pr-8">{shift.employeeName ?? 'Unknown'}</div>
                            <div className="flex justify-between items-center mt-0.5">
                              <span className="opacity-80">{shift.startTime ?? ''}-{shift.endTime ?? ''}</span>
                              <span className="bg-white/20 px-1 rounded text-[10px] font-medium">{empType}</span>
                            </div>
                          </button>
                        );
                      })}
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

      <ShiftModal
        isOpen={showShiftModal}
        onClose={() => { setShowShiftModal(false); setSelectedShift(null); }}
        shift={selectedShift}
        employees={employees}
        shop={shops.find(s => s.id === selectedShopId)}
        date={selectedDate}
        onSave={handleSaveShift}
        onDelete={selectedShift ? () => handleDeleteShift(String(selectedShift.id)) : undefined}
      />
      
      <AvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        employees={employees}
        shops={shops}
        weekStart={currentWeekStart}
        availability={partTimerAvailability}
        onSave={setPartTimerAvailability}
      />
      
      <Modal isOpen={showGenerateModal} onClose={() => setShowGenerateModal(false)} title="Generate Roster" size="md">
        <div className="space-y-4">
          <p className="text-gray-600 text-sm">Select which shops to generate roster for:</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setSelectedShopsForAction(filteredShops.map(s => s.id))} className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200">Select All</button>
            <button type="button" onClick={() => setSelectedShopsForAction([])} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Clear All</button>
          </div>
          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {filteredShops.map(shop => (
              <label key={shop.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedShopsForAction.includes(shop.id)}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedShopsForAction(prev => [...prev, shop.id]);
                    else setSelectedShopsForAction(prev => prev.filter(id => id !== shop.id));
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="flex-1 font-medium">{shop.name}</span>
                <Badge variant={shop.company === 'CMZ' ? 'purple' : 'warning'}>{shop.company}</Badge>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <AnimatedButton variant="secondary" onClick={() => setShowGenerateModal(false)}>Cancel</AnimatedButton>
            <AnimatedButton
              icon={Play}
              onClick={async () => {
                handleClearRoster(selectedShopsForAction);
                await new Promise(resolve => setTimeout(resolve, 100));
                await handleGenerateRoster();
                setShowGenerateModal(false);
              }}
              disabled={selectedShopsForAction.length === 0 || isGenerating}
              loading={isGenerating}
            >
              Generate {selectedShopsForAction.length} Shop(s)
            </AnimatedButton>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Clear Roster" size="md">
        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">This will remove all shifts for the selected shops for the current week.</p>
            <div className="flex gap-2">
  <button type="button" onClick={() => setSelectedShopsForAction(filteredShops.map(s => s.id))} className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200">Select All</button>
  <button type="button" onClick={() => setSelectedShopsForAction([])} className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200">Clear All</button>
</div>

          </div>
          <div className="max-h-64 overflow-y-auto border rounded-lg divide-y">
            {filteredShops.map(shop => {
              const shopShiftCount = weekShifts.filter(s => s.shopId === shop.id).length;
              return (
                <label key={shop.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedShopsForAction.includes(shop.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedShopsForAction(prev => [...prev, shop.id]);
                      else setSelectedShopsForAction(prev => prev.filter(id => id !== shop.id));
                    }}
                    className="w-4 h-4 text-red-600 rounded"
                  />
                  <span className="flex-1 font-medium">{shop.name}</span>
                  <span className="text-sm text-gray-500">{shopShiftCount} shifts</span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <AnimatedButton variant="secondary" onClick={() => setShowClearModal(false)}>Cancel</AnimatedButton>
            <AnimatedButton
              variant="danger"
              icon={Trash2}
              onClick={() => { handleClearRoster(selectedShopsForAction); setShowClearModal(false); }}
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
  const [formData, setFormData] = useState({ employeeId: '', startTime: '09:00', endTime: '17:00' });

  React.useEffect(() => {
    if (isOpen) {
      if (shift) {
        setFormData({
          employeeId: String(shift.employeeId ?? ''),
          startTime: shift.startTime ?? '09:00',
          endTime: shift.endTime ?? '17:00',
        });
      } else {
        setFormData({ employeeId: '', startTime: shop?.openTime || '09:00', endTime: '17:00' });
      }
    }
  }, [isOpen, shift, shop]);

  const calculateHours = (start: string, end: string): number => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    return Math.max(0, (endH * 60 + endM - startH * 60 - startM) / 60);
  };

  const hours = calculateHours(formData.startTime, formData.endTime);

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={shift ? 'Edit Shift' : 'Add Shift'} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg text-sm">
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-gray-500">Shop:</span><p className="font-medium">{shop?.name || 'Unknown'}</p></div>
            <div><span className="text-gray-500">Date:</span><p className="font-medium">{date ? format(parseISO(date), 'EEE, MMM d, yyyy') : 'Unknown'}</p></div>
          </div>
        </div>
        <FormSelect
          label="Employee"
          value={formData.employeeId}
          onChange={(value) => setFormData(prev => ({ ...prev, employeeId: value }))}
          options={[{ value: '', label: 'Select Employee' }, ...availableEmployees.map(emp => ({ value: String(emp.id), label: `${emp.name} (${emp.employmentType})` }))]}
          required
        />
        <div className="grid grid-cols-2 gap-4">
          <FormInput label="Start Time" type="time" value={formData.startTime} onChange={(value) => setFormData(prev => ({ ...prev, startTime: value }))} required />
          <FormInput label="End Time" type="time" value={formData.endTime} onChange={(value) => setFormData(prev => ({ ...prev, endTime: value }))} required />
        </div>
        <div className="p-3 bg-blue-50 rounded-lg"><span className="text-blue-700 text-sm">Total Hours: <strong>{hours.toFixed(1)}h</strong></span></div>
        <div className="flex justify-between gap-3 pt-4 border-t">
          {onDelete && <AnimatedButton variant="danger" icon={Trash2} onClick={onDelete}>Delete</AnimatedButton>}
          <div className="flex-1" />
          <AnimatedButton variant="secondary" onClick={onClose}>Cancel</AnimatedButton>
          <AnimatedButton type="submit" icon={Save}>{shift ? 'Save Changes' : 'Add Shift'}</AnimatedButton>
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

  const dateRangeBounds = useMemo(() => {
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    if (dateRange === 'week') {
      return { start: currentWeekStart, end: addDays(currentWeekStart, 6), label: `${format(currentWeekStart, 'MMM d')} - ${format(addDays(currentWeekStart, 6), 'MMM d, yyyy')}` };
    }
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    return { start: monthStart, end: monthEnd, label: format(today, 'MMMM yyyy') };
  }, [dateRange]);

  const weeksInRange = useMemo(() => {
    const days = Math.ceil((dateRangeBounds.end.getTime() - dateRangeBounds.start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return Math.max(1, days / 7);
  }, [dateRangeBounds]);

  const overtimeData = useMemo(() => {
    return employees
      .filter(emp => !emp.excludeFromRoster)
      .filter(emp => companyFilter === 'all' || emp.company === companyFilter || emp.company === 'Both')
      .map(emp => {
        const empShifts = shifts.filter(s => {
          if (s.employeeId !== emp.id) return false;
          const shiftDate = typeof s.date === 'string' ? parseISO(s.date) : s.date;
          return shiftDate >= dateRangeBounds.start && shiftDate <= dateRangeBounds.end;
        });
        const totalHours = empShifts.reduce((acc, s) => acc + (s.hours ?? 0), 0);
        const targetHours = emp.weeklyHours * weeksInRange;
        const overtimeHours = Math.max(0, totalHours - targetHours);
        const payScale = DEFAULT_PAY_SCALES.find(ps => ps.id === emp.payScaleId);
        const baseRate = payScale?.hourlyRate || 10;
        const overtimeRate = baseRate * (payScale?.overtimeMultiplier || 1.5);
        return {
          employee: emp,
          totalHours,
          regularHours: Math.min(totalHours, targetHours),
          overtimeHours,
          targetHours,
          basePay: Math.min(totalHours, targetHours) * baseRate,
          overtimePay: overtimeHours * overtimeRate,
          totalPay: Math.min(totalHours, targetHours) * baseRate + overtimeHours * overtimeRate,
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
      <div><h1 className="text-2xl font-bold text-gray-900">Overtime Tracking</h1><p className="text-gray-600 mt-1">Monitor employee hours and overtime costs</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Total Hours" value={totals.totalHours.toFixed(1)} gradient="from-blue-500 to-blue-600" />
        <StatCard icon={Clock} label="Overtime Hours" value={totals.overtimeHours.toFixed(1)} gradient="from-orange-500 to-red-500" />
        <StatCard icon={DollarSign} label="Total Pay" value={`€${totals.totalPay.toFixed(2)}`} gradient="from-green-500 to-emerald-500" />
        <StatCard icon={DollarSign} label="Overtime Cost" value={`€${totals.overtimePay.toFixed(2)}`} gradient="from-purple-500 to-purple-600" />
      </div>
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <ToggleButtonGroup value={dateRange} onChange={setDateRange} options={[{ value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }]} />
          <ToggleButtonGroup value={companyFilter} onChange={setCompanyFilter} options={[{ value: 'all', label: 'All' }, { value: 'CMZ', label: 'CMZ' }, { value: 'CS', label: 'CS' }]} />
          <div className="ml-auto text-sm text-gray-600">{dateRangeBounds.label}</div>
        </div>
      </GlassCard>
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
                <th className="text-right p-4 font-medium text-gray-700">Total Pay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {overtimeData.map(({ employee, shiftsCount, regularHours, overtimeHours, totalHours, totalPay }) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={employee.name} size="sm" />
                      <div><p className="font-medium text-gray-900">{employee.name}</p><p className="text-xs text-gray-500">{employee.company} - {employee.weeklyHours}h/week</p></div>
                    </div>
                  </td>
                  <td className="p-4 text-center text-gray-600">{shiftsCount}</td>
                  <td className="p-4 text-center text-gray-600">{regularHours.toFixed(1)}h</td>
                  <td className="p-4 text-center">{overtimeHours > 0 ? <Badge variant="danger">{overtimeHours.toFixed(1)}h</Badge> : <span className="text-gray-400">0h</span>}</td>
                  <td className="p-4 text-center font-medium">{totalHours.toFixed(1)}h</td>
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
  const [showPayScaleModal, setShowPayScaleModal] = useState(false);
  const [showAllowanceModal, setShowAllowanceModal] = useState(false);
  const [editingPayScale, setEditingPayScale] = useState<PayScale | null>(null);
  const [editingAllowance, setEditingAllowance] = useState<Allowance | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ type: 'payscale' | 'allowance'; id: string } | null>(null);
  const [payScaleForm, setPayScaleForm] = useState({ name: '', grade: 'Entry', hourlyRate: 8.50, overtimeMultiplier: 1.5 });
  const [allowanceForm, setAllowanceForm] = useState({ name: '', type: 'fixed' as 'fixed' | 'hourly' | 'percentage', value: 0, description: '' });

  const handleAddPayScale = () => { setEditingPayScale(null); setPayScaleForm({ name: '', grade: 'Entry', hourlyRate: 8.50, overtimeMultiplier: 1.5 }); setShowPayScaleModal(true); };
  const handleEditPayScale = (scale: PayScale) => { setEditingPayScale(scale); setPayScaleForm({ name: scale.name, grade: scale.grade || 'Entry', hourlyRate: scale.hourlyRate, overtimeMultiplier: scale.overtimeMultiplier || 1.5 }); setShowPayScaleModal(true); };
  
  const handleSavePayScale = () => {
    if (!payScaleForm.name.trim()) return;
    if (editingPayScale) {
      setPayScales(prev => prev.map(s => s.id === editingPayScale.id ? { ...s, name: payScaleForm.name, grade: payScaleForm.grade, hourlyRate: payScaleForm.hourlyRate, overtimeMultiplier: payScaleForm.overtimeMultiplier } : s));
    } else {
      setPayScales(prev => [...prev, { id: `scale-${Date.now()}`, name: payScaleForm.name, grade: payScaleForm.grade, hourlyRate: payScaleForm.hourlyRate, overtimeMultiplier: payScaleForm.overtimeMultiplier, weekendMultiplier: 1.25, holidayMultiplier: 2.0 }]);
    }
    setShowPayScaleModal(false);
  };

  const handleAddAllowance = () => { setEditingAllowance(null); setAllowanceForm({ name: '', type: 'fixed', value: 0, description: '' }); setShowAllowanceModal(true); };
  const handleEditAllowance = (allowance: Allowance) => { setEditingAllowance(allowance); setAllowanceForm({ name: allowance.name, type: allowance.type as 'fixed' | 'hourly' | 'percentage', value: allowance.value ?? allowance.amount, description: allowance.description || '' }); setShowAllowanceModal(true); };
  
  const handleSaveAllowance = () => {
    if (!allowanceForm.name.trim()) return;
    if (editingAllowance) {
      setAllowances(prev => prev.map(a => a.id === editingAllowance.id ? { ...a, name: allowanceForm.name, type: allowanceForm.type, amount: allowanceForm.value, value: allowanceForm.value, description: allowanceForm.description } : a));
    } else {
      setAllowances(prev => [...prev, { id: `allowance-${Date.now()}`, name: allowanceForm.name, type: allowanceForm.type, amount: allowanceForm.value, value: allowanceForm.value, description: allowanceForm.description }]);
    }
    setShowAllowanceModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-bold text-gray-900">Pay Scales & Allowances</h1><p className="text-gray-600 mt-1">Manage pay grades and employee allowances</p></div>
        <AnimatedButton icon={Plus} onClick={handleAddPayScale}>Add Pay Scale</AnimatedButton>
      </div>
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Pay Scales</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {payScales.map(scale => (
            <div key={scale.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between mb-2"><h3 className="font-semibold text-gray-900">{scale.name}</h3><Badge variant="info">{scale.grade}</Badge></div>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Hourly Rate:</span><span className="font-medium">€{scale.hourlyRate.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">OT Multiplier:</span><span className="font-medium">{scale.overtimeMultiplier || 1.5}x</span></div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                <AnimatedButton variant="ghost" size="xs" icon={Edit2} onClick={() => handleEditPayScale(scale)}>Edit</AnimatedButton>
                <AnimatedButton variant="ghost" size="xs" icon={Trash2} onClick={() => setShowDeleteConfirm({ type: 'payscale', id: scale.id })}>Delete</AnimatedButton>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-semibold text-gray-900">Allowances</h2><AnimatedButton variant="secondary" size="sm" icon={Plus} onClick={handleAddAllowance}>Add Allowance</AnimatedButton></div>
        <div className="space-y-3">
          {allowances.map(allowance => (
            <div key={allowance.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div><h3 className="font-medium text-gray-900">{allowance.name}</h3><p className="text-sm text-gray-500">{allowance.description}</p></div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge variant={allowance.type === 'fixed' ? 'success' : allowance.type === 'hourly' ? 'info' : 'warning'}>{allowance.type}</Badge>
                  <p className="font-semibold text-gray-900 mt-1">€{allowance.value ?? allowance.amount}</p>
                </div>
                <AnimatedButton variant="ghost" size="sm" icon={Edit2} onClick={() => handleEditAllowance(allowance)}>Edit</AnimatedButton>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
      <Modal isOpen={showPayScaleModal} onClose={() => setShowPayScaleModal(false)} title={editingPayScale ? 'Edit Pay Scale' : 'Add Pay Scale'}>
        <div className="space-y-4">
          <FormInput label="Scale Name" value={payScaleForm.name} onChange={(value) => setPayScaleForm(prev => ({ ...prev, name: value }))} required />
          <FormInput label="Hourly Rate (€)" type="number" value={payScaleForm.hourlyRate} onChange={(value) => setPayScaleForm(prev => ({ ...prev, hourlyRate: parseFloat(value) || 0 }))} required />
          <FormInput label="Overtime Multiplier" type="number" value={payScaleForm.overtimeMultiplier} onChange={(value) => setPayScaleForm(prev => ({ ...prev, overtimeMultiplier: parseFloat(value) || 1.5 }))} required />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <AnimatedButton variant="secondary" onClick={() => setShowPayScaleModal(false)}>Cancel</AnimatedButton>
            <AnimatedButton icon={Check} onClick={handleSavePayScale}>{editingPayScale ? 'Save' : 'Add'}</AnimatedButton>
          </div>
        </div>
      </Modal>
      <Modal isOpen={showAllowanceModal} onClose={() => setShowAllowanceModal(false)} title={editingAllowance ? 'Edit Allowance' : 'Add Allowance'}>
        <div className="space-y-4">
          <FormInput label="Allowance Name" value={allowanceForm.name} onChange={(value) => setAllowanceForm(prev => ({ ...prev, name: value }))} required />
          <FormSelect label="Type" value={allowanceForm.type} onChange={(value) => setAllowanceForm(prev => ({ ...prev, type: value as 'fixed' | 'hourly' | 'percentage' }))} options={[{ value: 'fixed', label: 'Fixed' }, { value: 'hourly', label: 'Hourly' }, { value: 'percentage', label: 'Percentage' }]} />
          <FormInput label="Amount (€)" type="number" value={allowanceForm.value} onChange={(value) => setAllowanceForm(prev => ({ ...prev, value: parseFloat(value) || 0 }))} required />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <AnimatedButton variant="secondary" onClick={() => setShowAllowanceModal(false)}>Cancel</AnimatedButton>
            <AnimatedButton icon={Check} onClick={handleSaveAllowance}>{editingAllowance ? 'Save' : 'Add'}</AnimatedButton>
          </div>
        </div>
      </Modal>
       <ConfirmDialog isOpen={showDeleteConfirm !== null} onClose={() => setShowDeleteConfirm(null)} onConfirm={() => {
        if (showDeleteConfirm?.type === 'payscale') setPayScales(prev => prev.filter(s => s.id !== showDeleteConfirm.id));
        else if (showDeleteConfirm?.type === 'allowance') setAllowances(prev => prev.filter(a => a.id !== showDeleteConfirm.id));
        setShowDeleteConfirm(null);
      }} title="Delete Item" message="Are you sure you want to delete this? This action cannot be undone." />
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account and system preferences</p>
      </div>

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
          <FormInput label="Full Name" value={currentUser.name} onChange={() => {}} disabled />
          <FormInput label="Email" type="email" value={currentUser.email} onChange={() => {}} disabled />
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Database</h2>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div>
            <h3 className="font-medium text-gray-900">Sync to Database</h3>
            <p className="text-sm text-gray-500">Save all shops and employees to the database</p>
          </div>
          <AnimatedButton onClick={handleSync} disabled={isSyncing} icon={Database}>
            {isSyncing ? 'Syncing...' : 'Sync Now'}
          </AnimatedButton>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Preferences</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h3 className="font-medium text-gray-900">Dark Mode</h3>
              <p className="text-sm text-gray-500">Toggle dark theme</p>
            </div>
            <button 
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
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
              className={`p-2 rounded-lg transition-colors ${notificationsEnabled ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'}`}
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
  const [currentWeekStart, setCurrentWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [selectedShiftForSwap, setSelectedShiftForSwap] = useState<BackendShift | null>(null);
  const [leaveForm, setLeaveForm] = useState({
    type: 'annual' as 'annual' | 'sick' | 'personal' | 'unpaid',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    reason: ''
  });
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

  const primaryShop = shops.find(s => s.id === employee.primaryShopId);

  const weekDates = useMemo(() => {
    return DAYS_OF_WEEK.map((day, index) => ({
      day,
      date: addDays(currentWeekStart, index),
      dateStr: format(addDays(currentWeekStart, index), 'yyyy-MM-dd'),
    }));
  }, [currentWeekStart]);

  const myShifts = useMemo(() => {
    const weekEnd = addDays(currentWeekStart, 6);
    return shifts.filter(shift => {
      const shiftDate = typeof shift.date === 'string' ? parseISO(shift.date) : shift.date;
      return shift.employeeId === employee.id && shiftDate >= currentWeekStart && shiftDate <= weekEnd;
    }).sort((a, b) => {
      const dateA = typeof a.date === 'string' ? a.date : format(a.date, 'yyyy-MM-dd');
      const dateB = typeof b.date === 'string' ? b.date : format(b.date, 'yyyy-MM-dd');
      return dateA.localeCompare(dateB);
    });
  }, [shifts, employee.id, currentWeekStart]);

  const weeklyHours = useMemo(() => myShifts.reduce((acc, shift) => acc + (shift.hours ?? 0), 0), [myShifts]);

  const myLeaveRequests = useMemo(() => {
    return leaveRequests.filter(r => r.employeeId === employee.id)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [leaveRequests, employee.id]);

  const mySwapRequests = useMemo(() => {
    return swapRequests.filter(r => r.requesterId === employee.id || r.targetEmployeeId === employee.id)
      .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  }, [swapRequests, employee.id]);

  const goToPreviousWeek = () => setCurrentWeekStart(prev => addDays(prev, -7));
  const goToNextWeek = () => setCurrentWeekStart(prev => addDays(prev, 7));
  const goToToday = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handleSubmitLeave = () => {
    const newRequest: LeaveRequest = {
      id: `leave-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      type: leaveForm.type,
      startDate: leaveForm.startDate,
      endDate: leaveForm.endDate,
      reason: leaveForm.reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setLeaveRequests(prev => [...prev, newRequest]);
    setShowLeaveModal(false);
    setLeaveForm({ type: 'annual', startDate: format(new Date(), 'yyyy-MM-dd'), endDate: format(new Date(), 'yyyy-MM-dd'), reason: '' });
  };

  const handleRequestSwap = (targetEmployeeId: number, targetShiftId: string) => {
    if (!selectedShiftForSwap) return;
    const newSwap: ShiftSwapRequest = {
      id: `swap-${Date.now()}`,
      requesterId: employee.id,
      requesterName: employee.name,
      requesterShiftId: selectedShiftForSwap.id ?? 0,
      targetEmployeeId,
      targetId: targetEmployeeId,
      targetShiftId,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setSwapRequests(prev => [...prev, newSwap]);
    setShowSwapModal(false);
    setSelectedShiftForSwap(null);
  };

  const getShiftColor = (shift: BackendShift) => {
    const type = (shift.shiftType || '').toUpperCase();
    if (type.includes('FULL') || (shift.hours ?? 0) >= 10) return 'from-purple-500 to-purple-600';
    if (type.includes('PM') || parseInt(shift.startTime?.split(':')[0] || '0') >= 12) return 'from-yellow-500 to-yellow-600';
    return 'from-green-500 to-green-600';
  };

  const handleSaveDetails = async () => {
    const notification: ProfileUpdateNotification = {
      id: `profile-update-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      field: 'multiple',
      oldValue: '',
      newValue: '',
      changes: {},
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    const changes: Record<string, { old: string; new: string }> = {};
    if (detailsForm.phone !== (employee.phone || '')) changes.phone = { old: employee.phone || '', new: detailsForm.phone };
    if (detailsForm.idNumber !== (employee.idNumber || '')) changes.idNumber = { old: employee.idNumber || '', new: detailsForm.idNumber };
    if (detailsForm.taxNumber !== (employee.taxNumber || '')) changes.taxNumber = { old: employee.taxNumber || '', new: detailsForm.taxNumber };
    if (detailsForm.iban !== (employee.iban || '')) changes.iban = { old: employee.iban || '', new: detailsForm.iban };

    if (Object.keys(changes).length > 0) {
      notification.changes = changes;
      onProfileUpdate(notification);
      const updatedEmployee: Employee = { ...employee, ...detailsForm };
      onEmployeeUpdate(updatedEmployee);
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
  // EmployeePortalView JSX return
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome, {employee.name}</h1>
          <p className="text-gray-600 mt-1">{primaryShop?.name || 'No primary shop'} - {employee.employmentType === 'full-time' ? 'Full-Time' : 'Part-Time'}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm text-gray-500">This Week</p>
            <p className="text-2xl font-bold text-blue-600">{weeklyHours}h</p>
          </div>
          <Avatar name={employee.name} size="lg" />
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-colors ${activeTab === tab.id ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'roster' && (
        <div className="space-y-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AnimatedButton variant="ghost" size="sm" onClick={goToPreviousWeek}><ChevronLeft className="w-4 h-4" /></AnimatedButton>
                <AnimatedButton variant="secondary" size="sm" onClick={goToToday}>Today</AnimatedButton>
                <AnimatedButton variant="ghost" size="sm" onClick={goToNextWeek}><ChevronRight className="w-4 h-4" /></AnimatedButton>
              </div>
              <p className="font-medium text-gray-700">{format(currentWeekStart, 'MMMM d')} - {format(addDays(currentWeekStart, 6), 'MMMM d, yyyy')}</p>
            </div>
          </GlassCard>

          <div className="grid grid-cols-7 gap-2">
            {weekDates.map(({ day, date, dateStr }) => {
              const dayShift = myShifts.find(s => {
                const shiftDateStr = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
                return shiftDateStr === dateStr;
              });
              const isCurrentDay = isToday(date);
              
              return (
                <div key={dateStr} className={`rounded-xl border-2 overflow-hidden ${isCurrentDay ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-white'}`}>
                  <div className={`p-2 text-center ${isCurrentDay ? 'bg-blue-100' : 'bg-gray-50'}`}>
                    <p className="font-medium text-gray-700">{day}</p>
                    <p className="text-sm text-gray-500">{format(date, 'MMM d')}</p>
                  </div>
                  <div className="p-3 min-h-[120px]">
                    {dayShift ? (
                      <div 
                        className={`p-3 rounded-lg bg-gradient-to-r ${getShiftColor(dayShift)} text-white cursor-pointer hover:shadow-lg transition-shadow`}
                        onClick={() => { setSelectedShiftForSwap(dayShift); setShowSwapModal(true); }}
                      >
                        <p className="font-bold text-lg">{dayShift.startTime ?? ''}</p>
                        <p className="text-sm opacity-90">to {dayShift.endTime ?? ''}</p>
                        <div className="mt-2 pt-2 border-t border-white/30">
                          <p className="text-xs opacity-80">{dayShift.shopName ?? ''}</p>
                          <p className="font-semibold">{dayShift.hours ?? 0}h</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-gray-400"><p className="text-sm">Day Off</p></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <GlassCard className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-gray-600">Weekly Summary</p>
                <p className="text-lg font-semibold">{myShifts.length} shifts - {weeklyHours} hours</p>
              </div>
              <div className="flex gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{myShifts.filter(s => (s.shiftType ?? '').toUpperCase().includes('AM')).length}</p>
                  <p className="text-xs text-gray-500">AM Shifts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{myShifts.filter(s => (s.shiftType ?? '').toUpperCase().includes('PM')).length}</p>
                  <p className="text-xs text-gray-500">PM Shifts</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-purple-600">{myShifts.filter(s => (s.hours ?? 0) >= 10).length}</p>
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
            <AnimatedButton icon={Plus} onClick={() => setShowLeaveModal(true)}>Request Leave</AnimatedButton>
          </div>
          {myLeaveRequests.length === 0 ? (
            <GlassCard className="p-8 text-center">
              <ClipboardList className="w-12 h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-600">No leave requests yet</p>
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {myLeaveRequests.map(request => (
                <GlassCard key={request.id} className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant={request.type === 'sick' ? 'danger' : request.type === 'annual' ? 'success' : 'info'}>{request.type}</Badge>
                        <Badge variant={request.status === 'approved' ? 'success' : request.status === 'rejected' ? 'danger' : 'warning'}>{request.status}</Badge>
                      </div>
                      <p className="mt-2 font-medium">{format(parseISO(request.startDate), 'MMM d, yyyy')}{request.startDate !== request.endDate && <> - {format(parseISO(request.endDate), 'MMM d, yyyy')}</>}</p>
                      {request.reason && <p className="text-sm text-gray-600 mt-1">{request.reason}</p>}
                    </div>
                    <p className="text-xs text-gray-500">Submitted {format(parseISO(request.createdAt ?? new Date().toISOString()), 'MMM d, yyyy')}</p>
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
            </GlassCard>
          ) : (
            <div className="space-y-3">
              {mySwapRequests.map(swap => {
                const isRequester = swap.requesterId === employee.id;
                const otherPerson = employees.find(e => e.id === (isRequester ? swap.targetEmployeeId : swap.requesterId));
                return (
                  <GlassCard key={swap.id} className="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <Avatar name={otherPerson?.name ?? 'Unknown'} size="sm" />
                        <div>
                          <p className="font-medium">{isRequester ? 'Swap with' : 'Request from'} {otherPerson?.name ?? 'Unknown'}</p>
                          <p className="text-sm text-gray-500">{format(parseISO(swap.createdAt ?? new Date().toISOString()), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <Badge variant={swap.status === 'approved' ? 'success' : swap.status === 'rejected' ? 'danger' : 'warning'}>{swap.status}</Badge>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard icon={Clock} label="This Week" value={`${weeklyHours}h`} subtext={`Target: ${employee.weeklyHours}h`} gradient="from-blue-500 to-blue-600" />
            <StatCard icon={Calendar} label="Shifts This Week" value={myShifts.length} gradient="from-green-500 to-emerald-500" />
            <StatCard icon={Clock} label="Avg Hours/Shift" value={myShifts.length > 0 ? (weeklyHours / myShifts.length).toFixed(1) + 'h' : '0h'} gradient="from-purple-500 to-purple-600" />
          </div>
          <GlassCard className="p-4">
            <h3 className="font-medium mb-3">Hours vs Target</h3>
            <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
              <div className={`absolute h-full rounded-full transition-all ${weeklyHours >= employee.weeklyHours ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${Math.min((weeklyHours / employee.weeklyHours) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span className="text-gray-600">{weeklyHours}h worked</span>
              <span className="text-gray-600">{employee.weeklyHours}h target</span>
            </div>
          </GlassCard>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">My Details</h2>
            {!isEditingDetails ? (
              <AnimatedButton icon={Edit2} onClick={() => setIsEditingDetails(true)}>Edit Details</AnimatedButton>
            ) : (
              <div className="flex gap-2">
                <AnimatedButton variant="secondary" onClick={() => { setIsEditingDetails(false); setDetailsForm({ phone: employee.phone || '', idNumber: employee.idNumber || '', taxNumber: employee.taxNumber || '', ssnNumber: employee.ssnNumber || '', tcnNumber: employee.tcnNumber || '', tcnExpiry: employee.tcnExpiry || '', iban: employee.iban || '' }); }}>Cancel</AnimatedButton>
                <AnimatedButton icon={Save} onClick={handleSaveDetails}>Save Changes</AnimatedButton>
              </div>
            )}
          </div>
          
          {detailsUpdateSuccess && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-green-700 font-medium">Your changes have been saved and sent to management for review.</p>
            </div>
          )}
          
          <GlassCard className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar name={employee.name} size="lg" />
              <div>
                <h3 className="text-xl font-bold">{employee.name}</h3>
                <p className="text-gray-600">{employee.email}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={employee.company === 'CMZ' ? 'purple' : 'warning'}>{employee.company}</Badge>
                  <Badge variant={employee.employmentType === 'full-time' ? 'success' : 'info'}>{employee.employmentType}</Badge>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {isEditingDetails ? (
                <>
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <label className="text-sm text-blue-600 font-medium">Phone</label>
                    <input type="tel" value={detailsForm.phone} onChange={(e) => setDetailsForm(prev => ({ ...prev, phone: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Phone number" />
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <label className="text-sm text-blue-600 font-medium">ID Number</label>
                    <input type="text" value={detailsForm.idNumber} onChange={(e) => setDetailsForm(prev => ({ ...prev, idNumber: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="ID Number" />
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <label className="text-sm text-blue-600 font-medium">Tax Number</label>
                    <input type="text" value={detailsForm.taxNumber} onChange={(e) => setDetailsForm(prev => ({ ...prev, taxNumber: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Tax Number" />
                  </div>
                  <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                    <label className="text-sm text-blue-600 font-medium">IBAN</label>
                    <input type="text" value={detailsForm.iban} onChange={(e) => setDetailsForm(prev => ({ ...prev, iban: e.target.value }))} className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg" placeholder="Bank IBAN" />
                  </div>
                </>
              ) : (
                <>
                  <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Phone</p><p className="font-medium">{employee.phone || 'Not set'}</p></div>
                  <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">ID Number</p><p className="font-medium">{employee.idNumber || 'Not set'}</p></div>
                  <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">Tax Number</p><p className="font-medium">{employee.taxNumber || 'Not set'}</p></div>
                  <div className="p-4 bg-gray-50 rounded-lg"><p className="text-sm text-gray-500">IBAN</p><p className="font-medium">{employee.iban || 'Not set'}</p></div>
                </>
              )}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Leave Request Modal */}
      <Modal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} title="Request Leave" size="md">
        <div className="space-y-4">
          <FormSelect
            label="Leave Type"
            value={leaveForm.type}
            onChange={(value) => setLeaveForm(prev => ({ ...prev, type: value as typeof leaveForm.type }))}
            options={[{ value: 'annual', label: 'Annual Leave' }, { value: 'sick', label: 'Sick Leave' }, { value: 'personal', label: 'Personal Leave' }, { value: 'unpaid', label: 'Unpaid Leave' }]}
          />
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Start Date" type="date" value={leaveForm.startDate} onChange={(value) => setLeaveForm(prev => ({ ...prev, startDate: value }))} required />
            <FormInput label="End Date" type="date" value={leaveForm.endDate} onChange={(value) => setLeaveForm(prev => ({ ...prev, endDate: value }))} required />
          </div>
          <FormInput label="Reason (optional)" value={leaveForm.reason} onChange={(value) => setLeaveForm(prev => ({ ...prev, reason: value }))} placeholder="Brief reason..." />
          <div className="flex justify-end gap-3 pt-4 border-t">
            <AnimatedButton variant="secondary" onClick={() => setShowLeaveModal(false)}>Cancel</AnimatedButton>
            <AnimatedButton icon={Check} onClick={handleSubmitLeave}>Submit Request</AnimatedButton>
          </div>
        </div>
      </Modal>

      {/* Swap Request Modal */}
      <Modal isOpen={showSwapModal} onClose={() => { setShowSwapModal(false); setSelectedShiftForSwap(null); }} title="Request Shift Swap" size="md">
        {selectedShiftForSwap && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-600">Your shift to swap:</p>
              <p className="font-bold text-blue-800">{format(typeof selectedShiftForSwap.date === 'string' ? parseISO(selectedShiftForSwap.date) : selectedShiftForSwap.date, 'EEEE, MMMM d')}</p>
              <p className="text-blue-700">{selectedShiftForSwap.startTime ?? ''} - {selectedShiftForSwap.endTime ?? ''} at {selectedShiftForSwap.shopName ?? ''}</p>
            </div>
            <div>
              <p className="font-medium mb-2">Select a colleague to swap with:</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {employees.filter(e => e.id !== employee.id && !e.excludeFromRoster && (e.company === employee.company || e.company === 'Both')).map(colleague => {
                  const selectedShiftDate = typeof selectedShiftForSwap.date === 'string' ? selectedShiftForSwap.date : format(selectedShiftForSwap.date, 'yyyy-MM-dd');
                  const colleagueShift = shifts.find(s => {
                    const shiftDate = typeof s.date === 'string' ? s.date : format(s.date, 'yyyy-MM-dd');
                    return s.employeeId === colleague.id && shiftDate === selectedShiftDate;
                  });
                  return (
                    <button
                      key={colleague.id}
                      onClick={() => handleRequestSwap(colleague.id, String(colleagueShift?.id ?? ''))}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar name={colleague.name} size="sm" />
                        <div>
                          <p className="font-medium">{colleague.name}</p>
                          <p className="text-sm text-gray-500">{colleagueShift ? `Working: ${colleagueShift.startTime ?? ''} - ${colleagueShift.endTime ?? ''}` : 'Day off'}</p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-end pt-4 border-t">
              <AnimatedButton variant="secondary" onClick={() => { setShowSwapModal(false); setSelectedShiftForSwap(null); }}>Cancel</AnimatedButton>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
// ============== MAIN APP COMPONENT ==============

export default function App() {
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

  // Data state
  const [shops, setShops] = useState<Shop[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [shifts, setShifts] = useState<BackendShift[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [swapRequests, setSwapRequests] = useState<ShiftSwapRequest[]>([]);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [partTimerAvailability, setPartTimerAvailability] = useState<PartTimerAvailability[]>([]);
  const [profileUpdateNotifications, setProfileUpdateNotifications] = useState<ProfileUpdateNotification[]>([]);

  const syncToDatabase = async () => {
    try {
      for (const shop of shops) {
        await fetch(`${API_BASE_URL}/shops`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(shop) });
      }
      for (const employee of employees) {
        await fetch(`${API_BASE_URL}/employees`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(employee) });
      }
      alert('Data synced to database successfully!');
    } catch (error) {
      console.error('Sync failed:', error);
      alert('Sync failed - check console');
    }
  };

  // Check for existing login on startup
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/invite/')) {
      const token = path.replace('/invite/', '');
      setInviteToken(token);
      setIsCheckingAuth(false);
      return;
    }
    
    const checkAuth = async () => {
      const token = localStorage.getItem('rosterpro_token');
      const savedUser = localStorage.getItem('rosterpro_user');
      
      if (token && savedUser) {
        try {
          const response = await fetch(`${API_BASE_URL}/auth/me`, { headers: { 'Authorization': `Bearer ${token}` } });
          if (response.ok) {
            const data = await response.json();
            setAuthToken(token);
            setAuthUser(data.user);
            setIsAuthenticated(true);
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

  const handleLogin = (token: string, user: unknown) => {
    setAuthToken(token);
    setAuthUser(user);
    setIsAuthenticated(true);
    if (user && typeof user === 'object') {
      const userData = user as { id: number; employeeName?: string; email: string; role?: string; company?: string; employeeId?: number };
      setCurrentUser({
        id: userData.id,
        name: userData.employeeName || userData.email.split('@')[0],
        email: userData.email,
        role: userData.role || 'employee',
        company: (userData.company as 'CMZ' | 'CS' | 'Both') || 'Both',
        employeeId: userData.employeeId,
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('rosterpro_token');
    localStorage.removeItem('rosterpro_user');
    setAuthToken(null);
    setAuthUser(null);
    setIsAuthenticated(false);
  };

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const shopsResponse = await fetch(`${API_BASE_URL}/shops`);
        let loadedShops: Shop[] = [];
        if (shopsResponse.ok) {
          const shopsData = await shopsResponse.json();
          loadedShops = shopsData.map((shop: Shop) => ({
            ...shop,
            isActive: shop.isActive ?? true,
            requirements: shop.requirements || [],
            specialRequests: shop.specialRequests || [],
            assignedEmployees: shop.assignedEmployees || [],
            rules: shop.rules || {},
          }));
        }

        const employeesResponse = await fetch(`${API_BASE_URL}/employees`);
        let loadedEmployees: Employee[] = [];
        if (employeesResponse.ok) {
          const employeesData = await employeesResponse.json();
          loadedEmployees = employeesData.map((emp: Employee) => ({
            ...emp,
            employmentType: emp.employmentType || 'full-time',
            role: emp.role || 'staff',
            weeklyHours: emp.weeklyHours || 40,
            excludeFromRoster: emp.excludeFromRoster || false,
            secondaryShopIds: emp.secondaryShopIds || [],
          }));
        }

        // Link employees to shops
        const shopsWithEmployees = loadedShops.map(shop => {
          const assignedEmployees = loadedEmployees
            .filter(emp => emp.primaryShopId === shop.id || (emp.secondaryShopIds || []).includes(shop.id))
            .map(emp => ({ employeeId: emp.id, isPrimary: emp.primaryShopId === shop.id }));
          return { ...shop, assignedEmployees };
        });

        setShops(shopsWithEmployees.length > 0 ? shopsWithEmployees : SAMPLE_SHOPS);
        setEmployees(loadedEmployees.length > 0 ? loadedEmployees : SAMPLE_EMPLOYEES);
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

  // Load current week's roster
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
            setShifts(data.shifts);
          }
        }
      } catch (error) {
        console.error('Failed to load current week roster:', error);
      }
    };
    if (!isLoading && employees.length > 0) {
      loadCurrentWeekRoster();
    }
  }, [isLoading, employees.length]);

  useEffect(() => {
    if (isEmployeePreview) {
      const employeeViews: ViewType[] = ['portal', 'roster', 'leave', 'swaps', 'settings'];
      if (!employeeViews.includes(activeView)) {
        setActiveView('portal');
      }
    }
  }, [isEmployeePreview, activeView]);

  if (isLoading || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading RosterPro...</p>
        </div>
      </div>
    );
  }

  if (inviteToken) {
    return <InviteAcceptPage token={inviteToken} onComplete={() => { setInviteToken(null); window.history.pushState({}, '', '/'); }} />;
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  // Suppress unused variable warnings
  void authToken;
  void authUser;

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
            onGenerateRoster={() => setActiveView('roster')}
            onOpenAvailability={() => setShowAvailabilityModal(true)}
            onSyncData={() => window.location.reload()}
            onApproveProfileUpdate={(id) => setProfileUpdateNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, status: 'approved' as const } : n))}
            onRejectProfileUpdate={(id) => setProfileUpdateNotifications(prev => prev.map(n => String(n.id) === String(id) ? { ...n, status: 'rejected' as const } : n))}
          />
        );
      case 'roster':
        return <RosterView shops={shops} employees={employees} shifts={shifts} setShifts={setShifts} leaveRequests={leaveRequests} />;
      case 'shops':
        return <ShopsView shops={shops} setShops={setShops} employees={employees} setEmployees={setEmployees} />;
      case 'employees':
        return <EmployeesView employees={employees} setEmployees={setEmployees} shops={shops} setShops={setShops} />;
      case 'payscales':
        return <PayScalesView />;
      case 'overtime':
        return <OvertimeView employees={employees} shifts={shifts} />;
      case 'leave':
        return <LeaveView leaveRequests={leaveRequests} setLeaveRequests={setLeaveRequests} employees={employees} currentUser={currentUser} />;
      case 'swaps':
        return <SwapsView swapRequests={swapRequests} setSwapRequests={setSwapRequests} employees={employees} shifts={shifts} setShifts={setShifts} currentUser={currentUser} />;
      case 'settings':
        return <SettingsView currentUser={currentUser} onSyncToDatabase={syncToDatabase} darkMode={darkMode} setDarkMode={setDarkMode} notificationsEnabled={notificationsEnabled} setNotificationsEnabled={setNotificationsEnabled} />;
      case 'portal':
        const portalEmployee = employees.find(e => e.id === currentUser.employeeId) || employees[0];
        return portalEmployee ? (
          <EmployeePortalView
            employee={portalEmployee}
            shifts={shifts}
            shops={shops}
            employees={employees}
            leaveRequests={leaveRequests}
            setLeaveRequests={setLeaveRequests}
            swapRequests={swapRequests}
            setSwapRequests={setSwapRequests}
            onProfileUpdate={(notification) => setProfileUpdateNotifications(prev => [...prev, notification])}
            onEmployeeUpdate={(updatedEmployee) => setEmployees(prev => prev.map(e => e.id === updatedEmployee.id ? updatedEmployee : e))}
          />
        ) : <div>No employee found</div>;
      case 'users':
        return <UsersView employees={employees} shops={shops} />;
      default:
        return <div className="text-center py-12"><h2 className="text-xl font-semibold text-gray-700">View not found</h2></div>;
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'bg-gradient-to-br from-slate-900 to-slate-800 text-white' : 'bg-gradient-to-br from-slate-100 to-slate-200'}`}>
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

      <main className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        <header className={`sticky top-0 z-30 backdrop-blur-sm border-b transition-colors duration-300 ${darkMode ? 'bg-slate-800/80 border-slate-700' : 'bg-white/80 border-gray-200'}`}>
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
              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors relative">
                  <Bell className="w-5 h-5" />
                  {(leaveRequests.filter(r => r.status === 'pending').length + swapRequests.filter(r => r.status === 'pending').length) > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                  )}
                </button>
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50">
                    <div className="p-4 border-b border-gray-200"><h3 className="font-semibold text-gray-900">Notifications</h3></div>
                    <div className="max-h-96 overflow-y-auto">
                      {leaveRequests.filter(r => r.status === 'pending').length === 0 && swapRequests.filter(r => r.status === 'pending').length === 0 ? (
                        <div className="p-4 text-center text-gray-500">No pending notifications</div>
                      ) : (
                        <div className="divide-y divide-gray-100">
                          {leaveRequests.filter(r => r.status === 'pending').map(request => {
                            const employee = employees.find(e => e.id === request.employeeId);
                            return (
                              <div key={request.id} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={() => { setActiveView('leave'); setShowNotifications(false); }}>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center"><ClipboardList className="w-4 h-4 text-yellow-600" /></div>
                                  <div><p className="text-sm font-medium text-gray-900">Leave Request</p><p className="text-xs text-gray-500">{employee?.name ?? 'Unknown'} - {request.type}</p></div>
                                </div>
                              </div>
                            );
                          })}
                          {swapRequests.filter(r => r.status === 'pending').map(request => {
                            const requester = employees.find(e => e.id === request.requesterId);
                            return (
                              <div key={request.id} className="p-3 hover:bg-gray-50 cursor-pointer" onClick={() => { setActiveView('swaps'); setShowNotifications(false); }}>
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center"><Repeat className="w-4 h-4 text-purple-600" /></div>
                                  <div><p className="text-sm font-medium text-gray-900">Swap Request</p><p className="text-xs text-gray-500">{requester?.name ?? 'Unknown'} wants to swap</p></div>
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
              <div className="flex items-center gap-2">
                <Avatar name={currentUser.name} size="sm" />
                <span className="text-sm font-medium text-gray-700 hidden md:block">{currentUser.name}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="p-6">{renderContent()}</div>

        <footer className={`border-t px-6 py-4 mt-8 transition-colors duration-300 ${darkMode ? 'border-slate-700 bg-slate-800/50 text-slate-400' : 'border-gray-200 bg-white/50'}`}>
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>RosterPro v12.6</p>
            <p>© 2024 RosterPro. All rights reserved.</p>
          </div>
        </footer>
      </main>

      <AvailabilityModal
        isOpen={showAvailabilityModal}
        onClose={() => setShowAvailabilityModal(false)}
        employees={employees}
        shops={shops}
        weekStart={startOfWeek(new Date(), { weekStartsOn: 1 })}
        availability={partTimerAvailability}
        onSave={setPartTimerAvailability}
      />
    </div>
  );
}