import React, { useState } from 'react';
import { X, TrendingUp, TrendingDown, Clock, ShieldAlert, CheckCircle, Info, ExternalLink, Download } from 'lucide-react';
import { Deal } from '../types';

interface DealsTrackerProps {
  deals: Deal[];
  onCloseDeal: (dealId: string) => Promise<void>;
  isClosing: string | null;
  accountMode: 'paper' | 'real';
}

export function DealsTracker({ deals, onCloseDeal, isClosing, accountMode }: DealsTrackerProps) {
  const [dealTab, setDealTab] = useState<'active' | 'history'>('active');
  const [calcMode, setCalcMode] = useState<'price' | 'roi'>('price');

  const activeDeals = deals.filter(d => d.status === 'active' && ((d as any).accountMode || 'paper') === accountMode);
  const historyDeals = deals.filter(d => d.status !== 'active' && ((d as any).accountMode || 'paper') === accountMode);

  // Stats calculation
  const totalMarginAllocated = activeDeals.reduce((sum, d) => sum + d.volume, 0);
  const totalExposureSum = activeDeals.reduce((sum, d) => sum + (d.volume * d.leverage), 0);
  const averageLeverage = activeDeals.length > 0 ? (totalExposureSum / totalMarginAllocated) : 1;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'take_profit':
        return <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500/20 font-mono">TAKE PROFIT ✓</span>;
      case 'stop_loss':
        return <span className="bg-rose-500/10 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded border border-rose-500/20 font-mono">STOP LOSS ✕</span>;
      case 'manually_closed':
        return <span className="bg-gray-500/10 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded border border-gray-500/20 font-mono">MANUAL CLOSE</span>;
      case 'liquidated':
        return <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/20 animate-pulse font-mono">LIQUIDATED ☠</span>;
      default:
        return <span className="bg-blue-500/10 text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded border border-blue-500/20 font-mono">ACTIVE</span>;
    }
  };

  const handleExportToCSV = () => {
    if (historyDeals.length === 0) return;

    // Standard CSV headers for trading ledger export
    const headers = [
      'Deal ID',
      'Closed/Completed Time (UTC)',
      'Trading Bot Name',
      'Asset Pair',
      'Direction (Type)',
      'Leverage Multiplier',
      'Sizing ($ USDT Volume)',
      'Sizing (Coin Amount Asset)',
      'Entry Raw Price',
      'Exit/Trigger Price',
      'Realized Net Profit/Loss (USD)',
      'Realized ROI P&L (%)',
      'Exit Condition (Status)',
      'Initial Created timestamp'
    ];

    // Map each historic deal to double quote padded CSV row representation
    const csvRows = historyDeals.map(deal => {
      const closedTime = deal.updatedAt || deal.createdAt;
      const formattedTime = new Date(closedTime).toISOString().replace('T', ' ').slice(0, 19);
      const cleanBotName = (deal.botName || 'Custom Bot').replace(/"/g, '""');
      
      return [
        `"${deal.id}"`,
        `"${formattedTime}"`,
        `"${cleanBotName}"`,
        `"${deal.pair}"`,
        `"${deal.type.toUpperCase()}"`,
        `"${deal.leverage}x"`,
        `"${deal.volume}"`,
        `"${deal.amountAsset}"`,
        `"${deal.entryPrice}"`,
        `"${deal.exitPrice || deal.currentPrice}"`,
        `"${deal.pnl.toFixed(4)}"`,
        `"${deal.pnlPercent.toFixed(2)}"`,
        `"${deal.status.toUpperCase()}"`,
        `"${deal.createdAt}"`
      ];
    });

    // Merge header & contentrows
    const csvContent = "\ufeff" + [
      headers.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create a secure client browser trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `trader_deals_ledger_tax_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Upper info section */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">
          {accountMode === 'real' ? 'Real Execution Terminal' : 'Practice Demo Terminal'}
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          {accountMode === 'real' 
            ? 'Live connected exchange active positions and REST/WebSocket trade history logs' 
            : 'Simulated active positions and historic webhook practice trade logs'}
        </p>
      </div>

      {/* Tabs list & CSV export row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[#20293A] gap-3">
        <div className="flex">
          <button
            onClick={() => setDealTab('active')}
            className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              dealTab === 'active'
                ? 'border-[#FF5A00] text-[#FF5A00]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Active Positions ({activeDeals.length})
          </button>
          <button
            onClick={() => setDealTab('history')}
            className={`px-5 py-2.5 text-xs font-semibold border-b-2 transition cursor-pointer ${
              dealTab === 'history'
                ? 'border-[#FF5A00] text-[#FF5A00]'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Closed Trade History ({historyDeals.length})
          </button>
        </div>

        {/* Export Button visible strictly on history tab to match user instruction */}
        {dealTab === 'history' && (
          <button
            onClick={handleExportToCSV}
            disabled={historyDeals.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 mb-2 sm:mb-0 mr-1.5 text-xs font-bold transition rounded-lg border cursor-pointer ${
              historyDeals.length === 0 
                ? 'bg-gray-800/20 border-gray-800/50 text-gray-500 cursor-not-allowed opacity-60' 
                : 'bg-orange-500/10 hover:bg-orange-500 hover:text-black border-orange-500/30 text-orange-400 hover:border-transparent active:scale-95'
            }`}
            title={historyDeals.length === 0 ? "No closed deals to export" : "Download closed deal history formatted for tax accounting or analysis in Excel/Sheets"}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Deal History to CSV</span>
          </button>
        )}
      </div>

      {dealTab === 'active' ? (
        <div className="space-y-6">
          {/* Active Deals Summary Metrics */}
          {activeDeals.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#121824] border border-[#20293A] p-4 rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">MARGIN COMMITTED</span>
                <span className="text-lg font-bold text-white block mt-1 font-mono">
                  ${totalMarginAllocated.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT
                </span>
                <span className="text-[11px] text-gray-400 mt-1 block">Floating collateral currently locked in positions</span>
              </div>

              <div className="bg-[#121824] border border-[#20293A] p-4 rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">CONTRACT EXPOSURE</span>
                <span className="text-lg font-bold text-white block mt-1 font-mono">
                  ${totalExposureSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
                <span className="text-[11px] text-gray-400 mt-1 block">Effective pool size at average leverage of {averageLeverage.toFixed(1)}x</span>
              </div>

              <div className="bg-[#121824] border border-[#20293A] p-4 rounded-xl">
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider font-mono">ESTIMATED LIQUIDATION RISK</span>
                <span className="text-lg font-bold text-white block mt-1 flex items-center gap-1.5 font-mono">
                  {averageLeverage > 20 ? (
                    <span className="text-red-500 font-bold">CRITICAL RISK 🚨</span>
                  ) : averageLeverage > 8 ? (
                    <span className="text-amber-500 font-semibold">HIGH RISK ⚠️</span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">LOW RISK ✓</span>
                  )}
                </span>
                <span className="text-[11px] text-gray-400 mt-1 block">Computed from outstanding pool size weights</span>
              </div>
            </div>
          )}

          {activeDeals.length === 0 ? (
            <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-3">
              <div className="bg-slate-800/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <Info className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold text-white">No Active Positions Open</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto leading-normal">
                There are no live trading positions active. Generate a buy alert or trigger a signal using the **Webhook Simulator** panel to open a position!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Aligned Math Mode Switcher */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#121824] border border-[#20293A] p-4 rounded-2xl gap-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-orange-500/10 text-orange-400 rounded-lg">
                    <Info className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Consolidated Tracking Math</h4>
                    <p className="text-[10px] text-gray-400 mt-0.5">Toggle aligned percentages models to show active Take Profit, Stop Loss, and P&L concurrently on the same logic.</p>
                  </div>
                </div>
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-0.5 flex gap-1 self-start sm:self-center">
                  <button 
                    onClick={() => setCalcMode('price')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${
                      calcMode === 'price' 
                        ? 'bg-[#FF5A00] text-black shadow-md font-extrabold' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>Pure Price % (Asset Deviation)</span>
                  </button>
                  <button 
                    onClick={() => setCalcMode('roi')}
                    className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition cursor-pointer flex items-center gap-1 ${
                      calcMode === 'roi' 
                        ? 'bg-[#FF5A00] text-black shadow-md font-extrabold' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <span>Leveraged ROI % (Portfolio P&L)</span>
                  </button>
                </div>
              </div>

              {/* Table Container */}
              <div className="bg-[#121824] border border-[#20293A] rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#1C2533] text-gray-400 font-bold uppercase font-mono border-b border-[#20293A]">
                        <th className="p-4">Pair / Bot ID</th>
                        <th className="p-4 text-center border-l border-slate-800/40">Direction</th>
                        <th className="p-4 text-right border-l border-slate-800/40">Entry Price</th>
                        <th className="p-4 text-right border-l border-slate-800/40">Ticking Price</th>
                        <th className="p-4 text-right border-l border-slate-800/40">
                          {calcMode === 'price' ? 'TP / SL Targets (Price %)' : 'TP / SL Targets (ROI %)'}
                        </th>
                        <th className="p-4 text-right border-l border-slate-800/40">Position Size</th>
                        <th className="p-4 text-right border-l border-slate-800/40">
                          {calcMode === 'price' ? 'Floating P&L (Price %)' : 'Floating P&L (ROI %)'}
                        </th>
                        <th className="p-4 text-center border-l border-slate-800/40">Terminate</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1D2636]">
                      {activeDeals.map((deal) => {
                        const isLong = deal.type === 'long';
                        const pnlGlow = deal.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-500 font-bold';

                        return (
                          <tr key={deal.id} className="hover:bg-[#1C2533]/40 transition">
                            <td className="p-4">
                              <div className="font-semibold text-white text-sm">{deal.pair}</div>
                              <div className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[140px] md:max-w-xs">{deal.botName}</div>
                            </td>
                            <td className="p-4 text-center border-l border-slate-800/20">
                              <span className={`inline-flex items-center gap-1 font-bold text-[10px] px-2 py-0.5 uppercase tracking-wide rounded ${
                                isLong 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-rose-500/10 text-rose-400'
                              }`}>
                                {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                {deal.type} {deal.leverage}x
                              </span>
                            </td>
                            <td className="p-4 text-right font-mono text-gray-300 border-l border-slate-800/20">
                              <div>${deal.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                            </td>
                            <td className="p-4 text-right font-mono text-white font-semibold border-l border-slate-800/20">
                              ${deal.currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-right border-l border-slate-800/20">
                              {deal.takeProfitType === 'multiple' ? (
                                <div className="space-y-0.5 text-left inline-block">
                                  <div className="text-[9px] font-mono leading-none">
                                    <span className={deal.tp1Hit ? "text-emerald-500 font-semibold" : "text-emerald-400"}>TP1: </span>
                                    <span className={deal.tp1Hit ? "text-gray-500 line-through" : "text-gray-300"}>
                                      ${deal.tp1Price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                    </span>
                                    {deal.tp1Hit ? <span className="text-emerald-400 ml-1 font-bold">✓</span> : <span className="text-gray-500 ml-1">⏳</span>}
                                  </div>
                                  <div className="text-[9px] font-mono leading-none">
                                    <span className={deal.tp2Hit ? "text-emerald-500 font-semibold" : "text-emerald-400"}>TP2: </span>
                                    <span className={deal.tp2Hit ? "text-gray-500 line-through" : "text-gray-350"}>
                                      ${deal.tp2Price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                    </span>
                                    {deal.tp2Hit ? <span className="text-emerald-400 ml-1 font-bold">✓</span> : <span className="text-gray-500 ml-1">⏳</span>}
                                  </div>
                                  <div className="text-[9px] font-mono leading-none">
                                    <span className={deal.tp3Hit ? "text-emerald-500 font-semibold" : "text-emerald-400"}>TP3: </span>
                                    <span className={deal.tp3Hit ? "text-gray-500 line-through" : "text-gray-350"}>
                                      ${deal.tp3Price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                    </span>
                                    {deal.tp3Hit ? <span className="text-emerald-400 ml-1 font-bold">✓</span> : <span className="text-gray-500 ml-1">⏳</span>}
                                  </div>
                                  <div className="text-[10px] font-mono mt-1 border-t border-gray-800/60 pt-0.5 font-bold">
                                    <span className="text-rose-450 font-semibold">SL:</span> {deal.stopLossPrice ? (
                                      <span>
                                        ${deal.stopLossPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        {deal.stopLossPercent !== undefined && (
                                          <span className="text-rose-500 font-semibold ml-1">
                                            ({calcMode === 'price' ? `${deal.stopLossPercent}%` : `${(deal.stopLossPercent * deal.leverage).toFixed(1)}%`})
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      'N/A'
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="text-[10px] font-mono">
                                    <span className="text-emerald-400 font-medium">TP: </span>
                                    {deal.takeProfitPrice ? (
                                      <span>
                                        ${deal.takeProfitPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        {deal.takeProfitPercent !== undefined && (
                                          <span className="text-emerald-500 font-bold ml-1">
                                            ({calcMode === 'price' ? `${deal.takeProfitPercent < 0.1 ? deal.takeProfitPercent : deal.takeProfitPercent.toFixed(2)}%` : `${(deal.takeProfitPercent * deal.leverage) < 0.1 ? (deal.takeProfitPercent * deal.leverage) : (deal.takeProfitPercent * deal.leverage).toFixed(1)}%`})
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      'N/A'
                                    )}
                                  </div>
                                  <div className="text-[10px] font-mono mt-1 border-t border-gray-800/60 pt-0.5">
                                    <span className="text-rose-400 font-semibold">SL: </span>
                                    {deal.stopLossPrice ? (
                                      <span>
                                        ${deal.stopLossPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        {deal.stopLossPercent !== undefined && (
                                          <span className="text-rose-500 font-bold ml-1">
                                            ({calcMode === 'price' ? `${deal.stopLossPercent < 0.1 ? deal.stopLossPercent : deal.stopLossPercent.toFixed(2)}%` : `${(deal.stopLossPercent * deal.leverage) < 0.1 ? (deal.stopLossPercent * deal.leverage) : (deal.stopLossPercent * deal.leverage).toFixed(1)}%`})
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      'N/A'
                                    )}
                                  </div>
                                </>
                              )}
                            </td>
                            <td className="p-4 text-right font-mono border-l border-slate-800/20">
                              <div className="text-white font-medium">${deal.volume.toFixed(2)} USDT</div>
                              <div className="text-[10px] text-gray-400 mt-0.5">{deal.amountAsset.toFixed(4)} Contract</div>
                            </td>
                            <td className="p-4 text-right font-mono border-l border-slate-800/20">
                              <div className={`${pnlGlow} text-sm`}>
                                {deal.pnl >= 0 ? '+' : ''}${deal.pnl.toFixed(2)}
                              </div>
                              <div className={`${pnlGlow} text-[10px] mt-0.2`}>
                                {calcMode === 'price' ? (
                                  <>
                                    {deal.pnlPercent >= 0 ? '+' : ''}{(deal.pnlPercent / deal.leverage).toFixed(2)}% Price
                                  </>
                                ) : (
                                  <>
                                    {deal.pnlPercent >= 0 ? '+' : ''}{deal.pnlPercent.toFixed(2)}% ROI
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-center border-l border-slate-800/20">
                              <button
                                id={`close_deal_btn_${deal.id}`}
                                onClick={() => onCloseDeal(deal.id)}
                                disabled={isClosing === deal.id}
                                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500 border border-red-500/30 hover:border-transparent hover:text-white text-red-400 cursor-pointer text-[10px] font-bold rounded uppercase tracking-wider transition active:scale-95"
                                title="Instantly liquidate position on paper trading exchange connection"
                              >
                                {isClosing === deal.id ? 'Selling...' : 'Close'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* History Closed Deals Table */
        <div className="space-y-4">
          {historyDeals.length === 0 ? (
            <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-12 text-center max-w-2xl mx-auto space-y-3">
              <div className="bg-slate-800/50 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-gray-400">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-md font-bold text-white">No Historic Closed Deals</h3>
              <p className="text-xs text-gray-400 max-w-md mx-auto">
                No trades have been completely processed, liquidated, or closed yet. Trigger enter followed by exit signals to log closed trades.
              </p>
            </div>
          ) : (
            <div className="bg-[#121824] border border-[#20293A] rounded-2xl overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#1C2533] text-gray-400 font-bold uppercase font-mono border-b border-[#20293A]">
                      <th className="p-4">Closed Time / Bot Name</th>
                      <th className="p-4">Pair</th>
                      <th className="p-4 text-center">Direction</th>
                      <th className="p-4 text-right">Entry Price</th>
                      <th className="p-4 text-right">Fill Price</th>
                      <th className="p-4 text-right">Sizing</th>
                      <th className="p-4 text-right">Realized P&L</th>
                      <th className="p-4 text-center">Exit Trigger</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1D2636]">
                    {historyDeals.map((deal) => {
                      const isLong = deal.type === 'long';
                      const pnlGlow = deal.pnl >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-500 font-bold';

                      return (
                        <tr key={deal.id} className="hover:bg-[#1C2533]/40 transition">
                          <td className="p-4">
                            <div className="text-white text-xs font-medium font-mono">{new Date(deal.updatedAt || deal.createdAt).toLocaleString()}</div>
                            <div className="text-[10px] text-gray-400 mt-1 font-semibold truncate max-w-[200px]">{deal.botName}</div>
                          </td>
                          <td className="p-4 font-semibold text-white">{deal.pair}</td>
                          <td className="p-4 text-center">
                            <span className={`inline-block font-bold text-[9px] px-1.5 py-0.5 rounded uppercase font-mono ${
                              isLong ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}>
                              {deal.type} {deal.leverage}x
                            </span>
                          </td>
                          <td className="p-4 text-right font-mono text-gray-400">${deal.entryPrice.toLocaleString()}</td>
                          <td className="p-4 text-right font-mono text-white">${deal.exitPrice?.toLocaleString() || deal.currentPrice.toLocaleString()}</td>
                          <td className="p-4 text-right font-mono text-gray-300">${deal.volume}</td>
                          <td className="p-4 text-right font-mono">
                            <span className={`${pnlGlow} text-sm`}>
                              {deal.pnl >= 0 ? '+' : ''}${deal.pnl.toFixed(2)}
                            </span>
                            <span className={`${pnlGlow} text-[10px] ml-1.5`}>
                              ({deal.pnlPercent >= 0 ? '+' : ''}{deal.pnlPercent.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="p-4 text-center">
                            {getStatusBadge(deal.status)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
