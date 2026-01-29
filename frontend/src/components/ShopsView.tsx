// frontend/src/components/ShopsView.tsx
import { useState, useEffect, useMemo } from 'react';
import { 
  Store, Plus, Search, Edit2, Trash2, Clock,
  ChevronDown, ChevronUp, Users, Filter, ToggleLeft, ToggleRight,
  AlertCircle, Save
} from 'lucide-react';
import type { 
  Shop, SpecialShift, TrimmingConfig, SundayConfig,
  ShopDayRequirement, StaffingConfig, ShopsViewProps
} from '../types';
import { 
  DEFAULT_SHOP_REQUIREMENTS, DEFAULT_TRIMMING_CONFIG,
  DEFAULT_SUNDAY_CONFIG, DEFAULT_STAFFING_CONFIG
} from '../types';
import { GlassCard, Badge, Modal, FormInput, FormSelect, ConfirmDialog } from './ui';
import StaffingConfigPanel from './StaffingConfigPanel';

const API_BASE_URL = 'http://localhost:3001/api';

interface ShopFormData {
  name: string;
  address: string;
  phone: string;
  company: 'CS' | 'CMZ' | 'Both';
  openTime: string;
  closeTime: string;
  isActive: boolean;
  requirements: ShopDayRequirement[];
  minStaffAtOpen: number;
  minStaffMidday: number;
  minStaffAtClose: number;
  canBeSolo: boolean;
  specialShifts: SpecialShift[];
  trimming: TrimmingConfig;
  sunday: SundayConfig;
  staffingConfig: StaffingConfig;
}

const getDefaultFormData = (): ShopFormData => ({
  name: '',
  address: '',
  phone: '',
  company: 'CS',
  openTime: '06:30',
  closeTime: '21:30',
  isActive: true,
  requirements: DEFAULT_SHOP_REQUIREMENTS,
  minStaffAtOpen: 1,
  minStaffMidday: 1,
  minStaffAtClose: 1,
  canBeSolo: false,
  specialShifts: [],
  trimming: DEFAULT_TRIMMING_CONFIG,
  sunday: DEFAULT_SUNDAY_CONFIG,
  staffingConfig: DEFAULT_STAFFING_CONFIG
});

// ============== SHOP FORM MODAL ==============

interface ShopFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shop: Partial<Shop>) => Promise<void>;
  shop: Shop | null;
  existingShopNames: string[];
}

function ShopFormModal({ isOpen, onClose, onSave, shop, existingShopNames }: ShopFormModalProps) {
  const [formData, setFormData] = useState<ShopFormData>(getDefaultFormData());
  const [activeTab, setActiveTab] = useState<'basic' | 'staffing' | 'special' | 'rules'>('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (shop) {
        setFormData({
          name: shop.name || '',
          address: shop.address || '',
          phone: shop.phone || '',
          company: shop.company || 'CS',
          openTime: shop.openTime || '06:30',
          closeTime: shop.closeTime || '21:30',
          isActive: shop.isActive !== false,
          requirements: shop.requirements?.length ? shop.requirements : DEFAULT_SHOP_REQUIREMENTS,
          minStaffAtOpen: shop.minStaffAtOpen ?? 1,
          minStaffMidday: shop.minStaffMidday ?? 1,
          minStaffAtClose: shop.minStaffAtClose ?? 1,
          canBeSolo: shop.canBeSolo ?? false,
          specialShifts: shop.specialShifts || [],
          trimming: shop.trimming || DEFAULT_TRIMMING_CONFIG,
          sunday: shop.sunday || DEFAULT_SUNDAY_CONFIG,
          staffingConfig: shop.staffingConfig || DEFAULT_STAFFING_CONFIG
        });
      } else {
        setFormData(getDefaultFormData());
      }
      setActiveTab('basic');
      setErrors({});
    }
  }, [isOpen, shop]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Shop name is required';
    } else if (!shop && existingShopNames.some(n => n.toLowerCase() === formData.name.toLowerCase())) {
      newErrors.name = 'A shop with this name already exists';
    }
    
    if (formData.openTime >= formData.closeTime) {
      newErrors.hours = 'Close time must be after open time';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    
    setSaving(true);
    try {
      await onSave({
        ...(shop?.id ? { id: shop.id } : {}),
        name: formData.name.trim(),
        address: formData.address.trim(),
        phone: formData.phone.trim(),
        company: formData.company,
        openTime: formData.openTime,
        closeTime: formData.closeTime,
        isActive: formData.isActive,
        requirements: formData.requirements,
        minStaffAtOpen: formData.minStaffAtOpen,
        minStaffMidday: formData.minStaffMidday,
        minStaffAtClose: formData.minStaffAtClose,
        canBeSolo: formData.canBeSolo,
        specialShifts: formData.specialShifts,
        trimming: formData.trimming,
        sunday: formData.sunday,
        staffingConfig: formData.staffingConfig
      });
      onClose();
    } catch (error) {
      console.error('Error saving shop:', error);
      setErrors({ submit: 'Failed to save shop. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const addSpecialShift = () => {
    const newShift: SpecialShift = {
      id: `ss-${Date.now()}`,
      day: 'Mon',
      startTime: formData.openTime,
      endTime: formData.closeTime,
      notes: ''
    };
    setFormData(prev => ({
      ...prev,
      specialShifts: [...prev.specialShifts, newShift]
    }));
  };

  const updateSpecialShift = (index: number, field: keyof SpecialShift, value: string) => {
    setFormData(prev => {
      const newShifts = [...prev.specialShifts];
      newShifts[index] = { ...newShifts[index], [field]: value };
      return { ...prev, specialShifts: newShifts };
    });
  };

  const removeSpecialShift = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialShifts: prev.specialShifts.filter((_, i) => i !== index)
    }));
  };

  const tabs = [
    { id: 'basic', label: 'Basic Info' },
    { id: 'staffing', label: 'Staffing' },
    { id: 'special', label: 'Special Shifts' },
    { id: 'rules', label: 'Rules' }
  ] as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={shop ? `Edit ${shop.name}` : 'Add New Shop'}
      size="lg"
    >
      <div className="space-y-4">
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {/* Basic Info Tab */}
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FormInput
                    label="Shop Name"
                    value={formData.name}
                    onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                    error={errors.name}
                    placeholder="e.g., Hamrun"
                    required
                  />
                </div>
                
                <FormInput
                  label="Address"
                  value={formData.address}
                  onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
                  placeholder="Shop address"
                />
                
                <FormInput
                  label="Phone"
                  value={formData.phone}
                  onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  placeholder="+356 1234 5678"
                />
                
                <FormSelect
                  label="Company"
                  value={formData.company}
                  onChange={(value) => setFormData(prev => ({ ...prev, company: value as 'CS' | 'CMZ' | 'Both' }))}
                  options={[
                    { value: 'CS', label: 'CS' },
                    { value: 'CMZ', label: 'CMZ' },
                    { value: 'Both', label: 'Both' }
                  ]}
                />
                
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Active</label>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.isActive ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormInput
                  label="Opening Time"
                  type="time"
                  value={formData.openTime}
                  onChange={(value) => setFormData(prev => ({ ...prev, openTime: value }))}
                />
                <FormInput
                  label="Closing Time"
                  type="time"
                  value={formData.closeTime}
                  onChange={(value) => setFormData(prev => ({ ...prev, closeTime: value }))}
                />
              </div>
              {errors.hours && (
                <p className="text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  {errors.hours}
                </p>
              )}

              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="canBeSolo"
                  checked={formData.canBeSolo}
                  onChange={(e) => setFormData(prev => ({ ...prev, canBeSolo: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600"
                />
                <label htmlFor="canBeSolo" className="text-sm text-gray-700">
                  Solo shop (can operate with 1 person on full-day shifts)
                </label>
              </div>
            </div>
          )}

          {/* Staffing Tab */}
          {activeTab === 'staffing' && (
            <StaffingConfigPanel
              config={formData.staffingConfig}
              onChange={(config) => setFormData(prev => ({ ...prev, staffingConfig: config }))}
              openTime={formData.openTime}
              closeTime={formData.closeTime}
            />
          )}

          {/* Special Shifts Tab */}
          {activeTab === 'special' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Define special shift patterns for specific days
                </p>
                <button
                  type="button"
                  onClick={addSpecialShift}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  <Plus className="w-4 h-4" />
                  Add Shift
                </button>
              </div>

              {formData.specialShifts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No special shifts defined</p>
                  <p className="text-sm">Click "Add Shift" to create custom shift patterns</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.specialShifts.map((shift, index) => (
                    <div key={shift.id || index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <select
                        value={shift.day || 'Mon'}
                        onChange={(e) => updateSpecialShift(index, 'day', e.target.value)}
                        className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                      >
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                      <input
                        type="time"
                        value={shift.startTime || formData.openTime}
                        onChange={(e) => updateSpecialShift(index, 'startTime', e.target.value)}
                        className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-gray-400">to</span>
                      <input
                        type="time"
                        value={shift.endTime || formData.closeTime}
                        onChange={(e) => updateSpecialShift(index, 'endTime', e.target.value)}
                        className="px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                      <input
                        type="text"
                        value={shift.notes || ''}
                        onChange={(e) => updateSpecialShift(index, 'notes', e.target.value)}
                        placeholder="Notes"
                        className="flex-1 px-2 py-1.5 border border-gray-300 rounded text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecialShift(index)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rules Tab */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              {/* Trimming */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Hour Trimming</h4>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      trimming: { ...prev.trimming, enabled: !prev.trimming.enabled }
                    }))}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      formData.trimming.enabled ? 'bg-blue-500' : 'bg-gray-300'
                    }`}
                  >
                    <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      formData.trimming.enabled ? 'left-7' : 'left-1'
                    }`} />
                  </button>
                </div>
                
                {formData.trimming.enabled && (
                  <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <label className="text-xs text-gray-600">Trim from start (hours)</label>
                      <input
                        type="number"
                        min={0}
                        max={4}
                        step={0.5}
                        value={formData.trimming.trimFromStart}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          trimming: { ...prev.trimming, trimFromStart: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Trim from end (hours)</label>
                      <input
                        type="number"
                        min={0}
                        max={4}
                        step={0.5}
                        value={formData.trimming.trimFromEnd}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          trimming: { ...prev.trimming, trimFromEnd: parseFloat(e.target.value) || 0 }
                        }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Min shift hours after trim</label>
                      <input
                        type="number"
                        min={2}
                        max={8}
                        value={formData.trimming.minShiftHours}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          trimming: { ...prev.trimming, minShiftHours: parseInt(e.target.value) || 4 }
                        }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Trim when more than (staff)</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={formData.trimming.trimWhenMoreThan}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          trimming: { ...prev.trimming, trimWhenMoreThan: parseInt(e.target.value) || 2 }
                        }))}
                        className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div className="col-span-2 flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.trimming.trimAM}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            trimming: { ...prev.trimming, trimAM: e.target.checked }
                          }))}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm">Trim AM shifts</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.trimming.trimPM}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            trimming: { ...prev.trimming, trimPM: e.target.checked }
                          }))}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm">Trim PM shifts</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Sunday Rules */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">Sunday Rules</h4>
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.sunday.closed}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        sunday: { ...prev.sunday, closed: e.target.checked }
                      }))}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                    <span className="text-sm">Closed on Sundays</span>
                  </label>
                  
                  {!formData.sunday.closed && (
                    <>
                      <div>
                        <label className="text-xs text-gray-600">Max staff on Sunday</label>
                        <input
                          type="number"
                          min={0}
                          max={10}
                          value={formData.sunday.maxStaff ?? ''}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            sunday: { 
                              ...prev.sunday, 
                              maxStaff: e.target.value ? parseInt(e.target.value) : null 
                            }
                          }))}
                          placeholder="No limit"
                          className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                      
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={formData.sunday.customHours?.enabled ?? false}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            sunday: {
                              ...prev.sunday,
                              customHours: {
                                enabled: e.target.checked,
                                openTime: prev.sunday.customHours?.openTime || '08:00',
                                closeTime: prev.sunday.customHours?.closeTime || '13:00'
                              }
                            }
                          }))}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                        <span className="text-sm">Custom Sunday hours</span>
                      </label>
                      
                      {formData.sunday.customHours?.enabled && (
                        <div className="grid grid-cols-2 gap-4 pl-6">
                          <div>
                            <label className="text-xs text-gray-600">Open</label>
                            <input
                              type="time"
                              value={formData.sunday.customHours?.openTime || '08:00'}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                sunday: {
                                  ...prev.sunday,
                                  customHours: {
                                    enabled: true,
                                    openTime: e.target.value,
                                    closeTime: prev.sunday.customHours?.closeTime || '13:00'
                                  }
                                }
                              }))}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-600">Close</label>
                            <input
                              type="time"
                              value={formData.sunday.customHours?.closeTime || '13:00'}
                              onChange={(e) => setFormData(prev => ({
                                ...prev,
                                sunday: {
                                  ...prev.sunday,
                                  customHours: {
                                    enabled: true,
                                    openTime: prev.sunday.customHours?.openTime || '08:00',
                                    closeTime: e.target.value
                                  }
                                }
                              }))}
                              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg"
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errors.submit}
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Shop
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ============== MAIN SHOPS VIEW ==============

export default function ShopsView({ shops: propShops, setShops: propSetShops }: ShopsViewProps) {
  const [shops, setShops] = useState<Shop[]>(propShops || []);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'all' | 'CS' | 'CMZ'>('all');
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Shop | null>(null);
  const [expandedShop, setExpandedShop] = useState<number | null>(null);

  const fetchShops = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/shops`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (response.ok) {
        const data = await response.json();
        setShops(data);
        if (propSetShops) propSetShops(data);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  useEffect(() => {
    if (propShops && propShops.length > 0) {
      setShops(propShops);
      setLoading(false);
    }
  }, [propShops]);

  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCompany = companyFilter === 'all' || shop.company === companyFilter;
      const matchesActive = showInactive || shop.isActive !== false;
      return matchesSearch && matchesCompany && matchesActive;
    });
  }, [shops, searchTerm, companyFilter, showInactive]);

  const existingShopNames = useMemo(() => 
    shops.filter(s => s.id !== editingShop?.id).map(s => s.name),
    [shops, editingShop]
  );

  const handleSaveShop = async (shopData: Partial<Shop>) => {
    const isNew = !shopData.id;
    const url = isNew ? `${API_BASE_URL}/shops` : `${API_BASE_URL}/shops/${shopData.id}`;
    const method = isNew ? 'POST' : 'PATCH';

    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shopData)
    });

    if (!response.ok) {
      throw new Error('Failed to save shop');
    }

    await fetchShops();
  };

  const handleDeleteShop = async (shop: Shop) => {
    try {
      const response = await fetch(`${API_BASE_URL}/shops/${shop.id}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchShops();
      }
    } catch (error) {
      console.error('Error deleting shop:', error);
    }
    setDeleteConfirm(null);
  };

  const handleToggleActive = async (shop: Shop) => {
    try {
      await fetch(`${API_BASE_URL}/shops/${shop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !shop.isActive })
      });
      await fetchShops();
    } catch (error) {
      console.error('Error toggling shop status:', error);
    }
  };

  const openEditModal = (shop: Shop) => {
    setEditingShop(shop);
    setIsModalOpen(true);
  };

  const openNewModal = () => {
    setEditingShop(null);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
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
          onClick={openNewModal}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-5 h-5" />
          Add Shop
        </button>
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search shops..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value as 'all' | 'CS' | 'CMZ')}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Companies</option>
              <option value="CS">CS</option>
              <option value="CMZ">CMZ</option>
            </select>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-blue-600"
            />
            <span className="text-sm text-gray-600">Show inactive</span>
          </label>
        </div>
      </GlassCard>

      {/* Shop List */}
      <div className="grid gap-4">
        {filteredShops.length === 0 ? (
          <GlassCard className="p-8 text-center">
            <Store className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900">No shops found</h3>
            <p className="text-gray-500 mt-1">
              {searchTerm || companyFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Get started by adding your first shop'}
            </p>
          </GlassCard>
        ) : (
          filteredShops.map(shop => (
            <GlassCard
              key={shop.id}
              className={`overflow-hidden transition-all ${!shop.isActive ? 'opacity-60' : ''}`}
            >
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      shop.company === 'CMZ' ? 'bg-purple-100' : 'bg-blue-100'
                    }`}>
                      <Store className={`w-6 h-6 ${
                        shop.company === 'CMZ' ? 'text-purple-600' : 'text-blue-600'
                      }`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{shop.name}</h3>
                        <Badge variant={shop.company === 'CMZ' ? 'purple' : 'info'}>
                          {shop.company}
                        </Badge>
                        {!shop.isActive && (
                          <Badge variant="default">Inactive</Badge>
                        )}
                        {shop.canBeSolo && (
                          <Badge variant="warning">Solo</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {shop.openTime} - {shop.closeTime}
                        </span>
                        {shop.staffingConfig && (
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {shop.staffingConfig.coverageMode}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(shop)}
                      className={`p-2 rounded-lg transition-colors ${
                        shop.isActive
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-gray-400 hover:bg-gray-100'
                      }`}
                      title={shop.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {shop.isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>
                    <button
                      onClick={() => openEditModal(shop)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Edit"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(shop)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setExpandedShop(expandedShop === shop.id ? null : shop.id)}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"
                    >
                      {expandedShop === shop.id ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedShop === shop.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {shop.address && (
                        <div>
                          <span className="text-gray-500">Address:</span>
                          <p className="font-medium">{shop.address}</p>
                        </div>
                      )}
                      {shop.phone && (
                        <div>
                          <span className="text-gray-500">Phone:</span>
                          <p className="font-medium">{shop.phone}</p>
                        </div>
                      )}
                      {shop.staffingConfig && (
                        <div>
                          <span className="text-gray-500">Coverage Mode:</span>
                          <p className="font-medium capitalize">{shop.staffingConfig.coverageMode}</p>
                        </div>
                      )}
                      {shop.sunday?.closed && (
                        <div>
                          <span className="text-gray-500">Sunday:</span>
                          <p className="font-medium text-red-600">Closed</p>
                        </div>
                      )}
                    </div>

                    {/* Staffing Schedule Preview */}
                    {shop.staffingConfig?.weeklySchedule && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Weekly Schedule</h4>
                        <div className="grid grid-cols-7 gap-2">
                          {shop.staffingConfig.weeklySchedule.map((day) => (
                            <div key={day.day} className="text-center p-2 bg-gray-50 rounded">
                              <div className="text-xs font-medium text-gray-600">{day.day}</div>
                              <div className="text-xs mt-1">
                                <span className="text-blue-600">{day.targetAM ?? day.minAM}</span>
                                <span className="text-gray-400">/</span>
                                <span className="text-purple-600">{day.targetPM ?? day.minPM}</span>
                              </div>
                              <div className="text-[10px] text-gray-400">
                                min: {day.minAM}/{day.minPM}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </GlassCard>
          ))
        )}
      </div>

      {/* Shop Form Modal */}
      <ShopFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingShop(null);
        }}
        onSave={handleSaveShop}
        shop={editingShop}
        existingShopNames={existingShopNames}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteShop(deleteConfirm)}
        title="Delete Shop"
        message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone.`}
      />
    </div>
  );
}
