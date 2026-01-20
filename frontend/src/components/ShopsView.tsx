// frontend/src/components/ShopsView.tsx
import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  Store, Plus, Edit2, Trash2, Users, Power, PowerOff, 
  Clock, MapPin, Phone, Calendar, 
  X, Check, Star, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  GlassCard, Avatar, Badge, SearchInput, Modal, 
  FormInput, FormSelect, TabButton, AnimatedButton, 
  ToggleButtonGroup, EmptyState, StatCard, useDebounce,
  ConfirmDialog
} from './ui';
import type { Shop, Employee, DayOfWeek, SpecialShiftRequest } from '../types';
import { DAYS_OF_WEEK, DEFAULT_SHOP_REQUIREMENTS } from '../types';

// ============== TYPES ==============

interface ShopsViewProps {
  shops: Shop[];
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
}

type CompanyFilter = 'all' | 'CMZ' | 'CS';
type StatusFilter = 'all' | 'active' | 'inactive';

// ============== MAIN COMPONENT ==============

const ShopsView = memo(function ShopsView({ 
  shops = [], 
  setShops, 
  employees = [], 
  setEmployees 
}: ShopsViewProps) {
  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedShop, setSelectedShop] = useState<Shop | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Filtered shops
  const filteredShops = useMemo(() => {
    return shops.filter(shop => {
      const matchesSearch = shop.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                           shop.address?.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCompany = companyFilter === 'all' || shop.company === companyFilter;
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' ? shop.isActive : !shop.isActive);
      return matchesSearch && matchesCompany && matchesStatus;
    });
  }, [shops, debouncedSearch, companyFilter, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: shops.length,
    active: shops.filter(s => s.isActive).length,
    cmz: shops.filter(s => s.company === 'CMZ').length,
    cs: shops.filter(s => s.company === 'CS').length,
  }), [shops]);

  // Handlers
  const handleToggleActive = useCallback((shopId: number) => {
    setShops(prev => prev.map(shop => 
      shop.id === shopId ? { ...shop, isActive: !shop.isActive } : shop
    ));
  }, [setShops]);

  const handleDeleteShop = useCallback(() => {
    if (!selectedShop) return;
    setShops(prev => prev.filter(shop => shop.id !== selectedShop.id));
    setShowDeleteConfirm(false);
    setSelectedShop(null);
  }, [selectedShop, setShops]);

  const handleSaveShop = useCallback((shopData: Partial<Shop>) => {
    if (selectedShop) {
      // Edit existing
      setShops(prev => prev.map(shop => 
        shop.id === selectedShop.id ? { ...shop, ...shopData } : shop
      ));
    } else {
      // Add new
      const newShop: Shop = {
        id: Date.now(),
        name: shopData.name || 'New Shop',
        company: shopData.company || 'CMZ',
        isActive: true,
        openTime: shopData.openTime || '06:00',
        closeTime: shopData.closeTime || '21:00',
        address: shopData.address,
        phone: shopData.phone,
        requirements: DEFAULT_SHOP_REQUIREMENTS,
        specialRequests: [],
        assignedEmployees: [],
      };
      setShops(prev => [...prev, newShop]);
    }
    setShowAddModal(false);
    setShowEditModal(false);
    setSelectedShop(null);
  }, [selectedShop, setShops]);

  const handleUpdateRequirements = useCallback((requirements: Shop['requirements'], specialRequests: Shop['specialRequests']) => {
    if (!selectedShop) return;
    setShops(prev => prev.map(shop => 
      shop.id === selectedShop.id ? { ...shop, requirements, specialRequests } : shop
    ));
    setShowRequirementsModal(false);
    setSelectedShop(null);
  }, [selectedShop, setShops]);

  const handleUpdateStaffAssignments = useCallback((shopId: number, assignments: Shop['assignedEmployees']) => {
  setShops(prev => prev.map(shop => 
    shop.id === shopId ? { ...shop, assignedEmployees: assignments } : shop
  ));

  // Also update employee records
  const assignedEmployeeIds = assignments.map(a => a.employeeId);
  
  setEmployees(prev => prev.map(emp => {
    const isPrimary = assignments.some(a => a.employeeId === emp.id && a.isPrimary);
    const isSecondary = assignments.some(a => a.employeeId === emp.id && !a.isPrimary);
    const wasHere = emp.primaryShopId === shopId || (emp.secondaryShopIds || []).includes(shopId);
    const isHereNow = assignedEmployeeIds.includes(emp.id);
    
    // Skip if employee has no relation to this shop
    if (!wasHere && !isHereNow) return emp;
    
    let newPrimaryShopId = emp.primaryShopId;
    let newSecondaryShopIds = [...(emp.secondaryShopIds || [])];
    
    if (isPrimary) {
      newPrimaryShopId = shopId;
      newSecondaryShopIds = newSecondaryShopIds.filter(id => id !== shopId);
    } else if (isSecondary) {
      if (emp.primaryShopId === shopId) newPrimaryShopId = undefined;
      if (!newSecondaryShopIds.includes(shopId)) newSecondaryShopIds.push(shopId);
    } else if (wasHere && !isHereNow) {
      // Employee was removed from this shop
      if (emp.primaryShopId === shopId) newPrimaryShopId = undefined;
      newSecondaryShopIds = newSecondaryShopIds.filter(id => id !== shopId);
    }
    
    return { ...emp, primaryShopId: newPrimaryShopId, secondaryShopIds: newSecondaryShopIds };
  }));
  
  setShowStaffModal(false);
  setSelectedShop(null);
}, [setShops, setEmployees]);


  // Get assigned staff for a shop
  const getShopStaff = useCallback((shop: Shop) => {
    return (shop.assignedEmployees || []).map(assignment => {
      const employee = employees.find(e => e.id === assignment.employeeId);
      return employee ? { ...employee, isPrimary: assignment.isPrimary } : null;
    }).filter(Boolean) as (Employee & { isPrimary: boolean })[];
  }, [employees]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shop Management</h1>
          <p className="text-gray-600 mt-1">Manage shops, staff assignments, and scheduling requirements</p>
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Store}
          label="Total Shops"
          value={stats.total}
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Power}
          label="Active"
          value={stats.active}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          icon={Store}
          label="CMZ Shops"
          value={stats.cmz}
          gradient="from-purple-500 to-purple-600"
        />
        <StatCard
          icon={Store}
          label="CS Shops"
          value={stats.cs}
          gradient="from-orange-500 to-orange-600"
        />
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search shops..."
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
          <ToggleButtonGroup
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: 'all', label: 'All' },
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
          description={searchTerm ? "Try adjusting your search or filters" : "Add your first shop to get started"}
          action={
            <AnimatedButton icon={Plus} onClick={() => setShowAddModal(true)}>
              Add Shop
            </AnimatedButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredShops.map(shop => (
            <ShopCard
              key={shop.id}
              shop={shop}
              staff={getShopStaff(shop)}
              onToggleActive={() => handleToggleActive(shop.id)}
              onEdit={() => {
                setSelectedShop(shop);
                setShowEditModal(true);
              }}
              onDelete={() => {
                setSelectedShop(shop);
                setShowDeleteConfirm(true);
              }}
              onManageStaff={() => {
                setSelectedShop(shop);
                setShowStaffModal(true);
              }}
              onEditRequirements={() => {
                setSelectedShop(shop);
                setShowRequirementsModal(true);
              }}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      <ShopFormModal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedShop(null);
        }}
        onSave={handleSaveShop}
        shop={selectedShop}
      />

      {selectedShop && (
        <>
          <StaffAssignmentModal
            isOpen={showStaffModal}
            onClose={() => {
              setShowStaffModal(false);
              setSelectedShop(null);
            }}
            shop={selectedShop}
            employees={employees}
            onUpdateAssignments={(assignments) => handleUpdateStaffAssignments(selectedShop.id, assignments)}
          />

          <ShopRequirementsModal
            isOpen={showRequirementsModal}
            onClose={() => {
              setShowRequirementsModal(false);
              setSelectedShop(null);
            }}
            shop={selectedShop}
            onSave={handleUpdateRequirements}
          />
        </>
      )}

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedShop(null);
        }}
        onConfirm={handleDeleteShop}
        title="Delete Shop"
        message={`Are you sure you want to delete "${selectedShop?.name}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
      />
    </div>
  );
});

// ============== SHOP CARD ==============

interface ShopCardProps {
  shop: Shop;
  staff: (Employee & { isPrimary: boolean })[];
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onManageStaff: () => void;
  onEditRequirements: () => void;
}

function ShopCard({ 
  shop, 
  staff = [], 
  onToggleActive, 
  onEdit, 
  onDelete, 
  onManageStaff,
  onEditRequirements 
}: ShopCardProps) {
  const safeStaff = staff || [];
  const primaryStaff = safeStaff.filter(s => s.isPrimary);
  const secondaryStaff = safeStaff.filter(s => !s.isPrimary);
  
  const totalWeeklyShifts = (shop.requirements || []).reduce((acc, req) => 
    acc + req.amStaff + req.pmStaff, 0
  );

  return (
    <GlassCard className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
            shop.company === 'CMZ' ? 'bg-purple-100' : 'bg-orange-100'
          }`}>
            <Store className={`w-5 h-5 ${
              shop.company === 'CMZ' ? 'text-purple-600' : 'text-orange-600'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{shop.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={shop.company === 'CMZ' ? 'purple' : 'warning'}>
                {shop.company}
              </Badge>
              <Badge variant={shop.isActive ? 'success' : 'danger'} dot>
                {shop.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
          </div>
        </div>
        <button
          onClick={onToggleActive}
          className={`p-2 rounded-lg transition-colors ${
            shop.isActive 
              ? 'text-green-600 hover:bg-green-50' 
              : 'text-gray-400 hover:bg-gray-100'
          }`}
          title={shop.isActive ? 'Deactivate' : 'Activate'}
        >
          {shop.isActive ? <Power className="w-5 h-5" /> : <PowerOff className="w-5 h-5" />}
        </button>
      </div>

      {/* Info */}
      <div className="space-y-2 mb-4 text-sm text-gray-600">
        {shop.address && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{shop.address}</span>
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
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4 p-3 bg-gray-50 rounded-lg text-center text-sm">
        <div>
          <div className="font-semibold text-gray-900">{safeStaff.length}</div>
          <div className="text-gray-500 text-xs">Staff</div>
        </div>
        <div>
          <div className="font-semibold text-gray-900">{totalWeeklyShifts}</div>
          <div className="text-gray-500 text-xs">Weekly Shifts</div>
        </div>
        <div>
          <div className="font-semibold text-gray-900">{(shop.specialRequests || []).length}</div>
          <div className="text-gray-500 text-xs">Special</div>
        </div>
      </div>

      {/* Staff Preview */}
      {safeStaff.length > 0 && (
        <div className="mb-4">
          <div className="text-xs font-medium text-gray-500 mb-2">Assigned Staff</div>
          <div className="flex flex-wrap gap-1">
            {primaryStaff.slice(0, 3).map(emp => (
              <div key={emp.id} className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
                <Star className="w-3 h-3 text-blue-500" />
                <span className="text-xs text-blue-700">{emp.name.split(' ')[0]}</span>
              </div>
            ))}
            {secondaryStaff.slice(0, 3).map(emp => (
              <div key={emp.id} className="px-2 py-1 bg-gray-100 rounded-full">
                <span className="text-xs text-gray-600">{emp.name.split(' ')[0]}</span>
              </div>
            ))}
            {safeStaff.length > 6 && (
              <div className="px-2 py-1 bg-gray-100 rounded-full">
                <span className="text-xs text-gray-500">+{safeStaff.length - 6}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <AnimatedButton variant="ghost" size="sm" icon={Users} onClick={onManageStaff}>
          Staff
        </AnimatedButton>
        <AnimatedButton variant="ghost" size="sm" icon={Calendar} onClick={onEditRequirements}>
          Schedule
        </AnimatedButton>
        <div className="flex-1" />
        <AnimatedButton variant="ghost" size="sm" icon={Edit2} onClick={onEdit}>
          Edit
        </AnimatedButton>
        <AnimatedButton variant="ghost" size="sm" icon={Trash2} onClick={onDelete}>
          <span className="sr-only">Delete</span>
        </AnimatedButton>
      </div>
    </GlassCard>
  );
}

// ============== SHOP FORM MODAL ==============

interface ShopFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shop: Partial<Shop>) => void;
  shop: Shop | null;
}

function ShopFormModal({ isOpen, onClose, onSave, shop }: ShopFormModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    company: 'CMZ' as Shop['company'],
    address: '',
    phone: '',
    openTime: '06:00',
    closeTime: '21:00',
  });

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
        });
      } else {
        setFormData({
          name: '',
          company: 'CMZ',
          address: '',
          phone: '',
          openTime: '06:00',
          closeTime: '21:00',
        });
      }
    }
  }, [isOpen, shop]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    onSave(formData);
  };

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={shop ? 'Edit Shop' : 'Add New Shop'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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

// ============== STAFF ASSIGNMENT MODAL ==============

interface StaffAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  employees: Employee[];
  onUpdateAssignments: (assignments: Shop['assignedEmployees']) => void;
}

function StaffAssignmentModal({ 
  isOpen, 
  onClose, 
  shop, 
  employees, 
  onUpdateAssignments 
}: StaffAssignmentModalProps) {
  const [activeTab, setActiveTab] = useState<'assigned' | 'add'>('assigned');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignments, setAssignments] = useState<Shop['assignedEmployees']>([]);

  // Initialize assignments when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setAssignments([...shop.assignedEmployees]);
      setSearchTerm('');
      setActiveTab('assigned');
    }
  }, [isOpen, shop]);

  // Filter employees for "add" tab - show those not already assigned
  const availableEmployees = useMemo(() => {
    const assignedIds = new Set(assignments.map(a => a.employeeId));
    return employees.filter(emp => {
      if (assignedIds.has(emp.id)) return false;
      if (emp.excludeFromRoster) return false;
      // Filter by company
      if (shop.company !== 'Both' && emp.company !== 'Both' && emp.company !== shop.company) return false;
      // Filter by search
      if (searchTerm && !emp.name.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      return true;
    });
  }, [employees, assignments, shop.company, searchTerm]);

  // Get assigned employees with details
  const assignedEmployees = useMemo(() => {
    return assignments.map(assignment => {
      const employee = employees.find(e => e.id === assignment.employeeId);
      return employee ? { ...assignment, employee } : null;
    }).filter(Boolean) as { employeeId: number; isPrimary: boolean; employee: Employee }[];
  }, [assignments, employees]);

  const handleAddEmployee = (employeeId: number, isPrimary: boolean) => {
    setAssignments(prev => [...prev, { employeeId, isPrimary }]);
  };

  const handleRemoveEmployee = (employeeId: number) => {
    setAssignments(prev => prev.filter(a => a.employeeId !== employeeId));
  };

  const handleTogglePrimary = (employeeId: number) => {
    setAssignments(prev => prev.map(a => 
      a.employeeId === employeeId ? { ...a, isPrimary: !a.isPrimary } : a
    ));
  };

  const handleSave = () => {
    onUpdateAssignments(assignments);
    onClose();
  };

  const primaryCount = assignedEmployees.filter(a => a.isPrimary).length;
  const secondaryCount = assignedEmployees.filter(a => !a.isPrimary).length;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage Staff - ${shop.name}`} size="lg">
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-blue-500" />
            <span className="text-sm"><strong>{primaryCount}</strong> Primary</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-gray-500" />
            <span className="text-sm"><strong>{secondaryCount}</strong> Secondary</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          <TabButton
            active={activeTab === 'assigned'}
            onClick={() => setActiveTab('assigned')}
            badge={assignedEmployees.length}
          >
            Assigned Staff
          </TabButton>
          <TabButton
            active={activeTab === 'add'}
            onClick={() => setActiveTab('add')}
          >
            Add Staff
          </TabButton>
        </div>

        {/* Assigned Tab */}
        {activeTab === 'assigned' && (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {assignedEmployees.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No staff assigned to this shop</p>
                <button
                  onClick={() => setActiveTab('add')}
                  className="text-blue-600 hover:underline mt-2 text-sm"
                >
                  Add staff now
                </button>
              </div>
            ) : (
              assignedEmployees.map(({ employeeId, isPrimary, employee }) => (
                <div 
                  key={employeeId}
                  className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={employee.name} size="sm" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">{employee.name}</span>
                        {isPrimary && (
                          <Badge variant="info">
                            <Star className="w-3 h-3 mr-1" />
                            Primary
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        {employee.employmentType} • {employee.role} • {employee.company}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTogglePrimary(employeeId)}
                      className={`px-3 py-1 text-xs rounded-full transition-colors ${
                        isPrimary 
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {isPrimary ? 'Primary' : 'Make Primary'}
                    </button>
                    <button
                      onClick={() => handleRemoveEmployee(employeeId)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Add Staff Tab */}
        {activeTab === 'add' && (
          <div className="space-y-3">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search employees..."
            />
            
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {availableEmployees.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No available employees found</p>
                  <p className="text-xs mt-1">All eligible employees are already assigned</p>
                </div>
              ) : (
                availableEmployees.map(employee => (
                  <div 
                    key={employee.id}
                    className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={employee.name} size="sm" />
                      <div>
                        <span className="font-medium text-gray-900">{employee.name}</span>
                        <div className="text-xs text-gray-500">
                          {employee.employmentType} • {employee.role} • {employee.company}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddEmployee(employee.id, false)}
                        className="px-3 py-1.5 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Add Secondary
                      </button>
                      <button
                        onClick={() => handleAddEmployee(employee.id, true)}
                        className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Add Primary
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <AnimatedButton variant="secondary" onClick={onClose}>
            Cancel
          </AnimatedButton>
          <AnimatedButton icon={Check} onClick={handleSave}>
            Save Assignments
          </AnimatedButton>
        </div>
      </div>
    </Modal>
  );
}
// ============== SHOP REQUIREMENTS MODAL ==============

interface ShopRequirementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shop: Shop;
  onSave: (requirements: Shop['requirements'], specialRequests: Shop['specialRequests']) => void;
}

function ShopRequirementsModal({ isOpen, onClose, shop, onSave }: ShopRequirementsModalProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'special'>('daily');
  const [requirements, setRequirements] = useState<Shop['requirements']>([]);
  const [specialRequests, setSpecialRequests] = useState<Shop['specialRequests']>([]);
  const [expandedDay, setExpandedDay] = useState<DayOfWeek | null>(null);

  // Initialize when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setRequirements([...shop.requirements]);
      setSpecialRequests([...shop.specialRequests]);
      setActiveTab('daily');
      setExpandedDay(null);
    }
  }, [isOpen, shop]);

  // Updated to handle boolean values for isMandatory
const handleRequirementChange = (
  day: DayOfWeek, 
  field: string, 
  value: string | number | boolean
) => {
  setRequirements(prev => prev.map(req => 
    req.day === day 
      ? { ...req, [field]: value }
      : req
  ));
};

  const handleAddSpecialRequest = () => {
    const newRequest: SpecialShiftRequest = {
      id: `special-${Date.now()}`,
      day: 'Sat',
      shifts: [{ start: '06:30', end: '14:00' }],
    };
    setSpecialRequests(prev => [...prev, newRequest]);
  };

  const handleRemoveSpecialRequest = (id: string) => {
    setSpecialRequests(prev => prev.filter(r => r.id !== id));
  };

  const handleSpecialRequestChange = (id: string, field: 'day', value: DayOfWeek) => {
    setSpecialRequests(prev => prev.map(r => 
      r.id === id ? { ...r, [field]: value } : r
    ));
  };

  const handleAddShiftToRequest = (requestId: string) => {
    setSpecialRequests(prev => prev.map(r => 
      r.id === requestId 
        ? { ...r, shifts: [...r.shifts, { start: '10:00', end: '18:00' }] }
        : r
    ));
  };

  const handleRemoveShiftFromRequest = (requestId: string, shiftIndex: number) => {
    setSpecialRequests(prev => prev.map(r => 
      r.id === requestId 
        ? { ...r, shifts: r.shifts.filter((_, i) => i !== shiftIndex) }
        : r
    ));
  };

  const handleShiftChange = (requestId: string, shiftIndex: number, field: 'start' | 'end' | 'notes', value: string) => {
    setSpecialRequests(prev => prev.map(r => 
      r.id === requestId 
        ? { 
            ...r, 
            shifts: r.shifts.map((s, i) => i === shiftIndex ? { ...s, [field]: value } : s) 
          }
        : r
    ));
  };

  const handleSave = () => {
    onSave(requirements, specialRequests);
  };

  // Calculate weekly totals
  const weeklyTotals = useMemo(() => {
    return requirements.reduce((acc, req) => ({
      amShifts: acc.amShifts + req.amStaff,
      pmShifts: acc.pmShifts + req.pmStaff,
    }), { amShifts: 0, pmShifts: 0 });
  }, [requirements]);

  // Count mandatory days
  const mandatoryDaysCount = useMemo(() => {
    return requirements.filter(req => req.isMandatory).length;
  }, [requirements]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Schedule Requirements - ${shop.name}`} size="xl">
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
          <div className="text-sm">
            <span className="text-gray-600">Weekly AM Shifts:</span>
            <span className="font-bold text-blue-600 ml-2">{weeklyTotals.amShifts}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Weekly PM Shifts:</span>
            <span className="font-bold text-purple-600 ml-2">{weeklyTotals.pmShifts}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Special Requests:</span>
            <span className="font-bold text-orange-600 ml-2">{specialRequests.length}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-600">Mandatory Days:</span>
            <span className="font-bold text-red-600 ml-2">{mandatoryDaysCount}</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200 pb-2">
          <TabButton
            active={activeTab === 'daily'}
            onClick={() => setActiveTab('daily')}
            icon={Calendar}
          >
            Daily Requirements
          </TabButton>
          <TabButton
            active={activeTab === 'special'}
            onClick={() => setActiveTab('special')}
            badge={specialRequests.length}
          >
            Special Shifts
          </TabButton>
        </div>

        {/* Daily Requirements Tab */}
        {activeTab === 'daily' && (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {DAYS_OF_WEEK.map(day => {
              const req = requirements.find(r => r.day === day);
              if (!req) return null;
              
              const isExpanded = expandedDay === day;
              
              return (
                <div key={day} className={`border rounded-lg overflow-hidden ${req.isMandatory ? 'border-red-300 bg-red-50/30' : 'border-gray-200'}`}>
                  {/* Day Header */}
                  <button
                    onClick={() => setExpandedDay(isExpanded ? null : day)}
                    className={`w-full flex items-center justify-between p-3 hover:bg-gray-100 transition-colors ${req.isMandatory ? 'bg-red-50' : 'bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-900 w-12">{day}</span>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-blue-600">
                          AM: <strong>{req.amStaff}</strong> staff
                        </span>
                        <span className="text-purple-600">
                          PM: <strong>{req.pmStaff}</strong> staff
                        </span>
                        {req.isMandatory && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                            MANDATORY
                          </span>
                        )}
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="p-4 border-t border-gray-200 bg-white">
                      <div className="grid grid-cols-2 gap-6">
                        {/* AM Shift */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-blue-600 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            AM Shift
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <FormInput
                              label="Start"
                              type="time"
                              value={req.amStart || '06:00'}
                              onChange={(value) => handleRequirementChange(day, 'amStart', value)}
                            />
                            <FormInput
                              label="End"
                              type="time"
                              value={req.amEnd || '14:00'}
                              onChange={(value) => handleRequirementChange(day, 'amEnd', value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Staff Required
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRequirementChange(day, 'amStaff', Math.max(0, req.amStaff - 1))}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
                              >
                                -
                              </button>
                              <span className="w-12 text-center font-bold text-lg">{req.amStaff}</span>
                              <button
                                onClick={() => handleRequirementChange(day, 'amStaff', req.amStaff + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* PM Shift */}
                        <div className="space-y-3">
                          <h4 className="font-medium text-purple-600 flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            PM Shift
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            <FormInput
                              label="Start"
                              type="time"
                              value={req.pmStart || '14:00'}
                              onChange={(value) => handleRequirementChange(day, 'pmStart', value)}
                            />
                            <FormInput
                              label="End"
                              type="time"
                              value={req.pmEnd || '21:00'}
                              onChange={(value) => handleRequirementChange(day, 'pmEnd', value)}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Staff Required
                            </label>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleRequirementChange(day, 'pmStaff', Math.max(0, req.pmStaff - 1))}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
                              >
                                -
                              </button>
                              <span className="w-12 text-center font-bold text-lg">{req.pmStaff}</span>
                              <button
                                onClick={() => handleRequirementChange(day, 'pmStaff', req.pmStaff + 1)}
                                className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-lg hover:bg-gray-200"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Mandatory Checkbox */}
                      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-200">
                        <input
                          type="checkbox"
                          id={`mandatory-${req.day}`}
                          checked={req.isMandatory || false}
                          onChange={(e) => handleRequirementChange(day, 'isMandatory', e.target.checked)}
                          className="w-5 h-5 text-red-600 rounded focus:ring-red-500 cursor-pointer"
                        />
                        <label 
                          htmlFor={`mandatory-${req.day}`}
                          className="text-sm font-medium text-gray-700 cursor-pointer select-none"
                        >
                          Mandatory Staffing
                        </label>
                        <span className="text-xs text-gray-500">
                          (Roster generator will always maintain this exact headcount)
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Special Shifts Tab */}
        {activeTab === 'special' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Define custom shift patterns for specific days (e.g., Saturday split shifts)
              </p>
              <AnimatedButton size="sm" icon={Plus} onClick={handleAddSpecialRequest}>
                Add Special Shift
              </AnimatedButton>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {specialRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No special shift patterns defined</p>
                  <p className="text-xs mt-1">Add custom shifts for days with unique requirements</p>
                </div>
              ) : (
                specialRequests.map(request => (
                  <div key={request.id} className="border border-gray-200 rounded-lg p-4 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <select
                          value={request.day}
                          onChange={(e) => handleSpecialRequestChange(request.id, 'day', e.target.value as DayOfWeek)}
                          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm font-medium"
                        >
                          {DAYS_OF_WEEK.map(day => (
                            <option key={day} value={day}>{day}</option>
                          ))}
                        </select>
                        <Badge variant="warning">{request.shifts.length} shift(s)</Badge>
                      </div>
                      <button
                        onClick={() => handleRemoveSpecialRequest(request.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Shifts */}
                    <div className="space-y-2">
                      {request.shifts.map((shift, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                          <span className="text-xs text-gray-500 w-6">#{index + 1}</span>
                          <input
                            type="time"
                            value={shift.start}
                            onChange={(e) => handleShiftChange(request.id, index, 'start', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <span className="text-gray-400">to</span>
                          <input
                            type="time"
                            value={shift.end}
                            onChange={(e) => handleShiftChange(request.id, index, 'end', e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          <input
                            type="text"
                            value={shift.notes || ''}
                            onChange={(e) => handleShiftChange(request.id, index, 'notes', e.target.value)}
                            placeholder="Notes..."
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                          />
                          {request.shifts.length > 1 && (
                            <button
                              onClick={() => handleRemoveShiftFromRequest(request.id, index)}
                              className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleAddShiftToRequest(request.id)}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Add another shift
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Example hint */}
            <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
              <strong>Example:</strong> For Siġġiewi on Saturday, you might add:
              <ul className="list-disc list-inside mt-1 text-xs">
                <li>Shift 1: 06:30 - 14:00</li>
                <li>Shift 2: 10:00 - 21:30</li>
              </ul>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <AnimatedButton variant="secondary" onClick={onClose}>
            Cancel
          </AnimatedButton>
          <AnimatedButton icon={Check} onClick={handleSave}>
            Save Requirements
          </AnimatedButton>
        </div>
      </div>
    </Modal>
  );
}

export default ShopsView;
