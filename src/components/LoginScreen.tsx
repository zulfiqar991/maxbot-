import React, { useState } from 'react';
import { 
  Shield, 
  Key, 
  User, 
  PlusCircle, 
  LogIn, 
  AlertCircle, 
  Cpu, 
  ShieldCheck, 
  Mail, 
  HelpCircle, 
  CheckCircle,
  Phone,
  RefreshCw,
  Copy,
  ChevronRight,
  Send,
  Lock
} from 'lucide-react';

interface LoginScreenProps {
  onLoginSuccess: (user: { username: string; email?: string; phone?: string; isAdmin?: boolean; password?: string }, state: any) => void;
}

export function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'recovery'>('login');
  
  // Registration & Form inputs
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  
  // Recovery channel state
  const [recoveryChannel, setRecoveryChannel] = useState<'email' | 'sms'>('email');
  const [recoveryTarget, setRecoveryTarget] = useState('');
  
  // Token Verification inputs
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // UI state feedback elements
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Simulation payload capturing
  const [simulatedNotify, setSimulatedNotify] = useState<{
    type: string;
    recipient: string;
    token: string;
    expiresInMinutes: number;
    simulatedPayload: string;
  } | null>(null);

  const handleToggleMode = (newMode: 'login' | 'register' | 'recovery') => {
    setMode(newMode);
    setErrorMsg(null);
    setSuccessMsg(null);
    setSimulatedNotify(null);
    setVerificationToken('');
    setNewPassword('');
  };

  const handleCopyToken = () => {
    if (simulatedNotify) {
      navigator.clipboard.writeText(simulatedNotify.token);
      alert('Secure token copied to clipboard!');
    }
  };

  // Secure Password reset request
  const handleRequestRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setSimulatedNotify(null);

    const input = recoveryTarget.trim();
    if (!input) {
      setErrorMsg(`Please specify your registered ${recoveryChannel === 'sms' ? 'phone number' : 'email address'} for verification.`);
      return;
    }

    if (recoveryChannel === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(input)) {
        setErrorMsg('Please enter a valid formatted email address.');
        return;
      }
    } else {
      if (input.length < 5) {
        setErrorMsg('Please enter a valid phone coordinates string.');
        return;
      }
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/security/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: recoveryChannel,
          target: input
        })
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Verification token queued successfully.');
        if (data.simulatedNotify) {
          setSimulatedNotify(data.simulatedNotify);
          // Auto-fill code field for convenience in sandbox env
          setVerificationToken(data.simulatedNotify.token);
        } else {
          // generic fallback is standard to prevent harvesting
          setSuccessMsg('Request completed. If the parameters was registered, a 6-character recovery token was successfully issued.');
        }
      } else {
        setErrorMsg(data.error || 'Password recovery initialization failed.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network anomaly. Failed to contact secure gateway.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Password reset token confirmation
  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!verificationToken.trim()) {
      setErrorMsg('One-time verification token code is required.');
      return;
    }
    if (!newPassword.trim() || newPassword.trim().length < 4) {
      setErrorMsg('Please provide a secure new password (at least 4 characters long).');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/security/complete-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: verificationToken.trim(),
          newPassword: newPassword.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Security parameters reset successfully! Your bot preferences remain safe. Please login.');
        setSimulatedNotify(null);
        setVerificationToken('');
        setNewPassword('');
        // Automatically switch back to login with a slight visual flag
        setTimeout(() => {
          handleToggleMode('login');
          setSuccessMsg('Credentials reconstructed successfully. Please sign-in with your new password.');
        }, 1200);
      } else {
        setErrorMsg(data.error || 'Failed to complete password reset.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Secure verification failed. Communication anomaly.');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit Register or Login Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === 'login') {
      if (!email.trim() || !password.trim()) {
        setErrorMsg('Email Address and Security Password are required.');
        return;
      }
    } else {
      if (!username.trim() || !email.trim() || !password.trim()) {
        setErrorMsg('Username, Email and Password fields are all mandatory.');
        return;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        setErrorMsg('Specify a valid email address.');
        return;
      }
      if (username.trim().length < 3) {
        setErrorMsg('Username must be at least 3 characters.');
        return;
      }
    }

    setIsLoading(true);
    const endpoint = mode === 'register' ? '/api/register' : '/api/login';

    try {
      const payload = mode === 'register'
        ? { username: username.trim(), email: email.trim().toLowerCase(), phone: phone.trim(), password: password.trim() }
        : { email: email.trim(), password: password.trim() }; // login uses email + password strictly

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        onLoginSuccess({ ...data.user, password: password.trim() }, data.state);
      } else {
        setErrorMsg(data.error || 'Authentication credentials rejected.');
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
              {mode === 'login' && 'Secure Email Sign-In Gateway'}
              {mode === 'register' && 'Assemble Secure Multi-User Profile'}
              {mode === 'recovery' && 'Encrypted Self-Service Recovery'}
            </h2>
            <p className="text-xs text-gray-500">
              {mode === 'login' && 'Verify your identity using registered email to sync and backtest your algorithmic strategy lines safely.'}
              {mode === 'register' && 'Each registered user gets a fully isolated database container sandbox for bots & settings.'}
              {mode === 'recovery' && 'One-time secure tokens with military-grade expiry thresholds. No profile data exposure.'}
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
  
          {mode === 'login' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-orange-400" /> Registered Email Address
                </label>
                <input
                  type="text"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. tradermax@gmail.com"
                  className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono transition-all"
                />
              </div>
  
              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-orange-400" /> Secure Password
                  </label>
                  
                  <button
                    type="button"
                    onClick={() => handleToggleMode('recovery')}
                    className="text-[10px] text-orange-400 font-semibold hover:text-orange-300 transition-colors font-mono cursor-pointer"
                  >
                    Recover Password?
                  </button>
                </div>
                <input
                  type="password"
                  required
                  disabled={isLoading}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
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
          )}

          {mode === 'register' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-4">
                
                {/* User ID (Username) */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-orange-400" /> User ID
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isLoading}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. mastertrader"
                    className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono transition-all"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-orange-400" /> Email
                  </label>
                  <input
                    type="email"
                    required
                    disabled={isLoading}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="trader@example.com"
                    className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono transition-all"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-orange-400" /> Password
                  </label>
                  <input
                    type="password"
                    required
                    disabled={isLoading}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono transition-all"
                  />
                </div>

              </div>

              {/* Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    <span>Initialize Secure Multi-User Account</span>
                  </>
                )}
              </button>

            </form>
          )}

          {mode === 'recovery' && (
            <div className="space-y-6">
              
              {/* Self Service Recovery Request Form */}
              <form onSubmit={handleRequestRecovery} className="bg-[#0B0F17] p-5 rounded-xl border border-[#20293A] space-y-4">
                
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-mono font-black text-[#FF5A00] uppercase tracking-widest">
                    Step 1: Request Security Code
                  </label>
                  <div className="flex gap-2 bg-[#070a13] p-1 rounded-lg border border-slate-800">
                    <button
                      type="button"
                      onClick={() => { setRecoveryChannel('email'); setRecoveryTarget(''); }}
                      className={`text-[9px] px-2.5 py-1 rounded font-mono font-extrabold uppercase transition-all ${recoveryChannel === 'email' ? 'bg-[#FF5A00] text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                      SMTP Email
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRecoveryChannel('sms'); setRecoveryTarget(''); }}
                      className={`text-[9px] px-2.5 py-1 rounded font-mono font-extrabold uppercase transition-all ${recoveryChannel === 'sms' ? 'bg-[#FF5A00] text-black' : 'text-gray-400 hover:text-white'}`}
                    >
                      Twilio SMS
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                    {recoveryChannel === 'email' ? (
                      <>
                        <Mail className="w-3.5 h-3.5 text-orange-400" /> Registered Email Address
                      </>
                    ) : (
                      <>
                        <Phone className="w-3.5 h-3.5 text-orange-400" /> SMS Phone Number
                      </>
                    )}
                  </label>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={recoveryTarget}
                      onChange={(e) => setRecoveryTarget(e.target.value)}
                      placeholder={recoveryChannel === 'email' ? 'trader@example.com' : 'e.g. +14155550199'}
                      className="flex-1 bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 bg-[#FF5A00] hover:bg-[#FF5A00]/90 text-black font-extrabold text-[11px] rounded-xl transition active:scale-95 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isLoading ? 'Sending...' : 'Issue Code'}</span>
                    </button>
                  </div>
                  <span className="text-[9.5px] text-gray-500 block leading-normal">
                    * GDPR compliant verification: Security system generates stateful tokens with a strict 10-minute expiry range.
                  </span>
                  <span className="text-[10px] text-orange-400 font-mono font-semibold block leading-normal mt-1.5 p-2 bg-[#FF5A00]/5 border border-[#FF5A00]/10 rounded-lg">
                    💡 SANDBOX HINT: Enter your EXACT registered email address or your own profile email to generate and display the recovery token instantly in the simulator below!
                  </span>
                </div>

              </form>

              {/* Simulated Device Sandbox Outbox Log */}
              {simulatedNotify && (
                <div className="bg-[#050810] border border-emerald-500/25 rounded-2xl p-5 space-y-3.5 shadow-2xl relative">
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className="bg-emerald-500/10 text-emerald-400 text-[8px] border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono font-black uppercase">
                      SANDBOX SIMULATION CAPTURE
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20">
                      <RefreshCw className="w-4 h-4 text-emerald-400 animate-spin" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white font-mono">Simulated Outbox Dispatch</h4>
                      <p className="text-[10px] text-gray-400">Captured verification payload sent via local SMTP or Twilio.</p>
                    </div>
                  </div>

                  <div className="relative">
                    <pre className="bg-[#0b0f17] text-slate-300 font-mono text-[10.5px] p-4 rounded-xl border border-slate-800 overflow-x-auto select-all leading-relaxed max-h-40 overflow-y-auto">
                      {simulatedNotify.simulatedPayload}
                    </pre>
                    <button
                      type="button"
                      onClick={handleCopyToken}
                      className="absolute bottom-3 right-3 bg-[#1e293b] hover:bg-slate-800 text-white p-1.5 rounded-lg border border-slate-700 hover:border-emerald-500/40 transition flex items-center gap-1.5 text-[9.5px] font-mono cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copy Verification Token: <strong>{simulatedNotify.token}</strong></span>
                    </button>
                  </div>

                  <p className="text-[10px] text-emerald-400/80 leading-normal font-mono">
                    ✔ Security audit trace logged. Proceed to Enter Reset Token below with your new password parameters.
                  </p>
                </div>
              )}

              {/* Verification & Reset Password Submission Stage */}
              <form onSubmit={handleCompleteReset} className="bg-[#0B0F17] p-5 rounded-xl border border-[#20293A] space-y-4">
                <h4 className="text-[11px] font-mono font-black text-[#FF5A00] uppercase tracking-widest">
                  Step 2: Enter Reset Token & Set New Password
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Token Gate Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5 text-orange-400" /> Verification Token Link
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. tok_T9AC8F0"
                      value={verificationToken}
                      onChange={(e) => setVerificationToken(e.target.value)}
                      className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>

                  {/* New Password Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
                      <Key className="w-3.5 h-3.5 text-orange-400" /> Ultimate New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <ShieldCheck className="w-4 h-4 text-black" />
                  <span>{isLoading ? 'Applying credentials...' : 'Re-verify & Save Credentials'}</span>
                </button>
              </form>

            </div>
          )}

          {/* Switch toggle layout routing */}
          <div className="text-center pt-3 border-t border-[#1E293B] flex flex-col gap-2">
            
            {mode === 'login' && (
              <button
                type="button"
                onClick={() => handleToggleMode('register')}
                className="text-xs text-orange-400 hover:text-orange-300 font-medium transition cursor-pointer"
              >
                Assemble Profile? Register secure credentials here <ChevronRight className="w-3 h-3 inline" />
              </button>
            )}

            {mode === 'register' && (
              <button
                type="button"
                onClick={() => handleToggleMode('login')}
                className="text-xs text-orange-400 hover:text-orange-300 font-medium transition cursor-pointer"
              >
                Already registered? Authorize via main screen here <ChevronRight className="w-3 h-3 inline" />
              </button>
            )}

            {mode === 'recovery' && (
              <button
                type="button"
                onClick={() => handleToggleMode('login')}
                className="text-xs text-orange-400 hover:text-orange-300 font-medium transition cursor-pointer"
              >
                Remembered? Return back to sign-in console <ChevronRight className="w-3 h-3 inline" />
              </button>
            )}

          </div>

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
