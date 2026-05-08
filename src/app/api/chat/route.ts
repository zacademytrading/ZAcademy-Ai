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

[SMC VISION PROTOCOL - MANDATORY FOR IMAGES]
If the user uploads a chart screenshot, you MUST:
1. Identify Market Structure: Locate the most recent BOS (Break of Structure) or ChoCh (Change of Character).
2. Spot Liquidity: Point out areas of Equal Highs/Lows or previous session highs/lows that have been swept.
3. Detect Imbalances: Highlight specific Fair Value Gaps (FVG) or Volume Imbalances visible on the chart.
4. Locate Supply/Demand: Find the valid Order Block (OB) or Breaker Block that lead to the current move.
5. Precision Analysis: Don't just describe the colors; analyze the price action and candle behavior.

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
