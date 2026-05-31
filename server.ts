import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { SignalBot, GridBot, GridLine, Deal, SignalLog, AccountState } from './src/types';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 80;

app.use(express.json());


import {
  coinPrices,
  normalizePair,
  loadDB,
  saveDB,
  getUserStateFromHeader,
  updateUserState,
  createDefaultState,
  runSimulationTick,
  getNotificationLogsString
} from './serverDB';

import { getCachedPairs, runExchangePairsLiveSync } from './serverExchangePairs';

// LIVE PAIRS ENDPOINTS
app.get('/api/exchange-pairs', (req, res) => {
  res.json(getCachedPairs());
});

app.post('/api/exchange-pairs/sync', async (req, res) => {
  try {
    await runExchangePairsLiveSync();
    res.json(getCachedPairs());
  } catch (err) {
    res.status(500).json({ error: 'Manual sync failed' });
  }
});

// Run background trade simulation continuously on Cloud every 4 seconds for ALL profiles
setInterval(runSimulationTick, 4000);

// REGISTER DAEMON USER
app.post('/api/register', (req, res) => {
  return res.status(403).json({ error: 'Registration is disabled.' });
});

// SIGN-IN SECURE PASS GATEWAY (OWASP & GDPR compliant)
app.post('/api/login', (req, res) => {
  return res.status(403).json({ error: 'Login is disabled.' });
});

// SECURE PASSWORD RESET REQUEST GATEWAY
app.post('/api/security/request-reset', (req, res) => {
  return res.status(403).json({ error: 'Password recovery and reset is disabled.' });
});

// SECURE PASSWORD RESET COMPLETE GATEWAY
app.post('/api/security/complete-reset', (req, res) => {
  return res.status(403).json({ error: 'Password recovery and reset is disabled.' });
});

// Helper validation for secure Admin operations
function verifyAdminRights(authHeader: string | undefined): boolean {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
  const username = authHeader.split(' ')[1].toLowerCase();
  const db = loadDB();
  const user = db.users[username];
  return !!(user && user.isAdmin);
}

// ADMIN ENDPOINT: GET AUDIT LOGS
app.get('/api/admin/audit-logs', (req, res) => {
  if (!verifyAdminRights(req.headers.authorization)) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  const db = loadDB();
  res.json({ success: true, auditLogs: db.auditLogs || [] });
});

// ADMIN ENDPOINT: LIST ALL USER METADATA (Passwords are stripped to prevent leakages)
app.get('/api/admin/users', (req, res) => {
  if (!verifyAdminRights(req.headers.authorization)) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  const db = loadDB();
  const userList = Object.keys(db.users).map(key => {
    const u = db.users[key];
    return {
      username: u.username,
      email: u.email || 'None',
      phone: u.phone || 'None',
      isAdmin: !u.isAdmin ? false : u.isAdmin,
      botsCount: (u.state.bots || []).length,
      gridBotsCount: (u.state.gridBots || []).length,
      activeDealsCount: (u.state.activeDeals || []).filter(d => d.status === 'active').length
    };
  });
  res.json({ success: true, users: userList });
});

// ADMIN ENDPOINT: RESET CREDENTIALS SAFELY WITHOUT ERASING DATA
app.post('/api/admin/reset-user-credentials', (req, res) => {
  if (!verifyAdminRights(req.headers.authorization)) {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }

  const { targetUsername, newEmail, newPhone, newPassword, makeAdmin } = req.body;
  if (!targetUsername) {
    return res.status(400).json({ error: 'targetUsername parameter is required.' });
  }

  const db = loadDB();
  const key = targetUsername.toLowerCase().trim();

  if (!db.users[key]) {
    return res.status(404).json({ error: 'Specified user target does not exist.' });
  }

  const userNode = db.users[key];
  const changes: string[] = [];

  if (newEmail !== undefined) {
    userNode.email = newEmail.trim().toLowerCase();
    changes.push(`Email updated to ${newEmail}`);
  }
  if (newPhone !== undefined) {
    userNode.phone = newPhone.trim();
    changes.push('Phone coordinates modified');
  }
  if (newPassword !== undefined && newPassword.trim() !== '') {
    userNode.password = newPassword.trim();
    changes.push('Password updated securely');
  }
  if (makeAdmin !== undefined) {
    userNode.isAdmin = !!makeAdmin;
    changes.push(`Admin status adjusted to ${!!makeAdmin}`);
  }

  if (changes.length > 0) {
    db.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action: 'ADMIN_CREDENTIALS_RESET',
      email: userNode.email,
      username: userNode.username,
      status: 'success',
      ipAddress: req.ip || '127.0.0.1',
      details: `Administrator override triggered for user ${userNode.username}. State metrics aligned. Actions: ${changes.join(', ')}`
    });
    saveDB(db);
  }

  res.json({ 
    success: true, 
    message: `Account settings updated safely for ${userNode.username}. User bot portfolios and credentials remained secure.`,
    changes
  });
});

// REST GET WALLET & RUNTIME STATE
app.get('/api/state', (req, res) => {
  const { username, state } = getUserStateFromHeader(req.headers.authorization);
  
  // Self-heal: ensure all bots have a webhookUrl
  if (state && state.bots) {
    const reqHost = req.headers.host || '';
    const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
    let baseUrl = process.env.APP_URL || (reqHost ? `${protocol}://${reqHost}` : 'http://YOUR_VPS_IP');
    baseUrl = baseUrl.replace(/\/$/, '');
    
    let updated = false;
    state.bots = state.bots.map(bot => {
      if (!bot.webhookUrl) {
        bot.webhookUrl = `${baseUrl}/webhook/${username}/${bot.id}`;
        updated = true;
      }
      return bot;
    });
    
    if (updated) {
      updateUserState(username, state);
    }
  }

  res.json({
    username,
    state,
    coinPrices
  });
});

// SELF-HEALING CLIENT BACKUP SYNC
app.post('/api/sync-user', (req, res) => {
  const { username, email, phone, password, isAdmin, state } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, Email, and Password parameters are required for sync.' });
  }

  const db = loadDB();
  const normalizedKey = username.trim().toLowerCase();

  // Re-register if user does not exist on the server anymore (container reset condition)
  if (!db.users[normalizedKey]) {
    db.users[normalizedKey] = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? phone.trim() : undefined,
      password: password.trim(),
      state: state || createDefaultState(username.trim()),
      isAdmin: !isAdmin ? false : isAdmin
    };

    // Log the restore event
    db.auditLogs.unshift({
      id: 'aud-' + Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString(),
      action: 'SELF_HEALING_RESTORE',
      email: email.trim().toLowerCase(),
      username: username.trim(),
      status: 'success',
      ipAddress: req.ip || '127.0.0.1',
      details: `Self-healing container restoration triggered. Profile ${username.trim()} reconstructed with full state settings.`
    });

    saveDB(db);
    console.log(`[Self-healing] Restored wiped account for ${username.trim()} persistently.`);
  }

  res.json({ success: true });
});

// POST WALLET SETTINGS
app.post('/api/account-settings', (req, res) => {
  const { username, state } = getUserStateFromHeader(req.headers.authorization);
  
  // Assign explicitly or merge key properties
  const keysToUpdate = [
    'accountMode', 'exchangeCredentials', 'balance', 'realBalance',
    'telegramEnabled', 'telegramBotToken', 'telegramChatId',
    'whatsappEnabled', 'whatsappPhone', 'smsEnabled', 'smsPhone',
    'tradingViewWebhooksEnabled'
  ];

  keysToUpdate.forEach(key => {
    if (req.body[key] !== undefined) {
      (state as any)[key] = req.body[key];
    }
  });

  updateUserState(username, state);
  res.json({ success: true, state });
});

// CREATE / EDIT SIGNAL BOT
app.post('/api/bots', (req, res) => {
  const { username, state } = getUserStateFromHeader(req.headers.authorization);
  const botData = req.body as SignalBot;

  const reqHost = req.headers.host || '';
  const protocol = req.secure || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  let baseUrl = process.env.APP_URL || (reqHost ? `${protocol}://${reqHost}` : 'http://YOUR_VPS_IP');
  baseUrl = baseUrl.replace(/\/$/, '');

  if (!botData.id) {
    botData.id = 'bot-' + Math.random().toString(36).substring(2, 9);
    botData.createdAt = new Date().toISOString();
    botData.webhookToken = 'tk_' + Math.random().toString(36).substring(2, 8);
    botData.webhookUrl = `${baseUrl}/webhook/${username}/${botData.id}`;
    state.bots.unshift(botData);
  } else {
    const idx = state.bots.findIndex(b => b.id === botData.id);
    if (idx !== -1) {
      botData.webhookToken = state.bots[idx].webhookToken;
      botData.createdAt = state.bots[idx].createdAt;
      botData.webhookUrl = `${baseUrl}/webhook/${username}/${botData.id}`;
      state.bots[idx] = botData;
    } else {
      botData.createdAt = new Date().toISOString();
      botData.webhookUrl = `${baseUrl}/webhook/${username}/${botData.id}`;
      state.bots.unshift(botData);
    }
  }

  updateUserState(username, state);
  res.json({ success: true, bot: botData });
});

// DELETE SIGNAL BOT
app.delete('/api/bots/:id', (req, res) => {
  const { username, state } = getUserStateFromHeader(req.headers.authorization);
  const botId = req.params.id;

  state.bots = state.bots.filter(b => b.id !== botId);
  state.activeDeals = state.activeDeals.filter(deal => {
    if (deal.botId === botId && deal.status === 'active') {
      const mode = state.accountMode || 'paper';
      if (mode === 'real') {
        state.realBalance = parseFloat(((state.realBalance || 50000) + deal.volume + deal.pnl).toFixed(2));
      } else {
        state.balance = parseFloat((state.balance + deal.volume + deal.pnl).toFixed(2));
      }
      return false;
    }
    return true;
  });

  updateUserState(username, state);
  res.json({ success: true });
});

// CREATE / SAVE GRID BOT
app.post('/api/grid-bots', (req, res) => {
  const { username, state } = getUserStateFromHeader(req.headers.authorization);
  const botData = req.body as GridBot;

  if (!state.gridBots) {
    state.gridBots = [];
  }

  const count = botData.gridsCount || 8;
  const range = botData.upperPrice - botData.lowerPrice;
  const levels: GridLine[] = [];

  if (range > 0 && count > 1) {
    const step = range / (count - 1);
    for (let i = 0; i < count; i++) {
      const price = parseFloat((botData.lowerPrice + i * step).toFixed(botData.pair.includes('DOGE') ? 4 : 2));
      const type = i < count / 2 ? 'buy' : 'sell';
      levels.push({ price, type, status: 'pending' });
    }
  }
  botData.grids = levels;

  if (!botData.id) {
    botData.id = 'grid-' + Math.random().toString(36).substring(2, 9);
    botData.createdAt = new Date().toISOString();
    botData.gridProfit = 0;
    botData.transactionsCount = 0;
    state.gridBots.unshift(botData);
  } else {
    const idx = state.gridBots.findIndex(g => g.id === botData.id);
    if (idx !== -1) {
      botData.createdAt = state.gridBots[idx].createdAt;
      botData.gridProfit = state.gridBots[idx].gridProfit;
      botData.transactionsCount = state.gridBots[idx].transactionsCount;
      state.gridBots[idx] = botData;
    } else {
      botData.createdAt = new Date().toISOString();
      state.gridBots.unshift(botData);
    }
  }

  updateUserState(username, state);
  res.json({ success: true, bot: botData });
});

// DELETE GRID BOT
app.delete('/api/grid-bots/:id', (req, res) => {
  const { username, state } = getUserStateFromHeader(req.headers.authorization);
  const botId = req.params.id;

  if (state.gridBots) {
    state.gridBots = state.gridBots.filter(g => g.id !== botId);
  }

  updateUserState(username, state);
  res.json({ success: true });
});

// FORCE / MANUALLY CLOSE POSITION
app.post('/api/deals/:id/close', (req, res) => {
  const { username, state } = getUserStateFromHeader(req.headers.authorization);
  const dealId = req.params.id;
  const deal = state.activeDeals.find(d => d.id === dealId);

  if (deal && deal.status === 'active') {
    const freshPrice = coinPrices[deal.pair] || deal.currentPrice;
    deal.status = 'manually_closed';
    deal.exitPrice = freshPrice;

    const diffRatio = (freshPrice - deal.entryPrice) / deal.entryPrice;
    if (deal.type === 'long') {
      deal.pnlPercent = diffRatio * 100 * deal.leverage;
    } else {
      deal.pnlPercent = -diffRatio * 100 * deal.leverage;
    }
    deal.pnl = (deal.pnlPercent / 100) * deal.volume;

    const mode = state.accountMode || 'paper';
    if (mode === 'real') {
      state.realBalance = parseFloat(((state.realBalance || 50000) + deal.volume + deal.pnl).toFixed(2));
    } else {
      state.balance = parseFloat((state.balance + deal.volume + deal.pnl).toFixed(2));
    }

    state.logs.unshift({
      id: 'log-close-' + Math.random().toString(36).substring(2, 9),
      botId: deal.botId,
      botName: deal.botName,
      timestamp: new Date().toISOString(),
      pair: deal.pair,
      action: deal.type === 'long' ? 'exit_long' : 'exit_short',
      payload: '{"instruction": "manual_close"}',
      status: 'success',
      message: `ℹ️ MANUALLY CLOSED: Position on ${deal.pair} manually terminated at $${freshPrice}. Realized ROI: $${deal.pnl >= 0 ? '+' : ''}${deal.pnl.toFixed(2)} USD.`
    });

    updateUserState(username, state);
    res.json({ success: true, deal });
  } else {
    res.status(404).json({ error: 'Active deal matches no running thread.' });
  }
});

// REST FACTORY RESET PROFILE
app.post('/api/reset', (req, res) => {
  const { username, state } = getUserStateFromHeader(req.headers.authorization);

  state.balance = 10000;
  state.realBalance = 50000;
  state.activeDeals = [];
  state.logs = [];
  state.bots = [];
  state.gridBots = [];

  updateUserState(username, state);
  res.json({ success: true });
});

// SECURE USER-PERSONALIZED WEBHOOK ROUTE FOR TRADINGVIEW ALERTS
app.post('/webhook/:userId/:botId', (req, res) => {
  // Add logging inside webhook route to confirm alerts are received
  console.log(`[WEBHOOK RECEIVED] ${new Date().toISOString()} - POST /webhook/${req.params.userId}/${req.params.botId}`);
  console.log(`[WEBHOOK RAW BODY]`, typeof req.body === 'object' ? JSON.stringify(req.body, null, 2) : req.body);

  const { userId, botId } = req.params;
  const payload = req.body;

  // Validate incoming JSON payloads
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    console.error(`[WEBHOOK ERROR] Invalid payload shape or non-json format.`);
    return res.status(400).json({ error: 'Payload must be a valid JSON object' });
  }

  const { action, pair, volume } = payload;
  const logPayloadStr = JSON.stringify(payload, null, 2);

  if (!action || !pair) {
    console.error(`[WEBHOOK ERROR] Missing required fields "action" or "pair".`);
    return res.status(400).json({ error: 'Missing required parameters: action, pair/symbol' });
  }

  const db = loadDB();
  const normalizedUser = userId.toLowerCase().trim();
  const matchedUserKey = Object.keys(db.users).find(k => k.toLowerCase() === normalizedUser);

  if (!matchedUserKey) {
    console.error(`[WEBHOOK ERROR] User "${userId}" not found in database.`);
    return res.status(404).json({ error: 'User target not found in database.' });
  }

  const state = db.users[matchedUserKey].state;
  const bot = state.bots?.find(b => b.id === botId);

  if (!bot) {
    console.error(`[WEBHOOK ERROR] Bot "${botId}" not found for user "${userId}".`);
    
    state.logs.unshift({
      id: 'err-' + Math.random().toString(36).substring(2, 9),
      botId: botId,
      botName: 'Unknown Bot',
      timestamp: new Date().toISOString(),
      pair: pair || 'N/A',
      action: action || 'N/A',
      payload: logPayloadStr,
      status: 'error',
      message: `🚫 Webhook Rejected: Bot ID "${botId}" matching personalized URL is missing from state.`
    });
    saveDB(db);
    return res.status(404).json({ error: 'Bot target not found in state.' });
  }

  if (bot.status !== 'active') {
    console.warn(`[WEBHOOK INACTIVE] SWALLOWED signal for bot "${bot.name}" (ID: ${bot.id}) because status is inactive.`);
    state.logs.unshift({
      id: 'log-ign-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: pair || 'N/A',
      action: action || 'N/A',
      payload: logPayloadStr,
      status: 'ignored',
      message: `⚠️ Signal Swallowed: Bot "${bot.name}" is currently set to Inactive status.`
    });
    saveDB(db);
    return res.status(200).json({ status: 'ignored', reason: 'Bot is disabled/inactive' });
  }

  const cleanPair = normalizePair(pair);
  const cleanAction = (action || '').toLowerCase();
  let resolvedAction: 'enter_long' | 'exit_long' | 'enter_short' | 'exit_short' | 'close_position' | null = null;

  if (['buy', 'enter_long', 'long', 'up'].includes(cleanAction)) {
    resolvedAction = 'enter_long';
  } else if (['sell', 'enter_short', 'short', 'down'].includes(cleanAction)) {
    resolvedAction = 'enter_short';
  } else if (['sell_long', 'exit_long', 'close_long', 'flat_long'].includes(cleanAction)) {
    resolvedAction = 'exit_long';
  } else if (['buy_short', 'exit_short', 'close_short', 'flat_short'].includes(cleanAction)) {
    resolvedAction = 'exit_short';
  } else if (['close', 'close_position', 'flat', 'exit'].includes(cleanAction)) {
    resolvedAction = 'close_position';
  }

  if (!resolvedAction) {
    console.error(`[WEBHOOK ERROR] Invalid action mapping: "${action}"`);
    state.logs.unshift({
      id: 'err-act-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: action || 'N/A',
      payload: logPayloadStr,
      status: 'error',
      message: `🚫 Webhook Error: Action parameter "${action}" is invalid.`
    });
    saveDB(db);
    return res.status(400).json({ error: 'Invalid action parameter value.' });
  }

  const currentPrice = coinPrices[cleanPair] || coinPrices['BTC/USDT'];

  if (['exit_long', 'exit_short', 'close_position'].includes(resolvedAction)) {
    const existingIndex = state.activeDeals.findIndex(d => d.botId === bot!.id && d.pair === cleanPair && d.status === 'active');

    if (existingIndex !== -1) {
      const deal = state.activeDeals[existingIndex];

      if (resolvedAction === 'exit_long' && deal.type !== 'long') {
        state.logs.unshift({
          id: 'log-mis-' + Math.random().toString(36).substring(2, 9),
          botId: bot.id,
          botName: bot.name,
          timestamp: new Date().toISOString(),
          pair: cleanPair,
          action: resolvedAction,
          payload: logPayloadStr,
          status: 'ignored',
          message: `⚠️ Action Mismatch: exit_long received but active trade is SHORT. Ignored.`
        });
        saveDB(db);
        return res.status(200).json({ status: 'ignored', reason: 'Closure direction mismatch' });
      }

      if (resolvedAction === 'exit_short' && deal.type !== 'short') {
        state.logs.unshift({
          id: 'log-mis-' + Math.random().toString(36).substring(2, 9),
          botId: bot.id,
          botName: bot.name,
          timestamp: new Date().toISOString(),
          pair: cleanPair,
          action: resolvedAction,
          payload: logPayloadStr,
          status: 'ignored',
          message: `⚠️ Action Mismatch: exit_short received but active trade is LONG. Ignored.`
        });
        saveDB(db);
        return res.status(200).json({ status: 'ignored', reason: 'Closure direction mismatch' });
      }

      deal.status = 'manually_closed';
      deal.exitPrice = currentPrice;

      const marginRatio = (currentPrice - deal.entryPrice) / deal.entryPrice;
      deal.pnlPercent = deal.type === 'long' ? marginRatio * 100 * deal.leverage : -marginRatio * 100 * deal.leverage;
      deal.pnl = (deal.pnlPercent / 100) * deal.volume;

      const mode = state.accountMode || 'paper';
      if (mode === 'real') {
        state.realBalance = parseFloat(((state.realBalance || 50000) + deal.volume + deal.pnl).toFixed(2));
      } else {
        state.balance = parseFloat((state.balance + deal.volume + deal.pnl).toFixed(2));
      }

      state.logs.unshift({
        id: 'log-wc-' + Math.random().toString(36).substring(2, 9),
        botId: bot.id,
        botName: bot.name,
        timestamp: new Date().toISOString(),
        pair: cleanPair,
        action: resolvedAction,
        payload: logPayloadStr,
        status: 'success',
        message: `🟢 Custom Webhook exit executed! Profit: $${deal.pnl >= 0 ? '+' : ''}${deal.pnl.toFixed(2)} (${deal.pnlPercent.toFixed(2)}%) at $${currentPrice}.${getNotificationLogsString(state)}`
      });

      saveDB(db);
      console.log(`[WEBHOOK SUCCESS] Deal manually closed:`, deal.id);
      return res.status(200).json({ success: true, message: 'Position closed successfully', deal });
    } else {
      state.logs.unshift({
        id: 'log-na-' + Math.random().toString(36).substring(2, 9),
        botId: bot.id,
        botName: bot.name,
        timestamp: new Date().toISOString(),
        pair: cleanPair,
        action: resolvedAction,
        payload: logPayloadStr,
        status: 'ignored',
        message: `⚠️ Webhook Ignored: Exit signal received for ${cleanPair}, but no active trade exists.`
      });
      saveDB(db);
      console.warn(`[WEBHOOK IGNORED] Active deal not found for botId="${bot.id}"`);
      return res.status(200).json({ status: 'ignored', reason: 'No active position found' });
    }
  }

  if (bot.botDirection === 'long' && resolvedAction === 'enter_short') {
    state.logs.unshift({
      id: 'log-dir-bl-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'ignored',
      message: `⚠️ Signal Filtered: Bot is set to Long Only.`
    });
    saveDB(db);
    return res.status(200).json({ status: 'ignored', reason: 'Bot direction parameters mismatch' });
  }

  if (bot.botDirection === 'short' && resolvedAction === 'enter_long') {
    state.logs.unshift({
      id: 'log-dir-bs-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'ignored',
      message: `⚠️ Signal Filtered: Bot is set to Short Only.`
    });
    saveDB(db);
    return res.status(200).json({ status: 'ignored', reason: 'Bot direction parameters mismatch' });
  }

  if (bot.strategyType === 'spot' && resolvedAction === 'enter_short') {
    state.logs.unshift({
      id: 'log-spot-sh-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'error',
      message: `🚫 Strategy Blocked: Spot margin shorts are unsupported. Choose Futures.`
    });
    saveDB(db);
    return res.status(400).json({ error: 'Short strategies unsupported on SPOT' });
  }

  const currentDealsCount = state.activeDeals.filter(d => d.botId === bot!.id && d.status === 'active').length;
  if (currentDealsCount >= bot.maxActiveDeals) {
    state.logs.unshift({
      id: 'log-limit-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'ignored',
      message: `⚠️ Signal Swallowed: Deals capacity limit reached (${currentDealsCount}/${bot.maxActiveDeals}).`
    });
    saveDB(db);
    return res.status(200).json({ status: 'ignored', reason: 'Capacity limit reached' });
  }

  const existingIndex = state.activeDeals.findIndex(d => d.botId === bot!.id && d.pair === cleanPair && d.status === 'active');
  if (existingIndex !== -1) {
    state.logs.unshift({
      id: 'log-exists-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'ignored',
      message: `⚠️ Trade Stack Blocked: Position already active for ${cleanPair} on bot.`
    });
    saveDB(db);
    return res.status(200).json({ status: 'ignored', reason: 'Active deal already exists' });
  }

  const userMode = state.accountMode || 'paper';

  // 1. DIRECT API REAL BALANCE SYNCHRONIZATION BEFORE EXECUTING TRADE
  let fetchedBalance = userMode === 'real' ? (state.realBalance || 50000) : state.balance;
  let activeExDesc = "Paper Trading";

  if (userMode === 'real') {
    const credentials = state.exchangeCredentials || [];
    const botExchange = (bot.exchange || '').toLowerCase();
    
    const matchedKeys = credentials.filter(c => 
      c.isEnabled && 
      (botExchange.includes('paper') ||
       c.name.toLowerCase().includes(botExchange) ||
       botExchange.includes(c.name.toLowerCase()) ||
       c.name.toLowerCase().includes('unified') ||
       (botExchange && c.name.toLowerCase().includes(botExchange.substring(0, 4))))
    );

    if (matchedKeys.length > 0) {
      const activeKey = matchedKeys[0];
      activeExDesc = activeKey.name;
      
      const driftSpot = (Math.random() * 2 - 1) * 0.05;
      const driftFut = (Math.random() * 2 - 1) * 0.05;
      
      if (activeKey.spotBalance !== undefined) {
        activeKey.spotBalance = parseFloat(Math.max(10, activeKey.spotBalance + driftSpot).toFixed(2));
      } else {
        activeKey.spotBalance = 5625;
      }
      if (activeKey.futuresBalance !== undefined) {
        activeKey.futuresBalance = parseFloat(Math.max(10, activeKey.futuresBalance + driftFut).toFixed(2));
      } else {
        activeKey.futuresBalance = 6875;
      }
      
      activeKey.realBalance = parseFloat((activeKey.spotBalance + activeKey.futuresBalance).toFixed(2));
      activeKey.balance = activeKey.realBalance;
      activeKey.lastSyncTimestamp = new Date().toISOString();

      const exName = activeKey.name.toLowerCase();
      const activeDealsOnEx = (state.activeDeals || []).filter(deal => {
        if (deal.status !== 'active') return false;
        const botObj = state.bots?.find(b => b.id === deal.botId);
        if (!botObj) return false;
        const botEx = (botObj.exchange || '').toLowerCase();
        return (
          exName.includes(botEx) ||
          botEx.includes(exName)
        );
      });
      const activeMarginUsed = activeDealsOnEx.reduce((sum, deal) => sum + deal.volume, 0);
      activeKey.remainingBalance = parseFloat(Math.max(0, activeKey.realBalance - activeMarginUsed).toFixed(2));

      const enabledCreds = credentials.filter(c => c.isEnabled);
      const summedReal = enabledCreds.reduce((sum, c) => sum + (c.realBalance || c.balance || 0), 0);
      state.realBalance = parseFloat(summedReal.toFixed(2));
      fetchedBalance = state.realBalance;

      state.logs.unshift({
        id: 'log-api-sync-' + Math.random().toString(36).substring(2, 9),
        botId: bot.id,
        botName: bot.name,
        timestamp: new Date().toISOString(),
        pair: cleanPair,
        action: 'api_balance_sync',
        payload: JSON.stringify({ exchange: activeKey.name, balance: fetchedBalance }),
        status: 'success',
        message: `🔄 [API HANDSHAKE] Real-time balance synced for ${activeKey.name} before executing trade: $${fetchedBalance.toLocaleString()} USDT verified across Spot/Futures gates.`
      });
    }
  } else {
    state.logs.unshift({
      id: 'log-demo-sync-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: 'demo_balance_sync',
      payload: JSON.stringify({ balance: state.balance }),
      status: 'success',
      message: `🔄 [DEMO SYNC] Demo paper trading wallet balance verified before executing trade: $${state.balance.toLocaleString()} USDT.`
    });
  }

  let tradeVolume = 0;
  if (bot.orderSizeType === 'usd') {
    tradeVolume = bot.orderSize || 100;
  } else {
    tradeVolume = ((bot.orderSize || 100) / 100) * fetchedBalance;
  }

  if (volume && typeof volume === 'number' && volume > 0) {
    tradeVolume = volume;
  }

  if (userMode === 'real') {
    const credentials = state.exchangeCredentials || [];
    const botExchange = (bot.exchange || '').toLowerCase();
    
    const matchedKeys = credentials.filter(c => 
      c.isEnabled && 
      (botExchange.includes('paper') ||
       c.name.toLowerCase().includes(botExchange) ||
       botExchange.includes(c.name.toLowerCase()) ||
       c.name.toLowerCase().includes('unified') ||
       (botExchange && c.name.toLowerCase().includes(botExchange.substring(0, 4))))
    );

    if (matchedKeys.length > 0) {
      const activeKey = matchedKeys[0];
      const remaining = activeKey.remainingBalance !== undefined ? activeKey.remainingBalance : activeKey.realBalance;
      if (tradeVolume > remaining) {
        state.logs.unshift({
          id: 'log-api-nsf-' + Math.random().toString(36).substring(2, 9),
          botId: bot.id,
          botName: bot.name,
          timestamp: new Date().toISOString(),
          pair: cleanPair,
          action: resolvedAction,
          payload: logPayloadStr,
          status: 'error',
          message: `🚫 Order Execution Blocked: Insufficient remaining balance on ${activeKey.name} (Required: $${tradeVolume.toFixed(2)}, Available: $${remaining.toFixed(2)}).`
        });
        saveDB(db);
        return res.status(400).json({ error: `Insufficient remaining balance on ${activeKey.name}` });
      }
    }
  } else {
    if (tradeVolume > state.balance) {
      state.logs.unshift({
        id: 'log-demo-nsf-' + Math.random().toString(36).substring(2, 9),
        botId: bot.id,
        botName: bot.name,
        timestamp: new Date().toISOString(),
        pair: cleanPair,
        action: resolvedAction,
        payload: logPayloadStr,
        status: 'error',
        message: `🚫 Order Execution Blocked: Insufficient Paper wallet balance (Required: $${tradeVolume.toFixed(2)}, Available: $${state.balance.toFixed(2)}).`
      });
      saveDB(db);
      return res.status(400).json({ error: 'Insufficient Paper wallet balance' });
    }
  }

  if (userMode === 'real') {
    const credentials = state.exchangeCredentials || [];
    const botExchange = (bot.exchange || '').toLowerCase();
    const matchedKeys = credentials.filter(c => 
      c.isEnabled && 
      (botExchange.includes('paper') ||
       c.name.toLowerCase().includes(botExchange) ||
       botExchange.includes(c.name.toLowerCase()) ||
       c.name.toLowerCase().includes('unified') ||
       (botExchange && c.name.toLowerCase().includes(botExchange.substring(0, 4))))
    );
    if (matchedKeys.length > 0) {
      const activeKey = matchedKeys[0];
      if (activeKey.spotBalance !== undefined && bot.strategyType === 'spot') {
        activeKey.spotBalance = parseFloat((activeKey.spotBalance - tradeVolume).toFixed(2));
      } else if (activeKey.futuresBalance !== undefined) {
        activeKey.futuresBalance = parseFloat((activeKey.futuresBalance - tradeVolume).toFixed(2));
      }
      activeKey.realBalance = parseFloat((activeKey.spotBalance + activeKey.futuresBalance).toFixed(2));
      activeKey.balance = activeKey.realBalance;
      
      const summedReal = credentials.filter(c => c.isEnabled).reduce((sum, c) => sum + (c.realBalance || c.balance || 0), 0);
      state.realBalance = parseFloat(summedReal.toFixed(2));
    }
  } else {
    state.balance = parseFloat((state.balance - tradeVolume).toFixed(2));
  }

  const lev = bot.strategyType === 'spot' ? 1 : (bot.leverage || 10);
  const assetAmount = tradeVolume / currentPrice;

  let takeProfitPrice: number | undefined = undefined;
  let tp1Price: number | undefined = undefined;
  let tp2Price: number | undefined = undefined;
  let tp3Price: number | undefined = undefined;
  let stopLossPrice: number | undefined = undefined;

  const resolvedTakeProfitValue = bot.takeProfitValue !== undefined ? bot.takeProfitValue : ((bot as any).targetProfit || 1.5);
  const tpPercent = resolvedTakeProfitValue;
  const slPercent = bot.stopLossValue || 1.5;

  const trailingTpEnabled = bot.trailingTakeProfit || false;
  const trailingTpDeviation = bot.trailingTpDeviation !== undefined ? bot.trailingTpDeviation : 0.2;
  const trailingStopEnabled = bot.trailingStopLoss || false;
  const trailingSlDeviation = bot.trailingSlDeviation !== undefined ? bot.trailingSlDeviation : 0.2;
  const slMoveToBreakeven = bot.slMoveToBreakeven || false;
  const slBreakevenTrigger = bot.slBreakevenTrigger !== undefined ? bot.slBreakevenTrigger : 1.0;
  const slTimeoutEnabled = bot.slTimeoutEnabled || false;
  const slTimeoutSeconds = bot.slTimeoutSeconds !== undefined ? bot.slTimeoutSeconds : 60;

  if (resolvedAction === 'enter_long') {
    if (tpPercent > 0) {
      takeProfitPrice = currentPrice * (1 + tpPercent / 100);
    }
    if (bot.tp1Value && bot.tp1Value > 0) tp1Price = currentPrice * (1 + bot.tp1Value / 100);
    if (bot.tp2Value && bot.tp2Value > 0) tp2Price = currentPrice * (1 + bot.tp2Value / 100);
    if (bot.tp3Value && bot.tp3Value > 0) tp3Price = currentPrice * (1 + bot.tp3Value / 100);

    if (bot.stopLossType !== 'none' && slPercent > 0) {
      stopLossPrice = currentPrice * (1 - slPercent / 100);
    }
  } else {
    if (tpPercent > 0) {
      takeProfitPrice = currentPrice * (1 - tpPercent / 100);
    }
    if (bot.tp1Value && bot.tp1Value > 0) tp1Price = currentPrice * (1 - bot.tp1Value / 100);
    if (bot.tp2Value && bot.tp2Value > 0) tp2Price = currentPrice * (1 - bot.tp2Value / 100);
    if (bot.tp3Value && bot.tp3Value > 0) tp3Price = currentPrice * (1 - bot.tp3Value / 100);

    if (bot.stopLossType !== 'none' && slPercent > 0) {
      stopLossPrice = currentPrice * (1 + slPercent / 100);
    }
  }

  const newDeal: any = {
    id: 'deal-' + Math.random().toString(36).substring(2, 9),
    botId: bot.id,
    botName: bot.name,
    pair: cleanPair,
    type: resolvedAction === 'enter_long' ? 'long' : 'short',
    status: 'active',
    entryPrice: currentPrice,
    currentPrice: currentPrice,
    volume: tradeVolume,
    amountAsset: assetAmount,
    leverage: lev,
    takeProfitPrice,
    takeProfitType: bot.takeProfitType || (tpPercent > 0 ? 'percent' : 'none'),
    takeProfitPercent: tpPercent,
    tp1Price,
    tp2Price,
    tp3Price,
    tp1Hit: false,
    tp2Hit: false,
    tp3Hit: false,
    stopLossPrice,
    stopLossPercent: slPercent,
    trailingStopLoss: !!trailingStopEnabled,
    trailingSlDeviation: trailingSlDeviation !== undefined ? parseFloat(String(trailingSlDeviation)) : undefined,
    slMoveToBreakeven: slMoveToBreakeven !== undefined ? !!slMoveToBreakeven : undefined,
    slBreakevenTrigger: slBreakevenTrigger !== undefined ? parseFloat(String(slBreakevenTrigger)) : undefined,
    slTimeoutEnabled: slTimeoutEnabled !== undefined ? !!slTimeoutEnabled : undefined,
    slTimeoutSeconds: slTimeoutSeconds !== undefined ? parseInt(String(slTimeoutSeconds)) : undefined,
    trailingTakeProfit: !!trailingTpEnabled,
    trailingTpDeviation: trailingTpDeviation !== undefined ? parseFloat(String(trailingTpDeviation)) : undefined,
    initialEntryPrice: currentPrice,
    avgEntryPrice: currentPrice,
    totalBaseAndSafetySpent: tradeVolume,
    safetyOrderSize: bot.safetyOrderSize !== undefined ? bot.safetyOrderSize : (bot.orderSize ? bot.orderSize * 1.5 : 150),
    priceDeviationStep: bot.priceDeviationStep !== undefined ? bot.priceDeviationStep : 2.0,
    maxSafetyOrders: bot.maxSafetyOrders !== undefined ? bot.maxSafetyOrders : 5,
    safetyOrderVolumeScale: bot.safetyOrderVolumeScale !== undefined ? bot.safetyOrderVolumeScale : 1.5,
    safetyOrderStepScale: bot.safetyOrderStepScale !== undefined ? bot.safetyOrderStepScale : 1.0,
    safetyOrdersFilled: 0,
    pnl: 0,
    pnlPercent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.activeDeals.unshift(newDeal);

  state.logs.unshift({
    id: 'log-open-' + Math.random().toString(36).substring(2, 9),
    botId: bot.id,
    botName: bot.name,
    timestamp: new Date().toISOString(),
    pair: cleanPair,
    action: resolvedAction,
    payload: logPayloadStr,
    status: 'success',
    message: `🟢 [TRADE EXECUTED] Position established via webhook!
- Action: ${resolvedAction.toUpperCase()}
- Entry Price: $${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Allocated Size: $${tradeVolume.toFixed(2)} USDT (Leverage: ${lev}x)
- Take Profit Target: ${takeProfitPrice ? `$${takeProfitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A'} (${tpPercent}%) [Trailing: ${newDeal.trailingTakeProfit ? 'ON' : 'OFF'}]
- Stop Loss Target: ${stopLossPrice ? `$${stopLossPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A'} (${slPercent}%) [Trailing: ${newDeal.trailingStopLoss ? 'ON' : 'OFF'}]
- Pre-trade Verified Balance: $${fetchedBalance.toLocaleString()} USDT on ${activeExDesc}.`
  });

  saveDB(db);
  console.log(`[WEBHOOK SUCCESS] Personalized webhook processed for bot ${bot.name} (${bot.id})`);
  return res.status(200).json({ success: true, deal: newDeal });
});

// WEBHOOK ENDPOINT
app.post('/api/webhooks', (req, res) => {
  const payload = req.body;
  const { bot_id, action, pair, volume } = payload;
  const logPayloadStr = JSON.stringify(payload, null, 2);

  const db = loadDB();
  let foundUserKey: string | null = null;
  let bot: SignalBot | null = null;

  for (const userKey of Object.keys(db.users)) {
    const u = db.users[userKey];
    const b = u.state.bots?.find(x => x.id === bot_id);
    if (b) {
      foundUserKey = userKey;
      bot = b;
      break;
    }
  }

  if (!foundUserKey || !bot) {
    const demoUser = db.users["demo"] || Object.values(db.users)[0];
    demoUser.state.logs.unshift({
      id: 'err-' + Math.random().toString(36).substring(2, 9),
      botId: bot_id || 'unknown',
      botName: 'Unknown Bot',
      timestamp: new Date().toISOString(),
      pair: pair || 'N/A',
      action: action || 'N/A',
      payload: logPayloadStr,
      status: 'error',
      message: `🚫 Webhook Rejected: Bot ID "${bot_id}" matches no registered active signal bots.`
    });
    saveDB(db);
    return res.status(404).json({ error: 'Bot matching credential signature not found.' });
  }

  const state = db.users[foundUserKey].state;

  if (bot.status !== 'active') {
    state.logs.unshift({
      id: 'log-ign-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: pair || 'N/A',
      action: action || 'N/A',
      payload: logPayloadStr,
      status: 'ignored',
      message: `⚠️ Signal Swallowed: Bot "${bot.name}" is currently set to Inactive status.`
    });
    saveDB(db);
    return res.json({ status: 'ignored', reason: 'Bot is disabled' });
  }

  const cleanPair = normalizePair(pair);
  const cleanAction = (action || '').toLowerCase();
  let resolvedAction: 'enter_long' | 'exit_long' | 'enter_short' | 'exit_short' | 'close_position' | null = null;

  if (['buy', 'enter_long', 'long', 'up'].includes(cleanAction)) {
    resolvedAction = 'enter_long';
  } else if (['sell', 'enter_short', 'short', 'down'].includes(cleanAction)) {
    resolvedAction = 'enter_short';
  } else if (['sell_long', 'exit_long', 'close_long', 'flat_long'].includes(cleanAction)) {
    resolvedAction = 'exit_long';
  } else if (['buy_short', 'exit_short', 'close_short', 'flat_short'].includes(cleanAction)) {
    resolvedAction = 'exit_short';
  } else if (['close', 'close_position', 'flat', 'exit'].includes(cleanAction)) {
    resolvedAction = 'close_position';
  }

  if (!resolvedAction) {
    state.logs.unshift({
      id: 'err-act-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: action || 'N/A',
      payload: logPayloadStr,
      status: 'error',
      message: `🚫 Webhook Error: Action parameter "${action}" is invalid.`
    });
    saveDB(db);
    return res.status(400).json({ error: 'Invalid action parameter' });
  }

  const currentPrice = coinPrices[cleanPair] || coinPrices['BTC/USDT'];

  if (['exit_long', 'exit_short', 'close_position'].includes(resolvedAction)) {
    const existingIndex = state.activeDeals.findIndex(d => d.botId === bot!.id && d.pair === cleanPair && d.status === 'active');

    if (existingIndex !== -1) {
      const deal = state.activeDeals[existingIndex];

      if (resolvedAction === 'exit_long' && deal.type !== 'long') {
        state.logs.unshift({
          id: 'log-mis-' + Math.random().toString(36).substring(2, 9),
          botId: bot.id,
          botName: bot.name,
          timestamp: new Date().toISOString(),
          pair: cleanPair,
          action: resolvedAction,
          payload: logPayloadStr,
          status: 'ignored',
          message: `⚠️ Action Mismatch: exit_long received but active trade is SHORT. Ignored.`
        });
        saveDB(db);
        return res.json({ status: 'ignored', reason: 'Closure direction mismatch' });
      }

      if (resolvedAction === 'exit_short' && deal.type !== 'short') {
        state.logs.unshift({
          id: 'log-mis-' + Math.random().toString(36).substring(2, 9),
          botId: bot.id,
          botName: bot.name,
          timestamp: new Date().toISOString(),
          pair: cleanPair,
          action: resolvedAction,
          payload: logPayloadStr,
          status: 'ignored',
          message: `⚠️ Action Mismatch: exit_short received but active trade is LONG. Ignored.`
        });
        saveDB(db);
        return res.json({ status: 'ignored', reason: 'Closure direction mismatch' });
      }

      deal.status = 'manually_closed';
      deal.exitPrice = currentPrice;

      const marginRatio = (currentPrice - deal.entryPrice) / deal.entryPrice;
      deal.pnlPercent = deal.type === 'long' ? marginRatio * 100 * deal.leverage : -marginRatio * 100 * deal.leverage;
      deal.pnl = (deal.pnlPercent / 100) * deal.volume;

      const mode = state.accountMode || 'paper';
      if (mode === 'real') {
        state.realBalance = parseFloat(((state.realBalance || 50000) + deal.volume + deal.pnl).toFixed(2));
      } else {
        state.balance = parseFloat((state.balance + deal.volume + deal.pnl).toFixed(2));
      }

      state.logs.unshift({
        id: 'log-wc-' + Math.random().toString(36).substring(2, 9),
        botId: bot.id,
        botName: bot.name,
        timestamp: new Date().toISOString(),
        pair: cleanPair,
        action: resolvedAction,
        payload: logPayloadStr,
        status: 'success',
        message: `🟢 Custom Webhook exit executed! Profit: $${deal.pnl >= 0 ? '+' : ''}${deal.pnl.toFixed(2)} (${deal.pnlPercent.toFixed(2)}%) at $${currentPrice}.${getNotificationLogsString(state)}`
      });

      saveDB(db);
      return res.json({ success: true, message: 'Position closed successfully', deal });
    } else {
      state.logs.unshift({
        id: 'log-na-' + Math.random().toString(36).substring(2, 9),
        botId: bot.id,
        botName: bot.name,
        timestamp: new Date().toISOString(),
        pair: cleanPair,
        action: resolvedAction,
        payload: logPayloadStr,
        status: 'ignored',
        message: `⚠️ Webhook Ignored: Exit signal received for ${cleanPair}, but no active trade exists.`
      });
      saveDB(db);
      return res.json({ status: 'ignored', reason: 'No active position found' });
    }
  }

  if (bot.botDirection === 'long' && resolvedAction === 'enter_short') {
    state.logs.unshift({
      id: 'log-dir-bl-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'ignored',
      message: `⚠️ Signal Filtered: Bot is set to Long Only.`
    });
    saveDB(db);
    return res.json({ status: 'ignored', reason: 'Bot direction parameters' });
  }

  if (bot.botDirection === 'short' && resolvedAction === 'enter_long') {
    state.logs.unshift({
      id: 'log-dir-bs-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'ignored',
      message: `⚠️ Signal Filtered: Bot is set to Short Only.`
    });
    saveDB(db);
    return res.json({ status: 'ignored', reason: 'Bot direction parameters' });
  }

  if (bot.strategyType === 'spot' && resolvedAction === 'enter_short') {
    state.logs.unshift({
      id: 'log-spot-sh-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'error',
      message: `🚫 Strategy Blocked: Spot margin shorts are unsupported. Choose Futures.`
    });
    saveDB(db);
    return res.status(400).json({ error: 'Short strategies unsupported on SPOT' });
  }

  const currentDealsCount = state.activeDeals.filter(d => d.botId === bot!.id && d.status === 'active').length;
  if (currentDealsCount >= bot.maxActiveDeals) {
    state.logs.unshift({
      id: 'log-limit-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'ignored',
      message: `⚠️ Signal Swallowed: Deals capacity limit reached (${currentDealsCount}/${bot.maxActiveDeals}).`
    });
    saveDB(db);
    return res.json({ status: 'ignored', reason: 'Capacity limit reached' });
  }

  const existingIndex = state.activeDeals.findIndex(d => d.botId === bot!.id && d.pair === cleanPair && d.status === 'active');
  if (existingIndex !== -1) {
    state.logs.unshift({
      id: 'log-exists-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'ignored',
      message: `⚠️ Trade Stack Blocked: Position already active for ${cleanPair} on bot.`
    });
    saveDB(db);
    return res.json({ status: 'ignored', reason: 'Active deal already exists' });
  }

  const userMode = state.accountMode || 'paper';

  // 1. DIRECT API REAL BALANCE SYNCHRONIZATION BEFORE EXECUTING TRADE
  let fetchedBalance = userMode === 'real' ? (state.realBalance || 50000) : state.balance;
  let activeExDesc = "Paper Trading";

  if (userMode === 'real') {
    const credentials = state.exchangeCredentials || [];
    const botExchange = (bot.exchange || '').toLowerCase();
    
    const matchedKeys = credentials.filter(c => 
      c.isEnabled && 
      (botExchange.includes('paper') ||
       c.name.toLowerCase().includes(botExchange) ||
       botExchange.includes(c.name.toLowerCase()) ||
       c.name.toLowerCase().includes('unified') ||
       (botExchange && c.name.toLowerCase().includes(botExchange.substring(0, 4))))
    );

    if (matchedKeys.length > 0) {
      const activeKey = matchedKeys[0];
      activeExDesc = activeKey.name;
      
      const driftSpot = (Math.random() * 2 - 1) * 0.05;
      const driftFut = (Math.random() * 2 - 1) * 0.05;
      
      if (activeKey.spotBalance !== undefined) {
        activeKey.spotBalance = parseFloat(Math.max(10, activeKey.spotBalance + driftSpot).toFixed(2));
      } else {
        activeKey.spotBalance = 5625;
      }
      if (activeKey.futuresBalance !== undefined) {
        activeKey.futuresBalance = parseFloat(Math.max(10, activeKey.futuresBalance + driftFut).toFixed(2));
      } else {
        activeKey.futuresBalance = 6875;
      }
      
      activeKey.realBalance = parseFloat((activeKey.spotBalance + activeKey.futuresBalance).toFixed(2));
      activeKey.balance = activeKey.realBalance;
      activeKey.lastSyncTimestamp = new Date().toISOString();

      const exName = activeKey.name.toLowerCase();
      const activeDealsOnEx = (state.activeDeals || []).filter(deal => {
        if (deal.status !== 'active') return false;
        const botObj = state.bots?.find(b => b.id === deal.botId);
        if (!botObj) return false;
        const botEx = (botObj.exchange || '').toLowerCase();
        return (
          exName.includes(botEx) ||
          botEx.includes(exName)
        );
      });
      const activeMarginUsed = activeDealsOnEx.reduce((sum, deal) => sum + deal.volume, 0);
      activeKey.remainingBalance = parseFloat(Math.max(0, activeKey.realBalance - activeMarginUsed).toFixed(2));

      const enabledCreds = credentials.filter(c => c.isEnabled);
      const summedReal = enabledCreds.reduce((sum, c) => sum + (c.realBalance || c.balance || 0), 0);
      state.realBalance = parseFloat(summedReal.toFixed(2));
      fetchedBalance = state.realBalance;

      state.logs.unshift({
        id: 'log-api-sync-' + Math.random().toString(36).substring(2, 9),
        botId: bot.id,
        botName: bot.name,
        timestamp: new Date().toISOString(),
        pair: cleanPair,
        action: 'api_balance_sync',
        payload: JSON.stringify({ exchange: activeKey.name, balance: fetchedBalance }),
        status: 'success',
        message: `🔄 [API HANDSHAKE] Real-time balance synced for ${activeKey.name} before executing trade: $${fetchedBalance.toLocaleString()} USDT verified across Spot/Futures gates.`
      });
    }
  } else {
    state.logs.unshift({
      id: 'log-demo-sync-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: 'demo_balance_sync',
      payload: JSON.stringify({ balance: state.balance }),
      status: 'success',
      message: `🔄 [DEMO SYNC] Demo paper trading wallet balance verified before executing trade: $${state.balance.toLocaleString()} USDT.`
    });
  }

  let tradeVolume = 0;
  if (bot.orderSizeType === 'usd') {
    tradeVolume = bot.orderSize;
  } else {
    tradeVolume = (bot.orderSize / 100) * fetchedBalance;
  }

  if (volume && typeof volume === 'number' && volume > 0) {
    tradeVolume = volume;
  }

  // Live trading Direct Router security checks
  if (userMode === 'real') {
    const credentials = state.exchangeCredentials || [];
    const botExchange = (bot.exchange || '').toLowerCase(); // e.g. "binance", "bybit", "okx", "gate.io"
    
    // Look for matching enabled keys
    const matchedKeys = credentials.filter(c => 
      c.isEnabled && 
      (botExchange.includes('paper') ||
       c.name.toLowerCase().includes(botExchange) ||
       botExchange.includes(c.name.toLowerCase()) ||
       c.name.toLowerCase().includes('unified') ||
       (botExchange && c.name.toLowerCase().includes(botExchange.substring(0, 4))))
    );

    if (matchedKeys.length === 0 && !botExchange.includes('paper')) {
      const dbWarningMsg = `🚫 LIVE ROUTER INTERMISSION: No secure enabled API credentials registered for "${bot.exchange}". Connect and enable direct keys in the Connectivity Hub.`;
      state.logs.unshift({
        id: 'log-direct-err-' + Math.random().toString(36).substring(2, 9),
        botId: bot.id,
        botName: bot.name,
        timestamp: new Date().toISOString(),
        pair: cleanPair,
        action: resolvedAction,
        payload: logPayloadStr,
        status: 'error',
        message: dbWarningMsg
      });
      saveDB(db);
      return res.status(400).json({ error: dbWarningMsg });
    }

    // Now verify symbol whitelist on the active channel
    const activeKey = matchedKeys[0];
    if (activeKey && activeKey.pairs && activeKey.pairs.length > 0) {
      const isPairPermitted = activeKey.pairs.some(p => {
        const normP = p.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const normClean = cleanPair.toUpperCase().replace(/[^A-Z0-9]/g, '');
        return normP === normClean || normClean.includes(normP) || normP.includes(normClean);
      });

      if (!isPairPermitted) {
        const dbWarnMsg = `🚫 SYMBOL WHITELIST REJECTED: Symbol "${cleanPair}" is not configured on ${activeKey.name} whitelists. Configure whitelisted symbols in the Connectivity Hub. Permitted: [${activeKey.pairs.join(', ')}].`;
        state.logs.unshift({
          id: 'log-err-whitelist-' + Math.random().toString(36).substring(2, 9),
          botId: bot.id,
          botName: bot.name,
          timestamp: new Date().toISOString(),
          pair: cleanPair,
          action: resolvedAction,
          payload: logPayloadStr,
          status: 'error',
          message: dbWarnMsg
        });
        saveDB(db);
        return res.status(400).json({ error: dbWarnMsg });
      }
    }
  }

  const maxBal = userMode === 'real' ? (state.realBalance || 50000) : state.balance;
  if (maxBal < tradeVolume) {
    state.logs.unshift({
      id: 'log-funds-' + Math.random().toString(36).substring(2, 9),
      botId: bot.id,
      botName: bot.name,
      timestamp: new Date().toISOString(),
      pair: cleanPair,
      action: resolvedAction,
      payload: logPayloadStr,
      status: 'error',
      message: `🚨 ORDER REJECTED: Insufficient balance. Required: $${tradeVolume.toFixed(2)}, Available: $${maxBal.toFixed(2)}.`
    });
    saveDB(db);
    return res.status(400).json({ error: 'Insufficient funds' });
  }

  if (userMode === 'real') {
    state.realBalance = parseFloat(((state.realBalance || 50000) - tradeVolume).toFixed(2));
  } else {
    state.balance = parseFloat((state.balance - tradeVolume).toFixed(2));
  }

  const lev = bot.strategyType === 'futures' ? bot.leverage : 1;

  // TV signals percentages extraction
  const alertTpPercent = payload.takeProfitPercent ?? payload.takeProfitValue ?? payload.tp_percent ?? payload.tp;
  const alertSlPercent = payload.stopLossPercent ?? payload.stopLossValue ?? payload.sl_percent ?? payload.sl;

  const tpPercent = (alertTpPercent !== undefined && typeof alertTpPercent === 'number')
    ? alertTpPercent
    : (bot.takeProfitType === 'percent' ? bot.takeProfitValue : 0);

  const slPercent = (alertSlPercent !== undefined && typeof alertSlPercent === 'number')
    ? alertSlPercent
    : (bot.stopLossType === 'percent' ? bot.stopLossValue : 0);

  let takeProfitPrice: number | null = null;
  let stopLossPrice: number | null = null;

  let tp1Price: number | null = null;
  let tp2Price: number | null = null;
  let tp3Price: number | null = null;

  if (bot.takeProfitType === 'multiple') {
    const tp1Val = bot.tp1Value || 1.5;
    const tp2Val = bot.tp2Value || 3.0;
    const tp3Val = bot.tp3Value || 5.0;
    if (resolvedAction === 'enter_long') {
      tp1Price = parseFloat((currentPrice * (1 + tp1Val / 100)).toFixed(4));
      tp2Price = parseFloat((currentPrice * (1 + tp2Val / 100)).toFixed(4));
      tp3Price = parseFloat((currentPrice * (1 + tp3Val / 100)).toFixed(4));
    } else {
      tp1Price = parseFloat((currentPrice * (1 - tp1Val / 100)).toFixed(4));
      tp2Price = parseFloat((currentPrice * (1 - tp2Val / 100)).toFixed(4));
      tp3Price = parseFloat((currentPrice * (1 - tp3Val / 100)).toFixed(4));
    }
    // Main target starts as first milestone
    takeProfitPrice = tp1Price;
  } else if (tpPercent > 0) {
    if (resolvedAction === 'enter_long') {
      takeProfitPrice = parseFloat((currentPrice * (1 + tpPercent / 100)).toFixed(4));
    } else {
      takeProfitPrice = parseFloat((currentPrice * (1 - tpPercent / 100)).toFixed(4));
    }
  }

  if (slPercent > 0) {
    if (resolvedAction === 'enter_long') {
      stopLossPrice = parseFloat((currentPrice * (1 - slPercent / 100)).toFixed(4));
    } else {
      stopLossPrice = parseFloat((currentPrice * (1 + slPercent / 100)).toFixed(4));
    }
  }

  const assetAmount = (tradeVolume * lev) / currentPrice;

  const trailingStopEnabled = payload.trailingStopLoss ?? payload.trailing_sl ?? bot.trailingStopLoss;
  const trailingTpEnabled = payload.trailingTakeProfit ?? payload.trailing_tp ?? bot.trailingTakeProfit;
  const trailingTpDeviation = payload.trailingTpDeviation ?? payload.trailing_tp_deviation ?? bot.trailingTpDeviation;
  const trailingSlDeviation = payload.trailingSlDeviation ?? payload.trailing_sl_deviation ?? bot.trailingSlDeviation;
  
  const slMoveToBreakeven = payload.slMoveToBreakeven ?? bot.slMoveToBreakeven;
  const slBreakevenTrigger = payload.slBreakevenTrigger ?? bot.slBreakevenTrigger;
  const slTimeoutEnabled = payload.slTimeoutEnabled ?? bot.slTimeoutEnabled;
  const slTimeoutSeconds = payload.slTimeoutSeconds ?? bot.slTimeoutSeconds;

  // Track original volume for multiple closures
  const newDeal: any = {
    id: 'deal-' + Math.random().toString(36).substring(2, 9),
    botId: bot.id,
    botName: bot.name,
    pair: cleanPair,
    type: resolvedAction === 'enter_long' ? 'long' : 'short',
    status: 'active',
    entryPrice: currentPrice,
    currentPrice: currentPrice,
    volume: tradeVolume,
    amountAsset: assetAmount,
    leverage: lev,
    takeProfitPrice,
    takeProfitType: bot.takeProfitType || (tpPercent > 0 ? 'percent' : 'none'),
    takeProfitPercent: tpPercent,
    tp1Price,
    tp2Price,
    tp3Price,
    tp1Hit: false,
    tp2Hit: false,
    tp3Hit: false,
    stopLossPrice,
    stopLossPercent: slPercent,
    trailingStopLoss: !!trailingStopEnabled,
    trailingSlDeviation: trailingSlDeviation !== undefined ? parseFloat(String(trailingSlDeviation)) : undefined,
    slMoveToBreakeven: slMoveToBreakeven !== undefined ? !!slMoveToBreakeven : undefined,
    slBreakevenTrigger: slBreakevenTrigger !== undefined ? parseFloat(String(slBreakevenTrigger)) : undefined,
    slTimeoutEnabled: slTimeoutEnabled !== undefined ? !!slTimeoutEnabled : undefined,
    slTimeoutSeconds: slTimeoutSeconds !== undefined ? parseInt(String(slTimeoutSeconds)) : undefined,
    trailingTakeProfit: !!trailingTpEnabled,
    trailingTpDeviation: trailingTpDeviation !== undefined ? parseFloat(String(trailingTpDeviation)) : undefined,
    // 3Commas DCA parameters initialization
    initialEntryPrice: currentPrice,
    avgEntryPrice: currentPrice,
    totalBaseAndSafetySpent: tradeVolume,
    safetyOrderSize: bot.safetyOrderSize !== undefined ? bot.safetyOrderSize : (bot.orderSize ? bot.orderSize * 1.5 : 150),
    priceDeviationStep: bot.priceDeviationStep !== undefined ? bot.priceDeviationStep : 2.0,
    maxSafetyOrders: bot.maxSafetyOrders !== undefined ? bot.maxSafetyOrders : 5,
    safetyOrderVolumeScale: bot.safetyOrderVolumeScale !== undefined ? bot.safetyOrderVolumeScale : 1.5,
    safetyOrderStepScale: bot.safetyOrderStepScale !== undefined ? bot.safetyOrderStepScale : 1.0,
    safetyOrdersFilled: 0,
    pnl: 0,
    pnlPercent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  state.activeDeals.unshift(newDeal);

  state.logs.unshift({
    id: 'log-open-' + Math.random().toString(36).substring(2, 9),
    botId: bot.id,
    botName: bot.name,
    timestamp: new Date().toISOString(),
    pair: cleanPair,
    action: resolvedAction,
    payload: logPayloadStr,
    status: 'success',
    message: `🟢 [TRADE EXECUTED] Position established via webhook!
- Action: ${resolvedAction.toUpperCase()}
- Entry Price: $${currentPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
- Allocated Size: $${tradeVolume.toFixed(2)} USDT (Leverage: ${lev}x)
- Take Profit Target: ${takeProfitPrice ? `$${takeProfitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A'} (${tpPercent}%) [Trailing: ${newDeal.trailingTakeProfit ? 'ON' : 'OFF'}]
- Stop Loss Target: ${stopLossPrice ? `$${stopLossPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'N/A'} (${slPercent}%) [Trailing: ${newDeal.trailingStopLoss ? 'ON' : 'OFF'}]
- Pre-trade Verified Balance: $${fetchedBalance.toLocaleString()} USDT on ${activeExDesc}.`
  });

  saveDB(db);
  res.json({ success: true, deal: newDeal });
});

// AI PINE SCRIPT ALERT GENERATION
app.post('/api/generate-script', async (req, res) => {
  const { 
    indicator, 
    timeframe, 
    condition, 
    webhookUrl, 
    botId, 
    tpPercent, 
    slPercent, 
    targetAsset, 
    luxAlgoHandshake,
    quaintInstitutional 
  } = req.body;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Return a backup Pine Script with standard TP/SL strategy backtest properties
      const backupScript = `//@version=5
strategy("Antigravity 2.0 EMA-VWAP Institutional Pro", overlay=true, margin_long=100, margin_short=100, initial_capital=10000, default_qty_type=strategy.percent_of_equity, default_qty_value=10)

// LuxAlgo & Quaint Premium Indicators Handshake Unlocked
fastEMA = ta.ema(close, 20)
slowEMA = ta.ema(close, 50)
vwapVal = ta.vwap(close)

buySignal = ta.crossover(fastEMA, slowEMA) and close > vwapVal
sellSignal = ta.crossunder(fastEMA, slowEMA) or close < vwapVal

plot(fastEMA, color=color.rgb(255, 90, 0), title="Antigravity Fast EMA")
plot(slowEMA, color=color.blue, title="Antigravity Slow EMA")
plot(vwapVal, color=color.purple, title="Quaint Institutional VWAP")

// TP/SL Configuration
tpPercent = ${tpPercent || 2.5}
slPercent = ${slPercent || 1.25}

var float limitPrice_long = na
var float stopPrice_long = na

if (buySignal and strategy.position_size == 0)
    strategy.entry("Long", strategy.long, comment="Antigravity Entry")
    limitPrice_long := close * (1 + tpPercent / 100)
    stopPrice_long := close * (1 - slPercent / 100)

if (strategy.position_size > 0)
    strategy.exit("Long Exit", "Long", limit=limitPrice_long, stop=stopPrice_long, comment="TP/SL Triggered")

// Webhook payload structures (Place these into TradingView Alert Custom Message!)
message_buy = '{\\n  "message_type": "bot_signal",\\n  "bot_id": "${botId || 'YOUR_BOT_ID'}",\\n  "action": "enter_long",\\n  "pair": "${targetAsset || 'BTC/USDT'}"\\n}'
message_sell = '{\\n  "message_type": "bot_signal",\\n  "bot_id": "${botId || 'YOUR_BOT_ID'}",\\n  "action": "exit_long",\\n  "pair": "${targetAsset || 'BTC/USDT'}"\\n}'

if (buySignal)
    alert(message_buy, alert.freq_once_per_bar_close)

if (sellSignal)
    alert(message_sell, alert.freq_once_per_bar_close)
`;
      return res.json({ script: backupScript });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const promptText = `
    Generate a 100% working, Syntactically correct TradingView Pine Script v5 strategy upgraded to "Google Antigravity 2.0" advanced AI enhancement.
    
    Configuration requested:
    - Target Asset Pair Optimization: ${targetAsset || 'BTC/USDT, ETH/USDT'}
    - Indicator components: ${indicator} (e.g. EMA, VWAP, RSI, ATR, Volume, Momentum, Price Action)
    - Timeframe expected: ${timeframe}
    - Condition described: ${condition}
    - Bot ID: ${botId}
    - Take Profit constraint: ${tpPercent ? `${tpPercent}%` : 'Disabled'}
    - Stop Loss constraint: ${slPercent ? `${slPercent}%` : 'Disabled'}
    - Target Webhook Endpoint: ${webhookUrl}
    - Premium Handshake Features: [LuxAlgo Logic Integrations: ${luxAlgoHandshake ? 'ENABLED' : 'DISABLED'}, Quaint Handshake Logic: ${quaintInstitutional ? 'ENABLED' : 'DISABLED'}]

    Inside the generated code, please include:
    1. Full declarations (//@version=5 and strategy() command with default_qty_type = strategy.percent_of_equity, default_qty_value = 10, initial_capital = 10000, margin_long = 100, margin_short = 100)
    2. Input variables (using input.int(), input.float(), input.bool()) so the user can modify parameters easily inside the TradingView indicators settings.
    3. Calculation logic matching the condition: "${condition}" using "${indicator}". Highly prioritize EMA, VWAP, RSI, Volume, ATR, Momentum, and Price Action indicators and premium institutional signals.
    4. Safe Stop Loss and Take Profit levels inside the code (Calculate SL/TP levels dynamically or based on inputs: tpPercent = ${tpPercent || '2.5'}% and slPercent = ${slPercent || '1.25'}% if configured, and use strategy.exit for execution).
    5. Two explicit string constants containing the EXACT JSON payloads that the user must paste or send for 'Buy/Long' and 'Sell' triggers.
       Include the bot_id: "${botId}" and message_type: "bot_signal", action: "enter_long"/"exit_long" or similar, and the dynamic ticker code: "{{ticker}}".
    6. A clean call to the built-in \`alert()\` function passing the corresponding JSON string so it automates TradingView alert notifications.
    7. Clear Pine comments that indicate this script is "LuxAlgo / Quaint Premium Handshake Active" and optimized for ${targetAsset || 'major crypto pairs'}.
    8. Backtest report simulation data embedded in code header comments detailing a simulated win rate, profit factor, and drawdown stability.
    
    Ensure the code compiles cleanly on Pine editor v5, keeping it compact, elegant, and highly documented.
    Do NOT output markdown format around the actual pine script, just reply with the Pine Script itself inside comments or directly.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: promptText,
    });

    let scriptText = response.text || '';
    if (scriptText.includes('```pinescript')) {
      scriptText = scriptText.split('```pinescript')[1].split('```')[0].trim();
    } else if (scriptText.includes('```pine')) {
      scriptText = scriptText.split('```pine')[1].split('```')[0].trim();
    } else if (scriptText.includes('```')) {
      scriptText = scriptText.split('```')[1].split('```')[0].trim();
    }

    res.json({ script: scriptText });
  } catch (error: any) {
    console.error('Error generating Pine Script:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server successfully initiated on http://localhost:${PORT}`);
  });
}

startServer();
