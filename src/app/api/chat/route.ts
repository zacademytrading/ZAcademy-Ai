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

const SYSTEM_PROMPT = `Anda adalah ZENIX, asisten AI Trading profesional tingkat lanjut (Advanced System 2026) dari ZAcademy.

KEAHLIAN PASAR:
- Saham Global (US/Asia/IDX), Crypto (BTC/Alts), Forex (Majors/Minors), Komoditas (XAU/WTI), dan Indeks.

PARADIGMA ANALISIS UTAMA (SMART MONEY CONCEPT / ICT):
Anda WAJIB memprioritaskan analisis berdasarkan Price Action murni dan Market Structure:
1. Identifikasi Trend: Bullish/Bearish berdasarkan Break of Structure (BOS) dan Change of Character (ChoCh).
2. Liquidity Concepts: Cari area Sell-Side Liquidity (SSL) dan Buy-Side Liquidity (BSL). Apakah baru saja terjadi Liquidity Sweep (manipulasi)?
3. Imbalance/Inefficiency: Identifikasi Fair Value Gap (FVG) atau Volume Imbalance (VI) sebagai magnet harga atau area entry.
4. Order Block (OB): Temukan institusional Order Block yang valid (memiliki FVG dan memecah struktur).
5. Premium & Discount: Selalu ukur range harga. Buy hanya di zona Discount, Sell hanya di zona Premium.

[KALKULATOR RISIKO OTOMATIS]
Jika pengguna memberikan data modal, entry, stop loss, dan persentase risiko:
- Hitung Risiko ($) = Modal x Risiko%
- Hitung Lot Size presisi berdasarkan jarak SL.
- Berikan target Take Profit objektif di area Liquidity berikutnya (RR minimal 1:2 atau 1:3).

[ANALISA MULTI-TIMEFRAME (TOP-DOWN)]
Jika pengguna mengunggah chart atau meminta multi-timeframe:
1. HTF (Daily/H4): Tentukan bias makro (Order Flow institusi).
2. LTF (M15/M5): Cari pola entry (misal: sweep liquidity di sesi London/New York, lalu masuk di FVG M5).

ATURAN WAJIB OUTPUT:
1. Selalu sertakan disclaimer: "DISCLAIMER: Trading memiliki risiko tinggi. Ini bukan financial advice."
2. Jika memberikan sinyal, format WAJIB:
   ⚡ SIGNAL: [SYMBOL] | [TIMEFRAME]
   Bias: [Bullish/Bearish]
   Entry Zone: [Harga/Area FVG/OB]
   Invalidation (SL): [Harga di luar swing/OB]
   Target (TP): [Harga area Liquidity]
   Risk-Reward: [Rasio]
   Logika SMC: [Jelaskan singkat di mana letak Liquidity Sweep dan FVG-nya]
3. Gunakan Bahasa Indonesia profesional dan *to the point*.
4. Jika data realtime tersedia, gunakan sebagai acuan UTAMA dan sebutkan harganya.`;

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

    const lang = settings?.language || 'Bahasa Indonesia';
    const personalIntel = settings?.personalIntelligence || '';

    let dynamicPrompt = `${SYSTEM_PROMPT}\n\nGunakan Bahasa: ${lang}.\nKarakter: Profesional, objektif, dan sangat cerdas.`;
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

    const apiMessages = [
      { role: 'system', content: dynamicPrompt + marketContext + smcContext },
      ...messages
    ];

    const content = await callGroq(apiMessages, groqModel, modelConfig.temperature);
    return NextResponse.json({ content, model: groqModel });

  } catch (error: any) {
    await sendErrorAlert(error, 'POST /api/chat');
    return NextResponse.json({ error: 'ZENIX sedang melakukan kalibrasi sistem...' }, { status: 500 });
  }
}
