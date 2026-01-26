// frontend/src/components/ShopsView.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  X,
  ToggleLeft,
  ToggleRight,
  AlertCircle,
  Sun,
  Scissors,
  Settings,
  Eye,
  Info,
  RefreshCw
} from 'lucide-react';
import type {
  Shop,
  ShopCompany,
  SpecialShift,
  TrimmingConfig,
  SundayConfig,
  DayOfWeek,
  Employee,
  StaffingConfig
} from '../types';
import {
  DAYS_OF_WEEK,
  DEFAULT_TRIMMING_CONFIG,
  DEFAULT_SUNDAY_CONFIG,
  DEFAULT_STAFFING_CONFIG
} from '../types';
import StaffingConfigPanel from './StaffingConfigPanel';

const API_BASE_URL = 'http://localhost:3001/api';

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
    minStaffAtOpen: number;
    minStaffAtClose: number;
    canBeSolo: boolean;
    specialShifts: SpecialShift[];
    trimming: TrimmingConfig;
    sunday: SundayConfig;
    staffingConfig: StaffingConfig;
  }>({
    name: '',
    address: '',
    phone: '',
    company: 'CMZ',
    openTime: '06:30',
    closeTime: '21:30',
    isActive: true,
    minStaffAtOpen: 1,
    minStaffAtClose: 1,
    canBeSolo: false,
    specialShifts: [],
    trimming: { ...DEFAULT_TRIMMING_CONFIG },
    sunday: JSON.parse(JSON.stringify(DEFAULT_SUNDAY_CONFIG)),
    staffingConfig: JSON.parse(JSON.stringify(DEFAULT_STAFFING_CONFIG))
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
        minStaffAtOpen: shop.minStaffAtOpen ?? 1,
        minStaffAtClose: shop.minStaffAtClose ?? 1,
        canBeSolo: shop.canBeSolo ?? false,
        specialShifts: Array.isArray(shop.specialShifts) ? shop.specialShifts : [],
        trimming: shop.trimming ? { ...DEFAULT_TRIMMING_CONFIG, ...shop.trimming } : { ...DEFAULT_TRIMMING_CONFIG },
        sunday: shop.sunday ? { ...DEFAULT_SUNDAY_CONFIG, ...shop.sunday } : JSON.parse(JSON.stringify(DEFAULT_SUNDAY_CONFIG)),
        staffingConfig: shop.staffingConfig 
          ? { ...DEFAULT_STAFFING_CONFIG, ...shop.staffingConfig }
          : JSON.parse(JSON.stringify(DEFAULT_STAFFING_CONFIG))
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

  // Calculate trimmed shift preview
  const trimPreview = useMemo(() => {
    if (!formData.trimming.enabled) return null;

    const openParts = formData.openTime.split(':').map(Number);
    const openMinutes = openParts[0] * 60 + openParts[1];

    const closeParts = formData.closeTime.split(':').map(Number);
    const closeMinutes = closeParts[0] * 60 + closeParts[1];

    const midpoint = Math.floor((openMinutes + closeMinutes) / 2);

    const standardAMStart = formData.openTime;
    const standardAMEndMinutes = midpoint + 30;
    const standardAMEnd = `${Math.floor(standardAMEndMinutes / 60).toString().padStart(2, '0')}:${(standardAMEndMinutes % 60).toString().padStart(2, '0')}`;

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
              { id: 'staffing', label: 'Staffing Config', icon: Users },
              { id: 'special', label: 'Special', icon: Clock },
              { id: 'rules', label: 'Rules', icon: Settings }
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

            {/* Staffing Config Tab */}
            {activeTab === 'staffing' && (
              <StaffingConfigPanel
                config={formData.staffingConfig}
                onChange={(newConfig) => setFormData(prev => ({ ...prev, staffingConfig: newConfig }))}
              />
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
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Rules Tab */}
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
                        to reduce overtime while maintaining coverage.</p>
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
const ShopsView: React.FC<ShopsViewProps> = ({
  shops: propShops,
  setShops: propSetShops,
}) => {
  const [shops, setShopsState] = useState<Shop[]>(propShops || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCompany, setFilterCompany] = useState<'all' | ShopCompany>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setShops = propSetShops || setShopsState;

  // Fetch shops from backend
  const fetchShops = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/shops`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error('Failed to fetch shops');
      }
      const data = await response.json();
      setShops(data);
    } catch (err) {
      console.error('Error fetching shops:', err);
      setError('Failed to load shops. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [setShops]);

  // Initial fetch
  useEffect(() => {
    if (!propShops || propShops.length === 0) {
      fetchShops();
    }
  }, [fetchShops, propShops]);

  // Sync with prop shops
  useEffect(() => {
    if (propShops) {
      setShopsState(propShops);
    }
  }, [propShops]);

  // Handle save shop
  const handleSaveShop = async (shopData: Partial<Shop>) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const isUpdate = !!shopData.id;
      const url = isUpdate 
        ? `${API_BASE_URL}/shops/${shopData.id}`
        : `${API_BASE_URL}/shops`;
      
      const method = isUpdate ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shopData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to ${isUpdate ? 'update' : 'create'} shop`);
      }

      await fetchShops();
      setShowModal(false);
      setEditingShop(null);
    } catch (err) {
      console.error('Error saving shop:', err);
      setError(err instanceof Error ? err.message : 'Failed to save shop');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle delete shop
  const handleDeleteShop = async (shopId: number) => {
    if (!window.confirm('Are you sure you want to delete this shop? This action cannot be undone.')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/shops/${shopId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete shop');
      }

      await fetchShops();
    } catch (err) {
      console.error('Error deleting shop:', err);
      setError('Failed to delete shop. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle toggle shop active status
  const handleToggleActive = async (shop: Shop) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/shops/${shop.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: !shop.isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update shop status');
      }

      await fetchShops();
    } catch (err) {
      console.error('Error toggling shop status:', err);
      setError('Failed to update shop status. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter shops
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        shop.address?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = filterCompany === 'all' || shop.company === filterCompany;
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'active' && shop.isActive) ||
        (filterStatus === 'inactive' && !shop.isActive);
      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [shops, searchTerm, filterCompany, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: shops.length,
    active: shops.filter(s => s.isActive).length,
    cmz: shops.filter(s => s.company === 'CMZ').length,
    cs: shops.filter(s => s.company === 'CS').length
  }), [shops]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shops</h1>
          <p className="text-gray-500">Manage your shop locations and staffing requirements</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchShops}
            disabled={isLoading}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh shops"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => {
              setEditingShop(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Add Shop
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <span className="text-red-700">{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-600 hover:text-red-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          <div className="text-sm text-gray-500">Total Shops</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-blue-600">{stats.cmz}</div>
          <div className="text-sm text-gray-500">CMZ</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <div className="text-2xl font-bold text-emerald-600">{stats.cs}</div>
          <div className="text-sm text-gray-500">CS</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search shops..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={filterCompany}
          onChange={e => setFilterCompany(e.target.value as 'all' | ShopCompany)}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Companies</option>
          <option value="CMZ">CMZ</option>
          <option value="CS">CS</option>
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as 'all' | 'active' | 'inactive')}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Shops Grid */}
      {isLoading && shops.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : filteredShops.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Store className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No shops found</h3>
          <p className="text-gray-500">
            {searchTerm || filterCompany !== 'all' || filterStatus !== 'all'
              ? 'Try adjusting your filters'
              : 'Get started by adding your first shop'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.map(shop => (
            <div
              key={shop.id}
              className={`bg-white rounded-xl border p-4 transition-all hover:shadow-md ${
                shop.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'
              }`}
            >
              {/* Shop Header */}
              <div className="flex items-start justify-between mb-3">
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
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      shop.company === 'CMZ' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {shop.company}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleToggleActive(shop)}
                  className={`p-1 rounded transition-colors ${
                    shop.isActive ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={shop.isActive ? 'Deactivate' : 'Activate'}
                >
                  {shop.isActive ? (
                    <ToggleRight className="w-6 h-6" />
                  ) : (
                    <ToggleLeft className="w-6 h-6" />
                  )}
                </button>
              </div>

              {/* Shop Details */}
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                {shop.address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{shop.address}</span>
                  </div>
                )}
                {shop.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{shop.phone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{shop.openTime} - {shop.closeTime}</span>
                </div>
                {shop.staffingConfig && (
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="capitalize">
                      {shop.staffingConfig.coverageMode === 'split' ? 'Split Shifts' :
                       shop.staffingConfig.coverageMode === 'fullDayOnly' ? 'Full Day Only' :
                       'Flexible'}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => {
                    setEditingShop(shop);
                    setShowModal(true);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteShop(shop.id)}
                  className="flex items-center justify-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ShopFormModal
          shop={editingShop}
          onClose={() => {
            setShowModal(false);
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
