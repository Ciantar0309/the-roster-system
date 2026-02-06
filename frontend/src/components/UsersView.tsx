import { useState, useEffect } from 'react';
import { 
  Users, Mail, Trash2, Send, UserPlus, 
  Check, Edit2, Save, Loader2,
  AlertCircle, CheckCircle
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface User {
  id: number;
  email: string;
  role: string;
  employeeId: number | null;
  employeeName: string | null;
  isActive: number;
  inviteToken: string | null;
  inviteExpires: string | null;
  createdAt: string;
  lastLogin: string | null;
  company: string | null;
  allowedShopIds: string | null;
}

interface Employee {
  id: number;
  name: string;
  email: string | null;
  company: string;
}

interface Shop {
  id: number;
  name: string;
  company: string;
}

interface UsersViewProps {
  employees: Employee[];
  shops: Shop[];
}

export default function UsersView({ employees, shops }: UsersViewProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Invite modal state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteEmployeeId, setInviteEmployeeId] = useState<number | null>(null);
  const [inviteCompany, setInviteCompany] = useState<string>('Both');
  const [inviteShopIds, setInviteShopIds] = useState<number[]>([]);
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  
  // Edit modal state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editEmployeeId, setEditEmployeeId] = useState<number | null>(null);
  const [editCompany, setEditCompany] = useState<string>('Both');
  const [editShopIds, setEditShopIds] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // Fetch users
  const fetchUsers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (err) {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Auto-fill email when employee selected
  useEffect(() => {
    if (inviteEmployeeId) {
      const emp = employees.find(e => e.id === inviteEmployeeId);
      if (emp?.email) {
        setInviteEmail(emp.email);
      }
      if (emp?.company) {
        setInviteCompany(emp.company);
      }
    }
  }, [inviteEmployeeId, employees]);

  // Send invite
  const handleInvite = async () => {
    if (!inviteEmail) {
      setError('Email is required');
      return;
    }
    
    setInviting(true);
    setError('');
    setInviteLink('');
    
    try {
      const response = await fetch(`${API_URL}/api/auth/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
          employeeId: inviteEmployeeId,
          company: inviteCompany,
          allowedShopIds: inviteShopIds
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
  setSuccess(`Invite sent to ${inviteEmail}!`);
  fetchUsers();
  setShowInviteModal(false);
  
  // Reset form
  setInviteEmail('');
  setInviteRole('employee');
  setInviteEmployeeId(null);
  setInviteCompany('Both');
  setInviteShopIds([]);
  setInviteLink('');
        
        // Update employee email if linked
        if (inviteEmployeeId) {
          await fetch(`${API_URL}/api/employees/${inviteEmployeeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: inviteEmail })
          });
        }
      } else {
        setError(data.error || 'Failed to send invite');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setInviting(false);
    }
  };

  // Delete user
  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        setSuccess('User deleted');
        fetchUsers();
      } else {
        setError('Failed to delete user');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  // Resend invite
  const handleResend = async (userId: number) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/resend-invite`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSuccess('Invite resent successfully');
        setInviteLink(data.inviteLink);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to resend invite');
      }
    } catch (err) {
      setError('Failed to connect to server');
    }
  };

  // Open edit modal
  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditEmployeeId(user.employeeId);
    setEditCompany(user.company || 'Both');
    setEditShopIds(user.allowedShopIds ? JSON.parse(user.allowedShopIds) : []);
  };

  // Save user changes
  const handleSaveUser = async () => {
    if (!editingUser) return;
    
    setSaving(true);
    setError('');
    
    try {
      const response = await fetch(`${API_URL}/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editRole,
          employeeId: editEmployeeId,
          company: editCompany,
          allowedShopIds: editShopIds
        })
      });
      
      if (response.ok) {
        setSuccess('User updated successfully');
        setEditingUser(null);
        fetchUsers();
        
        // Update employee email if linked
        if (editEmployeeId && editingUser.email) {
          await fetch(`${API_URL}/api/employees/${editEmployeeId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: editingUser.email })
          });
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update user');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setSaving(false);
    }
  };

  // Clear messages after 5 seconds
  useEffect(() => {
    if (success || error) {
      const timer = setTimeout(() => {
        setSuccess('');
        setError('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [success, error]);

  // Filter shops by company
  const getShopsForCompany = (company: string) => {
    if (company === 'Both') return shops;
    return shops.filter(s => s.company === company);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
          <p className="text-slate-500">Manage user accounts, roles, and permissions</p>
        </div>
        <button
          onClick={() => {
            setShowInviteModal(true);
            setInviteEmail('');
            setInviteRole('employee');
            setInviteEmployeeId(null);
            setInviteCompany('Both');
            setInviteShopIds([]);
            setInviteLink('');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <UserPlus className="w-5 h-5" />
          Invite User
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">User</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Role</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Linked Employee</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Company</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Status</th>
              <th className="text-left px-6 py-3 text-sm font-semibold text-slate-600">Last Login</th>
              <th className="text-right px-6 py-3 text-sm font-semibold text-slate-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map(user => (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-blue-600 font-semibold">
                        {user.email.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{user.email}</p>
                      <p className="text-sm text-slate-500">ID: {user.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-700'
                      : user.role === 'manager'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {user.employeeName ? (
                    <span className="text-slate-800">{user.employeeName}</span>
                  ) : (
                    <span className="text-slate-400 italic">Not linked</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <span className="text-slate-600">{user.company || 'Both'}</span>
                </td>
                <td className="px-6 py-4">
                  {user.isActive ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Check className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Mail className="w-4 h-4" />
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-slate-600">
                  {user.lastLogin 
                    ? new Date(user.lastLogin).toLocaleDateString()
                    : '-'
                  }
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit user"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!user.isActive && (
                      <button
                        onClick={() => handleResend(user.id)}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Resend invite"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete user"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {users.length === 0 && (
          <div className="p-12 text-center text-slate-500">
            <Users className="w-12 h-12 mx-auto mb-4 text-slate-300" />
            <p>No users yet. Invite your first user!</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Invite New User</h2>
              <p className="text-slate-500 text-sm">Send an invitation email to create a new account</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Link to Employee */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Link to Employee (Optional)
                </label>
                <select
                  value={inviteEmployeeId || ''}
                  onChange={(e) => setInviteEmployeeId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- No employee link --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.company})</option>
                  ))}
                </select>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="user@example.com"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Company Access */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Access
                </label>
                <select
                  value={inviteCompany}
                  onChange={(e) => {
                    setInviteCompany(e.target.value);
                    setInviteShopIds([]);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Both">Both Companies</option>
                  <option value="CS">CS Only</option>
                  <option value="CMZ">CMZ Only</option>
                </select>
              </div>

              {/* Shop Access */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Shop Access (leave empty for all)
                </label>
                <div className="border border-slate-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {getShopsForCompany(inviteCompany).map(shop => (
                    <label key={shop.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteShopIds.includes(shop.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteShopIds([...inviteShopIds, shop.id]);
                          } else {
                            setInviteShopIds(inviteShopIds.filter(id => id !== shop.id));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{shop.name}</span>
                      <span className="text-xs text-slate-400">({shop.company})</span>
                    </label>
                  ))}
                </div>
                {inviteShopIds.length === 0 && (
                  <p className="text-xs text-slate-500 mt-1">User will have access to all shops</p>
                )}
              </div>

              {/* Invite Link Display */}
              {inviteLink && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-700 mb-1">Invite link generated!</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-2 py-1 text-xs bg-white border border-green-300 rounded"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        setSuccess('Link copied to clipboard!');
                      }}
                      className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={inviting || !inviteEmail}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {inviting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Send Invite
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-800">Edit User</h2>
              <p className="text-slate-500 text-sm">{editingUser.email}</p>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Link to Employee */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Link to Employee
                </label>
                <select
                  value={editEmployeeId || ''}
                  onChange={(e) => setEditEmployeeId(e.target.value ? parseInt(e.target.value) : null)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">-- No employee link --</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.name} ({emp.company})</option>
                  ))}
                </select>
              </div>

              {/* Role */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {/* Company Access */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Company Access
                </label>
                <select
                  value={editCompany}
                  onChange={(e) => {
                    setEditCompany(e.target.value);
                    setEditShopIds([]);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Both">Both Companies</option>
                  <option value="CS">CS Only</option>
                  <option value="CMZ">CMZ Only</option>
                </select>
              </div>

              {/* Shop Access */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Shop Access (leave empty for all)
                </label>
                <div className="border border-slate-300 rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {getShopsForCompany(editCompany).map(shop => (
                    <label key={shop.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editShopIds.includes(shop.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditShopIds([...editShopIds, shop.id]);
                          } else {
                            setEditShopIds(editShopIds.filter(id => id !== shop.id));
                          }
                        }}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">{shop.name}</span>
                      <span className="text-xs text-slate-400">({shop.company})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveUser}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
