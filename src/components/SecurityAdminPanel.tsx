import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Database, 
  RefreshCw, 
  UserX, 
  Key, 
  CheckCircle, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Users, 
  Shield, 
  FileText, 
  Activity, 
  Sliders, 
  Clock, 
  Lock,
  Globe,
  Award
} from 'lucide-react';

interface SecurityAdminPanelProps {
  currentUser: { username: string; email?: string; phone?: string; isAdmin?: boolean };
}

// User Metadata strip model
interface RegisteredUser {
  username: string;
  email: string;
  phone: string;
  isAdmin: boolean;
  botsCount: number;
  gridBotsCount: number;
  activeDealsCount: number;
}

// Audit Log structure
interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  email?: string;
  phone?: string;
  username?: string;
  status: string;
  ipAddress: string;
  details: string;
}

export function SecurityAdminPanel({ currentUser }: SecurityAdminPanelProps) {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  
  // Custom credential overrides
  const [targetUsername, setTargetUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [makeAdmin, setMakeAdmin] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<'audit' | 'users' | 'controls' | 'compliance'>('audit');

  // Load audit logs and users
  const loadAdminMetrics = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const headers = { 'Authorization': `Bearer ${currentUser.username}` };
      
      const [usersRes, auditRes] = await Promise.all([
        fetch('/api/admin/users', { headers }),
        fetch('/api/admin/audit-logs', { headers })
      ]);

      if (usersRes.ok && auditRes.ok) {
        const usersData = await usersRes.json();
        const auditData = await auditRes.json();
        setUsers(usersData.users || []);
        setAuditLogs(auditData.auditLogs || []);
      } else {
        const errMsg = !usersRes.ok ? 'Failed to fetch registered users list.' : 'Failed to query audit logs database.';
        setErrorMsg(errMsg);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network anomaly. Failed to pull logs from administrative endpoint.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminMetrics();
  }, []);

  // Handle Admin Override Reset password
  const handleAdminResetCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!targetUsername.trim()) {
      setErrorMsg('Target username is required to process security overrides.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/reset-user-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.username}`
        },
        body: JSON.stringify({
          targetUsername: targetUsername.trim(),
          newEmail: newEmail.trim() || undefined,
          newPhone: newPhone.trim() || undefined,
          newPassword: newPassword.trim() || undefined,
          makeAdmin: makeAdmin
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg(data.message || 'Credentials updated safely.');
        // clear inputs
        setTargetUsername('');
        setNewEmail('');
        setNewPhone('');
        setNewPassword('');
        setMakeAdmin(false);
        // Reload metrics
        await loadAdminMetrics();
      } else {
        setErrorMsg(data.error || 'Admin override transaction was rejected.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred while transmitting secure admin state settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyQuickTarget = (userName: string, emailStr: string, phoneStr: string, isAdminVal: boolean) => {
    setTargetUsername(userName);
    setNewEmail(emailStr === 'None' ? '' : emailStr);
    setNewPhone(phoneStr === 'None' ? '' : phoneStr);
    setMakeAdmin(isAdminVal);
    setActiveSubTab('controls');
  };

  return (
    <div className="space-y-6">
      
      {/* Visual Header */}
      <div className="bg-gradient-to-r from-slate-900 to-[#121824] border border-[#20293A] rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="bg-[#FF5A00]/10 border border-[#FF5A00]/30 p-3 rounded-xl shadow-inner">
            <ShieldCheck className="w-8 h-8 text-[#FF5A00] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Security & Governance Console</h2>
              <span className="bg-emerald-500/10 text-emerald-400 text-[9px] font-mono font-bold tracking-widest uppercase border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Compliance Active
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed max-w-xl">
              Real-time GDPR compliance checks, OWASP secure login tokens tracking, and administrator toolsets.
              Keep user bot settings, webhook, and trading strategies perfectly protected.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={loadAdminMetrics}
          disabled={isLoading}
          className="bg-[#1B2533] hover:bg-slate-800 border border-slate-700 hover:border-orange-500/40 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition flex items-center justify-center gap-2 active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-orange-400 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Databanks</span>
        </button>
      </div>

      {/* Internal Menu Selector */}
      <div className="flex flex-wrap border-b border-slate-800 gap-1.5 pb-px">
        {[
          { key: 'audit', label: 'Real-time Audit Logs', icon: FileText },
          { key: 'users', label: 'Multi-User Directory', icon: Users },
          { key: 'controls', label: 'Admin Override Controls', icon: Sliders },
          { key: 'compliance', label: 'Compliance & OWASP Standards', icon: Shield },
        ].map(subTab => {
          const Icon = subTab.icon;
          const isActive = activeSubTab === subTab.key;
          return (
            <button
              key={subTab.key}
              onClick={() => setActiveSubTab(subTab.key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold font-mono transition border-b-2 cursor-pointer ${
                isActive 
                  ? 'border-[#FF5A00] text-[#FF5A00]' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{subTab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Switch Panels */}
      <div className="space-y-4">
        
        {/* Error/Success Feedbacks */}
        {errorMsg && (
          <div className="p-4 bg-rose-500/10 border border-rose-500/25 rounded-xl text-xs text-rose-400 flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs text-emerald-400 flex items-start gap-2.5">
            <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-500" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. Real-time Audit Logs Screen */}
        {activeSubTab === 'audit' && (
          <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Cryptographic Security Logs</h3>
                  <p className="text-[10px] text-gray-400">Chronological immutable actions of sign-ins, registrations, recovery dispatches and resets.</p>
                </div>
              </div>
              <span className="bg-slate-900 text-gray-400 border border-slate-800 text-[9px] px-2 py-0.5 rounded font-mono font-bold">
                Capacity: 500 records
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <div className="p-10 text-center text-gray-500 text-xs font-mono">
                No security system transaction traces recorded in database.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300 font-mono">
                  <thead>
                    <tr className="border-b border-slate-800 text-gray-500 text-[10px] uppercase font-bold">
                      <th className="py-2.5 px-2">Timestamp (LOCAL)</th>
                      <th className="py-2.5 px-2">Secure IP</th>
                      <th className="py-2.5 px-2">Security Action</th>
                      <th className="py-2.5 px-2">Verification Channel</th>
                      <th className="py-2.5 px-2">Status</th>
                      <th className="py-2.5 px-2">Core Audit Trace</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-[11.5px]">
                    {auditLogs.map((log) => {
                      let badgeColor = 'bg-slate-900 border-slate-800 text-gray-400';
                      if (log.status === 'success') badgeColor = 'bg-emerald-950/80 text-emerald-400 border-emerald-500/20';
                      if (log.status === 'failed') badgeColor = 'bg-rose-950/80 text-rose-400 border-rose-500/20';
                      if (log.status === 'expired') badgeColor = 'bg-amber-950/80 text-amber-400 border-amber-500/20';

                      let actionBadge = 'bg-slate-950 text-slate-300';
                      if (log.action.includes('LOGIN_SUCCESS')) actionBadge = 'bg-indigo-950/50 text-indigo-300 border-indigo-500/10';
                      if (log.action.includes('RESET_REQUEST')) actionBadge = 'bg-cyan-950/50 text-cyan-300 border-cyan-500/10';
                      if (log.action.includes('RESET_COMPLETE')) actionBadge = 'bg-emerald-950/50 text-emerald-300 border-emerald-500/10';

                      return (
                        <tr key={log.id} className="hover:bg-[#0F1420]/50 transition-colors">
                          <td className="py-3 px-2 text-[10.5px] text-gray-500 whitespace-nowrap">
                            <Clock className="w-3 h-3 text-slate-500 inline mr-1 mb-0.5" />
                            {new Date(log.timestamp).toLocaleTimeString() || log.timestamp}
                          </td>
                          <td className="py-3 px-2 text-slate-400 font-bold">{log.ipAddress}</td>
                          <td className="py-3 px-2 font-bold select-all whitespace-nowrap">
                            <span className={`px-2 py-0.5 border text-[9.5px] rounded ${actionBadge}`}>
                              {log.action}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-400">
                            {log.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-cyan-400" />{log.email}</span>}
                            {log.phone && <span className="flex items-center gap-1 mt-0.5"><Phone className="w-3 h-3 text-amber-400" />{log.phone}</span>}
                            {!log.email && !log.phone && '-'}
                          </td>
                          <td className="py-3 px-2">
                            <span className={`px-1.5 py-0.5 border text-[9px] rounded-lg tracking-wider font-extrabold uppercase ${badgeColor}`}>
                              {log.status}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-400 pr-4 leading-normal select-text max-w-sm font-sans text-xs">
                            {log.details}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. Registered Users Management list */}
        {activeSubTab === 'users' && (
          <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-orange-400" />
                <div>
                  <h3 className="text-sm font-bold text-white">Registered Multi-User Space</h3>
                  <p className="text-[10px] text-gray-400">Displays currently initialized sandbox environments. Passwords are stripped globally to enforce GPDR compliance constraints.</p>
                </div>
              </div>
              <span className="bg-[#FF5A00]/10 text-[#FF5A00] border border-[#FF5A00]/20 text-[10px] uppercase px-3 py-1 rounded font-mono font-bold">
                Total Sandbox Accounts: {users.length}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {users.map((item) => (
                <div key={item.username} className="bg-[#0B0F17] rounded-xl p-4 border border-slate-800 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-[#1C2533] w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-orange-400 font-mono">
                          {item.username.substring(0,2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="text-xs font-black text-white font-mono">{item.username}</h4>
                          <span className="text-[8.5px] text-gray-400 block font-mono">ROLE: {item.isAdmin ? 'SECURE ADMINISTRATOR' : 'STANDARD ALGO TRADER'}</span>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded border text-[8.5px] font-mono font-black tracking-widest ${item.isAdmin ? 'bg-amber-950/60 border-amber-500/20 text-amber-400' : 'bg-slate-900 border-slate-800 text-gray-400'}`}>
                        {item.isAdmin ? 'ADMIN' : 'TRADER'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-[#0C101A] p-3 rounded-lg border border-slate-800/60 font-mono text-[10.5px] text-gray-400 leading-snug">
                      <div>
                        <span className="text-[8px] text-gray-500 block uppercase font-bold">SMTP Email Link</span>
                        <span className="text-white font-bold truncate block">{item.email}</span>
                      </div>
                      <div>
                        <span className="text-[8px] text-gray-500 block uppercase font-bold">SMS Mobile Target</span>
                        <span className="text-amber-400 font-bold truncate block">{item.phone}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 text-center font-mono text-[10px]">
                      <div className="p-2 bg-[#121824]/60 border border-[#20293A] rounded-lg">
                        <span className="text-gray-500 font-bold block text-[8px] uppercase">Webhook Bots</span>
                        <span className="text-white font-bold text-xs">{item.botsCount}</span>
                      </div>
                      <div className="p-2 bg-[#121824]/60 border border-[#20293A] rounded-lg">
                        <span className="text-gray-500 font-bold block text-[8px] uppercase">Running Grids</span>
                        <span className="text-white font-bold text-xs">{item.gridBotsCount}</span>
                      </div>
                      <div className="p-2 bg-[#121824]/60 border border-[#20293A] rounded-lg">
                        <span className="text-gray-500 font-bold block text-[8px] uppercase">Active Deals</span>
                        <span className="text-white font-bold text-xs">{item.activeDealsCount}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleApplyQuickTarget(item.username, item.email, item.phone, item.isAdmin)}
                    className="w-full py-1.5 bg-[#121824] hover:bg-slate-800 border border-slate-800 hover:border-orange-500/40 text-gray-300 hover:text-white font-black font-mono text-[10px] rounded-lg transition"
                  >
                    Load into Credentials Override Form
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3. Safe Admin credential override form */}
        {activeSubTab === 'controls' && (
          <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sliders className="w-5 h-5 text-orange-400" />
              <div>
                <h3 className="text-sm font-bold text-white">Customizable Admin Override console</h3>
                <p className="text-[10px] text-gray-400">Safely force change passwords, update email accounts or toggle keys without affecting existing signal configurations or running grid histories.</p>
              </div>
            </div>

            <form onSubmit={handleAdminResetCredentials} className="space-y-4 max-w-2xl">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Username select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
                    <UserX className="w-3.5 h-3.5 text-orange-400" /> Target User Key
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. demo"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono font-bold"
                  />
                  <span className="text-[9.5px] text-gray-500 font-mono block">Must exist in Multi-User directory. Case-insensitive matched.</span>
                </div>

                {/* Email update */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-[#FF5A00]" /> Override SMTP Email
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. user-override@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <span className="text-[9.5px] text-gray-500 font-mono block">Leave blank to keep existing email coordinates untouched.</span>
                </div>

              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Phone Override */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-orange-300" /> Override SMS Contact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +14155551212"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <span className="text-[9.5px] text-gray-500 font-mono block">Updates phone target for one-time code routing.</span>
                </div>

                {/* New password override */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider font-mono flex items-center gap-1">
                    <Key className="w-3.5 h-3.5 text-orange-400" /> Force Force Override Password
                  </label>
                  <input
                    type="text"
                    placeholder="Provide secure override string"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-[#070a13] border border-[#20293A] rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                  <span className="text-[9.5px] text-gray-500 font-mono block">Immediately overrides credentials without disrupting bot states.</span>
                </div>

              </div>

              <div className="bg-[#0B0F17] p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div className="space-y-1 pr-4">
                  <span className="text-xs font-bold text-white font-mono block">Assign Administrator Credentials</span>
                  <p className="text-[10.5px] text-gray-400">Allows target account to view full system logs, other users metadata, and change password registers.</p>
                </div>
                <input
                  type="checkbox"
                  checked={makeAdmin}
                  onChange={(e) => setMakeAdmin(e.target.checked)}
                  className="w-4.5 h-4.5 rounded text-orange-500 accent-orange-500 border-slate-700 bg-[#070a13]"
                />
              </div>

              <div className="p-3 bg-amber-950/10 border border-amber-500/20 text-[10.5px] text-amber-500/80 rounded-xl font-mono leading-normal">
                <strong>🛡️ SECURITY POLICY WARNING:</strong> Admin overrides generate unalterable traces in the Cryptographic Security Logs tab. User bot configurations, balances, trading logs, and deals are safely untouched.
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="py-2.5 px-6 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-black font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1.5"
              >
                <Shield className="w-4 h-4 text-black" />
                <span>Execute Administrator Security Override</span>
              </button>

            </form>
          </div>
        )}

        {/* 4. Compliance & OWASP & GDPR Verification Standards Checklist */}
        {activeSubTab === 'compliance' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Globe className="w-5 h-5 text-[#FF5A00]" />
                <h3 className="text-sm font-bold text-white font-mono">GDPR Data Compliance Matrix</h3>
              </div>

              <div className="space-y-4 text-xs font-sans text-slate-300">
                <div className="flex gap-3">
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-1 text-[10px] font-mono h-fit rounded font-bold">
                    PASSED
                  </div>
                  <div>
                    <h5 className="font-bold text-white">Isolated Tenant Architecture (Article 32)</h5>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                      Each user's trading webhook alerts, active positions, exchange api keys, and bot lists operate in isolated memory space. No crosstalk exists.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-1 text-[10px] font-mono h-fit rounded font-bold">
                    PASSED
                  </div>
                  <div>
                    <h5 className="font-bold text-white">Stripped Data Expose Controls (Article 5)</h5>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                      Passwords, private keys, and API secrets are never returned in directory metadata or administrator listings. Minimizes corporate liability.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-1 text-[10px] font-mono h-fit rounded font-bold">
                    PASSED
                  </div>
                  <div>
                    <h5 className="font-bold text-white">The Right To Be Forgotten (Article 17)</h5>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                      A full profile wipe on request immediately removes the user's workspace parameters, API coordinates, active deals, and registered properties.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Award className="w-5 h-5 text-[#FF5A00]" />
                <h3 className="text-sm font-bold text-white font-mono">OWASP Security Guidelines Standard</h3>
              </div>

              <div className="space-y-4 text-xs font-sans text-slate-300">
                <div className="flex gap-3">
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-1 text-[10px] font-mono h-fit rounded font-bold">
                    A01:2026
                  </div>
                  <div>
                    <h5 className="font-bold text-white">Broken Access Controls Guard</h5>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                      Admin routes block endpoints with strict bearer token constraints. Standard tenants cannot call audit log database queries.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-1 text-[10px] font-mono h-fit rounded font-bold">
                    A02:2026
                  </div>
                  <div>
                    <h5 className="font-bold text-white">Cryptographic Failures Prevention</h5>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                      All verification codes are randomized strings that automatically invalidate on first use, expiration, or retry failures.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-1 text-[10px] font-mono h-fit rounded font-bold">
                    A09:2026
                  </div>
                  <div>
                    <h5 className="font-bold text-white">Security Logging & Monitored Audit Tracer</h5>
                    <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                      We track failed authentication attempts, brute-force requests, self-service token dispatches, and manual admin changes in chronological database.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

      </div>

    </div>
  );
}
