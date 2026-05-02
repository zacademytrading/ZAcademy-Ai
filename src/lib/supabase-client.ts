import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xktkruqvaylhsgwvwjjw.supabase.co').replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
let rawKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
// Fix potential duplicate JWT key paste issues gracefully
const parts = rawKey.split('.');
const SUPABASE_ANON_KEY = parts.length >= 3 ? `${parts[0]}.${parts[1]}.${parts[2]}` : rawKey;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── AUTH METHODS ────────────────────────────────────────────

// Sign in with email + password
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) {
    if (error.message.includes('Invalid login credentials')) {
      throw new Error('Email/Password salah, ATAU Email belum dikonfirmasi.');
    }
    throw new Error(error.message || 'Email atau password salah');
  }
  return data; // { user, session }
};

// Sign up with email + password
export const signUpWithEmail = async (email: string, password: string, name: string) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { full_name: name.trim() }
    }
  });
  if (error) throw new Error(error.message || 'Gagal membuat akun');
  
  // Supabase returns a fake user object if the email already exists (for security/privacy)
  // We can check if identities array is empty, which indicates the user already existed.
  if (data?.user && data.user.identities && data.user.identities.length === 0) {
    throw new Error('Email ini sudah terdaftar. Silakan langsung login.');
  }
  
  return data;
};

// Reset Password
export const resetPasswordForEmail = async (email: string) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  if (error) throw new Error(error.message || 'Gagal mengirim link reset password');
};

// Get current session/user
export const getUserSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) return null;
  return session;
};

// Exchange code for session (usually handled automatically by supabase-js)
export const exchangeCodeForSession = async () => {
  // Handled automatically by supabase-js via auth state listener
  return null;
};

// Start Google OAuth Flow
export const signInWithGoogle = async (redirectUrl: string) => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });
  if (error) throw new Error(error.message);
  return data.url;
};

// ── DATABASE METHODS ────────────────────────────────────────

export const supabaseDb = {
  async getChats(userId: string) {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching chats:', error);
      return [];
    }
    return data || [];
  },

  async upsertChat(chat: any) {
    const { error } = await supabase
      .from('chats')
      .upsert(chat, { onConflict: 'id' });
      
    if (error) {
      console.error('Error upserting chat:', error);
    }
  },

  async deleteChat(chatId: string) {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);
      
    if (error) {
      console.error('Error deleting chat:', error);
    }
  },

  async getUserProfile(userId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) {
      if (error.code !== 'PGRST116') console.error('Error fetching profile:', error);
      return null;
    }
    return data;
  },

  async updateUserProfile(userId: string, profile: any) {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, ...profile }, { onConflict: 'id' });
      
    if (error) {
      console.error('Error updating profile:', error);
    }
  }
};
