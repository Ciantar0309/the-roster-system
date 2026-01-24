// frontend/src/components/SwapsView.tsx
import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  Repeat, Plus, Clock, CheckCircle, XCircle, Eye,
  Filter, Send, Calendar, ArrowRight, Trash2
} from 'lucide-react';
import { 
  GlassCard, Badge, SearchInput, Modal, 
  FormSelect, StatCard, EmptyState,
  AnimatedButton, Avatar, useDebounce
} from './ui';
import type { ShiftSwapRequest, Employee, BackendShift, SwapStatus, CurrentUser } from '../types';
import { format, parseISO } from 'date-fns';

// ============== TYPES ==============

interface SwapsViewProps {
  swapRequests: ShiftSwapRequest[];
  setSwapRequests: React.Dispatch<React.SetStateAction<ShiftSwapRequest[]>>;
  employees: Employee[];
  shifts: BackendShift[];
  setShifts: React.Dispatch<React.SetStateAction<BackendShift[]>>;
  currentUser: CurrentUser;
}

// ============== MAIN COMPONENT ==============

const SwapsView = memo(function SwapsView({ 
  swapRequests, 
  setSwapRequests, 
  employees,
  shifts,
  setShifts,
  currentUser 
}: SwapsViewProps) {

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<SwapStatus | 'all'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<ShiftSwapRequest | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Filter requests
  const filteredRequests = useMemo(() => {
    return swapRequests.filter(request => {
      const requester = employees.find(e => e.id === request.requesterId);
      const target = employees.find(e => e.id === request.targetEmployeeId);
      const matchesSearch = requester?.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                           target?.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [swapRequests, employees, debouncedSearch, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: swapRequests.length,
    pending: swapRequests.filter(r => r.status === 'pending').length,
    approved: swapRequests.filter(r => r.status === 'approved').length,
    rejected: swapRequests.filter(r => r.status === 'rejected').length,
  }), [swapRequests]);

  // Handlers
  const handleAddRequest = useCallback(async (request: Omit<ShiftSwapRequest, 'id' | 'createdAt' | 'status'>) => {
    const newRequest: ShiftSwapRequest = {
      ...request,
      id: `swap-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    
    // Save to backend
    try {
      await fetch('http://localhost:3001/api/swaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest)
      });
      console.log('✅ Swap request saved to database');
    } catch (error) {
      console.error('Failed to save swap request:', error);
    }
    
    setSwapRequests(prev => [...prev, newRequest]);
    setShowAddModal(false);
  }, [setSwapRequests]);

  const handleReviewRequest = useCallback(async (requestId: string, status: 'approved' | 'rejected') => {
    try {
      // Update status in backend
      const response = await fetch(`http://localhost:3001/api/swaps/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          reviewedBy: currentUser.id,
          reviewedAt: new Date().toISOString()
        })
      });

      if (response.ok) {
        // Update local state
        setSwapRequests(prev => prev.map(req =>
          req.id === requestId
            ? { ...req, status, reviewedBy: currentUser.id, reviewedAt: new Date().toISOString() }
            : req
        ));

        // If approved, swap the shifts in the roster
        if (status === 'approved') {
          const request = swapRequests.find(r => r.id === requestId);
          if (request && setShifts) {
            setShifts(prev => {
              const updatedShifts = [...prev];
              
              // Find the two shifts
              const requesterShiftIndex = updatedShifts.findIndex(s => s.id === request.requesterShiftId);
              const targetShiftIndex = updatedShifts.findIndex(s => s.id === request.targetShiftId);
              
              if (requesterShiftIndex !== -1 && targetShiftIndex !== -1) {
                // Swap the employee assignments
                const requesterShift = updatedShifts[requesterShiftIndex];
                const targetShift = updatedShifts[targetShiftIndex];
                
                // Swap employeeId and employeeName
                const tempEmployeeId = requesterShift.employeeId;
                const tempEmployeeName = requesterShift.employeeName;
                
                updatedShifts[requesterShiftIndex] = {
                  ...requesterShift,
                  employeeId: targetShift.employeeId,
                  employeeName: targetShift.employeeName
                };
                
                updatedShifts[targetShiftIndex] = {
                  ...targetShift,
                  employeeId: tempEmployeeId,
                  employeeName: tempEmployeeName
                };
                
                console.log('✅ Shifts swapped:', requesterShift.employeeName, '↔', targetShift.employeeName);
              } else if (requesterShiftIndex !== -1 && !request.targetShiftId) {
                // Target has day off - just reassign requester's shift to target
                const requesterShift = updatedShifts[requesterShiftIndex];
                const targetEmployee = employees.find(e => e.id === request.targetEmployeeId);
                
                updatedShifts[requesterShiftIndex] = {
                  ...requesterShift,
                  employeeId: Number(request.targetEmployeeId) || 0,
                  employeeName: targetEmployee?.name || 'Unknown'
                };
                
                console.log('✅ Shift reassigned to:', targetEmployee?.name);
              }
              
              return updatedShifts;
            });
          }
        }

        setShowReviewModal(false);
        setSelectedRequest(null);
      }
    } catch (error) {
      console.error('Failed to update swap request:', error);
    }
  }, [setSwapRequests, setShifts, swapRequests, employees, currentUser.id]);

  const handleDeleteRequest = useCallback(async (requestId: string) => {
    // Delete from backend
    try {
      await fetch(`http://localhost:3001/api/swaps/${requestId}`, {
        method: 'DELETE'
      });
      console.log('✅ Swap request deleted');
    } catch (error) {
      console.error('Failed to delete swap request:', error);
    }
    
    setSwapRequests(prev => prev.filter(r => r.id !== requestId));
    setShowViewModal(false);
    setSelectedRequest(null);
  }, [setSwapRequests]);

  const getStatusBadge = (status: SwapStatus) => {
    const variants: Record<SwapStatus, 'warning' | 'success' | 'danger' | 'default'> = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
      cancelled: 'default',
    };
    return <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

  // Get shift details helper
    const getShiftDetails = (shiftId: string) => {
    return shifts.find(s => String(s.id) === shiftId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shift Swaps</h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Review and manage shift swap requests' : 'Request to swap shifts with colleagues'}
          </p>
        </div>
        <AnimatedButton icon={Plus} onClick={() => setShowAddModal(true)}>
          Request Swap
        </AnimatedButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Repeat}
          label="Total Requests"
          value={stats.total}
          gradient="from-blue-500 to-blue-600"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          gradient="from-yellow-500 to-orange-500"
        />
        <StatCard
          icon={CheckCircle}
          label="Approved"
          value={stats.approved}
          gradient="from-green-500 to-emerald-500"
        />
        <StatCard
          icon={XCircle}
          label="Rejected"
          value={stats.rejected}
          gradient="from-red-500 to-rose-500"
        />
      </div>

      {/* Filters */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by employee name..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as SwapStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No swap requests found"
          description={searchTerm || statusFilter !== 'all'
            ? "Try adjusting your filters" 
            : "Request your first shift swap to get started"}
          action={
            <AnimatedButton icon={Plus} onClick={() => setShowAddModal(true)}>
              Request Swap
            </AnimatedButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => {
            const requester = employees.find(e => e.id === request.requesterId);
            const target = employees.find(e => e.id === request.targetEmployeeId);
            const shift = getShiftDetails(String(request.requesterShiftId || ''));
            
            return (
              <GlassCard key={request.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                      <Repeat className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-gray-900">
                          {requester?.name || 'Unknown'}
                        </h3>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-600">
                          {target?.name || 'Open Request'}
                        </span>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {shift ? (
                          <>
                            {format(typeof shift.date === 'string' ? parseISO(shift.date) : shift.date, 'EEE, MMM d, yyyy')}                            <span className="ml-2">
                              • {shift.startTime} - {shift.endTime} @ {shift.shopName}
                            </span>
                          </>
                        ) : (
                          'Shift details not available'
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <AnimatedButton
                      variant="ghost"
                      size="sm"
                      icon={Eye}
                      onClick={() => {
                        setSelectedRequest(request);
                        setShowViewModal(true);
                      }}
                    >
                      <span className="sr-only">View</span>
                    </AnimatedButton>
                    {isAdmin && request.status === 'pending' && (
                      <AnimatedButton
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowReviewModal(true);
                        }}
                      >
                        Review
                      </AnimatedButton>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add Swap Request Modal */}
      <SwapRequestModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddRequest}
        employees={employees}
        shifts={shifts}
        currentUser={currentUser}
      />

      {/* Review Modal */}
      {selectedRequest && (
        <ReviewSwapModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          requester={employees.find(e => e.id === selectedRequest.requesterId)}
          target={employees.find(e => e.id === selectedRequest.targetEmployeeId)}
          shift={getShiftDetails(String(selectedRequest.requesterShiftId || ''))}
          onApprove={() => handleReviewRequest(String(selectedRequest.id), 'approved')}
          onReject={() => handleReviewRequest(String(selectedRequest.id), 'rejected')}
        />
      )}

      {/* View Modal */}
      {selectedRequest && (
        <ViewSwapModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          requester={employees.find(e => e.id === selectedRequest.requesterId)}
          target={employees.find(e => e.id === selectedRequest.targetEmployeeId)}
          shift={getShiftDetails(String(selectedRequest.requesterShiftId || ''))}
          reviewer={employees.find(e => e.id === selectedRequest.reviewedBy)}
          onDelete={handleDeleteRequest}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
});

// ============== SWAP REQUEST MODAL ==============

interface SwapRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<ShiftSwapRequest, 'id' | 'createdAt' | 'status'>) => void;
  employees: Employee[];
  shifts: BackendShift[];
  currentUser: CurrentUser;
}

function SwapRequestModal({ isOpen, onClose, onSubmit, employees, shifts, currentUser }: SwapRequestModalProps) {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
  
  const [formData, setFormData] = useState({
    requesterId: '',
    targetEmployeeId: '',
    requesterShiftId: '',
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        requesterId: isAdmin ? '' : String(currentUser.employeeId || ''),
        targetEmployeeId: '',
        requesterShiftId: '',
      });
    }
  }, [isOpen, isAdmin, currentUser.employeeId]);

  // Get shifts for selected requester
  const requesterShifts = useMemo(() => {
    if (!formData.requesterId) return [];
        return shifts.filter(s => String(s.employeeId) === formData.requesterId);

  }, [shifts, formData.requesterId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.requesterId || !formData.requesterShiftId) return;
    
    onSubmit({
      requesterId: Number(formData.requesterId),
      targetEmployeeId: formData.targetEmployeeId ? Number(formData.targetEmployeeId) : 0,
      requesterShiftId: formData.requesterShiftId,
      targetShiftId: undefined,
    });
  };

  const employeeOptions = [
    { value: '', label: 'Select Employee' },
    ...employees.filter(e => !e.excludeFromRoster).map(emp => ({
      value: String(emp.id),
      label: emp.name,
    })),
  ];

  const targetOptions = useMemo(() => {
    // Get the requester's details
    const requester = employees.find(e => String(e.id) === formData.requesterId);
    const selectedShift = shifts.find(s => String(s.id) === formData.requesterShiftId);

    
    if (!requester) {
      return [{ value: '', label: 'Select requester first' }];
    }
    
    // Filter employees by same company and same shop
    const eligibleEmployees = employees.filter(e => {
      // Exclude self and excluded employees
      if (e.excludeFromRoster || String(e.id) === formData.requesterId) return false;
      
      // Must be same company (or Both)
      if (requester.company !== 'Both' && e.company !== 'Both' && e.company !== requester.company) {
        return false;
      }
      
      // Must work at the same shop (primary or secondary)
      if (selectedShift) {
        const worksAtShop = e.primaryShopId === selectedShift.shopId || 
                            (e.secondaryShopIds || []).includes(selectedShift.shopId);
        if (!worksAtShop) return false;
      }
      
      return true;
    });
    
    return [
      { value: '', label: eligibleEmployees.length > 0 ? 'Open to Anyone at this Shop' : 'No eligible employees' },
      ...eligibleEmployees.map(emp => ({
        value: String(emp.id),
        label: `${emp.name} (${emp.company})`,
      })),
    ];
  }, [employees, shifts, formData.requesterId, formData.requesterShiftId]);

  const shiftOptions = [
    { value: '', label: 'Select Shift' },
    ...requesterShifts.map(shift => ({
      value: shift.id,
      label: `${format(parseISO(shift.date), 'EEE, MMM d')} - ${shift.startTime} to ${shift.endTime} @ ${shift.shopName}`,
    })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Shift Swap" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isAdmin && (
          <FormSelect
            label="Requesting Employee"
            value={formData.requesterId}
            onChange={(value) => setFormData(prev => ({ ...prev, requesterId: value, requesterShiftId: '' }))}
            options={employeeOptions}
            required
          />
        )}

        <FormSelect
          label="Shift to Swap"
          value={formData.requesterShiftId}
          onChange={(value) => setFormData(prev => ({ ...prev, requesterShiftId: value }))}
          options={shiftOptions}
          required
        />

        {requesterShifts.length === 0 && formData.requesterId && (
          <div className="p-3 bg-yellow-50 rounded-lg text-sm text-yellow-700">
            No upcoming shifts found for this employee. Generate a roster first.
          </div>
        )}

        <FormSelect
          label="Swap With (Optional)"
          value={formData.targetEmployeeId}
          onChange={(value) => setFormData(prev => ({ ...prev, targetEmployeeId: value }))}
          options={targetOptions}
        />

        <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
          {formData.targetEmployeeId 
            ? "The target employee will need to approve this swap request."
            : "Leave empty to make this an open request that any colleague can accept."}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <AnimatedButton variant="secondary" onClick={onClose}>
            Cancel
          </AnimatedButton>
          <AnimatedButton type="submit" icon={Send}>
            Submit Request
          </AnimatedButton>
        </div>
      </form>
    </Modal>
  );
}

// ============== REVIEW SWAP MODAL ==============

interface ReviewSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ShiftSwapRequest;
  requester?: Employee;
  target?: Employee;
  shift?: BackendShift;
  onApprove: () => void;
  onReject: () => void;
}

function ReviewSwapModal({ 
  isOpen, 
  onClose, 
  requester, 
  target, 
  shift,
  onApprove, 
  onReject 
}: ReviewSwapModalProps) {

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Swap Request" size="md">
      <div className="space-y-4">
        {/* Swap Details */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="text-center">
              <Avatar name={requester?.name || 'Unknown'} size="md" />
              <p className="mt-1 font-medium text-sm">{requester?.name}</p>
              <p className="text-xs text-gray-500">Requester</p>
            </div>
            <ArrowRight className="w-6 h-6 text-gray-400" />
            <div className="text-center">
              <Avatar name={target?.name || '?'} size="md" />
              <p className="mt-1 font-medium text-sm">{target?.name || 'Open'}</p>
              <p className="text-xs text-gray-500">Target</p>
            </div>
          </div>

          {shift && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Date:</span>
                <p className="font-medium">{format(parseISO(shift.date), 'EEE, MMM d, yyyy')}</p>
              </div>
              <div>
                <span className="text-gray-500">Time:</span>
                <p className="font-medium">{shift.startTime} - {shift.endTime}</p>
              </div>
              <div>
                <span className="text-gray-500">Shop:</span>
                <p className="font-medium">{shift.shopName}</p>
              </div>
              <div>
                <span className="text-gray-500">Hours:</span>
                <p className="font-medium">{shift.hours}h</p>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <AnimatedButton variant="secondary" onClick={onClose}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="danger" 
            icon={XCircle}
            onClick={onReject}
          >
            Reject
          </AnimatedButton>
          <AnimatedButton 
            variant="success" 
            icon={CheckCircle}
            onClick={onApprove}
          >
            Approve
          </AnimatedButton>
        </div>
      </div>
    </Modal>
  );
}

// ============== VIEW SWAP MODAL ==============

interface ViewSwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: ShiftSwapRequest;
  requester?: Employee;
  target?: Employee;
  shift?: BackendShift;
  reviewer?: Employee;
  onDelete?: (requestId: string) => void;
  isAdmin?: boolean;
}

function ViewSwapModal({ 
  isOpen, 
  onClose, 
  request, 
  requester, 
  target, 
  shift,
  reviewer,
  onDelete,
  isAdmin
}: ViewSwapModalProps) {
  const getStatusColor = (status: SwapStatus) => {
    const colors: Record<SwapStatus, string> = {
      pending: 'text-yellow-600 bg-yellow-50',
      approved: 'text-green-600 bg-green-50',
      rejected: 'text-red-600 bg-red-50',
      cancelled: 'text-gray-600 bg-gray-50',
    };
    return colors[status];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Swap Request Details" size="md">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Shift Swap</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
        </div>

        {/* Swap Visual */}
        <div className="flex items-center justify-center gap-4 py-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <Avatar name={requester?.name || 'Unknown'} size="md" />
            <p className="mt-1 font-medium text-sm">{requester?.name}</p>
          </div>
          <ArrowRight className="w-6 h-6 text-gray-400" />
          <div className="text-center">
            <Avatar name={target?.name || '?'} size="md" />
            <p className="mt-1 font-medium text-sm">{target?.name || 'Open'}</p>
          </div>
        </div>

        {/* Details */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            {shift && (
              <>
                <div>
                  <span className="text-gray-500">Date:</span>
                  <p className="font-medium">{format(parseISO(shift.date), 'EEE, MMM d, yyyy')}</p>
                </div>
                <div>
                  <span className="text-gray-500">Time:</span>
                  <p className="font-medium">{shift.startTime} - {shift.endTime}</p>
                </div>
                <div>
                  <span className="text-gray-500">Shop:</span>
                  <p className="font-medium">{shift.shopName}</p>
                </div>
              </>
            )}
            <div>
              <span className="text-gray-500">Submitted:</span>
              <p className="font-medium">{format(parseISO(request.createdAt), 'MMM d, yyyy')}</p>
            </div>
          </div>

          {request.status !== 'pending' && (
            <div className="pt-3 border-t border-gray-200">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Reviewed By:</span>
                  <p className="font-medium">{reviewer?.name || 'System'}</p>
                </div>
                {request.reviewedAt && (
                  <div>
                    <span className="text-gray-500">Reviewed On:</span>
                    <p className="font-medium">{format(parseISO(request.reviewedAt), 'MMM d, yyyy')}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-between pt-4 border-t">
          <div>
            {isAdmin && onDelete && (
              <AnimatedButton 
                variant="danger"
                icon={Trash2}
                onClick={() => onDelete(String(request.id))}
              >
                Delete
              </AnimatedButton>
            )}
          </div>
          <AnimatedButton variant="secondary" onClick={onClose}>
            Close
          </AnimatedButton>
        </div>
      </div>
    </Modal>
  );
}

export default SwapsView;
