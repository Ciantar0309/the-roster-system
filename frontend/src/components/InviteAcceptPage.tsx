import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface InviteAcceptPageProps {
  token: string;
  onComplete: () => void;
}

export default function InviteAcceptPage({ token, onComplete }: InviteAcceptPageProps) {
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success'>('loading');
  const [error, setError] = useState('');
  const [inviteData, setInviteData] = useState<any>(null);
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verify invite token on load
  useEffect(() => {
    const verifyInvite = async () => {
      try {
        const response = await fetch(`http://localhost:3001/api/auth/invite/${token}`);
        const data = await response.json();
        
        if (response.ok && data.valid) {
          setInviteData(data);
          setStatus('valid');
        } else {
          setError(data.error || 'Invalid invite link');
          setStatus('invalid');
        }
      } catch (err) {
        setError('Unable to verify invite link');
        setStatus('invalid');
      }
    };
    
    verifyInvite();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const response = await fetch(`http://localhost:3001/api/auth/invite/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setStatus('success');
        setTimeout(() => onComplete(), 3000);
      } else {
        setError(data.error || 'Failed to activate account');
      }
    } catch (err) {
      setError('Unable to connect to server');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full opacity-10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md mx-4">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 p-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              RosterPro
            </h1>
          </div>

          {/* Loading State */}
          {status === 'loading' && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-blue-400 mx-auto" />
              <p className="text-slate-400 mt-4">Verifying invite link...</p>
            </div>
          )}

          {/* Invalid State */}
          {status === 'invalid' && (
            <div className="text-center py-8">
              <XCircle className="w-16 h-16 text-red-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white mt-4">Invalid Invite</h2>
              <p className="text-slate-400 mt-2">{error}</p>
              <button
                onClick={onComplete}
                className="mt-6 px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
              >
                Go to Login
              </button>
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <h2 className="text-xl font-semibold text-white mt-4">Account Activated!</h2>
              <p className="text-slate-400 mt-2">Redirecting to login...</p>
            </div>
          )}

          {/* Valid - Show Password Form */}
          {status === 'valid' && (
            <>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-white">Welcome to RosterPro!</h2>
                <p className="text-slate-400 mt-2">
                  {inviteData?.employeeName ? (
                    <>Hi <span className="text-blue-400">{inviteData.employeeName}</span>, set your password to get started.</>
                  ) : (
                    <>Set your password to activate your account.</>
                  )}
                </p>
              </div>

              {/* Email Display */}
              <div className="mb-6 p-3 bg-white/5 rounded-lg">
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-white font-medium">{inviteData?.email}</p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg">
                  <p className="text-red-300 text-sm text-center">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
                      placeholder="••••••••"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Confirm Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="••••••••"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Activating...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-5 h-5" />
                      Activate Account
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
