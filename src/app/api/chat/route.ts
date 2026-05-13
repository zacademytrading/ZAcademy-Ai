// src/app/api/chat/route.ts
// Backend AI Chat — Groq (primary) | ZAcademy V2 + Credit System + Web Search

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { ZACADEMY_MODELS, type ModelKey } from '@/lib/models';
import { getMarketData } from '@/lib/market-data';
import { detectStructure, formatSMCContext } from '@/lib/smc-detector';
import { getMarketSentiment, getLatestTradingNews } from '@/lib/news';
import { calculateRisk, formatRiskContext } from '@/lib/risk-calculator';
import { saveErrorLog } from '@/lib/error-service';
import { deductCredits } from '@/lib/credits';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1';

const SYSTEM_PROMPT = `You are ZENIX, a professional advanced AI Trading assistant (Advanced System 2026) from ZAcademy.

[MASTERCLASS ZACADEMY: Panduan Lengkap Trading Forex A-Z]

1. FUNDAMENTAL & MEKANISME:
- Spot vs CFD: Trading Forex & Gold umumnya CFD. Bisa Buy/Long atau Sell/Short.
- Leverage & Margin: Leverage memperbesar daya beli (misal 1:100). Hati-hati Margin Call.
- Ekosistem: Trader, Broker (ambil Spread/Komisi), Liquidity Provider (LP).

2. TEKNIS ANALISA A-Z (Market Structure & Area Entry):
- Identifikasi Tren: Uptrend = [HH + HL] (Fokus BUY). Downtrend = [LH + LL] (Fokus SELL). Patah tren jika struktur diinvalidasi.
- Area Penting: Support & Resistance horizontal berbentuk "V", Trendline (sentuhan ketiga).
- Custom Fibonacci (Vectoring): Hanya gunakan level 0%, 100%, 61.8% & 78.6% (Zona Entry), dan -27% (Target TP).
  * Tarik Uptrend: 100% di Swing Low ke 0% di Swing High.
  * Tarik Downtrend: 100% di Swing High ke 0% di Swing Low.

3. FASE FUNDAMENTAL & NEWS TRADING:
- Hindari eksekusi normal saat NFP, FOMC, CPI.
- Strategi "Pending Order Trap": Identifikasi sideways, pasang Buy Stop/Sell Stop di atas/bawah area konsolidasi.
- Hati-hati pelebaran spread ekstrem dan slippage.

4. MASTERING SCALPING (XAUUSD M5/M15):
- Momentum Candle: Body sangat panjang (70-80%), ekor pendek. Menandakan ledakan volume.
- Setup Pullback Momentum: Tarik Custom Fibo di candle momentum. Entry level 23.6%, SL 74.5%, TP -27% (RR 1:1, Winrate tinggi). Momen terbaik: Sesi London & New York.
- Setup Breakout Pending: Buy Stop di atas Swing High, Sell Stop di bawah Swing Low (jarak 10-15 pips). SL/TP statis 150-200 pips (RR 1:1).

5. POLA CANDLESTICK (Market Auction):
- Continuation (Momentum): Body tebal, ekor pendek. Dominasi arah tren.
- Rejection (Reversal): Body kecil, ekor panjang di area SnR. Potensi pembalikan (Wait & See).

6. ARSITEKTUR DETEKSI TREN KOMPREHENSIF:
- Secara visual, trendline, EMA 200 (harga di atas naik, di bawah turun), dan utamanya Market Structure (PA).

7. MONEY MANAGEMENT & ALGORITMA LOT SIZING:
- Risk per Trade Statis: 1-2% modal. (Misal: Modal $1000, risk $10-$20).
- RRR Minimal: 1:2.
- Lot Size Dinamis = Nominal Risiko (USD) / Jarak Stop Loss (Points).
- SL logis diletakkan sedikit di luar level 100% Fibonacci.

8. PSIKOLOGI TRADING:
- Gunakan uang dingin. Modal kecil (Akun Cent) adalah ujian kedisiplinan.
- Hindari "Cycle of Doom" (gonta-ganti metode). Fokus satu metode (SMC/PA).
- Fokus pertumbuhan persentase, bukan nominal. Gunakan prinsip Compounding terukur.
- Waspadai "God Complex", SL wajib dipasang.

9. ALGORITMA EKSEKUSI (Logika Bot/EA):
- Deteksi Tren: HH/HL -> UPTREND, LH/LL -> DOWNTREND.
- Area Entry: Fibo 61.8 - 78.6.
- MM: Kalkulasi lot presisi. SL di luar level 100 Fibo, TP di -27% Fibo.
- Filter eksekusi berdasarkan News dan Spread.

[SMC VISION PROTOCOL - MANDATORY FOR IMAGES]
If the user uploads a chart screenshot, analyze using the ZAcademy Masterclass rules: Market structure, Trend, Momentum candles, Fibo logic.

MANDATORY OUTPUT RULES:
1. Always include disclaimer: "DISCLAIMER: Trading involves high risk. This is not financial advice."
2. If providing a signal/setup, format MUST be:
   ⚡ ZACADEMY SETUP: [SYMBOL] | [TIMEFRAME]
   Bias: [Bullish/Bearish]
   Entry Zone: [Price / Fibo 61.8%-78.6% / 23.6% Pullback]
   Invalidation (SL): [Price outside 100% Fibo or 74.5%]
   Target (TP): [Price at -27% Fibo or logical structure]
   Risk-Reward: [Ratio]
   Lot Calculation: [Based on Risk% and SL points]
   Logic: [Explain Market Structure / Momentum / News impact]
3. Use professional and to-the-point language, utilizing ZAcademy concepts.
4. If realtime data is available, use it as the PRIMARY reference and mention the price.
5. NEVER use ** (bold markdown) or * (italic markdown) in your responses. Use plain text only. For emphasis, use UPPERCASE or emoji instead. Do NOT wrap text in asterisks.
6. Do NOT output empty code blocks (\`\`\`\`\`\`). Only use code blocks when showing actual code.`;

const GROQ_MODELS: Record<ModelKey, string> = {
  'zenix-think': 'llama-3.3-70b-versatile',
  'zenix-fast': 'llama-3.1-8b-instant',
};

async function callGroq(messages: any[], model: string, temperature: number): Promise<string> {
  const res = await fetch(`${GROQ_BASE}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 4096,
      stream: false,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error('[GROQ ERROR]', err);
    throw new Error(err?.error?.message || `Groq HTTP ${res.status}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function sendErrorAlert(error: Error, context: string) {
  await saveErrorLog(error, context);
  console.error(`[🚨 ZENIX ERROR] ${context}: ${error.message}`);
}

/**
 * Real Web Search menggunakan DuckDuckGo HTML scraping
 * Lebih robust dengan multiple fallback
 */
async function performWebSearch(query: string): Promise<string> {
  try {
    // Append trading context agar hasil lebih relevan
    const searchQuery = `${query} trading forex crypto 2025 2026`;
    
    const res = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(searchQuery)}&kl=id-id`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!res.ok) return '';
    const html = await res.text();

    // Parse hasil search dengan regex yang lebih akurat
    const results: string[] = [];
    
    // Extract snippets
    const snippetMatches = html.matchAll(/class="result__snippet[^"]*"[^>]*>([^<]+(?:<[^>]+>[^<]*<\/[^>]+>)*[^<]*)<\/a>/gi);
    for (const match of snippetMatches) {
      const text = match[1].replace(/<[^>]+>/g, '').trim();
      if (text && text.length > 30) {
        results.push(text);
      }
      if (results.length >= 5) break;
    }

    // Fallback: extract any text content from results
    if (results.length === 0) {
      const allSnippets = html.match(/result__snippet[^>]*>([^<]{40,300})</g) || [];
      allSnippets.slice(0, 5).forEach(s => {
        const text = s.replace(/[^>]+>/, '').trim();
        if (text) results.push(text);
      });
    }

    if (results.length === 0) return '';

    return `\n\n[🔍 WEB SEARCH RESULTS for: "${query}"]\n${results.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n[Source: Real-time web search via ZENIX Search]`;
  } catch (e) {
    console.error('[Web Search Error]:', e);
    return '';
  }
}

async function getHistoryData(symbol: string, interval: string = '1h') {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/market/history?symbol=${symbol}&interval=${interval}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

function extractSymbol(text: string): string | null {
  const symbolRegex = /\b(XAUUSD|XAGUSD|GOLD|EMAS|BTCUSD|ETHUSD|EURUSD|GBPUSD|USDJPY|IHSG|LQ45|[A-Z]{3,6})\b/gi;
  const matches = text.match(symbolRegex);
  return matches ? matches[0].toUpperCase() : null;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, model, settings, userId, useWebSearch } = await req.json();
    const modelKey = (model as ModelKey) || 'zenix-think';
    const modelConfig = ZACADEMY_MODELS[modelKey];
    const groqModel = GROQ_MODELS[modelKey] || 'llama-3.3-70b-versatile';

    const lang = settings?.language || 'English';
    const personalIntel = settings?.personalIntelligence || '';

    // ── CREDIT CHECK ─────────────────────────────────────────
    if (userId) {
      const creditResult = await deductCredits(userId, modelKey);
      if (!creditResult.success) {
        return NextResponse.json(
          { error: creditResult.error || 'Kredit habis. Tunggu reset bulanan.' },
          { status: 402 } // Payment Required
        );
      }
    }

    // ── BUILD DYNAMIC PROMPT ──────────────────────────────────
    let dynamicPrompt = `${SYSTEM_PROMPT}\n\nIMPORTANT: You MUST respond in ${lang}.\nCharacter: Professional, objective, and highly intelligent.`;
    if (personalIntel) dynamicPrompt += `\n\n[INSTRUKSI PERSONAL]: ${personalIntel}`;

    const lastMsg = messages[messages.length - 1];
    const userQuery = typeof lastMsg?.content === 'string' ? lastMsg.content : '';

    let marketContext = '';
    let smcContext = '';
    let searchContext = '';
    let sentimentContext = '';
    const sym = extractSymbol(userQuery);

    // ── WEB SEARCH (jika user aktifkan toggle) ────────────────
    if (useWebSearch && userQuery) {
      try {
        searchContext = await performWebSearch(userQuery);
      } catch (e) {
        console.error('[Search Error]', e);
      }
    } else if (!useWebSearch && (
      userQuery.toLowerCase().includes('berita') ||
      userQuery.toLowerCase().includes('news') ||
      userQuery.toLowerCase().includes('sentimen') ||
      userQuery.toLowerCase().includes('update')
    )) {
      // Auto-search hanya untuk query berita/sentimen tanpa toggle
      try {
        const searchQuery = sym ? `${sym} trading news sentiment 2026` : userQuery;
        searchContext = await performWebSearch(searchQuery);
      } catch (e) {}
    }

    // ── MARKET DATA, MTF, SENTIMEN & NEWS ─────────────────────
    if (sym) {
      try {
        const [md, history1h, history4h, history1d, sentiment, news] = await Promise.all([
          getMarketData(sym),
          getHistoryData(sym, '1h'),
          getHistoryData(sym, '4h'),
          getHistoryData(sym, '1day'),
          getMarketSentiment(sym),
          getLatestTradingNews(sym)
        ]);

        if (md?.price) {
          marketContext = `\n\n[DATA PASAR REALTIME] Aset: ${sym}, Harga: ${md.price}, Change: ${md.change_percent}%`;
        }

        if (sentiment) {
          sentimentContext = `\n\n[SENTIMEN PASAR] ${sentiment}`;
        }

        if (news && news.length > 0) {
          sentimentContext += `\n\n[BERITA TERBARU ${sym}]\n` + news.map((n, i) => `${i+1}. ${n.title} (${n.source})`).join('\n');
        }

        // Multi-Timeframe Analysis
        if (history1d && Array.isArray(history1d)) {
          smcContext += formatSMCContext(detectStructure(history1d), 'Daily (HTF)');
        }
        if (history4h && Array.isArray(history4h)) {
          smcContext += formatSMCContext(detectStructure(history4h), 'H4 (MTF)');
        }
        if (history1h && Array.isArray(history1h)) {
          smcContext += formatSMCContext(detectStructure(history1h), 'H1 (LTF)');
        }

        // ── RISK CALCULATOR LOGIC ─────────────────────────────
        const balanceMatch = userQuery.match(/(?:modal|balance|capital|dana)\s*(?:\$|usd)?\s*(\d+(?:\.\d+)?)/i);
        const riskMatch = userQuery.match(/(?:risiko|risk)\s*(\d+(?:\.\d+)?)\s*%/i);
        const slMatch = userQuery.match(/(?:sl|stop loss)\s*(?:di|at)?\s*(\d+(?:\.\d+)?)/i);

        if (balanceMatch && md?.price && slMatch) {
          const balance = parseFloat(balanceMatch[1]);
          const riskPercent = riskMatch ? parseFloat(riskMatch[1]) : 1; // Default 1%
          const stopLoss = parseFloat(slMatch[1]);
          
          const riskReport = calculateRisk({
            balance,
            riskPercent,
            entryPrice: md.price,
            stopLoss,
            symbol: sym,
            assetType: md.type || 'unknown'
          });
          
          smcContext += `\n\n${formatRiskContext(riskReport)}`;
        }
      } catch (e) {
        console.error('[Market Data Error]', e);
      }
    }

    // ── SANITIZE MESSAGES ─────────────────────────────────────
    const sanitizeMessages = (rawMessages: any[]): any[] => {
      return rawMessages.map((msg) => {
        if (msg.role === 'assistant') {
          const text = typeof msg.content === 'string'
            ? msg.content
            : Array.isArray(msg.content)
              ? msg.content.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('')
              : String(msg.content || '');
          return { role: 'assistant', content: text };
        }

        if (msg.role === 'user') {
          if (typeof msg.content === 'string') {
            return { role: 'user', content: msg.content };
          }

          if (Array.isArray(msg.content)) {
            const textParts = msg.content.filter((c: any) => c?.type === 'text');
            const imgParts  = msg.content.filter((c: any) => c?.type === 'image_url');
            const supportsVision = groqModel.includes('70b') || groqModel.includes('scout') || groqModel.includes('vision');
            const parts: any[] = textParts.length > 0 ? textParts : [{ type: 'text', text: '' }];
            if (supportsVision && imgParts.length > 0) {
              parts.push(imgParts[imgParts.length - 1]);
            }
            if (!supportsVision || imgParts.length === 0) {
              const plainText = textParts.map((c: any) => c?.text || '').join(' ').trim();
              return { role: 'user', content: plainText };
            }
            return { role: 'user', content: parts };
          }
        }

        return msg;
      });
    };

    const apiMessages = sanitizeMessages([
      { role: 'system', content: dynamicPrompt + marketContext + smcContext + searchContext + sentimentContext },
      ...messages
    ]);

    const content = await callGroq(apiMessages, groqModel, modelConfig.temperature);
    return NextResponse.json({ content, model: groqModel });

  } catch (error: any) {
    await sendErrorAlert(error, 'POST /api/chat');
    return NextResponse.json({ error: 'ZENIX sedang melakukan kalibrasi sistem...' }, { status: 500 });
  }
}
