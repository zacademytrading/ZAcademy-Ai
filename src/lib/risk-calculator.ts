/**
 * src/lib/risk-calculator.ts
 * Advanced Risk Management for ZAcademy SMC System
 */

export interface RiskRequest {
  balance: number;
  riskPercent: number;
  entryPrice: number;
  stopLoss: number;
  symbol: string;
  assetType: 'crypto' | 'forex' | 'stock' | 'stock_idx' | 'commodity' | 'index' | 'unknown';
}

export interface RiskReport {
  riskAmount: number;
  lotSize: number;
  riskReward: number;
  takeProfit1: number;
  takeProfit2: number;
  description: string;
}

/**
 * Menghitung ukuran posisi (Lot Size) dan Target Profit ideal
 */
export function calculateRisk(req: RiskRequest): RiskReport {
  const { balance, riskPercent, entryPrice, stopLoss, symbol, assetType } = req;
  
  // 1. Hitung jumlah uang yang dipertaruhkan ($)
  const riskAmount = (balance * riskPercent) / 100;
  
  // 2. Hitung jarak SL
  const slDistance = Math.abs(entryPrice - stopLoss);
  
  if (slDistance === 0) {
    return {
      riskAmount,
      lotSize: 0,
      riskReward: 0,
      takeProfit1: 0,
      takeProfit2: 0,
      description: "Stop Loss tidak boleh sama dengan Entry Price."
    };
  }

  let lotSize = 0;
  let description = "";

  // 3. Perhitungan Lot Berdasarkan Asset Type
  if (assetType === 'forex') {
    // Estimasi standar: 1 Lot = 100,000 unit. 
    // Pip value rata-rata $10 per lot untuk mayor (EURUSD, GBPUSD).
    // Untuk simplifikasi di AI Assistant, kita gunakan rumus: Lot = Risk$ / (SL_Distance * Multiplier)
    // Multiplier untuk forex (kecuali JPY) biasanya 100,000
    const multiplier = symbol.includes('JPY') ? 1000 : 100000;
    lotSize = riskAmount / (slDistance * multiplier);
    description = `Ukuran posisi direkomendasikan adalah ${lotSize.toFixed(2)} Lot standar.`;
  } 
  else if (assetType === 'crypto' || assetType === 'stock' || assetType === 'stock_idx') {
    // Untuk Crypto/Stock: Lot = Risk$ / SL_Distance
    lotSize = riskAmount / slDistance;
    description = `Ukuran posisi direkomendasikan adalah ${lotSize.toFixed(4)} unit/lembar saham.`;
  }
  else {
    // Default / Commodities
    lotSize = riskAmount / slDistance;
    description = `Estimasi ukuran posisi: ${lotSize.toFixed(2)} unit. Harap sesuaikan dengan spesifikasi kontrak broker Anda.`;
  }

  // 4. Hitung Take Profit (SMC Style: Minimal RR 1:2 dan 1:3)
  const isBullish = entryPrice > stopLoss;
  const tp1 = isBullish ? entryPrice + (slDistance * 2) : entryPrice - (slDistance * 2);
  const tp2 = isBullish ? entryPrice + (slDistance * 3) : entryPrice - (slDistance * 3);

  return {
    riskAmount,
    lotSize,
    riskReward: 2.0, // Base RR 1:2
    takeProfit1: tp1,
    takeProfit2: tp2,
    description
  };
}

/**
 * Format laporan risiko ke string untuk AI
 */
export function formatRiskContext(report: RiskReport): string {
  if (report.lotSize === 0) return "";

  return `
[AUTOMATIC RISK MANAGEMENT]
- Risk per Trade: $${report.riskAmount.toFixed(2)}
- Recommended Position Size: ${report.lotSize.toFixed(4)}
- TP1 (RR 1:2): ${report.takeProfit1.toFixed(report.takeProfit1 < 10 ? 5 : 2)}
- TP2 (RR 1:3): ${report.takeProfit2.toFixed(report.takeProfit2 < 10 ? 5 : 2)}
- Insight: ${report.description}
  `.trim();
}
