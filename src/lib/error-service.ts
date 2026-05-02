// src/lib/error-service.ts
import fs from 'fs';
import path from 'path';

export interface ErrorLog {
  id: string;
  timestamp: string;
  context: string;
  message: string;
  stack?: string;
  explanation: string;
  suggestion: string;
}

const LOG_FILE = path.join(process.cwd(), 'error_logs.json');

const ERROR_TRANSLATIONS: Record<string, { explanation: string, suggestion: string }> = {
  'Groq HTTP 429': {
    explanation: 'Limit API Groq tercapai. Anda terlalu cepat mengirim permintaan.',
    suggestion: 'Tunggu 1 menit atau ganti API Key Groq di .env.local.'
  },
  'Groq HTTP 401': {
    explanation: 'API Key Groq tidak valid atau tidak ditemukan.',
    suggestion: 'Periksa variabel GROQ_API_KEY di file .env.local.'
  },
  'Failed to fetch market history': {
    explanation: 'Gagal mengambil data historis dari Twelve Data/Yahoo Finance.',
    suggestion: 'Cek koneksi internet server atau validitas simbol aset yang dimasukkan.'
  },
  'Twelve Data': {
    explanation: 'Error pada penyedia data Twelve Data (limit atau simbol salah).',
    suggestion: 'Gunakan simbol fallback atau periksa API Key Twelve Data.'
  },
  'Internal server error': {
    explanation: 'Kesalahan logika internal pada kode server.',
    suggestion: 'Periksa log konsol untuk melihat baris kode yang menyebabkan crash.'
  }
};

export async function saveErrorLog(error: Error, context: string) {
  const message = error.message;
  let explanation = 'Kesalahan sistem tidak teridentifikasi secara spesifik.';
  let suggestion = 'Hubungi tim teknis atau periksa stack trace di bawah.';

  // Cari kecocokan terjemahan
  for (const [key, val] of Object.entries(ERROR_TRANSLATIONS)) {
    if (message.includes(key)) {
      explanation = val.explanation;
      suggestion = val.suggestion;
      break;
    }
  }

  const newLog: ErrorLog = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    context,
    message,
    stack: error.stack,
    explanation,
    suggestion
  };

  try {
    let logs: ErrorLog[] = [];
    if (fs.existsSync(LOG_FILE)) {
      const content = fs.readFileSync(LOG_FILE, 'utf-8');
      logs = JSON.parse(content);
    }
    
    logs.unshift(newLog); // Tambahkan ke atas
    fs.writeFileSync(LOG_FILE, JSON.stringify(logs.slice(0, 100), null, 2)); // Simpan 100 log terakhir
    return newLog;
  } catch (err) {
    console.error('Failed to save log file:', err);
    return null;
  }
}

export function getErrorLogs(): ErrorLog[] {
  if (!fs.existsSync(LOG_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

export function clearLogs() {
  if (fs.existsSync(LOG_FILE)) {
    fs.writeFileSync(LOG_FILE, JSON.stringify([]));
  }
}
