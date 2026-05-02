// src/lib/credits.ts
// Zenix Credit System — Free Tier dengan mode-based consumption

import { supabase } from './supabase-client';

export const CREDIT_CONFIG = {
  FREE_MONTHLY_CREDITS: 150,      // Total kredit per bulan untuk free tier
  FAST_MODE_COST: 1,              // FAST mode = 1 kredit/pesan (hemat 3x)
  THINK_MODE_COST: 3,             // THINK mode = 3 kredit/pesan (lebih boros)
  RESET_INTERVAL_DAYS: 30,        // Reset setiap 30 hari
} as const;

export interface CreditInfo {
  remaining: number;
  total: number;
  resetAt: string;
  costFast: number;
  costThink: number;
}

/**
 * Ambil info kredit user dari Supabase profiles
 */
export async function getUserCredits(userId: string): Promise<CreditInfo | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('credits_remaining, credits_reset_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('[Credits] Fetch error:', error.message);
      return null;
    }

    // Jika belum ada record kredit, inisialisasi
    if (!data || data.credits_remaining === null || data.credits_remaining === undefined) {
      await initializeCredits(userId);
      return {
        remaining: CREDIT_CONFIG.FREE_MONTHLY_CREDITS,
        total: CREDIT_CONFIG.FREE_MONTHLY_CREDITS,
        resetAt: getNextResetDate(),
        costFast: CREDIT_CONFIG.FAST_MODE_COST,
        costThink: CREDIT_CONFIG.THINK_MODE_COST,
      };
    }

    // Cek apakah sudah waktunya reset
    const resetAt = data.credits_reset_at ? new Date(data.credits_reset_at) : new Date(0);
    if (new Date() > resetAt) {
      await resetCredits(userId);
      return {
        remaining: CREDIT_CONFIG.FREE_MONTHLY_CREDITS,
        total: CREDIT_CONFIG.FREE_MONTHLY_CREDITS,
        resetAt: getNextResetDate(),
        costFast: CREDIT_CONFIG.FAST_MODE_COST,
        costThink: CREDIT_CONFIG.THINK_MODE_COST,
      };
    }

    return {
      remaining: Math.max(0, data.credits_remaining),
      total: CREDIT_CONFIG.FREE_MONTHLY_CREDITS,
      resetAt: data.credits_reset_at,
      costFast: CREDIT_CONFIG.FAST_MODE_COST,
      costThink: CREDIT_CONFIG.THINK_MODE_COST,
    };
  } catch (e) {
    console.error('[Credits] getUserCredits error:', e);
    return null;
  }
}

/**
 * Kurangi kredit user setelah pesan berhasil dikirim
 * @returns remaining credits after deduction, atau -1 jika gagal/tidak cukup kredit
 */
export async function deductCredits(userId: string, modelKey: 'zenix-fast' | 'zenix-think'): Promise<{ success: boolean; remaining: number; error?: string }> {
  try {
    const cost = modelKey === 'zenix-fast' ? CREDIT_CONFIG.FAST_MODE_COST : CREDIT_CONFIG.THINK_MODE_COST;

    // Ambil kredit saat ini
    const { data, error } = await supabase
      .from('profiles')
      .select('credits_remaining, credits_reset_at')
      .eq('id', userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Jika belum ada, inisialisasi dulu
    if (!data || data.credits_remaining === null || data.credits_remaining === undefined) {
      await initializeCredits(userId);
      const newRemaining = CREDIT_CONFIG.FREE_MONTHLY_CREDITS - cost;
      await supabase.from('profiles').update({ credits_remaining: newRemaining }).eq('id', userId);
      return { success: true, remaining: newRemaining };
    }

    // Cek apakah perlu reset
    const resetAt = data.credits_reset_at ? new Date(data.credits_reset_at) : new Date(0);
    let currentCredits = data.credits_remaining;
    if (new Date() > resetAt) {
      currentCredits = CREDIT_CONFIG.FREE_MONTHLY_CREDITS;
      await resetCredits(userId);
    }

    // Cek apakah kredit cukup
    if (currentCredits < cost) {
      return { success: false, remaining: currentCredits, error: `Kredit tidak cukup. Butuh ${cost} kredit, tersisa ${currentCredits}. Kredit akan direset tanggal ${new Date(data.credits_reset_at).toLocaleDateString('id-ID')}.` };
    }

    const newRemaining = currentCredits - cost;
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits_remaining: newRemaining })
      .eq('id', userId);

    if (updateError) throw new Error(updateError.message);

    return { success: true, remaining: newRemaining };
  } catch (e: any) {
    console.error('[Credits] deductCredits error:', e);
    return { success: true, remaining: CREDIT_CONFIG.FREE_MONTHLY_CREDITS }; // Fail open — jangan block user jika DB error
  }
}

/**
 * Inisialisasi kredit untuk user baru
 */
async function initializeCredits(userId: string): Promise<void> {
  const resetAt = getNextResetDate();
  await supabase.from('profiles').upsert({
    id: userId,
    credits_remaining: CREDIT_CONFIG.FREE_MONTHLY_CREDITS,
    credits_reset_at: resetAt,
  }, { onConflict: 'id' });
}

/**
 * Reset kredit ke nilai awal
 */
async function resetCredits(userId: string): Promise<void> {
  const resetAt = getNextResetDate();
  await supabase.from('profiles').update({
    credits_remaining: CREDIT_CONFIG.FREE_MONTHLY_CREDITS,
    credits_reset_at: resetAt,
  }).eq('id', userId);
}

function getNextResetDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + CREDIT_CONFIG.RESET_INTERVAL_DAYS);
  return date.toISOString();
}
