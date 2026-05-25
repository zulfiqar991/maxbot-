import React, { useState } from 'react';
import { 
  Terminal, 
  Search, 
  Bot, 
  Copy, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  Calendar, 
  Filter, 
  Clock, 
  ChevronRight, 
  ChevronDown, 
  Database,
  RefreshCw,
  Sliders,
  Sparkles,
  Layers
} from 'lucide-react';
import { SignalBot, SignalLog } from '../types';

interface WebhookLogsProps {
  bots: SignalBot[];
  logs: SignalLog[];
  onTriggerSimulate?: (bot: SignalBot) => void;
}

export function WebhookLogs({ bots, logs, onTriggerSimulate }: WebhookLogsProps) {
  const [selectedBotId, setSelectedBotId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Group stats for each bot option
  const getLogsCountForBot = (botId: string) => {
    if (botId === 'all') return logs.length;
    if (botId === 'unknown') return logs.filter(l => l.botId === 'unknown' || !bots.some(b => b.id === l.botId)).length;
    return logs.filter(l => l.botId === botId).length;
  };

  // Get filtered logs according to selected bot and search criteria
  const getFilteredLogs = () => {
    let result = [...logs];

    // Filter by bot grouping
    if (selectedBotId !== 'all') {
      if (selectedBotId === 'unknown') {
        const activeBotIds = bots.map(b => b.id);
        result = result.filter(l => l.botId === 'unknown' || !activeBotIds.includes(l.botId));
      } else {
        result = result.filter(l => l.botId === selectedBotId);
      }
    }

    // Filter by search query (across message, action, pair, payload raw string)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        l => 
          l.message.toLowerCase().includes(q) ||
          l.pair.toLowerCase().includes(q) ||
          l.action.toLowerCase().includes(q) ||
          l.payload.toLowerCase().includes(q)
      );
    }

    // Limit to the last 50 raw incoming JSON payloads as requested
    return result.slice(0, 50);
  };

  const currentFilteredLogs = getFilteredLogs();

  const handleCopyPayload = (logId: string, payloadText: string) => {
    if (!navigator.clipboard) return;
    try {
      // Try to parse and format nicely before copying if possible
      const parsed = JSON.parse(payloadText);
      navigator.clipboard.writeText(JSON.stringify(parsed, null, 2));
    } catch {
      navigator.clipboard.writeText(payloadText);
    }
    setCopiedLogId(logId);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  // Pretty prints JSON string or returns raw string
  const formatJson = (str: string) => {
    try {
      const parsed = JSON.parse(str);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return str;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Informative Header Banner */}
      <div className="bg-gradient-to-r from-[#121824] to-[#1E293B] border border-[#20293A] rounded-2xl p-6 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Terminal className="w-5 h-5 text-[#FF5A00]" />
            <span>Webhook Raw JSON Payload Debugger</span>
          </h2>
          <p className="text-xs text-gray-300 max-w-2xl leading-relaxed">
            Inspect raw HTTP requests routed to your endpoint <code className="text-[#FF5A00] font-mono bg-[#0B0F17] px-1.5 py-0.5 rounded text-[11px] font-bold border border-[#FF5A00]/20">/api/webhooks</code>. Review compiled message states, inspect nested fields, monitor schema errors, and troubleshoot Pine Script alerts with millisecond telemetry tracking.
          </p>
        </div>
        
        {/* Connection health bubble */}
        <div className="flex items-center gap-2 bg-[#0B0F17] px-3 py-1.5 rounded-xl border border-slate-800 text-[10px] font-mono">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-gray-400">ENDPOINT LIVE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Bot Selection sidebar list (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-[#20293A] pb-2.5">
              <span className="text-[10px] text-gray-400 font-mono uppercase font-black tracking-wider flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-gray-400" />
                <span>Group History By Bot</span>
              </span>
              <span className="bg-[#0B0F17] text-[10px] px-2 py-0.5 rounded font-mono text-gray-400 border border-slate-800">
                {bots.length} Active
              </span>
            </div>

            <p className="text-[11px] text-gray-400 leading-relaxed font-sans mt-1">
              Filter incoming messages by bot thread to see isolated JSON histories and troubleshoot individual integrations.
            </p>

            <div className="space-y-1.5 pt-2">
              {/* All Bots Category Button */}
              <button
                type="button"
                onClick={() => setSelectedBotId('all')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all duration-250 flex items-center justify-between font-sans ${
                  selectedBotId === 'all'
                    ? 'bg-[#FF5A00]/10 border-[#FF5A00] text-white shadow-sm'
                    : 'bg-[#0B0F17]/40 border-slate-900 text-gray-400 hover:bg-[#131A2A] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <Layers className={`w-4 h-4 ${selectedBotId === 'all' ? 'text-[#FF5A00]' : 'text-gray-500'}`} />
                  <div>
                    <span className="text-xs font-semibold block leading-none">All Incoming Payloads</span>
                    <span className="text-[9px] text-gray-500 font-mono mt-0.5 block">Aggregated terminal streams</span>
                  </div>
                </div>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                  selectedBotId === 'all' ? 'bg-[#FF5A00]/20 text-[#FF5A00]' : 'bg-[#151D2A] text-gray-500'
                }`}>
                  {getLogsCountForBot('all')}
                </span>
              </button>

              {/* Individual Bots */}
              {bots.map((bot) => {
                const isSelected = selectedBotId === bot.id;
                const logCount = getLogsCountForBot(bot.id);
                return (
                  <button
                    key={bot.id}
                    type="button"
                    onClick={() => setSelectedBotId(bot.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all duration-250 flex items-center justify-between font-sans ${
                      isSelected
                        ? 'bg-[#FF5A00]/10 border-[#FF5A00] text-white shadow-sm'
                        : 'bg-[#0B0F17]/40 border-slate-900 text-gray-400 hover:bg-[#131A2A] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate pr-2">
                      <Bot className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-[#FF5A00]' : 'text-gray-500'}`} />
                      <div className="truncate">
                        <span className="text-xs font-semibold block leading-none truncate">{bot.name}</span>
                        <span className="text-[9px] text-gray-500 font-mono mt-0.5 block truncate uppercase tracking-widest">{bot.exchange} · {bot.id}</span>
                      </div>
                    </div>
                    <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold flex-shrink-0 ${
                      isSelected ? 'bg-[#FF5A00]/20 text-[#FF5A00]' : 'bg-[#151D2A] text-gray-500'
                    }`}>
                      {logCount}
                    </span>
                  </button>
                );
              })}

              {/* Separation / Other Category for Errors, unregistered Bot IDs */}
              <button
                type="button"
                onClick={() => setSelectedBotId('unknown')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border transition-all duration-250 flex items-center justify-between font-sans ${
                  selectedBotId === 'unknown'
                    ? 'bg-rose-500/10 border-rose-500 text-white shadow-sm'
                    : 'bg-[#0B0F17]/40 border-slate-900 text-gray-400 hover:bg-[#131A2A] hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-2.5">
                  <AlertCircle className={`w-4 h-4 ${selectedBotId === 'unknown' ? 'text-rose-500' : 'text-gray-500'}`} />
                  <div>
                    <span className="text-xs font-semibold block leading-none">Rejected / Orphan Signals</span>
                    <span className="text-[9px] text-gray-500 font-mono mt-0.5 block">Invalid webhook credentials</span>
                  </div>
                </div>
                <span className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                  selectedBotId === 'unknown' ? 'bg-rose-500/20 text-rose-400' : 'bg-[#151D2A] text-gray-500'
                }`}>
                  {getLogsCountForBot('unknown')}
                </span>
              </button>
            </div>
            
            {/* Quick Test Webhook Integration Assist */}
            {selectedBotId !== 'all' && selectedBotId !== 'unknown' && onTriggerSimulate && (
              <div className="pt-3 border-t border-[#20293A] mt-3 bg-[#0B0F17]/30 p-2.5 rounded-xl">
                <span className="text-[10px] text-gray-400 font-mono uppercase block mb-1.5 font-bold">Troubleshoot Assistance:</span>
                <p className="text-[11px] text-gray-400 leading-normal font-sans mb-3">
                  Want to force a live webhook payload trigger to check this bot's logs format instantly?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const currentBot = bots.find(b => b.id === selectedBotId);
                    if (currentBot) onTriggerSimulate(currentBot);
                  }}
                  className="w-full py-1.5 bg-[#FF5A00]/10 hover:bg-[#FF5A00]/20 text-[#FF5A00] hover:text-white border border-[#FF5A00]/30 transition rounded-lg text-[10px] font-bold font-mono uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Send Test Signal</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Webhook Log Stream (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Stream Toolbar with Filter / Search query inputs */}
          <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 justify-between">
            <div className="relative w-full sm:max-w-md">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
                <Search className="w-4 h-4 text-gray-500" />
              </span>
              <input
                type="text"
                placeholder="Search raw payloads, pairs, error logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0B0F17] border border-[#232F45] focus:border-[#FF5A00] focus:ring-1 focus:ring-[#FF5A00] rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 font-mono focus:outline-none transition-all duration-200"
              />
            </div>
            
            <div className="flex items-center gap-3 text-xs w-full sm:w-auto justify-end">
              <span className="text-gray-500 font-mono text-[10px] uppercase">
                Showing {currentFilteredLogs.length} of {logs.length} logged pulses
              </span>
            </div>
          </div>

          {/* Webhook Stream list */}
          <div className="space-y-3.5">
            {currentFilteredLogs.length === 0 ? (
              <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-12 text-center text-gray-400 space-y-3">
                <Terminal className="w-10 h-10 text-slate-700 mx-auto" />
                <h4 className="text-sm font-bold text-white uppercase font-mono tracking-wide">No Webhook Logs Recorded</h4>
                <p className="text-xs text-gray-400 max-w-md mx-auto leading-relaxed">
                  No incoming webhook HTTP requests have been registered for your selection. Go to the <strong className="text-[#FF5A00]">Webhook Alert Simulator</strong> tab to send mock indicator signals, or target our backend live.
                </p>
              </div>
            ) : (
              currentFilteredLogs.map((log) => {
                const isExpanded = expandedLogId === log.id;
                
                // Determine Badge styling based on response logs
                let statusBadgeBg = 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
                let iconEl = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
                if (log.status === 'error') {
                  statusBadgeBg = 'bg-rose-500/10 text-rose-400 border border-rose-500/25';
                  iconEl = <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
                } else if (log.status === 'ignored') {
                  statusBadgeBg = 'bg-amber-500/10 text-amber-400 border border-amber-500/25';
                  iconEl = <HelpCircle className="w-3.5 h-3.5 text-amber-400" />;
                }

                const prettyPayload = formatJson(log.payload);

                return (
                  <div 
                    key={log.id} 
                    className={`bg-[#121824] border rounded-2xl overflow-hidden transition-all duration-300 ${
                      isExpanded ? 'border-[#FF5A00] shadow-[#FF5A00]/5 shadow-md bg-[#131B2A]' : 'border-[#20293A] hover:border-slate-700'
                    }`}
                  >
                    {/* Log Header Row */}
                    <div 
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900/10 transition select-none"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Status Icon */}
                        <div className="flex-shrink-0">
                          {iconEl}
                        </div>

                        {/* Bot, Pair, action metadata summary */}
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-black text-white hover:text-[#FF5A00] transition pr-1">
                              {log.botName}
                            </span>
                            <span className="bg-slate-800 text-gray-300 font-mono text-[9px] px-1.5 py-0.5 rounded border border-slate-700 uppercase leading-none font-bold">
                              {log.pair}
                            </span>
                            <span className="bg-[#0B0F17] text-gray-400 font-mono text-[9px] px-1.5 py-0.5 rounded border border-slate-900 uppercase leading-none">
                              {log.action}
                            </span>
                          </div>
                          
                          {/* Brief textual status message */}
                          <p className="text-[11px] text-gray-400 truncate mt-1 leading-normal font-sans">
                            {log.message}
                          </p>
                        </div>
                      </div>

                      {/* Right metadata / Trigger items */}
                      <div className="flex items-center gap-3.5 flex-shrink-0">
                        <span className="text-[10px] text-gray-500 font-mono hidden sm:flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-gray-600" />
                          {new Date(log.timestamp).toLocaleTimeString() || log.timestamp}
                        </span>

                        <span className={`text-[9.5px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded ${statusBadgeBg}`}>
                          {log.status}
                        </span>

                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Panel: Contains the Raw Json Payload inspection box */}
                    {isExpanded && (
                      <div className="border-t border-[#20293A] bg-[#0A0E17]">
                        
                        {/* Detailed information summary panel bar */}
                        <div className="bg-[#121824]/50 border-b border-[#20293A] px-4 py-2.5 flex flex-wrap justify-between items-center text-[11px] font-mono text-gray-400 gap-2">
                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-gray-600" />
                              Date: {new Date(log.timestamp).toLocaleDateString()} at {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className="text-slate-700">|</span>
                            <span>Log ID: {log.id}</span>
                          </div>

                          {/* Copy button */}
                          <button
                            type="button"
                            onClick={() => handleCopyPayload(log.id, log.payload)}
                            className="text-[10px] font-bold bg-[#1B2535] text-gray-300 border border-[#273549] hover:bg-slate-700 rounded-lg px-2.5 py-1 transition flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedLogId === log.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-400" />
                                <span className="text-emerald-400 font-mono">Format Copied!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Copy Clean JSON</span>
                              </>
                            )}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#20293A]">
                          {/* Raw JSON Payload syntax highlited viewer */}
                          <div className="p-4 space-y-2">
                            <span className="text-[10px] text-gray-400 font-black font-mono uppercase tracking-wide flex items-center gap-1">
                              <span>Raw Incoming Payload HTTP Body:</span>
                            </span>
                            <div className="bg-[#05070a] border border-[#1b2333] p-3 rounded-xl overflow-x-auto select-text font-mono text-[10.5px] text-[#A6E22E] max-h-72">
                              <pre className="whitespace-pre">{prettyPayload}</pre>
                            </div>
                          </div>

                          {/* Debug explanations and system status */}
                          <div className="p-4 space-y-3 font-sans xs:text-xs">
                            <span className="text-[10px] text-gray-400 font-black font-mono uppercase tracking-wide block">
                              Diagnostic Inspection Report:
                            </span>

                            <div className="space-y-2 text-xs">
                              <div className="bg-[#131A26] border border-slate-900 rounded-xl p-3 leading-relaxed">
                                <span className="text-[10px] text-gray-400 font-bold uppercase block font-mono">Status details:</span>
                                <p className="text-gray-300 mt-1">{log.message}</p>
                              </div>

                              <div className="space-y-1 pt-1">
                                <span className="block text-[10px] text-gray-500 font-mono uppercase font-bold">Signal properties audit:</span>
                                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-gray-400">
                                  <div className="bg-[#0D121C]/50 rounded p-1.5 border border-slate-900">
                                    <span className="block text-[8px] text-gray-500 uppercase">BOT ID SIGNATURE</span>
                                    <span className="text-[#FF5A00] truncate block">{log.botId}</span>
                                  </div>
                                  <div className="bg-[#0D121C]/50 rounded p-1.5 border border-slate-900">
                                    <span className="block text-[8px] text-gray-500 uppercase">SIGNALED ACTION</span>
                                    <span className="text-white block uppercase">{log.action}</span>
                                  </div>
                                  <div className="bg-[#0D121C]/50 rounded p-1.5 border border-slate-900">
                                    <span className="block text-[8px] text-gray-500 uppercase">TICKER SPEC</span>
                                    <span className="text-white block">{log.pair}</span>
                                  </div>
                                  <div className="bg-[#0D121C]/50 rounded p-1.5 border border-slate-900">
                                    <span className="block text-[8px] text-gray-500 uppercase">VERIFY REASON PNL</span>
                                    <span className={log.status === 'success' ? 'text-emerald-400 block' : log.status === 'ignored' ? 'text-amber-500 block' : 'text-rose-450 text-rose-400 block'}>
                                      {log.status === 'success' ? 'Passed Checks' : log.status === 'ignored' ? 'Warning Filtered' : 'Transaction Error'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 text-[10.5px] text-gray-500 border-t border-slate-900 mt-2 flex items-center gap-1 leading-normal">
                                <AlertCircle className="w-3.5 h-3.5 text-gray-600 flex-shrink-0" />
                                <span>For secure communication, double check that indicators send the correct <code className="bg-[#161E2E] text-[#FF5A00] font-mono px-1 rounded">bot_id</code> to resolve user profiles.</span>
                              </div>
                            </div>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Quick guide on physical configuration */}
          <div className="bg-[#121824] border border-[#20293A] rounded-2xl p-5 space-y-3 font-sans">
            <h4 className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FF5A00]" />
              <span>How To Debug TradingView External Webhooks with This Console</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1.5 text-xs text-gray-400 leading-relaxed">
              <div className="bg-[#0B0F17]/40 border border-[#1b2333] rounded-xl p-3.5 space-y-1">
                <span className="font-mono text-[#FF5A00] font-bold block">1. Target Live API</span>
                <p>Send actual POST alerts from TradingView or cURL to your live endpoint URL listed in the simulator tab.</p>
              </div>
              <div className="bg-[#0B0F17]/40 border border-[#1b2333] rounded-xl p-3.5 space-y-1">
                <span className="font-mono text-[#FF5A00] font-bold block">2. Filter Bot Threads</span>
                <p>Use the left sidebar groupings to switch perspectives. Failed alerts will fall under "Orphan Signals".</p>
              </div>
              <div className="bg-[#0B0F17]/40 border border-[#1b2333] rounded-xl p-3.5 space-y-1">
                <span className="font-mono text-[#FF5A00] font-bold block">3. Expand Payloads</span>
                <p>Click any log item to inspect the raw JSON schema, check fields, and view system status validation diagnostics.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
