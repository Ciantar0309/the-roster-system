// frontend/src/components/ShopsView.tsx
import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  Store, Plus, Edit2, Trash2, MapPin, Phone, Clock,
  Users, Check, Calendar, X, AlertCircle, Power
} from 'lucide-react';
import { 
  GlassCard, Badge, SearchInput, Modal, FormInput, 
  FormSelect, TabButton, StatCard, EmptyState,
  AnimatedButton, ToggleButtonGroup, ConfirmDialog, useDebounce
} from './ui';
import type { 
  Shop, Employee, DayOfWeek, ShopDayRequirement, 
  SpecialShiftRequest, SpecialShift, FixedDayOff, SpecialDayRule 
} from '../types';

// ============== TYPES ==============

interface ShopsViewProps {
  shops: Shop[];
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

const DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DEFAULT_REQUIREMENTS: ShopDayRequirement[] = DAYS.map(day => ({
  day,
  amStaff: 1,
  pmStaff: 1,
  allowFullDay: true,
  isMandatory: false
}));

// ============== MAIN COMPONENT ==============

const ShopsView = memo(function ShopsView({ 
  shops, 
  setShops, 
  employees,
  setEmployees 
}: ShopsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<'all' | 'CMZ' | 'CS'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Filter shops
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      const matchesSearch = shop.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCompany = companyFilter === 'all' || shop.company === companyFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && shop.isActive) || 
        (statusFilter === 'inactive' && !shop.isActive);
      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [shops, debouncedSearch, companyFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: shops.length,
    active: shops.filter(s => s.isActive).length,
    inactive: shops.filter(s => !s.isActive).length,
    cmz: shops.filter(s => s.company === 'CMZ').length,
    cs: shops.filter(s => s.company === 'CS').length,
  }), [shops]);

  // Toggle shop active status
  const toggleShopActive = useCallback(async (shop: Shop) => {
    const updatedShop = { ...shop, isActive: !shop.isActive };
    
    try {
      await fetch(`http://localhost:3001/api/shops/${shop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: updatedShop.isActive }),
      });
      console.log(`✅ Shop ${updatedShop.isActive ? 'activated' : 'deactivated'}:`, shop.name);
    } catch (err) {
      console.error('Failed to toggle shop status:', err);
    }
    
    setShops(prev => prev.map(s => 
      s.id === shop.id ? updatedShop : s
    ));
  }, [setShops]);

  // Handlers
  const handleSaveShop = useCallback(async (shopData: Partial<Shop>) => {
    if (selectedShop) {
      const updatedShop = { ...selectedShop, ...shopData };
      
      try {
        await fetch(`http://localhost:3001/api/shops/${selectedShop.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedShop),
        });
        console.log('✅ Shop updated:', updatedShop.name);
      } catch (err) {
        console.error('Failed to update shop:', err);
      }
      
      setShops(prev => prev.map(s => 
        s.id === selectedShop.id ? updatedShop : s
      ));
    } else {
      const newShop: Shop = {
        id: Date.now(),
        name: shopData.name || 'New Shop',
        company: shopData.company || 'CMZ',
        isActive: true,
        address: shopData.address || '',
        phone: shopData.phone || '',
        openTime: shopData.openTime || '06:00',
        closeTime: shopData.closeTime || '21:00',
        minStaffAtOpen: shopData.minStaffAtOpen || 1,
        minStaffMidday: shopData.minStaffMidday || 1,
        minStaffAtClose: shopData.minStaffAtClose || 1,
        canBeSolo: shopData.canBeSolo || false,
        requirements: shopData.requirements || DEFAULT_REQUIREMENTS,
        specialRequests: shopData.specialRequests || [],
        fixedDaysOff: shopData.fixedDaysOff || [],
        specialDayRules: shopData.specialDayRules || [],
        assignedEmployees: [],
        rules: shopData.rules || {},
      };
      
      try {
        const res = await fetch('http://localhost:3001/api/shops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newShop),
        });
        const saved = await res.json();
        if (saved.id) newShop.id = saved.id;
        console.log('✅ Shop created:', newShop.name);
      } catch (err) {
        console.error('Failed to create shop:', err);
      }
      
      setShops(prev => [...prev, newShop]);
    }
    
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedShop(null);
  }, [selectedShop, setShops]);

  const handleDeleteShop = useCallback(async () => {
    if (!selectedShop) return;
    
    try {
      await fetch(`http://localhost:3001/api/shops/${selectedShop.id}`, {
        method: 'DELETE',
      });
      console.log('✅ Shop deleted:', selectedShop.name);
    } catch (err) {
      console.error('Failed to delete shop:', err);
    }
    
    setShops(prev => prev.filter(s => s.id !== selectedShop.id));
    
    setEmployees(prev => prev.map(emp => ({
      ...emp,
      primaryShopId: emp.primaryShopId === selectedShop.id ? undefined : emp.primaryShopId,
      secondaryShopIds: (emp.secondaryShopIds || []).filter(id => id !== selectedShop.id),
    })));
    
    setShowDeleteConfirm(false);
    setSelectedShop(null);
  }, [selectedShop, setShops, setEmployees]);

  const getAssignedEmployeeCount = (shop: Shop) => {
    return employees.filter(e => 
      e.primaryShopId === shop.id || (e.secondaryShopIds || []).includes(shop.id)
    ).length;
  };

  const getTotalWeeklyHeadcount = (shop: Shop) => {
    if (!shop.requirements) return 0;
    return shop.requirements.reduce((total, req) => {
      return total + (req.amStaff || 0) + (req.pmStaff || 0);
    }, 0);
  };

  const getSpecialRequestsCount = (shop: Shop) => {
    const customShifts = shop.specialRequests?.reduce((sum, r) => sum + r.shifts.length, 0) || 0;
    const fixedOffs = shop.fixedDaysOff?.length || 0;
    const dayRules = shop.specialDayRules?.length || 0;
    return customShifts + fixedOffs + dayRules;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shop Management</h1>
          <p className="text-gray-600 mt-1">Manage shops, staffing requirements, and rules</p>
        </div>
        <AnimatedButton 
          icon={Plus} 
          onClick={() => {
            setSelectedShop(null);
            setShowAddModal(true);
          }}
        >
          Add Shop
        </AnimatedButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard icon={Store} label="Total Shops" value={stats.total} gradient="from-blue-500 to-blue-600" />
        <StatCard icon={Store} label="Active" value={stats.active} gradient="from-green-500 to-emerald-500" />
        <StatCard icon={Store} label="Inactive" value={stats.inactive} gradient="from-gray-400 to-gray-500" />
        <StatCard icon={Store} label="CMZ" value={stats.cmz} gradient="from-purple-500 to-purple-600" />
        <StatCard icon={Store} label="CS" value={stats.cs} gradient="from-orange-500 to-orange-600" />
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search shops..." />
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
          <ToggleButtonGroup
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </GlassCard>

      {/* Shop List */}
      {filteredShops.length === 0 ? (
        <EmptyState
          icon={Store}
          title="No shops found"
          description={searchTerm ? "Try adjusting your search" : "Add your first shop to get started"}
          action={
            <AnimatedButton icon={Plus} onClick={() => setShowAddModal(true)}>
              Add Shop
            </AnimatedButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredShops.map(shop => (
            <GlassCard 
              key={shop.id} 
              className={`p-4 ${!shop.isActive ? 'opacity-60 bg-gray-50' : ''}`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-lg">{shop.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={shop.company === 'CMZ' ? 'purple' : 'warning'}>
                      {shop.company}
                    </Badge>
                    <Badge variant={shop.isActive ? 'success' : 'default'}>
                      {shop.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                <button
                  onClick={() => toggleShopActive(shop)}
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    shop.isActive 
                      ? 'bg-green-100 text-green-600 hover:bg-green-200' 
                      : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                  }`}
                  title={shop.isActive ? 'Deactivate shop' : 'Activate shop'}
                >
                  <Power className="w-5 h-5" />
                </button>
              </div>

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
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" />
                  <span>{getAssignedEmployeeCount(shop)} employees assigned</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>{getTotalWeeklyHeadcount(shop)} shifts/week configured</span>
                </div>
                {getSpecialRequestsCount(shop) > 0 && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-600">{getSpecialRequestsCount(shop)} special requests</span>
                  </div>
                )}
              </div>

              {/* Staffing summary */}
              {shop.minStaffAtOpen !== undefined && (
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <span className="px-2 py-0.5 bg-gray-100 rounded">
                    Staff: {shop.minStaffAtOpen}-{shop.minStaffMidday}-{shop.minStaffAtClose}
                  </span>
                  {shop.canBeSolo && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded">Solo OK</span>
                  )}
                </div>
              )}

              {/* Rules indicators */}
              {shop.rules && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {shop.rules.sunday_closed && (
                    <Badge variant="danger">Sun Closed</Badge>
                  )}
                  {shop.rules.dayInDayOut && (
                    <Badge variant="info">Day-in/Day-out</Badge>
                  )}
                  {shop.rules.sundayMaxStaff && (
                    <Badge variant="warning">Sun Max: {shop.rules.sundayMaxStaff}</Badge>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-3 border-t border-gray-100">
                <AnimatedButton 
                  variant="ghost" 
                  size="sm" 
                  icon={Edit2} 
                  onClick={() => {
                    setSelectedShop(shop);
                    setShowEditModal(true);
                  }}
                >
                  Edit
                </AnimatedButton>
                <AnimatedButton 
                  variant="ghost" 
                  size="sm" 
                  icon={Calendar} 
                  onClick={() => {
                    setSelectedShop(shop);
                    setShowEditModal(true);
                  }}
                >
                  Staffing
                </AnimatedButton>
                <div className="flex-1" />
                <AnimatedButton 
                  variant="ghost" 
                  size="sm" 
                  icon={Trash2} 
                  onClick={() => {
                    setSelectedShop(shop);
                    setShowDeleteConfirm(true);
                  }}
                >
                  <span className="sr-only">Delete</span>
                </AnimatedButton>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Shop Form Modal */}
      <ShopFormModal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedShop(null);
        }}
        onSave={handleSaveShop}
        shop={selectedShop}
        employees={employees}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedShop(null);
        }}
        onConfirm={handleDeleteShop}
        title="Delete Shop"
        message={`Are you sure you want to delete "${selectedShop?.name}"? This will also remove all employee assignments to this shop.`}
        variant="danger"
        confirmLabel="Delete"
      />
    </div>
  );
});

// ============== SHOP FORM MODAL ==============

interface ShopFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shop: Partial<Shop>) => void;
  shop: Shop | null;
  employees: Employee[];
}

function ShopFormModal({ isOpen, onClose, onSave, shop, employees }: ShopFormModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'staffing' | 'special' | 'rules'>('basic');
  
  const [formData, setFormData] = useState<{
    name: string;
    company: Shop['company'];
    address: string;
    phone: string;
    openTime: string;
    closeTime: string;
    isActive: boolean;
    minStaffAtOpen: number;
    minStaffMidday: number;
    minStaffAtClose: number;
    canBeSolo: boolean;
    requirements: ShopDayRequirement[];
    specialRequests: SpecialShiftRequest[];
    fixedDaysOff: FixedDayOff[];
    specialDayRules: SpecialDayRule[];
    rules: {
      sundayMaxStaff: number | undefined;
      dayInDayOut: boolean;
      sundayClosed: boolean;
      splitPreferred: boolean;
      fullDayOnlyDays: string[];
    };
  }>({
    name: '',
    company: 'CMZ',
    address: '',
    phone: '',
    openTime: '06:00',
    closeTime: '21:00',
    isActive: true,
    minStaffAtOpen: 1,
    minStaffMidday: 1,
    minStaffAtClose: 1,
    canBeSolo: false,
    requirements: DEFAULT_REQUIREMENTS,
    specialRequests: [],
    fixedDaysOff: [],
    specialDayRules: [],
    rules: {
      sundayMaxStaff: undefined,
      dayInDayOut: false,
      sundayClosed: false,
      splitPreferred: false,
      fullDayOnlyDays: [],
    },
  });

  // Get assigned employees for this shop
  const assignedEmployees = useMemo(() => {
    if (!shop) return employees;
    return employees.filter(e => 
      e.primaryShopId === shop.id || (e.secondaryShopIds || []).includes(shop.id)
    );
  }, [shop, employees]);

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (shop) {
        setFormData({
          name: shop.name,
          company: shop.company,
          address: shop.address || '',
          phone: shop.phone || '',
          openTime: shop.openTime,
          closeTime: shop.closeTime,
          isActive: shop.isActive,
          minStaffAtOpen: shop.minStaffAtOpen || 1,
          minStaffMidday: shop.minStaffMidday || 1,
          minStaffAtClose: shop.minStaffAtClose || 1,
          canBeSolo: shop.canBeSolo || false,
          requirements: shop.requirements && shop.requirements.length > 0 
            ? shop.requirements.map(r => ({
                day: r.day,
                amStaff: r.amStaff || 0,
                pmStaff: r.pmStaff || 0,
                allowFullDay: r.allowFullDay !== false,
                isMandatory: r.isMandatory || false
              }))
            : DEFAULT_REQUIREMENTS,
          specialRequests: shop.specialRequests || [],
          fixedDaysOff: shop.fixedDaysOff || [],
          specialDayRules: shop.specialDayRules || [],
          rules: {
            sundayMaxStaff: shop.rules?.sundayMaxStaff,
            dayInDayOut: shop.rules?.dayInDayOut || false,
            sundayClosed: shop.rules?.sunday_closed || false,
            splitPreferred: shop.rules?.splitPreferred || false,
            fullDayOnlyDays: shop.rules?.fullDayOnlyDays || [],
          },
        });
      } else {
        setFormData({
          name: '',
          company: 'CMZ',
          address: '',
          phone: '',
          openTime: '06:00',
          closeTime: '21:00',
          isActive: true,
          minStaffAtOpen: 1,
          minStaffMidday: 1,
          minStaffAtClose: 1,
          canBeSolo: false,
          requirements: DEFAULT_REQUIREMENTS,
          specialRequests: [],
          fixedDaysOff: [],
          specialDayRules: [],
          rules: {
            sundayMaxStaff: undefined,
            dayInDayOut: false,
            sundayClosed: false,
            splitPreferred: false,
            fullDayOnlyDays: [],
          }
        });
        setActiveTab('basic');
      }
    }
  }, [isOpen, shop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    const rules: Shop['rules'] = {
      full_day_effect: shop?.rules?.full_day_effect || 'reduces_am',
    };
    
    if (formData.rules.sundayMaxStaff !== undefined && formData.rules.sundayMaxStaff > 0) {
      rules.sundayMaxStaff = formData.rules.sundayMaxStaff;
    }
    if (formData.rules.dayInDayOut) {
      rules.dayInDayOut = true;
    }
    if (formData.rules.sundayClosed) {
      rules.sunday_closed = true;
    }
    if (formData.rules.splitPreferred) {
      rules.splitPreferred = true;
    }
    if (formData.rules.fullDayOnlyDays.length > 0) {
      rules.fullDayOnlyDays = formData.rules.fullDayOnlyDays;
    }
    
    onSave({
      name: formData.name,
      company: formData.company,
      address: formData.address,
      phone: formData.phone,
      openTime: formData.openTime,
      closeTime: formData.closeTime,
      isActive: formData.isActive,
      minStaffAtOpen: formData.minStaffAtOpen,
      minStaffMidday: formData.minStaffMidday,
      minStaffAtClose: formData.minStaffAtClose,
      canBeSolo: formData.canBeSolo,
      requirements: formData.requirements,
      specialRequests: formData.specialRequests,
      fixedDaysOff: formData.fixedDaysOff,
      specialDayRules: formData.specialDayRules,
      rules,
    });
  };

  const updateRequirement = (dayIndex: number, field: keyof ShopDayRequirement, value: number | boolean | string) => {
    setFormData(prev => ({
      ...prev,
      requirements: prev.requirements.map((req, idx) => 
        idx === dayIndex ? { ...req, [field]: value } : req
      )
    }));
  };

  const toggleFullDayOnlyDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      rules: {
        ...prev.rules,
        fullDayOnlyDays: prev.rules.fullDayOnlyDays.includes(day)
          ? prev.rules.fullDayOnlyDays.filter(d => d !== day)
          : [...prev.rules.fullDayOnlyDays, day],
      },
    }));
  };

  // ========== SPECIAL REQUESTS HANDLERS ==========
  
  const addCustomShift = (day: DayOfWeek) => {
    const existingRequest = formData.specialRequests.find(r => r.day === day);
    
    if (existingRequest) {
      setFormData(prev => ({
        ...prev,
        specialRequests: prev.specialRequests.map(r => 
          r.day === day 
            ? { ...r, shifts: [...r.shifts, { start: '06:30', end: '14:00', count: 1 }] }
            : r
        )
      }));
    } else {
      const newRequest: SpecialShiftRequest = {
        id: `${day}-${Date.now()}`,
        day,
        shifts: [{ start: '06:30', end: '14:00', count: 1 }]
      };
      setFormData(prev => ({
        ...prev,
        specialRequests: [...prev.specialRequests, newRequest]
      }));
    }
  };

  const updateCustomShift = (day: DayOfWeek, shiftIndex: number, field: keyof SpecialShift, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      specialRequests: prev.specialRequests.map(r => 
        r.day === day 
          ? {
              ...r,
              shifts: r.shifts.map((s, idx) => 
                idx === shiftIndex ? { ...s, [field]: value } : s
              )
            }
          : r
      )
    }));
  };

  const removeCustomShift = (day: DayOfWeek, shiftIndex: number) => {
    setFormData(prev => ({
      ...prev,
      specialRequests: prev.specialRequests
        .map(r => 
          r.day === day 
            ? { ...r, shifts: r.shifts.filter((_, idx) => idx !== shiftIndex) }
            : r
        )
        .filter(r => r.shifts.length > 0)
    }));
  };

  const addFixedDayOff = () => {
    if (assignedEmployees.length === 0) return;
    
    const newOff: FixedDayOff = {
      employeeId: assignedEmployees[0].id,
      employeeName: assignedEmployees[0].name,
      day: 'Mon'
    };
    setFormData(prev => ({
      ...prev,
      fixedDaysOff: [...prev.fixedDaysOff, newOff]
    }));
  };

  const updateFixedDayOff = (index: number, field: keyof FixedDayOff, value: number | string) => {
    setFormData(prev => ({
      ...prev,
      fixedDaysOff: prev.fixedDaysOff.map((off, idx) => {
        if (idx !== index) return off;
        
        if (field === 'employeeId') {
          const emp = employees.find(e => e.id === value);
          return { ...off, employeeId: value as number, employeeName: emp?.name || '' };
        }
        return { ...off, [field]: value };
      })
    }));
  };

  const removeFixedDayOff = (index: number) => {
    setFormData(prev => ({
      ...prev,
      fixedDaysOff: prev.fixedDaysOff.filter((_, idx) => idx !== index)
    }));
  };

  const addSpecialDayRule = () => {
    const newRule: SpecialDayRule = {
      day: 'Sat',
      rule: 'one_off_one_full',
      description: '1 OFF, 1 FULL DAY'
    };
    setFormData(prev => ({
      ...prev,
      specialDayRules: [...prev.specialDayRules, newRule]
    }));
  };

  const updateSpecialDayRule = (index: number, field: keyof SpecialDayRule, value: string) => {
    setFormData(prev => ({
      ...prev,
      specialDayRules: prev.specialDayRules.map((rule, idx) => 
        idx === index ? { ...rule, [field]: value } : rule
      )
    }));
  };

  const removeSpecialDayRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specialDayRules: prev.specialDayRules.filter((_, idx) => idx !== index)
    }));
  };

  const totalAM = formData.requirements.reduce((sum, r) => sum + r.amStaff, 0);
  const totalPM = formData.requirements.reduce((sum, r) => sum + r.pmStaff, 0);

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={shop ? 'Edit Shop' : 'Add New Shop'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
          <TabButton active={activeTab === 'basic'} onClick={() => setActiveTab('basic')}>
            Basic Info
          </TabButton>
          <TabButton active={activeTab === 'staffing'} onClick={() => setActiveTab('staffing')}>
            📅 Staffing
          </TabButton>
          <TabButton active={activeTab === 'special'} onClick={() => setActiveTab('special')}>
            ⭐ Special
            {(formData.specialRequests.length > 0 || formData.fixedDaysOff.length > 0 || formData.specialDayRules.length > 0) && (
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                {formData.specialRequests.reduce((sum, r) => sum + r.shifts.length, 0) + formData.fixedDaysOff.length + formData.specialDayRules.length}
              </span>
            )}
          </TabButton>
          <TabButton active={activeTab === 'rules'} onClick={() => setActiveTab('rules')}>
            Rules
          </TabButton>
        </div>

        {/* Basic Info Tab */}
        {activeTab === 'basic' && (
          <div className="space-y-4">
            {/* Active Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="text-sm font-medium text-gray-700">Shop Status</label>
                <p className="text-xs text-gray-500">Inactive shops are excluded from roster generation</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, isActive: !prev.isActive }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  formData.isActive ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    formData.isActive ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <FormInput
              label="Shop Name"
              value={formData.name}
              onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
              placeholder="Enter shop name"
              required
            />

            <FormSelect
              label="Company"
              value={formData.company}
              onChange={(value) => setFormData(prev => ({ ...prev, company: value as Shop['company'] }))}
              options={[
                { value: 'CMZ', label: 'CMZ' },
                { value: 'CS', label: 'CS' },
              ]}
            />

            <FormInput
              label="Address"
              value={formData.address}
              onChange={(value) => setFormData(prev => ({ ...prev, address: value }))}
              placeholder="Enter shop address"
            />

            <FormInput
              label="Phone"
              type="tel"
              value={formData.phone}
              onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
              placeholder="Enter phone number"
            />

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
          </div>
        )}

        {/* Staffing Tab */}
        {activeTab === 'staffing' && (
          <div className="space-y-6">
            {/* MINIMUM STAFFING REQUIREMENTS */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <h4 className="text-gray-900 font-medium mb-4 flex items-center gap-2">
                <Users size={18} className="text-blue-600" />
                Minimum Staffing Requirements
              </h4>
              
              <div className="grid grid-cols-3 gap-4 mb-4">
                {/* Min at Open */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Min Staff at Open
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.minStaffAtOpen}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      minStaffAtOpen: parseInt(e.target.value) || 1
                    }))}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500 text-xs">At opening time</span>
                </div>
                
                {/* Min at Midday */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Min Staff Midday
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.minStaffMidday}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      minStaffMidday: parseInt(e.target.value) || 1
                    }))}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500 text-xs">Peak hours (11:00-14:00)</span>
                </div>
                
                {/* Min at Close */}
                <div>
                  <label className="block text-gray-700 text-sm font-medium mb-1">
                    Min Staff at Close
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.minStaffAtClose}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      minStaffAtClose: parseInt(e.target.value) || 1
                    }))}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-500 text-xs">At closing time</span>
                </div>
              </div>
              
              {/* Can Be Solo Toggle */}
              <div className="flex items-center justify-between bg-white rounded-lg p-3 border border-gray-200">
                <div>
                  <span className="text-gray-900 font-medium">Can Be Handled Solo</span>
                  <p className="text-gray-500 text-sm">Allow 1 person to work alone for entire shift (open to close)</p>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({
                    ...prev,
                    canBeSolo: !prev.canBeSolo
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formData.canBeSolo ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formData.canBeSolo ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Quick Presets */}
              <div className="mt-4">
                <span className="text-gray-600 text-sm font-medium">Quick Presets:</span>
                <div className="flex gap-2 mt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      minStaffAtOpen: 1,
                      minStaffMidday: 1,
                      minStaffAtClose: 1,
                      canBeSolo: true
                    }))}
                    className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                  >
                    Solo Shop (1-1-1 ✓)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      minStaffAtOpen: 1,
                      minStaffMidday: 2,
                      minStaffAtClose: 1,
                      canBeSolo: false
                    }))}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200"
                  >
                    Small Shop (1-2-1)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      minStaffAtOpen: 2,
                      minStaffMidday: 3,
                      minStaffAtClose: 2,
                      canBeSolo: false
                    }))}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                  >
                    Large Shop (2-3-2)
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      minStaffAtOpen: 3,
                      minStaffMidday: 4,
                      minStaffAtClose: 3,
                      canBeSolo: false
                    }))}
                    className="px-3 py-1 bg-orange-100 text-orange-700 rounded text-sm hover:bg-orange-200"
                  >
                    Busy Shop (3-4-3)
                  </button>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{totalAM}</p>
                <p className="text-xs text-gray-500">Total AM shifts/week</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-orange-600">{totalPM}</p>
                <p className="text-xs text-gray-500">Total PM shifts/week</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">{totalAM + totalPM}</p>
                <p className="text-xs text-gray-500">Total shifts/week</p>
              </div>
            </div>

            {/* Day-by-day grid */}
            <div className="border rounded-lg overflow-hidden">
              <div className="grid grid-cols-5 gap-2 p-3 bg-gray-100 font-medium text-sm text-gray-700">
                <div>Day</div>
                <div className="text-center">AM Staff</div>
                <div className="text-center">PM Staff</div>
                <div className="text-center">Allow Full Day</div>
                <div className="text-center">Mandatory</div>
              </div>
              
              {formData.requirements.map((req, idx) => {
                const isSunday = req.day === 'Sun';
                const isClosed = isSunday && formData.rules.sundayClosed;
                
                return (
                  <div 
                    key={req.day} 
                    className={`grid grid-cols-5 gap-2 p-3 border-t items-center ${
                      isClosed ? 'bg-red-50 opacity-60' : req.isMandatory ? 'bg-amber-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">
                      {req.day}
                      {isClosed && <span className="text-red-500 text-xs ml-2">(Closed)</span>}
                      {req.isMandatory && !isClosed && <span className="text-amber-600 text-xs ml-2">★</span>}
                    </div>
                    
                    <div className="flex justify-center">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={req.amStaff}
                        onChange={(e) => updateRequirement(idx, 'amStaff', parseInt(e.target.value) || 0)}
                        disabled={isClosed}
                        className={`w-16 px-2 py-1 text-center border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
                          req.isMandatory ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    
                    <div className="flex justify-center">
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={req.pmStaff}
                        onChange={(e) => updateRequirement(idx, 'pmStaff', parseInt(e.target.value) || 0)}
                        disabled={isClosed}
                        className={`w-16 px-2 py-1 text-center border rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
                          req.isMandatory ? 'border-amber-400 bg-amber-50' : 'border-gray-300'
                        }`}
                      />
                    </div>
                    
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={req.allowFullDay}
                        onChange={(e) => updateRequirement(idx, 'allowFullDay', e.target.checked)}
                        disabled={isClosed}
                        className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="flex justify-center">
                      <input
                        type="checkbox"
                        checked={req.isMandatory}
                        onChange={(e) => updateRequirement(idx, 'isMandatory', e.target.checked)}
                        disabled={isClosed}
                        className="w-5 h-5 rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span className="text-amber-600">★</span>
                <span>Mandatory = solver MUST schedule exactly this many staff</span>
              </div>
            </div>

            {/* Quick presets for staffing grid */}
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 mr-2">Quick presets:</span>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  requirements: prev.requirements.map(r => ({ ...r, amStaff: 1, pmStaff: 1 }))
                }))}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                All 1+1
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  requirements: prev.requirements.map(r => ({ ...r, amStaff: 2, pmStaff: 2 }))
                }))}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                All 2+2
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  requirements: prev.requirements.map(r => ({ ...r, amStaff: 3, pmStaff: 2 }))
                }))}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                All 3+2
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  requirements: prev.requirements.map((r, idx) => ({
                    ...r,
                    amStaff: idx === 0 || idx === 5 ? 4 : 3,
                    pmStaff: 2
                  }))
                }))}
                className="px-3 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"
              >
                Hamrun Pattern
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  requirements: prev.requirements.map(r => ({ ...r, isMandatory: true }))
                }))}
                className="px-3 py-1 text-xs bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg"
              >
                All Mandatory
              </button>
              <button
                type="button"
                onClick={() => setFormData(prev => ({
                  ...prev,
                  requirements: prev.requirements.map(r => ({ ...r, isMandatory: false }))
                }))}
                className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Clear Mandatory
              </button>
            </div>
          </div>
        )}

        {/* SPECIAL REQUESTS TAB */}
        {activeTab === 'special' && (
          <div className="space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="p-3 bg-amber-50 rounded-lg text-sm text-amber-700">
              <strong>Special requests override default staffing.</strong><br/>
              Add custom shift times, fixed days off for employees, and special day rules.
            </div>

            {/* Section 1: Custom Shift Times */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">📅 Custom Shift Times</h3>
                <div className="flex gap-1 flex-wrap">
                  {DAYS.map(day => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => addCustomShift(day)}
                      className="px-2 py-1 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 rounded"
                    >
                      +{day}
                    </button>
                  ))}
                </div>
              </div>
              
              <p className="text-xs text-gray-500">
                Example: Saturday - 1 person 6:30-14:00, 1 person 10:00-21:30
              </p>

              {formData.specialRequests.length === 0 ? (
                <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                  No custom shifts. Click a day button above to add.
                </div>
              ) : (
                <div className="space-y-3">
                  {formData.specialRequests.map((request) => (
                    <div key={request.id} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="font-medium text-gray-700 mb-2">{request.day}</div>
                      <div className="space-y-2">
                        {request.shifts.map((shift, shiftIdx) => (
                          <div key={shiftIdx} className="flex items-center gap-2 flex-wrap">
                            <input
                              type="number"
                              min="1"
                              max="5"
                              value={shift.count}
                              onChange={(e) => updateCustomShift(request.day, shiftIdx, 'count', parseInt(e.target.value) || 1)}
                              className="w-14 px-2 py-1 text-center border border-gray-300 rounded text-sm"
                            />
                            <span className="text-gray-500 text-sm">×</span>
                            <input
                              type="time"
                              value={shift.start}
                              onChange={(e) => updateCustomShift(request.day, shiftIdx, 'start', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <span className="text-gray-500">→</span>
                            <input
                              type="time"
                              value={shift.end}
                              onChange={(e) => updateCustomShift(request.day, shiftIdx, 'end', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => removeCustomShift(request.day, shiftIdx)}
                              className="p-1 text-red-500 hover:bg-red-50 rounded"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => addCustomShift(request.day)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          + Add another shift for {request.day}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 2: Fixed Days Off */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">🏖️ Fixed Days Off</h3>
                <button
                  type="button"
                  onClick={addFixedDayOff}
                  disabled={assignedEmployees.length === 0}
                  className="px-3 py-1 text-xs bg-green-100 hover:bg-green-200 text-green-700 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + Add Fixed Day Off
                </button>
              </div>
              
              <p className="text-xs text-gray-500">
                Example: Ricky - Monday OFF, Anus - Wednesday OFF
              </p>

              {assignedEmployees.length === 0 && (
                <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                  ⚠️ No employees assigned to this shop yet. Assign employees first to set fixed days off.
                </div>
              )}

              {formData.fixedDaysOff.length === 0 ? (
                <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                  No fixed days off configured.
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.fixedDaysOff.map((off, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg flex-wrap">
                      <select
                        value={off.employeeId}
                        onChange={(e) => updateFixedDayOff(idx, 'employeeId', parseInt(e.target.value))}
                        className="flex-1 min-w-[150px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        {assignedEmployees.map(emp => (
                          <option key={emp.id} value={emp.id}>{emp.name}</option>
                        ))}
                        {!assignedEmployees.find(e => e.id === off.employeeId) && (
                          <option value={off.employeeId}>{off.employeeName} (not assigned)</option>
                        )}
                      </select>
                      <span className="text-gray-500 text-sm">OFF on</span>
                      <select
                        value={off.day}
                        onChange={(e) => updateFixedDayOff(idx, 'day', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        {DAYS.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => removeFixedDayOff(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 3: Special Day Rules */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">📋 Special Day Rules</h3>
                <button
                  type="button"
                  onClick={addSpecialDayRule}
                  className="px-3 py-1 text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 rounded"
                >
                  + Add Day Rule
                </button>
              </div>
              
              <p className="text-xs text-gray-500">
                Example: Wednesday/Sunday - 1 OFF, 1 FULL DAY (for Rabat)
              </p>

              {formData.specialDayRules.length === 0 ? (
                <div className="p-4 border border-dashed border-gray-300 rounded-lg text-center text-gray-500 text-sm">
                  No special day rules configured.
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.specialDayRules.map((rule, idx) => (
                    <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg flex-wrap">
                      <select
                        value={rule.day}
                        onChange={(e) => updateSpecialDayRule(idx, 'day', e.target.value)}
                        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        {DAYS.map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                      <span className="text-gray-500 text-sm">→</span>
                      <select
                        value={rule.rule}
                        onChange={(e) => updateSpecialDayRule(idx, 'rule', e.target.value)}
                        className="flex-1 min-w-[150px] px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="one_off_one_full">1 OFF, 1 FULL DAY</option>
                        <option value="all_full">All FULL DAY shifts</option>
                        <option value="all_split">All SPLIT shifts (AM/PM)</option>
                        <option value="custom">Custom (see notes)</option>
                      </select>
                      <input
                        type="text"
                        value={rule.description || ''}
                        onChange={(e) => updateSpecialDayRule(idx, 'description', e.target.value)}
                        placeholder="Notes..."
                        className="w-32 px-2 py-1.5 border border-gray-300 rounded-lg text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeSpecialDayRule(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rules Tab */}
        {activeTab === 'rules' && (
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              These rules affect how the roster generator schedules staff for this shop.
            </div>

            {/* Sunday Closed */}
            <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                id="sundayClosed"
                checked={formData.rules.sundayClosed}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rules: { ...prev.rules, sundayClosed: e.target.checked },
                }))}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="sundayClosed" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Closed on Sundays
                </label>
                <p className="text-xs text-gray-500">No staff will be scheduled on Sundays</p>
              </div>
            </div>

            {/* Sunday Max Staff */}
            {!formData.rules.sundayClosed && (
              <div className="p-4 border border-gray-200 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sunday Maximum Staff
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  Limit total staff on Sundays (leave empty for no limit)
                </p>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.rules.sundayMaxStaff || ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    rules: {
                      ...prev.rules,
                      sundayMaxStaff: e.target.value ? parseInt(e.target.value) : undefined,
                    },
                  }))}
                  placeholder="No limit"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Day In Day Out */}
            <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                id="dayInDayOut"
                checked={formData.rules.dayInDayOut}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rules: { ...prev.rules, dayInDayOut: e.target.checked },
                }))}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="dayInDayOut" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Day-In/Day-Out Pattern
                </label>
                <p className="text-xs text-gray-500">Employees work every other day (no consecutive days)</p>
              </div>
            </div>

            {/* Split Preferred */}
            <div className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg">
              <input
                type="checkbox"
                id="splitPreferred"
                checked={formData.rules.splitPreferred}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  rules: { ...prev.rules, splitPreferred: e.target.checked },
                }))}
                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <label htmlFor="splitPreferred" className="text-sm font-medium text-gray-700 cursor-pointer">
                  Prefer Split Shifts
                </label>
                <p className="text-xs text-gray-500">Prefer AM/PM shifts over FULL day shifts</p>
              </div>
            </div>

            {/* Full Day Only Days */}
            <div className="p-4 border border-gray-200 rounded-lg">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Day Only Days
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select days where only FULL day shifts are allowed
              </p>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleFullDayOnlyDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      formData.rules.fullDayOnlyDays.includes(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <AnimatedButton variant="secondary" onClick={onClose}>
            Cancel
          </AnimatedButton>
          <AnimatedButton type="submit" icon={Check}>
            {shop ? 'Save Changes' : 'Create Shop'}
          </AnimatedButton>
        </div>
      </form>
    </Modal>
  );
}

export default ShopsView;
