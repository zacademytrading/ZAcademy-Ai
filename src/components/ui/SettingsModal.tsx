'use client';
import React, { useState } from 'react';
import { Moon, Sun, Globe, Brain, ChevronDown, X, Settings } from 'lucide-react';

interface UserSettings {
  theme: 'dark' | 'light';
  language: string;
  personalIntelligence: string;
}

interface SettingsModalProps {
  settings: UserSettings;
  setSettings: (s: UserSettings) => void;
  onClose: () => void;
  onSave: () => void;
  themeVars: any;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  settings, 
  setSettings, 
  onClose, 
  onSave, 
  themeVars 
}) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: 500, background: themeVars.bg, border: `1px solid ${themeVars.border}`, borderRadius: 28, padding: 32, boxShadow: '0 25px 50px rgba(0,0,0,0.6)', animation: 'springUp 0.4s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
            <Settings size={24} color="#7c3aed" /> {settings.language === 'English' ? 'Agent Settings' : 'Setelan Agent'}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(239,68,68,0.1)', border: 'none', color: '#ef4444', cursor: 'pointer', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Theme Selection */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: themeVars.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{settings.language === 'English' ? 'Appearance Mode' : 'Mode Tampilan'}</label>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setSettings({...settings, theme: 'dark'})} style={{ flex: 1, padding: '16px', borderRadius: 16, border: `2px solid ${settings.theme === 'dark' ? '#7c3aed' : themeVars.border}`, background: settings.theme === 'dark' ? 'rgba(124,58,237,0.1)' : 'transparent', color: themeVars.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
                <Moon size={18} /> {settings.language === 'English' ? 'Dark' : 'Gelap'}
              </button>
              <button onClick={() => setSettings({...settings, theme: 'light'})} style={{ flex: 1, padding: '16px', borderRadius: 16, border: `2px solid ${settings.theme === 'light' ? '#7c3aed' : themeVars.border}`, background: settings.theme === 'light' ? 'rgba(124,58,237,0.05)' : 'transparent', color: themeVars.text, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s' }}>
                <Sun size={18} /> {settings.language === 'English' ? 'Light' : 'Terang'}
              </button>
            </div>
          </div>

          {/* Language Selection */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: themeVars.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{settings.language === 'English' ? 'Language' : 'Bahasa'}</label>
            <div style={{ position: 'relative' }}>
              <Globe size={18} style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', color: '#7c3aed' }} />
              <select value={settings.language} onChange={e => setSettings({...settings, language: e.target.value})} style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: 16, border: `1px solid ${themeVars.border}`, background: themeVars.inputBg, color: themeVars.text, fontSize: 14, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
                <option value="English">English (United States)</option>
                <option value="Bahasa Indonesia">Bahasa Indonesia</option>
              </select>
              <ChevronDown size={16} style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: themeVars.textMuted }} />
            </div>
          </div>

          {/* Personal Intelligence */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: themeVars.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{settings.language === 'English' ? 'Personal Intelligence' : 'Kecerdasan Personal'}</label>
            <div style={{ position: 'relative' }}>
              <Brain size={18} style={{ position: 'absolute', left: 16, top: 16, color: '#7c3aed' }} />
              <textarea 
                value={settings.personalIntelligence} 
                onChange={e => setSettings({...settings, personalIntelligence: e.target.value})}
                placeholder={settings.language === 'English' ? "Tell ZENIX your trading preferences..." : "Kasih tahu ZENIX preferensi tradingmu..."}
                rows={4}
                style={{ width: '100%', padding: '14px 16px 14px 48px', borderRadius: 16, border: `1px solid ${themeVars.border}`, background: themeVars.inputBg, color: themeVars.text, fontSize: 14, outline: 'none', resize: 'none', lineHeight: 1.6 }}
              />
            </div>
          </div>
        </div>

        <div style={{ marginTop: 40, display: 'flex', gap: 14 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '16px', borderRadius: 16, border: 'none', background: 'transparent', color: themeVars.textMuted, fontWeight: 600, cursor: 'pointer' }}>{settings.language === 'English' ? 'Cancel' : 'Batal'}</button>
          <button onClick={onSave} style={{ flex: 2, padding: '16px', borderRadius: 16, border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', fontWeight: 700, cursor: 'pointer', boxShadow: '0 12px 24px -6px rgba(124, 58, 237, 0.4)' }}>{settings.language === 'English' ? 'Save Changes' : 'Simpan Perubahan'}</button>
        </div>
      </div>
    </div>
  );
};
