import { useState, useEffect } from 'react';
import { X, Save, Users, RefreshCw, AlertCircle, MapPin, Calendar, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const API_BASE_URL = 'http://localhost:3001/api';

interface Shop {
  id: number;
  name: string;
  company: 'CMZ' | 'CS';
}

interface Employee {
  id: number;
  name: string;
  company: 'CMZ' | 'CS';
  primaryShop: number;
  secondaryShops: number[];
  weekdayTarget: number;
  maxWeekday: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  weekStart: string;
  shops: Shop[];
}

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
type AvailabilityType = 'off' | 'am' | 'pm' | 'full';

interface DailyAvailability {
  type: AvailabilityType;
  shopId?: number;
}

const SHIFT_TYPES = [
  { value: 'off', label: 'OFF', color: 'bg-gray-100 text-gray-600 hover:bg-gray-200' },
  { value: 'am', label: 'AM', color: 'bg-sky-100 text-sky-700 hover:bg-sky-200' },
  { value: 'pm', label: 'PM', color: 'bg-violet-100 text-violet-700 hover:bg-violet-200' },
  { value: 'full', label: 'FULL', color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
];

export default function AvailabilityModal({ isOpen, onClose, weekStart, shops }: Props) {
  const [partTimeEmployees, setPartTimeEmployees] = useState<Employee[]>([]);
  const [availability, setAvailability] = useState<Record<string, DailyAvailability>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
      fetchExistingAvailability();
    }
  }, [isOpen, weekStart]);

  const fetchEmployees = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Fetching employees from ROSTERPRO backend...');
      const response = await fetch(`${API_BASE_URL}/employees`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`✅ Loaded ${data.length} employees from backend`);
      
      if (!Array.isArray(data)) {
        throw new Error('Expected array of employees from /api/employees');
      }
      
      const partTimers = data.filter((emp: Employee) => emp.weekdayTarget < 40);
      setPartTimeEmployees(partTimers);
      
      console.log(`📋 Found ${partTimers.length} part-time employees:`, 
        partTimers.map((e: Employee) => `${e.name} (${e.weekdayTarget}h target)`));
      
    } catch (err: any) {
      console.error('❌ Failed to fetch employees:', err);
      setError(`Failed to load employees: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAvailability = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/availability?weekStart=${weekStart}`);
      if (response.ok) {
        const data = await response.json();
        if (data.availability) {
          const availabilityMap: Record<string, DailyAvailability> = {};
          data.availability.forEach((item: any) => {
            const dayIndex = DAYS.indexOf(item.day);
            if (dayIndex !== -1) {
              availabilityMap[`${item.employee_id}-${dayIndex}`] = {
                type: item.availability_type,
                shopId: item.preferred_shop_id
              };
            }
          });
          setAvailability(availabilityMap);
          console.log('✅ Loaded existing availability for this week');
        }
      }
    } catch (err) {
      console.log('ℹ️ No existing availability found (normal for new weeks)');
    }
  };

  const getAvailability = (empId: number, dayIndex: number): DailyAvailability => {
    return availability[`${empId}-${dayIndex}`] || { type: 'off' };
  };

  const setAvailabilityFor = (empId: number, dayIndex: number, type: AvailabilityType, defaultShopId: number) => {
    setAvailability(prev => {
      const current = prev[`${empId}-${dayIndex}`] || { type: 'off' };
      return {
        ...prev,
        [`${empId}-${dayIndex}`]: { 
          type, 
          shopId: type === 'off' ? undefined : (current.shopId || defaultShopId)
        }
      };
    });
  };

  // 🆕 NEW: Set availability for entire week
  const setWeekAvailability = (empId: number, type: AvailabilityType, shopId: number) => {
    setAvailability(prev => {
      const newAvailability = { ...prev };
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        newAvailability[`${empId}-${dayIndex}`] = {
          type,
          shopId: type === 'off' ? undefined : shopId
        };
      }
      return newAvailability;
    });
  };

  const setShopFor = (empId: number, dayIndex: number, shopId: number) => {
    setAvailability(prev => {
      const current = prev[`${empId}-${dayIndex}`] || { type: 'off' };
      return {
        ...prev,
        [`${empId}-${dayIndex}`]: { ...current, shopId }
      };
    });
  };

  // 🆕 NEW: Set shop for entire week (only affects non-off days)
  const setWeekShop = (empId: number, shopId: number) => {
    setAvailability(prev => {
      const newAvailability = { ...prev };
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const current = prev[`${empId}-${dayIndex}`];
        if (current && current.type !== 'off') {
          newAvailability[`${empId}-${dayIndex}`] = { ...current, shopId };
        }
      }
      return newAvailability;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    
    const availabilityData = Object.entries(availability)
      .filter(([_, data]) => data.type !== 'off')
      .map(([key, data]) => {
        const [empId, dayIndex] = key.split('-');
        const employee = partTimeEmployees.find(e => e.id === parseInt(empId));
        const shop = shops.find(s => s.id === data.shopId);
        return {
          employee_id: parseInt(empId),
          employee_name: employee?.name,
          company: employee?.company,
          day: DAYS[parseInt(dayIndex)],
          day_index: parseInt(dayIndex),
          availability_type: data.type,
          preferred_shop_id: data.shopId,
          preferred_shop_name: shop?.name,
          week_start: weekStart
        };
      });

    console.log('💾 Shop-specific availability data:', availabilityData);
    console.log(`🎯 Example - Rose at non-primary shops:`, availabilityData.filter(item => 
      item.employee_name === 'Rose' && item.preferred_shop_name !== 'Carters'
    ));
    
    try {
      const response = await fetch(`${API_BASE_URL}/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekStart, availability: availabilityData })
      });

      if (response.ok) {
        console.log('✅ Shop-specific availability saved to backend');
        alert(`✅ Availability saved successfully!\n\n${availabilityData.length} entries saved with shop preferences.`);
      } else {
        console.log('ℹ️ Backend availability endpoint not ready yet');
        alert(`📋 Availability captured for ${availabilityData.length} entries!\n\nCheck console (F12) to see data structure.`);
      }
      onClose();
    } catch (err) {
      console.error('❌ Save failed:', err);
      alert(`📋 Availability captured for ${availabilityData.length} entries!\n\nData logged to console.`);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const getShopOptions = (employee: Employee) => {
    const companyShops = shops.filter(s => s.company === employee.company);
    const assignedShops = companyShops.filter(s => 
      s.id === employee.primaryShop || employee.secondaryShops.includes(s.id)
    );
    const otherShops = companyShops.filter(s => 
      s.id !== employee.primaryShop && !employee.secondaryShops.includes(s.id)
    );
    return { assignedShops, otherShops };
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white/95 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Part-Timer Availability & Shop Preferences</h2>
                <p className="text-gray-500">Week of {weekStart} • Quick week setup + daily overrides</p>
              </div>
            </div>
            <button onClick={onClose} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {loading && (
              <div className="flex items-center justify-center py-20">
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                  <p className="font-medium text-gray-700">Loading employees from ROSTERPRO backend...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                  <h3 className="font-bold text-rose-900">Failed to Load Employees</h3>
                </div>
                <p className="text-rose-700">{error}</p>
              </div>
            )}

            {!loading && !error && partTimeEmployees.length > 0 && (
              <div className="space-y-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Quick Week Setup + Daily Control</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    <strong>New!</strong> Set the entire week at once, then customize individual days as needed. 
                    Example: Set Rose to "Full Week at Zabbar", then change Tuesday to "AM at Carters".
                  </p>
                </div>

                {partTimeEmployees.map((employee) => {
                  const { assignedShops, otherShops } = getShopOptions(employee);
                  
                  return (
                    <div key={employee.id} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-sm">
                      {/* Employee Header */}
                      <div className="flex items-center gap-4 mb-6">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg",
                          employee.company === 'CMZ' 
                            ? 'bg-gradient-to-br from-blue-500 to-indigo-600' 
                            : 'bg-gradient-to-br from-emerald-500 to-teal-600'
                        )}>
                          {employee.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                            {employee.name}
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full border border-amber-200 font-medium">
                              Part-Time ({employee.weekdayTarget}h)
                            </span>
                          </h3>
                          <p className="text-sm text-gray-500">
                            <span className={cn(
                              "font-semibold",
                              employee.company === 'CMZ' ? 'text-blue-600' : 'text-emerald-600'
                            )}>
                              {employee.company}
                            </span> • Usually: {shops.find(s => s.id === employee.primaryShop)?.name}
                          </p>
                        </div>
                      </div>

                      {/* 🆕 WEEK-WIDE CONTROLS */}
                      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-violet-600" />
                          <span className="font-bold text-violet-900 text-sm">Quick Week Setup</span>
                          <span className="text-xs text-violet-600 ml-auto">Apply to all 7 days</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          {/* Week Shift Type */}
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-2 block">Week Shift Pattern</label>
                            <div className="grid grid-cols-4 gap-2">
                              {SHIFT_TYPES.map((shiftType) => (
                                <button
                                  key={shiftType.value}
                                  onClick={() => setWeekAvailability(employee.id, shiftType.value as AvailabilityType, employee.primaryShop)}
                                  className={cn(
                                    "px-3 py-2 rounded-lg text-xs font-bold transition-all border hover:scale-105",
                                    shiftType.color
                                  )}
                                >
                                  {shiftType.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Week Shop Selection */}
                          <div>
                            <label className="text-xs font-medium text-gray-600 mb-2 block">Week Shop Location</label>
                            <div className="relative">
                              <MapPin className="w-3 h-3 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 z-10" />
                              <select
                                onChange={(e) => setWeekShop(employee.id, parseInt(e.target.value))}
                                className="w-full pl-8 pr-3 py-2.5 text-sm font-medium bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none cursor-pointer hover:bg-gray-50 transition-colors"
                              >
                                <option value="">Select shop for week...</option>
                                <optgroup label="📍 Assigned Shops">
                                  {assignedShops.map(shop => (
                                    <option key={shop.id} value={shop.id}>
                                      {shop.name} {shop.id === employee.primaryShop ? '(Main)' : '(Secondary)'}
                                    </option>
                                  ))}
                                </optgroup>
                                {otherShops.length > 0 && (
                                  <optgroup label="🔄 Other Locations">
                                    {otherShops.map(shop => (
                                      <option key={shop.id} value={shop.id}>{shop.name} (Special)</option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Daily Grid */}
                      <div className="bg-gray-50/50 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">Daily Overrides</span>
                          <span className="text-xs text-gray-500">Customize individual days below</span>
                        </div>
                        <div className="grid grid-cols-7 gap-3">
                          {DAYS.map((day, dayIndex) => {
                            const currentData = getAvailability(employee.id, dayIndex);
                            const isOff = currentData.type === 'off';
                            const selectedShop = shops.find(s => s.id === currentData.shopId);

                            return (
                              <div key={dayIndex} className="text-center">
                                <p className="text-xs font-bold text-gray-600 mb-3 uppercase tracking-wide">{day}</p>
                                <div className="space-y-2 mb-3">
                                  {SHIFT_TYPES.map((shiftType) => {
                                    const isSelected = currentData.type === shiftType.value;
                                    return (
                                      <button
                                        key={shiftType.value}
                                        onClick={() => setAvailabilityFor(employee.id, dayIndex, shiftType.value as AvailabilityType, employee.primaryShop)}
                                        className={cn(
                                          "w-full px-2 py-2 rounded-lg text-xs font-bold transition-all border",
                                          isSelected
                                            ? shiftType.color + ' ring-2 ring-offset-1 ring-current shadow-sm scale-105'
                                            : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200 hover:scale-105'
                                        )}
                                      >
                                        {shiftType.label}
                                      </button>
                                    );
                                  })}
                                </div>
                                {!isOff && (
                                  <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                  >
                                    <div className="relative">
                                      <MapPin className="w-3 h-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2 z-10" />
                                      <select
                                        value={currentData.shopId || employee.primaryShop}
                                        onChange={(e) => setShopFor(employee.id, dayIndex, parseInt(e.target.value))}
                                        className="w-full pl-6 pr-2 py-2 text-xs font-medium bg-white border border-gray-300 rounded-lg text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer hover:bg-gray-50 transition-colors"
                                      >
                                        <optgroup label="📍 Assigned">
                                          {assignedShops.map(shop => (
                                            <option key={shop.id} value={shop.id}>
                                              {shop.name} {shop.id === employee.primaryShop ? '(Main)' : ''}
                                            </option>
                                          ))}
                                        </optgroup>
                                        {otherShops.length > 0 && (
                                          <optgroup label="🔄 Other">
                                            {otherShops.map(shop => (
                                              <option key={shop.id} value={shop.id}>{shop.name}</option>
                                            ))}
                                          </optgroup>
                                        )}
                                      </select>
                                    </div>
                                    {selectedShop && selectedShop.id !== employee.primaryShop && (
                                      <div className="mt-1 text-xs text-amber-600 font-medium">⚡</div>
                                    )}
                                  </motion.div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 p-6 border-t border-gray-200/50 bg-gray-50/50">
            <div className="flex gap-6 text-xs font-medium text-gray-500">
              <div className="flex items-center gap-2"><Calendar className="w-3 h-3 text-violet-600" /><span>Week Setup</span></div>
              <div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-amber-600" /><span>Shop Override</span></div>
            </div>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-6 py-3 text-gray-600 hover:bg-white rounded-2xl font-semibold transition-all">Cancel</button>
              <button onClick={handleSave} disabled={saving || loading || partTimeEmployees.length === 0} className="px-6 py-3 bg-gradient-to-r from-gray-900 to-gray-800 text-white rounded-2xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50 flex items-center gap-2">
                {saving ? <><RefreshCw className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Availability</>}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
