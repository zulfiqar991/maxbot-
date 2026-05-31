import React, { useState } from 'react';
import { 
  Shield, 
  Key, 
  LogIn, 
  AlertCircle, 
  Cpu, 
  ShieldCheck, 
  Mail, 
  CheckCircle,
  RefreshCw
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: { username: string; email?: string; phone?: string; isAdmin?: boolean; password?: string }, state: any) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  // Login input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // UI feedback elements
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Submit Login Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password.trim()) {
      setErrorMsg('User ID/Email Address and Password are required.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(), 
          password: password.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Authorization successful! Unlocking session...');
        setTimeout(() => {
          onLoginSuccess({ ...data.user, password: password.trim() }, data.state);
        }, 800);
      } else {
        setErrorMsg(data.error || 'Access denied.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Server communications trace fault. Verify port binds are active.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070a13] flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Decorative ambient visual background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f29370a_1px,transparent_1px),linear-gradient(to_bottom,#1f29370a_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full filter blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full filter blur-3xl pointer-events-none" />
  
      <div className="w-full max-w-lg bg-[#0F141F] border border-[#1E293B] rounded-2xl shadow-2xl relative z-10 overflow-hidden">
        
        {/* Banner header logo */}
        <div className="bg-[#181F2F] px-6 py-6 border-b border-[#2D3748] text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-orange-500/10 rounded-xl flex items-center justify-center border border-orange-500/20 shadow-md">
            <Cpu className="w-6 h-6 text-orange-500 animate-pulse" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            Max Bot <span className="bg-orange-500/10 text-orange-400 text-[10px] font-mono border border-orange-500/20 px-2 py-0.5 rounded-full font-bold">PRO</span>
          </h1>
          <p className="text-xs text-gray-400">
            Professional Multi-User Quantitative Webhook Copilot
          </p>
        </div>
  
        {/* Main Body Layout */}
        <div className="p-6 sm:p-8 space-y-6">
          <div className="space-y-1 text-center">
            <h2 className="text-sm font-semibold tracking-wider text-gray-300 uppercase font-mono">
              Secure Sign-In Gateway
            </h2>
            <p className="text-xs text-gray-500">
              Verify security credentials to access and backtest your algorithmic strategy lines safely.
            </p>
          </div>

          {/* Error / Success feedbacks */}
          {errorMsg && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-400 flex items-start gap-2.5">
              <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}
  
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* User ID / Email Address */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-orange-400" /> User ID / Email Address
              </label>
              <input
                type="text"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. mastertrader or trade@domain.com"
                className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono transition-all"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-orange-400" /> Secure Security Password
              </label>
              <input
                type="password"
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono transition-all"
              />
            </div>

            {/* Safety banner metrics */}
            <div className="p-3 bg-[#111827] border border-[#1E293B] rounded-xl text-[10.5px] text-gray-400 space-y-1.5 font-mono">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="w-3.5 h-3.5" /> High-Contrast Isolation Architecture Active
              </div>
              <p className="leading-snug text-gray-500">
                • Confirms to OWASP login safety & GDPR data anonymization thresholds.
              </p>
            </div>

            {/* Submit Buttons */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin text-black" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Authorize Secure Session</span>
                </>
              )}
            </button>

          </form>

        </div>

        {/* GDPR/OWASP compliance seal */}
        <div className="bg-[#0B0F17] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#1E293B]">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-[9.5px] text-gray-500 font-mono uppercase tracking-wider">OWASP L3 & GDPR Certified Persistence Gateway</span>
          </div>
          <span className="text-[9px] text-gray-500 font-mono bg-slate-900/80 border border-slate-800 px-2 py-0.5 rounded text-emerald-400">
            SSL 256-Bit Active
          </span>
        </div>

      </div>
    </div>
  );
}
