import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { BookOpen, Lock, Mail, AlertCircle, ShieldCheck, Eye, EyeOff, QrCode } from 'lucide-react';

interface LoginPageProps {
  onOpenPublicScanner?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onOpenPublicScanner }) => {
  const { signIn, loading: authLoading, isSupabaseAuth } = useAuth();
  const [email, setEmail] = useState<string>('cprmedicalacademy@gmail.com');
  const [password, setPassword] = useState<string>('cprlibrary2026');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please provide both administrative email and password.');
      return;
    }

    setSubmitting(true);
    const res = await signIn(email, password);
    if (!res.success) {
      setError(res.error || 'Authentication failed. Please verify administrator credentials.');
      setSubmitting(false);
    }
  };

  const handleFillDemo = (adminType: 'primary' | 'desk') => {
    if (adminType === 'primary') {
      setEmail('cprmedicalacademy@gmail.com');
      setPassword('cprlibrary2026');
    } else {
      setEmail('admin@cprlibrary.org');
      setPassword('admin123');
    }
    setError('');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-emerald-950 text-amber-300 flex items-center justify-center mx-auto shadow-md border-2 border-emerald-800">
            <BookOpen className="w-7 h-7 text-amber-300" />
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase">
            CPR Reading Library
          </h1>
          <p className="text-xs text-emerald-800 font-semibold tracking-wide uppercase">
            Chattogram, Bangladesh · Member Administration
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-sm font-bold text-slate-900">
              Administrator Login
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Secure access for library administrators and reception officers.
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@cprlibrary.org"
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-9 py-2.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || authLoading}
              className="w-full py-2.5 px-4 rounded-lg bg-emerald-900 text-amber-300 hover:bg-emerald-800 font-bold text-xs transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-300" />
              <span>
                {submitting || authLoading ? 'Authenticating...' : 'Sign In as Administrator'}
              </span>
            </button>
          </form>

          {/* Demo Login Shortcuts */}
          <div className="pt-3 border-t border-slate-100 text-center space-y-2">
            <div className="text-[11px] text-slate-500">
              Quick Test Credentials:
            </div>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => handleFillDemo('primary')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              >
                Fill Primary Admin
              </button>
              <button
                type="button"
                onClick={() => handleFillDemo('desk')}
                className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              >
                Fill Desk Staff
              </button>
            </div>
          </div>

          {/* Security Notice */}
          <div className="text-[10px] text-slate-400 text-center leading-relaxed">
            Public user registration is disabled for safety. Member creation and credentials are strictly issued by CPR Reading Library administrative officers.
          </div>
        </div>

        {/* Public Scanner Button */}
        {onOpenPublicScanner && (
          <div className="text-center">
            <button
              onClick={onOpenPublicScanner}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 transition-colors"
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Test Public QR Entrance Verification</span>
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center text-[11px] text-slate-400">
          CPR Reading Library · Medical Division · Chattogram, Bangladesh
        </div>
      </div>
    </div>
  );
};
