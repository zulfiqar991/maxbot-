import React from 'react';
import { Bot, RefreshCw, Layers, ShieldAlert, Award, User, LogOut } from 'lucide-react';
import { AccountState } from '../types';

interface HeaderProps {
  state: AccountState;
  onReset: () => void;
  isResetting: boolean;
  currentUser: { username: string } | null;
  onLogout: () => void;
}

export function Header({ state, onReset, isResetting, currentUser, onLogout }: HeaderProps) {
  // Calculate total active deals metrics
  const activeCount = state.activeDeals.filter(d => d.status === 'active').length;
  const totalPnl = state.activeDeals.reduce((sum, deal) => {
    return sum + (deal.status === 'active' ? deal.pnl : 0);
  }, 0);

  // Calculate historic closed profit
  // A historic deal is one that is closed
  const closedDeals = state.activeDeals.filter(d => d.status !== 'active');
  const closedPnl = state.activeDeals
    .filter(d => d.status !== 'active')
    .reduce((sum, d) => sum + d.pnl, 0);

  const netAssetValue = state.balance + totalPnl;

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
                <h1 className="text-xl font-bold text-white tracking-tight leading-none text-orange-500">Max Bot</h1>
                <span className="bg-[#FF5A00]/10 text-[#FF5A00] text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-[#FF5A00]/20">
                  Quantum AI Engine
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">High-Frequency Webhook & Live Grid Suite</p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="flex flex-wrap items-center gap-4 lg:gap-6 bg-[#111827] border border-[#1E293B] rounded-xl px-5 py-3 shadow-md">
            
            <div className="flex flex-col min-w-[110px]">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${state.accountMode === 'real' ? 'bg-emerald-500 animate-pulse' : 'bg-orange-500 animate-pulse'}`}></span>
                {state.accountMode === 'real' ? 'REAL BALANCE' : 'PAPER BALANCE'}
              </span>
              <span className="text-sm font-semibold font-mono text-white mt-0.5">
                ${(state.accountMode === 'real' ? (state.realBalance ?? 50000) : state.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            <div className="hidden sm:block border-l border-[#1E293B] h-8" />

            <div className="flex flex-col min-w-[100px]">
              <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">PORTFOLIO VALUE</span>
              <span className="text-sm font-semibold font-mono text-white mt-0.5">
                ${((state.accountMode === 'real' ? (state.realBalance ?? 50000) : state.balance) + totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                {currentUser ? currentUser.username : 'DEMO USER'}
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

            <div className="border-l border-[#1E293B] h-8" />

            {/* Log Out */}
            <button
              id="header_logout_btn"
              onClick={onLogout}
              className="flex items-center space-x-1 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition rounded-lg text-xs font-semibold cursor-pointer border border-rose-500/20 active:scale-95"
              title="Logout from Max Bot Suite"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-500" />
              <span>Log Out</span>
            </button>
          </div>

        </div>
      </div>
    </header>
  );
}
