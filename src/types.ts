export interface SignalBot {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  exchange: string; // "Paper Trading", "Binance", "Bybit", etc.
  strategyType: 'spot' | 'futures';
  pairs: string[]; // e.g. ["BTC/USDT", "ETH/USDT"]
  botDirection?: 'long' | 'short' | 'both'; // Support "buy only", "sell only", or "both"
  leverage: number; // 1 to 50
  orderSizeType: 'usd' | 'percent';
  orderSize: number; // e.g., 100 USDT or 5%
  takeProfitType: 'percent' | 'none' | 'multiple'; // Support single or TP1/TP2/TP3 split
  takeProfitValue: number; // e.g., 2.5%
  trailingTakeProfit: boolean;
  // Multiple TP Customization Tiers
  tp1Value?: number; // Target TP1 percent deviation
  tp1Size?: number;  // Volume percentage allocation e.g. 50%
  tp2Value?: number; // Target TP2 percent deviation
  tp2Size?: number;  // Volume percentage allocation e.g. 30%
  tp3Value?: number; // Target TP3 percent deviation
  tp3Size?: number;  // Volume percentage allocation e.g. 20%
  trailingTpDeviation?: number; // deviation e.g. 0.2%
  stopLossType: 'percent' | 'none';
  stopLossValue: number; // e.g., 1.5%
  trailingStopLoss: boolean;
  maxActiveDeals: number;
  webhookToken: string;
  createdAt: string;
  pineIndicator?: string;
  pineTimeframe?: string;
  pineCondition?: string;
  pineScriptCode?: string;
}

export interface GridLine {
  price: number;
  type: 'buy' | 'sell';
  status: 'pending' | 'filled';
}

export interface GridBot {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  exchange: string; // "Paper Trading", "Binance", "Bybit", etc.
  strategyType: 'spot' | 'futures'; // Grid can be Spot or Futures Grid
  pair: string; // Single pair for grid bot, e.g. "BTC/USDT"
  lowerPrice: number;
  upperPrice: number;
  gridsCount: number; // e.g., 10 grids
  investment: number; // total USDT allocated
  gridType: 'arithmetic' | 'geometric';
  leverage: number; // 1 to 50
  gridProfit: number; // Accumulated profit from micro arbitrage
  transactionsCount: number; // number of trades executed
  createdAt: string;
  grids: GridLine[]; // Live grids orders
}

export interface Deal {
  id: string;
  botId: string;
  botName: string;
  pair: string;
  type: 'long' | 'short';
  status: 'active' | 'take_profit' | 'stop_loss' | 'manually_closed' | 'liquidated';
  entryPrice: number;
  exitPrice?: number;
  currentPrice: number;
  volume: number; // USD amount invested
  amountAsset: number; // size in coins e.g. (volume * leverage) / entryPrice
  leverage: number;
  takeProfitPrice: number | null;
  // Multiple TP tracking support
  tp1Price?: number | null;
  tp2Price?: number | null;
  tp3Price?: number | null;
  tp1Hit?: boolean;
  tp2Hit?: boolean;
  tp3Hit?: boolean;
  takeProfitType?: 'percent' | 'none' | 'multiple';
  stopLossPrice: number | null;
  pnl: number; // USD
  pnlPercent: number; // %
  createdAt: string;
  updatedAt: string;
}

export interface SignalLog {
  id: string;
  botId: string;
  botName: string;
  timestamp: string;
  pair: string;
  action: string;
  payload: string;
  status: 'success' | 'ignored' | 'error';
  message: string;
}

export interface ExchangeCredential {
  id: string;
  name: string; // e.g. "Binance", "Bybit", "Coinbase Pro", "OKX"
  apiKey: string;
  apiSecret: string;
  isEnabled: boolean;
  createdAt: string;
  passphrase?: string; // Optional (e.g. Coinbase)
  balance?: number;     // Simulated live exchange balance e.g., 12500
  pairs?: string[];     // Tradeable configured pairs e.g., ["BTC/USDT", "ETH/USDT"]
  spotBalance?: number;      // Spot balance of the exchange
  futuresBalance?: number;   // Futures balance of the exchange
  realBalance?: number;      // Total real balance (spot + futures)
  remainingBalance?: number; // Available balance after margin deductions
  withdrawalDisabled?: boolean; // Secure API withdrawal status indicator
}

export interface AccountState {
  balance: number;
  realBalance?: number; // Separate real balance for "Real Account" mode simulation
  accountMode?: 'paper' | 'real';
  exchangeCredentials?: ExchangeCredential[];
  activeDeals: Deal[];
  bots: SignalBot[];
  gridBots: GridBot[];
  logs: SignalLog[];
  telegramEnabled?: boolean;
  telegramBotToken?: string;
  telegramChatId?: string;
  whatsappEnabled?: boolean;
  whatsappPhone?: string;
  smsEnabled?: boolean;
  smsPhone?: string;
  tradingViewWebhooksEnabled?: boolean;
}
