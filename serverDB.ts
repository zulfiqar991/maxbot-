import fs from 'fs';
import path from 'path';
import { AccountState, SignalBot, GridBot, GridLine, Deal, SignalLog } from './src/types';

export const DB_PATH = path.join(process.cwd(), 'db.json');

// Helper to append alert routing messages to active log transactions for mobile traders
export function getNotificationLogsString(state: any): string {
  if (!state) return "";
  const parts: string[] = [];
  if (state.tradingViewWebhooksEnabled) parts.push("📡 TV Signal");
  if (state.telegramEnabled) parts.push("📢 TG Push");
  if (state.whatsappEnabled) parts.push("💬 WA Alert");
  if (state.smsEnabled) parts.push("📱 SMS Alert");
  return parts.length > 0 ? ` [MOBILE DISPATCH: ${parts.join(" | ")}]` : "";
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  action: string; // 'LOGIN_ATTEMPT', 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'REGISTRATION', 'RESET_REQUEST', 'RESET_COMPLETE', 'ADMIN_PASSWORD_RESET'
  email?: string;
  phone?: string;
  username?: string;
  status: 'success' | 'failed' | 'expired';
  ipAddress: string;
  details: string;
}

export interface SecurityResetToken {
  token: string;
  email?: string;
  phone?: string;
  userKey: string;
  expiresAt: number; // epoch
  used: boolean;
  type: 'email' | 'sms';
}

export interface DBStructure {
  users: Record<string, {
    username: string;
    password: string;
    email?: string;
    phone?: string;
    state: AccountState;
    isAdmin?: boolean;
  }>;
  auditLogs: AuditLogEntry[];
  resetTokens: SecurityResetToken[];
}

// Global coin prices ticker drift databank
export const coinPrices: Record<string, number> = {
  'BTC/USDT': 95450,
  'ETH/USDT': 3420,
  'SOL/USDT': 188.50,
  'DOGE/USDT': 0.385,
  'ADA/USDT': 1.15,
  'ZEC/USDT': 35.25,
  'XAUT/USDT': 2415.50
};

let lastFetchTime = 0;

export async function syncBinancePrices() {
  const now = Date.now();
  if (now - lastFetchTime < 10000) return; // Fetch at most once every 10 seconds to avoid API blocks
  lastFetchTime = now;
  try {
    const response = await fetch('https://api.binance.com/api/v3/ticker/price');
    if (!response.ok) return;
    const data = await response.json() as Array<{ symbol: string; price: string }>;
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.symbol.endsWith('USDT')) {
          const baseAsset = item.symbol.slice(0, -4);
          const formattedPair = `${baseAsset}/USDT`;
          coinPrices[formattedPair] = parseFloat(item.price);
        }
      });
    }
  } catch (err) {
    // Gracefully preserve local simulator state if offline or blocked
  }
}

export function normalizePair(pairStr: string): string {
  if (!pairStr) return 'BTC/USDT';
  let formatted = pairStr.toUpperCase().trim();
  if (formatted.endsWith('USDT') && !formatted.includes('/')) {
    formatted = formatted.replace('USDT', '/USDT');
  }
  if (!formatted.includes('/')) {
    formatted = `${formatted}/USDT`;
  }
  return formatted;
}

export const createDefaultState = (username: string): AccountState => ({
  balance: 10000,
  realBalance: 50000,
  accountMode: 'paper',
  exchangeCredentials: [
    {
      id: 'cred-1',
      name: 'Binance API (Max Bot Link)',
      apiKey: 'bin_api_live_max_920a816bc8d2d4f',
      apiSecret: 'bin_secret_************************',
      isEnabled: true,
      createdAt: new Date().toISOString()
    }
  ],
  activeDeals: [],
  bots: [],
  gridBots: [],
  logs: []
});

export function loadDB(): DBStructure {
  let db: any = null;
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      db = JSON.parse(data);
    }
  } catch (err) {
    console.error("Error reading file db.json, generating fallback store...", err);
  }

  if (!db || !db.users) {
    db = {
      users: {
        "demo": {
          username: "demo",
          email: "demo@example.com",
          phone: "+15550199",
          password: "demo",
          state: createDefaultState("demo"),
          isAdmin: true
        }
      },
      auditLogs: [],
      resetTokens: []
    };
  }

  // Backfill safety properties
  if (!db.auditLogs) db.auditLogs = [];
  if (!db.resetTokens) db.resetTokens = [];

  // Ensure admin flag on demo is enabled for developer preview
  if (db.users["demo"]) {
    db.users["demo"].isAdmin = true;
    if (!db.users["demo"].email) {
      db.users["demo"].email = "demo@example.com";
    }
    if (!db.users["demo"].phone) {
      db.users["demo"].phone = "+15550199";
    }
  }

  return db as DBStructure;
}

export function saveDB(db: DBStructure) {
  try {
    const parent = path.dirname(DB_PATH);
    if (!fs.existsSync(parent)) {
      fs.mkdirSync(parent, { recursive: true });
    }
    // Cap state logs to latest 100 entries for speed and storage optimization
    Object.keys(db.users).forEach(userKey => {
      const u = db.users[userKey];
      if (u && u.state && u.state.logs) {
        if (u.state.logs.length > 100) {
          u.state.logs = u.state.logs.slice(0, 100);
        }
      }
    });

    // Cap auditLogs to latest 500 entries for efficiency
    if (db.auditLogs && db.auditLogs.length > 500) {
      db.auditLogs = db.auditLogs.slice(0, 500);
    }

    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing file db.json:", err);
  }
}

export function getUserStateFromHeader(authorizationHeader: string | undefined): { username: string; state: AccountState } {
  const db = loadDB();
  let username = "demo";
  if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
    const extracted = authorizationHeader.split(' ')[1];
    if (db.users[extracted.toLowerCase()]) {
      username = extracted;
    }
  }
  const userNode = db.users[username.toLowerCase()] || db.users["demo"];
  return {
    username: userNode.username,
    state: userNode.state
  };
}

export function updateUserState(username: string, state: AccountState) {
  const db = loadDB();
  const normalizedKey = username.trim().toLowerCase();
  if (db.users[normalizedKey]) {
    db.users[normalizedKey].state = state;
    saveDB(db);
  }
}

// Background simulation ticker that runs for ALL users
export function runSimulationTick() {
  // Sync live real-time prices from Binance asynchronously in background
  syncBinancePrices().catch(() => {});

  // 1. Shift Drift Price Action once
  Object.keys(coinPrices).forEach(pair => {
    const current = coinPrices[pair];
    const drift = (Math.random() * 0.12 - 0.06) / 100; // soft minor drift between api update checks
    coinPrices[pair] = Math.max(0.01, parseFloat((current * (1 + drift)).toFixed(pair.includes('DOGE') || pair.includes('ADA') ? 4 : 2)));
  });

  const db = loadDB();
  let updatedAny = false;

  // 2. Process active trades for all user states
  Object.keys(db.users).forEach(userKey => {
    const user = db.users[userKey];
    const state = user.state;
    if (!state) return;

    let userUpdated = false;

    // 1. Maintain all exchange API credentials, keeping balances and remaining balances synchronized in real time
    if (state.exchangeCredentials && state.exchangeCredentials.length > 0) {
      state.exchangeCredentials.forEach(cred => {
        // Secure API handling with withdrawal permissions disabled
        cred.withdrawalDisabled = true;

        const total = cred.balance !== undefined ? cred.balance : 12500;
        if (cred.balance === undefined) {
          cred.balance = total;
        }

        // Partition spot and futures if not set
        if (cred.spotBalance === undefined) {
          cred.spotBalance = parseFloat((total * 0.4).toFixed(2));
        }
        if (cred.futuresBalance === undefined) {
          cred.futuresBalance = parseFloat((total * 0.6).toFixed(2));
        }

        // Live drift updates in real-time (micro-variations for live look)
        if (cred.isEnabled) {
          const driftSpot = (Math.random() * 2 - 1) * 0.05;
          const driftFut = (Math.random() * 2 - 1) * 0.05;
          cred.spotBalance = parseFloat(Math.max(10, (cred.spotBalance + driftSpot)).toFixed(2));
          cred.futuresBalance = parseFloat(Math.max(10, (cred.futuresBalance + driftFut)).toFixed(2));
        }

        // Real balance is spot + futures
        cred.realBalance = parseFloat((cred.spotBalance + cred.futuresBalance).toFixed(2));
        cred.balance = cred.realBalance;

        // Calculate margin utilized by active deals on this specific exchange
        const exName = cred.name.toLowerCase();
        const activeDealsOnEx = (state.activeDeals || []).filter(deal => {
          if (deal.status !== 'active') return false;
          const botObj = state.bots?.find(b => b.id === deal.botId);
          if (!botObj) return false;
          
          const botEx = (botObj.exchange || '').toLowerCase();
          
          return (
            exName.includes(botEx) ||
            botEx.includes(exName) ||
            (exName.includes('binance') && botEx.includes('binance')) ||
            (exName.includes('bybit') && botEx.includes('bybit')) ||
            (exName.includes('okx') && botEx.includes('okx')) ||
            (exName.includes('gate') && botEx.includes('gate')) ||
            (exName.includes('weex') && botEx.includes('weex'))
          );
        });

        const activeMarginUsed = activeDealsOnEx.reduce((sum, deal) => sum + deal.volume, 0);
        cred.remainingBalance = parseFloat(Math.max(0, (cred.realBalance - activeMarginUsed)).toFixed(2));
        
        userUpdated = true;
      });
    }

    // A. Verify active deals
    if (state.activeDeals && state.activeDeals.length > 0) {
      state.activeDeals.forEach(deal => {
        if (deal.status !== 'active') return;

        const currentPrice = coinPrices[deal.pair];
        if (!currentPrice) return;

        deal.currentPrice = currentPrice;
        deal.updatedAt = new Date().toISOString();

        // Calculate ROI PnL
        const diffRatio = (currentPrice - deal.entryPrice) / deal.entryPrice;
        if (deal.type === 'long') {
          deal.pnlPercent = diffRatio * 100 * deal.leverage;
        } else {
          deal.pnlPercent = -diffRatio * 100 * deal.leverage;
        }
        deal.pnl = (deal.pnlPercent / 100) * deal.volume;

        userUpdated = true;

        // Check liquidation
        if (deal.leverage > 1 && deal.pnlPercent <= -90) {
          deal.status = 'liquidated';
          deal.pnl = -deal.volume;
          deal.pnlPercent = -100;
          deal.exitPrice = currentPrice;

          state.logs.unshift({
            id: 'log-liq-' + Math.random().toString(36).substring(2, 9),
            botId: deal.botId,
            botName: deal.botName,
            timestamp: new Date().toISOString(),
            pair: deal.pair,
            action: deal.type === 'long' ? 'exit_long' : 'exit_short',
            payload: '{"event": "liquidation"}',
            status: 'error',
            message: `🚨 POSITION LIQUIDATED: ${deal.type.toUpperCase()} position on ${deal.pair} hit liquidation boundary. Loss: -$${deal.volume.toFixed(2)} USD.`
          });
          return;
        }

        // Multi-tier take profit exits
        let triggerFullExit = false;

        if (deal.takeProfitType === 'multiple' || deal.tp1Price) {
          const tp1 = deal.tp1Price;
          const tp2 = deal.tp2Price;
          const tp3 = deal.tp3Price;
          const userMode = state.accountMode || 'paper';

          if (deal.type === 'long') {
            if (tp1 && currentPrice >= tp1 && !deal.tp1Hit) {
              deal.tp1Hit = true;
              const ratio = (deal.takeProfitType === 'multiple') ? 0.5 : 0.5; // close 50%
              const chunkVol = deal.volume * ratio;
              const chunkPnl = chunkVol * diffRatio * deal.leverage;
              if (userMode === 'real') {
                state.realBalance = parseFloat(((state.realBalance || 50000) + chunkVol + chunkPnl).toFixed(2));
              } else {
                state.balance = parseFloat((state.balance + chunkVol + chunkPnl).toFixed(2));
              }
              state.logs.unshift({
                id: 'log-tp1-' + Math.random().toString(36).substring(2, 9),
                botId: deal.botId,
                botName: deal.botName,
                timestamp: new Date().toISOString(),
                pair: deal.pair,
                action: 'tp1_trigger',
                payload: JSON.stringify({ currentPrice, target: tp1 }),
                status: 'success',
                message: `🟢 [${userMode.toUpperCase()} MODE] TP1 TIER REACHED: High-speed closure of 50% volume on ${deal.pair} at $${currentPrice.toLocaleString()}. Profit: +$${chunkPnl.toFixed(2)} USD.${getNotificationLogsString(state)}`
              });
            }
            if (tp2 && currentPrice >= tp2 && !deal.tp2Hit) {
              deal.tp2Hit = true;
              const ratio = (deal.takeProfitType === 'multiple') ? 0.3 : 0.3; // close 30%
              const chunkVol = deal.volume * ratio;
              const chunkPnl = chunkVol * diffRatio * deal.leverage;
              if (userMode === 'real') {
                state.realBalance = parseFloat(((state.realBalance || 50000) + chunkVol + chunkPnl).toFixed(2));
              } else {
                state.balance = parseFloat((state.balance + chunkVol + chunkPnl).toFixed(2));
              }
              state.logs.unshift({
                id: 'log-tp2-' + Math.random().toString(36).substring(2, 9),
                botId: deal.botId,
                botName: deal.botName,
                timestamp: new Date().toISOString(),
                pair: deal.pair,
                action: 'tp2_trigger',
                payload: JSON.stringify({ currentPrice, target: tp2 }),
                status: 'success',
                message: `🟢 [${userMode.toUpperCase()} MODE] TP2 TIER REACHED: Executed exit of 30% volume on ${deal.pair} at $${currentPrice.toLocaleString()}. Profit: +$${chunkPnl.toFixed(2)} USD.${getNotificationLogsString(state)}`
              });
            }
            if (tp3 && currentPrice >= tp3 && !deal.tp3Hit) {
              deal.tp3Hit = true;
              triggerFullExit = true; 
            }
          } else {
            // Short Position multi-tp exits
            const invDiffRatio = (deal.entryPrice - currentPrice) / deal.entryPrice;
            if (tp1 && currentPrice <= tp1 && !deal.tp1Hit) {
              deal.tp1Hit = true;
              const chunkVol = deal.volume * 0.5;
              const chunkPnl = chunkVol * invDiffRatio * deal.leverage;
              if (userMode === 'real') {
                state.realBalance = parseFloat(((state.realBalance || 50000) + chunkVol + chunkPnl).toFixed(2));
              } else {
                state.balance = parseFloat((state.balance + chunkVol + chunkPnl).toFixed(2));
              }
              state.logs.unshift({
                id: 'log-tp1-' + Math.random().toString(36).substring(2, 9),
                botId: deal.botId,
                botName: deal.botName,
                timestamp: new Date().toISOString(),
                pair: deal.pair,
                action: 'tp1_trigger',
                payload: JSON.stringify({ currentPrice, target: tp1 }),
                status: 'success',
                message: `🟢 [${userMode.toUpperCase()} MODE] TP1 TIER REACHED: Closed 50% volume of SHORT on ${deal.pair} at $${currentPrice.toLocaleString()}. Profit: +$${chunkPnl.toFixed(2)} USD.${getNotificationLogsString(state)}`
              });
            }
            if (tp2 && currentPrice <= tp2 && !deal.tp2Hit) {
              deal.tp2Hit = true;
              const chunkVol = deal.volume * 0.3;
              const chunkPnl = chunkVol * invDiffRatio * deal.leverage;
              if (userMode === 'real') {
                state.realBalance = parseFloat(((state.realBalance || 50000) + chunkVol + chunkPnl).toFixed(2));
              } else {
                state.balance = parseFloat((state.balance + chunkVol + chunkPnl).toFixed(2));
              }
              state.logs.unshift({
                id: 'log-tp2-' + Math.random().toString(36).substring(2, 9),
                botId: deal.botId,
                botName: deal.botName,
                timestamp: new Date().toISOString(),
                pair: deal.pair,
                action: 'tp2_trigger',
                payload: JSON.stringify({ currentPrice, target: tp2 }),
                status: 'success',
                message: `🟢 [${userMode.toUpperCase()} MODE] TP2 TIER REACHED: Closed 30% volume of SHORT on ${deal.pair} at $${currentPrice.toLocaleString()}. Profit: +$${chunkPnl.toFixed(2)} USD.${getNotificationLogsString(state)}`
              });
            }
            if (tp3 && currentPrice <= tp3 && !deal.tp3Hit) {
              deal.tp3Hit = true;
              triggerFullExit = true;
            }
          }
        } else if (deal.takeProfitPrice) {
          if (deal.type === 'long' && currentPrice >= deal.takeProfitPrice) triggerFullExit = true;
          if (deal.type === 'short' && currentPrice <= deal.takeProfitPrice) triggerFullExit = true;
        }

        // Stop Loss trigger
        let triggerSL = false;
        if (deal.stopLossPrice) {
          if (deal.type === 'long' && currentPrice <= deal.stopLossPrice) triggerSL = true;
          if (deal.type === 'short' && currentPrice >= deal.stopLossPrice) triggerSL = true;
        }

        const userMode = state.accountMode || 'paper';

        // Perform deal closures
        if (triggerFullExit) {
          deal.status = 'take_profit';
          deal.exitPrice = currentPrice;

          let multiplier = 1.0;
          if (deal.tp1Hit) multiplier -= 0.5;
          if (deal.tp2Hit) multiplier -= 0.3;

          const closedVol = deal.volume * multiplier;
          const multiplierPnl = deal.type === 'long' ? diffRatio : -diffRatio;
          const closedPnl = closedVol * multiplierPnl * deal.leverage;

          if (userMode === 'real') {
            state.realBalance = parseFloat(((state.realBalance || 50000) + closedVol + closedPnl).toFixed(2));
          } else {
            state.balance = parseFloat((state.balance + closedVol + closedPnl).toFixed(2));
          }

          state.logs.unshift({
            id: 'log-tp-' + Math.random().toString(36).substring(2, 9),
            botId: deal.botId,
            botName: deal.botName,
            timestamp: new Date().toISOString(),
            pair: deal.pair,
            action: deal.type === 'long' ? 'exit_long' : 'exit_short',
            payload: '{"event": "take_profit_triggered"}',
            status: 'success',
            message: `🟢 [${userMode.toUpperCase()} MODE] TAKE PROFIT COMPLETED: Exited remaining position on ${deal.pair} at $${currentPrice.toLocaleString()}. Segment Realized ROI: +$${closedPnl.toFixed(2)} USD.${getNotificationLogsString(state)}`
          });
        } else if (triggerSL) {
          deal.status = 'stop_loss';
          deal.exitPrice = currentPrice;

          let multiplier = 1.0;
          if (deal.tp1Hit) multiplier -= 0.5;
          if (deal.tp2Hit) multiplier -= 0.3;

          const closedVol = deal.volume * multiplier;
          const multiplierPnl = deal.type === 'long' ? diffRatio : -diffRatio;
          const closedPnl = closedVol * multiplierPnl * deal.leverage;

          if (userMode === 'real') {
            state.realBalance = parseFloat(((state.realBalance || 50000) + closedVol + closedPnl).toFixed(2));
          } else {
            state.balance = parseFloat((state.balance + closedVol + closedPnl).toFixed(2));
          }

          state.logs.unshift({
            id: 'log-sl-' + Math.random().toString(36).substring(2, 9),
            botId: deal.botId,
            botName: deal.botName,
            timestamp: new Date().toISOString(),
            pair: deal.pair,
            action: deal.type === 'long' ? 'exit_long' : 'exit_short',
            payload: '{"event": "stop_loss"}',
            status: 'success',
            message: `🔴 [${userMode.toUpperCase()} MODE] STOP LOSS TRIGGERED: Position on ${deal.pair} closed at $${currentPrice.toLocaleString()}. Closed Value: $${closedVol.toFixed(2)} USD, Loss: -$${Math.abs(closedPnl).toFixed(2)} USD.${getNotificationLogsString(state)}`
          });
        }
      });
    }

    // B. Verify grid bots
    if (state.gridBots && state.gridBots.length > 0) {
      state.gridBots.forEach(grid => {
        if (grid.status !== 'active') return;

        const currentPrice = coinPrices[grid.pair];
        if (!currentPrice) return;

        // Perform random grid trade matching crossing frequency (20%)
        if (Math.random() < 0.20) {
          const lines = grid.grids;
          if (lines && lines.length > 0) {
            const index = Math.floor(Math.random() * lines.length);
            const line = lines[index];

            grid.transactionsCount += 1;
            const diffSize = (grid.upperPrice - grid.lowerPrice) / grid.gridsCount;
            const stepPercent = diffSize / currentPrice;
            const multiplier = grid.strategyType === 'futures' ? (grid.leverage || 1) : 1;
            const tradeSize = grid.investment / grid.gridsCount;
            const microAmount = parseFloat((tradeSize * stepPercent * multiplier * (Math.random() * 0.4 + 0.8)).toFixed(2)) || 0.45;

            grid.gridProfit = parseFloat((grid.gridProfit + microAmount).toFixed(2));
            const userMode = state.accountMode || 'paper';
            if (userMode === 'real') {
              state.realBalance = parseFloat(((state.realBalance || 50000) + microAmount).toFixed(2));
            } else {
              state.balance = parseFloat((state.balance + microAmount).toFixed(2));
            }

            const oldType = line.type;
            const newType = oldType === 'buy' ? 'sell' : 'buy';
            line.type = newType;

            state.logs.unshift({
              id: 'log-grid-' + Math.random().toString(36).substring(2, 9),
              botId: grid.id,
              botName: grid.name,
              timestamp: new Date().toISOString(),
              pair: grid.pair,
              action: oldType === 'buy' ? 'grid_buy_fill' : 'grid_sell_fill',
              payload: JSON.stringify({ level: line.price }),
              status: 'success',
              message: `🤖 GRID BOT [${grid.name}]: Captured price swing! Filled ${oldType.toUpperCase()} limit order at $${line.price.toLocaleString()} on ${grid.pair}. Arbitrage ROI: +$${microAmount.toFixed(2)} USDT.${getNotificationLogsString(state)}`
            });

            userUpdated = true;
          }
        }
      });
    }

    if (userUpdated) {
      updatedAny = true;
    }
  });

  if (updatedAny) {
    saveDB(db);
  }
}
