// frontend/src/components/LeaveView.tsx
import React, { useState, useMemo, useCallback, memo } from 'react';
import { 
  Calendar, Plus, Clock, CheckCircle, XCircle, Eye,
  Filter, Send, Trash2
} from 'lucide-react';
import { 
  GlassCard, Badge, SearchInput, Modal, FormInput, 
  FormSelect, FormTextarea, StatCard, EmptyState,
  AnimatedButton, useDebounce
} from './ui';
import type { LeaveRequest, Employee, LeaveStatus, CurrentUser } from '../types';
import { format, parseISO } from 'date-fns';

// ============== TYPES ==============

interface LeaveViewProps {
  leaveRequests: LeaveRequest[];
  setLeaveRequests: React.Dispatch<React.SetStateAction<LeaveRequest[]>>;
  employees: Employee[];
  currentUser: CurrentUser;
}

// ============== CONSTANTS ==============

const LEAVE_TYPES = [
  { value: 'annual', label: 'Annual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'bereavement', label: 'Bereavement Leave' },
];

const getLeaveTypeLabel = (type: string): string => {
  const found = LEAVE_TYPES.find(t => t.value === type);
  return found?.label || type;
};

// ============== MAIN COMPONENT ==============

const LeaveView = memo(function LeaveView({ 
  leaveRequests, 
  setLeaveRequests, 
  employees,
  currentUser 
}: LeaveViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  

  const debouncedSearch = useDebounce(searchTerm, 300);

// Filter requests
const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
const filteredRequests = useMemo(() => {
  return leaveRequests.filter(request => {
    const employee = employees.find(e => e.id === request.employeeId);
    
    // Non-admin users can only see:
    // 1. Their own requests (any status)
    // 2. Other people's APPROVED requests only
    if (!isAdmin) {
      const isOwnRequest = request.employeeId === currentUser.employeeId;
      const isApproved = request.status === 'approved';
      if (!isOwnRequest && !isApproved) {
        return false;
      }
    }
    
    const matchesSearch = employee?.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
                         (request.reason?.toLowerCase().includes(debouncedSearch.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
    const matchesType = typeFilter === 'all' || request.type === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });
}, [leaveRequests, employees, debouncedSearch, statusFilter, typeFilter, isAdmin, currentUser.employeeId]);


  // Stats
  const stats = useMemo(() => ({
    total: leaveRequests.length,
    pending: leaveRequests.filter(r => r.status === 'pending').length,
    approved: leaveRequests.filter(r => r.status === 'approved').length,
    rejected: leaveRequests.filter(r => r.status === 'rejected').length,
  }), [leaveRequests]);

  // Handlers
  const handleAddRequest = useCallback(async (request: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status'>) => {
    const newRequest: LeaveRequest = {
      ...request,
      id: `leave-${Date.now()}`,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    
    // Save to backend
    try {
      await fetch('http://localhost:3001/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRequest)
      });
      console.log('✅ Leave request saved to database');
    } catch (error) {
      console.error('Failed to save leave request:', error);
    }
    
    setLeaveRequests(prev => [...prev, newRequest]);
    setShowAddModal(false);
  }, [setLeaveRequests]);

  const handleReviewRequest = useCallback(async (requestId: string, status: 'approved' | 'rejected', response?: string) => {
    const updates = {
      status,
      reviewedBy: currentUser.id,
      reviewedAt: new Date().toISOString(),
      managerResponse: response
    };
    
    // Save to backend
    try {
      await fetch(`http://localhost:3001/api/leave/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      console.log(`✅ Leave request ${status}`);
    } catch (error) {
      console.error('Failed to update leave request:', error);
    }
    
    setLeaveRequests(prev => prev.map(r => 
      r.id === requestId ? { ...r, ...updates } : r
    ));
    setShowReviewModal(false);
    setSelectedRequest(null);
  }, [setLeaveRequests, currentUser.id]);

  const handleDeleteRequest = useCallback(async (requestId: string) => {
    // Delete from backend
    try {
      await fetch(`http://localhost:3001/api/leave/${requestId}`, {
        method: 'DELETE'
      });
      console.log('✅ Leave request deleted');
    } catch (error) {
      console.error('Failed to delete leave request:', error);
    }
    
    setLeaveRequests(prev => prev.filter(r => r.id !== requestId));
    setShowViewModal(false);
    setSelectedRequest(null);
  }, [setLeaveRequests]);

  const getStatusBadge = (status: LeaveStatus) => {
    const variants: Record<LeaveStatus, 'warning' | 'success' | 'danger'> = {
      pending: 'warning',
      approved: 'success',
      rejected: 'danger',
    };
    return <Badge variant={variants[status]}>{status.charAt(0).toUpperCase() + status.slice(1)}</Badge>;
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
          <p className="text-gray-600 mt-1">
            {isAdmin ? 'Review and manage employee leave requests' : 'Submit and track your leave requests'}
          </p>
        </div>
        <AnimatedButton icon={Plus} onClick={() => setShowAddModal(true)}>
          Request Leave
        </AnimatedButton>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          icon={Calendar}
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
              placeholder="Search by employee or reason..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as LeaveStatus | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              {LEAVE_TYPES.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Request List */}
      {filteredRequests.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No leave requests found"
          description={searchTerm || statusFilter !== 'all' || typeFilter !== 'all' 
            ? "Try adjusting your filters" 
            : "Submit your first leave request to get started"}
          action={
            <AnimatedButton icon={Plus} onClick={() => setShowAddModal(true)}>
              Request Leave
            </AnimatedButton>
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredRequests.map(request => {
            const employee = employees.find(e => e.id === request.employeeId);
            return (
              <GlassCard key={request.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{employee?.name || 'Unknown'}</h3>
                        {getStatusBadge(request.status)}
                      </div>
                      <p className="text-sm text-gray-600">
                        {getLeaveTypeLabel(request.type)} • {format(parseISO(request.startDate), 'MMM d')} - {format(parseISO(request.endDate), 'MMM d, yyyy')}
                      </p>
                      {request.reason && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{request.reason}</p>
                      )}
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

      {/* Add Leave Request Modal */}
      <LeaveRequestModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleAddRequest}
        employees={employees}
        currentUser={currentUser}
      />

      {/* Review Modal */}
      {selectedRequest && (
        <ReviewLeaveModal
          isOpen={showReviewModal}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          employee={employees.find(e => e.id === selectedRequest.employeeId)}
          onApprove={(response) => handleReviewRequest(String(selectedRequest.id), 'approved', response)}
          onReject={(response) => handleReviewRequest(String(selectedRequest.id), 'rejected', response)}
        />
      )}

      {/* View Modal */}
      {selectedRequest && (
        <ViewLeaveModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedRequest(null);
          }}
          request={selectedRequest}
          employee={employees.find(e => e.id === selectedRequest.employeeId)}
          reviewer={employees.find(e => e.id === selectedRequest.reviewedBy)}
          onDelete={handleDeleteRequest}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
});

// ============== LEAVE REQUEST MODAL ==============

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<LeaveRequest, 'id' | 'submittedAt' | 'status'>) => void;
  employees: Employee[];
  currentUser: CurrentUser;
}

function LeaveRequestModal({ isOpen, onClose, onSubmit, employees, currentUser }: LeaveRequestModalProps) {
  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
  
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        employeeId: isAdmin ? '' : String(currentUser.employeeId || ''),
        type: 'annual',
        startDate: '',
        endDate: '',
        reason: '',
      });
    }
  }, [isOpen, isAdmin, currentUser.employeeId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.employeeId || !formData.startDate || !formData.endDate) return;
    
    onSubmit({
      employeeId: Number(formData.employeeId),
      type: formData.type as LeaveRequest['type'],
      startDate: formData.startDate,
      endDate: formData.endDate,
      reason: formData.reason || undefined,
    });
  };

  const employeeOptions = [
    { value: '', label: 'Select Employee' },
    ...employees.map(emp => ({
      value: String(emp.id),
      label: emp.name,
    })),
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Request Leave" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isAdmin && (
          <FormSelect
            label="Employee"
            value={formData.employeeId}
            onChange={(value) => setFormData(prev => ({ ...prev, employeeId: value }))}
            options={employeeOptions}
            required
          />
        )}
        
        <FormSelect
          label="Leave Type"
          value={formData.type}
          onChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
          options={LEAVE_TYPES}
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <FormInput
            label="Start Date"
            type="date"
            value={formData.startDate}
            onChange={(value) => setFormData(prev => ({ ...prev, startDate: value }))}
            required
          />
          <FormInput
            label="End Date"
            type="date"
            value={formData.endDate}
            onChange={(value) => setFormData(prev => ({ ...prev, endDate: value }))}
            required
          />
        </div>

        <FormTextarea
          label="Reason (Optional)"
          value={formData.reason}
          onChange={(value) => setFormData(prev => ({ ...prev, reason: value }))}
          placeholder="Please provide a reason for your leave request..."
          rows={3}
        />

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

// ============== REVIEW LEAVE MODAL ==============

interface ReviewLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveRequest;
  employee?: Employee;
  onApprove: (response?: string) => void;
  onReject: (response?: string) => void;
}

function ReviewLeaveModal({ isOpen, onClose, request, employee, onApprove, onReject }: ReviewLeaveModalProps) {
  const [response, setResponse] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setResponse('');
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Review Leave Request" size="md">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Employee:</span>
              <p className="font-medium">{employee?.name || 'Unknown'}</p>
            </div>
            <div>
              <span className="text-gray-500">Type:</span>
              <p className="font-medium">{getLeaveTypeLabel(request.type)}</p>
            </div>
            <div>
              <span className="text-gray-500">Start Date:</span>
              <p className="font-medium">{format(parseISO(request.startDate), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <span className="text-gray-500">End Date:</span>
              <p className="font-medium">{format(parseISO(request.endDate), 'MMM d, yyyy')}</p>
            </div>
          </div>
          {request.reason && (
            <div className="mt-4">
              <span className="text-gray-500 text-sm">Reason:</span>
              <p className="mt-1 text-gray-900">{request.reason}</p>
            </div>
          )}
        </div>

        <FormTextarea
          label="Response (Optional)"
          value={response}
          onChange={setResponse}
          placeholder="Add a note for the employee..."
          rows={2}
        />

        <div className="flex justify-end gap-3 pt-4 border-t">
          <AnimatedButton variant="secondary" onClick={onClose}>
            Cancel
          </AnimatedButton>
          <AnimatedButton 
            variant="danger" 
            icon={XCircle}
            onClick={() => onReject(response || undefined)}
          >
            Reject
          </AnimatedButton>
          <AnimatedButton 
            variant="success" 
            icon={CheckCircle}
            onClick={() => onApprove(response || undefined)}
          >
            Approve
          </AnimatedButton>
        </div>
      </div>
    </Modal>
  );
}

// ============== VIEW LEAVE MODAL ==============

interface ViewLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: LeaveRequest;
  employee?: Employee;
  reviewer?: Employee;
  onDelete?: (requestId: string) => void;
  isAdmin?: boolean;
}

function ViewLeaveModal({ isOpen, onClose, request, employee, reviewer, onDelete, isAdmin }: ViewLeaveModalProps) {
  const getStatusColor = (status: LeaveStatus) => {
    const colors: Record<LeaveStatus, string> = {
      pending: 'text-yellow-600 bg-yellow-50',
      approved: 'text-green-600 bg-green-50',
      rejected: 'text-red-600 bg-red-50',
    };
    return colors[status];
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leave Request Details" size="md">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-gray-900">{employee?.name || 'Unknown'}</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
            {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
          </span>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Type:</span>
              <p className="font-medium">{getLeaveTypeLabel(request.type)}</p>
            </div>
            <div>
              <span className="text-gray-500">Submitted:</span>
              <p className="font-medium">{request.submittedAt ? format(parseISO(request.submittedAt), 'MMM d, yyyy') : 'N/A'}</p>
            </div>
            <div>
              <span className="text-gray-500">Start Date:</span>
              <p className="font-medium">{format(parseISO(request.startDate), 'MMM d, yyyy')}</p>
            </div>
            <div>
              <span className="text-gray-500">End Date:</span>
              <p className="font-medium">{format(parseISO(request.endDate), 'MMM d, yyyy')}</p>
            </div>
          </div>
          
          {request.reason && (
            <div>
              <span className="text-gray-500 text-sm">Reason:</span>
              <p className="mt-1 text-gray-900">{request.reason}</p>
            </div>
          )}

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
              {request.managerResponse && (
                <div className="mt-3">
                  <span className="text-gray-500 text-sm">Manager Response:</span>
                  <p className="mt-1 text-gray-900">{request.managerResponse}</p>
                </div>
              )}
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

export default LeaveView;
