import React, { useState, useEffect } from 'react';
import { Play, Pause, Trash2, Edit2, Code, Terminal, Copy, Check, Info } from 'lucide-react';
import { SignalBot } from '../types';

interface WebhookBotCardProps {
  key?: string;
  bot: SignalBot;
  coinPrices?: Record<string, number>;
  activeDealsCount: number;
  stats: {
    totalProfit: number;
    realizedProfit: number;
    winRate: number;
    closedCount: number;
  };
  onToggleStatus: (botId: string, currentStatus: 'active' | 'inactive') => void;
  onEdit: (bot: SignalBot) => void;
  onDelete: (botId: string) => void;
  onTriggerSimulate: (bot: SignalBot) => void;
  onTriggerPineScript: (bot: SignalBot) => void;
}

export function WebhookBotCard({
  bot,
  coinPrices = {},
  activeDealsCount,
  stats,
  onToggleStatus,
  onEdit,
  onDelete,
  onTriggerSimulate,
  onTriggerPineScript
}: WebhookBotCardProps) {
  const [activePreviewAction, setActivePreviewAction] = useState<'buy' | 'sell'>('buy');
  const [selectedPair, setSelectedPair] = useState<string>(
    bot.pairs && bot.pairs.length > 0 ? bot.pairs[0] : 'ETH/USDT'
  );
  
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [useVpsPort80, setUseVpsPort80] = useState(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('useVpsPort80') === 'true') : false;
  });
  const [vpsWebhookHost, setVpsWebhookHost] = useState(() => {
    return typeof window !== 'undefined' ? (localStorage.getItem('vpsWebhookHost') || '') : '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('useVpsPort80', String(useVpsPort80));
      localStorage.setItem('vpsWebhookHost', vpsWebhookHost);

      const origin = window.location.origin;
      if (useVpsPort80 && vpsWebhookHost) {
        const cleanHost = vpsWebhookHost.replace(/^(https?:\/\/)?/, '').replace(/\/$/, '');
        setWebhookUrl(`http://${cleanHost}/api/webhooks`);
      } else {
        setWebhookUrl(`${origin}/api/webhooks`);
      }
    } else {
      setWebhookUrl('https://crypto-trading-bot-terminal.asia-southeast1.run.app/api/webhooks');
    }
  }, [useVpsPort80, vpsWebhookHost]);

  // Update selected pair if bot pairs swap
  useEffect(() => {
    if (bot.pairs && bot.pairs.length > 0) {
      if (!bot.pairs.includes(selectedPair)) {
        setSelectedPair(bot.pairs[0]);
      }
    }
  }, [bot.pairs]);

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.error('Failed to copy webhook URL', err);
    }
  };

  const payloadCode = JSON.stringify(
    {
      secret: bot.webhookToken || `wh_${bot.id.substring(0, 8)}`,
      action: activePreviewAction,
      pair: selectedPair,
      botId: bot.id
    },
    null,
    2
  );

  const handleCopyJson = async () => {
    try {
      await navigator.clipboard.writeText(payloadCode);
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch (err) {
      console.error('Failed to copy webhook json payload', err);
    }
  };

  const trailingOffset = bot.trailingTakeProfit 
    ? `${(bot.trailingTpDeviation !== undefined ? bot.trailingTpDeviation : 0.2).toFixed(2)}%` 
    : 'OFF';

  return (
    <div
      id={`webhook_bot_card_${bot.id}`}
      className="bg-[#121824] rounded-2xl border border-[#20293A] overflow-hidden flex flex-col justify-between hover:border-[#2E3C54] transition shadow-xl font-sans"
    >
      {/* Bot Card Main Frame Body */}
      <div className="p-6 space-y-5">
        
        {/* Row 1: Head automation tags */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 bg-[#132A24] border border-emerald-500/25 px-3 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest font-mono">
              SIGNAL AUTOMATION UNIT
            </span>
          </div>

          <div className="flex items-center gap-1">
            <span className={`w-2 h-2 rounded-full ${bot.status === 'active' ? 'bg-emerald-400' : 'bg-gray-500'}`} />
            <span className={`text-xs font-bold font-mono tracking-tight uppercase ${bot.status === 'active' ? 'text-emerald-400' : 'text-gray-500'}`}>
              • {bot.status === 'active' ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
        </div>

        {/* Row 2: Lowercase clean bot name title */}
        <div>
          <h3 className="text-xl font-bold text-white tracking-tight leading-tight uppercase">
            {bot.name.toLowerCase()}
          </h3>
          <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px] font-mono text-gray-400">
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-gray-300 font-semibold">{bot.exchange}</span>
            <span className="bg-slate-800/80 px-2 py-0.5 rounded text-gray-300 uppercase font-semibold">{bot.strategyType}</span>
            {bot.strategyType === 'futures' && (
              <span className="bg-[#FF5A00]/10 text-[#FF5A00] px-2 py-0.5 rounded font-bold">{bot.leverage}x leverage</span>
            )}
            <span className="bg-blue-950/45 text-blue-300 px-2 py-0.5 rounded font-bold uppercase">
              {bot.botDirection === 'long' ? 'Buy Only' : bot.botDirection === 'short' ? 'Short Only' : 'Dynamic Buy/Sell'}
            </span>
          </div>
        </div>

        {/* Row 3: Parameters details matching picture */}
        <div className="bg-[#0B0F17]/40 p-4 rounded-xl border border-dashed border-slate-800/80">
          <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs font-sans">
            
            {/* Pair Switcher / Display */}
            <div>
              <span className="text-gray-400 font-medium text-[11px] block uppercase tracking-wider">Pair Symbol:</span>
              {bot.pairs.length <= 1 ? (
                <span className="font-mono font-bold text-white text-sm block mt-1.5">{selectedPair}</span>
              ) : (
                <select
                  value={selectedPair}
                  onChange={(e) => setSelectedPair(e.target.value)}
                  className="bg-[#0B0F17] border border-slate-800 rounded-lg px-2 py-1 text-xs text-white font-mono mt-1 focus:outline-none focus:border-[#FF5A00]"
                >
                  {bot.pairs.map(p => (
                    <option key={'preview-pair-' + p} value={p}>{p}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Base Order value */}
            <div>
              <span className="text-gray-400 font-medium text-[11px] block uppercase tracking-wider">Base Order:</span>
              <span className="font-mono font-bold text-white text-sm block mt-1.5">
                {bot.orderSizeType === 'usd' ? `$${bot.orderSize} USDT` : `${bot.orderSize}% Cash Balance`}
              </span>
            </div>

            {/* Take profit value */}
            <div>
              <span className="text-gray-400 font-medium text-[11px] block uppercase tracking-wider">Take Profit:</span>
              <span className={`font-mono font-bold text-sm block mt-1 ${bot.takeProfitValue > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>
                {bot.takeProfitValue > 0 ? `+${bot.takeProfitValue.toFixed(2)}%` : 'OFF'}
              </span>
            </div>

            {/* Trailing Offset */}
            <div>
              <span className="text-gray-400 font-medium text-[11px] block uppercase tracking-wider font-sans">Trailing Offset:</span>
              <span className={`font-mono font-bold text-sm block mt-1 ${bot.trailingTakeProfit ? 'text-amber-400 font-extrabold' : 'text-gray-500 font-medium'}`}>
                {trailingOffset}
              </span>
            </div>

            {/* Bottom stretched Stop Loss Alert banner */}
            <div className="col-span-2 border-t border-slate-800/50 pt-3">
              <div className="text-[12px] text-rose-500 font-bold flex items-center gap-1.5">
                <span className="text-sm">🔴</span>
                <span>Target Stop-Loss Limit: -{bot.stopLossValue > 0 ? bot.stopLossValue.toFixed(1) : '0.4'}%</span>
              </div>
            </div>

          </div>
        </div>

        {/* Row 4: Webhook Alert Payload Linker Container section */}
        <div className="bg-[#0B0F17] p-4 rounded-xl border border-[#20293A] space-y-3.5">
          
          <div className="flex justify-between items-center text-[10px] font-bold font-mono tracking-wider text-gray-400">
            <span className="flex items-center gap-1.5 uppercase font-black text-xs text-slate-300">
              ⚡ Webhook Alert Payload Linker
            </span>
            <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 uppercase text-[9px] font-black">
              POST
            </span>
          </div>

          {/* Webhook Url copy row */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[9.5px] text-gray-400 uppercase tracking-wider font-bold">destination alerts webhook url</span>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="text-[10px] text-[#FF5A00] font-bold hover:underline transition flex items-center gap-1 cursor-pointer"
              >
                {copiedUrl ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied URL!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Single Copy</span>
                  </>
                )}
              </button>
            </div>
            
            <input
              type="text"
              readOnly
              value={webhookUrl}
              className="w-full bg-[#070A10] border border-slate-800 rounded-lg px-3 py-2 text-[11px] font-mono text-gray-350 cursor-text select-all focus:outline-none focus:ring-1 focus:ring-[#FF5A00]"
            />

            {/* VPS Port 80 custom host expansion widget */}
            <div className="bg-[#0A0E17] border border-slate-850 p-2.5 rounded-lg space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-1.5 text-[10px] text-gray-300 font-bold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={useVpsPort80}
                    onChange={(e) => setUseVpsPort80(e.target.checked)}
                    className="rounded border-slate-800 text-[#FF5A00] focus:ring-[#FF5A00] w-3 h-3 cursor-pointer"
                  />
                  <span>🌐 Deploy VPS (Port 80 / HTTP)</span>
                </label>
                <span className="text-[8px] font-mono text-gray-500 font-bold uppercase tracking-widest">
                  {useVpsPort80 ? "PORTS 80 MAP" : "PREVIEW DEV"}
                </span>
              </div>
              
              {useVpsPort80 && (
                <div className="flex items-center gap-1.5 animate-fadeIn">
                  <input
                    type="text"
                    placeholder="e.g. 159.223.15.82 or domain.com"
                    value={vpsWebhookHost}
                    onChange={(e) => setVpsWebhookHost(e.target.value)}
                    className="flex-1 bg-[#101524] border border-slate-850 focus:border-[#FF5A00] rounded px-2.5 py-1 text-[10.5px] font-mono text-white focus:outline-none placeholder-gray-600"
                  />
                  <span className="text-[9.5px] font-mono text-gray-500 bg-[#060A10] px-1.5 py-1 rounded border border-slate-900">
                    :80
                  </span>
                </div>
              )}
              {useVpsPort80 && !vpsWebhookHost && (
                <span className="text-[9px] text-amber-500 font-mono block">
                  ⚠️ Enter your VPS IP/Domain to update the webhook alert URL.
                </span>
              )}
              {useVpsPort80 && vpsWebhookHost && (
                <span className="text-[9px] text-emerald-400 font-mono block leading-tight">
                  ✔️ Ready! Standard Port 80 mapped. Copy link directly into TradingView.
                </span>
              )}
            </div>
          </div>

          {/* Secure signal preview JSON alert code viewer row */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9.5px] text-gray-400 uppercase tracking-wider font-bold">secure webhook signal preview</span>
              <button
                type="button"
                onClick={handleCopyJson}
                className="text-[10px] text-[#FF5A00] font-bold hover:underline transition flex items-center gap-1 cursor-pointer"
              >
                {copiedJson ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400">Copied JSON!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy JSON Alert</span>
                  </>
                )}
              </button>
            </div>

            {/* Directives option side-by-side tabs */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-[#090D14] rounded-lg border border-slate-850">
              <button
                type="button"
                onClick={() => setActivePreviewAction('buy')}
                className={`py-1.5 text-[10px] font-bold rounded-md font-mono uppercase transition flex items-center justify-center gap-1 cursor-pointer ${
                  activePreviewAction === 'buy'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-md'
                    : 'text-gray-500 hover:text-white border border-transparent'
                }`}
              >
                📥 Buy Long
              </button>

              <button
                type="button"
                onClick={() => setActivePreviewAction('sell')}
                className={`py-1.5 text-[10px] font-bold rounded-md font-mono uppercase transition flex items-center justify-center gap-1 cursor-pointer ${
                  activePreviewAction === 'sell'
                    ? 'bg-rose-500/10 border border-rose-500/30 text-rose-450 text-rose-400 shadow-md'
                    : 'text-gray-500 hover:text-white border border-transparent'
                }`}
              >
                📤 Sell Short
              </button>
            </div>

            {/* Code Block visual matching layout exactly */}
            <pre className="bg-[#05080E] border border-slate-850 rounded-xl p-4 text-[11px] font-mono text-gray-300 leading-relaxed overflow-x-auto max-h-[170px]">
              {payloadCode}
            </pre>
          </div>

        </div>

      </div>

      {/* Bottom control actions strip styled nicely */}
      <div className="bg-[#141B26] border-t border-[#1E293B] px-5 py-3.5 flex gap-2.5 items-center justify-between">
        
        {/* Toggle active / pause tracking trigger */}
        <button
          onClick={() => onToggleStatus(bot.id, bot.status)}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2 hover:bg-slate-800 border border-[#20293A] text-slate-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors`}
        >
          {bot.status === 'active' ? (
            <>
              <Pause className="w-3.5 h-3.5 text-gray-400" />
              <span>Pause Tracking</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 text-emerald-400" />
              <span>Start Tracking</span>
            </>
          )}
        </button>

        {/* Edit parameters trigger */}
        <button
          onClick={() => onEdit(bot)}
          className="flex-1 flex items-center justify-center space-x-1.5 py-2 hover:bg-slate-800 border border-[#20293A] text-slate-300 hover:text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
        >
          <Edit2 className="w-3.5 h-3.5 text-[#FF5A00]" />
          <span>Edit Configs</span>
        </button>

        {/* Delete Bot Trigger */}
        <button
          onClick={() => onDelete(bot.id)}
          className="p-2 hover:bg-rose-500/15 border border-rose-950 text-rose-450 text-rose-400 rounded-xl cursor-pointer transition-colors"
          title="Delete Bot"
        >
          <Trash2 className="w-4 h-4" />
        </button>

      </div>

      {/* Auxiliary expert components logs or simulator options */}
      <div className="px-5 py-2 bg-[#0C121D] border-t border-[#121926] flex items-center justify-between text-[10px] text-gray-500 font-mono">
        <button
          type="button"
          onClick={() => onTriggerPineScript(bot)}
          className="hover:text-amber-400 hover:underline transition cursor-pointer font-bold flex items-center gap-1.5"
        >
          <Code className="w-3 h-3" />
          <span>Pine Script</span>
        </button>

        <span className="text-[9px] text-[#2C3B53]">●</span>

        <button
          type="button"
          onClick={() => onTriggerSimulate(bot)}
          className="hover:text-[#FF5A00] hover:underline transition cursor-pointer font-bold flex items-center gap-1.5"
        >
          <Terminal className="w-3 h-3" />
          <span>Simulate Telemetry</span>
        </button>

        <span className="text-[9px] text-[#2C3B53]">●</span>

        <span className="font-semibold text-gray-450 uppercase">
          Positions: <strong className="text-white font-mono">{activeDealsCount}</strong>
        </span>
      </div>

    </div>
  );
}
