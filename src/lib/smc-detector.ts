// src/lib/smc-detector.ts

export interface Candle {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface FVG {
  type: 'bullish' | 'bearish';
  top: number;
  bottom: number;
  index: number; // Index of the gap candle (candle 2)
}

export interface MarketStructure {
  bos: { type: 'bullish' | 'bearish', price: number, time: number | string }[];
  choch: { type: 'bullish' | 'bearish', price: number, time: number | string }[];
  fvg: FVG[];
}

/**
 * Mendeteksi Fair Value Gaps (FVG)
 * Bullish FVG: Low candle 3 > High candle 1
 * Bearish FVG: High candle 3 < Low candle 1
 */
export function detectFVG(candles: Candle[]): FVG[] {
  const fvgs: FVG[] = [];
  if (candles.length < 3) return fvgs;

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2];
    const c2 = candles[i - 1]; // The gap candle
    const c3 = candles[i];

    // Bullish FVG
    if (c3.low > c1.high) {
      fvgs.push({
        type: 'bullish',
        top: c3.low,
        bottom: c1.high,
        index: i - 1
      });
    }
    // Bearish FVG
    else if (c3.high < c1.low) {
      fvgs.push({
        type: 'bearish',
        top: c1.low,
        bottom: c3.high,
        index: i - 1
      });
    }
  }
  return fvgs;
}

/**
 * Mendeteksi Break of Structure (BOS) sederhana
 */
export function detectStructure(candles: Candle[]): MarketStructure {
  const fvg = detectFVG(candles);
  const bos: any[] = [];
  const choch: any[] = [];
  
  if (candles.length < 20) return { bos, choch, fvg };

  let lastHigh = Math.max(...candles.slice(0, 10).map(c => c.high));
  let lastLow = Math.min(...candles.slice(0, 10).map(c => c.low));
  let trend: 'bullish' | 'bearish' | null = null;

  for (let i = 10; i < candles.length; i++) {
    const c = candles[i];

    if (c.close > lastHigh) {
      if (trend === 'bearish') {
        choch.push({ type: 'bullish', price: lastHigh, time: c.time });
      } else {
        bos.push({ type: 'bullish', price: lastHigh, time: c.time });
      }
      trend = 'bullish';
      lastHigh = c.high;
    } else if (c.close < lastLow) {
      if (trend === 'bullish') {
        choch.push({ type: 'bearish', price: lastLow, time: c.time });
      } else {
        bos.push({ type: 'bearish', price: lastLow, time: c.time });
      }
      trend = 'bearish';
      lastLow = c.low;
    }

    // Update swing highs/lows
    if (c.high > lastHigh) lastHigh = c.high;
    if (c.low < lastLow) lastLow = c.low;
  }

  return { bos: bos.slice(-3), choch: choch.slice(-2), fvg: fvg.slice(-5) };
}
