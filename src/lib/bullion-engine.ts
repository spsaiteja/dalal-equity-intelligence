import fs from 'fs';
import path from 'path';
import {
  BullionHolding,
  BullionHoldingCalculated,
  BullionPortfolioSummary,
  UaeBullionRates,
  MetalRateDetail,
  SilverRateDetail,
  BullionMetalType,
} from '@/types/bullion';
import { readVaultFile, writeVaultFile } from './drive-vault';
import { getUserVaultHash } from './crypto-vault';

// Constants for UAE Bullion calculations
export const USD_AED_PEG = 3.6725;
export const GRAMS_PER_TROY_OZ = 31.1034768;
export const GRAMS_PER_TOLA = 11.6638;

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function getDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join('/tmp', 'dalal_data');
  }
  return path.join(process.cwd(), 'data');
}

function ensureDataDir() {
  const dir = getDataDir();
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  } catch (err) {
    console.warn('Warning: Could not create data dir:', err);
  }
}

// In-memory cache for fast UAE Bullion rates (45-second TTL)
let ratesCache: { data: UaeBullionRates; expiry: number } | null = null;

async function fetchYahooQuote(symbol: string): Promise<{ price: number; prevClose: number }> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=1d&interval=1d`;
  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${symbol}`);
  }

  const json = await res.json();
  const meta = json?.chart?.result?.[0]?.meta;
  if (!meta) {
    throw new Error(`Missing meta for ${symbol}`);
  }

  const price = Number(meta.regularMarketPrice ?? 0);
  const prevClose = Number(meta.chartPreviousClose || meta.previousClose || price);

  return { price, prevClose };
}

/**
 * Fetches real-time spot rates and computes Dubai Gold Souk wholesale/retail benchmark rates.
 */
export async function fetchUaeBullionRates(): Promise<UaeBullionRates> {
  const now = Date.now();
  if (ratesCache && ratesCache.expiry > now) {
    return ratesCache.data;
  }

  // Default baseline fallbacks in case network is down
  let goldSpotUsd = 2915.0; // ~$2915 / troy oz
  let goldPrevClose = 2910.0;
  let silverSpotUsd = 33.5; // ~$33.5 / troy oz
  let silverPrevClose = 33.2;
  let aedInrRate = 23.1; // 1 AED ~ 23.1 INR

  try {
    const [goldRes, silverRes, aedInrRes] = await Promise.allSettled([
      fetchYahooQuote('GC=F'),
      fetchYahooQuote('SI=F'),
      fetchYahooQuote('AEDINR=X'),
    ]);

    if (goldRes.status === 'fulfilled' && goldRes.value.price > 0) {
      goldSpotUsd = goldRes.value.price;
      goldPrevClose = goldRes.value.prevClose;
    }
    if (silverRes.status === 'fulfilled' && silverRes.value.price > 0) {
      silverSpotUsd = silverRes.value.price;
      silverPrevClose = silverRes.value.prevClose;
    }
    if (aedInrRes.status === 'fulfilled' && aedInrRes.value.price > 0) {
      aedInrRate = aedInrRes.value.price;
    }
  } catch (err) {
    console.warn('Warning: Yahoo Finance bullion fetch partial error:', err);
  }

  // Calculate 24h percentage movements
  const goldChangePct =
    goldPrevClose > 0 ? ((goldSpotUsd - goldPrevClose) / goldPrevClose) * 100 : 0;
  const silverChangePct =
    silverPrevClose > 0 ? ((silverSpotUsd - silverPrevClose) / silverPrevClose) * 100 : 0;

  // Base 24K Gold AED per gram = (USD per oz / 31.1034768) * 3.6725
  const gold24kAed = (goldSpotUsd / GRAMS_PER_TROY_OZ) * USD_AED_PEG;
  const gold22kAed = gold24kAed * (22 / 24);
  const gold21kAed = gold24kAed * (21 / 24);
  const gold18kAed = gold24kAed * (18 / 24);

  // Silver AED per gram and per kg
  const silverAedPerGram = (silverSpotUsd / GRAMS_PER_TROY_OZ) * USD_AED_PEG;
  const silverAedPerKg = silverAedPerGram * 1000;

  const round2 = (val: number) => Math.round(val * 100) / 100;

  const buildRate = (aed: number, changePct: number): MetalRateDetail => ({
    aedPerGram: round2(aed),
    inrPerGram: round2(aed * aedInrRate),
    change24h: round2(aed * (changePct / 100)),
    change24hPct: round2(changePct),
  });

  const rates: UaeBullionRates = {
    gold24k: buildRate(gold24kAed, goldChangePct),
    gold22k: buildRate(gold22kAed, goldChangePct),
    gold21k: buildRate(gold21kAed, goldChangePct),
    gold18k: buildRate(gold18kAed, goldChangePct),
    silver: {
      ...buildRate(silverAedPerGram, silverChangePct),
      aedPerKg: round2(silverAedPerKg),
      inrPerKg: round2(silverAedPerKg * aedInrRate),
    },
    aedInrRate: round2(aedInrRate),
    usdSpotGold: round2(goldSpotUsd),
    usdSpotSilver: round2(silverSpotUsd),
    usdAedPeg: USD_AED_PEG,
    lastUpdated: new Date().toISOString(),
  };

  ratesCache = { data: rates, expiry: now + 45000 };
  return rates;
}

/**
 * Returns current CMP per gram in AED for a given metal type.
 */
export function getCurrentPriceForMetal(metalType: BullionMetalType, rates: UaeBullionRates): number {
  switch (metalType) {
    case 'GOLD_24K':
      return rates.gold24k.aedPerGram;
    case 'GOLD_22K':
      return rates.gold22k.aedPerGram;
    case 'GOLD_21K':
      return rates.gold21k.aedPerGram;
    case 'GOLD_18K':
      return rates.gold18k.aedPerGram;
    case 'SILVER_999':
      return rates.silver.aedPerGram;
    default:
      return rates.gold24k.aedPerGram;
  }
}

/**
 * Calculates live portfolio metrics and unrealized P&L for a list of bullion holdings.
 */
export function calculateBullionPortfolio(
  holdings: BullionHolding[],
  rates: UaeBullionRates
): {
  calculatedHoldings: BullionHoldingCalculated[];
  summary: BullionPortfolioSummary;
} {
  const round2 = (val: number) => Math.round(val * 100) / 100;

  let totalInvestedAED = 0;
  let totalCurrentValueAED = 0;
  let totalGoldGrams = 0;
  let totalSilverGrams = 0;

  const calculatedHoldings: BullionHoldingCalculated[] = holdings.map((h) => {
    const cmpAED = getCurrentPriceForMetal(h.metalType, rates);
    const cmpINR = cmpAED * rates.aedInrRate;

    const totalCostAED = h.weightGrams * h.buyPricePerGramAED;
    const totalCostINR = totalCostAED * rates.aedInrRate;

    const currentValueAED = h.weightGrams * cmpAED;
    const currentValueINR = currentValueAED * rates.aedInrRate;

    const pnlAED = currentValueAED - totalCostAED;
    const pnlINR = currentValueINR - totalCostINR;
    const pnlPct = totalCostAED > 0 ? (pnlAED / totalCostAED) * 100 : 0;

    totalInvestedAED += totalCostAED;
    totalCurrentValueAED += currentValueAED;

    if (h.metalType === 'SILVER_999') {
      totalSilverGrams += h.weightGrams;
    } else {
      totalGoldGrams += h.weightGrams;
    }

    return {
      ...h,
      totalCostAED: round2(totalCostAED),
      totalCostINR: round2(totalCostINR),
      currentPricePerGramAED: round2(cmpAED),
      currentPricePerGramINR: round2(cmpINR),
      currentValueAED: round2(currentValueAED),
      currentValueINR: round2(currentValueINR),
      pnlAED: round2(pnlAED),
      pnlINR: round2(pnlINR),
      pnlPct: round2(pnlPct),
    };
  });

  const totalPnlAED = totalCurrentValueAED - totalInvestedAED;
  const totalPnlPct = totalInvestedAED > 0 ? (totalPnlAED / totalInvestedAED) * 100 : 0;

  const totalInvestedINR = totalInvestedAED * rates.aedInrRate;
  const totalCurrentValueINR = totalCurrentValueAED * rates.aedInrRate;
  const totalPnlINR = totalPnlAED * rates.aedInrRate;

  const summary: BullionPortfolioSummary = {
    totalInvestedAED: round2(totalInvestedAED),
    totalCurrentValueAED: round2(totalCurrentValueAED),
    totalPnlAED: round2(totalPnlAED),
    totalPnlPct: round2(totalPnlPct),
    totalInvestedINR: round2(totalInvestedINR),
    totalCurrentValueINR: round2(totalCurrentValueINR),
    totalPnlINR: round2(totalPnlINR),
    totalGoldGrams: round2(totalGoldGrams),
    totalGoldTolas: round2(totalGoldGrams / GRAMS_PER_TOLA),
    totalSilverGrams: round2(totalSilverGrams),
    totalSilverKg: round2(totalSilverGrams / 1000),
    itemCount: holdings.length,
  };

  return { calculatedHoldings, summary };
}

/**
 * Loads master admin's bullion portfolio from Upstash Redis Vault (or local disk).
 */
export async function loadMasterBullionPortfolio(adminEmail: string): Promise<BullionHolding[]> {
  const cleanEmail = adminEmail.trim().toLowerCase();
  const hash = getUserVaultHash(cleanEmail);
  const vaultFilename = `bullion_portfolio_${hash}.json`;

  // 1. Try reading from Upstash Redis / Drive Cloud Vault
  try {
    const raw = await readVaultFile(vaultFilename);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Bullion cloud vault read failed:', err);
  }

  // 2. Fallback to local disk file
  try {
    ensureDataDir();
    const diskPath = path.join(getDataDir(), vaultFilename);
    if (fs.existsSync(diskPath)) {
      const raw = fs.readFileSync(diskPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Bullion disk read failed:', err);
  }

  return [];
}

/**
 * Saves master admin's bullion portfolio to both local disk and Upstash Redis Vault.
 */
export async function saveMasterBullionPortfolio(
  adminEmail: string,
  holdings: BullionHolding[]
): Promise<boolean> {
  const cleanEmail = adminEmail.trim().toLowerCase();
  const hash = getUserVaultHash(cleanEmail);
  const vaultFilename = `bullion_portfolio_${hash}.json`;
  const content = JSON.stringify(holdings, null, 2);

  // 1. Save to local disk cache
  try {
    ensureDataDir();
    const diskPath = path.join(getDataDir(), vaultFilename);
    fs.writeFileSync(diskPath, content, 'utf-8');
  } catch (err) {
    console.warn('Failed saving bullion portfolio to disk:', err);
  }

  // 2. Save to Cloud Vault (Upstash Redis)
  try {
    const ok = await writeVaultFile(vaultFilename, content, 'application/json');
    return ok;
  } catch (err) {
    console.error('Failed saving bullion portfolio to Cloud Vault:', err);
    return false;
  }
}

