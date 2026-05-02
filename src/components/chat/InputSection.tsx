'use client';
import React from 'react';
import { Send, Plus, Mic, MicOff, X } from 'lucide-react';

interface InputSectionProps {
  input: string;
  setInput: (val: string) => void;
  selectedImages: string[];
  setSelectedImages: (imgs: string[] | ((prev: string[]) => string[])) => void;
  isLoading: boolean;
  isListening: boolean;
  toggleListening: () => void;
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

  return (
    <div style={{ background: settings.theme === 'dark' ? 'rgba(30, 31, 32, 0.9)' : 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${themeVars.border}`, borderRadius: 32, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
      {selectedImages.length > 0 && (
        <div style={{ display: 'flex', gap: 8, paddingBottom: 12, overflowX: 'auto' }}>
          {selectedImages.map((img, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              <img src={img} alt="preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 12, border: `1px solid ${themeVars.border}` }} />
              <button onClick={() => setSelectedImages((prev: string[]) => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: 12 }}><X size={12} /></button>
            </div>
          ))}
        </div>
      )}
      <textarea 
        ref={textareaRef} 
        value={input} 
        onChange={(e) => { 
          setInput(e.target.value); 
          e.target.style.height = '44px'; 
          e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; 
        }} 
        rows={1} 
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(null); } }} 
        placeholder={settings.language === 'English' ? "Ask ZENIX AI..." : "Tanya ZENIX AI..."} 
        disabled={isLoading} 
        style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: themeVars.text, fontSize: 'var(--font-md)', resize: 'none', lineHeight: 1.5, padding: '4px 4px 12px', minHeight: 44 }} 
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: themeVars.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: '50%' }}><Plus size={24} /></button>
          <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple accept="image/*" style={{ display: 'none' }} />
          <button onClick={toggleListening} style={{ background: isListening ? 'rgba(239,68,68,0.15)' : 'none', border: 'none', color: isListening ? '#ef4444' : themeVars.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: '50%' }}>{isListening ? <MicOff size={22} className="typing-dot" /> : <Mic size={22} />}</button>
        </div>
        <button onClick={() => handleSubmit(null)} disabled={isLoading || (!input.trim() && selectedImages.length === 0)} style={{ width: 44, height: 44, borderRadius: '50%', background: (input.trim() || selectedImages.length > 0) ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : (settings.theme === 'dark' ? '#333538' : '#e3e3e3'), border: 'none', cursor: (input.trim() || selectedImages.length > 0) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}><Send size={18} color={(input.trim() || selectedImages.length > 0) ? '#fff' : themeVars.textMuted} /></button>
      </div>
    </div>
  );
};
