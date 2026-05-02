import { NextRequest, NextResponse } from 'next/server';
import { detectAssetType, SYMBOL_MAPPINGS, YAHOO_TICKER_MAP } from '@/lib/market-data';

const TWELVE_API_KEYS = [
  process.env.TWELVE_API_KEY,
  process.env.TWELVE_API_KEY2,
  process.env.TWELVE_API_KEY3,
  process.env.TWELVE_API_KEY4,
  process.env.TWELVE_API_KEY5,
].filter(Boolean) as string[];

async function getYahooHistory(ticker: string, interval: string) {
  // Map interval to Yahoo format: 1min->1m, 5min->5m, 1hour->1h, 1day->1d
  const intervalMap: Record<string, string> = {
    '1min': '1m', '5min': '5m', '15min': '15m', '30min': '30m', 
    '1h': '1h', '4h': '1h', '1day': '1d', '1week': '1wk', '1month': '1mo'
  };
  const yInterval = intervalMap[interval] || '1d';
  const range = (yInterval === '1d' || yInterval === '1wk' || yInterval === '1mo') ? '1y' : '5d';

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?interval=${yInterval}&range=${range}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];
    
    return timestamps.map((t: number, i: number) => ({
      time: yInterval === '1d' || yInterval === '1wk' || yInterval === '1mo' 
        ? new Date(t * 1000).toISOString().split('T')[0]
        : t,
      open: quotes.open[i],
      high: quotes.high[i],
      low: quotes.low[i],
      close: quotes.close[i],
    })).filter((v: any) => v.open !== null);
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol');
  const interval = searchParams.get('interval') || '1day';

  if (!symbol) return NextResponse.json({ error: 'Symbol required' }, { status: 400 });

  const upperSym = symbol.toUpperCase();
  const assetType = detectAssetType(upperSym);

  // Jika IDX atau Index Indonesia, prioritaskan Yahoo Finance
  if (assetType === 'stock_idx' || assetType === 'index' || upperSym.endsWith('.JK')) {
    const ticker = YAHOO_TICKER_MAP[upperSym.replace('.JK', '')] || (upperSym.endsWith('.JK') ? upperSym : upperSym + '.JK');
    const yData = await getYahooHistory(ticker, interval);
    if (yData) return NextResponse.json(yData);
  }

  // Mapping symbol for Twelve Data
  const mappedSymbol = SYMBOL_MAPPINGS[upperSym] || upperSym;

  for (const apiKey of TWELVE_API_KEYS) {
    try {
      const url = `https://api.twelvedata.com/time_series?symbol=${encodeURIComponent(mappedSymbol)}&interval=${interval}&apikey=${apiKey}&outputsize=50`;
      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'ok' && data.values) {
        // Format for Lightweight Charts
        const formatted = data.values.map((v: any) => {
          let timeValue: any;
          
          // Jika interval harian atau lebih, gunakan format YYYY-MM-DD
          if (interval.includes('day') || interval.includes('week') || interval.includes('month')) {
            timeValue = v.datetime.split(' ')[0]; // Ambil bagian tanggal saja
          } else {
            // Untuk intraday, gunakan Unix Timestamp
            timeValue = Math.floor(new Date(v.datetime).getTime() / 1000);
          }

          return {
            time: timeValue,
            open: parseFloat(v.open),
            high: parseFloat(v.high),
            low: parseFloat(v.low),
            close: parseFloat(v.close),
          };
        })
        // Filter data yang tidak valid
        .filter((d: any) => !isNaN(d.open) && d.time)
        .reverse();
        
        // Pastikan tidak ada duplikat waktu (bisa terjadi pada data Twelve Data)
        const uniqueFormatted = formatted.filter((v: any, i: number, a: any[]) => 
          i === 0 || v.time !== a[i-1].time
        );

        return NextResponse.json(uniqueFormatted);
      }
      
      if (data.code === 429) continue; // Rate limit, try next key
    } catch (e) {
      continue;
    }
  }

  return NextResponse.json({ error: 'Failed to fetch market history. Check API Keys or Symbol.' }, { status: 500 });
}
