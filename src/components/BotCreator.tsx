import React, { useState, useEffect } from 'react';
import { HelpCircle, ChevronRight, Check, AlertTriangle, ShieldCheck, Zap, Plus, Layers, Sliders, Eye, FileText, Info, Search } from 'lucide-react';
import { SignalBot, GridBot, AccountState } from '../types';

interface BotCreatorProps {
  onSave: (bot: Partial<SignalBot>) => Promise<void>;
  onSaveGrid: (bot: Partial<GridBot>) => Promise<void>;
  isSaving: boolean;
  onCancel?: () => void;
  botToEdit?: SignalBot;
  gridBotToEdit?: GridBot;
  state?: AccountState;
}

export function BotCreator({ onSave, onSaveGrid, isSaving, onCancel, botToEdit, gridBotToEdit, state }: BotCreatorProps) {
  // Determine active form tab
  const [activeTab, setActiveTab] = useState<'master' | 'signal' | 'grid'>(
    gridBotToEdit ? 'grid' : botToEdit ? 'master' : 'master'
  );

  const [pairFilterValue, setPairFilterValue] = useState('');
  const hasApiKeys = state?.exchangeCredentials && state.exchangeCredentials.some(c => c.isEnabled);

  // Common config states
  const [exchange, setExchange] = useState(
    botToEdit?.exchange || gridBotToEdit?.exchange || 'Binance.com Spot'
  );
  const [strategyType, setStrategyType] = useState<'spot' | 'futures'>(
    botToEdit?.strategyType || gridBotToEdit?.strategyType || 'futures'
  );
  const [leverage, setLeverage] = useState<number>(
    botToEdit?.leverage || gridBotToEdit?.leverage || 10
  );

  const getMappedExchangeKey = (): 'binance' | 'bybit' | 'okx' | 'gate.io' => {
    const exLower = (exchange || '').toLowerCase();
    if (exLower.includes('binance')) return 'binance';
    if (exLower.includes('bybit')) return 'bybit';
    if (exLower.includes('okx')) return 'okx';
    if (exLower.includes('gate')) return 'gate.io';
    if (exLower.includes('weex')) return 'bybit';
    return 'binance';
  };

  // 1. SIGNAL BOT STATES
  const [signalName, setSignalName] = useState(botToEdit?.name || '');
  const [selectedPairs, setSelectedPairs] = useState<string[]>(
    botToEdit?.pairs || ['BTC/USDT']
  );
  const [botDirection, setBotDirection] = useState<'long' | 'short' | 'both'>(
    botToEdit?.botDirection || 'both'
  );
  const [orderSizeType, setOrderSizeType] = useState<'usd' | 'percent'>(
    botToEdit?.orderSizeType || 'usd'
  );
  const [orderSize, setOrderSize] = useState<number>(botToEdit?.orderSize || 100);
  const [takeProfitType, setTakeProfitType] = useState<'percent' | 'none' | 'multiple'>(
    botToEdit?.takeProfitType || 'percent'
  );
  const [takeProfitValue, setTakeProfitValue] = useState<number>(
    botToEdit?.takeProfitValue || 3.0
  );
  // Multi-TP State Variables
  const [tp1Value, setTp1Value] = useState<number>(botToEdit?.tp1Value || 2.0);
  const [tp1Size, setTp1Size] = useState<number>(botToEdit?.tp1Size || 50);
  const [tp2Value, setTp2Value] = useState<number>(botToEdit?.tp2Value || 4.0);
  const [tp2Size, setTp2Size] = useState<number>(botToEdit?.tp2Size || 30);
  const [tp3Value, setTp3Value] = useState<number>(botToEdit?.tp3Value || 6.0);
  const [tp3Size, setTp3Size] = useState<number>(botToEdit?.tp3Size || 20);
  const [trailingTpDeviation, setTrailingTpDeviation] = useState<number>(
    botToEdit?.trailingTpDeviation || 0.2
  );
  const [trailingTakeProfit, setTrailingTakeProfit] = useState<boolean>(
    botToEdit?.trailingTakeProfit || false
  );
  const [stopLossType, setStopLossType] = useState<'percent' | 'none'>(
    botToEdit?.stopLossType || 'percent'
  );
  const [stopLossValue, setStopLossValue] = useState<number>(
    botToEdit?.stopLossValue || 1.5
  );
  const [trailingStopLoss, setTrailingStopLoss] = useState<boolean>(
    botToEdit?.trailingStopLoss || false
  );
  const [trailingSlDeviation, setTrailingSlDeviation] = useState<number>(
    botToEdit?.trailingSlDeviation || 0.5
  );
  const [slMoveToBreakeven, setSlMoveToBreakeven] = useState<boolean>(
    botToEdit?.slMoveToBreakeven || false
  );
  const [slBreakevenTrigger, setSlBreakevenTrigger] = useState<number>(
    botToEdit?.slBreakevenTrigger || 2.0
  );
  const [slTimeoutEnabled, setSlTimeoutEnabled] = useState<boolean>(
    botToEdit?.slTimeoutEnabled || false
  );
  const [slTimeoutSeconds, setSlTimeoutSeconds] = useState<number>(
    botToEdit?.slTimeoutSeconds || 15
  );
  const [maxActiveDeals, setMaxActiveDeals] = useState<number>(
    botToEdit?.maxActiveDeals || 3
  );

  // 1. SIGNAL TYPE STATES
  const [baseOrderSize, setBaseOrderSize] = useState<number>(botToEdit?.baseOrderSize || botToEdit?.orderSize || 100);
  const [safetyOrderSize, setSafetyOrderSize] = useState<number>(botToEdit?.safetyOrderSize !== undefined ? botToEdit.safetyOrderSize : 150);
  const [priceDeviationStep, setPriceDeviationStep] = useState<number>(botToEdit?.priceDeviationStep !== undefined ? botToEdit.priceDeviationStep : 2.0);
  const [maxSafetyOrders, setMaxSafetyOrders] = useState<number>(botToEdit?.maxSafetyOrders !== undefined ? botToEdit.maxSafetyOrders : 5);
  const [safetyOrderVolumeScale, setSafetyOrderVolumeScale] = useState<number>(botToEdit?.safetyOrderVolumeScale !== undefined ? botToEdit.safetyOrderVolumeScale : 1.5);
  const [safetyOrderStepScale, setSafetyOrderStepScale] = useState<number>(botToEdit?.safetyOrderStepScale !== undefined ? botToEdit.safetyOrderStepScale : 1.0);

  // 2. GRID BOT STATES
  const [gridName, setGridName] = useState(gridBotToEdit?.name || '');
  const [gridPair, setGridPair] = useState(gridBotToEdit?.pair || 'BTC/USDT');
  const [lowerPrice, setLowerPrice] = useState<number>(gridBotToEdit?.lowerPrice || 90000);
  const [upperPrice, setUpperPrice] = useState<number>(gridBotToEdit?.upperPrice || 100000);
  const [gridsCount, setGridsCount] = useState<number>(gridBotToEdit?.gridsCount || 10);
  const [investment, setInvestment] = useState<number>(gridBotToEdit?.investment || 1000);
  const [gridType, setGridType] = useState<'arithmetic' | 'geometric'>(
    gridBotToEdit?.gridType || 'arithmetic'
  );

  // Custom customizable pair states
  const [customPairText, setCustomPairText] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const availableExchanges = [
    { name: 'Binance.com Spot', desc: 'Binance.com Classic Spot API', fee: '0.1%' },
    { name: 'Binance.com Futures', desc: 'Binance.com USD-M Futures', fee: '0.04%' },
    { name: 'WEEX.com Spot', desc: 'WEEX Classic Spot Trading', fee: '0.1%' },
    { name: 'WEEX.com Futures', desc: 'WEEX USDT-M Futures Master', fee: '0.06%' },
    { name: 'Gate.io Spot', desc: 'Gate.io Exchange Spot Trading', fee: '0.2%' },
    { name: 'Gate.io Futures', desc: 'Gate.io USDT-M Perpetual contracts', fee: '0.05%' }
  ];

  const presetsPairs = [
    'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'DOGE/USDT', 'ADA/USDT',
    'ZEC/USDT', 'XAUT/USDT', 'BNB/USDT', 'XRP/USDT', 'LINK/USDT',
    'AVAX/USDT', 'SUI/USDT', 'OP/USDT', 'ARB/USDT', 'APT/USDT',
    'DOT/USDT', 'LTC/USDT', 'NEAR/USDT', 'PEPE/USDT', 'SHIB/USDT',
    'WIF/USDT', 'FET/USDT', 'RNDR/USDT', 'ATOM/USDT', 'FIL/USDT',
    'UNI/USDT', 'ETC/USDT', 'BCH/USDT', 'ICP/USDT', 'FTM/USDT',
    'IMX/USDT', 'GRT/USDT', 'STX/USDT', 'HBAR/USDT', 'TAO/USDT',
    'GALA/USDT', 'VET/USDT', 'THETA/USDT'
  ];

  const [exchangePairs, setExchangePairs] = useState<Record<string, { spot: string[], futures: string[] }>>({});
  const [loadingPairs, setLoadingPairs] = useState(false);
  const [pairsMarketFilter, setPairsMarketFilter] = useState<'all' | 'spot' | 'futures'>('all');

  useEffect(() => {
    let active = true;
    setLoadingPairs(true);
    fetch('/api/exchange-pairs')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (active && data && data.pairs) {
          setExchangePairs(data.pairs);
        }
      })
      .catch(e => console.error(e))
      .finally(() => {
        if (active) setLoadingPairs(false);
      });
    return () => { active = false; };
  }, []);

  const handleAddCustomPair = () => {
    if (!customPairText.trim()) return;
    let formatted = customPairText.trim().toUpperCase();
    
    // Auto insert slash if e.g. "ZECUSDT"
    if (formatted.endsWith('USDT') && !formatted.includes('/')) {
      formatted = formatted.replace('USDT', '/USDT');
    }
    // Append /USDT if just ZEC
    if (!formatted.includes('/')) {
      formatted = `${formatted}/USDT`;
    }

    if (activeTab === 'signal' || activeTab === 'master') {
      if (!selectedPairs.includes(formatted)) {
        setSelectedPairs([...selectedPairs, formatted]);
      }
    } else {
      setGridPair(formatted);
    }
    setCustomPairText('');
    setMessage(null);
  };

  const togglePairSelection = (pair: string) => {
    if (selectedPairs.includes(pair)) {
      if (selectedPairs.length > 1) {
        setSelectedPairs(selectedPairs.filter(p => p !== pair));
      }
    } else {
      setSelectedPairs([...selectedPairs, pair]);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (activeTab === 'signal' || activeTab === 'master') {
      if (!signalName.trim()) {
        setMessage('Signal Bot Name is required.');
        return;
      }
      const compiledBot: Partial<SignalBot> = {
        id: botToEdit?.id,
        name: signalName,
        status: botToEdit?.status || 'active',
        exchange,
        strategyType,
        pairs: selectedPairs,
        botDirection,
        leverage: strategyType === 'spot' ? 1 : leverage,
        orderSizeType,
        orderSize: baseOrderSize,
        baseOrderSize,
        takeProfitType,
        takeProfitValue: takeProfitType === 'none' ? 0 : takeProfitValue,
        trailingTakeProfit,
        tp1Value: takeProfitType === 'multiple' ? tp1Value : undefined,
        tp1Size: takeProfitType === 'multiple' ? tp1Size : undefined,
        tp2Value: takeProfitType === 'multiple' ? tp2Value : undefined,
        tp2Size: takeProfitType === 'multiple' ? tp2Size : undefined,
        tp3Value: takeProfitType === 'multiple' ? tp3Value : undefined,
        tp3Size: takeProfitType === 'multiple' ? tp3Size : undefined,
        trailingTpDeviation: trailingTakeProfit ? trailingTpDeviation : undefined,
        stopLossType,
        stopLossValue: stopLossType === 'none' ? 0 : stopLossValue,
        trailingStopLoss,
        trailingSlDeviation: trailingStopLoss ? trailingSlDeviation : undefined,
        slMoveToBreakeven,
        slBreakevenTrigger: slMoveToBreakeven ? slBreakevenTrigger : undefined,
        slTimeoutEnabled,
        slTimeoutSeconds: slTimeoutEnabled ? slTimeoutSeconds : undefined,
        maxActiveDeals,
        // 3Commas DCA parameters
        safetyOrderSize,
        priceDeviationStep,
        maxSafetyOrders,
        safetyOrderVolumeScale,
        safetyOrderStepScale
      };

      try {
        await onSave(compiledBot);
        setSignalName('');
        setMessage(null);
      } catch (err) {
        setMessage('Failed to register Signal Bot.');
      }
    } else {
      // GRID BOT SAVE
      if (!gridName.trim()) {
        setMessage('Grid Bot Name is required.');
        return;
      }
      if (lowerPrice >= upperPrice) {
        setMessage('Lower price bound must be less than upper price bound.');
        return;
      }
      if (investment <= 10) {
        setMessage('Minimum Grid investment size is 10 USDT.');
        return;
      }

      const compiledGrid: Partial<GridBot> = {
        id: gridBotToEdit?.id,
        name: gridName,
        status: gridBotToEdit?.status || 'active',
        exchange,
        strategyType,
        pair: gridPair,
        lowerPrice,
        upperPrice,
        gridsCount,
        investment,
        gridType,
        leverage: strategyType === 'spot' ? 1 : leverage
      };

      try {
        await onSaveGrid(compiledGrid);
        setGridName('');
        setMessage(null);
      } catch (err) {
        setMessage('Failed to register Grid Bot.');
      }
    }
  };

  return (
    <div className="space-y-6 text-white max-w-4xl mx-auto" id="creator_section">
      
      {/* Bot type selector tabs */}
      <div className="flex flex-col sm:flex-row bg-[#0F141F] p-1.5 rounded-2xl border border-[#20293A] gap-1 sm:gap-0">
        <button
          type="button"
          onClick={() => {
            setActiveTab('master');
          }}
          disabled={!!gridBotToEdit}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'master'
              ? 'bg-[#FF5A00] text-white shadow-lg'
              : 'text-gray-400 hover:text-white disabled:opacity-50'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>🏆 Quick Bot Master</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('signal');
          }}
          disabled={!!gridBotToEdit}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'signal'
              ? 'bg-[#FF5A00] text-white shadow-lg'
              : 'text-gray-400 hover:text-white disabled:opacity-50'
          }`}
        >
          <Sliders className="w-4 h-4 text-[#FF5A00]" />
          <span>⚙️ Advanced Webhook Bot</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!botToEdit && !gridBotToEdit) setActiveTab('grid');
          }}
          disabled={!!botToEdit || !!gridBotToEdit}
          className={`flex-1 py-3 text-sm font-bold rounded-xl transition flex items-center justify-center space-x-2 cursor-pointer ${
            activeTab === 'grid'
              ? 'bg-[#FF5A00] text-white shadow-lg'
              : 'text-gray-400 hover:text-white disabled:opacity-50'
          }`}
        >
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>⚡ High-Frequency Grid Bot</span>
        </button>
      </div>

      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div className="bg-[#121824] rounded-2xl border border-[#20293A] overflow-hidden shadow-2xl">
          
          <div className="bg-[#1E293B]/40 px-6 py-4 border-b border-[#20293A] flex justify-between items-center bg-gradient-to-r from-[#121824] to-[#1E293B]/60">
            <h2 className="text-lg font-bold tracking-tight">
              {activeTab === 'master' ? (
                <>🏆 {botToEdit ? `Edit Master Bot: ${botToEdit.name}` : 'Create New Easy Master Bot'}</>
              ) : activeTab === 'signal' ? (
                <>🔧 {botToEdit ? `Edit Signal Bot: ${botToEdit.name}` : '🚀 Create Webhook Signal Bot'}</>
              ) : (
                <>🤖 {gridBotToEdit ? `Edit Grid Bot: ${gridBotToEdit.name}` : '⚡ Create High-Frequency Grid Bot'}</>
              )}
            </h2>
            <span className="bg-slate-800 text-gray-400 font-mono text-[10px] px-2.5 py-1 rounded-md border border-slate-700 font-semibold tracking-wider">
              {activeTab === 'master' ? 'Simplified Config Mode' : activeTab === 'signal' ? 'Webhook Alert Execution' : 'Auto Arbitrage Engine'}
            </span>
          </div>

          <div className="p-6 space-y-6">
            {message && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3.5 rounded-xl text-sm flex gap-2">
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}

            {/* STEP 1: Common Exchange Connection */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">1. Market Connectivity</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">EXCHANGE CONNECTION</label>
                  <select
                    id="bot_exchange_select"
                    value={exchange}
                    onChange={(e) => {
                      const selected = e.target.value;
                      setExchange(selected);
                      if (selected.toLowerCase().includes('futures')) {
                        setStrategyType('futures');
                      } else if (selected.toLowerCase().includes('spot')) {
                        setStrategyType('spot');
                      }
                    }}
                    className="w-full bg-[#0F141F] border border-[#2D3748] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-sm transition-all"
                  >
                    {availableExchanges.map((ex) => (
                      <option key={ex.name} value={ex.name}>
                        {ex.name} ({ex.desc})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1.5 font-medium">STRATEGY CLASSIFICATION</label>
                  <div className="flex bg-[#0F141F] rounded-xl border border-[#2D3748] p-1">
                    <button
                      type="button"
                      onClick={() => setStrategyType('spot')}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        strategyType === 'spot' ? 'bg-[#FF5A00]/25 text-[#FF5A00] border border-[#FF5A00]/40' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Spot Market (1x Margin)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (exchange === 'Coinbase Pro') {
                          alert('Coinbase Pro only supports SPOT pools.');
                          return;
                        }
                        setStrategyType('futures');
                      }}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                        strategyType === 'futures' ? 'bg-[#FF5A00]/25 text-[#FF5A00] border border-[#FF5A00]/40' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      Futures / Derivatives
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b border-[#20293A] my-6" />

            {/* STEP 2: Custom / Presets Pairs configuration */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">
                  {activeTab === 'signal' ? '2. Authorized Trading Pairs' : '2. TARGET TRADING PAIR'}
                </h3>
                <span className="text-[11px] text-[#FF5A00] font-mono">Binance Futures Presets Enabled</span>
              </div>

              <div className="bg-[#0F141F] rounded-xl border border-[#232F45] p-4 space-y-4">
                
                {/* Custom Pair Input Tool */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={customPairText}
                      onChange={(e) => setCustomPairText(e.target.value)}
                      placeholder="Type custom pair e.g. ZEC/USDT, BTC/USDT, XRP/USDT"
                      className="w-full bg-[#131A2A] border border-[#2D3748] rounded-xl px-4 py-2.5 text-sm uppercase placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomPair();
                        }
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomPair}
                    className="bg-[#1E293B] hover:bg-slate-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl border border-slate-700 flex items-center justify-center gap-1.5 active:scale-95 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-[#FF5A00]" />
                    <span>Add Customizable Pair</span>
                  </button>
                </div>

                {/* Search / Filter for Preset Pairs */}
                <div className="pt-1 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="block text-[10px] text-gray-400 font-mono uppercase tracking-wide">
                        🔍 Dynamic Pairs Catalog for <span className="font-bold text-slate-350">{exchange}</span>:
                      </span>
                      {loadingPairs && (
                        <span className="animate-spin rounded-full h-3 w-3 border border-t-[#FF5A00]" />
                      )}
                    </div>
                    {/* Market classification labels */}
                    <div className="flex bg-[#131A2A] border border-slate-800 p-0.5 rounded-lg">
                      {[
                        { key: 'all', label: 'All Pools' },
                        { key: 'spot', label: 'Spot Only' },
                        { key: 'futures', label: 'Futures Only' }
                      ].map(tab => (
                        <button
                          type="button"
                          key={tab.key}
                          onClick={() => setPairsMarketFilter(tab.key as any)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                            pairsMarketFilter === tab.key 
                              ? 'bg-[#FF5A00] text-white shadow' 
                              : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      value={pairFilterValue}
                      onChange={(e) => setPairFilterValue(e.target.value)}
                      placeholder={`Search ${exchange} pairs list...`}
                      className="w-full bg-[#131A2A] border border-[#2D3748] rounded-xl pl-9 pr-4 py-2.5 text-xs uppercase placeholder-gray-500 font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#FF5A00] focus:border-[#FF5A00]"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Search className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                  </div>
                </div>

                {/* Separated Categories lists for Spot and Futures */}
                <div className="space-y-4 pt-1">
                  
                  {/* Category A: Spot pairs */}
                  {(pairsMarketFilter === 'all' || pairsMarketFilter === 'spot') && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 font-mono border-b border-slate-800/60 pb-1">
                        <span className="text-gray-400 font-sans tracking-wide">🪙 Spot Market ({(() => {
                          const activeExKey = getMappedExchangeKey();
                          const rawSpots = exchangePairs[activeExKey]?.spot || presetsPairs;
                          return rawSpots.filter(p => !pairFilterValue || p.toLowerCase().includes(pairFilterValue.toLowerCase())).length;
                        })()} Pairs)</span>
                        <span className="text-gray-500 font-mono font-medium rounded bg-slate-900 px-1 text-[9px]">Cash Assets</span>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1 pb-1">
                        {(() => {
                          const activeExKey = getMappedExchangeKey();
                          const rawSpots = exchangePairs[activeExKey]?.spot || presetsPairs;
                          const activeSpotPairs = rawSpots.filter(p => !pairFilterValue || p.toLowerCase().includes(pairFilterValue.toLowerCase()));
                          if (activeSpotPairs.length === 0) {
                            return <p className="text-[10px] text-gray-500 italic py-1">No matching Spot pairs.</p>;
                          }
                          return activeSpotPairs.map((pair) => {
                            const isSelected = (activeTab === 'signal' || activeTab === 'master')
                              ? selectedPairs.includes(pair)
                              : gridPair === pair;
                            return (
                              <button
                                type="button"
                                key={'spot-' + pair}
                                onClick={() => {
                                  if (activeTab === 'signal' || activeTab === 'master') {
                                    if (selectedPairs.includes(pair)) {
                                      setSelectedPairs(selectedPairs.filter(p => p !== pair));
                                    } else {
                                      setSelectedPairs([...selectedPairs, pair]);
                                    }
                                  } else {
                                    setGridPair(pair);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold cursor-pointer transition-all flex items-center space-x-1 ${
                                  isSelected
                                    ? 'bg-[#FF5A00]/25 border-[#FF5A00] text-white shadow-sm font-bold'
                                    : 'bg-[#131A2A]/50 border-slate-850 text-gray-400 hover:bg-[#1A2333]/80 hover:text-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3 h-3 text-[#FF5A00]" />}
                                <span>{pair}</span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Category B: Futures Contracts */}
                  {(pairsMarketFilter === 'all' || pairsMarketFilter === 'futures') && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] uppercase font-bold text-gray-400 font-mono border-b border-slate-800/60 pb-1">
                        <span className="text-gray-400 font-sans tracking-wide">⚡ Futures Perpetual ({(() => {
                          const activeExKey = getMappedExchangeKey();
                          const rawFutures = exchangePairs[activeExKey]?.futures || presetsPairs;
                          return rawFutures.filter(p => !pairFilterValue || p.toLowerCase().includes(pairFilterValue.toLowerCase())).length;
                        })()} Contracts)</span>
                        <span className="text-[#FF5A00] font-mono font-medium rounded bg-[#FF5A00]/5 px-1 text-[9px]">Margin Leverage</span>
                      </div>
                      <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1 pb-1">
                        {(() => {
                          const activeExKey = getMappedExchangeKey();
                          const rawFutures = exchangePairs[activeExKey]?.futures || presetsPairs;
                          const activeFuturesPairs = rawFutures.filter(p => !pairFilterValue || p.toLowerCase().includes(pairFilterValue.toLowerCase()));
                          if (activeFuturesPairs.length === 0) {
                            return <p className="text-[10px] text-gray-500 italic py-1">No matching Futures perpetual contracts.</p>;
                          }
                          return activeFuturesPairs.map((pair) => {
                            const isSelected = (activeTab === 'signal' || activeTab === 'master')
                              ? selectedPairs.includes(pair)
                              : gridPair === pair;
                            return (
                              <button
                                type="button"
                                key={'futures-' + pair}
                                onClick={() => {
                                  if (activeTab === 'signal' || activeTab === 'master') {
                                    if (selectedPairs.includes(pair)) {
                                      setSelectedPairs(selectedPairs.filter(p => p !== pair));
                                    } else {
                                      setSelectedPairs([...selectedPairs, pair]);
                                    }
                                  } else {
                                    setGridPair(pair);
                                  }
                                }}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-semibold cursor-pointer transition-all flex items-center space-x-1 ${
                                  isSelected
                                    ? 'bg-[#FF5A00]/25 border-[#FF5A00] text-white shadow-sm font-bold'
                                    : 'bg-[#131A2A]/50 border-slate-850 text-gray-400 hover:bg-[#1A2333]/80 hover:text-white'
                                }`}
                              >
                                {isSelected && <Check className="w-3.5 h-3.5 text-[#FF5A00]" />}
                                <span>{pair}</span>
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  )}

                </div>

                {/* active status banner */}
                <div className="text-[11px] text-gray-400 flex items-center gap-1.5 bg-[#131A2A] px-3 py-2 rounded-lg">
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                  {activeTab === 'signal' || activeTab === 'master' ? (
                    <span>Authorized pairs list: <strong className="font-mono text-white">{selectedPairs.join(', ')}</strong></span>
                  ) : (
                    <span>Grid base arbitrage target ticker: <strong className="font-mono text-[#FF5A00]">{gridPair}</strong></span>
                  )}
                </div>
              </div>
            </div>

            <div className="border-b border-[#20293A] my-6" />

            {/* DYNAMIC FORM SEGMENTS */}
            {activeTab === 'master' ? (
              
              /* ============= QUICK BOT MASTER FORM FIELDS ============= */
              <div className="space-y-6">
                
                {/* 1. BOT IDENTIFIER & DIRECTION OPTION */}
                <div className="bg-[#101520]/60 p-6 rounded-2xl border border-[#232F45] space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold font-mono text-gray-400 uppercase tracking-wider mb-2">Bot Master Title (Name)</label>
                      <input
                        type="text"
                        value={signalName}
                        onChange={(e) => setSignalName(e.target.value)}
                        placeholder="Enter Bot Name (e.g. My Buy Scalper)"
                        className="w-full bg-[#0F141F] border border-slate-800 focus:border-[#FF5A00] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none transition-colors text-sm font-semibold font-mono"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold font-mono text-gray-400 uppercase tracking-wider mb-2">Bot Strategy Direction</label>
                      <div className="grid grid-cols-3 gap-2 h-[46px]">
                        <button
                          type="button"
                          onClick={() => setBotDirection('long')}
                          className={`rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            botDirection === 'long'
                              ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold shadow-lg shadow-emerald-500/10'
                              : 'bg-[#0B0F17]/40 border-slate-800 text-gray-450 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="text-sm">📥</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">Long Only</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBotDirection('short')}
                          className={`rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            botDirection === 'short'
                              ? 'bg-rose-500/10 border-rose-500 text-rose-400 font-bold shadow-lg shadow-rose-500/10'
                              : 'bg-[#0B0F17]/40 border-slate-800 text-gray-450 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="text-sm">📤</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">Short Only</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setBotDirection('both')}
                          className={`rounded-xl border flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                            botDirection === 'both'
                              ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold shadow-lg shadow-amber-500/10'
                              : 'bg-[#0B0F17]/40 border-slate-800 text-gray-450 hover:text-white hover:border-slate-700'
                          }`}
                        >
                          <span className="text-sm">🔄</span>
                          <span className="text-[10px] font-bold uppercase tracking-wider">Both</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. TARGET COIN PAIR CUSTOMIZATION */}
                <div className="bg-[#101520]/60 p-6 rounded-2xl border border-[#232F45] space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold font-mono text-gray-400 uppercase tracking-wider">
                      2. Target Coin Pair(s) Configuration
                    </label>
                    <span className="text-[10px] text-[#FF5A00] font-mono font-semibold uppercase">Customizable / User-Defined</span>
                  </div>
                  
                  {/* Preset Quick Selection Buttons */}
                  <div className="space-y-2">
                    <span className="block text-[10px] text-gray-400 font-mono uppercase tracking-wider">Quick Presets:</span>
                    <div className="flex flex-wrap gap-2">
                      {['BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'ZEC/USDT', 'DOGE/USDT'].map((p) => {
                        const isSelected = selectedPairs.includes(p);
                        return (
                          <button
                            type="button"
                            key={'easy-pair-' + p}
                            onClick={() => {
                              if (isSelected) {
                                if (selectedPairs.length > 1) {
                                  setSelectedPairs(selectedPairs.filter(x => x !== p));
                                }
                              } else {
                                setSelectedPairs([...selectedPairs, p]);
                              }
                            }}
                            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer flex items-center space-x-1.5 ${
                              isSelected
                                ? 'bg-[#FF5A00]/20 border-[#FF5A00] text-white font-bold'
                                : 'bg-[#0E131E] border-slate-850 text-gray-450 hover:text-white'
                            }`}
                          >
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#FF5A00]" />}
                            <span>{p}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Customizable / User-Defined Typing Input */}
                  <div className="space-y-3 pt-2 border-t border-[#1C2533]/80">
                    <span className="block text-[10px] text-gray-400 font-mono uppercase tracking-wider">Add User-Defined Custom Pair:</span>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customPairText}
                        onChange={(e) => setCustomPairText(e.target.value)}
                        placeholder="Type any pair, e.g., XRP/USDT, LTC/USDT"
                        className="flex-1 bg-[#0F141F] border border-slate-800 focus:border-[#FF5A00] rounded-xl px-3 py-2 text-xs uppercase placeholder-gray-500 font-mono text-white focus:outline-none focus:ring-1 focus:ring-[#FF5A00]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomPair();
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomPair}
                        className="bg-[#1E293B] hover:bg-slate-700 text-white font-semibold text-xs px-4 py-2 rounded-xl border border-slate-700 flex items-center justify-center gap-1 active:scale-95 transition cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#FF5A00]" />
                        <span>Add Pair</span>
                      </button>
                    </div>
                  </div>

                  {/* Curated Active Tags display */}
                  <div className="pt-2">
                    <span className="block text-[10px] text-gray-400 font-mono uppercase tracking-wider mb-2">Active Targets ({selectedPairs.length}):</span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedPairs.map((pair) => (
                        <span 
                          key={'active-tag-' + pair}
                          className="inline-flex items-center gap-1 bg-[#1A2333] border border-slate-800 text-xs text-white font-mono font-bold px-2.5 py-1 rounded-lg"
                        >
                          <span>{pair}</span>
                          {selectedPairs.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setSelectedPairs(selectedPairs.filter(p => p !== pair))}
                              className="text-gray-400 hover:text-orange-500 font-bold ml-1 cursor-pointer transition-colors"
                            >
                              &times;
                            </button>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 3. CORE CONFIGURATION (TP, SL, TRAIL TP, SIZE, LEVERAGE) */}
                <div className="bg-[#101520]/60 p-6 rounded-2xl border border-[#232F45] space-y-5">
                  <div className={`grid grid-cols-1 sm:grid-cols-2 ${strategyType === 'futures' ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-6`}>
                    {/* Order Size */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold font-mono text-gray-400 uppercase tracking-wider">Order Size</label>
                        <div className="flex items-center space-x-1 bg-[#090D14] p-0.5 rounded-lg border border-slate-850">
                          <button
                            type="button"
                            onClick={() => setOrderSizeType('usd')}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-md font-mono transition-all uppercase cursor-pointer ${
                              orderSizeType === 'usd' ? 'bg-[#FF5A00] text-white shadow-md' : 'text-gray-500 hover:text-white'
                            }`}
                          >
                            USDT
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderSizeType('percent')}
                            className={`px-2 py-0.5 text-[9px] font-bold rounded-md font-mono transition-all uppercase cursor-pointer ${
                              orderSizeType === 'percent' ? 'bg-[#FF5A00] text-white shadow-md' : 'text-gray-500 hover:text-white'
                            }`}
                          >
                            % Bal
                          </button>
                        </div>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          min={orderSizeType === 'usd' ? "5" : "1"}
                          max={orderSizeType === 'percent' ? "100" : undefined}
                          value={baseOrderSize}
                          onChange={(e) => setBaseOrderSize(Math.max(orderSizeType === 'usd' ? 5 : 1, parseFloat(e.target.value) || (orderSizeType === 'usd' ? 10 : 5)))}
                          className="w-full bg-[#0F141F] border border-slate-800 focus:border-[#FF5A00] rounded-xl pl-3 pr-8 py-2.5 text-xs text-white focus:outline-none font-mono font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono font-bold">
                          {orderSizeType === 'usd' ? 'USDT' : '%'}
                        </span>
                      </div>
                    </div>

                    {/* Take Profit Target */}
                    <div>
                      <label className="block text-xs font-bold font-mono text-[#FF5A00] uppercase tracking-wider mb-2">Take Profit (TP %)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={takeProfitValue}
                          onChange={(e) => {
                            setTakeProfitValue(Math.max(0.001, parseFloat(e.target.value) || 1.0));
                            setTakeProfitType('percent');
                          }}
                          className="w-full bg-[#0F141F] border border-slate-800 focus:border-[#FF5A00] rounded-xl pl-3 pr-8 py-2.5 text-xs text-white focus:outline-none font-mono font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono font-bold">%</span>
                      </div>
                    </div>

                    {/* Stop Loss Target */}
                    <div>
                      <label className="block text-xs font-bold font-mono text-gray-400 uppercase tracking-wider mb-2">Stop Loss (SL %)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.001"
                          min="0.001"
                          value={stopLossValue}
                          onChange={(e) => {
                            setStopLossValue(Math.max(0.001, parseFloat(e.target.value) || 1.5));
                            setStopLossType('percent');
                          }}
                          className="w-full bg-[#0F141F] border border-slate-800 focus:border-[#FF5A00] rounded-xl pl-3 pr-8 py-2.5 text-xs text-white focus:outline-none font-mono font-bold"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono font-bold">%</span>
                      </div>
                    </div>

                    {/* Trailing Take Profit Deviation */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="block text-xs font-bold font-mono text-[#FF5A00] uppercase tracking-wider">Trailing Profit (%)</label>
                        <button
                          type="button"
                          onClick={() => setTrailingTakeProfit(!trailingTakeProfit)}
                          className={`text-[9.5px] font-bold px-2 py-0.5 rounded font-mono uppercase ${
                            trailingTakeProfit ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30' : 'bg-slate-800 text-gray-500'
                          }`}
                        >
                          {trailingTakeProfit ? 'Trailing On' : 'Trailing Off'}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.05"
                          min="0.01"
                          disabled={!trailingTakeProfit}
                          value={trailingTpDeviation}
                          onChange={(e) => setTrailingTpDeviation(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                          className={`w-full border rounded-xl pl-3 pr-8 py-2.5 text-xs focus:outline-none font-mono font-bold transition-all ${
                            trailingTakeProfit 
                              ? 'bg-[#0F141F] border-slate-800 focus:border-[#FF5A00] text-white' 
                              : 'bg-[#0B0F17]/30 border-slate-900/50 text-gray-650 cursor-not-allowed'
                          }`}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono font-bold">%</span>
                      </div>
                      {trailingTakeProfit && (
                        <div className="flex gap-1 mt-1.5 flex-wrap text-[9px] font-mono">
                          {[0.05, 0.1, 0.2, 0.5, 1.0].map((dev) => (
                            <button
                              type="button"
                              key={`quick-tp-dev-${dev}`}
                              onClick={() => setTrailingTpDeviation(dev)}
                              className={`px-1 rounded-md py-0.5 cursor-pointer transition-all ${
                                trailingTpDeviation === dev 
                                  ? 'bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30' 
                                  : 'bg-slate-900 text-gray-400 hover:text-white border border-slate-800'
                              }`}
                            >
                              {dev}%
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Multiplier Leverage (Futures Only) */}
                    {strategyType === 'futures' && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-bold font-mono text-gray-400 uppercase tracking-wider">Leverage</label>
                          <span className="text-[10px] bg-[#FF5A00]/10 text-[#FF5A00] font-mono font-black px-1.5 py-0.5 rounded">
                            {leverage}x
                          </span>
                        </div>
                        <div className="space-y-2">
                          <input
                            type="range"
                            min="1"
                            max="125"
                            value={leverage}
                            onChange={(e) => setLeverage(parseInt(e.target.value) || 10)}
                            className="w-full accent-[#FF5A00] cursor-pointer h-1 bg-[#232F45] rounded-lg appearance-none mt-2"
                          />
                          <div className="flex justify-between gap-1 text-[9px] font-mono text-gray-500">
                            {[5, 10, 20, 50, 100].map((lev) => (
                              <button
                                type="button"
                                key={`quick-lev-${lev}`}
                                onClick={() => setLeverage(lev)}
                                className={`px-1.5 py-0.5 rounded cursor-pointer transition ${
                                  leverage === lev ? 'bg-[#FF5A00]/25 text-[#FF5A00] font-bold' : 'bg-slate-800 hover:text-white'
                                }`}
                              >
                                {lev}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                {/* Smart Preset & Risk/Reward Intelligence Panel */}
                <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F17]/60 p-4 rounded-xl border border-slate-850">
                    <div className="space-y-1 text-left">
                      <span className="text-[10px] uppercase font-bold text-[#FF5A00] font-mono tracking-wider block">⚡ Quick Setup Presets</span>
                      <span className="text-[11px] text-gray-400 block font-medium">Deploy industry-standard risk configurations instantly.</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setTakeProfitValue(0.2);
                          setTakeProfitType('percent');
                          setStopLossValue(0.4);
                          setStopLossType('percent');
                          setTrailingTakeProfit(false);
                        }}
                        className="px-3.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-400 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono"
                      >
                        ⚡ Scalper (0.2% / 0.4%)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTakeProfitValue(1.5);
                          setTakeProfitType('percent');
                          setStopLossValue(1.0);
                          setStopLossType('percent');
                          setTrailingTakeProfit(true);
                          setTrailingTpDeviation(0.1);
                        }}
                        className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono"
                      >
                        📈 Standard (1.5% / 1.0% Trail)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setTakeProfitValue(3.0);
                          setTakeProfitType('percent');
                          setStopLossValue(1.5);
                          setStopLossType('percent');
                          setTrailingTakeProfit(true);
                          setTrailingTpDeviation(0.25);
                        }}
                        className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-500 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono"
                      >
                        🛡️ Swing (3.0% / 1.5% Trail)
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Risk To Reward Gauge */}
                  {(() => {
                    const tpVal = takeProfitType === 'none' ? 0 : takeProfitValue;
                    const slVal = stopLossType === 'none' ? 0 : stopLossValue;
                    
                    if (slVal === 0) {
                      return (
                        <div className="bg-amber-500/5 border border-amber-500/15 text-yellow-405 text-amber-400 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-mono">
                          <span>⚠️ Capital Alert: Stop-Loss is currently disabled. A sudden drop may lead to custom drawdown or margin liquidation.</span>
                        </div>
                      );
                    }

                    const ratio = tpVal / slVal;
                    let alertColor = 'text-gray-400';
                    let alertBg = 'bg-slate-900/40 border-slate-800';
                    let statusText = '';

                    if (ratio >= 2.0) {
                      alertColor = 'text-emerald-400';
                      alertBg = 'bg-emerald-500/5 border-emerald-500/10';
                      statusText = '🟢 Professional Risk Expectancy: Greater than 1:2.0 ratio. Your take profit makes more than twice what you risk per trade.';
                    } else if (ratio >= 1.0) {
                      alertColor = 'text-yellow-400';
                      alertBg = 'bg-yellow-500/5 border-yellow-500/10';
                      statusText = '🟡 Balanced Scalp Expectancy: Between 1:1.0 and 1:1.9 ratio. Safe and reliable for high-winrate indicators.';
                    } else {
                      alertColor = 'text-rose-400';
                      alertBg = 'bg-rose-500/5 border-rose-500/10';
                      statusText = '🔴 Warning - Negative Expectancy Ratio: Stop-Loss is wider than Take Profit. You risk more than you make per transaction. Verify win rates!';
                    }

                    return (
                      <div className={`${alertBg} border text-xs p-3.5 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 font-sans`}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">🧬</span>
                          <span className="text-gray-300 font-semibold leading-tight">{statusText}</span>
                        </div>
                        <div className="bg-[#040609] border border-slate-850 p-2 rounded-lg font-mono text-center shrink-0 min-w-[120px]">
                          <span className="text-[9px] text-gray-500 block font-bold uppercase tracking-wider">RISK TO REWARD</span>
                          <span className={`text-sm font-black ${alertColor}`}>1 : {ratio.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

              </div>

              </div>
            ) : activeTab === 'signal' ? (
              
              /* ============= SIGNAL BOT FORM FIELDS ============= */
              <div className="space-y-6">
                
                {/* BOT GENERAL INFO */}
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-3">3. Bot Name & Direction Profiles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">SIGNAL BOT NAME</label>
                      <input
                        type="text"
                        value={signalName}
                        onChange={(e) => setSignalName(e.target.value)}
                        placeholder="e.g. TradingView ZEC/USDT Scalper Bot"
                        className="w-full bg-[#0F141F] border border-[#2D3748] rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">BOT DIRECTION (BUY/SELL OPTION)</label>
                      <select
                        value={botDirection}
                        onChange={(e) => setBotDirection(e.target.value as any)}
                        className="w-full bg-[#0F141F] border border-[#2D3748] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-sm transition-all"
                      >
                        <option value="both">Execute BOTH (Long & Short Signals)</option>
                        <option value="long">LONG Only (Buy Option / Inhibit shorts)</option>
                        <option value="short">SHORT Only (Sell Option / Inhibit longs)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SIZING & LEVERAGE */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">4. Sizing & Leverage Profiles</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-xs text-gray-400 font-medium">ORDER VALUE SIZING TYPE</label>
                      <div className="flex bg-[#0F141F] rounded-xl border border-[#2D3748] p-1.5">
                        <button
                          type="button"
                          onClick={() => setOrderSizeType('usd')}
                          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                            orderSizeType === 'usd' ? 'bg-[#FF5A00] text-white' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          Fixed USD Base
                        </button>
                        <button
                          type="button"
                          onClick={() => setOrderSizeType('percent')}
                          className={`flex-1 py-1 text-xs font-semibold rounded-lg transition cursor-pointer ${
                            orderSizeType === 'percent' ? 'bg-[#FF5A00] text-white' : 'text-gray-400 hover:text-white'
                          }`}
                        >
                          % of Balance
                        </button>
                      </div>

                      <div className="relative">
                        <input
                          type="number"
                          value={baseOrderSize}
                          onChange={(e) => setBaseOrderSize(Math.max(1, parseFloat(e.target.value) || 0))}
                          className="w-full bg-[#0F141F] border border-[#2D3748] rounded-xl px-4 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 font-mono">
                          {orderSizeType === 'usd' ? 'USDT' : '%'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="block text-xs text-gray-400 font-medium">MARGIN LEVERAGE MULTIPLIER</label>
                      {strategyType === 'spot' ? (
                        <div className="bg-[#0F141F] border border-dashed border-[#2D3748] rounded-xl p-3.5 text-center text-xs text-gray-400">
                          Unavailable for Spot exchanges. Trades executed on a robust 1x asset cash base.
                        </div>
                      ) : (
                        <div className="bg-[#0F141F] border border-[#2D3748] rounded-xl p-3.5 space-y-2">
                          <div className="flex justify-between items-center text-xs font-semibold">
                            <span className="text-gray-400 font-mono">Multiplier:</span>
                            <span className="text-[#FF5A00] font-mono">{leverage}x</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="50"
                            value={leverage}
                            onChange={(e) => setLeverage(parseInt(e.target.value))}
                            className="w-full accent-[#FF5A00] h-1 bg-slate-850 cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* RISK MANAGEMENT RULES */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">5. Automatic Risk Managers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       {/* Take Profit Setting */}
                    <div className="bg-[#0F141F] border border-[#2D3748] rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs font-semibold text-gray-300">
                        <span>TAKE PROFIT (TP TARGET)</span>
                        <div className="flex space-x-1.5 bg-[#1A2333] rounded px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() => setTakeProfitType('percent')}
                            className={`px-1.5 py-0.5 text-[10px] rounded transition ${takeProfitType === 'percent' ? 'bg-[#FF5A00] text-white' : 'text-gray-400'}`}
                          >
                            Single %
                          </button>
                          <button
                            type="button"
                            onClick={() => setTakeProfitType('multiple')}
                            className={`px-1.5 py-0.5 text-[10px] rounded transition flex items-center gap-1 ${takeProfitType === 'multiple' ? 'bg-[#FF5A00] text-white' : 'text-gray-400'}`}
                          >
                            Multi-TP
                          </button>
                          <button
                            type="button"
                            onClick={() => setTakeProfitType('none')}
                            className={`px-1.5 py-0.5 text-[10px] rounded transition ${takeProfitType === 'none' ? 'bg-[#FF5A00] text-white' : 'text-gray-400'}`}
                          >
                            None
                          </button>
                        </div>
                      </div>

                      {takeProfitType === 'percent' && (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Take Profit Target</label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.001"
                                min="0.001"
                                value={takeProfitValue}
                                onChange={(e) => setTakeProfitValue(Math.max(0.001, parseFloat(e.target.value) || 0))}
                                className="w-full bg-[#0B0F17] border border-[#2D3748] rounded-xl px-4 py-2 text-sm font-semibold text-white focus:outline-none"
                              />
                              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono font-bold">%</span>
                            </div>
                          </div>
                          
                          <div className="space-y-3 bg-[#0B0F17]/50 p-3 rounded-xl border border-slate-800">
                            <label className="flex items-center space-x-2 text-xs text-gray-300 select-none cursor-pointer">
                              <input
                                type="checkbox"
                                checked={trailingTakeProfit}
                                onChange={(e) => setTrailingTakeProfit(e.target.checked)}
                                className="rounded border-gray-700 text-[#FF5A00] bg-[#0B0F17] focus:ring-[#FF5A00]"
                              />
                              <span className="font-semibold">Enable Trailing Take Profit</span>
                            </label>
                            
                            {trailingTakeProfit && (
                              <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                                <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Trailing TP Deviation</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.05"
                                    min="0.01"
                                    value={trailingTpDeviation}
                                    onChange={(e) => setTrailingTpDeviation(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                                    className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none font-mono"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono font-bold">% deviation</span>
                                </div>
                                <div className="flex gap-1.5 flex-wrap font-mono mt-1">
                                  {[0.05, 0.1, 0.2, 0.5, 1.0].map((dev) => (
                                    <button
                                      type="button"
                                      key={`adv-tp-dev-1-${dev}`}
                                      onClick={() => setTrailingTpDeviation(dev)}
                                      className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                                        trailingTpDeviation === dev 
                                          ? 'bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30' 
                                          : 'bg-slate-900 text-gray-400 hover:text-white border border-slate-800'
                                      }`}
                                    >
                                      {dev}%
                                    </button>
                                  ))}
                                </div>
                                <span className="text-[9.5px] text-gray-550 block leading-tight">Secures profits once price pulls back by this % from local peaks.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {takeProfitType === 'multiple' && (
                        <div className="space-y-4">
                          <div className="p-3 bg-[#0B0F17]/60 rounded-xl border border-gray-800 space-y-3">
                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono mb-1">TP Tier 1 Target</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={tp1Value}
                                    onChange={(e) => setTp1Value(Math.max(0.001, parseFloat(e.target.value) || 0))}
                                    className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono font-bold">%</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono mb-1">TP 1 Close Size</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    max="100"
                                    value={tp1Size}
                                    onChange={(e) => setTp1Size(Math.min(100, Math.max(1, parseInt(e.target.value) || 0)))}
                                    className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono font-bold">%</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono mb-1">TP Tier 2 Target</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={tp2Value}
                                    onChange={(e) => setTp2Value(Math.max(0.001, parseFloat(e.target.value) || 0))}
                                    className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono font-bold">%</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono mb-1">TP 2 Close Size</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    max="100"
                                    value={tp2Size}
                                    onChange={(e) => setTp2Size(Math.min(100, Math.max(1, parseInt(e.target.value) || 0)))}
                                    className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono font-bold">%</span>
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs">
                              <div>
                                <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono mb-1">TP Tier 3 Target</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.001"
                                    min="0.001"
                                    value={tp3Value}
                                    onChange={(e) => setTp3Value(Math.max(0.001, parseFloat(e.target.value) || 0))}
                                    className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono font-bold">%</span>
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono mb-1">TP 3 Close Size</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    max="100"
                                    value={tp3Size}
                                    onChange={(e) => setTp3Size(Math.min(100, Math.max(1, parseInt(e.target.value) || 0)))}
                                    className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:outline-none"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-500 font-mono font-bold">%</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex justify-between text-[11px] text-gray-400 border-t border-gray-850 pt-2 font-mono">
                              <span>Sum closure target:</span>
                              <span className={(tp1Size + tp2Size + tp3Size) !== 100 ? "text-amber-500 font-bold" : "text-emerald-500 font-bold"}>
                                {tp1Size + tp2Size + tp3Size}% / 100%
                              </span>
                            </div>
                          </div>

                          <div className="space-y-3 bg-[#0B0F17]/50 p-3 rounded-xl border border-slate-800">
                            <label className="flex items-center space-x-2 text-xs text-gray-300 select-none cursor-pointer">
                              <input
                                type="checkbox"
                                checked={trailingTakeProfit}
                                onChange={(e) => setTrailingTakeProfit(e.target.checked)}
                                className="rounded border-gray-700 text-[#FF5A00] bg-[#0B0F17] focus:ring-[#FF5A00]"
                              />
                              <span className="font-semibold">Enable Trailing Take Profit</span>
                            </label>
                            
                            {trailingTakeProfit && (
                              <div className="space-y-1.5 pt-1 border-t border-slate-800/40">
                                <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Trailing TP Deviation</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.05"
                                    min="0.01"
                                    value={trailingTpDeviation}
                                    onChange={(e) => setTrailingTpDeviation(Math.max(0.01, parseFloat(e.target.value) || 0.1))}
                                    className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none font-mono"
                                  />
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono font-bold">% deviation</span>
                                </div>
                                <div className="flex gap-1.5 flex-wrap font-mono mt-1">
                                  {[0.05, 0.1, 0.2, 0.5, 1.0].map((dev) => (
                                    <button
                                      type="button"
                                      key={`adv-tp-dev-2-${dev}`}
                                      onClick={() => setTrailingTpDeviation(dev)}
                                      className={`text-[9px] px-1.5 py-0.5 rounded cursor-pointer transition-all ${
                                        trailingTpDeviation === dev 
                                          ? 'bg-amber-500/20 text-amber-500 font-bold border border-amber-500/30' 
                                          : 'bg-slate-900 text-gray-400 hover:text-white border border-slate-800'
                                      }`}
                                    >
                                      {dev}%
                                    </button>
                                  ))}
                                </div>
                                <span className="text-[9.5px] text-gray-550 block leading-tight">Trails each TP tier to secure maximal profit margins during spikes.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Stop Loss Setting */}
                    <div className="bg-[#0F141F] border border-[#2D3748] rounded-xl p-4 space-y-3">
                      <div className="flex justify-between items-center text-xs font-semibold text-gray-300">
                        <span>STOP LOSS (SL TARGET)</span>
                        <div className="flex space-x-1.5 bg-[#1A2333] rounded px-1.5 py-0.5">
                          <button
                            type="button"
                            onClick={() => setStopLossType('percent')}
                            className={`px-1.5 py-0.5 text-[10px] rounded transition ${stopLossType === 'percent' ? 'bg-[#FF5A00] text-white' : 'text-gray-400'}`}
                          >
                            Percent (%)
                          </button>
                          <button
                            type="button"
                            onClick={() => setStopLossType('none')}
                            className={`px-1.5 py-0.5 text-[10px] rounded transition ${stopLossType === 'none' ? 'bg-[#FF5A00] text-white' : 'text-gray-400'}`}
                          >
                            None
                          </button>
                        </div>
                      </div>

                      {stopLossType === 'percent' && (
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              type="number"
                              step="0.001"
                              min="0.001"
                              value={stopLossValue}
                              onChange={(e) => setStopLossValue(Math.max(0.001, parseFloat(e.target.value) || 0))}
                              className="w-full bg-[#0B0F17] border border-[#2D3748] rounded-xl px-4 py-2 text-sm font-semibold text-white focus:outline-none"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-mono font-bold">%</span>
                          </div>
                          <div className="space-y-3 pt-2">
                            <label className="block text-[9px] text-[#FF5A00] uppercase font-bold tracking-widest font-mono">Advanced SL Safeguards</label>
                            
                            {/* 1. Trailing Stop Loss */}
                            <div className="space-y-2.5 bg-[#0B0F17]/60 p-3 rounded-xl border border-slate-800">
                              <label className="flex items-center space-x-2 text-xs text-gray-300 select-none cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={trailingStopLoss}
                                  onChange={(e) => setTrailingStopLoss(e.target.checked)}
                                  className="rounded border-gray-700 text-[#FF5A00] bg-[#0B0F17] focus:ring-[#FF5A00]"
                                />
                                <span className="font-semibold text-gray-200">Trailing Stop Loss</span>
                              </label>
                              
                              {trailingStopLoss && (
                                <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                                  <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Trailing Distance</label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0.1"
                                      value={trailingSlDeviation}
                                      onChange={(e) => setTrailingSlDeviation(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                                      className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none font-mono"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono font-bold">% distance</span>
                                  </div>
                                  <span className="text-[9.5px] text-gray-400 block leading-tight">Trails SL level behind the highest peak price to lock in accrued paper profits.</span>
                                </div>
                              )}
                            </div>

                            {/* 2. Move Stop Loss to Breakeven */}
                            <div className="space-y-2.5 bg-[#0B0F17]/60 p-3 rounded-xl border border-slate-800">
                              <label className="flex items-center space-x-2 text-xs text-gray-300 select-none cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={slMoveToBreakeven}
                                  onChange={(e) => setSlMoveToBreakeven(e.target.checked)}
                                  className="rounded border-gray-700 text-[#FF5A00] bg-[#0B0F17] focus:ring-[#FF5A00]"
                                />
                                <span className="font-semibold text-gray-200">Move SL to Breakeven</span>
                              </label>
                              
                              {slMoveToBreakeven && (
                                <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                                  <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">ROI Trigger Level</label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0.1"
                                      value={slBreakevenTrigger}
                                      onChange={(e) => setSlBreakevenTrigger(Math.max(0.1, parseFloat(e.target.value) || 0.1))}
                                      className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none font-mono"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono font-bold">% trigger ROI</span>
                                  </div>
                                  <span className="text-[9.5px] text-gray-400 block leading-tight">Relocates Stop Loss to entry level immediately upon hitting this actual profit margin.</span>
                                </div>
                              )}
                            </div>

                            {/* 3. Stop Loss Delay Timeout */}
                            <div className="space-y-2.5 bg-[#0B0F17]/60 p-3 rounded-xl border border-slate-800">
                              <label className="flex items-center space-x-2 text-xs text-gray-300 select-none cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={slTimeoutEnabled}
                                  onChange={(e) => setSlTimeoutEnabled(e.target.checked)}
                                  className="rounded border-gray-700 text-[#FF5A00] bg-[#0B0F17] focus:ring-[#FF5A00]"
                                />
                                <span className="font-semibold text-gray-200">Stop Loss Timeout (Delayed SL)</span>
                              </label>
                              
                              {slTimeoutEnabled && (
                                <div className="space-y-1.5 pt-2 border-t border-slate-800/40">
                                  <label className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider font-mono">Breach Verification Window</label>
                                  <div className="relative">
                                    <input
                                      type="number"
                                      step="5"
                                      min="1"
                                      value={slTimeoutSeconds}
                                      onChange={(e) => setSlTimeoutSeconds(Math.max(1, parseInt(e.target.value) || 0))}
                                      className="w-full bg-[#070a13] border border-gray-800 rounded-lg px-3 py-1.5 text-xs font-semibold text-white focus:outline-none font-mono"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-gray-500 font-mono font-bold">seconds</span>
                                  </div>
                                  <span className="text-[9.5px] text-gray-400 block leading-tight">Prevents market noise or brief wicks triggering your stop-loss unless breached for over X seconds.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Smart Preset & Risk/Reward Intelligence Panel (Advanced) */}
                  <div className="mt-4 pt-4 border-t border-slate-800/60 space-y-4 text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F17]/60 p-4 rounded-xl border border-slate-850">
                      <div className="space-y-1 text-left">
                        <span className="text-[10px] uppercase font-bold text-[#FF5A00] font-mono tracking-wider block">⚡ Advanced Setup Presets</span>
                        <span className="text-[11px] text-gray-400 block font-medium">Deploy industry-standard risk configurations instantly.</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setTakeProfitValue(0.001);
                            setTakeProfitType('percent');
                            setStopLossValue(0.001);
                            setStopLossType('percent');
                            setTrailingTakeProfit(false);
                          }}
                          className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-rose-400 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono"
                        >
                          🔥 HFT Micro (0.001% / 0.001%)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTakeProfitValue(0.2);
                            setTakeProfitType('percent');
                            setStopLossValue(0.4);
                            setStopLossType('percent');
                            setTrailingTakeProfit(false);
                          }}
                          className="px-3.5 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/25 text-sky-400 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono"
                        >
                          ⚡ Scalper (0.2% / 0.4%)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTakeProfitValue(1.5);
                            setTakeProfitType('percent');
                            setStopLossValue(1.0);
                            setStopLossType('percent');
                            setTrailingTakeProfit(true);
                            setTrailingTpDeviation(0.1);
                          }}
                          className="px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 text-emerald-400 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono"
                        >
                          📈 Standard (1.5% / 1.0% Trail)
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setTakeProfitValue(3.0);
                            setTakeProfitType('percent');
                            setStopLossValue(1.5);
                            setStopLossType('percent');
                            setTrailingTakeProfit(true);
                            setTrailingTpDeviation(0.25);
                          }}
                          className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/25 text-amber-500 text-xs font-bold rounded-lg transition-all cursor-pointer font-mono"
                        >
                          🛡️ Swing (3.0% / 1.5% Trail)
                        </button>
                      </div>
                    </div>

                    {/* Dynamic Risk To Reward Gauge */}
                    {(() => {
                      const tpVal = takeProfitType === 'none' ? 0 : takeProfitValue;
                      const slVal = stopLossType === 'none' ? 0 : stopLossValue;
                      
                      if (slVal === 0) {
                        return (
                          <div className="bg-amber-500/5 border border-amber-500/15 text-amber-400 text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 font-mono">
                            <span>⚠️ Capital Alert: Stop-Loss is currently disabled. A sudden drop may lead to custom drawdown or margin liquidation.</span>
                          </div>
                        );
                      }

                      const ratio = tpVal / slVal;
                      let alertColor = 'text-gray-400';
                      let alertBg = 'bg-slate-900/40 border-slate-800';
                      let statusText = '';

                      if (ratio >= 2.0) {
                        alertColor = 'text-emerald-400';
                        alertBg = 'bg-emerald-500/5 border-emerald-500/10';
                        statusText = '🟢 Professional Risk Expectancy: Greater than 1:2.0 ratio. Your take profit makes more than twice what you risk per trade.';
                      } else if (ratio >= 1.0) {
                        alertColor = 'text-yellow-400';
                        alertBg = 'bg-yellow-500/5 border-yellow-500/10';
                        statusText = '🟡 Balanced Scalp Expectancy: Between 1:1.0 and 1:1.9 ratio. Safe and reliable for high-winrate indicators.';
                      } else {
                        alertColor = 'text-rose-400';
                        alertBg = 'bg-rose-500/5 border-rose-500/10';
                        statusText = '🔴 Warning - Negative Expectancy Ratio: Stop-Loss is wider than Take Profit. You risk more than you make per transaction. Verify win rates!';
                      }

                      return (
                        <div className={`${alertBg} border text-xs p-3.5 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 font-sans`}>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">🧬</span>
                            <span className="text-gray-300 font-semibold leading-tight">{statusText}</span>
                          </div>
                          <div className="bg-[#040609] border border-slate-850 p-2 rounded-lg font-mono text-center shrink-0 min-w-[120px]">
                            <span className="text-[9px] text-gray-500 block font-bold uppercase tracking-wider">RISK TO REWARD</span>
                            <span className={`text-sm font-black ${alertColor}`}>1 : {ratio.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                </div>

                {/* LIMIT RULES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-gray-200 mb-1.5 font-bold font-mono text-[#FF5A00]">MAX SIMULTANEOUS COIN POSITIONS (CUSTOMIZABLE)</label>
                    <input
                      type="number"
                      min="1"
                      placeholder="e.g. 5, 20, 100"
                      value={maxActiveDeals}
                      onChange={(e) => setMaxActiveDeals(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-[#0F141F] border border-[#2D3748] rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-white font-mono"
                    />
                    <p className="text-[10px] text-gray-500 mt-1.5 leading-normal">
                      ℹ️ Feel free to customize this threshold to any value (no software lock is applied here). Controls how many concurrent trades this bot can manage simultaneously.
                    </p>
                  </div>
                </div>

                {/* 3COMMAS DCA SAFETY ORDERS CONFIGURATION */}
                <div className="bg-[#141A29]/40 border border-[#2D3748] rounded-2xl p-5 mt-4 space-y-4">
                  <div>
                    <h4 className="text-sm font-bold font-mono text-[#FF5A00] uppercase tracking-wider flex items-center gap-2">
                      🤖 3Commas DCA Safety Order Configurations
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                      Configure safety orders to automatically average down position cost bases when coin prices drift in the adverse direction of open signals.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono mb-1">Safety Order Size (USDT)</label>
                      <input
                        type="number"
                        min="0"
                        value={safetyOrderSize}
                        onChange={(e) => setSafetyOrderSize(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-[#0F141F] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF5A00] font-mono"
                      />
                      <span className="text-[10px] text-gray-500 block mt-1">Initial DCA purchase volume per tier</span>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono mb-1">Max Safety Orders Count</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={maxSafetyOrders}
                        onChange={(e) => setMaxSafetyOrders(Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-full bg-[#0F141F] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF5A00] font-mono"
                      />
                      <span className="text-[10px] text-gray-500 block mt-1">Maximum allowed DCA refills</span>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono mb-1">Price Deviation Step (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={priceDeviationStep}
                        onChange={(e) => setPriceDeviationStep(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
                        className="w-full bg-[#0F141F] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF5A00] font-mono"
                      />
                      <span className="text-[10px] text-gray-500 block mt-1">Adverse movement triggers SO step</span>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono mb-1">Safety Order Volume Scale</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={safetyOrderVolumeScale}
                        onChange={(e) => setSafetyOrderVolumeScale(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
                        className="w-full bg-[#0F141F] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF5A00] font-mono"
                      />
                      <span className="text-[10px] text-gray-500 block mt-1">Volume multiplier scaling coefficient</span>
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono mb-1">Safety Order Step Scale</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={safetyOrderStepScale}
                        onChange={(e) => setSafetyOrderStepScale(Math.max(0.1, parseFloat(e.target.value) || 1.0))}
                        className="w-full bg-[#0F141F] border border-gray-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#FF5A00] font-mono"
                      />
                      <span className="text-[10px] text-gray-500 block mt-1">Multiplier scaling the step deviation spacing</span>
                    </div>
                  </div>
                </div>

              </div>
            ) : (
              
              /* ============= GRID BOT FORM FIELDS ============= */
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono mb-3">3. Grid Bot General Settings</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">GRID BOT IDENTIFIER NAME</label>
                      <input
                        type="text"
                        value={gridName}
                        onChange={(e) => setGridName(e.target.value)}
                        placeholder="e.g. ZEC High-Frequency Grid Arbitrageur"
                        className="w-full bg-[#0F141F] border border-[#2D3748] rounded-xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-sm font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">GRID STEPPING ALGORITHM</label>
                      <select
                        value={gridType}
                        onChange={(e) => setGridType(e.target.value as any)}
                        className="w-full bg-[#0F141F] border border-[#2D3748] rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-[#FF5A00] text-sm transition-all"
                      >
                        <option value="arithmetic">Arithmetic Spacing (Equal Price steps)</option>
                        <option value="geometric">Geometric Spacing (Equal Percentage steps)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* PRICE BOUNDS CONTROLS */}
                <div>
                  <div className="flex justify-between items-center mb-2.5">
                    <label className="block text-xs text-gray-400 font-medium uppercase tracking-wide">
                      4. Arbitrage Price Interval Bounds
                    </label>
                    <span className="text-[10px] text-gray-400 font-mono">Bound ranges inside which limit orders float</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#0F141F] p-4 rounded-xl border border-[#20293A]">
                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-semibold font-mono">LOWER PRICE LIMIT (USDT)</label>
                      <input
                        type="number"
                        step="any"
                        value={lowerPrice}
                        onChange={(e) => setLowerPrice(Math.max(0.001, parseFloat(e.target.value) || 0))}
                        className="w-full bg-[#131A2A] border border-[#2D3748] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF5A00]"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] text-gray-400 mb-1 font-semibold font-mono">UPPER PRICE LIMIT (USDT)</label>
                      <input
                        type="number"
                        step="any"
                        value={upperPrice}
                        onChange={(e) => setUpperPrice(Math.max(0.001, parseFloat(e.target.value) || 0))}
                        className="w-full bg-[#131A2A] border border-[#2D3748] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#FF5A00]"
                      />
                    </div>
                  </div>
                </div>

                {/* GRIDS & INVESTMENT */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest font-mono">5. Grids count & Capital investments</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">TOTAL MULTI-LIMIT GRIDS</label>
                      <input
                        type="number"
                        min="5"
                        max="80"
                        value={gridsCount}
                        onChange={(e) => setGridsCount(Math.min(80, Math.max(5, parseInt(e.target.value) || 5)))}
                        className="w-full bg-[#0F141F] border border-[#2D3748] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block font-mono">Slices range into {gridsCount} intervals</span>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">TOTAL FUNDS INVESTED (USDT)</label>
                      <input
                        type="number"
                        min="10"
                        value={investment}
                        onChange={(e) => setInvestment(Math.max(10, parseFloat(e.target.value) || 0))}
                        className="w-full bg-[#0F141F] border border-[#2D3748] rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A00]"
                      />
                      <span className="text-[10px] text-gray-400 mt-1 block font-mono">Allocates ${investment.toLocaleString()} budget</span>
                    </div>

                    {/* Dynamic Leverage for Futures Grid */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1.5 font-medium">GRID MARGIN LEVERAGE</label>
                      {strategyType === 'spot' ? (
                        <div className="bg-[#0F141F] border border-dashed border-[#20293A] rounded-xl p-2.5 text-center text-[10.5px] text-gray-500 leading-tight">
                          Spot Grid trades. Leverage disabled (strictly 1x locked).
                        </div>
                      ) : (
                        <div className="bg-[#0F141F] border border-slate-700/60 rounded-xl px-4 py-1.5">
                          <div className="flex justify-between items-center text-xs font-mono font-bold mb-1">
                            <span>Leverage:</span>
                            <span className="text-[#FF5A00]">{leverage}x</span>
                          </div>
                          <input
                            type="range"
                            min="1"
                            max="50"
                            value={leverage}
                            onChange={(e) => setLeverage(parseInt(e.target.value))}
                            className="w-full accent-[#FF5A00] h-1.5 cursor-pointer bg-slate-800"
                          />
                        </div>
                      )}
                    </div>

                  </div>
                </div>

              </div>
            )}

          </div>

          {/* FORM FOOTER BUTTONS */}
          <div className="bg-[#101725] px-6 py-4 border-t border-[#20293A] flex items-center justify-end space-x-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg text-xs cursor-pointer transition active:scale-95"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2.5 bg-[#FF5A00] hover:bg-[#FF5A00]/90 disabled:bg-gray-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center space-x-2 cursor-pointer shadow-lg shadow-[#FF5A00]/10 transition active:scale-95"
            >
              {isSaving ? (
                <span>Configuring Bot...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>
                    {activeTab === 'master' ? (
                      <>{botToEdit ? 'Save Master Bot Changes' : 'Launch Master Bot Strategy'}</>
                    ) : activeTab === 'signal' ? (
                      <>{botToEdit ? 'Save Signal Bot Changes' : 'Create Signal Bot Engine'}</>
                    ) : (
                      <>{gridBotToEdit ? 'Save Grid Bot Changes' : 'Launch Arbitrage Grid Bot'}</>
                    )}
                  </span>
                </>
              )}
            </button>
          </div>

        </div>
      </form>
    </div>
  );
}
