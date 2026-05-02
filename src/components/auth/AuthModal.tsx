'use client';
import React from 'react';
import { Brain, Globe } from 'lucide-react';

interface AuthModalProps {
  authMode: 'login' | 'register' | 'reset';
  setAuthMode: (mode: 'login' | 'register' | 'reset') => void;
  loginEmail: string;
  setLoginEmail: (v: string) => void;
  loginPass: string;
  setLoginPass: (v: string) => void;
  regName: string;
  setRegName: (v: string) => void;
  regEmail: string;
  setRegEmail: (v: string) => void;
  regPass: string;
  setRegPass: (v: string) => void;
  handleAuth: (action: 'login' | 'register' | 'reset') => void;
  signInWithGoogle: (origin: string) => Promise<string>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  authMode, setAuthMode,
  loginEmail, setLoginEmail,
  loginPass, setLoginPass,
  regName, setRegName,
  regEmail, setRegEmail,
  regPass, setRegPass,
  handleAuth,
  signInWithGoogle
}) => {
  return (
    <div style={{ display: 'flex', height: '100vh', background: '#09090b', color: '#f8fafc', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
      {/* Background Elements */}
      <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, background: 'rgba(124, 58, 237, 0.1)', filter: 'blur(100px)', borderRadius: '50%', zIndex: 0 }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '10%', width: 300, height: 300, background: 'rgba(236, 72, 153, 0.05)', filter: 'blur(80px)', borderRadius: '50%', zIndex: 0 }} />
      
      <div style={{ width: '100%', maxWidth: 440, background: 'rgba(24, 24, 27, 0.6)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 28, padding: 40, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)', zIndex: 10, animation: 'springUp 0.6s cubic-bezier(0.25, 1, 0.5, 1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px', boxShadow: '0 8px 24px rgba(124,58,237,0.3)', border: '2px solid #7c3aed' }}>
            <img src="/logo-dark.jpg" alt="ZENIX Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h2 style={{ fontSize: 28, fontWeight: 800, margin: '0 0 8px', background: 'linear-gradient(to right, #fff, #a1a1aa)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ZENIX AI</h2>
          <p style={{ color: '#a1a1aa', fontSize: 14, margin: 0 }}>Advanced SMC Trading Terminal</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {authMode === 'login' && (
            <>
              <input type="email" placeholder="Alamat Email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} style={{ background: '#1e1e22', border: '1px solid #27272a', borderRadius: 16, padding: '16px', color: '#f8fafc', outline: 'none', fontSize: 15, transition: 'border-color 0.2s' }} />
              <input type="password" placeholder="Password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} style={{ background: '#1e1e22', border: '1px solid #27272a', borderRadius: 16, padding: '16px', color: '#f8fafc', outline: 'none', fontSize: 15, transition: 'border-color 0.2s' }} />
              
              <div style={{ textAlign: 'right', marginTop: -8, marginBottom: 8 }}>
                <span onClick={() => setAuthMode('reset')} style={{ color: '#a1a1aa', fontSize: 13, cursor: 'pointer', transition: 'color 0.2s' }}>Lupa Password?</span>
              </div>

              <button onClick={() => handleAuth('login')} style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 16, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 8px 20px -6px rgba(124, 58, 237, 0.5)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                Masuk
              </button>
              
              <div style={{ textAlign: 'center', margin: '8px 0', fontSize: 13, color: '#a1a1aa', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, height: 1, background: '#27272a' }} />
                atau
                <div style={{ flex: 1, height: 1, background: '#27272a' }} />
              </div>
              
              <button onClick={async () => { try { const url = await signInWithGoogle(window.location.origin); window.location.href = url; } catch(e:any){ alert(e.message) } }} style={{ background: '#27272a', color: '#f8fafc', border: '1px solid #3f3f46', borderRadius: 16, padding: '16px', fontSize: 15, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, transition: 'background 0.2s' }}>
                <Globe size={18} />
                Lanjutkan dengan Google
              </button>
              
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#a1a1aa' }}>
                Belum punya akun? <span onClick={() => setAuthMode('register')} style={{ color: '#a855f7', cursor: 'pointer', fontWeight: 600 }}>Daftar sekarang</span>
              </div>
            </>
          )}
          {authMode === 'register' && (
            <>
              <input type="text" placeholder="Nama Lengkap" value={regName} onChange={e=>setRegName(e.target.value)} style={{ background: '#1e1e22', border: '1px solid #27272a', borderRadius: 16, padding: '16px', color: '#f8fafc', outline: 'none', fontSize: 15, transition: 'border-color 0.2s' }} />
              <input type="email" placeholder="Alamat Email" value={regEmail} onChange={e=>setRegEmail(e.target.value)} style={{ background: '#1e1e22', border: '1px solid #27272a', borderRadius: 16, padding: '16px', color: '#f8fafc', outline: 'none', fontSize: 15, transition: 'border-color 0.2s' }} />
              <input type="password" placeholder="Password" value={regPass} onChange={e=>setRegPass(e.target.value)} style={{ background: '#1e1e22', border: '1px solid #27272a', borderRadius: 16, padding: '16px', color: '#f8fafc', outline: 'none', fontSize: 15, transition: 'border-color 0.2s' }} />
              
              <button onClick={() => handleAuth('register')} style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 16, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 8px 20px -6px rgba(124, 58, 237, 0.5)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                Daftar Akun
              </button>
              
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#a1a1aa' }}>
                Sudah punya akun? <span onClick={() => setAuthMode('login')} style={{ color: '#a855f7', cursor: 'pointer', fontWeight: 600 }}>Masuk di sini</span>
              </div>
            </>
          )}
          {authMode === 'reset' && (
            <>
              <input type="email" placeholder="Masukkan Alamat Email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} style={{ background: '#1e1e22', border: '1px solid #27272a', borderRadius: 16, padding: '16px', color: '#f8fafc', outline: 'none', fontSize: 15, transition: 'border-color 0.2s' }} />
              
              <button onClick={() => handleAuth('reset')} style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 16, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8, boxShadow: '0 8px 20px -6px rgba(124, 58, 237, 0.5)', transition: 'transform 0.2s, box-shadow 0.2s' }}>
                Kirim Link Reset
              </button>
              
              <div style={{ textAlign: 'center', marginTop: 16, fontSize: 14, color: '#a1a1aa' }}>
                Kembali ke <span onClick={() => setAuthMode('login')} style={{ color: '#a855f7', cursor: 'pointer', fontWeight: 600 }}>Halaman Login</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
