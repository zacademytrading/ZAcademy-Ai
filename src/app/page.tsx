'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Plus, Settings, Camera, ChevronDown, Zap, BarChart2, Activity, Menu, X, LogIn, Moon, Sun, Globe, Brain, Mic, MicOff, Share2, Layers, MessageSquare, History, Trash2, MoreVertical, Search, Copy } from 'lucide-react';
import { ZACADEMY_MODELS, type ModelKey } from '@/lib/models';

import { SettingsModal } from '@/components/ui/SettingsModal';
import { InputSection } from '@/components/chat/InputSection';
import { Sidebar } from '@/components/chat/Sidebar';
import { MessageList } from '@/components/chat/MessageList';
import { supabase, supabaseDb, signInWithEmail, signUpWithEmail, signInWithGoogle, resetPasswordForEmail } from '@/lib/supabase-client';

interface Message { id: string; role: 'user' | 'assistant'; content: string; image?: string; images?: string[]; isTyping?: boolean; }
interface ChatSession { id: string; title: string; messages: Message[] }
interface UserSettings { theme: 'dark'|'light'; language: string; personalIntelligence: string; }
interface User { id: string; email: string; name: string; settings: UserSettings }

function cleanAIResponse(text: string): string {
  return text.trim();
}

const GlobalStyle = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { font-family: 'Inter', sans-serif; box-sizing: border-box; }
    ::-webkit-scrollbar { width: 4px; } 
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: rgba(124, 58, 237, 0.2); border-radius: 10px; }
    
    .smooth-transition { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
    .msg-bubble { animation: springUp 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
    @keyframes springUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .typing-dot { animation: blink 1.2s infinite; }
    @keyframes blink { 0%,80%,100%{opacity:0.2} 40%{opacity:1} }

    /* --- Sidebar Items --- */
    .sidebar-item { position: relative; cursor: pointer; border-radius: 50px; transition: all 0.2s; display: flex; alignItems: center; gap: 10px; padding: 10px 16px; margin-bottom: 4px; color: #8e918f; font-size: var(--font-base); }
    .sidebar-item:hover { background: rgba(124, 58, 237, 0.08); color: inherit; }
    .sidebar-item.active { background: rgba(124, 58, 237, 0.15); color: #a855f7; font-weight: 500; }
    .sidebar-item .delete-icon { opacity: 0; transition: opacity 0.2s; }
    .sidebar-item:hover .delete-icon { opacity: 1; }

    /* --- Fluid Table Styling --- */
    table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: var(--font-base); border-radius: 16px; overflow: hidden; border: 1px solid rgba(124, 58, 237, 0.2); }
    th { background: rgba(124, 58, 237, 0.1); color: #7c3aed; font-weight: 700; text-align: left; padding: clamp(10px, 1.5vw, 14px) clamp(12px, 2vw, 18px); border-bottom: 2px solid #7c3aed; font-size: var(--font-base); }
    td { padding: clamp(10px, 1.2vw, 12px) clamp(12px, 2vw, 18px); border-bottom: 1px solid rgba(124, 58, 237, 0.1); color: inherit; line-height: 1.6; font-size: var(--font-base); }
    tr:nth-child(even) { background: rgba(124, 58, 237, 0.02); }

    /* --- AI Content Typography (Fluid) --- */
    .ai-content { font-size: var(--font-md); line-height: 1.8; }
    .ai-content p { margin: 0 0 14px; line-height: 1.85; font-size: var(--font-md); }
    .ai-content h2 { color: #7c3aed; margin: 24px 0 12px; font-size: var(--font-h2); font-weight: 700; border-bottom: 1px solid rgba(124,58,237,0.2); padding-bottom: 8px; }
    .ai-content h3 { color: #7c3aed; margin: 20px 0 10px; font-size: var(--font-h3); font-weight: 700; }
    .ai-content strong { color: #a78bfa; font-weight: 700; }
    .ai-content em { font-style: italic; color: inherit; }
    .ai-content hr { border: none; border-top: 1px solid rgba(124,58,237,0.2); margin: 20px 0; }
    .ai-content ul.ai-ul, .ai-content ol.ai-ol { padding: 0; margin: 12px 0 16px; list-style: none; }
    .ai-content ul.ai-ul li, .ai-content ol.ai-ol li { display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; line-height: 1.7; font-size: var(--font-md); }
    .ai-content .ai-dot { flex-shrink: 0; width: 7px; height: 7px; border-radius: 50%; background: #7c3aed; margin-top: 7px; display: block; }
    .ai-content .ai-num { flex-shrink: 0; width: 26px; height: 26px; border-radius: 8px; background: rgba(124,58,237,0.15); color: #7c3aed; font-weight: 700; font-size: 13px; display: flex; align-items: center; justify-content: center; }
    .ai-content pre.ai-pre { background: rgba(255,255,255,0.03); padding: 16px; border-radius: 12px; overflow-x: auto; margin: 16px 0; border: 1px solid rgba(124,58,237,0.2); position: relative; }
    .ai-content pre.ai-pre code { font-family: monospace; font-size: 13px; color: #a78bfa; white-space: pre; }
    .ai-content .code-lang { position: absolute; top: 8px; right: 12px; font-size: 11px; color: #8e918f; text-transform: uppercase; font-weight: 600; }
    .ai-content code.ai-inline-code { background: rgba(124,58,237,0.15); color: #a78bfa; padding: 2px 7px; border-radius: 6px; font-family: monospace; font-size: 0.88em; }
    .ai-content .ai-table-wrap { overflow-x: auto; margin: 20px 0; }

    /* --- Mobile-specific overrides --- */
    @media (max-width: 480px) {
      .sidebar-item { padding: 8px 12px; font-size: var(--font-base-sm); }
      table { font-size: var(--font-base-sm); }
      th, td { padding: 8px 10px; font-size: var(--font-base-sm); }
      .ai-content p, .ai-content li { font-size: var(--font-base); line-height: 1.7; }
      .ai-content h3 { font-size: var(--font-h2); }
    }

    /* --- Tablet overrides --- */
    @media (min-width: 768px) and (max-width: 1023px) {
      .sidebar-item { font-size: var(--font-base); }
    }
  `}</style>
);

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [authMode, setAuthMode] = useState<'login'|'register'|'reset'|null>(null);
  const [isAppLoading, setIsAppLoading] = useState(true);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [selectedModel, setSelectedModel] = useState<ModelKey>('zenix-fast');
  const [input, setInput] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  const [isLoading, setIsLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); 
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const checkMobile = () => setIsMobile(window.innerWidth < 1024);
      checkMobile();
      window.addEventListener('resize', checkMobile);
      if (window.innerWidth >= 1024) setSidebarOpen(true);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);

  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({ theme: 'dark', language: 'English', personalIntelligence: '' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollFAB, setShowScrollFAB] = useState(false);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    if (target.scrollHeight - target.scrollTop - target.clientHeight > 150) setShowScrollFAB(true);
    else setShowScrollFAB(false);
  };

  const groupedChats = useMemo(() => {
    const groups: Record<string, ChatSession[]> = { 'Hari Ini': [], 'Kemarin': [], '7 Hari Terakhir': [], 'Lama': [] };
    const now = new Date();
    chats.forEach(chat => {
      const chatDate = new Date(parseInt(chat.id));
      const diffDays = Math.floor((now.getTime() - chatDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays === 0) groups['Hari Ini'].push(chat);
      else if (diffDays === 1) groups['Kemarin'].push(chat);
      else if (diffDays <= 7) groups['7 Hari Terakhir'].push(chat);
      else groups['Lama'].push(chat);
    });
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [chats]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.lang = settings.language === 'English' ? 'en-US' : 'id-ID';
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
          }
          if (finalTranscript) setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
        recognitionRef.current = recognition;
      }
    }
  }, [settings.language]);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert('Browser tidak mendukung Voice Input');
    if (isListening) { recognitionRef.current.stop(); setIsListening(false); }
    else { recognitionRef.current.start(); setIsListening(true); }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => setSelectedImages(prev => [...prev, reader.result as string]);
        reader.readAsDataURL(file);
      });
    }
  };

  useEffect(() => {
    const checkUserSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        const supaUser = session.user;
        const u: User = { 
          id: supaUser.id, 
          email: supaUser.email || '', 
          name: supaUser.user_metadata?.full_name || supaUser.email?.split('@')[0] || 'User', 
          settings: { theme: 'dark', language: 'English', personalIntelligence: '' } 
        };
        try {
          const stored = localStorage.getItem('zenix_user');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.settings) u.settings = { ...u.settings, ...parsed.settings };
          }
        } catch(e) {}
        localStorage.setItem('zenix_user', JSON.stringify(u)); 
        setUser(u); setSettings(u.settings); setAuthMode(null); fetchChats(u.id);
      } else {
        setAuthMode('login');
      }
      setIsAppLoading(false);
    };
    checkUserSession();
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) checkUserSession();
      else if (event === 'SIGNED_OUT') { setUser(null); setAuthMode('login'); setMessages([]); setChats([]); setActiveSession(null); localStorage.removeItem('zenix_user'); }
    });
    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.style.colorScheme = settings.theme;
    const bgColor = settings.theme === 'dark' ? '#131314' : '#ffffff';
    document.body.style.backgroundColor = bgColor;
  }, [settings.theme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (!isLoading && (input.trim() || selectedImages.length > 0)) handleSubmit(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [input, selectedImages, isLoading]);

  const fetchChats = async (userId: string) => { 
    try { 
      const localKey = `zenix_chats_${userId}`;
      const localData = localStorage.getItem(localKey);
      if (localData) setChats(JSON.parse(localData));
      const data = await supabaseDb.getChats(userId); 
      if (data && data.length > 0) { setChats(data); localStorage.setItem(localKey, JSON.stringify(data)); }
    } catch (e) {} 
  };

  const saveChat = async (chatToSave: ChatSession) => { 
    if (!user) return; 
    try { 
      const localKey = `zenix_chats_${user.id}`;
      setChats(prev => {
        const newChats = [...prev];
        const existingIdx = newChats.findIndex(c => c.id === chatToSave.id);
        if (existingIdx >= 0) newChats[existingIdx] = chatToSave;
        else newChats.unshift(chatToSave);
        localStorage.setItem(localKey, JSON.stringify(newChats));
        return newChats;
      });
      await supabaseDb.upsertChat({ id: chatToSave.id, user_id: user.id, title: chatToSave.title, messages: chatToSave.messages }); 
    } catch (e) {} 
  };

  const handleAuth = async (action: 'login' | 'register' | 'reset') => {
    if (action === 'login') {
      try { await signInWithEmail(loginEmail, loginPass); } catch (e: any) { alert(e?.message || 'Login failed.'); }
    } else if (action === 'register') {
      try {
        const result = await signUpWithEmail(regEmail, regPass, regName);
        if (result?.user) { alert('Success! Please check your email for confirmation.'); setLoginEmail(regEmail.trim()); setAuthMode('login'); }
      } catch (e: any) { alert(e?.message || 'Failed to create account.'); }
    } else if (action === 'reset') {
      try { await resetPasswordForEmail(loginEmail); alert('Reset link sent to your email.'); setAuthMode('login'); } catch (e: any) { alert(e?.message || 'Failed to send reset link.'); }
    }
  };

  const handleLogout = async () => { try { await supabase.auth.signOut(); } catch(e) { console.error(e); } };
  const saveSettings = async () => { if (!user) return; try { const res = await fetch('/api/user/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, settings }) }); if (res.ok) { const data = await res.json(); setUser(data.user); localStorage.setItem('zenix_user', JSON.stringify(data.user)); setSettingsOpen(false); } } catch (e) {} };
  const loadSession = (id: string) => { const c = chats.find(x => x.id === id); if (c) { setActiveSession(c.id); setMessages(c.messages.map(m => ({ ...m, isTyping: false }))); if (window.innerWidth < 1024) setSidebarOpen(false); } };
  const deleteChat = async (e: React.MouseEvent, id: string) => { 
    e.stopPropagation(); if (!user) return; 
    try { 
      const localKey = `zenix_chats_${user.id}`;
      setChats(prev => {
        const newChats = prev.filter(c => c.id !== id);
        localStorage.setItem(localKey, JSON.stringify(newChats));
        return newChats;
      });
      if (activeSession === id) { setActiveSession(null); setMessages([]); }
      await supabaseDb.deleteChat(id); 
    } catch (err) {} 
  };

  const handleSubmit = async (e: React.FormEvent | null, customInput?: string) => {
    e?.preventDefault();
    const text = (customInput || input).trim();
    if ((!text && !selectedImages.length) || isLoading || !user) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, images: selectedImages.length > 0 ? [...selectedImages] : undefined };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages); setInput(''); setSelectedImages([]); setIsLoading(true);

    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.images ? [{ type: 'text', text: m.content }, ...m.images.map((img: string) => ({ type: 'image_url', image_url: { url: img } }))] : m.content })), model: selectedModel, settings, userId: user.id }) });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || `Server error (${res.status})`); }
      const data = await res.json();
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.content || '', isTyping: true };
      const updatedMessages = [...newMessages, aiMsg]; setMessages(updatedMessages);
      const sessionId = activeSession || Date.now().toString(); saveChat({ id: sessionId, title: text.substring(0,30), messages: updatedMessages }); setActiveSession(sessionId);
    } catch (err: any) { setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: `⚠️ System Alert: ${err.message || 'Connection lost'}. Please check your internet and try again.` }]); } finally { setIsLoading(false); }
  };

  const themeVars = settings.theme === 'dark' ? { bg: '#131314', sidebar: '#1e1f20', border: '#333538', text: '#e3e3e3', textMuted: '#8e918f', inputBg: '#1e1f20', userBubble: '#282a2c', aiBubble: 'transparent', hover: '#333538' } : { bg: '#ffffff', sidebar: '#f0f4f9', border: '#e3e3e3', text: '#1f1f1f', textMuted: '#444746', inputBg: '#f0f4f9', userBubble: '#f0f4f9', aiBubble: 'transparent', hover: '#e3e3e3' };

  const renderInputArea = (isCentered: boolean) => (

    <div className={`input-wrapper ${isCentered ? 'centered' : 'bottom'}`} style={{ width: '100%', maxWidth: 800, margin: '0 auto', flexShrink: 0, zIndex: 10, position: 'relative' }}>
      {!isCentered && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: `linear-gradient(to top, ${themeVars.bg}, transparent)`, pointerEvents: 'none', zIndex: -1 }} />}
      <InputSection 
        input={input}
        setInput={setInput}
        selectedImages={selectedImages}
        setSelectedImages={setSelectedImages}
        isLoading={isLoading}
        isListening={isListening}
        toggleListening={toggleListening}
        handleSubmit={handleSubmit}
        fileInputRef={fileInputRef}
        textareaRef={textareaRef}
        settings={settings}
        themeVars={themeVars}
      />
    </div>
  );

  if (isAppLoading) return <div style={{ height: '100vh', background: '#131314', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div className="typing-dot" style={{ width: 12, height: 12, borderRadius: '50%', background: '#7c3aed' }} /></div>;
  
  if (authMode) {
    return (
      <>
        <GlobalStyle />
        <div style={{ display: 'flex', height: '100vh', background: '#09090b', color: '#f8fafc', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '10%', left: '10%', width: 400, height: 400, background: 'rgba(124, 58, 237, 0.1)', filter: 'blur(100px)', borderRadius: '50%' }} />
          <div style={{ width: '100%', maxWidth: 440, background: 'rgba(24, 24, 27, 0.6)', backdropFilter: 'blur(20px)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 28, padding: 40, zIndex: 10 }}>
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 20px', border: '2px solid #7c3aed' }}><img src="/logo-dark.jpg" alt="ZENIX Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
              <h2 style={{ fontSize: 'var(--font-h1)', fontWeight: 800, margin: '0 0 8px', color: '#fff' }}>ZENIX AI</h2>
              <p style={{ color: '#a1a1aa', fontSize: 'var(--font-base)' }}>Advanced SMC Trading Terminal</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <input type="email" placeholder="Email" value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} style={{ background: '#1e1e22', border: '1px solid #27272a', borderRadius: 16, padding: '16px', color: '#fff', outline: 'none' }} />
              <input type="password" placeholder="Password" value={loginPass} onChange={e=>setLoginPass(e.target.value)} style={{ background: '#1e1e22', border: '1px solid #27272a', borderRadius: 16, padding: '16px', color: '#fff', outline: 'none' }} />
              <button onClick={() => handleAuth('login')} style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', border: 'none', borderRadius: 16, padding: '16px', fontSize: 16, fontWeight: 700, cursor: 'pointer' }}>Login</button>
              <button onClick={async () => { try { const url = await signInWithGoogle(window.location.origin); window.location.href = url; } catch(e:any){ alert(e.message) } }} style={{ background: '#27272a', color: '#f8fafc', border: '1px solid #3f3f46', borderRadius: 16, padding: '16px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12 }}><Globe size={18} /> Continue with Google</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <GlobalStyle />
      <div style={{ display: 'flex', height: '100vh', background: themeVars.bg, color: themeVars.text, overflow: 'hidden' }}>
        <Sidebar 
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          isMobile={isMobile}
          activeSession={activeSession}
          setActiveSession={setActiveSession}
          setMessages={setMessages}
          groupedChats={groupedChats}
          loadSession={loadSession}
          deleteChat={deleteChat}
          user={user}
          profileOpen={profileOpen}
          setProfileOpen={setProfileOpen}
          setSettingsOpen={setSettingsOpen}
          handleLogout={handleLogout}
          settings={settings}
          themeVars={themeVars}
        />

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ display: 'flex', padding: '12px 24px', alignItems: 'center', justifyContent: 'space-between', background: themeVars.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: 'none', border: 'none', color: themeVars.textMuted, cursor: 'pointer' }}><Menu size={22} /></button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontWeight: 600, fontSize: 'var(--font-brand)' }}>ZENIX</span>
                <button onClick={() => setModelDropdownOpen(!modelDropdownOpen)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', border: 'none', borderRadius: 8, padding: '6px 12px', color: themeVars.textMuted, fontSize: 'var(--font-base-sm)' }}>{selectedModel === 'zenix-fast' ? <Zap size={14} color="#f59e0b" /> : <Brain size={14} color="#7c3aed" />} {ZACADEMY_MODELS[selectedModel]?.name} <ChevronDown size={14} /></button>
                {modelDropdownOpen && (
                  <div style={{ position: 'absolute', top: 60, background: themeVars.inputBg, border: `1px solid ${themeVars.border}`, borderRadius: 16, padding: '8px', zIndex: 200 }}>
                    {(Object.keys(ZACADEMY_MODELS) as ModelKey[]).map(key => (
                      <div key={key} onClick={() => { setSelectedModel(key); setModelDropdownOpen(false); }} className="sidebar-item" style={{ background: selectedModel === key ? 'rgba(124, 58, 237, 0.1)' : 'transparent' }}>{key === 'zenix-fast' ? <Zap size={16} /> : <Brain size={16} />}<span>{ZACADEMY_MODELS[key].name}</span></div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div ref={scrollContainerRef} onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto' }}>
            {messages.length === 0 ? (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', maxWidth: 840, margin: '0 auto', padding: 20 }}>
                <h1 style={{ fontSize: 'var(--font-hero)', fontWeight: 600, textAlign: 'center', marginBottom: 40, background: 'linear-gradient(90deg, #c084fc, #ec4899, #f43f5e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{settings.language === 'English' ? 'Hello' : 'Halo'}, {user?.name?.split(' ')[0]}<br/><span style={{ color: themeVars.textMuted, fontSize: 'var(--font-hero-sub)' }}>{settings.language === 'English' ? 'How can ZENIX help you today?' : 'Ada yang bisa ZENIX bantu hari ini?'}</span></h1>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 40 }}>
                  {[
                    { icon: <Activity size={16} color="#c084fc" />, text: settings.language === 'English' ? "XAUUSD SMC analysis" : "Analisa SMC XAUUSD" },
                    { icon: <BarChart2 size={16} color="#ec4899" />, text: settings.language === 'English' ? "Crypto Fear & Greed sentiment" : "Gimana sentimen Fear & Greed Crypto?" },
                    { icon: <Layers size={16} color="#f43f5e" />, text: settings.language === 'English' ? "Trading plan for $500 capital" : "Buat trading plan modal $500" },
                    { icon: <Globe size={16} color="#3b82f6" />, text: settings.language === 'English' ? "Latest macro trading news" : "Cek berita makro ekonomi terkini" }
                  ].map((chip, idx) => (
                    <button key={idx} onClick={() => handleSubmit(null, chip.text)} className="smooth-transition" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 18px', background: themeVars.inputBg, border: `1px solid ${themeVars.border}`, borderRadius: 20, color: themeVars.text, cursor: 'pointer', fontSize: 14 }} onMouseOver={e => e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)'} onMouseOut={e => e.currentTarget.style.background = themeVars.inputBg}>
                      {chip.icon} {chip.text}
                    </button>
                  ))}
                </div>
                {renderInputArea(true)}
              </div>
            ) : (
              <MessageList 
                messages={messages} 
                themeVars={themeVars} 
                messagesEndRef={messagesEndRef} 
              />
            )}
          </div>
          {messages.length > 0 && renderInputArea(false)}
        </div>
      </div>

      {settingsOpen && (
        <SettingsModal settings={settings} setSettings={setSettings} onClose={() => setSettingsOpen(false)} onSave={saveSettings} themeVars={themeVars} />
      )}
    </>
  );
}
