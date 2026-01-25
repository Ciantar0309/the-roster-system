// frontend/src/components/ShopsView.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  Clock,
  Users,
  Calendar,
  X,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Sun,
  Scissors,
  Settings,
  Eye,
  Info
} from 'lucide-react';
import type {
  Shop,
  ShopCompany,
  ShopDayRequirement,
  SpecialShift,
  FixedDayOff,
  SpecialDayRule,
  TrimmingConfig,
  SundayConfig,
  DayOfWeek,
  Employee
} from '../types';
import {
  DEFAULT_SHOP_REQUIREMENTS,
  DAYS_OF_WEEK,
  DEFAULT_TRIMMING_CONFIG,
  DEFAULT_SUNDAY_CONFIG
} from '../types';

interface ShopsViewProps {
  onNavigate?: (view: string) => void;
  shops?: Shop[];
  setShops?: React.Dispatch<React.SetStateAction<Shop[]>>;
  employees?: Employee[];
  setEmployees?: React.Dispatch<React.SetStateAction<Employee[]>>;
}

// Shop Form Modal Component
const ShopFormModal: React.FC<{
  shop: Shop | null;
  onClose: () => void;
  onSave: (shop: Partial<Shop>) => void;
  existingShops: Shop[];
}> = ({ shop, onClose, onSave, existingShops }) => {
  const [activeTab, setActiveTab] = useState<'basic' | 'staffing' | 'special' | 'rules'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<{
    name: string;
    address: string;
    phone: string;
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
    trimming: TrimmingConfig;
    sunday: SundayConfig;
  }>({
    name: '',
    address: '',
    phone: '',
    company: 'CMZ',
    openTime: '06:30',
    closeTime: '21:30',
    isActive: true,
    requirements: JSON.parse(JSON.stringify(DEFAULT_SHOP_REQUIREMENTS)),
    minStaffAtOpen: 1,
    minStaffMidday: 2,
    minStaffAtClose: 1,
    canBeSolo: false,
    specialShifts: [],
    fixedDaysOff: [],
    specialDayRules: [],
    trimming: { ...DEFAULT_TRIMMING_CONFIG },
    sunday: JSON.parse(JSON.stringify(DEFAULT_SUNDAY_CONFIG))
  });

  // Load shop data when editing
  useEffect(() => {
    if (shop) {
      setFormData({
        name: shop.name || '',
        address: shop.address || '',
        phone: shop.phone || '',
        company: (shop.company === 'Both' ? 'CMZ' : shop.company) || 'CMZ',
        openTime: shop.openTime || '06:30',
        closeTime: shop.closeTime || '21:30',
        isActive: shop.isActive !== false,
        requirements: shop.requirements && shop.requirements.length > 0
          ? shop.requirements
          : JSON.parse(JSON.stringify(DEFAULT_SHOP_REQUIREMENTS)),
        minStaffAtOpen: shop.minStaffAtOpen ?? 1,
        minStaffMidday: shop.minStaffMidday ?? 2,
        minStaffAtClose: shop.minStaffAtClose ?? 1,
        canBeSolo: shop.canBeSolo ?? false,
        specialShifts: shop.specialShifts || [],
        fixedDaysOff: shop.fixedDaysOff || [],
        specialDayRules: shop.specialDayRules || [],
        trimming: shop.trimming ? { ...DEFAULT_TRIMMING_CONFIG, ...shop.trimming } : { ...DEFAULT_TRIMMING_CONFIG },
        sunday: shop.sunday ? { ...DEFAULT_SUNDAY_CONFIG, ...shop.sunday } : JSON.parse(JSON.stringify(DEFAULT_SUNDAY_CONFIG))
      });
    }
  }, [shop]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Shop name is required';
    } else if (
      existingShops.some(
        s => s.name.toLowerCase() === formData.name.toLowerCase() && s.id !== shop?.id
      )
    ) {
      newErrors.name = 'A shop with this name already exists';
    }

    if (!formData.openTime) {
      newErrors.openTime = 'Opening time is required';
    }

    if (!formData.closeTime) {
      newErrors.closeTime = 'Closing time is required';
    }

    if (formData.openTime && formData.closeTime && formData.openTime >= formData.closeTime) {
      newErrors.closeTime = 'Closing time must be after opening time';
    }

    // Validate trimming settings
    if (formData.trimming.enabled) {
      if (formData.trimming.minShiftHours < 3 || formData.trimming.minShiftHours > 6) {
        newErrors.minShiftHours = 'Minimum shift hours must be between 3 and 6';
      }
      if (formData.trimming.trimFromStart < 0 || formData.trimming.trimFromStart > 2) {
        newErrors.trimFromStart = 'Trim from start must be between 0 and 2 hours';
      }
      if (formData.trimming.trimFromEnd < 0 || formData.trimming.trimFromEnd > 3) {
        newErrors.trimFromEnd = 'Trim from end must be between 0 and 3 hours';
      }
    }

    // Validate Sunday custom hours
    if (formData.sunday.customHours?.enabled) {
      if (!formData.sunday.customHours.openTime || !formData.sunday.customHours.closeTime) {
        newErrors.sundayHours = 'Sunday hours are required when custom hours are enabled';
      } else if (formData.sunday.customHours.openTime >= formData.sunday.customHours.closeTime) {
        newErrors.sundayHours = 'Sunday closing time must be after opening time';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave({
        ...formData,
        id: shop?.id
      });
    }
  };

  const updateRequirement = (dayIndex: number, field: keyof ShopDayRequirement, value: number | boolean | string) => {
    const newRequirements = [...formData.requirements];
    newRequirements[dayIndex] = {
      ...newRequirements[dayIndex],
      [field]: value
    };
    setFormData({ ...formData, requirements: newRequirements });
  };

  const applyPreset = (preset: 'minimal' | 'standard' | 'busy' | 'weekend-heavy') => {
    let newRequirements = [...formData.requirements];

    switch (preset) {
      case 'minimal':
        newRequirements = newRequirements.map(req => ({
          ...req,
          amStaff: 1,
          pmStaff: 1,
          allowFullDay: true
        }));
        break;
      case 'standard':
        newRequirements = newRequirements.map((req, i) => ({
          ...req,
          amStaff: i === 6 ? 1 : 2,
          pmStaff: i === 6 ? 1 : 2,
          allowFullDay: true
        }));
        break;
      case 'busy':
        newRequirements = newRequirements.map((req, i) => ({
          ...req,
          amStaff: i === 6 ? 2 : 3,
          pmStaff: i === 6 ? 2 : 3,
          allowFullDay: true
        }));
        break;
      case 'weekend-heavy':
        newRequirements = newRequirements.map((req, i) => ({
          ...req,
          amStaff: i >= 4 ? 3 : 2,
          pmStaff: i >= 4 ? 3 : 2,
          allowFullDay: true
        }));
        break;
    }

    setFormData({ ...formData, requirements: newRequirements });
  };

  // Add special shift
  const addSpecialShift = () => {
    const newShift: SpecialShift = {
      id: Date.now().toString(),
      dayOfWeek: 'monday',
      startTime: '09:00',
      endTime: '17:00',
      employeeId: undefined,
      notes: ''
    };
    setFormData({
      ...formData,
      specialShifts: [...formData.specialShifts, newShift]
    });
  };

  const removeSpecialShift = (index: number) => {
    const newShifts = [...formData.specialShifts];
    newShifts.splice(index, 1);
    setFormData({ ...formData, specialShifts: newShifts });
  };

  const updateSpecialShift = (index: number, field: keyof SpecialShift, value: string | number | undefined) => {
    const newShifts = [...formData.specialShifts];
    newShifts[index] = { ...newShifts[index], [field]: value };
    setFormData({ ...formData, specialShifts: newShifts });
  };

  // Calculate totals for staffing tab
  const staffingTotals = useMemo(() => {
    let totalAM = 0;
    let totalPM = 0;
    formData.requirements.forEach(req => {
      totalAM += req.amStaff || 0;
      totalPM += req.pmStaff || 0;
    });
    return { totalAM, totalPM, total: totalAM + totalPM };
  }, [formData.requirements]);

  // Calculate trimmed shift preview
  const trimPreview = useMemo(() => {
    if (!formData.trimming.enabled) return null;

    const openParts = formData.openTime.split(':').map(Number);
    const openMinutes = openParts[0] * 60 + openParts[1];

    const closeParts = formData.closeTime.split(':').map(Number);
    const closeMinutes = closeParts[0] * 60 + closeParts[1];

    const midpoint = Math.floor((openMinutes + closeMinutes) / 2);

    // Standard AM shift
    const standardAMStart = formData.openTime;
    const standardAMEndMinutes = midpoint + 30;
    const standardAMEnd = `${Math.floor(standardAMEndMinutes / 60).toString().padStart(2, '0')}:${(standardAMEndMinutes % 60).toString().padStart(2, '0')}`;

    // Trimmed AM shift
    const trimmedStartMinutes = openMinutes + (formData.trimming.trimFromStart * 60);
    const trimmedEndMinutes = standardAMEndMinutes - (formData.trimming.trimFromEnd * 60);

    const trimmedStart = `${Math.floor(trimmedStartMinutes / 60).toString().padStart(2, '0')}:${(trimmedStartMinutes % 60).toString().padStart(2, '0')}`;
    const trimmedEnd = `${Math.floor(trimmedEndMinutes / 60).toString().padStart(2, '0')}:${(trimmedEndMinutes % 60).toString().padStart(2, '0')}`;

    const standardHours = (standardAMEndMinutes - openMinutes) / 60;
    const trimmedHours = (trimmedEndMinutes - trimmedStartMinutes) / 60;

    return {
      standard: { start: standardAMStart, end: standardAMEnd, hours: standardHours.toFixed(1) },
      trimmed: { start: trimmedStart, end: trimmedEnd, hours: trimmedHours.toFixed(1) }
    };
  }, [formData.openTime, formData.closeTime, formData.trimming]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {shop ? 'Edit Shop' : 'Add New Shop'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {shop ? 'Update shop details and requirements' : 'Create a new shop location'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-100">
          <div className="flex px-6">
            {[
              { id: 'basic', label: 'Basic Info', icon: Store },
              { id: 'staffing', label: 'Staffing', icon: Users },
              { id: 'special', label: 'Special', icon: Calendar },
              { id: 'rules', label: 'Rules & Scheduling', icon: Settings }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Basic Info Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* Shop Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Shop Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      errors.name ? 'border-red-300 bg-red-50' : 'border-gray-200'
                    }`}
                    placeholder="e.g., Hamrun Branch"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Company */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company
                  </label>
                  <div className="flex gap-3">
                    {(['CMZ', 'CS'] as ShopCompany[]).map(company => (
                      <button
                        key={company}
                        type="button"
                        onClick={() => setFormData({ ...formData, company })}
                        className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all ${
                          formData.company === company
                            ? company === 'CMZ'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="font-medium">{company}</div>
                        <div className="text-xs opacity-75">
                          {company === 'CMZ' ? 'Caffe Mazzo' : 'Coffee & Shots'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Street address"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="+356 1234 5678"
                  />
                </div>

                {/* Operating Hours */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Operating Hours
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Opening</label>
                      <input
                        type="time"
                        value={formData.openTime}
                        onChange={e => setFormData({ ...formData, openTime: e.target.value })}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.openTime ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                    </div>
                    <span className="text-gray-400 mt-5">to</span>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-500 mb-1">Closing</label>
                      <input
                        type="time"
                        value={formData.closeTime}
                        onChange={e => setFormData({ ...formData, closeTime: e.target.value })}
                        className={`w-full px-4 py-2.5 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                          errors.closeTime ? 'border-red-300 bg-red-50' : 'border-gray-200'
                        }`}
                      />
                    </div>
                  </div>
                  {(errors.openTime || errors.closeTime) && (
                    <p className="mt-1 text-sm text-red-500 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.openTime || errors.closeTime}
                    </p>
                  )}
                </div>

                {/* Active Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <div className="font-medium text-gray-900">Shop Status</div>
                    <div className="text-sm text-gray-500">
                      {formData.isActive ? 'Shop is active and included in scheduling' : 'Shop is inactive'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                    className={`p-2 rounded-lg transition-colors ${
                      formData.isActive ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {formData.isActive ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Staffing Tab */}
            {activeTab === 'staffing' && (
              <div className="space-y-6">
                {/* Quick Presets */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Quick Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'minimal', label: 'Minimal (1/1)', desc: '1 AM, 1 PM all days' },
                      { id: 'standard', label: 'Standard (2/2)', desc: '2 AM, 2 PM weekdays' },
                      { id: 'busy', label: 'Busy (3/3)', desc: '3 AM, 3 PM all days' },
                      { id: 'weekend-heavy', label: 'Weekend Heavy', desc: 'Extra staff Fri-Sun' }
                    ].map(preset => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => applyPreset(preset.id as 'minimal' | 'standard' | 'busy' | 'weekend-heavy')}
                        className="px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                        title={preset.desc}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Daily Requirements Grid */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Daily Staff Requirements
                  </label>
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="grid grid-cols-5 gap-px bg-gray-200 text-sm font-medium text-gray-700">
                      <div className="bg-gray-50 p-3">Day</div>
                      <div className="bg-gray-50 p-3 text-center">AM Staff</div>
                      <div className="bg-gray-50 p-3 text-center">PM Staff</div>
                      <div className="bg-gray-50 p-3 text-center">Full Day OK</div>
                      <div className="bg-gray-50 p-3 text-center">Mandatory</div>
                    </div>
                    {DAYS_OF_WEEK.map((day, index) => (
                      <div key={day} className="grid grid-cols-5 gap-px bg-gray-200">
                        <div className="bg-white p-3 font-medium text-gray-900 capitalize">
                          {day.slice(0, 3)}
                        </div>
                        <div className="bg-white p-2">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={formData.requirements[index]?.amStaff || 0}
                            onChange={e => updateRequirement(index, 'amStaff', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-center"
                          />
                        </div>
                        <div className="bg-white p-2">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={formData.requirements[index]?.pmStaff || 0}
                            onChange={e => updateRequirement(index, 'pmStaff', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-200 rounded text-center"
                          />
                        </div>
                        <div className="bg-white p-2 flex justify-center items-center">
                          <input
                            type="checkbox"
                            checked={formData.requirements[index]?.allowFullDay ?? true}
                            onChange={e => updateRequirement(index, 'allowFullDay', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </div>
                        <div className="bg-white p-2 flex justify-center items-center">
                          <input
                            type="checkbox"
                            checked={formData.requirements[index]?.isMandatory ?? false}
                            onChange={e => updateRequirement(index, 'isMandatory', e.target.checked)}
                            className="w-4 h-4 text-blue-600 rounded"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="text-sm font-medium text-blue-900 mb-2">Weekly Totals</div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <span className="text-blue-600">AM Shifts:</span>{' '}
                      <span className="font-medium">{staffingTotals.totalAM}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">PM Shifts:</span>{' '}
                      <span className="font-medium">{staffingTotals.totalPM}</span>
                    </div>
                    <div>
                      <span className="text-blue-600">Total:</span>{' '}
                      <span className="font-medium">{staffingTotals.total}</span>
                    </div>
                  </div>
                </div>

                {/* Min Staff Settings */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Minimum Staff Levels
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">At Opening</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.minStaffAtOpen}
                        onChange={e => setFormData({ ...formData, minStaffAtOpen: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">At Midday</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.minStaffMidday}
                        onChange={e => setFormData({ ...formData, minStaffMidday: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">At Closing</label>
                      <input
                        type="number"
                        min="1"
                        max="5"
                        value={formData.minStaffAtClose}
                        onChange={e => setFormData({ ...formData, minStaffAtClose: parseInt(e.target.value) || 1 })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Special Tab */}
            {activeTab === 'special' && (
              <div className="space-y-6">
                {/* Can Be Solo */}
                <div className="flex items-center justify-between p-4 bg-amber-50 rounded-xl border border-amber-200">
                  <div>
                    <div className="font-medium text-amber-900">Single Person Coverage</div>
                    <div className="text-sm text-amber-700">
                      This shop can be operated by one person on a full day shift
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, canBeSolo: !formData.canBeSolo })}
                    className={`p-2 rounded-lg transition-colors ${
                      formData.canBeSolo ? 'text-amber-600' : 'text-gray-400'
                    }`}
                  >
                    {formData.canBeSolo ? (
                      <ToggleRight className="w-8 h-8" />
                    ) : (
                      <ToggleLeft className="w-8 h-8" />
                    )}
                  </button>
                </div>

                {/* Special Shifts */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-gray-700">
                      Custom Shift Times
                    </label>
                    <button
                      type="button"
                      onClick={addSpecialShift}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Plus className="w-4 h-4" />
                      Add Shift
                    </button>
                  </div>

                  {formData.specialShifts.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                      <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No custom shifts defined</p>
                      <p className="text-xs text-gray-400">Add shifts with specific timing requirements</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.specialShifts.map((shift, index) => (
                        <div key={shift.id} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 grid grid-cols-4 gap-3">
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Day</label>
                                <select
                                  value={shift.dayOfWeek}
                                  onChange={e => updateSpecialShift(index, 'dayOfWeek', e.target.value as DayOfWeek)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                                >
                                  {DAYS_OF_WEEK.map(day => (
                                    <option key={day} value={day} className="capitalize">
                                      {day}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Start</label>
                                <input
                                  type="time"
                                  value={shift.startTime}
                                  onChange={e => updateSpecialShift(index, 'startTime', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">End</label>
                                <input
                                  type="time"
                                  value={shift.endTime}
                                  onChange={e => updateSpecialShift(index, 'endTime', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                                />
                              </div>
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Notes</label>
                                <input
                                  type="text"
                                  value={shift.notes || ''}
                                  onChange={e => updateSpecialShift(index, 'notes', e.target.value)}
                                  placeholder="Optional"
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeSpecialShift(index)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rules & Scheduling Tab */}
            {activeTab === 'rules' && (
              <div className="space-y-8">
                {/* Sunday Rules Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
                    <Sun className="w-5 h-5 text-amber-500" />
                    Sunday Rules
                  </div>

                  {/* Closed on Sunday */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900">Closed on Sunday</div>
                      <div className="text-sm text-gray-500">Shop does not operate on Sundays</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        sunday: { ...formData.sunday, closed: !formData.sunday.closed }
                      })}
                      className={`p-2 rounded-lg transition-colors ${
                        formData.sunday.closed ? 'text-red-600' : 'text-gray-400'
                      }`}
                    >
                      {formData.sunday.closed ? (
                        <ToggleRight className="w-8 h-8" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                  </div>

                  {!formData.sunday.closed && (
                    <>
                      {/* Max Staff on Sunday */}
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium text-gray-900">Maximum Staff on Sunday</div>
                            <div className="text-sm text-gray-500">Limit the number of employees scheduled</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={formData.sunday.maxStaff || ''}
                            onChange={e => setFormData({
                              ...formData,
                              sunday: {
                                ...formData.sunday,
                                maxStaff: e.target.value ? parseInt(e.target.value) : null
                              }
                            })}
                            placeholder="No limit"
                            className="w-32 px-3 py-2 border border-gray-200 rounded-lg"
                          />
                          <span className="text-sm text-gray-500">employees max</span>
                          {formData.sunday.maxStaff && (
                            <button
                              type="button"
                              onClick={() => setFormData({
                                ...formData,
                                sunday: { ...formData.sunday, maxStaff: null }
                              })}
                              className="text-sm text-gray-400 hover:text-gray-600"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Custom Sunday Hours */}
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <div className="font-medium text-gray-900">Custom Sunday Hours</div>
                            <div className="text-sm text-gray-500">
                              Different operating hours on Sunday (e.g., 08:00-13:00)
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setFormData({
                              ...formData,
                              sunday: {
                                ...formData.sunday,
                                customHours: {
                                  ...(formData.sunday.customHours || { openTime: '08:00', closeTime: '13:00' }),
                                  enabled: !formData.sunday.customHours?.enabled
                                }
                              }
                            })}
                            className={`p-2 rounded-lg transition-colors ${
                              formData.sunday.customHours?.enabled ? 'text-blue-600' : 'text-gray-400'
                            }`}
                          >
                            {formData.sunday.customHours?.enabled ? (
                              <ToggleRight className="w-8 h-8" />
                            ) : (
                              <ToggleLeft className="w-8 h-8" />
                            )}
                          </button>
                        </div>

                        {formData.sunday.customHours?.enabled && (
                          <div className="flex items-center gap-4 mt-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Open</label>
                              <input
                                type="time"
                                value={formData.sunday.customHours.openTime}
                                onChange={e => setFormData({
                                  ...formData,
                                  sunday: {
                                    ...formData.sunday,
                                    customHours: {
                                      ...formData.sunday.customHours!,
                                      openTime: e.target.value
                                    }
                                  }
                                })}
                                className="px-3 py-2 border border-gray-200 rounded-lg"
                              />
                            </div>
                            <span className="text-gray-400 mt-5">to</span>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Close</label>
                              <input
                                type="time"
                                value={formData.sunday.customHours.closeTime}
                                onChange={e => setFormData({
                                  ...formData,
                                  sunday: {
                                    ...formData.sunday,
                                    customHours: {
                                      ...formData.sunday.customHours!,
                                      closeTime: e.target.value
                                    }
                                  }
                                })}
                                className="px-3 py-2 border border-gray-200 rounded-lg"
                              />
                            </div>
                          </div>
                        )}
                        {errors.sundayHours && (
                          <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                            <AlertCircle className="w-4 h-4" />
                            {errors.sundayHours}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Hour Trimming Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-lg font-medium text-gray-900">
                    <Scissors className="w-5 h-5 text-purple-500" />
                    Hour Trimming
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div className="text-sm text-purple-800">
                        <p className="font-medium mb-1">What is hour trimming?</p>
                        <p>When multiple staff are scheduled for the same shift, some can work shorter hours 
                        to reduce overtime while maintaining coverage. For example, with 4 morning staff, 
                        2 might work 6:30-14:30 (standard) while 2 work 7:30-12:00 (trimmed).</p>
                      </div>
                    </div>
                  </div>

                  {/* Enable Trimming */}
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                    <div>
                      <div className="font-medium text-gray-900">Enable Hour Trimming</div>
                      <div className="text-sm text-gray-500">
                        Allow shorter shifts when multiple staff are scheduled
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData({
                        ...formData,
                        trimming: { ...formData.trimming, enabled: !formData.trimming.enabled }
                      })}
                      className={`p-2 rounded-lg transition-colors ${
                        formData.trimming.enabled ? 'text-purple-600' : 'text-gray-400'
                      }`}
                    >
                      {formData.trimming.enabled ? (
                        <ToggleRight className="w-8 h-8" />
                      ) : (
                        <ToggleLeft className="w-8 h-8" />
                      )}
                    </button>
                  </div>

                  {formData.trimming.enabled && (
                    <>
                      {/* Trim AM/PM toggles */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded-xl border-2 transition-colors ${
                          formData.trimming.trimAM 
                            ? 'bg-orange-50 border-orange-300' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.trimming.trimAM}
                              onChange={e => setFormData({
                                ...formData,
                                trimming: { ...formData.trimming, trimAM: e.target.checked }
                              })}
                              className="w-5 h-5 text-orange-600 rounded"
                            />
                            <div>
                              <div className="font-medium text-gray-900">Trim AM Shifts</div>
                              <div className="text-sm text-gray-500">Morning shifts can be shortened</div>
                            </div>
                          </label>
                        </div>

                        <div className={`p-4 rounded-xl border-2 transition-colors ${
                          formData.trimming.trimPM 
                            ? 'bg-indigo-50 border-indigo-300' 
                            : 'bg-gray-50 border-gray-200'
                        }`}>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={formData.trimming.trimPM}
                              onChange={e => setFormData({
                                ...formData,
                                trimming: { ...formData.trimming, trimPM: e.target.checked }
                              })}
                              className="w-5 h-5 text-indigo-600 rounded"
                            />
                            <div>
                              <div className="font-medium text-gray-900">Trim PM Shifts</div>
                              <div className="text-sm text-gray-500">Afternoon shifts can be shortened</div>
                            </div>
                          </label>
                        </div>
                      </div>

                      {/* Trimming Parameters */}
                      <div className="p-4 bg-gray-50 rounded-xl space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Trim from Start (hours)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="2"
                              step="0.5"
                              value={formData.trimming.trimFromStart}
                              onChange={e => setFormData({
                                ...formData,
                                trimming: { ...formData.trimming, trimFromStart: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Start shift later (e.g., 6:30 → 7:30)
                            </p>
                            {errors.trimFromStart && (
                              <p className="text-xs text-red-500 mt-1">{errors.trimFromStart}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Trim from End (hours)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="3"
                              step="0.5"
                              value={formData.trimming.trimFromEnd}
                              onChange={e => setFormData({
                                ...formData,
                                trimming: { ...formData.trimming, trimFromEnd: parseFloat(e.target.value) || 0 }
                              })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              End shift earlier (e.g., 14:30 → 12:00)
                            </p>
                            {errors.trimFromEnd && (
                              <p className="text-xs text-red-500 mt-1">{errors.trimFromEnd}</p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Minimum Shift Hours
                            </label>
                            <input
                              type="number"
                              min="3"
                              max="6"
                              step="0.5"
                              value={formData.trimming.minShiftHours}
                              onChange={e => setFormData({
                                ...formData,
                                trimming: { ...formData.trimming, minShiftHours: parseFloat(e.target.value) || 4 }
                              })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Shortest allowed trimmed shift
                            </p>
                            {errors.minShiftHours && (
                              <p className="text-xs text-red-500 mt-1">{errors.minShiftHours}</p>
                            )}
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Trim When More Than
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={formData.trimming.trimWhenMoreThan}
                              onChange={e => setFormData({
                                ...formData,
                                trimming: { ...formData.trimming, trimWhenMoreThan: parseInt(e.target.value) || 2 }
                              })}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                              Start trimming when staff count exceeds this
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Preview */}
                      {trimPreview && (
                        <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-200">
                          <div className="flex items-center gap-2 mb-3">
                            <Eye className="w-4 h-4 text-purple-600" />
                            <span className="font-medium text-purple-900">Shift Preview</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <div className="text-xs text-gray-500 mb-1">Standard AM Shift</div>
                              <div className="font-mono text-lg">
                                {trimPreview.standard.start} - {trimPreview.standard.end}
                              </div>
                              <div className="text-sm text-gray-600">
                                {trimPreview.standard.hours} hours
                              </div>
                            </div>
                            <div className="bg-white rounded-lg p-3 border border-purple-300">
                              <div className="text-xs text-purple-600 mb-1">Trimmed AM Shift</div>
                              <div className="font-mono text-lg text-purple-700">
                                {trimPreview.trimmed.start} - {trimPreview.trimmed.end}
                              </div>
                              <div className="text-sm text-purple-600">
                                {trimPreview.trimmed.hours} hours
                                <span className="ml-2 text-green-600">
                                  (saves {(parseFloat(trimPreview.standard.hours) - parseFloat(trimPreview.trimmed.hours)).toFixed(1)}h)
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              {shop ? 'Save Changes' : 'Create Shop'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main ShopsView Component
const ShopsView: React.FC<ShopsViewProps> = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'all' | ShopCompany>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Fetch shops
  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/shops');
      if (!response.ok) throw new Error('Failed to fetch shops');
      const data = await response.json();
      setShops(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveShop = async (shopData: Partial<Shop>) => {
    try {
      const url = shopData.id
        ? `http://localhost:3001/api/shops/${shopData.id}`
        : 'http://localhost:3001/api/shops';

      const response = await fetch(url, {
        method: shopData.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shopData)
      });

      if (!response.ok) throw new Error('Failed to save shop');

      await fetchShops();
      setEditingShop(null);
      setShowAddModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to save shop');
    }
  };

  const handleDeleteShop = async (shopId: number) => {
    if (!confirm('Are you sure you want to delete this shop?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/shops/${shopId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete shop');
      await fetchShops();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete shop');
    }
  };

  const handleToggleActive = async (shop: Shop) => {
    try {
      const response = await fetch(`http://localhost:3001/api/shops/${shop.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...shop, isActive: !shop.isActive })
      });

      if (!response.ok) throw new Error('Failed to update shop');
      await fetchShops();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update shop');
    }
  };

  // Filtered shops
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.address?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = companyFilter === 'all' || shop.company === companyFilter;
      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && shop.isActive) ||
        (statusFilter === 'inactive' && !shop.isActive);
      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [shops, searchTerm, companyFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: shops.length,
    active: shops.filter(s => s.isActive).length,
    inactive: shops.filter(s => !s.isActive).length,
    cmz: shops.filter(s => s.company === 'CMZ').length,
    cs: shops.filter(s => s.company === 'CS').length
  }), [shops]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-gray-600">{error}</p>
        <button
          onClick={fetchShops}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
          <p className="text-gray-500">Manage shop locations and staffing requirements</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Shop
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Shops</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-400">{stats.inactive}</div>
          <div className="text-sm text-gray-500">Inactive</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.cmz}</div>
          <div className="text-sm text-gray-500">Caffe Mazzo</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-emerald-600">{stats.cs}</div>
          <div className="text-sm text-gray-500">Coffee & Shots</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search shops..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={companyFilter}
          onChange={e => setCompanyFilter(e.target.value as 'all' | ShopCompany)}
          className="px-4 py-2 border border-gray-200 rounded-lg"
        >
          <option value="all">All Companies</option>
          <option value="CMZ">Caffe Mazzo</option>
          <option value="CS">Coffee & Shots</option>
        </select>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-4 py-2 border border-gray-200 rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Shops Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredShops.map(shop => (
          <div
            key={shop.id}
            className={`bg-white rounded-xl border ${
              shop.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
            } overflow-hidden hover:shadow-lg transition-shadow`}
          >
            {/* Card Header */}
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${
                    shop.company === 'CMZ' ? 'bg-blue-100' : 'bg-emerald-100'
                  }`}>
                    <Store className={`w-5 h-5 ${
                      shop.company === 'CMZ' ? 'text-blue-600' : 'text-emerald-600'
                    }`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                    <span className={`inline-block px-2 py-0.5 text-xs rounded-full ${
                      shop.company === 'CMZ'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {shop.company === 'CMZ' ? 'Caffe Mazzo' : 'Coffee & Shots'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(shop)}
                  className={`p-1 rounded-lg transition-colors ${
                    shop.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={shop.isActive ? 'Active - Click to deactivate' : 'Inactive - Click to activate'}
                >
                  {shop.isActive ? (
                    <ToggleRight className="w-6 h-6" />
                  ) : (
                    <ToggleLeft className="w-6 h-6" />
                  )}
                </button>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4 space-y-3">
              {shop.address && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  {shop.address}
                </div>
              )}
              {shop.phone && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Phone className="w-4 h-4 text-gray-400" />
                  {shop.phone}
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="w-4 h-4 text-gray-400" />
                {shop.openTime || '06:30'} - {shop.closeTime || '21:30'}
              </div>

              {/* Quick Stats */}
              <div className="flex gap-4 pt-2">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {shop.assignedEmployees?.length || 0}
                  </div>
                  <div className="text-xs text-gray-500">Assigned</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900">
                    {shop.requirements?.reduce((sum, r) => sum + (r.amStaff || 0) + (r.pmStaff || 0), 0) || 0}
                  </div>
                  <div className="text-xs text-gray-500">Weekly Shifts</div>
                </div>
                {shop.canBeSolo && (
                  <div className="text-center">
                    <div className="text-lg font-semibold text-amber-600">Solo</div>
                    <div className="text-xs text-gray-500">Capable</div>
                  </div>
                )}
              </div>

              {/* Scheduling indicators */}
              <div className="flex flex-wrap gap-2 pt-2">
                {shop.trimming?.enabled && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                    <Scissors className="w-3 h-3" />
                    Trimming
                  </span>
                )}
                {shop.sunday?.closed && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                    <Sun className="w-3 h-3" />
                    Closed Sun
                  </span>
                )}
                {shop.sunday?.maxStaff && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full">
                    <Sun className="w-3 h-3" />
                    Sun Max: {shop.sunday.maxStaff}
                  </span>
                )}
              </div>
            </div>

            {/* Card Actions */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button
                onClick={() => setEditingShop(shop)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={() => handleDeleteShop(shop.id)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredShops.length === 0 && (
        <div className="text-center py-12">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No shops found</p>
          <p className="text-sm text-gray-500">Try adjusting your filters or add a new shop</p>
        </div>
      )}

      {/* Modals */}
      {(showAddModal || editingShop) && (
        <ShopFormModal
          shop={editingShop}
          onClose={() => {
            setShowAddModal(false);
            setEditingShop(null);
          }}
          onSave={handleSaveShop}
          existingShops={shops}
        />
      )}
    </div>
  );
};

export default ShopsView;
