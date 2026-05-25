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
import { LoginScreen } from './components/LoginScreen';
import { SecurityAdminPanel } from './components/SecurityAdminPanel';

export default function App() {
  const [view, setView] = useState<'dashboard' | 'create' | 'deals' | 'simulator' | 'pine' | 'exchanges' | 'weblogs' | 'security'>('dashboard');
  
  // Set up current user auth session
  const [currentUser, setCurrentUser] = useState<{ username: string; email?: string; phone?: string; isAdmin?: boolean } | null>(() => {
    try {
      const savedUser = localStorage.getItem('maxbot_currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [state, setState] = useState<AccountState>({
    balance: 10000,
    realBalance: 50000,
    accountMode: 'paper',
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

  // Poll state from Backend Server API
  const fetchStateFromServer = async () => {
    if (!currentUser?.username) return;
    try {
      const res = await fetch('/api/state', {
        headers: getHeaders()
      });
      if (res.ok) {
        const data = await res.json();
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
      accountMode: 'paper',
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

  if (!currentUser) {
    return (
      <LoginScreen 
        onLoginSuccess={(user, userState) => {
          localStorage.setItem('maxbot_currentUser', JSON.stringify(user));
          setCurrentUser(user);
          if (userState) {
            setState(userState);
          }
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070a13] font-sans text-gray-200 antialiased selection:bg-[#FF5A00]/20 selection:text-[#FF5A00]">
      
      {/* Dynamic Header */}
      <Header 
        state={state} 
        onReset={handleResetState} 
        isResetting={isResetting} 
        currentUser={currentUser}
        onLogout={handleLogout}
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
            <span>{isConnected ? 'Status: Connected to Sandboxed Local Express API at Engine port 3000' : 'Status: Offline / Reconnecting to Trade Engine...'}</span>
          </p>
        </div>
      </footer>

    </div>
  );
}
