// frontend/src/components/EmployeesView.tsx
import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  Users, Edit2, Trash2, Mail, Shield, UserPlus,
  Filter, Briefcase, CreditCard, Phone as PhoneIcon, Star
} from 'lucide-react';
import { 
  GlassCard, Avatar, Badge, SearchInput, Modal, 
  FormInput, FormSelect, TabButton, 
  AnimatedButton, ToggleButtonGroup, EmptyState, StatCard,
  FormCheckbox, useDebounce, ConfirmDialog
} from './ui';
import type { 
  Employee, Shop, PayScale, EmploymentType, EmployeeRole, Company 
} from '../types';
import { DEFAULT_PAY_SCALES, DEFAULT_ALLOWANCES } from '../types';

// ============== TYPES ==============

interface EmployeesViewProps {
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  shops: Shop[];
  setShops: React.Dispatch<React.SetStateAction<Shop[]>>;
}

type CompanyFilter = 'all' | 'CMZ' | 'CS' | 'Both';
type EmploymentFilter = 'all' | 'full-time' | 'part-time';

// ============== MAIN COMPONENT ==============

const EmployeesView = memo(function EmployeesView({ 
  employees = [], 
  setEmployees,
  shops = [],
  setShops
}: EmployeesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [companyFilter, setCompanyFilter] = useState<CompanyFilter>('all');
  const [employmentFilter, setEmploymentFilter] = useState<EmploymentFilter>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesSearch = emp.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                           emp.email.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCompany = companyFilter === 'all' || emp.company === companyFilter;
      const matchesEmployment = employmentFilter === 'all' || emp.employmentType === employmentFilter;
      return matchesSearch && matchesCompany && matchesEmployment;
    });
  }, [employees, debouncedSearch, companyFilter, employmentFilter]);

  const stats = useMemo(() => ({
    total: employees.length,
    active: employees.filter(e => !e.excludeFromRoster).length,
    fullTime: employees.filter(e => e.employmentType === 'full-time').length,
    partTime: employees.filter(e => e.employmentType === 'part-time').length,
  }), [employees]);

  const handleDeleteEmployee = useCallback(() => {
    if (!selectedEmployee) return;
    setEmployees(prev => prev.filter(emp => emp.id !== selectedEmployee.id));
    setShowDeleteConfirm(false);
    setSelectedEmployee(null);
  }, [selectedEmployee, setEmployees]);

const handleSaveEmployee = useCallback(async (employeeData: Partial<Employee>) => {
  let savedEmployeeId: number;
  
  if (selectedEmployee) {
    // Update existing employee
    savedEmployeeId = selectedEmployee.id;
    const updatedEmployee = { ...selectedEmployee, ...employeeData };
    
    // Update backend
    try {
      await fetch(`http://localhost:3001/api/employees/${savedEmployeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedEmployee),
      });
    } catch (err) {
      console.error('Failed to update employee:', err);
    }
    
    setEmployees(prev => prev.map(emp => 
      emp.id === selectedEmployee.id ? updatedEmployee : emp
    ));
  } else {
    // Create new employee
    savedEmployeeId = Date.now();
    const newEmployee: Employee = {
      id: savedEmployeeId,
      name: employeeData.name || 'New Employee',
      email: employeeData.email || '',
      phone: employeeData.phone,
      company: employeeData.company || 'CMZ',
      employmentType: employeeData.employmentType || 'full-time',
      role: employeeData.role || 'staff',
      weeklyHours: employeeData.weeklyHours || 40,
      payScaleId: employeeData.payScaleId || 'scale1',
      allowanceIds: employeeData.allowanceIds || [],
      excludeFromRoster: employeeData.excludeFromRoster || false,
      hasSystemAccess: employeeData.hasSystemAccess || false,
      systemRole: employeeData.systemRole,
      idNumber: employeeData.idNumber,
      taxNumber: employeeData.taxNumber,
      ssnNumber: employeeData.ssnNumber,
      tcnNumber: employeeData.tcnNumber,
      iban: employeeData.iban,
      primaryShopId: employeeData.primaryShopId,
      secondaryShopIds: employeeData.secondaryShopIds || [],
    };
    
    // Create in backend
    try {
      const res = await fetch('http://localhost:3001/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEmployee),
      });
      const saved = await res.json();
      if (saved.id) savedEmployeeId = saved.id; // Use backend-generated ID if available
    } catch (err) {
      console.error('Failed to create employee:', err);
    }
    
    setEmployees(prev => [...prev, { ...newEmployee, id: savedEmployeeId }]);
  }
  
  // Sync shop assignments
  const primaryShopId = employeeData.primaryShopId;
  const secondaryShopIds = employeeData.secondaryShopIds || [];
  
  setShops(prev => prev.map(shop => {
    let newAssignments = (shop.assignedEmployees || []).filter(
      a => a.employeeId !== savedEmployeeId
    );
    
    if (shop.id === primaryShopId) {
      newAssignments.push({ employeeId: savedEmployeeId, isPrimary: true });
    } else if (secondaryShopIds.includes(shop.id)) {
      newAssignments.push({ employeeId: savedEmployeeId, isPrimary: false });
    }
    
    return { ...shop, assignedEmployees: newAssignments };
  }));
  
  setShowAddModal(false);
  setShowEditModal(false);
  setSelectedEmployee(null);
}, [selectedEmployee, setEmployees, setShops]);


  const getEmployeeShops = useCallback((employee: Employee) => {
    const primaryShop = shops.find(s => s.id === employee.primaryShopId);
    const secondaryShops = shops.filter(s => (employee.secondaryShopIds || []).includes(s.id));
    return { primaryShop, secondaryShops };
  }, [shops]);

  const getPayScale = useCallback((payScaleId: string) => {
    return DEFAULT_PAY_SCALES.find(ps => ps.id === payScaleId);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employee Management</h1>
          <p className="text-gray-600 mt-1">Manage employees, assignments, and pay scales</p>
        </div>
        <AnimatedButton 
          icon={UserPlus} 
          onClick={() => {
            setSelectedEmployee(null);
            setShowAddModal(true);
          }}
        >
          Add Employee
        </AnimatedButton>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Employees" value={stats.total} gradient="from-blue-500 to-blue-600" />
        <StatCard icon={Users} label="Active in Roster" value={stats.active} gradient="from-green-500 to-emerald-500" />
        <StatCard icon={Briefcase} label="Full-Time" value={stats.fullTime} gradient="from-purple-500 to-purple-600" />
        <StatCard icon={Briefcase} label="Part-Time" value={stats.partTime} gradient="from-orange-500 to-orange-600" />
      </div>

      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search employees..." />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
          </div>
          <ToggleButtonGroup
            value={companyFilter}
            onChange={setCompanyFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'CMZ', label: 'CMZ' },
              { value: 'CS', label: 'CS' },
              { value: 'Both', label: 'Both' },
            ]}
          />
          <ToggleButtonGroup
            value={employmentFilter}
            onChange={setEmploymentFilter}
            options={[
              { value: 'all', label: 'All' },
              { value: 'full-time', label: 'Full-Time' },
              { value: 'part-time', label: 'Part-Time' },
            ]}
          />
        </div>
      </GlassCard>

      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No employees found"
          description={searchTerm ? "Try adjusting your search or filters" : "Add your first employee to get started"}
          action={
            <AnimatedButton icon={UserPlus} onClick={() => setShowAddModal(true)}>
              Add Employee
            </AnimatedButton>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredEmployees.map(employee => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              shops={getEmployeeShops(employee)}
              payScale={getPayScale(employee.payScaleId)}
              onEdit={() => {
                setSelectedEmployee(employee);
                setShowEditModal(true);
              }}
              onDelete={() => {
                setSelectedEmployee(employee);
                setShowDeleteConfirm(true);
              }}
            />
          ))}
        </div>
      )}

      <EmployeeFormModal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedEmployee(null);
        }}
        onSave={handleSaveEmployee}
        employee={selectedEmployee}
        shops={shops}
      />

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setSelectedEmployee(null);
        }}
        onConfirm={handleDeleteEmployee}
        title="Delete Employee"
        message={`Are you sure you want to delete "${selectedEmployee?.name}"? This action cannot be undone.`}
        variant="danger"
        confirmLabel="Delete"
      />
    </div>
  );
});

// ============== EMPLOYEE CARD ==============

interface EmployeeCardProps {
  employee: Employee;
  shops: { primaryShop?: Shop; secondaryShops: Shop[] };
  payScale?: PayScale;
  onEdit: () => void;
  onDelete: () => void;
}

function EmployeeCard({ employee, shops, payScale, onEdit, onDelete }: EmployeeCardProps) {
  const { primaryShop, secondaryShops } = shops;

  return (
    <GlassCard className="p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Avatar name={employee.name} size="md" />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-gray-900">{employee.name}</h3>
              {employee.excludeFromRoster && <Badge variant="warning">Excluded</Badge>}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={employee.company === 'CMZ' ? 'purple' : employee.company === 'CS' ? 'warning' : 'info'}>
                {employee.company}
              </Badge>
              <Badge variant={employee.employmentType === 'full-time' ? 'success' : 'default'}>
                {employee.employmentType}
              </Badge>
              <Badge variant="default">{employee.role}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1 mb-3 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          <span className="truncate">{employee.email}</span>
        </div>
        {employee.phone && (
          <div className="flex items-center gap-2">
            <PhoneIcon className="w-4 h-4 text-gray-400" />
            <span>{employee.phone}</span>
          </div>
        )}
      </div>

      <div className="mb-3">
        <div className="text-xs font-medium text-gray-500 mb-1">Assigned Shops</div>
        <div className="flex flex-wrap gap-1">
          {primaryShop && (
            <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 rounded-full">
              <Star className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-blue-700">{primaryShop.name}</span>
            </div>
          )}
          {secondaryShops.map(shop => (
            <div key={shop.id} className="px-2 py-1 bg-gray-100 rounded-full">
              <span className="text-xs text-gray-600">{shop.name}</span>
            </div>
          ))}
          {!primaryShop && secondaryShops.length === 0 && (
            <span className="text-xs text-gray-400 italic">No shops assigned</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 p-2 bg-gray-50 rounded-lg text-sm">
        <div>
          <div className="text-gray-500 text-xs">Weekly Hours</div>
          <div className="font-semibold">{employee.weeklyHours}h</div>
        </div>
        <div>
          <div className="text-gray-500 text-xs">Pay Scale</div>
          <div className="font-semibold">{payScale?.name || 'N/A'}</div>
        </div>
      </div>

      {employee.hasSystemAccess && (
        <div className="flex items-center gap-2 mb-3 text-sm">
          <Shield className="w-4 h-4 text-green-500" />
          <span className="text-gray-600">System Access: <strong>{employee.systemRole}</strong></span>
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-100">
        <AnimatedButton variant="ghost" size="sm" icon={Edit2} onClick={onEdit}>
          Edit
        </AnimatedButton>
        <div className="flex-1" />
        <AnimatedButton variant="ghost" size="sm" icon={Trash2} onClick={onDelete}>
          <span className="sr-only">Delete</span>
        </AnimatedButton>
      </div>
    </GlassCard>
  );
}

// ============== EMPLOYEE FORM MODAL ==============

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (employee: Partial<Employee>) => void;
  employee: Employee | null;
  shops: Shop[];
}

function EmployeeFormModal({ isOpen, onClose, onSave, employee, shops }: EmployeeFormModalProps) {
  const [activeTab, setActiveTab] = useState<'basic' | 'employment' | 'personal' | 'access'>('basic');
  
  const [formData, setFormData] = useState<Partial<Employee>>({
    name: '',
    email: '',
    phone: '',
    company: 'CMZ',
    employmentType: 'full-time',
    role: 'staff',
    weeklyHours: 40,
    payScaleId: 'scale1',
    allowanceIds: [],
    excludeFromRoster: false,
    hasSystemAccess: false,
    systemRole: undefined,
    idNumber: '',
    taxNumber: '',
    ssnNumber: '',
    tcnNumber: '',
    iban: '',
    primaryShopId: undefined,
    secondaryShopIds: [],
  });

  React.useEffect(() => {
    if (isOpen) {
      if (employee) {
        setFormData({
          name: employee.name,
          email: employee.email,
          phone: employee.phone || '',
          company: employee.company,
          employmentType: employee.employmentType,
          role: employee.role,
          weeklyHours: employee.weeklyHours,
          payScaleId: employee.payScaleId,
          allowanceIds: employee.allowanceIds,
          excludeFromRoster: employee.excludeFromRoster,
          hasSystemAccess: employee.hasSystemAccess,
          systemRole: employee.systemRole,
          idNumber: employee.idNumber || '',
          taxNumber: employee.taxNumber || '',
          ssnNumber: employee.ssnNumber || '',
          tcnNumber: employee.tcnNumber || '',
          iban: employee.iban || '',
          primaryShopId: employee.primaryShopId,
          secondaryShopIds: employee.secondaryShopIds,
        });
      } else {
        setFormData({
          name: '', email: '', phone: '', company: 'CMZ', employmentType: 'full-time',
          role: 'staff', weeklyHours: 40, payScaleId: 'scale1', allowanceIds: [],
          excludeFromRoster: false, hasSystemAccess: false, systemRole: undefined,
          idNumber: '', taxNumber: '', ssnNumber: '', tcnNumber: '', iban: '',
          primaryShopId: undefined, secondaryShopIds: [],
        });
      }
      setActiveTab('basic');
    }
  }, [isOpen, employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) return;
    onSave(formData);
  };

  const updateField = <K extends keyof Employee>(field: K, value: Employee[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const availableShops = useMemo(() => {
    if (formData.company === 'Both') return shops;
    return shops.filter(s => s.company === formData.company || s.company === 'Both');
  }, [shops, formData.company]);

  const toggleSecondaryShop = (shopId: number) => {
    setFormData(prev => {
      const current = prev.secondaryShopIds || [];
      if (current.includes(shopId)) {
        return { ...prev, secondaryShopIds: current.filter(id => id !== shopId) };
      } else {
        return { ...prev, secondaryShopIds: [...current, shopId] };
      }
    });
  };

  const toggleAllowance = (allowanceId: string) => {
    setFormData(prev => {
      const current = prev.allowanceIds || [];
      if (current.includes(allowanceId)) {
        return { ...prev, allowanceIds: current.filter(id => id !== allowanceId) };
      } else {
        return { ...prev, allowanceIds: [...current, allowanceId] };
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={employee ? 'Edit Employee' : 'Add New Employee'} size="lg">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg">
          <TabButton active={activeTab === 'basic'} onClick={() => setActiveTab('basic')} icon={Users}>Basic Info</TabButton>
          <TabButton active={activeTab === 'employment'} onClick={() => setActiveTab('employment')} icon={Briefcase}>Employment</TabButton>
          <TabButton active={activeTab === 'personal'} onClick={() => setActiveTab('personal')} icon={CreditCard}>Personal</TabButton>
          <TabButton active={activeTab === 'access'} onClick={() => setActiveTab('access')} icon={Shield}>Access</TabButton>
        </div>

        <div className="min-h-[300px]">
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <FormInput label="Full Name" value={formData.name || ''} onChange={(value) => updateField('name', value)} placeholder="Enter full name" required />
              <FormInput label="Email" type="email" value={formData.email || ''} onChange={(value) => updateField('email', value)} placeholder="Enter email address" />
              <FormInput label="Phone" type="tel" value={formData.phone || ''} onChange={(value) => updateField('phone', value)} placeholder="Enter phone number" />
              <FormSelect
                label="Company"
                value={formData.company || 'CMZ'}
                onChange={(value) => updateField('company', value as Company)}
                options={[
                  { value: 'CMZ', label: 'CMZ' },
                  { value: 'CS', label: 'CS' },
                  { value: 'Both', label: 'Both Companies' },
                ]}
              />
              <FormSelect
                label="Role"
                value={formData.role || 'staff'}
                onChange={(value) => updateField('role', value as EmployeeRole)}
                options={[
                  { value: 'staff', label: 'Staff' },
                  { value: 'supervisor', label: 'Supervisor' },
                  { value: 'manager', label: 'Manager' },
                ]}
              />
            </div>
          )}

          {activeTab === 'employment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormSelect
                  label="Employment Type"
                  value={formData.employmentType || 'full-time'}
                  onChange={(value) => updateField('employmentType', value as EmploymentType)}
                  options={[
                    { value: 'full-time', label: 'Full-Time' },
                    { value: 'part-time', label: 'Part-Time' },
                  ]}
                />
                <FormInput label="Weekly Hours" type="number" value={formData.weeklyHours || 40} onChange={(value) => updateField('weeklyHours', parseInt(value) || 0)} placeholder="40" />
              </div>
              <FormSelect
                label="Pay Scale"
                value={formData.payScaleId || 'scale1'}
                onChange={(value) => updateField('payScaleId', value)}
                options={DEFAULT_PAY_SCALES.map(ps => ({ value: ps.id, label: `${ps.name} - €${ps.hourlyRate.toFixed(2)}/hr` }))}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Allowances & Bonuses</label>
                <div className="grid grid-cols-1 gap-2">
                  {DEFAULT_ALLOWANCES.map(allowance => (
                    <label key={allowance.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                      <input type="checkbox" checked={formData.allowanceIds?.includes(allowance.id) || false} onChange={() => toggleAllowance(allowance.id)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{allowance.name}</div>
                        <div className="text-xs text-gray-500">{allowance.description}</div>
                      </div>
                      <div className="text-sm font-medium text-gray-700">
                        {allowance.type === 'fixed' && `€${allowance.value}/mo`}
                        {allowance.type === 'hourly' && `€${allowance.value}/hr`}
                        {allowance.type === 'percentage' && `${allowance.value}%`}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="pt-4 border-t">
                <label className="block text-sm font-medium text-gray-700 mb-2">Shop Assignments</label>
                <FormSelect
                  label="Primary Shop"
                  value={formData.primaryShopId?.toString() || ''}
                  onChange={(value) => updateField('primaryShopId', value ? parseInt(value) : undefined)}
                  options={[{ value: '', label: 'No primary shop' }, ...availableShops.map(shop => ({ value: shop.id.toString(), label: `${shop.name} (${shop.company})` }))]}
                />
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Shops</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                    {availableShops.filter(s => s.id !== formData.primaryShopId).map(shop => (
                      <label key={shop.id} className="flex items-center gap-2 p-2 bg-white rounded-lg cursor-pointer hover:bg-blue-50 transition-colors border border-gray-200">
                        <input type="checkbox" checked={formData.secondaryShopIds?.includes(shop.id) || false} onChange={() => toggleSecondaryShop(shop.id)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">{shop.name}</div>
                          <div className="text-xs text-gray-500">{shop.company}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <FormCheckbox label="Exclude from Auto-Roster Generation" checked={formData.excludeFromRoster || false} onChange={(checked) => updateField('excludeFromRoster', checked)} description="Enable this for managers or employees who should only be manually assigned to shifts" />
              </div>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="space-y-4">
              <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
                Personal information is sensitive. Ensure proper data protection compliance.
              </div>
              <FormInput label="ID Number" value={formData.idNumber || ''} onChange={(value) => updateField('idNumber', value)} placeholder="National ID number" />
              <FormInput label="Tax Number" value={formData.taxNumber || ''} onChange={(value) => updateField('taxNumber', value)} placeholder="Tax identification number" />
              <FormInput label="Social Security Number" value={formData.ssnNumber || ''} onChange={(value) => updateField('ssnNumber', value)} placeholder="Social security number" />
              <FormInput label="TCN Number (if applicable)" value={formData.tcnNumber || ''} onChange={(value) => updateField('tcnNumber', value)} placeholder="Third-country national number" />
              <FormInput label="IBAN" value={formData.iban || ''} onChange={(value) => updateField('iban', value)} placeholder="Bank account IBAN" />
              <FormInput
                label="TCN Expiry Date"
                type="date"
                value={formData.tcnExpiry || ''}
                onChange={(value) => updateField('tcnExpiry', value)}
              />
            </div>
          )}

          {activeTab === 'access' && (
            <div className="space-y-4">
              <FormCheckbox
                label="Grant System Access"
                checked={formData.hasSystemAccess || false}
                onChange={(checked) => {
                  updateField('hasSystemAccess', checked);
                  if (!checked) updateField('systemRole', undefined);
                }}
                description="Allow this employee to log into the roster system"
              />
              {formData.hasSystemAccess && (
                <FormSelect
                  label="System Role"
                  value={formData.systemRole || 'employee'}
                  onChange={(value) => updateField('systemRole', value as 'admin' | 'manager' | 'employee')}
                  options={[
                    { value: 'employee', label: 'Employee - View own roster, request leave/swaps' },
                    { value: 'manager', label: 'Manager - Approve requests, view team rosters' },
                    { value: 'admin', label: 'Admin - Full system access' },
                  ]}
                />
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 mt-4 border-t">
          <AnimatedButton variant="secondary" onClick={onClose}>Cancel</AnimatedButton>
          <AnimatedButton type="submit" icon={Users}>{employee ? 'Save Changes' : 'Create Employee'}</AnimatedButton>
        </div>
      </form>
    </Modal>
  );
}

export default EmployeesView;
