import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Wrench, 
  Lock, 
  User, 
  ShieldCheck, 
  UserCheck, 
  ArrowRight, 
  AlertCircle,
  Eye,
  EyeOff,
  Sparkles,
  MapPin,
  Phone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to intended page or dashboard
  React.useEffect(() => {
    if (user) {
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await login(username.trim(), password);
      const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex flex-col justify-between text-gray-100 selection:bg-[#C1121F] selection:text-white relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#C1121F]/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 -right-40 w-96 h-96 bg-red-800/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-1/3 w-96 h-96 bg-neutral-800/30 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Bar */}
      <header className="p-6 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#C1121F] flex items-center justify-center text-white shadow-lg shadow-red-900/40">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-heading font-extrabold text-sm tracking-wider uppercase text-white leading-tight">
              Arshi Automobile
            </h1>
            <p className="text-[11px] text-gray-400 font-medium tracking-widest uppercase">
              & Car Hub • NextGarage
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#C1121F]" />
            <span>Rajshahi, BD</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-gray-300">
            <Phone className="w-3.5 h-3.5 text-[#C1121F]" />
            <span>01712110902</span>
          </div>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10">
        <div className="w-full max-w-md bg-[#181818]/90 backdrop-blur-xl border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-neutral-900 border border-neutral-700/60 text-[#C1121F] mb-4 shadow-inner">
              <Lock className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-bold font-heading text-white tracking-wide">
              Workshop Portal
            </h2>
            <p className="text-sm text-gray-400 mt-1.5">
              Sign in to manage job cards, billing, and garage operations.
            </p>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/80 flex items-start gap-3 text-red-200 text-sm animate-shake">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 font-heading">
                Username / Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. admin or staff"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#222222] border border-neutral-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C1121F] focus:ring-2 focus:ring-[#C1121F]/20 transition-all font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-gray-300 mb-1.5 font-heading">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-10 pr-11 py-3 bg-[#222222] border border-neutral-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-[#C1121F] focus:ring-2 focus:ring-[#C1121F]/20 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 px-4 bg-[#C1121F] hover:bg-[#A30F1A] active:scale-[0.99] text-white font-semibold text-sm rounded-xl shadow-lg shadow-red-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed font-heading uppercase tracking-wider"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access Switcher */}
          <div className="mt-8 pt-6 border-t border-neutral-800">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mb-3 uppercase tracking-wider font-heading">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick Demo Credentials</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Super Admin Preset */}
              <button
                type="button"
                onClick={() => handleQuickFill('admin', 'admin123')}
                className="p-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-left transition-all group cursor-pointer hover:border-red-600/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Super Admin</span>
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  admin / admin123
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Full control & delete access
                </div>
              </button>

              {/* Staff Preset */}
              <button
                type="button"
                onClick={() => handleQuickFill('staff', 'staff123')}
                className="p-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700/80 text-left transition-all group cursor-pointer hover:border-blue-500/50"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-400">
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Staff</span>
                  </div>
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  staff / staff123
                </div>
                <div className="text-[10px] text-gray-500 mt-1">
                  Create/edit (no delete)
                </div>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-4 text-center text-xs text-neutral-500 z-10">
        © {new Date().getFullYear()} Arshi Automobile & Car Hub • NextGarage Management System
      </footer>
    </div>
  );
};
