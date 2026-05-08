'use client';
import React from 'react';
import { Send, Plus, Mic, MicOff, X, Globe } from 'lucide-react';

interface InputSectionProps {
  input: string;
  setInput: (val: string) => void;
  selectedImages: string[];
  setSelectedImages: (imgs: string[] | ((prev: string[]) => string[])) => void;
  isLoading: boolean;
  isListening: boolean;
  toggleListening: () => void;
  useWebSearch: boolean;
  toggleWebSearch: () => void;
  handleSubmit: (e: React.FormEvent | null, customInput?: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  settings: { theme: string; language: string };
  themeVars: any;
}

export const InputSection: React.FC<InputSectionProps> = ({
  input,
  setInput,
  selectedImages,
  setSelectedImages,
  isLoading,
  isListening,
  toggleListening,
  useWebSearch,
  toggleWebSearch,
  handleSubmit,
  fileInputRef,
  textareaRef,
  settings,
  themeVars,
}) => {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => setSelectedImages((prev) => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  const isDark = settings.theme === 'dark';

  return (
    <div style={{
      background: isDark ? 'rgba(30, 31, 32, 0.95)' : 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: `1px solid ${themeVars.border}`,
      borderRadius: 'clamp(20px, 3vw, 32px)',
      padding: 'clamp(10px, 2vw, 14px) clamp(14px, 2.5vw, 20px) calc(clamp(10px, 2vw, 14px) + env(safe-area-inset-bottom))',
      boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
      display: 'flex',
      flexDirection: 'column',
      transition: 'all 0.3s ease',
    }}>
      {/* Image Previews */}
      {selectedImages.length > 0 && (
        <div style={{ display: 'flex', gap: 8, paddingBottom: 12, overflowX: 'auto' }}>
          {selectedImages.map((img, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              <img src={img} alt="preview" style={{ width: 'clamp(48px, 8vw, 60px)', height: 'clamp(48px, 8vw, 60px)', objectFit: 'cover', borderRadius: 12, border: `1px solid ${themeVars.border}` }} />
              <button
                onClick={() => setSelectedImages((prev: string[]) => prev.filter((_, idx) => idx !== i))}
                style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: 12 }}
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          e.target.style.height = 'clamp(40px, 5vh, 44px)';
          e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`;
        }}
        rows={1}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(null); }
        }}
        placeholder={settings.language === 'English' ? 'Ask ZENIX AI...' : 'Tanya ZENIX AI...'}
        disabled={isLoading}
        style={{
          width: '100%',
          background: 'transparent',
          border: 'none',
          outline: 'none',
          color: themeVars.text,
          fontSize: 'var(--font-md)',
          resize: 'none',
          lineHeight: 1.5,
          padding: '4px 4px 10px',
          minHeight: 'clamp(40px, 5vh, 44px)',
        }}
      />

      {/* Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
        {/* Left buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Attach Image */}
          <button
            onClick={() => fileInputRef.current?.click()}
            title="Attach Image"
            style={{
              background: 'none',
              border: 'none',
              color: themeVars.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(6px, 1.5vw, 8px)',
              borderRadius: '50%',
              minWidth: 'clamp(36px, 5vw, 40px)',
              minHeight: 'clamp(36px, 5vw, 40px)',
            }}
          >
            <Plus size={20} />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple accept="image/*" style={{ display: 'none' }} />

          {/* Voice Input */}
          <button
            onClick={toggleListening}
            title={isListening ? 'Stop Recording' : 'Voice Input'}
            style={{
              background: isListening ? 'rgba(239,68,68,0.15)' : 'none',
              border: 'none',
              color: isListening ? '#ef4444' : themeVars.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 'clamp(6px, 1.5vw, 8px)',
              borderRadius: '50%',
              minWidth: 'clamp(36px, 5vw, 40px)',
              minHeight: 'clamp(36px, 5vw, 40px)',
              transition: 'all 0.2s',
            }}
          >
            {isListening ? <MicOff size={20} className="typing-dot" /> : <Mic size={20} />}
          </button>

          {/* ── SEARCH TOGGLE BUTTON ─────────────────────────── */}
          <button
            onClick={toggleWebSearch}
            title={useWebSearch ? 'Search ON — klik untuk matikan' : 'Search OFF — klik untuk aktifkan web search'}
            style={{
              background: useWebSearch
                ? 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(99,102,241,0.2))'
                : 'none',
              border: useWebSearch
                ? '1.5px solid rgba(99,102,241,0.6)'
                : `1.5px solid ${themeVars.border}`,
              color: useWebSearch ? '#818cf8' : themeVars.textMuted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: 'clamp(5px, 1.2vw, 7px) clamp(8px, 1.8vw, 12px)',
              borderRadius: 20,
              fontSize: 'var(--font-base-sm)',
              fontWeight: useWebSearch ? 600 : 400,
              minHeight: 'clamp(32px, 4.5vw, 36px)',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Glow effect saat aktif */}
            {useWebSearch && (
              <span style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />
            )}
            <Globe size={14} style={{ flexShrink: 0 }} />
            <span className="mobile-hide" style={{ whiteSpace: 'nowrap' }}>
              {useWebSearch ? 'Search ON' : 'Search'}
            </span>
            {/* Dot indicator */}
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: useWebSearch ? '#4ade80' : themeVars.textMuted,
              flexShrink: 0,
              boxShadow: useWebSearch ? '0 0 6px #4ade80' : 'none',
              transition: 'all 0.3s',
            }} />
          </button>
        </div>

        {/* Send Button */}
        <button
          onClick={() => handleSubmit(null)}
          disabled={isLoading || (!input.trim() && selectedImages.length === 0)}
          style={{
            width: 'clamp(38px, 5.5vw, 44px)',
            height: 'clamp(38px, 5.5vw, 44px)',
            borderRadius: '50%',
            background: (input.trim() || selectedImages.length > 0)
              ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
              : (isDark ? '#333538' : '#e3e3e3'),
            border: 'none',
            cursor: (input.trim() || selectedImages.length > 0) ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s',
            flexShrink: 0,
            boxShadow: (input.trim() || selectedImages.length > 0)
              ? '0 4px 15px rgba(124, 58, 237, 0.4)'
              : 'none',
          }}
        >
          <Send size={18} color={(input.trim() || selectedImages.length > 0) ? '#fff' : themeVars.textMuted} />
        </button>
      </div>
    </div>
  );
};
