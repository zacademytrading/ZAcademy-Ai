// src/app/api/chat/route.ts
// Backend AI Chat — Groq (primary) | ZAcademy V2

import { NextRequest, NextResponse } from 'next/server';
import { ZACADEMY_MODELS, type ModelKey } from '@/lib/models';
import { getMarketData, detectAssetType } from '@/lib/market-data';
import { getLatestTradingNews } from '@/lib/news';
import { detectStructure } from '@/lib/smc-detector';
import { saveErrorLog } from '@/lib/error-service';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_BASE = 'https://api.groq.com/openai/v1';
const ADMIN_EMAILS = ['mwildanhikamd@gmail.com', 'zenixproffiicial@gmail.com'];

const SYSTEM_PROMPT = `You are ZENIX, a professional advanced AI Trading assistant (Advanced System 2026) from ZAcademy.

MARKET EXPERTISE:
- Global Stocks (US/Asia/IDX), Crypto (BTC/Alts), Forex (Majors/Minors), Commodities (XAU/WTI), and Indices.

CORE ANALYSIS PARADIGM (SMART MONEY CONCEPT / ICT):
You MUST prioritize analysis based on pure Price Action and Market Structure:
1. Trend Identification: Bullish/Bearish based on Break of Structure (BOS) and Change of Character (ChoCh).
2. Liquidity Concepts: Look for Sell-Side Liquidity (SSL) and Buy-Side Liquidity (BSL) areas. Has a Liquidity Sweep (manipulation) just occurred?
3. Imbalance/Inefficiency: Identify Fair Value Gap (FVG) or Volume Imbalance (VI) as price magnets or entry areas.
4. Order Block (OB): Find valid institutional Order Blocks (must have FVG and break structure).
5. Premium & Discount: Always measure price range. Buy only in Discount zones, Sell only in Premium zones.

[AUTOMATIC RISK CALCULATOR]
If the user provides capital, entry, stop loss, and risk percentage:
- Calculate Risk ($) = Capital x Risk%
- Calculate precision Lot Size based on SL distance.
- Provide objective Take Profit targets at the next Liquidity area (minimum RR 1:2 or 1:3).

[MULTI-TIMEFRAME ANALYSIS (TOP-DOWN)]
If user uploads a chart or asks for multi-timeframe:
1. HTF (Daily/H4): Determine macro bias (Institutional Order Flow).
2. LTF (M15/M5): Look for entry patterns (e.g., liquidity sweep in London/New York session, then enter at M5 FVG).

MANDATORY OUTPUT RULES:
1. Always include disclaimer: "DISCLAIMER: Trading involves high risk. This is not financial advice."
2. If providing a signal, format MUST be:
   ⚡ SIGNAL: [SYMBOL] | [TIMEFRAME]
   Bias: [Bullish/Bearish]
   Entry Zone: [Price/FVG Area/OB]
   Invalidation (SL): [Price outside swing/OB]
   Target (TP): [Price at Liquidity area]
   Risk-Reward: [Ratio]
   SMC Logic: [Explain briefly where the Liquidity Sweep and FVG are]
3. Use professional and to-the-point language.
4. If realtime data is available, use it as the PRIMARY reference and mention the price.`;

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
  // Simpan ke log file untuk Admin Dashboard
  await saveErrorLog(error, context);

  const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
  const logMsg = `
========================================
[🚨 ZENIX AUTO-ALERT — ERROR DETECTED]
Timestamp : ${timestamp} WIB
Context   : ${context}
Error     : ${error.message}
========================================`;
  console.error(logMsg);
}

async function fetchDuckDuckGoNews(query: string): Promise<string> {
  try {
    const res = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (!res.ok) return '';
    const html = await res.text();
    const snippets = html.match(/<a class="result__snippet[^>]*>(.*?)<\/a>/gi) || [];
    return snippets.slice(0, 3).map(s => s.replace(/<[^>]+>/g, '').trim()).join('\n- ');
  } catch (e) {
    return '';
  }
}

async function getHistoryData(symbol: string, interval: string = '1h') {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const res = await fetch(`${baseUrl}/api/market/history?symbol=${symbol}&interval=${interval}`);
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
    const { messages, model, settings } = await req.json();
    const modelKey = (model as ModelKey) || 'zenix-think';
    const modelConfig = ZACADEMY_MODELS[modelKey];
    const groqModel = GROQ_MODELS[modelKey] || 'llama-3.3-70b-versatile';

    const lang = settings?.language || 'English';
    const personalIntel = settings?.personalIntelligence || '';

    let dynamicPrompt = `${SYSTEM_PROMPT}\n\nIMPORTANT: You MUST respond in ${lang}.\nCharacter: Professional, objective, and highly intelligent.`;
    if (personalIntel) dynamicPrompt += `\n\n[INSTRUKSI PERSONAL]: ${personalIntel}`;

    const lastMsg = messages[messages.length - 1];
    const userQuery = typeof lastMsg?.content === 'string' ? lastMsg.content : '';
    
    let marketContext = '';
    let smcContext = '';
    const sym = extractSymbol(userQuery);

    if (sym) {
      try {
        const [md, history] = await Promise.all([
          getMarketData(sym),
          getHistoryData(sym, '1h')
        ]);

        if (md?.price) {
          marketContext = `\n\n[DATA PASAR REALTIME] Aset: ${sym}, Harga: ${md.price}, Change: ${md.change_percent}%`;
        }

        if (history && Array.isArray(history)) {
          const structure = detectStructure(history);
          smcContext = `\n\n[ANALISA SMC] BOS: ${structure.bos.length}, ChoCh: ${structure.choch.length}, FVG: ${structure.fvg.length}`;
        }
      } catch (e) {}
    }

    // Sanitize messages: Groq hanya terima content sebagai string atau
    // array sederhana [{ type: 'text', text: ... }, { type: 'image_url', ... }]
    // Pesan assistant HARUS berupa string (tidak boleh array)
    const sanitizeMessages = (rawMessages: any[]): any[] => {
      return rawMessages.map((msg) => {
        // Role assistant: paksa jadi string
        if (msg.role === 'assistant') {
          const text = typeof msg.content === 'string'
            ? msg.content
            : Array.isArray(msg.content)
              ? msg.content.map((c: any) => (typeof c === 'string' ? c : c?.text || '')).join('')
              : String(msg.content || '');
          return { role: 'assistant', content: text };
        }

        // Role user: normalkan content
        if (msg.role === 'user') {
          // Sudah string — kirim apa adanya
          if (typeof msg.content === 'string') {
            return { role: 'user', content: msg.content };
          }

          // Array content (bisa ada gambar) — hanya ambil teks + 1 gambar terakhir
          if (Array.isArray(msg.content)) {
            const textParts = msg.content.filter((c: any) => c?.type === 'text');
            const imgParts  = msg.content.filter((c: any) => c?.type === 'image_url');

            // Model fast (8b) tidak mendukung vision — hapus gambar
            const supportsVision = groqModel.includes('70b') || groqModel.includes('scout') || groqModel.includes('vision');

            const parts: any[] = textParts.length > 0 ? textParts : [{ type: 'text', text: '' }];
            if (supportsVision && imgParts.length > 0) {
              // Hanya kirim 1 gambar terakhir (Groq limit)
              parts.push(imgParts[imgParts.length - 1]);
            }

            // Jika tidak ada gambar atau tidak support vision, return plain string
            if (!supportsVision || imgParts.length === 0) {
              const plainText = textParts.map((c: any) => c?.text || '').join(' ').trim();
              return { role: 'user', content: plainText };
            }

            return { role: 'user', content: parts };
          }
        }

        // System role — biarkan apa adanya
        return msg;
      });
    };

    const apiMessages = sanitizeMessages([
      { role: 'system', content: dynamicPrompt + marketContext + smcContext },
      ...messages
    ]);

    const content = await callGroq(apiMessages, groqModel, modelConfig.temperature);
    return NextResponse.json({ content, model: groqModel });

  } catch (error: any) {
    await sendErrorAlert(error, 'POST /api/chat');
    return NextResponse.json({ error: 'ZENIX sedang melakukan kalibrasi sistem...' }, { status: 500 });
  }
}
