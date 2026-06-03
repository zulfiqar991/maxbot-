import { coinPrices } from './serverDB';
import fs from 'fs';
import path from 'path';

// Define cache holding variables
interface ExchangePairsCollection {
  spot: string[];
  futures: string[];
}

interface AllExchangePairs {
  [exchangeName: string]: ExchangePairsCollection;
}

// Comprehensive fallbacks to ensure instant interactive robust fallback UI
const FALLBACK_PAIRS: AllExchangePairs = {
  'binance': {
    spot: [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'BNB/USDT', 'XRP/USDT', 
      'ADA/USDT', 'DOGE/USDT', 'LTC/USDT', 'LINK/USDT', 'AVAX/USDT',
      'DOT/USDT', 'NEAR/USDT', 'SUI/USDT', 'PEPE/USDT', 'SHIB/USDT',
      'WIF/USDT', 'UNI/USDT', 'FET/USDT', 'ATOM/USDT', 'FIL/USDT',
      'BCH/USDT', 'TRX/USDT', 'ETC/USDT', 'XLM/USDT', 'ICP/USDT',
      'APT/USDT', 'OP/USDT', 'ARB/USDT', 'GALA/USDT', 'IMX/USDT',
      'GRT/USDT', 'CHZ/USDT', 'SAND/USDT', 'HBAR/USDT', 'TON/USDT',
      'BOME/USDT', 'ENA/USDT', 'W/USDT', 'TAO/USDT', 'NOT/USDT'
    ],
    futures: [
      'BTC/USDT', 'ETH/USDT', 'BCH/USDT', 'XRP/USDT', 'LTC/USDT', 'TRX/USDT', 'ETC/USDT', 'LINK/USDT', 'XLM/USDT', 'ADA/USDT',
      'XMR/USDT', 'DASH/USDT', 'ZEC/USDT', 'XTZ/USDT', 'BNB/USDT', 'ATOM/USDT', 'ONT/USDT', 'IOTA/USDT', 'BAT/USDT', 'VET/USDT',
      'NEO/USDT', 'QTUM/USDT', 'IOST/USDT', 'THETA/USDT', 'ALGO/USDT', 'ZIL/USDT', 'KNC/USDT', 'ZRX/USDT', 'COMP/USDT', 'DOGE/USDT',
      'KAVA/USDT', 'BAND/USDT', 'RLC/USDT', 'SNX/USDT', 'DOT/USDT', 'YFI/USDT', 'CRV/USDT', 'TRB/USDT', 'RUNE/USDT', 'SUSHI/USDT',
      'EGLD/USDT', 'SOL/USDT', 'ICX/USDT', 'STORJ/USDT', 'UNI/USDT', 'AVAX/USDT', 'ENJ/USDT', 'KSM/USDT', 'NEAR/USDT', 'AAVE/USDT',
      'FIL/USDT', 'RSR/USDT', 'BEL/USDT', 'AXS/USDT', 'ZEN/USDT', 'SKL/USDT', 'GRT/USDT', '1INCH/USDT', 'CHZ/USDT', 'SAND/USDT',
      'ANKR/USDT', 'RVN/USDT', 'SFP/USDT', 'COTI/USDT', 'CHR/USDT', 'MANA/USDT', 'ALICE/USDT', 'HBAR/USDT', 'ONE/USDT', 'CELR/USDT',
      'HOT/USDT', 'MTL/USDT', 'OGN/USDT', '1000SHIB/USDT', 'GTC/USDT', 'IOTX/USDT', 'C98/USDT', 'MASK/USDT', 'DYDX/USDT', '1000XEC/USDT',
      'GALA/USDT', 'CELO/USDT', 'AR/USDT', 'ARPA/USDT', 'CTSI/USDT', 'LPT/USDT', 'ENS/USDT', 'PEOPLE/USDT', 'ROSE/USDT', 'DUSK/USDT',
      'FLOW/USDT', 'IMX/USDT', 'API3/USDT', 'GMT/USDT', 'APE/USDT', 'WOO/USDT', 'JASMY/USDT', 'OP/USDT', 'INJ/USDT', 'STG/USDT',
      'SPELL/USDT', '1000LUNC/USDT', 'LUNA2/USDT', 'LDO/USDT', 'ICP/USDT', 'APT/USDT', 'QNT/USDT', 'FET/USDT', 'MAGIC/USDT', 'T/USDT',
      'HIGH/USDT', 'MINA/USDT', 'ASTR/USDT', 'GMX/USDT', 'CFX/USDT', 'STX/USDT', 'ACH/USDT', 'SSV/USDT', 'CKB/USDT', 'LQTY/USDT',
      'USDC/USDT', 'ID/USDT', 'ARB/USDT', 'JOE/USDT', 'TLM/USDT', 'HFT/USDT', 'XVS/USDT', 'BLUR/USDT', 'EDU/USDT', 'SUI/USDT',
      '1000PEPE/USDT', '1000FLOKI/USDT', 'UMA/USDT', 'NMR/USDT', 'MAV/USDT', 'XVG/USDT', 'WLD/USDT', 'PENDLE/USDT', 'ARKM/USDT', 'AGLD/USDT',
      'YGG/USDT', 'BNT/USDT', 'SEI/USDT', 'CYBER/USDT', 'ARK/USDT', 'BICO/USDT', 'BIGTIME/USDT', 'WAXP/USDT', 'BSV/USDT', 'RIF/USDT',
      'POLYX/USDT', 'GAS/USDT', 'POWR/USDT', 'TIA/USDT', 'CAKE/USDT', 'MEME/USDT', 'TWT/USDT', 'ORDI/USDT', 'STEEM/USDT', 'ILV/USDT',
      'KAS/USDT', 'BEAMX/USDT', '1000BONK/USDT', 'PYTH/USDT', 'SUPER/USDT', 'USTC/USDT', 'ONG/USDT', 'ETHW/USDT', 'JTO/USDT', '1000SATS/USDT',
      'AUCTION/USDT', '1000RATS/USDT', 'ACE/USDT', 'MOVR/USDT', 'NFP/USDT', 'XAI/USDT', 'WIF/USDT', 'MANTA/USDT', 'ONDO/USDT', 'LSK/USDT',
      'ALT/USDT', 'JUP/USDT', 'ZETA/USDT', 'RONIN/USDT', 'DYM/USDT', 'PIXEL/USDT', 'STRK/USDT', 'GLM/USDT', 'PORTAL/USDT', 'TON/USDT',
      'AXL/USDT', 'METIS/USDT', 'AEVO/USDT', 'VANRY/USDT', 'BOME/USDT', 'ETHFI/USDT', 'ENA/USDT', 'W/USDT', 'TNSR/USDT', 'SAGA/USDT',
      'TAO/USDT', 'REZ/USDT', 'BB/USDT', 'NOT/USDT', 'TURBO/USDT', 'IO/USDT', 'ZK/USDT', 'MEW/USDT', 'LISTA/USDT', 'ZRO/USDT',
      'RENDER/USDT', 'BANANA/USDT', 'RARE/USDT', 'G/USDT', 'SYN/USDT', 'BRETT/USDT', 'POPCAT/USDT', 'SUN/USDT', 'DOGS/USDT', 'MBOX/USDT',
      'FLUX/USDT', 'RPL/USDT', 'POL/USDT', '1MBABYDOGE/USDT', 'NEIRO/USDT', 'FIDA/USDT', 'CATI/USDT', 'HMSTR/USDT', 'COS/USDT', 'EIGEN/USDT',
      'DIA/USDT', '1000CAT/USDT', 'SCR/USDT', 'GOAT/USDT', 'MOODENG/USDT', 'SAFE/USDT', 'SANTOS/USDT', 'COW/USDT', 'CETUS/USDT', '1000000MOG/USDT',
      'GRASS/USDT', 'DRIFT/USDT', 'ACT/USDT', 'PNUT/USDT', 'BAN/USDT', 'AKT/USDT', 'SCRT/USDT', '1000CHEEMS/USDT', 'THE/USDT', 'MORPHO/USDT',
      'CHILLGUY/USDT', 'KAIA/USDT', 'AERO/USDT', 'ACX/USDT', 'ORCA/USDT', 'MOVE/USDT', 'KOMA/USDT', 'VIRTUAL/USDT', 'SPX/USDT', 'ME/USDT',
      'AVA/USDT', 'MOCA/USDT', 'VANA/USDT', 'PENGU/USDT', 'LUMIA/USDT', 'USUAL/USDT', 'AIXBT/USDT', 'FARTCOIN/USDT', 'KMNO/USDT', 'CGPT/USDT',
      'HIVE/USDT', 'DEXE/USDT', 'PHA/USDT', 'GRIFFAIN/USDT', 'ZEREBRO/USDT', 'BIO/USDT', 'COOKIE/USDT', 'ALCH/USDT', 'SWARMS/USDT', 'SONIC/USDT'
    ]
  },
  'bybit': {
    spot: [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT',
      'TON/USDT', 'LTC/USDT', 'MNT/USDT', 'AVAX/USDT', 'LINK/USDT',
      'SUI/USDT', 'PEPE/USDT', 'SHIB/USDT', 'WIF/USDT', 'ADA/USDT'
    ],
    futures: [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT',
      'TON/USDT', 'LTC/USDT', 'MNT/USDT', 'AVAX/USDT', 'LINK/USDT',
      'SUI/USDT', 'PEPE/USDT', 'SHIB/USDT', 'WIF/USDT', 'ADA/USDT',
      'OP/USDT', 'ARB/USDT', 'APT/USDT', 'SUI/USDT', 'ORDI/USDT'
    ]
  },
  'okx': {
    spot: [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'OKB/USDT', 'XRP/USDT',
      'DOGE/USDT', 'LTC/USDT', 'DOT/USDT', 'LINK/USDT', 'AVAX/USDT',
      'SUI/USDT', 'SHIB/USDT', 'TON/USDT', 'FIL/USDT', 'UNI/USDT'
    ],
    futures: [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT',
      'LTC/USDT', 'DOT/USDT', 'LINK/USDT', 'AVAX/USDT', 'SUI/USDT',
      'BTC/USDJ', 'TON/USDT', 'FIL/USDT', 'UNI/USDT', 'PEPE/USDT'
    ]
  },
  'gate.io': {
    spot: [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'GT/USDT', 'XRP/USDT',
      'DOGE/USDT', 'ADA/USDT', 'LTC/USDT', 'LINK/USDT', 'AVAX/USDT',
      'SUI/USDT', 'PEPE/USDT', 'SHIB/USDT', 'TON/USDT', 'BCH/USDT'
    ],
    futures: [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'GT/USDT', 'XRP/USDT',
      'DOGE/USDT', 'ADA/USDT', 'LTC/USDT', 'LINK/USDT', 'AVAX/USDT',
      'SUI/USDT', 'PEPE/USDT', 'SHIB/USDT', 'TON/USDT', 'FIL/USDT'
    ]
  },
  'weex': {
    spot: [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT', 
      'ADA/USDT', 'LTC/USDT', 'LINK/USDT', 'TRX/USDT', 'BCH/USDT',
      'WUI/USDT', 'WX/USDT'
    ],
    futures: [
      'BTC/USDT', 'ETH/USDT', 'SOL/USDT', 'XRP/USDT', 'DOGE/USDT',
      'ADA/USDT', 'LTC/USDT', 'LINK/USDT', 'TRX/USDT', 'BCH/USDT',
      'FIL/USDT', 'PEPE/USDT'
    ]
  }
};

const PERSIST_FILE = path.join(process.cwd(), 'db_exchange_pairs.json');

// Helper to load persisted pairs from disk if present
function loadPersistedPairs(): AllExchangePairs {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const data = fs.readFileSync(PERSIST_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (parsed && typeof parsed === 'object') {
        if (parsed['binance'] && Array.isArray(parsed['binance'].futures)) {
          console.log(`Loaded ${parsed['binance'].futures.length} persisted Binance futures pairs from ${PERSIST_FILE}`);
          return parsed;
        }
      }
    }
  } catch (err) {
    console.error('Error reading persisted exchange pairs, using fallback:', err);
  }
  return JSON.parse(JSON.stringify(FALLBACK_PAIRS));
}

let cachedPairs: AllExchangePairs = loadPersistedPairs();
let lastFetchTimestamp: string = new Date().toISOString();
let syncStatus = 'Synchronized with live fallback presets';

// Helper to fetch with timeout (increased to 8000ms for stable heavy payload fetching)
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 8000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Background Live Synchronizer
export async function runExchangePairsLiveSync() {
  const nextCache: AllExchangePairs = {
    'binance': { spot: [], futures: [] },
    'bybit': { spot: [], futures: [] },
    'okx': { spot: [], futures: [] },
    'gate.io': { spot: [], futures: [] },
    'weex': { spot: [], futures: [] }
  };

  let okCount = 0;
  let totalTasks = 10; // 5 exchanges * 2 categories

  // 1. BINANCE SPOT SYNC
  try {
    const res = await fetchWithTimeout('https://api.binance.com/api/v3/exchangeInfo');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.symbols)) {
        const spotPairs = data.symbols
          .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT' && (!s.permissions || s.permissions.includes('SPOT')))
          .map((s: any) => `${s.baseAsset}/USDT`);
        
        if (spotPairs.length > 5) {
          nextCache['binance'].spot = Array.from(new Set(spotPairs));
          okCount++;
        }
      }
    }
  } catch (e) {
    console.log('Binance Spot Live Sync bypassed, using fallback.');
  }

  // 2. BINANCE FUTURES SYNC
  try {
    const res = await fetchWithTimeout('https://fapi.binance.com/fapi/v1/exchangeInfo');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.symbols)) {
        const futPairs = data.symbols
          .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
          .map((s: any) => `${s.baseAsset}/USDT`);
        
        if (futPairs.length > 5) {
          nextCache['binance'].futures = Array.from(new Set(futPairs));
          okCount++;
        }
      }
    }
  } catch (e) {
    console.log('Binance Futures Live Sync bypassed, using fallback.');
  }

  // 3. BYBIT SPOT SYNC
  try {
    const res = await fetchWithTimeout('https://api.bybit.com/v5/market/instruments-info?category=spot');
    if (res.ok) {
      const data = await res.json();
      if (data && data.result && Array.isArray(data.result.list)) {
        const bbSpot = data.result.list
          .filter((item: any) => item.status === 'Trading' && item.symbol.endsWith('USDT'))
          .map((item: any) => {
            const base = item.symbol.slice(0, -4);
            return `${base}/USDT`;
          });
        
        if (bbSpot.length > 5) {
          nextCache['bybit'].spot = Array.from(new Set(bbSpot));
          okCount++;
        }
      }
    }
  } catch (e) {
    console.log('Bybit Spot Live Sync bypassed.');
  }

  // 4. BYBIT FUTURES (LINEAR) SYNC
  try {
    const res = await fetchWithTimeout('https://api.bybit.com/v5/market/instruments-info?category=linear');
    if (res.ok) {
      const data = await res.json();
      if (data && data.result && Array.isArray(data.result.list)) {
        const bbFut = data.result.list
          .filter((item: any) => item.status === 'Trading' && item.symbol.endsWith('USDT'))
          .map((item: any) => {
            const base = item.symbol.slice(0, -4);
            return `${base}/USDT`;
          });
        
        if (bbFut.length > 5) {
          nextCache['bybit'].futures = Array.from(new Set(bbFut));
          okCount++;
        }
      }
    }
  } catch (e) {
    console.log('Bybit Futures Live Sync bypassed.');
  }

  // 5. OKX SPOT SYNC
  try {
    const res = await fetchWithTimeout('https://www.okx.com/api/v5/public/instruments?instType=SPOT');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        const okxSpot = data.data
          .filter((item: any) => item.state === 'live' && item.instId.endsWith('-USDT'))
          .map((item: any) => item.instId.replace('-', '/'));
        
        if (okxSpot.length > 5) {
          nextCache['okx'].spot = Array.from(new Set(okxSpot));
          okCount++;
        }
      }
    }
  } catch (e) {
    console.log('OKX Spot Live Sync bypassed.');
  }

  // 6. OKX FUTURES SYNC
  try {
    const res = await fetchWithTimeout('https://www.okx.com/api/v5/public/instruments?instType=SWAP');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        const okxFut = data.data
          .filter((item: any) => item.state === 'live' && item.instId.endsWith('-USDT-SWAP'))
          .map((item: any) => item.instId.split('-')[0] + '/USDT');
        
        if (okxFut.length > 5) {
          nextCache['okx'].futures = Array.from(new Set(okxFut));
          okCount++;
        }
      }
    }
  } catch (e) {
    console.log('OKX Futures Live Sync bypassed.');
  }

  // 7. GATE.IO SPOT SYNC
  try {
    const res = await fetchWithTimeout('https://api.gateio.ws/api/v4/spot/currency_pairs');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const gateSpot = data
          .filter((item: any) => item.trade_status === 'tradable' && item.id.endsWith('_USDT'))
          .map((item: any) => item.id.replace('_', '/'));
        
        if (gateSpot.length > 5) {
          nextCache['gate.io'].spot = Array.from(new Set(gateSpot));
          okCount++;
        }
      }
    }
  } catch (e) {
    console.log('Gate.io Spot Live Sync bypassed.');
  }

  // 8. GATE.IO FUTURES SYNC
  try {
    const res = await fetchWithTimeout('https://api.gateio.ws/api/v4/futures/usdt/contracts');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const gateFut = data
          .filter((item: any) => item.type === 'direct' && item.name.endsWith('_USDT'))
          .map((item: any) => item.name.replace('_', '/'));
        
        if (gateFut.length > 5) {
          nextCache['gate.io'].futures = Array.from(new Set(gateFut));
          okCount++;
        }
      }
    }
  } catch (e) {
    console.log('Gate.io Futures Live Sync bypassed.');
  }

  // Merge loaded caches or keep fallback if empty
  Object.keys(FALLBACK_PAIRS).forEach(key => {
    const fallSpot = FALLBACK_PAIRS[key].spot;
    const fallFut = FALLBACK_PAIRS[key].futures;

    if (nextCache[key].spot.length === 0) {
      nextCache[key].spot = fallSpot;
    } else {
      // Merge elements to make sure key assets are always there
      const set = new Set([...nextCache[key].spot, ...fallSpot]);
      nextCache[key].spot = Array.from(set);
    }

    if (nextCache[key].futures.length === 0) {
      nextCache[key].futures = fallFut;
    } else {
      const set = new Set([...nextCache[key].futures, ...fallFut]);
      nextCache[key].futures = Array.from(set);
    }
  });

  // Verify elements against coinPrices list, if price is missing, assign a safe simulated starting price to avoid zero value rendering
  Object.keys(nextCache).forEach(ex => {
    const spotList = nextCache[ex].spot;
    const futList = nextCache[ex].futures;
    [...spotList, ...futList].forEach(p => {
      if (!coinPrices[p]) {
        // Assign arbitrary realistic starting price based on hashing or random
        let startingPrice = 1.0;
        if (p.startsWith('BTC')) startingPrice = 95200 + Math.random() * 200;
        else if (p.startsWith('ETH')) startingPrice = 3400 + Math.random() * 20;
        else if (p.startsWith('SOL')) startingPrice = 188.0 + Math.random() * 2;
        else if (p.includes('DOGE')) startingPrice = 0.38 + Math.random() * 0.01;
        else if (p.includes('PEPE')) startingPrice = 0.000015;
        else startingPrice = parseFloat((1.5 + Math.random() * 15).toFixed(3));
        
        coinPrices[p] = startingPrice;
      }
    });
  });

  cachedPairs = nextCache;
  lastFetchTimestamp = new Date().toISOString();
  syncStatus = `Successfully synchronized with live exchange data feed. Feeds updated: ${okCount}/${totalTasks} live API channels over HTTPS.`;
  console.log(`Live Trading Pairs Hub synchronized! Timestamp: ${lastFetchTimestamp}. Status: ${syncStatus}`);
  
  // Persist fetched exchange pairs list to disk so they survive restarts
  try {
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(cachedPairs, null, 2), 'utf-8');
    console.log(`Successfully persisted ${cachedPairs['binance']?.futures?.length || 0} Binance futures pairs to disk: ${PERSIST_FILE}`);
  } catch (err) {
    console.error('Failed to write db_exchange_pairs.json:', err);
  }
}

// Initial sync on startup
setTimeout(runExchangePairsLiveSync, 2000);

// Background schedule to sync automatically every 5 minutes
setInterval(runExchangePairsLiveSync, 5 * 60 * 1000);

export function getCachedPairs() {
  return {
    success: true,
    lastSynced: lastFetchTimestamp,
    syncStatus,
    pairs: cachedPairs
  };
}
