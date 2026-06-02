import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  Terminal, 
  BarChart3, 
  Cpu, 
  Plus, 
  Layers, 
  Info, 
  Check, 
  AlertCircle, 
  RotateCcw, 
  HelpCircle, 
  TrendingUp, 
  LineChart,
  Shield,
  Database
} from 'lucide-react';
import { AccountState, SignalBot, GridBot, Deal, SignalLog } from './types';
import { Header } from './components/Header';
import { BotCreator } from './components/BotCreator';
import { BotsDashboard } from './components/BotsDashboard';
import { DealsTracker } from './components/DealsTracker';
import { SignalSimulator } from './components/SignalSimulator';
import { PineScriptHelper } from './components/PineScriptHelper';
import { ExchangeManager } from './components/ExchangeManager';
import { WebhookLogs } from './components/WebhookLogs';
import { SecurityAdminPanel } from './components/SecurityAdminPanel';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'create' | 'deals' | 'simulator' | 'pine' | 'exchanges' | 'weblogs' | 'security'>('dashboard');
  
  // Set up current user auth session - Direct, unrestricted access enabled
  const [currentUser, setCurrentUser] = useState<{ username: string; email?: string; phone?: string; isAdmin?: boolean } | null>({
    username: 'Administrator',
    email: 'admin@maxbot.io',
    phone: '+123456789',
    isAdmin: true
  });

  const [state, setState] = useState<AccountState>({
    balance: 10000,
    realBalance: 50000,
    accountMode: undefined,
    bots: [],
    gridBots: [],
    exchangeCredentials: [],
    activeDeals: [],
    logs: []
  });

  const [isConnected, setIsConnected] = useState<boolean>(true);

  // Secure Authorization Helper
  const getHeaders = (extraHeaders: Record<string, string> = {}) => {
    const headers: Record<string, string> = {
      ...extraHeaders
    };
    if (currentUser?.username) {
      headers['Authorization'] = `Bearer ${currentUser.username}`;
    }
    return headers;
  };

  // Action hook to update live account mode and api credentials on the server
  const handleUpdateExchangeSettings = async (settings: Partial<AccountState>) => {
    try {
      const res = await fetch('/api/account-settings', {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(settings)
      });
      if (res.ok) {
        await fetchStateFromServer();
      }
    } catch (err) {
      console.error('Failed to update credentials via REST settings endpoint:', err);
    }
  };

  const [coinPrices, setCoinPrices] = useState<Record<string, number>>({});
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isSavingBot, setIsSavingBot] = useState<boolean>(false);
  const [isSavingGridBot, setIsSavingGridBot] = useState<boolean>(false);

  const [botToEdit, setBotToEdit] = useState<SignalBot | undefined>(undefined);
  const [gridBotToEdit, setGridBotToEdit] = useState<GridBot | undefined>(undefined);

  const [selectedBotIdForSimulator, setSelectedBotIdForSimulator] = useState<string | undefined>(undefined);
  const [selectedBotIdForPineCode, setSelectedBotIdForPineCode] = useState<string | undefined>(undefined);
  const [isClosingDealId, setIsClosingDealId] = useState<string | null>(null);
  
  // Audio/Visual alert logs tracking
  const [lastLogCount, setLastLogCount] = useState<number>(0);
  const [newLogToast, setNewLogToast] = useState<string | null>(null);

  const restoreUserSession = async () => {
    if (!currentUser?.username || !currentUser?.password) return;
    try {
      console.log('Restoring wiped server-side user data...');
      let stateToSync = state;
      const savedStateStr = localStorage.getItem(`maxbot_state_${currentUser.username.toLowerCase()}`);
      if (savedStateStr) {
        try {
          const parsed = JSON.parse(savedStateStr);
          if (parsed && parsed.balance !== undefined) {
            stateToSync = parsed;
          }
        } catch (e) {
          console.error('Failed to parse saved state:', e);
        }
      }
      const response = await fetch('/api/sync-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: currentUser.username,
          email: currentUser.email || `${currentUser.username}@example.com`,
          phone: currentUser.phone || '',
          password: currentUser.password,
          isAdmin: !!currentUser.isAdmin,
          state: stateToSync
        })
      });
      if (response.ok) {
        console.log('Server-side user data restored successfully!');
        const res = await fetch('/api/state', {
          headers: getHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          setState(data.state);
          setCoinPrices(data.coinPrices || {});
          setIsConnected(true);
        }
      }
    } catch (err) {
      console.error('Failed to restore wiped user session:', err);
    }
  };

  // Poll state from Backend Server API
  const fetchStateFromServer = async () => {
    if (!currentUser?.username) return;
    try {
      const res = await fetch('/api/state', {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        
        // Check if the server fell back or if the user got wiped from the database
        if (data.username && currentUser?.username && data.username.toLowerCase() !== currentUser.username.toLowerCase()) {
          console.warn(`User mismatch detected on server. Initiating secure client-side restoration...`);
          await restoreUserSession();
          return;
        }

        const serverState = data.state as AccountState;
        setState(serverState);
        setCoinPrices(data.coinPrices || {});
        setIsConnected(true);
        
        const currentLogsCount = serverState.logs?.length || 0;
        if (lastLogCount > 0 && currentLogsCount > lastLogCount) {
          const freshLog = serverState.logs[0];
          setNewLogToast(freshLog.message);
          setTimeout(() => setNewLogToast(null), 5000);
        }
        setLastLogCount(currentLogsCount);
      } else {
        console.warn(`Server status returned non-200 code: ${res.status}`);
      }
    } catch (err: any) {
      setIsConnected(false);
      if (err instanceof TypeError || String(err).includes('Failed to fetch') || String(err).includes('fetch')) {
        console.warn('Sandbox trading server connection is offline or restarting. Recovering automatically...');
      } else {
        console.error('Error fetching state from endpoint API:', err);
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('maxbot_currentUser');
    setCurrentUser(null);
    setState({
      balance: 10000,
      realBalance: 50000,
      accountMode: undefined,
      bots: [],
      gridBots: [],
      exchangeCredentials: [],
      activeDeals: [],
      logs: []
    });
    setView('dashboard');
  };

  useEffect(() => {
    // Immediate load
    fetchStateFromServer();

    // Poll every 3 seconds to update ticker prices, deal profits, and central balances
    const timer = setInterval(fetchStateFromServer, 3500);
    return () => clearInterval(timer);
  }, [lastLogCount, currentUser]);

  // RESET DATABASE STATE
  const handleResetState = async () => {
    if (!window.confirm('Do you want to reset the Paper account? Active trades will close, logs will clear and default bots will restore.')) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch('/api/reset', { 
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        await fetchStateFromServer();
        setNewLogToast('Account state and balances successfully reset to factory defaults.');
        setTimeout(() => setNewLogToast(null), 4000);
      }
    } catch (err) {
      console.error('Failed to reset states:', err);
    } finally {
      setIsResetting(false);
    }
  };

  // SAVE OR EDIT SIGNAL BOT
  const handleSaveBot = async (botData: Partial<SignalBot>) => {
    setIsSavingBot(true);
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(botData)
      });
      if (res.ok) {
        await fetchStateFromServer();
        setView('dashboard');
        setBotToEdit(undefined);
      } else {
        alert('Server rejected bot configuration settings.');
      }
    } catch (err) {
      console.error('Error saving bot:', err);
      alert('Internal error updating bot.');
    } finally {
      setIsSavingBot(false);
    }
  };

  // QUICK SYNC SIGNAL BOT FROM PINE SCRIPTOR
  const handleUpdateBotFromPine = async (botData: Partial<SignalBot>) => {
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(botData)
      });
      if (res.ok) {
        await fetchStateFromServer();
      }
    } catch (err) {
      console.error('Error syncing bot settings from Pine script:', err);
    }
  };

  // SAVE OR EDIT GRID BOT
  const handleSaveGridBot = async (gridData: Partial<GridBot>) => {
    setIsSavingGridBot(true);
    try {
      const res = await fetch('/api/grid-bots', {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(gridData)
      });
      if (res.ok) {
        await fetchStateFromServer();
        setView('dashboard');
        setGridBotToEdit(undefined);
      } else {
        alert('Server rejected grid bot installation.');
      }
    } catch (err) {
      console.error('Error saving grid bot:', err);
      alert('Internal error updating grid bot.');
    } finally {
      setIsSavingGridBot(false);
    }
  };

  // ACTIVATE OR PAUSE SIGNAL BOT RUN STATE
  const handleToggleBotStatus = async (botId: string, currentStatus: 'active' | 'inactive') => {
    const targetBot = state.bots.find(b => b.id === botId);
    if (!targetBot) return;

    const updatedBot = {
      ...targetBot,
      status: currentStatus === 'active' ? 'inactive' : 'active'
    };

    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updatedBot)
      });
      if (res.ok) {
        await fetchStateFromServer();
      }
    } catch (err) {
      console.error('Failed to change bot state:', err);
    }
  };

  // ACTIVATE OR PAUSE GRID BOT STATUS
  const handleToggleGridBotStatus = async (botId: string, currentStatus: 'active' | 'inactive') => {
    const targetGrid = state.gridBots?.find(gb => gb.id === botId);
    if (!targetGrid) return;

    const updatedGrid = {
      ...targetGrid,
      status: currentStatus === 'active' ? 'inactive' : 'active'
    };

    try {
      const res = await fetch('/api/grid-bots', {
        method: 'POST',
        headers: getHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify(updatedGrid)
      });
      if (res.ok) {
        await fetchStateFromServer();
      }
    } catch (err) {
      console.error('Failed to change grid bot status:', err);
    }
  };

  // EDIT SIGNAL BOT TRIGGER
  const handleEditBotTrigger = (bot: SignalBot) => {
    setBotToEdit(bot);
    setGridBotToEdit(undefined);
    setView('create');
  };

  // EDIT GRID BOT TRIGGER
  const handleEditGridBotTrigger = (grid: GridBot) => {
    setGridBotToEdit(grid);
    setBotToEdit(undefined);
    setView('create');
  };

  // DELETE SINGLE SIGNAL BOT
  const handleDeleteBot = async (botId: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this bot? Any active positions linked to it will be closed and refunded.')) {
      return;
    }
    try {
      const res = await fetch(`/api/bots/${botId}`, { 
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        await fetchStateFromServer();
      }
    } catch (err) {
      console.error('Failed to remove bot:', err);
    }
  };

  // DELETE GRID BOT
  const handleDeleteGridBot = async (botId: string) => {
    if (!window.confirm('Are you absolutely sure you want to delete this grid bot? All running grid limits will be canceled.')) {
      return;
    }
    try {
      const res = await fetch(`/api/grid-bots/${botId}`, { 
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        await fetchStateFromServer();
      }
    } catch (err) {
      console.error('Failed to remove grid bot:', err);
    }
  };

  // MANUALLY CLOSE POSITION AT EXCHANGES
  const handleClosePosition = async (dealId: string) => {
    setIsClosingDealId(dealId);
    try {
      const res = await fetch(`/api/deals/${dealId}/close`, { 
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        await fetchStateFromServer();
      }
    } catch (err) {
      console.error('Failed to close deal:', err);
    } finally {
      setIsClosingDealId(null);
    }
  };

  // AI Pine Script trigger handler calling server gemini endpoint
  const handleGeneratePineCode = async (params: any): Promise<string> => {
    const res = await fetch('/api/generate-script', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(params)
    });
    if (!res.ok) {
      throw new Error('Script compilation service failed on server.');
    }
    const data = await res.json();
    return data.script;
  };

  // Webhook action trigger posting webhook locally or client-side mockup server
  const handleSendSimulatedWebhook = async (payload: any): Promise<any> => {
    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    const parsed = await res.json();
    await fetchStateFromServer();
    return parsed;
  };

  return (
    <div className="min-h-screen bg-[#070a13] font-sans text-gray-200 antialiased selection:bg-[#FF5A00]/20 selection:text-[#FF5A00]">
      
      {/* Explicit Account Mode Selector Dialog */}
      {!state.accountMode && (
        <div id="selection-overlay-container" className="fixed inset-0 bg-[#06080F]/95 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border-2 border-orange-500/35 rounded-2xl p-8 max-w-xl w-full text-center space-y-6 shadow-2xl relative overflow-hidden animate-fadeIn">
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="mx-auto bg-orange-500/10 w-16 h-16 rounded-full flex items-center justify-center border border-orange-500/20 shadow-lg shadow-orange-500/5">
              <Shield className="w-8 h-8 text-[#FF5A00]" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight font-sans">Select Trading Environment</h2>
              <p className="text-xs text-slate-400 font-sans">
                Max Bot requires you to explicitly select an account environment. Sandbox (paper trading) has no pre-allocation. Choose between live network operations and simulated safety-net prototyping.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Sandbox Case */}
              <button
                id="select-sandbox-btn"
                onClick={() => handleUpdateExchangeSettings({ accountMode: 'paper' })}
                className="bg-gradient-to-br from-[#121824] to-amber-500/5 hover:to-amber-500/10 border border-[#20293A] hover:border-amber-500/30 rounded-xl p-5 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer relative group flex flex-col justify-between h-48"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-amber-500 tracking-wider font-mono">SANDBOX ENVIRONMENT</span>
                    <Layers className="w-4 h-4 text-amber-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <h4 className="text-base font-bold text-white mt-2 font-sans">Sandbox Mode</h4>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-sans">
                    Activate simulated execution, testing webhook signals risk-free with custom faucet funds and instant order fills.
                  </p>
                </div>
                <span className="bg-amber-500/10 text-amber-400 text-[10px] font-bold text-center py-2 px-3 rounded-lg border border-amber-500/20 block w-full mt-3 font-mono">
                  ACTIVATE SANDBOX
                </span>
              </button>

              {/* Real Mode Case */}
              <button
                id="select-real-btn"
                onClick={() => handleUpdateExchangeSettings({ accountMode: 'real' })}
                className="bg-gradient-to-br from-[#121824] to-emerald-500/5 hover:to-emerald-500/10 border border-[#20293A] hover:border-emerald-500/30 rounded-xl p-5 text-left transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer relative group flex flex-col justify-between h-48"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-emerald-400 tracking-wider font-mono">LIVE PRODUCTION</span>
                    <TrendingUp className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                  </div>
                  <h4 className="text-base font-bold text-white mt-2 font-sans">Real Account</h4>
                  <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed font-sans">
                    Connect private API keys. Automatically checks spot or futures margin pools and routes direct webhook signals live.
                  </p>
                </div>
                <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold text-center py-2 px-3 rounded-lg border border-emerald-500/30 block w-full mt-3 font-mono">
                  ACTIVATE REAL ACCOUNT
                </span>
              </button>
            </div>

            <div className="text-[10px] text-zinc-500 font-mono font-bold uppercase tracking-wider">
              Transparency Enforced: Switchable At Any Time
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Header */}
      <Header 
        state={state} 
        onReset={handleResetState} 
        isResetting={isResetting} 
        currentUser={currentUser}
        onUpdateSettings={handleUpdateExchangeSettings}
      />

      {/* Main layout container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Toast notifications */}
        {newLogToast && (
          <div className="fixed bottom-6 right-6 z-50 bg-[#FF5A00] text-white p-4 rounded-xl shadow-2xl flex items-start gap-3 border border-orange-400/20 max-w-sm animate-pulse">
            <TrendingUp className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <h5 className="font-bold text-xs uppercase tracking-wider font-mono">ARBITRAGE EVENT SIGNLED</h5>
              <p className="text-xs mt-1 font-semibold text-white/90">{newLogToast}</p>
            </div>
          </div>
        )}

        {/* Global Coin price line banner ticker */}
        {Object.keys(coinPrices).length > 0 && (
          <div className="bg-[#121824] border border-[#20293A] rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2 justify-center text-xs shadow-md">
            <span className="text-[#FF5A00] font-mono font-black text-[10px] flex items-center gap-1.5 leading-none">
              <LineChart className="w-3.5 h-3.5" />
              <span>LIVE FUTURES MARKETS:</span>
            </span>

            {(() => {
              const preferredPairs = ['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'DOGE/USDT', 'XAUT/USDT'];
              const available = Object.keys(coinPrices);
              const activePairs = preferredPairs.filter(p => available.includes(p));
              const finalPairs = activePairs.length >= 3 ? activePairs : available.slice(0, 5);
              return finalPairs.map(pair => {
                const price = coinPrices[pair];
                return (
                  <div key={pair} className="flex items-center space-x-1.5 font-mono">
                    <span className="text-gray-400 font-semibold">{pair}</span>
                    <span className="text-white font-bold">${price.toLocaleString('en-US', { minimumFractionDigits: pair.includes('DOGE') ? 4 : 2 })}</span>
                  </div>
                );
              });
            })()}
          </div>
        )}

        {/* Subnavigation Tab selector */}
        <div className="flex flex-wrap gap-2">
          {[
            { tag: 'dashboard', label: 'Bots Management Desk', icon: Bot },
            { tag: 'deals', label: 'Deals Terminal', icon: BarChart3 },
            { tag: 'simulator', label: 'Webhook Alert Simulator', icon: Terminal },
            { tag: 'weblogs', label: 'Webhook Logs', icon: Database },
            { tag: 'pine', label: 'Pine Strategy Copilot', icon: Cpu },
            { tag: 'exchanges', label: 'Exchange API Keys', icon: Shield },
            ...(currentUser?.isAdmin ? [{ tag: 'security', label: 'Security & Governance', icon: Shield }] : [])
          ].map((tab) => {
            const IconComponent = tab.icon;
            const isSel = view === tab.tag;
            return (
              <button
                key={tab.tag}
                id={`subnav_tab_${tab.tag}`}
                onClick={() => {
                  setView(tab.tag as any);
                  setBotToEdit(undefined);
                  setGridBotToEdit(undefined);
                }}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition ${
                  isSel
                    ? 'bg-[#FF5A00] text-white shadow-lg shadow-[#FF5A00]/20'
                    : 'bg-[#121824] border border-[#20293A] text-gray-400 hover:text-white'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Core content switchboard view renderer */}
        <div className="w-full">
          {view === 'dashboard' && (
            <BotsDashboard
              state={state}
              bots={state.bots}
              gridBots={state.gridBots || []}
              activeDeals={state.activeDeals}
              coinPrices={coinPrices}
              onToggleStatus={handleToggleBotStatus}
              onToggleStatusGrid={handleToggleGridBotStatus}
              onEdit={handleEditBotTrigger}
              onEditGrid={handleEditGridBotTrigger}
              onDelete={handleDeleteBot}
              onDeleteGrid={handleDeleteGridBot}
              onTriggerSimulate={(bot) => {
                setSelectedBotIdForSimulator(bot.id);
                setView('simulator');
              }}
              onTriggerPineScript={(bot) => {
                setSelectedBotIdForPineCode(bot.id);
                setView('pine');
              }}
              onChangeView={setView}
              exchangeCredentials={state.exchangeCredentials}
              realBalance={state.realBalance}
              username={currentUser?.username || 'Administrator'}
              accountMode={state.accountMode || 'real'}
              onUpdateSettings={handleUpdateExchangeSettings}
            />
          )}

          {view === 'create' && (
            <BotCreator
              onSave={handleSaveBot}
              onSaveGrid={handleSaveGridBot}
              isSaving={isSavingBot || isSavingGridBot}
              botToEdit={botToEdit}
              gridBotToEdit={gridBotToEdit}
              state={state}
              onCancel={() => {
                setView('dashboard');
                setBotToEdit(undefined);
                setGridBotToEdit(undefined);
              }}
            />
          )}

          {view === 'deals' && (
            <DealsTracker
              deals={state.activeDeals}
              onCloseDeal={handleClosePosition}
              isClosing={isClosingDealId}
              accountMode={state.accountMode || 'real'}
            />
          )}

          {view === 'simulator' && (
            <SignalSimulator
              bots={state.bots}
              logs={state.logs}
              selectedBotId={selectedBotIdForSimulator}
              onSendWebhook={handleSendSimulatedWebhook}
            />
          )}

          {view === 'pine' && (
            <PineScriptHelper
              bots={state.bots}
              selectedBotId={selectedBotIdForPineCode}
              onGenerate={handleGeneratePineCode}
              onUpdateBot={handleUpdateBotFromPine}
            />
          )}

          {view === 'exchanges' && (
            <ExchangeManager
              state={state}
              onUpdateSettings={handleUpdateExchangeSettings}
              coinPrices={coinPrices}
              username={currentUser?.username || 'Administrator'}
            />
          )}

          {view === 'weblogs' && (
            <WebhookLogs
              bots={state.bots}
              logs={state.logs}
              onTriggerSimulate={(bot) => {
                setSelectedBotIdForSimulator(bot.id);
                setView('simulator');
              }}
            />
          )}

          {view === 'security' && currentUser?.isAdmin && (
            <SecurityAdminPanel
              currentUser={currentUser}
            />
          )}
        </div>

      </main>

      {/* Human friendly minimalistic bottom credits */}
      <footer className="border-t border-[#1C2533] mt-20 bg-[#06080F]/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-xs text-gray-500">
          <p>© 2026 Max Bot Studio. Engineered for high-frequency webhook alerts and live grid arbitrage simulations.</p>
          <p className="mt-1 text-gray-600 font-mono flex items-center justify-center gap-1.5">
            <span className={`inline-block w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
            <span>{isConnected ? 'Status: Connected to Live Multi-Exchange Core Production Routing Network' : 'Status: Offline / Reconnecting to Trade Engine...'}</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
