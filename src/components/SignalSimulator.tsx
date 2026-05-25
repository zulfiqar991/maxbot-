import React, { useState, useEffect } from 'react';
import { Terminal, Send, Copy, Check, Info, AlertCircle, RefreshCw, Layers } from 'lucide-react';
import { SignalBot, SignalLog } from '../types';

interface SignalSimulatorProps {
  bots: SignalBot[];
  logs: SignalLog[];
  selectedBotId?: string;
  onSendWebhook: (payload: any) => Promise<any>;
}

export function SignalSimulator({ bots, logs, selectedBotId, onSendWebhook }: SignalSimulatorProps) {
  const [activeBot, setActiveBot] = useState<SignalBot | null>(null);
  const [selectedPair, setSelectedPair] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('enter_long');
  const [volumeOverride, setVolumeOverride] = useState<string>('');
  const [payloadCode, setPayloadCode] = useState<string>('');
  const [responseOutput, setResponseOutput] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [logFilter, setLogFilter] = useState<'all' | 'success' | 'error' | 'ignored'>('all');

  // Generate dynamic host URL
  const webhookUrl = `${window.location.origin}/api/webhooks`;

  // Sync active bot with list or preset parameter bot
  useEffect(() => {
    if (bots.length > 0) {
      const match = bots.find(b => b.id === selectedBotId) || bots[0];
      setActiveBot(match);
      if (match.pairs.length > 0) {
        setSelectedPair(match.pairs[0]);
      }
    } else {
      setActiveBot(null);
    }
  }, [bots, selectedBotId]);

  // Redraw JSON payload trigger on state change
  useEffect(() => {
    if (!activeBot) {
      setPayloadCode('// Create a Signal Bot first to generate alert payloads');
      return;
    }

    const payloadObj = {
      message_type: 'bot_signal',
      bot_id: activeBot.id,
      email_token: activeBot.webhookToken,
      pair: selectedPair || activeBot.pairs[0] || 'BTC/USDT',
      action: selectedAction,
      volume: volumeOverride ? parseFloat(volumeOverride) : undefined
    };

    setPayloadCode(JSON.stringify(payloadObj, null, 2));
  }, [activeBot, selectedPair, selectedAction, volumeOverride]);

  const handleCopyUrl = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(webhookUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCopyPayload = () => {
    if (!navigator.clipboard) return;
    navigator.clipboard.writeText(payloadCode);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const handleTriggerWebhook = async () => {
    if (!activeBot) return;
    setIsSimulating(true);
    setResponseOutput(null);

    try {
      const parsedBody = JSON.parse(payloadCode);
      const res = await onSendWebhook(parsedBody);
      setResponseOutput(res);
    } catch (err: any) {
      setResponseOutput({ error: 'Sandbox Webhook Simulation failed', details: err.message });
    } finally {
      setIsSimulating(false);
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.status === logFilter;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-white">
      
      {/* Left controls column */}
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-[#121824] border border-[#20293A] rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-[#1E293B]/40 px-5 py-4 border-b border-[#20293A] flex items-center justify-between">
            <h3 className="text-sm font-bold flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#FF5A00]" />
              <span>Simulate Webhook POST</span>
            </h3>
            <span className="text-[10px] bg-[#FF5A00]/10 text-[#FF5A00] font-sans px-2 py-0.5 font-bold uppercase rounded border border-[#FF5A00]/20">
              Dev Laboratory
            </span>
          </div>

          <div className="p-5 space-y-4">
            
            {/* Quick explanatory warning */}
            <div className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-3.5 rounded-xl text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>REAL WEBHOOK CAPABILITIES</span>
              </div>
              <p className="leading-normal">
                This app hosts a live backend API at port 3000. You can copy the Webhook URL below and target it with physical TradingView alerts, Python scripts, or custom HTTP clients!
              </p>
            </div>

            {/* Target Webhook Endpoint URL */}
            <div className="space-y-1.5">
              <label className="block text-[11px] text-gray-400 font-bold uppercase font-mono">WEBHOOK TARGET URL</label>
              <div className="flex bg-[#0B0F17] rounded-xl border border-[#2D3748] p-1 items-center justify-between">
                <span className="font-mono text-[11px] text-[#FF5A00] pl-3 truncate select-all">{webhookUrl}</span>
                <button
                  type="button"
                  id="sim_copy_url_btn"
                  onClick={handleCopyUrl}
                  className="p-1 px-2.5 text-xs bg-[#1E293B] font-semibold hover:bg-slate-700 text-gray-300 rounded-lg cursor-pointer transition flex items-center space-x-1"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {bots.length === 0 ? (
              <p className="text-xs text-center text-gray-500 py-6">
                No active bots found. Configure a bot first to unlock the simulator playroom.
              </p>
            ) : (
              <div className="space-y-4 text-xs">
                
                {/* Select target bot */}
                <div>
                  <label className="block text-gray-400 font-medium mb-1.5 uppercase">SELECT TRIGGER BOT</label>
                  <select
                    id="sim_bot_select"
                    value={activeBot?.id || ''}
                    onChange={(e) => {
                      const match = bots.find(b => b.id === e.target.value) || null;
                      if (match) {
                        setActiveBot(match);
                        setSelectedPair(match.pairs[0] || '');
                      }
                    }}
                    className="w-full bg-[#0B0F17] border border-[#2D3748] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#FF5A00]"
                  >
                    {bots.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.exchange})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Grid controls */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Select pair */}
                  <div>
                    <label className="block text-gray-400 font-medium mb-1.5 uppercase">PAIR TRIGGER</label>
                    <select
                      id="sim_pair_select"
                      value={selectedPair}
                      onChange={(e) => setSelectedPair(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-[#2D3748] rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      {activeBot?.pairs.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Select action */}
                  <div>
                    <label className="block text-gray-400 font-medium mb-1.5 uppercase">SIGNAL ACTION</label>
                    <select
                      id="sim_action_select"
                      value={selectedAction}
                      onChange={(e) => setSelectedAction(e.target.value)}
                      className="w-full bg-[#0B0F17] border border-[#2D3748] rounded-xl px-3 py-2 text-white focus:outline-none"
                    >
                      <option value="enter_long">ENTER LONG (BUY)</option>
                      <option value="exit_long">EXIT LONG (SELL)</option>
                      {activeBot?.strategyType === 'futures' && (
                        <>
                          <option value="enter_short">ENTER SHORT (SELL)</option>
                          <option value="exit_short">EXIT SHORT (BUY)</option>
                        </>
                      )}
                      <option value="close_position">CLOSE POSITION (FLAT)</option>
                    </select>
                  </div>
                </div>

                {/* Sizing override */}
                <div>
                  <label className="block text-gray-400 font-medium mb-1.5 uppercase">SIGNAL VOLUME OVERRIDE (Optional)</label>
                  <input
                    type="number"
                    value={volumeOverride}
                    onChange={(e) => setVolumeOverride(e.target.value)}
                    placeholder={`Defaults to bot's size: ${
                      activeBot?.orderSizeType === 'usd' ? `$${activeBot.orderSize}` : `${activeBot?.orderSize}%`
                    }`}
                    className="w-full bg-[#0B0F17] border border-[#2D3748] rounded-xl px-3 py-2 text-white placeholder-gray-500 focus:outline-none"
                  />
                </div>

                {/* Submit simulation execute */}
                <button
                  type="button"
                  id="sim_trigger_webhook_btn"
                  onClick={handleTriggerWebhook}
                  disabled={isSimulating}
                  className="w-full py-3 bg-[#FF5A00] hover:bg-[#FF5A00]/90 disabled:bg-gray-800 disabled:opacity-50 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-2 transition cursor-pointer mt-4 active:scale-95 shadow-lg shadow-[#FF5A00]/10"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSimulating ? 'Sending alert...' : 'Trigger Webhook POST'}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right JSON payload payload JSON + API Response panel */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Editor & Response Screen */}
        <div className="bg-[#121824] border border-[#20293A] rounded-2xl overflow-hidden flex flex-col justify-between shadow-xl">
          <div className="bg-[#1E293B]/40 px-5 py-3 border-b border-[#20293A] flex justify-between items-center">
            <span className="text-xs font-semibold text-gray-300 font-mono">EDITABLE WEBHOOK PAYLOAD (JSON)</span>
            <button
              onClick={handleCopyPayload}
              className="p-1 px-2.5 text-[11px] bg-slate-800 text-slate-300 font-semibold hover:bg-slate-700 rounded transition flex items-center gap-1.5"
            >
              {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedPayload ? 'Copied' : 'Copy'}</span>
            </button>
          </div>

          <div className="p-4 bg-[#090D15]">
            <textarea
              id="sim_payload_editor"
              className="w-full h-42 bg-transparent text-emerald-400 font-mono text-xs focus:outline-none resize-none leading-relaxed"
              value={payloadCode}
              onChange={(e) => setPayloadCode(e.target.value)}
            />
          </div>

          {/* Response payload viewer */}
          {responseOutput && (
            <div className="border-t border-[#20293A]">
              <div className="bg-slate-900/40 px-5 py-2.5 border-b border-[#20293A] text-[10px] font-bold uppercase tracking-wider text-gray-400">
                HTTP Webhook Request Response
              </div>
              <div className="p-4 bg-[#090D15] max-h-48 overflow-y-auto leading-relaxed">
                <pre className="text-xs font-mono text-white">
                  {JSON.stringify(responseOutput, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Live System Signal logs terminal */}
        <div className="bg-[#090E16] border border-[#1E293B] rounded-2xl overflow-hidden shadow-2xl flex flex-col h-80">
          <div className="p-4 border-b border-[#1E293B] bg-[#111827] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <h4 className="text-xs font-bold text-white font-mono tracking-wider">LIVE TELEMETRY SIGNAL LOGS</h4>
            </div>

            {/* Filter buttons */}
            <div className="flex space-x-1.5 bg-[#172033] rounded-lg p-0.5 border border-[#24334C]">
              {(['all', 'success', 'ignored', 'error'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setLogFilter(f)}
                  className={`px-2 py-0.5 text-[9px] uppercase font-bold rounded-md font-sans transition-all cursor-pointer ${
                    logFilter === f ? 'bg-[#FF5A00] text-white' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Terminal stream */}
          <div className="p-4 flex-grow overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 bg-[#06080F]">
            {filteredLogs.length === 0 ? (
              <div className="text-gray-600 italic text-center py-12">
                No telemetry data available for the selected filters.
              </div>
            ) : (
              filteredLogs.map((log) => {
                let statusColor = 'text-emerald-400';
                if (log.status === 'error') statusColor = 'text-rose-500';
                if (log.status === 'ignored') statusColor = 'text-orange-400';

                return (
                  <div key={log.id} className="border-b border-[#1E293B]/20 pb-2 flex gap-2">
                    <span className="text-gray-500 flex-shrink-0">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                    <div>
                      <span className={`${statusColor} font-bold mr-1.5`}>[{log.status.toUpperCase()}]</span>
                      <span className="text-slate-300">{log.message}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
