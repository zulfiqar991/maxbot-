import React from 'react';
import { Bot, RefreshCw, Layers, ShieldAlert, Award, User } from 'lucide-react';
import { AccountState } from '../types';

interface HeaderProps {
  state: AccountState;
  onReset: () => void;
  isResetting: boolean;
  currentUser: { username: string } | null;
  onUpdateSettings?: (settings: Partial<AccountState>) => Promise<void>;
}

export function Header({ state, onReset, isResetting, currentUser, onUpdateSettings }: HeaderProps) {
  const accountMode = state.accountMode || 'real';
  // Filter active deals by selected mode (real or paper)
  const filteredDealsByMode = (state.activeDeals || []).filter(
    d => ((d as any).accountMode || 'real') === accountMode
  );

  // Calculate total active deals metrics based on current mode
  const activeCount = filteredDealsByMode.filter(d => d.status === 'active').length;
  const totalPnl = filteredDealsByMode.reduce((sum, deal) => {
    return sum + (deal.status === 'active' ? deal.pnl : 0);
  }, 0);

  // Calculate historic closed profit based on current mode
  const closedDeals = filteredDealsByMode.filter(d => d.status !== 'active');
  const closedPnl = filteredDealsByMode
    .filter(d => d.status !== 'active')
    .reduce((sum, d) => sum + d.pnl, 0);

  const modeBalance = accountMode === 'real' ? (state.realBalance ?? 50000) : (state.balance ?? 10000);
  const netAssetValue = modeBalance + totalPnl;

  const handleToggleModeHeader = async () => {
    if (onUpdateSettings) {
      const nextMode = accountMode === 'real' ? 'paper' : 'real';
      await onUpdateSettings({ accountMode: nextMode });
    }
  };

  return (
    <header className="border-b border-[#1E293B] bg-[#0B0F19] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Logo / Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-[#FF5A00] p-2.5 rounded-xl shadow-lg shadow-[#FF5A00]/20 flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" id="logo_icon"/>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold text-white tracking-tight leading-none text-orange-500 font-sans">Max Bot</h1>
                <span className="bg-[#FF5A00]/10 text-[#FF5A00] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#FF5A00]/20 font-sans">
                  CONCURRENT MULTI-API CORE
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 font-sans">Enterprise Webhook Routing & High-Frequency Suite</p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-4 lg:gap-6 bg-[#111827] border border-[#1E293B] rounded-xl px-5 py-3 shadow-md">
            
            <div
              id="header_toggle_mode_btn"
              onClick={handleToggleModeHeader}
              className={`flex flex-col min-w-[155px] text-left rounded-lg p-1.5 border cursor-pointer select-none transition-all hover:scale-105 active:scale-95 ${
                accountMode === 'real'
                  ? 'bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/15'
                  : 'bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/15'
              }`}
              title="Click to toggle between Real Account production and Demo sandbox mode instantly."
            >
              <span className={`text-[10px] font-mono uppercase tracking-wider flex items-center gap-1.5 ${
                accountMode === 'real' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full animate-ping ${
                  accountMode === 'real' ? 'bg-emerald-500' : 'bg-amber-500'
                }`}></span>
                {accountMode === 'real' ? 'REAL ACCOUNT' : 'DEMO MODE'}
              </span>
              <span className={`text-sm font-bold font-mono mt-0.5 ${
                accountMode === 'real' ? 'text-emerald-400' : 'text-amber-400'
              }`}>
                ${modeBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex flex-col gap-1 min-w-[150px] border border-[#1E293B] rounded-lg p-1.5 bg-[#0F172A]/50">
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono gap-3">
                <span className="uppercase tracking-wider">Spot Balance:</span>
                <span className="text-emerald-400 font-bold">
                  ${(accountMode === 'real' ? (state.realSpotBalance ?? 0) : (state.spotBalance ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between items-center text-[10px] text-gray-400 font-mono gap-3">
                <span className="uppercase tracking-wider">Futures Balance:</span>
                <span className="text-amber-400 font-bold">
                  ${(accountMode === 'real' ? (state.realFuturesBalance ?? 0) : (state.futuresBalance ?? 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="hidden sm:block border-l border-[#1E293B] h-8" />

            <div className="flex flex-col min-w-[100px]">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">PORTFOLIO VALUE</span>
              <span className="text-sm font-semibold font-mono text-white mt-0.5">
                ${(modeBalance + totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="border-l border-[#1E293B] h-8" />

            <div className="flex flex-col min-w-[90px]">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">LIVE PNL</span>
              <span className={`text-sm font-semibold font-mono mt-0.5 flex items-center ${totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-500'}`}>
                {totalPnl >= 0 ? '+' : ''}${totalPnl.toFixed(2)}
              </span>
            </div>

            <div className="border-l border-[#1E293B] h-8" />

            <div className="flex flex-col min-w-[110px]">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">CLOSED TRADES PNL</span>
              <span className={`text-sm font-semibold font-mono mt-0.5 ${closedPnl >= 0 ? 'text-emerald-400 hover:brightness-110' : 'text-rose-500'} transition-all`}>
                {closedPnl >= 0 ? '+' : ''}${closedPnl.toFixed(2)}
              </span>
            </div>

            <div className="border-l border-[#1E293B] h-8" />

            <div className="flex flex-col min-w-[80px]">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">ACTIVE TRADES</span>
              <span className="text-sm font-semibold font-mono text-white mt-0.5 flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${activeCount > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-gray-500'}`}></span>
                {activeCount} Positions
              </span>
            </div>

            <div className="border-l border-[#1E293B] h-8" />

            {/* Active User Email profile info */}
            <div className="flex flex-col min-w-[120px]">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-orange-500" /> ACTIVE PROFILE
              </span>
              <span className="text-xs font-semibold font-mono text-white mt-0.5 truncate max-w-[140px]" title={currentUser ? currentUser.username : ''}>
                {currentUser ? currentUser.username : 'ADMINISTRATOR'}
              </span>
            </div>

            <div className="border-l border-[#1E293B] h-8" />

            {/* Reset */}
            <button
              id="header_reset_btn"
              onClick={onReset}
              disabled={isResetting}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#FF5A00]/10 hover:bg-[#FF5A00]/20 disabled:bg-gray-800 disabled:opacity-50 text-[#FF5A00] transition rounded-lg text-xs font-semibold cursor-pointer border border-[#FF5A00]/20 active:scale-95"
              title="Reset Account to default $10k balance"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
              <span>Reset</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
