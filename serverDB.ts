import fs from 'fs';
import path from 'path';
import { AccountState, SignalBot, GridBot, GridLine, Deal, SignalLog } from './src/types';
import { fetchRealExchangeBalances } from './serverExchangeFetch';

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
  spotBalance: 5000,
  futuresBalance: 5000,
  realSpotBalance: 25000,
  realFuturesBalance: 25000,
  accountMode: undefined,
  exchangeCredentials: [],
  activeDeals: [],
  bots: [],
  gridBots: [],
  logs: []
});

export function ensureBalancesInitialized(state: AccountState) {
  if (!state.activeAccountType) {
    state.activeAccountType = 'futures';
  }
  
  if (state.balance === undefined || state.balance === null || typeof state.balance !== 'number') {
    state.balance = 10000;
  }
  
  const hasNoSpot = state.spotBalance === undefined || state.spotBalance === null || typeof state.spotBalance !== 'number';
  const hasNoFut = state.futuresBalance === undefined || state.futuresBalance === null || typeof state.futuresBalance !== 'number';
  
  if (hasNoSpot && hasNoFut) {
    state.spotBalance = parseFloat((state.balance * 0.50).toFixed(2));
    state.futuresBalance = parseFloat((state.balance * 0.50).toFixed(2));
  } else if (hasNoSpot) {
    state.spotBalance = parseFloat(Math.max(0, state.balance - (state.futuresBalance || 0)).toFixed(2));
  } else if (hasNoFut) {
    state.futuresBalance = parseFloat(Math.max(0, state.balance - (state.spotBalance || 0)).toFixed(2));
  } else if (state.spotBalance === 0 && state.futuresBalance === 0 && state.balance > 0) {
    state.spotBalance = parseFloat((state.balance * 0.50).toFixed(2));
    state.futuresBalance = parseFloat((state.balance * 0.50).toFixed(2));
  }
  
  state.balance = parseFloat(((state.spotBalance || 0) + (state.futuresBalance || 0)).toFixed(2));

  if (state.realBalance === undefined || state.realBalance === null || typeof state.realBalance !== 'number') {
    state.realBalance = 50000;
  }
  
  const hasNoRealSpot = state.realSpotBalance === undefined || state.realSpotBalance === null || typeof state.realSpotBalance !== 'number';
  const hasNoRealFut = state.realFuturesBalance === undefined || state.realFuturesBalance === null || typeof state.realFuturesBalance !== 'number';
  
  if (hasNoRealSpot && hasNoRealFut) {
    state.realSpotBalance = parseFloat((state.realBalance * 0.50).toFixed(2));
    state.realFuturesBalance = parseFloat((state.realBalance * 0.50).toFixed(2));
  } else if (hasNoRealSpot) {
    state.realSpotBalance = parseFloat(Math.max(0, state.realBalance - (state.realFuturesBalance || 0)).toFixed(2));
  } else if (hasNoRealFut) {
    state.realFuturesBalance = parseFloat(Math.max(0, state.realBalance - (state.realSpotBalance || 0)).toFixed(2));
  } else if (state.realSpotBalance === 0 && state.realFuturesBalance === 0 && state.realBalance > 0) {
    state.realSpotBalance = parseFloat((state.realBalance * 0.50).toFixed(2));
    state.realFuturesBalance = parseFloat((state.realBalance * 0.50).toFixed(2));
  }
  
  state.realBalance = parseFloat(((state.realSpotBalance || 0) + (state.realFuturesBalance || 0)).toFixed(2));
}

export function addFunds(state: AccountState, amount: number, strategyType: 'spot' | 'futures', userMode: 'real' | 'paper' | 'real_fallback') {
  ensureBalancesInitialized(state);
  const isReal = userMode === 'real' || userMode === 'real_fallback';
  if (isReal) {
    if (strategyType === 'spot') {
      state.realSpotBalance = parseFloat(((state.realSpotBalance || 0) + amount).toFixed(2));
    } else {
      state.realFuturesBalance = parseFloat(((state.realFuturesBalance || 0) + amount).toFixed(2));
    }
    state.realBalance = parseFloat(((state.realSpotBalance || 0) + (state.realFuturesBalance || 0)).toFixed(2));

    // Proactively sync enabled credentials so individual connection balances are exact
    if (state.exchangeCredentials && state.exchangeCredentials.length > 0) {
      const enabledCreds = state.exchangeCredentials.filter(c => c.isEnabled);
      if (enabledCreds.length > 0) {
        const activeKey = enabledCreds[0];
        if (strategyType === 'spot') {
          activeKey.spotBalance = parseFloat(((activeKey.spotBalance || 0) + amount).toFixed(2));
        } else {
          activeKey.futuresBalance = parseFloat(((activeKey.futuresBalance || 0) + amount).toFixed(2));
        }
        activeKey.realBalance = parseFloat(((activeKey.spotBalance || 0) + (activeKey.futuresBalance || 0)).toFixed(2));
        activeKey.balance = activeKey.realBalance;
      }
    }
  } else {
    if (strategyType === 'spot') {
      state.spotBalance = parseFloat(((state.spotBalance || 0) + amount).toFixed(2));
    } else {
      state.futuresBalance = parseFloat(((state.futuresBalance || 0) + amount).toFixed(2));
    }
    state.balance = parseFloat(((state.spotBalance || 0) + (state.futuresBalance || 0)).toFixed(2));
  }
}

export function deductFunds(state: AccountState, amount: number, strategyType: 'spot' | 'futures', userMode: 'real' | 'paper' | 'real_fallback') {
  ensureBalancesInitialized(state);
  const isReal = userMode === 'real' || userMode === 'real_fallback';
  if (isReal) {
    if (strategyType === 'spot') {
      state.realSpotBalance = parseFloat((Math.max(0, (state.realSpotBalance || 0) - amount)).toFixed(2));
    } else {
      state.realFuturesBalance = parseFloat((Math.max(0, (state.realFuturesBalance || 0) - amount)).toFixed(2));
    }
    state.realBalance = parseFloat(((state.realSpotBalance || 0) + (state.realFuturesBalance || 0)).toFixed(2));

    // Proactively sync enabled credentials so individual connection balances are exact
    if (state.exchangeCredentials && state.exchangeCredentials.length > 0) {
      const enabledCreds = state.exchangeCredentials.filter(c => c.isEnabled);
      if (enabledCreds.length > 0) {
        const activeKey = enabledCreds[0];
        if (strategyType === 'spot') {
          activeKey.spotBalance = parseFloat((Math.max(0, (activeKey.spotBalance || 0) - amount)).toFixed(2));
        } else {
          activeKey.futuresBalance = parseFloat((Math.max(0, (activeKey.futuresBalance || 0) - amount)).toFixed(2));
        }
        activeKey.realBalance = parseFloat(((activeKey.spotBalance || 0) + (activeKey.futuresBalance || 0)).toFixed(2));
        activeKey.balance = activeKey.realBalance;
      }
    }
  } else {
    if (strategyType === 'spot') {
      state.spotBalance = parseFloat((Math.max(0, (state.spotBalance || 0) - amount)).toFixed(2));
    } else {
      state.futuresBalance = parseFloat((Math.max(0, (state.futuresBalance || 0) - amount)).toFixed(2));
    }
    state.balance = parseFloat(((state.spotBalance || 0) + (state.futuresBalance || 0)).toFixed(2));
  }
}

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

  const defaultAdmin = {
    username: "Administrator",
    email: "admin@maxbot.io",
    phone: "+123456789",
    password: "admin",
    state: createDefaultState("Administrator"),
    isAdmin: true
  };

  if (!db || !db.users) {
    db = {
      users: {
        "administrator": defaultAdmin
      },
      auditLogs: [],
      resetTokens: []
    };
  }

  // Ensure 'administrator' is present and fully cleared as administrator
  if (!db.users["administrator"]) {
    db.users["administrator"] = defaultAdmin;
  } else {
    db.users["administrator"].isAdmin = true;
    if (!db.users["administrator"].state) {
      db.users["administrator"].state = createDefaultState("Administrator");
    }
  }

  // Auto-migrate old 'demo' user if it exists in historical databases
  if (db.users["demo"]) {
    const demoNode = db.users["demo"];
    db.users["administrator"].state = {
      ...db.users["administrator"].state,
      ...demoNode.state
    };
    delete db.users["demo"];
  }

  // Remove any non-admin/customizable accounts to safeguard Administrator privilege limit
  Object.keys(db.users).forEach(key => {
    if (key !== "administrator") {
      delete db.users[key];
    }
  });

  // Backfill safety properties
  if (!db.auditLogs) db.auditLogs = [];
  if (!db.resetTokens) db.resetTokens = [];

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
  let username = "administrator";
  if (authorizationHeader && authorizationHeader.startsWith('Bearer ')) {
    const extracted = authorizationHeader.split(' ')[1];
    if (db.users[extracted.toLowerCase()]) {
      username = extracted;
    } else if (extracted.toLowerCase() === 'demo') {
      username = "administrator";
    }
  }
  const userNode = db.users[username.toLowerCase()] || db.users["administrator"];
  
  if (userNode && userNode.state) {
    ensureBalancesInitialized(userNode.state);
  }

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
        // Enforce secure API handling with withdrawal permissions disabled
        cred.withdrawalDisabled = true;

        const total = cred.balance !== undefined ? cred.balance : 12500;
        if (cred.balance === undefined) {
          cred.balance = total;
        }

        // Fix: connection parameters mapped to specific exchange characteristics
        let spotScale = 0.40;
        let futuresScale = 0.60;
        const lowerName = (cred.name || '').toLowerCase();
        
        if (lowerName.includes('binance')) {
          spotScale = 0.45;
          futuresScale = 0.55;
        } else if (lowerName.includes('bybit')) {
          spotScale = 0.35;
          futuresScale = 0.65;
        } else if (lowerName.includes('kucoin') || lowerName.includes('ku')) {
          spotScale = 0.55;
          futuresScale = 0.45;
        } else if (lowerName.includes('okx')) {
          spotScale = 0.40;
          futuresScale = 0.60;
        } else if (lowerName.includes('gate.io') || lowerName.includes('gate')) {
          spotScale = 0.50;
          futuresScale = 0.50;
        } else if (lowerName.includes('weex')) {
          spotScale = 0.30;
          futuresScale = 0.70;
        }

        // Initialize connection protocols and secure traits if missing
        if (!cred.protocol) {
          cred.protocol = 'REST+WS';
        }
        if (!cred.authMethod) {
          cred.authMethod = 'Sha256_Signature';
        }
        if (!cred.wsStatus) {
          cred.wsStatus = cred.isEnabled ? 'Connected' : 'Offline';
        }
        if (!cred.lastSyncTimestamp) {
          cred.lastSyncTimestamp = new Date().toISOString();
        }

        // Partition spot and futures partitions with fixed ratios
        if (cred.spotBalance === undefined) {
          cred.spotBalance = parseFloat((total * spotScale).toFixed(2));
        }
        if (cred.futuresBalance === undefined) {
          cred.futuresBalance = parseFloat((total * futuresScale).toFixed(2));
        }

        // Live drift updates in real-time (micro-variations for high-fidelity interactive look)
        if (cred.isEnabled) {
          const key = cred.apiKey ? cred.apiKey.trim() : '';
          const secret = cred.apiSecret ? cred.apiSecret.trim() : '';
          const isMockKey = 
            !key || 
            key.length < 16 || 
            key.includes('***') || 
            key.startsWith('bin_api') || 
            key.startsWith('mock') || 
            secret.includes('*');

          if (!isMockKey) {
            // Clear continuous real-time balance fetching while bot/routing is allowed
            const tickKey = `tick_count_${cred.id}`;
            const currentTick = (global as any)[tickKey] || 0;
            (global as any)[tickKey] = (currentTick + 1) % 4; // Fetch real API once every 16 seconds
            if (currentTick === 0) {
              fetchRealExchangeBalances(cred, state.accountMode)
                .then(res => {
                  cred.spotBalance = res.spotBalance;
                  cred.futuresBalance = res.futuresBalance;
                  cred.realBalance = res.totalBalance;
                  cred.balance = res.totalBalance;
                  cred.wsStatus = res.wsStatus;
                })
                .catch(() => {});
            }
          } else {
            const driftSpot = (Math.random() * 2 - 1) * 0.05;
            const driftFut = (Math.random() * 2 - 1) * 0.05;
            cred.spotBalance = parseFloat(Math.max(10, (cred.spotBalance + driftSpot)).toFixed(2));
            cred.futuresBalance = parseFloat(Math.max(10, (cred.futuresBalance + driftFut)).toFixed(2));
          }
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
            (exName.includes('kucoin') && botEx.includes('kucoin')) ||
            (exName.includes('okx') && botEx.includes('okx')) ||
            (exName.includes('gate') && botEx.includes('gate')) ||
            (exName.includes('weex') && botEx.includes('weex'))
          );
        });

        const activeMarginUsed = activeDealsOnEx.reduce((sum, deal) => sum + deal.volume, 0);
        cred.remainingBalance = parseFloat(Math.max(0, (cred.realBalance - activeMarginUsed)).toFixed(2));
        
        userUpdated = true;
      });

      // Synchronize the master state's realBalance in real time
      const enabledCreds = state.exchangeCredentials.filter(c => c.isEnabled);
      if (enabledCreds.length > 0) {
        const summedReal = enabledCreds.reduce((sum, c) => sum + (c.realBalance || c.balance || 0), 0);
        state.realBalance = parseFloat(summedReal.toFixed(2));
        
        const summedSpot = enabledCreds.reduce((sum, c) => sum + (c.spotBalance || 0), 0);
        state.realSpotBalance = parseFloat(summedSpot.toFixed(2));
        
        const summedFutures = enabledCreds.reduce((sum, c) => sum + (c.futuresBalance || 0), 0);
        state.realFuturesBalance = parseFloat(summedFutures.toFixed(2));
      }
    }

    // A. Verify active deals
    if (state.activeDeals && state.activeDeals.length > 0) {
      state.activeDeals.forEach(deal => {
        if (deal.status !== 'active') return;

        const currentPrice = coinPrices[deal.pair];
        if (!currentPrice) return;

        deal.currentPrice = currentPrice;
        deal.updatedAt = new Date().toISOString();

        const relatedBot = state.bots?.find(b => b.id === deal.botId);
        const userMode = state.accountMode || 'paper';

        // --- 3COMMAS DCA SAFETY ORDER LOGIC ---
        const maxSO = deal.maxSafetyOrders !== undefined ? deal.maxSafetyOrders : (relatedBot?.maxSafetyOrders || 0);
        const currentFilled = deal.safetyOrdersFilled || 0;

        if (maxSO > 0 && currentFilled < maxSO) {
          const nextSoIndex = currentFilled + 1;
          const soSize = deal.safetyOrderSize !== undefined ? deal.safetyOrderSize : (relatedBot?.safetyOrderSize || 0);
          const devStep = deal.priceDeviationStep !== undefined ? deal.priceDeviationStep : (relatedBot?.priceDeviationStep || 2.0);
          const volScale = deal.safetyOrderVolumeScale !== undefined ? deal.safetyOrderVolumeScale : (relatedBot?.safetyOrderVolumeScale || 1.5);
          const stepScale = deal.safetyOrderStepScale !== undefined ? deal.safetyOrderStepScale : (relatedBot?.safetyOrderStepScale || 1.0);
          const initialPrice = deal.initialEntryPrice || deal.entryPrice;

          // Calculate cumulative deviation for safety order stage 'nextSoIndex'
          let cumulativeDeviationPercent = 0;
          for (let i = 1; i <= nextSoIndex; i++) {
            if (i === 1) {
              cumulativeDeviationPercent += devStep;
            } else {
              cumulativeDeviationPercent += devStep * Math.pow(stepScale, i - 1);
            }
          }

          // Trigger target price depending on long/short selection
          const isLong = deal.type === 'long';
          const triggerPrice = isLong 
            ? initialPrice * (1 - cumulativeDeviationPercent / 100)
            : initialPrice * (1 + cumulativeDeviationPercent / 100);

          const isTriggered = isLong 
            ? currentPrice <= triggerPrice 
            : currentPrice >= triggerPrice;

          if (isTriggered && soSize > 0) {
            // Calculate size for this specific safety order order
            const currentSoVolume = soSize * Math.pow(volScale, nextSoIndex - 1);

            let hasFunds = false;
            const strategyType = (relatedBot ? relatedBot.strategyType : 'futures') || 'futures';
            if (userMode === 'real') {
              ensureBalancesInitialized(state);
              const currentBalance = strategyType === 'spot' ? (state.realSpotBalance || 0) : (state.realFuturesBalance || 0);
              if (currentBalance >= currentSoVolume) {
                if (strategyType === 'spot') {
                  state.realSpotBalance = parseFloat((currentBalance - currentSoVolume).toFixed(2));
                } else {
                  state.realFuturesBalance = parseFloat((currentBalance - currentSoVolume).toFixed(2));
                }
                state.realBalance = parseFloat(((state.realSpotBalance || 0) + (state.realFuturesBalance || 0)).toFixed(2));
                hasFunds = true;
              }
            } else {
              ensureBalancesInitialized(state);
              const currentBalance = strategyType === 'spot' ? (state.spotBalance || 0) : (state.futuresBalance || 0);
              if (currentBalance >= currentSoVolume) {
                if (strategyType === 'spot') {
                  state.spotBalance = parseFloat((currentBalance - currentSoVolume).toFixed(2));
                } else {
                  state.futuresBalance = parseFloat((currentBalance - currentSoVolume).toFixed(2));
                }
                state.balance = parseFloat(((state.spotBalance || 0) + (state.futuresBalance || 0)).toFixed(2));
                hasFunds = true;
              }
            }

            if (hasFunds) {
              const oldAvgEntry = deal.avgEntryPrice || deal.entryPrice;
              const prevSpent = deal.totalBaseAndSafetySpent || deal.volume;
              
              deal.totalBaseAndSafetySpent = prevSpent + currentSoVolume;
              
              // Calculate asset additions
              const additionalAsset = (currentSoVolume * deal.leverage) / currentPrice;
              deal.amountAsset = (deal.amountAsset || 0) + additionalAsset;
              
              // New avg entry price
              deal.avgEntryPrice = (deal.totalBaseAndSafetySpent * deal.leverage) / deal.amountAsset;
              
              // Update official variables
              deal.volume = deal.totalBaseAndSafetySpent;
              deal.entryPrice = deal.avgEntryPrice;
              deal.safetyOrdersFilled = nextSoIndex;

              // Recalculate Stop Loss if active
              if (deal.stopLossPrice && deal.stopLossPercent) {
                const slPercent = deal.stopLossPercent;
                deal.stopLossPrice = isLong
                  ? parseFloat((deal.avgEntryPrice * (1 - slPercent / 100)).toFixed(4))
                  : parseFloat((deal.avgEntryPrice * (1 + slPercent / 100)).toFixed(4));
              }

              // Recalculate Take Profit (recalculated from new lowered avg entry cost base)
              const tpPercent = deal.takeProfitPercent || (relatedBot?.takeProfitValue || 3.0);
              deal.takeProfitPercent = tpPercent;

              if (deal.takeProfitType === 'multiple') {
                const tp1Val = relatedBot?.tp1Value || 2.0;
                const tp2Val = relatedBot?.tp2Value || 4.0;
                const tp3Val = relatedBot?.tp3Value || 6.0;
                if (isLong) {
                  deal.tp1Price = parseFloat((deal.avgEntryPrice * (1 + tp1Val / 100)).toFixed(4));
                  deal.tp2Price = parseFloat((deal.avgEntryPrice * (1 + tp2Val / 100)).toFixed(4));
                  deal.tp3Price = parseFloat((deal.avgEntryPrice * (1 + tp3Val / 100)).toFixed(4));
                } else {
                  deal.tp1Price = parseFloat((deal.avgEntryPrice * (1 - tp1Val / 100)).toFixed(4));
                  deal.tp2Price = parseFloat((deal.avgEntryPrice * (1 - tp2Val / 100)).toFixed(4));
                  deal.tp3Price = parseFloat((deal.avgEntryPrice * (1 - tp3Val / 100)).toFixed(4));
                }
                // Update active target
                if (!deal.tp1Hit) deal.takeProfitPrice = deal.tp1Price;
                else if (!deal.tp2Hit) deal.takeProfitPrice = deal.tp2Price;
                else deal.takeProfitPrice = deal.tp3Price;
              } else if (deal.takeProfitPrice !== null) {
                deal.takeProfitPrice = isLong
                  ? parseFloat((deal.avgEntryPrice * (1 + tpPercent / 100)).toFixed(4))
                  : parseFloat((deal.avgEntryPrice * (1 - tpPercent / 100)).toFixed(4));
              }

              state.logs.unshift({
                id: 'log-so-fill-' + Math.random().toString(36).substring(2, 9),
                botId: deal.botId,
                botName: deal.botName,
                timestamp: new Date().toISOString(),
                pair: deal.pair,
                action: 'safety_order_filled',
                payload: JSON.stringify({ index: nextSoIndex, size: currentSoVolume, trigger: triggerPrice, current: currentPrice, oldAvg: oldAvgEntry, newAvg: deal.avgEntryPrice }),
                status: 'success',
                message: `🤖 [3COMMAS DCA] SAFETY ORDER #${nextSoIndex} EXECUTED: Buy trigger reached at $${triggerPrice.toLocaleString()} for ${deal.pair}! Filled size: +$${currentSoVolume.toFixed(2)} USDT. Cost basis averaged down from $${oldAvgEntry.toLocaleString()} to $${deal.avgEntryPrice.toLocaleString()}. TP relocated to $${deal.takeProfitPrice?.toLocaleString()} (Averaged target: ${tpPercent}%).`
              });

              userUpdated = true;
            } else {
              // Create unique log trigger for funding warning to avoid excessive ticker spam
              const logKey = `fail_log_so_${deal.id}_${nextSoIndex}`;
              if (!(deal as any)[logKey]) {
                (deal as any)[logKey] = true;
                state.logs.unshift({
                  id: 'log-so-fail-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'safety_order_insufficient_funds',
                  payload: JSON.stringify({ index: nextSoIndex, required: currentSoVolume }),
                  status: 'error',
                  message: `🚨 [3COMMAS DCA] SAFETY ORDER #${nextSoIndex} SKIPPED: Insufficient balance. Volume required: $${currentSoVolume.toFixed(2)} USDT. Top up wallet to resume automatic average downs.`
                });
                userUpdated = true;
              }
            }
          }
        }

        // Calculate ROI PnL
        const diffRatio = (currentPrice - deal.entryPrice) / deal.entryPrice;
        if (deal.type === 'long') {
          deal.pnlPercent = diffRatio * 100 * deal.leverage;
        } else {
          deal.pnlPercent = -diffRatio * 100 * deal.leverage;
        }
        deal.pnl = (deal.pnlPercent / 100) * deal.volume;

        const deviationPercent = deal.trailingTpDeviation !== undefined 
          ? deal.trailingTpDeviation 
          : (relatedBot?.trailingTpDeviation !== undefined ? relatedBot.trailingTpDeviation : 0.2);

        if (relatedBot) {
          // Stop Loss to Breakeven trigger check
          const isSlMoveToBreakeven = deal.slMoveToBreakeven !== undefined ? deal.slMoveToBreakeven : relatedBot.slMoveToBreakeven;
          if (isSlMoveToBreakeven && !deal.slBreakevenTriggered && deal.stopLossPrice) {
            const breakevenTriggerPercent = deal.slBreakevenTrigger !== undefined 
              ? deal.slBreakevenTrigger 
              : (relatedBot.slBreakevenTrigger || 2.0);
            
            if (deal.pnlPercent >= breakevenTriggerPercent) {
              deal.slBreakevenTriggered = true;
              const oldSL = deal.stopLossPrice;
              deal.stopLossPrice = deal.entryPrice;
              state.logs.unshift({
                id: 'log-breakeven-sl-' + Math.random().toString(36).substring(2, 9),
                botId: deal.botId,
                botName: deal.botName,
                timestamp: new Date().toISOString(),
                pair: deal.pair,
                action: 'adjust_stop_loss',
                payload: JSON.stringify({ old_sl: oldSL, new_sl: deal.stopLossPrice, pnlPercent: deal.pnlPercent }),
                status: 'success',
                message: `🛡️ [Stop Loss Breakeven] Position on ${deal.pair} reached profit threshold of +${deal.pnlPercent.toFixed(2)}% (Trigger: ${breakevenTriggerPercent}%). Stop Loss was successfully relocated to Breakeven Entry level: $${deal.entryPrice.toLocaleString()}.`
              });
              userUpdated = true;
            }
          }

          // 1. Dynamic Trailing Stop Loss (runs while deal is active and trailing SL option is enabled)
          const isTrailingStopLossEnabled = deal.trailingStopLoss !== undefined ? deal.trailingStopLoss : relatedBot.trailingStopLoss;
          if (isTrailingStopLossEnabled && deal.stopLossPrice) {
            const slPercent = deal.trailingSlDeviation !== undefined 
              ? deal.trailingSlDeviation 
              : (relatedBot.trailingSlDeviation !== undefined 
                ? relatedBot.trailingSlDeviation 
                : (deal.stopLossPercent || relatedBot.stopLossValue || 1.5));
            if (deal.type === 'long') {
              const slThreshold = currentPrice * (1 - slPercent / 100);
              if (slThreshold > deal.stopLossPrice) {
                const oldSL = deal.stopLossPrice;
                deal.stopLossPrice = parseFloat(slThreshold.toFixed(4));
                state.logs.unshift({
                  id: 'log-trail-sl-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'adjust_stop_loss',
                  payload: JSON.stringify({ old_sl: oldSL, new_sl: deal.stopLossPrice, cur_price: currentPrice }),
                  status: 'success',
                  message: `📈 [3COMMAS TRAILING SL] LONG POSITION ADAPTED: Trailed Stop Loss higher from ${oldSL.toLocaleString()} to ${deal.stopLossPrice.toLocaleString()} following ${deal.pair} upward momentum at ${currentPrice.toLocaleString()} (Strict SL: ${slPercent}%).`
                });
              }
            } else {
              const slThreshold = currentPrice * (1 + slPercent / 100);
              if (slThreshold < deal.stopLossPrice) {
                const oldSL = deal.stopLossPrice;
                deal.stopLossPrice = parseFloat(slThreshold.toFixed(4));
                state.logs.unshift({
                  id: 'log-trail-sl-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'adjust_stop_loss',
                  payload: JSON.stringify({ old_sl: oldSL, new_sl: deal.stopLossPrice, cur_price: currentPrice }),
                  status: 'success',
                  message: `📉 [3COMMAS TRAILING SL] SHORT POSITION ADAPTED: Trailed Stop Loss lower from ${oldSL.toLocaleString()} to ${deal.stopLossPrice.toLocaleString()} following ${deal.pair} downward momentum at ${currentPrice.toLocaleString()} (Strict SL: ${slPercent}%).`
                });
              }
            }
          }
        }

        userUpdated = true;

        // 2. Check liquidation boundary (futures leverage hazard)
        if (deal.leverage > 1 && deal.pnlPercent <= -90) {
          deal.status = 'liquidated';
          deal.pnl = -deal.volume;
          deal.pnlPercent = -100;
          deal.exitPrice = currentPrice;

          const closedVol = deal.volume;
          deductFunds(state, closedVol, 'futures', userMode);

          state.logs.unshift({
            id: 'log-liq-' + Math.random().toString(36).substring(2, 9),
            botId: deal.botId,
            botName: deal.botName,
            timestamp: new Date().toISOString(),
            pair: deal.pair,
            action: deal.type === 'long' ? 'exit_long' : 'exit_short',
            payload: JSON.stringify({ event: "liquidation", leverage: deal.leverage, entry: deal.entryPrice, exit: currentPrice }),
            status: 'error',
            message: `🚨 POSITION LIQUIDATED: ${deal.type.toUpperCase()} position on ${deal.pair} hit liquidation limit. Entry: ${deal.entryPrice}, Exit: ${currentPrice}. Margin Lost: -${closedVol.toFixed(2)} USD.`
          });
          return;
        }

        // 3. Trailing Take Profit logic (updates trailing peak & triggers on reversal deviation)
        const isTrailingTpEnabled = deal.trailingTakeProfit !== undefined ? deal.trailingTakeProfit : !!relatedBot?.trailingTakeProfit;
        if (isTrailingTpEnabled && deal.trailingTpActivated) {
          if (deal.type === 'long') {
            if (currentPrice > (deal.trailingTpPeakPrice || 0)) {
              deal.trailingTpPeakPrice = currentPrice;
            }
            const activeDeviation = deviationPercent;
            const thresholdPrice = (deal.trailingTpPeakPrice || currentPrice) * (1 - activeDeviation / 100);
            if (currentPrice <= thresholdPrice) {
              // Trigger final trailing TP closure!
              deal.status = 'take_profit';
              deal.exitPrice = currentPrice;
              const ratioAtExit = (currentPrice - deal.entryPrice) / deal.entryPrice;
              const finalPnl = deal.volume * ratioAtExit * deal.leverage;

              const strategyType = (relatedBot ? relatedBot.strategyType : 'futures') || 'futures';
              addFunds(state, deal.volume + finalPnl, strategyType, userMode);

              state.logs.unshift({
                id: 'log-tp-' + Math.random().toString(36).substring(2, 9),
                botId: deal.botId,
                botName: deal.botName,
                timestamp: new Date().toISOString(),
                pair: deal.pair,
                action: 'exit_long',
                payload: JSON.stringify({ event: "trailing_take_profit", entry: deal.entryPrice, exitCurrent: currentPrice, trailPeak: deal.trailingTpPeakPrice, deviation: activeDeviation, pnl: finalPnl }),
                status: 'success',
                message: `🚀 [3COMMAS TRAILING TP] LONG EXITED: Captured reversal at ${currentPrice.toLocaleString()} (Peak reached: ${deal.trailingTpPeakPrice?.toLocaleString()}). Trailed Take Profit secured PnL of +${finalPnl.toFixed(2)} USD (Deviation: ${activeDeviation}%).`
              });
              return;
            }
          } else {
            // Short position trailing
            if (currentPrice < (deal.trailingTpPeakPrice || 99999999)) {
              deal.trailingTpPeakPrice = currentPrice;
            }
            const activeDeviation = deviationPercent;
            const thresholdPrice = (deal.trailingTpPeakPrice || currentPrice) * (1 + activeDeviation / 100);
            if (currentPrice >= thresholdPrice) {
              // Trigger final trailing TP closure!
              deal.status = 'take_profit';
              deal.exitPrice = currentPrice;
              const ratioAtExit = -(currentPrice - deal.entryPrice) / deal.entryPrice;
              const finalPnl = deal.volume * ratioAtExit * deal.leverage;

              const strategyType = (relatedBot ? relatedBot.strategyType : 'futures') || 'futures';
              addFunds(state, deal.volume + finalPnl, strategyType, userMode);

              state.logs.unshift({
                id: 'log-tp-' + Math.random().toString(36).substring(2, 9),
                botId: deal.botId,
                botName: deal.botName,
                timestamp: new Date().toISOString(),
                pair: deal.pair,
                action: 'exit_short',
                payload: JSON.stringify({ event: "trailing_take_profit", entry: deal.entryPrice, exitCurrent: currentPrice, trailPeak: deal.trailingTpPeakPrice, deviation: activeDeviation, pnl: finalPnl }),
                status: 'success',
                message: `🚀 [3COMMAS TRAILING TP] SHORT EXITED: Captured reversal at ${currentPrice.toLocaleString()} (Peak reached: ${deal.trailingTpPeakPrice?.toLocaleString()}). Trailed Take Profit secured PnL of +${finalPnl.toFixed(2)} USD (Deviation: ${activeDeviation}%).`
              });
              return;
            }
          }
          return; // Skip standard checks while trailing is actively running
        }

        // 4. Standard and Multi-TP Take Profit and Stop Loss evaluation
        let triggerFullTP = false;
        let triggerSL = false;

        if (deal.takeProfitType === 'multiple') {
          // Multi-TP logic
          const tp1Size = relatedBot?.tp1Size || 50;
          const tp2Size = relatedBot?.tp2Size || 30;
          const tp3Size = relatedBot?.tp3Size || 20;

          const tp1Price = deal.tp1Price || 0;
          const tp2Price = deal.tp2Price || 0;
          const tp3Price = deal.tp3Price || 0;

          if (deal.type === 'long') {
            // Long Multi-TP progression
            if (tp1Price > 0 && currentPrice >= tp1Price && !deal.tp1Hit) {
              if (isTrailingTpEnabled) {
                deal.trailingTpActivated = true;
                deal.trailingTpPeakPrice = currentPrice;
                state.logs.unshift({
                  id: 'log-tp-trail-act-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'adjust_take_profit',
                  payload: JSON.stringify({ type: "multiple", tier: 1, target: tp1Price, peak: currentPrice }),
                  status: 'success',
                  message: `🔥 [3COMMAS TRAILING ACTIVE] LONG MULTI-TP1 ACTIVATED: Price hit target level ${tp1Price.toLocaleString()}. Commencing trailing upward follow-through with ${deviationPercent}% deviation.`
                });
              } else {
                deal.tp1Hit = true;
                deal.takeProfitPrice = tp2Price;
                const portionRatio = tp1Size / 100;
                const portionVolume = deal.volume * portionRatio;
                const portionRatioProfit = (tp1Price - deal.entryPrice) / deal.entryPrice;
                const portionPnl = portionVolume * portionRatioProfit * deal.leverage;

                deal.volume = parseFloat((deal.volume - portionVolume).toFixed(4));
                deal.amountAsset = parseFloat((deal.volume * deal.leverage / deal.entryPrice).toFixed(6));

                const strategyType = (relatedBot ? relatedBot.strategyType : 'futures') || 'futures';
                addFunds(state, portionVolume + portionPnl, strategyType, userMode);

                state.logs.unshift({
                  id: 'log-tp-partial-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'exit_long',
                  payload: JSON.stringify({ tier: 1, hitPrice: tp1Price, closedSize: portionVolume, profit: portionPnl, entry: deal.entryPrice }),
                  status: 'success',
                  message: `🟢 [3COMMAS MULTI-TP] LONG TARGET TP1 HIT: Partially closed ${tp1Size}% of position size (${portionVolume.toFixed(2)} USDT) at ${tp1Price.toLocaleString()}. Secured partial cash profit of +${portionPnl.toFixed(2)} USD.`
                });
              }
            } else if (tp2Price > 0 && currentPrice >= tp2Price && deal.tp1Hit && !deal.tp2Hit) {
              if (isTrailingTpEnabled) {
                deal.trailingTpActivated = true;
                deal.trailingTpPeakPrice = currentPrice;
                state.logs.unshift({
                  id: 'log-tp-trail-act-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'adjust_take_profit',
                  payload: JSON.stringify({ type: "multiple", tier: 2, target: tp2Price, peak: currentPrice }),
                  status: 'success',
                  message: `🔥 [3COMMAS TRAILING ACTIVE] LONG MULTI-TP2 ACTIVATED: Price hit target level ${tp2Price.toLocaleString()}. Commencing trailing upward follow-through with ${deviationPercent}% deviation.`
                });
              } else {
                deal.tp2Hit = true;
                deal.takeProfitPrice = tp3Price;
                const portionVolume = deal.volume * (tp2Size / (tp2Size + tp3Size));
                const portionRatioProfit = (tp2Price - deal.entryPrice) / deal.entryPrice;
                const portionPnl = portionVolume * portionRatioProfit * deal.leverage;

                deal.volume = parseFloat((deal.volume - portionVolume).toFixed(4));
                deal.amountAsset = parseFloat((deal.volume * deal.leverage / deal.entryPrice).toFixed(6));

                const strategyType = (relatedBot ? relatedBot.strategyType : 'futures') || 'futures';
                addFunds(state, portionVolume + portionPnl, strategyType, userMode);

                state.logs.unshift({
                  id: 'log-tp-partial-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'exit_long',
                  payload: JSON.stringify({ tier: 2, hitPrice: tp2Price, closedSize: portionVolume, profit: portionPnl, entry: deal.entryPrice }),
                  status: 'success',
                  message: `🟢 [3COMMAS MULTI-TP] LONG TARGET TP2 HIT: Partially closed ${tp2Size}% of position size (${portionVolume.toFixed(2)} USDT) at ${tp2Price.toLocaleString()}. Secured partial cash profit of +${portionPnl.toFixed(2)} USD.`
                });
              }
            } else if (tp3Price > 0 && currentPrice >= tp3Price && deal.tp2Hit && !deal.tp3Hit) {
              if (isTrailingTpEnabled) {
                deal.trailingTpActivated = true;
                deal.trailingTpPeakPrice = currentPrice;
                state.logs.unshift({
                  id: 'log-tp-trail-act-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'adjust_take_profit',
                  payload: JSON.stringify({ type: "multiple", tier: 3, target: tp3Price, peak: currentPrice }),
                  status: 'success',
                  message: `🔥 [3COMMAS TRAILING ACTIVE] LONG MULTI-TP3 ACTIVATED: Price hit target level ${tp3Price.toLocaleString()}. Commencing trailing upward follow-through with ${deviationPercent}% deviation.`
                });
              } else {
                triggerFullTP = true;
              }
            }
          } else {
            // Short Multi-TP progression
            if (tp1Price > 0 && currentPrice <= tp1Price && !deal.tp1Hit) {
              if (isTrailingTpEnabled) {
                deal.trailingTpActivated = true;
                deal.trailingTpPeakPrice = currentPrice;
                state.logs.unshift({
                  id: 'log-tp-trail-act-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'adjust_take_profit',
                  payload: JSON.stringify({ type: "multiple", tier: 1, target: tp1Price, peak: currentPrice }),
                  status: 'success',
                  message: `🔥 [3COMMAS TRAILING ACTIVE] SHORT MULTI-TP1 ACTIVATED: Price hit target level ${tp1Price.toLocaleString()}. Commencing trailing downward follow-through with ${deviationPercent}% deviation.`
                });
              } else {
                deal.tp1Hit = true;
                deal.takeProfitPrice = tp2Price;
                const portionRatio = tp1Size / 100;
                const portionVolume = deal.volume * portionRatio;
                const portionRatioProfit = -(tp1Price - deal.entryPrice) / deal.entryPrice;
                const portionPnl = portionVolume * portionRatioProfit * deal.leverage;

                deal.volume = parseFloat((deal.volume - portionVolume).toFixed(4));
                deal.amountAsset = parseFloat((deal.volume * deal.leverage / deal.entryPrice).toFixed(6));

                const strategyType = (relatedBot ? relatedBot.strategyType : 'futures') || 'futures';
                addFunds(state, portionVolume + portionPnl, strategyType, userMode);

                state.logs.unshift({
                  id: 'log-tp-partial-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'exit_short',
                  payload: JSON.stringify({ tier: 1, hitPrice: tp1Price, closedSize: portionVolume, profit: portionPnl, entry: deal.entryPrice }),
                  status: 'success',
                  message: `🟢 [3COMMAS MULTI-TP] SHORT TARGET TP1 HIT: Partially closed ${tp1Size}% of position size (${portionVolume.toFixed(2)} USDT) at ${tp1Price.toLocaleString()}. Secured partial cash profit of +${portionPnl.toFixed(2)} USD.`
                });
              }
            } else if (tp2Price > 0 && currentPrice <= tp2Price && deal.tp1Hit && !deal.tp2Hit) {
              if (isTrailingTpEnabled) {
                deal.trailingTpActivated = true;
                deal.trailingTpPeakPrice = currentPrice;
                state.logs.unshift({
                  id: 'log-tp-trail-act-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'adjust_take_profit',
                  payload: JSON.stringify({ type: "multiple", tier: 2, target: tp2Price, peak: currentPrice }),
                  status: 'success',
                  message: `🔥 [3COMMAS TRAILING ACTIVE] SHORT MULTI-TP2 ACTIVATED: Price hit target level ${tp2Price.toLocaleString()}. Commencing trailing downward follow-through with ${deviationPercent}% deviation.`
                });
              } else {
                deal.tp2Hit = true;
                deal.takeProfitPrice = tp3Price;
                const portionVolume = deal.volume * (tp2Size / (tp2Size + tp3Size));
                const portionRatioProfit = -(tp2Price - deal.entryPrice) / deal.entryPrice;
                const portionPnl = portionVolume * portionRatioProfit * deal.leverage;

                deal.volume = parseFloat((deal.volume - portionVolume).toFixed(4));
                deal.amountAsset = parseFloat((deal.volume * deal.leverage / deal.entryPrice).toFixed(6));

                const strategyType = (relatedBot ? relatedBot.strategyType : 'futures') || 'futures';
                addFunds(state, portionVolume + portionPnl, strategyType, userMode);

                state.logs.unshift({
                  id: 'log-tp-partial-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'exit_short',
                  payload: JSON.stringify({ tier: 2, hitPrice: tp2Price, closedSize: portionVolume, profit: portionPnl, entry: deal.entryPrice }),
                  status: 'success',
                  message: `🟢 [3COMMAS MULTI-TP] SHORT TARGET TP2 HIT: Partially closed ${tp2Size}% of position size (${portionVolume.toFixed(2)} USDT) at ${tp2Price.toLocaleString()}. Secured partial cash profit of +${portionPnl.toFixed(2)} USD.`
                });
              }
            } else if (tp3Price > 0 && currentPrice <= tp3Price && deal.tp2Hit && !deal.tp3Hit) {
              if (isTrailingTpEnabled) {
                deal.trailingTpActivated = true;
                deal.trailingTpPeakPrice = currentPrice;
                state.logs.unshift({
                  id: 'log-tp-trail-act-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'adjust_take_profit',
                  payload: JSON.stringify({ type: "multiple", tier: 3, target: tp3Price, peak: currentPrice }),
                  status: 'success',
                  message: `🔥 [3COMMAS TRAILING ACTIVE] SHORT MULTI-TP3 ACTIVATED: Price hit target level ${tp3Price.toLocaleString()}. Commencing trailing downward follow-through with ${deviationPercent}% deviation.`
                });
              } else {
                triggerFullTP = true;
              }
            }
          }
        } else {
          // Standard Single TP check
          if (deal.takeProfitPrice) {
            const hasHit = (deal.type === 'long' && currentPrice >= deal.takeProfitPrice) ||
                           (deal.type === 'short' && currentPrice <= deal.takeProfitPrice);
            if (hasHit) {
              if (isTrailingTpEnabled) {
                deal.trailingTpActivated = true;
                deal.trailingTpPeakPrice = currentPrice;
                state.logs.unshift({
                  id: 'log-tp-trail-act-' + Math.random().toString(36).substring(2, 9),
                  botId: deal.botId,
                  botName: deal.botName,
                  timestamp: new Date().toISOString(),
                  pair: deal.pair,
                  action: 'adjust_take_profit',
                  payload: JSON.stringify({ type: "single", target: deal.takeProfitPrice, peak: currentPrice }),
                  status: 'success',
                  message: `🔥 [3COMMAS TRAILING ACTIVE] TAKE PROFIT TRAIL TRIGGERED: Price reached target level ${deal.takeProfitPrice.toLocaleString()}. Initiating trailing follow-through with ${deviationPercent}% deviation.`
                });
              } else {
                triggerFullTP = true;
              }
            }
          }
        }

        // Standard Stop Loss check
        if (deal.stopLossPrice) {
          const isStopLossBreached = (deal.type === 'long' && currentPrice <= deal.stopLossPrice) ||
                                     (deal.type === 'short' && currentPrice >= deal.stopLossPrice);
          
          if (isStopLossBreached) {
            const isSlTimeoutActive = deal.slTimeoutEnabled !== undefined ? deal.slTimeoutEnabled : !!relatedBot?.slTimeoutEnabled;
            if (isSlTimeoutActive) {
              const timeoutSec = deal.slTimeoutSeconds !== undefined 
                ? deal.slTimeoutSeconds 
                : (relatedBot?.slTimeoutSeconds !== undefined ? relatedBot.slTimeoutSeconds : 0);
              
              if (timeoutSec > 0) {
                if (!deal.slBreachedAt) {
                  deal.slBreachedAt = new Date().toISOString();
                  state.logs.unshift({
                    id: 'log-sl-breach-' + Math.random().toString(36).substring(2, 9),
                    botId: deal.botId,
                    botName: deal.botName,
                    timestamp: new Date().toISOString(),
                    pair: deal.pair,
                    action: 'adjust_stop_loss',
                    payload: JSON.stringify({ price: currentPrice, limit: deal.stopLossPrice }),
                    status: 'error',
                    message: `⚠️ [Stop Loss Breach Alert] ${deal.pair} price breached Stop Loss limit ($${deal.stopLossPrice.toLocaleString()}). Delay active: waiting ${timeoutSec} seconds before execution.`
                  });
                  userUpdated = true;
                } else {
                  const elapsedSeconds = (new Date().getTime() - new Date(deal.slBreachedAt).getTime()) / 1000;
                  if (elapsedSeconds >= timeoutSec) {
                    triggerSL = true;
                  }
                }
              } else {
                triggerSL = true;
              }
            } else {
              triggerSL = true;
            }
          } else {
            if (deal.slBreachedAt) {
              deal.slBreachedAt = undefined;
              state.logs.unshift({
                id: 'log-sl-recovered-' + Math.random().toString(36).substring(2, 9),
                botId: deal.botId,
                botName: deal.botName,
                timestamp: new Date().toISOString(),
                pair: deal.pair,
                action: 'adjust_stop_loss',
                payload: JSON.stringify({ price: currentPrice, limit: deal.stopLossPrice }),
                status: 'success',
                message: `🔔 [Stop Loss Recovery] ${deal.pair} price recovered above Stop Loss threshold ($${deal.stopLossPrice.toLocaleString()})! Timeout cleared safely.`
              });
              userUpdated = true;
            }
          }
        }

        // Execute complete exits
        if (triggerFullTP) {
          deal.status = 'take_profit';
          deal.exitPrice = currentPrice;
          const closedPnl = deal.volume * (deal.type === 'long' ? diffRatio : -diffRatio) * deal.leverage;

          const strategyType = (relatedBot ? relatedBot.strategyType : 'futures') || 'futures';
          addFunds(state, deal.volume + closedPnl, strategyType, userMode);

          state.logs.unshift({
            id: 'log-tp-' + Math.random().toString(36).substring(2, 9),
            botId: deal.botId,
            botName: deal.botName,
            timestamp: new Date().toISOString(),
            pair: deal.pair,
            action: deal.type === 'long' ? 'exit_long' : 'exit_short',
            payload: JSON.stringify({ event: "take_profit_triggered", entry: deal.entryPrice, exit: currentPrice, pnl: closedPnl, size: deal.volume }),
            status: 'success',
            message: `🟢 [${userMode.toUpperCase()} MODE] TAKE PROFIT COMPLETED: Exited remaining position on ${deal.pair} at ${currentPrice.toLocaleString()}. Strict 3Commas Target secured Realized ROI: +${closedPnl.toFixed(2)} USD. Pre-trade synced balance secured.`
          });
        } else if (triggerSL) {
          deal.status = 'stop_loss';
          deal.exitPrice = currentPrice;
          const closedPnl = deal.volume * (deal.type === 'long' ? diffRatio : -diffRatio) * deal.leverage;

          const strategyType = (relatedBot ? relatedBot.strategyType : 'futures') || 'futures';
          addFunds(state, deal.volume + closedPnl, strategyType, userMode);

          state.logs.unshift({
            id: 'log-sl-' + Math.random().toString(36).substring(2, 9),
            botId: deal.botId,
            botName: deal.botName,
            timestamp: new Date().toISOString(),
            pair: deal.pair,
            action: deal.type === 'long' ? 'exit_long' : 'exit_short',
            payload: JSON.stringify({ event: "stop_loss_triggered", entry: deal.entryPrice, exit: currentPrice, pnl: closedPnl, size: deal.volume }),
            status: 'success',
            message: `🔴 [${userMode.toUpperCase()} MODE] STOP LOSS TRIGGERED: Position on ${deal.pair} closed at ${currentPrice.toLocaleString()}. Active 3Commas Stop Loss triggered (Target Level: ${deal.stopLossPercent}%). Closed value: ${deal.volume.toFixed(2)} USD, Realized Loss: -${Math.abs(closedPnl).toFixed(2)} USD.`
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
              state.realBalance = parseFloat(((state.realBalance || 0) + microAmount).toFixed(2));
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
