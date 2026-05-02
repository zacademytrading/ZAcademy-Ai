-- SQL untuk Supabase: Tambah kolom kredit ke tabel profiles
-- Jalankan di Supabase SQL Editor: https://supabase.com/dashboard/project/xktkruqvaylhsgwvwjjw/sql

-- Tambah kolom kredit jika belum ada
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS credits_remaining INTEGER DEFAULT 150,
ADD COLUMN IF NOT EXISTS credits_reset_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days');

-- Update semua user yang belum punya kredit
UPDATE profiles 
SET 
  credits_remaining = 150,
  credits_reset_at = NOW() + INTERVAL '30 days'
WHERE credits_remaining IS NULL;

-- Verifikasi
SELECT id, credits_remaining, credits_reset_at FROM profiles LIMIT 5;
