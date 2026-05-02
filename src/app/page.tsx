'use client';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Plus, Settings, Camera, ChevronDown, Zap, BarChart2, Activity, Menu, X, LogIn, Moon, Sun, Globe, Brain, Mic, MicOff, Share2, Layers, MessageSquare, History, Trash2, MoreVertical, Search, Copy } from 'lucide-react';
import { ZACADEMY_MODELS, type ModelKey } from '@/lib/models';
import { TradingChart } from '@/components/TradingChart';
import { SettingsModal } from '@/components/ui/SettingsModal';
import { supabase, supabaseDb, signInWithEmail, signUpWithEmail, signInWithGoogle, resetPasswordForEmail } from '@/lib/supabase-client';

interface Message { id: string; role: 'user' | 'assistant'; content: string; image?: string; images?: string[]; isTyping?: boolean; }
interface ChatSession { id: string; title: string; messages: Message[] }
interface UserSettings { theme: 'dark'|'light'; language: string; personalIntelligence: string; }
interface User { id: string; email: string; name: string; settings: UserSettings }

function cleanAIResponse(text: string): string {
  return text.trim();
}

const Typewriter = ({ text, renderer }: { text: string, renderer?: (t: string) => React.ReactNode }) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    let i = 0; setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1)); i++;
      if (i >= text.length) clearInterval(interval);
    }, 10);
    return () => clearInterval(interval);
  }, [text]);
  if (renderer) return <>{renderer(displayedText)}</>;
  return <div style={{ whiteSpace: 'pre-line' }}>{displayedText}</div>;
};

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
    .ai-content p { margin-bottom: 20px; line-height: 1.8; white-space: pre-line; font-size: var(--font-md); }
    .ai-content h3 { color: #7c3aed; margin: 32px 0 16px; font-size: var(--font-h3); font-weight: 700; }
    .ai-content li { margin-bottom: 10px; line-height: 1.7; font-size: var(--font-md); }
    .ai-content strong { color: #7c3aed; font-weight: 600; }
    .ai-content pre { font-size: var(--font-code) !important; }

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
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [activeSymbol, setActiveSymbol] = useState<string | null>(null);
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
    const symbolMatch = text.match(/\b(XAUUSD|XAGUSD|GOLD|EMAS|BTCUSD|ETHUSD|EURUSD|GBPUSD|USDJPY|IHSG|LQ45|[A-Z]{3,6})\b/);
    if (symbolMatch) { const sym = symbolMatch[0].toUpperCase(); if (!['HALO', 'SAYA', 'HELLO'].includes(sym)) { setActiveSymbol(sym); setHistoryData([]); fetch(`/api/market/history?symbol=${sym}`).then(r => r.json()).then(data => { if (Array.isArray(data) && data.length > 0) setHistoryData(data); else setActiveSymbol(null); }).catch(() => setActiveSymbol(null)); } else { setActiveSymbol(null); } } else { setActiveSymbol(null); }
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.images ? [{ type: 'text', text: m.content }, ...m.images.map((img: string) => ({ type: 'image_url', image_url: { url: img } }))] : m.content })), model: selectedModel, settings }) });
      if (!res.ok) { const errData = await res.json().catch(() => ({})); throw new Error(errData.error || `Server error (${res.status})`); }
      const data = await res.json();
      const aiMsg: Message = { id: (Date.now() + 1).toString(), role: 'assistant', content: data.content || '', isTyping: true };
      const updatedMessages = [...newMessages, aiMsg]; setMessages(updatedMessages);
      const sessionId = activeSession || Date.now().toString(); saveChat({ id: sessionId, title: text.substring(0,30), messages: updatedMessages }); setActiveSession(sessionId);
    } catch (err: any) { setMessages(p => [...p, { id: Date.now().toString(), role: 'assistant', content: `⚠️ System Alert: ${err.message || 'Connection lost'}. Please check your internet and try again.` }]); } finally { setIsLoading(false); }
  };

  const themeVars = settings.theme === 'dark' ? { bg: '#131314', sidebar: '#1e1f20', border: '#333538', text: '#e3e3e3', textMuted: '#8e918f', inputBg: '#1e1f20', userBubble: '#282a2c', aiBubble: 'transparent', hover: '#333538' } : { bg: '#ffffff', sidebar: '#f0f4f9', border: '#e3e3e3', text: '#1f1f1f', textMuted: '#444746', inputBg: '#f0f4f9', userBubble: '#f0f4f9', aiBubble: 'transparent', hover: '#e3e3e3' };

  // Parse inline markdown: **bold**, *italic*, `code`
  const parseInline = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`([^`]+)`)/g;
    let lastIndex = 0; let match;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
      if (match[2]) parts.push(<strong key={match.index}>{match[2]}</strong>);
      else if (match[3]) parts.push(<em key={match.index}>{match[3]}</em>);
      else if (match[4]) parts.push(<code key={match.index} style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', padding: '2px 6px', borderRadius: 6, fontSize: '0.9em', fontFamily: 'monospace' }}>{match[4]}</code>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts;
  };

  const renderMarkdown = (text: string) => {
    if (!text) return null;
    const blocks = text.split(/(```[\s\S]*?```)/g);
    return <div className="ai-content">{blocks.map((block, bi) => {
      if (block.startsWith('```')) {
        const langMatch = block.match(/^```(\w+)?/);
        const lang = langMatch?.[1] || '';
        const code = block.replace(/^```\w*\n?/, '').replace(/```$/, '').trim();
        return (
          <pre key={bi} style={{ background: themeVars.inputBg, padding: 14, borderRadius: 12, overflowX: 'auto', margin: '18px 0', border: `1px solid ${themeVars.border}`, fontSize: 13, fontFamily: 'monospace', color: '#7c3aed', position: 'relative' }}>
            {lang && <span style={{ position: 'absolute', top: 8, right: 12, fontSize: 11, color: themeVars.textMuted, textTransform: 'uppercase', fontWeight: 600 }}>{lang}</span>}
            <code>{code}</code>
          </pre>
        );
      }
      const paragraphs = block.split(/\n\s*\n/);
      return paragraphs.map((para, pi) => {
        if (para.includes('⚡ SIGNAL:')) {
          const lines = para.split('\n').map(l => l.trim()).filter(l => l);
          let title = lines.find(l => l.includes('⚡ SIGNAL:'))?.replace('⚡ SIGNAL:', '').trim() || 'Trading Signal';
          const isBullish = para.toLowerCase().includes('bullish') || para.toLowerCase().includes('buy');
          const colorMain = isBullish ? '#10b981' : '#ef4444';
          const colorBg = isBullish ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';
          return (
            <div key={pi} style={{ margin: '24px 0', borderRadius: 20, overflow: 'hidden', border: `1px solid ${colorMain}`, background: themeVars.inputBg, boxShadow: isBullish ? '0 0 15px rgba(16, 185, 129, 0.3)' : '0 0 15px rgba(239, 68, 68, 0.3)' }}>
              <div style={{ padding: '16px 20px', background: `linear-gradient(135deg, ${colorBg}, transparent)`, borderBottom: `1px solid ${settings.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: themeVars.text, fontSize: 16 }}><span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 8, background: colorMain, color: '#fff' }}><Activity size={16} /></span>{title}</div>
                <div style={{ fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 12, background: colorMain, color: '#fff', textTransform: 'uppercase' }}>{isBullish ? 'BULLISH' : 'BEARISH'}</div>
              </div>
              <div style={{ padding: '20px' }}>
                <div className="signal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
                  {lines.map((line, li) => {
                    if (line.includes('⚡ SIGNAL:') || line.toLowerCase().includes('bias:') || line.toLowerCase().includes('smc logic:')) return null;
                    const parts = line.split(':'); if (parts.length < 2) return null;
                    const label = parts[0].replace(/[-*]/g, '').trim(); const val = parts.slice(1).join(':').trim();
                    let valColor = themeVars.text; if (label.toLowerCase().includes('target') || label.toLowerCase().includes('tp')) valColor = '#10b981'; if (label.toLowerCase().includes('invalidation') || label.toLowerCase().includes('sl')) valColor = '#ef4444';
                    return (
                      <div key={li} style={{ background: settings.theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', padding: '12px 16px', borderRadius: 12, border: `1px solid ${settings.theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}` }}>
                        <div style={{ fontSize: 11, color: themeVars.textMuted, textTransform: 'uppercase', fontWeight: 600, marginBottom: 4 }}>{label}</div>
                        <div style={{ fontSize: 16, fontFamily: 'monospace', fontWeight: 700, color: valColor }}>{val}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        }

        const lines = para.split('\n');
        const result: React.ReactNode[] = [];
        let ulBuffer: React.ReactNode[] = [];
        let olBuffer: { num: number; node: React.ReactNode }[] = [];

        const flushUl = (key: string) => {
          if (ulBuffer.length > 0) { result.push(<ul key={`ul-${key}`} style={{ paddingLeft: 24, margin: '12px 0', listStyle: 'none' }}>{ulBuffer}</ul>); ulBuffer = []; }
        };
        const flushOl = (key: string) => {
          if (olBuffer.length > 0) { result.push(<ol key={`ol-${key}`} style={{ paddingLeft: 24, margin: '12px 0', listStyle: 'none' }}>{olBuffer.map(o => o.node)}</ol>); olBuffer = []; }
        };

        lines.forEach((rawLine, i) => {
          const line = rawLine.trim();
          if (!line) { flushUl(`e${i}`); flushOl(`e${i}`); return; }

          const isTableLine = line.includes('|') && line.split('|').length >= 3;
          const numMatch = line.match(/^(\d+)\.\s+(.+)/);

          if (line.startsWith('# ')) {
            flushUl(`h${i}`); flushOl(`h${i}`);
            result.push(<h2 key={i} style={{ fontSize: 'var(--font-h2)', fontWeight: 700, color: '#7c3aed', margin: '28px 0 12px', borderBottom: `1px solid rgba(124,58,237,0.2)`, paddingBottom: 8 }}>{parseInline(line.replace(/^#+\s/, ''))}</h2>);
          } else if (line.startsWith('## ')) {
            flushUl(`h${i}`); flushOl(`h${i}`);
            result.push(<h2 key={i} style={{ fontSize: 'var(--font-h2)', fontWeight: 700, color: '#7c3aed', margin: '28px 0 12px', borderBottom: `1px solid rgba(124,58,237,0.2)`, paddingBottom: 8 }}>{parseInline(line.replace(/^#+\s/, ''))}</h2>);
          } else if (line.startsWith('### ')) {
            flushUl(`h${i}`); flushOl(`h${i}`);
            result.push(<h3 key={i}>{parseInline(line.replace('###', '').trim())}</h3>);
          } else if (line.startsWith('- ') || line.startsWith('* ')) {
            flushOl(`b${i}`);
            ulBuffer.push(
              <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ color: '#7c3aed', marginTop: 6, flexShrink: 0, width: 6, height: 6, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
                <span>{parseInline(line.substring(2))}</span>
              </li>
            );
          } else if (numMatch) {
            flushUl(`n${i}`);
            const num = parseInt(numMatch[1]);
            const content = numMatch[2];
            olBuffer.push({ num, node: (
              <li key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: 'rgba(124,58,237,0.15)', color: '#7c3aed', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{num}</span>
                <span style={{ paddingTop: 3 }}>{parseInline(content)}</span>
              </li>
            )});
          } else if (isTableLine) {
            flushUl(`t${i}`); flushOl(`t${i}`);
            const cells = line.split('|').map(c => c.trim()).filter((c, idx, arr) => !((idx === 0 && c === '') || (idx === arr.length - 1 && c === '')));
            if (cells.every(c => c.match(/^[ \-:|]+$/))) return; // separator row
            // Collect table rows
            const tableRows: string[][] = [];
            let j = i;
            while (j < lines.length && lines[j].includes('|')) {
              const r = lines[j].trim();
              const rc = r.split('|').map(c => c.trim()).filter((c, idx, arr) => !((idx === 0 && c === '') || (idx === arr.length - 1 && c === '')));
              if (!rc.every(c => c.match(/^[ \-:|]+$/))) tableRows.push(rc);
              j++;
            }
            if (tableRows.length > 0) {
              result.push(
                <div key={i} style={{ overflowX: 'auto', margin: '20px 0' }}>
                  <table>
                    <thead><tr>{tableRows[0].map((h, hi) => <th key={hi}>{parseInline(h)}</th>)}</tr></thead>
                    <tbody>{tableRows.slice(1).map((row, ri) => (<tr key={ri}>{row.map((cell, ci) => <td key={ci}>{parseInline(cell)}</td>)}</tr>))}</tbody>
                  </table>
                </div>
              );
            }
          } else if (line.startsWith('---') || line.startsWith('===')) {
            flushUl(`hr${i}`); flushOl(`hr${i}`);
            result.push(<hr key={i} style={{ border: 'none', borderTop: `1px solid rgba(124,58,237,0.2)`, margin: '20px 0' }} />);
          } else {
            flushUl(`p${i}`); flushOl(`p${i}`);
            result.push(<p key={i} style={{ margin: '0 0 12px', lineHeight: 1.85 }}>{parseInline(line)}</p>);
          }
        });

        flushUl('end'); flushOl('end');
        return <div key={pi} style={{ marginBottom: 4 }}>{result}</div>;
      });
    })}</div>;
  };

  const renderInputArea = (isCentered: boolean) => (
    <div className={`input-wrapper ${isCentered ? 'centered' : 'bottom'}`} style={{ width: '100%', maxWidth: 800, margin: '0 auto', flexShrink: 0, zIndex: 10, position: 'relative' }}>
      {!isCentered && <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100, background: `linear-gradient(to top, ${themeVars.bg}, transparent)`, pointerEvents: 'none', zIndex: -1 }} />}
      <div style={{ background: settings.theme === 'dark' ? 'rgba(30, 31, 32, 0.9)' : 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${themeVars.border}`, borderRadius: 32, padding: '14px 20px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', transition: 'all 0.3s ease' }}>
        {selectedImages.length > 0 && (
          <div style={{ display: 'flex', gap: 8, paddingBottom: 12, overflowX: 'auto' }}>
            {selectedImages.map((img, i) => (
              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                <img src={img} alt="preview" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 12, border: `1px solid ${themeVars.border}` }} />
                <button onClick={() => setSelectedImages(prev => prev.filter((_, idx) => idx !== i))} style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', fontSize: 12 }}><X size={12} /></button>
              </div>
            ))}
          </div>
        )}
        <textarea ref={textareaRef} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = '44px'; e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`; }} rows={1} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(null); } }} placeholder={settings.language === 'English' ? "Ask ZENIX AI..." : "Tanya ZENIX AI..."} disabled={isLoading} style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', color: themeVars.text, fontSize: 'var(--font-md)', resize: 'none', lineHeight: 1.5, padding: '4px 4px 12px', minHeight: 44 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: themeVars.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: '50%' }}><Plus size={24} /></button>
            <input type="file" ref={fileInputRef} onChange={handleImageChange} multiple accept="image/*" style={{ display: 'none' }} />
            <button onClick={toggleListening} style={{ background: isListening ? 'rgba(239,68,68,0.15)' : 'none', border: 'none', color: isListening ? '#ef4444' : themeVars.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8, borderRadius: '50%' }}>{isListening ? <MicOff size={22} className="typing-dot" /> : <Mic size={22} />}</button>
          </div>
          <button onClick={() => handleSubmit(null)} disabled={isLoading || (!input.trim() && selectedImages.length === 0)} style={{ width: 44, height: 44, borderRadius: '50%', background: (input.trim() || selectedImages.length > 0) ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : (settings.theme === 'dark' ? '#333538' : '#e3e3e3'), border: 'none', cursor: (input.trim() || selectedImages.length > 0) ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s' }}><Send size={18} color={(input.trim() || selectedImages.length > 0) ? '#fff' : themeVars.textMuted} /></button>
        </div>
      </div>
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
        <div className={`smooth-transition ${isMobile && sidebarOpen ? 'mobile-sidebar' : ''}`} style={{ width: sidebarOpen ? 280 : 0, background: themeVars.sidebar, borderRight: `1px solid ${themeVars.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative', zIndex: 100 }}>
          <div style={{ padding: '20px 16px' }}>
            <button onClick={() => { setActiveSession(null); setMessages([]); }} style={{ width: sidebarOpen ? '100%' : '44px', height: '44px', borderRadius: '22px', border: 'none', background: 'linear-gradient(135deg, #7c3aed, #a855f7)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px' }}><Plus size={20} /><span>{settings.language === 'English' ? 'New Chat' : 'Chat Baru'}</span></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
            {groupedChats.map(([groupName, items]) => (
              <div key={groupName} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: themeVars.textMuted, padding: '10px 12px', textTransform: 'uppercase' }}>{settings.language === 'English' ? (groupName === 'Hari Ini' ? 'Today' : groupName === 'Kemarin' ? 'Yesterday' : groupName === '7 Hari Terakhir' ? 'Last 7 Days' : 'Older') : groupName}</div>
                {items.map(c => (
                  <div key={c.id} onClick={() => loadSession(c.id)} className={`sidebar-item ${activeSession === c.id ? 'active' : ''}`}><MessageSquare size={16} /><span style={{ flex: 1, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title || 'New Conversation'}</span><button onClick={(e) => deleteChat(e, c.id)} className="delete-icon" style={{ background: 'none', border: 'none', color: '#ef4444', padding: 4 }}><Trash2 size={14} /></button></div>
                ))}
              </div>
            ))}
          </div>
          <div style={{ padding: '16px', borderTop: `1px solid ${themeVars.border}` }}>
            <div onClick={() => setProfileOpen(!profileOpen)} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '8px 12px', borderRadius: 16 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, #7c3aed, #ec4899)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>{user?.name?.charAt(0)?.toUpperCase()}</div>
              {sidebarOpen && <div style={{ flex: 1, overflow: 'hidden' }}><div style={{ fontSize: 14, fontWeight: 600 }}>{user?.name}</div><div style={{ fontSize: 12, color: themeVars.textMuted }}>Trading Account</div></div>}
            </div>
            {profileOpen && (
              <div style={{ position: 'absolute', bottom: 70, left: 16, right: 16, background: themeVars.inputBg, border: `1px solid ${themeVars.border}`, borderRadius: 16, padding: '8px', zIndex: 200 }}>
                <div onClick={() => { setSettingsOpen(true); setProfileOpen(false); }} className="sidebar-item"><Settings size={16} /><span>Settings</span></div>
                <div onClick={handleLogout} className="sidebar-item" style={{ color: '#ef4444' }}><LogIn size={16} /><span>Logout</span></div>
              </div>
            )}
          </div>
        </div>

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
              <div style={{ maxWidth: 800, margin: '0 auto', width: '100%', padding: 20 }}>
                {messages.map((msg, idx) => (
                  <div key={msg.id} style={{ display: 'flex', gap: 16, marginBottom: 32, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    {msg.role === 'assistant' && <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #7c3aed' }}><img src="/logo-dark.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>}
                    <div style={{ maxWidth: '85%', background: msg.role === 'user' ? themeVars.userBubble : themeVars.inputBg, padding: '16px 20px', borderRadius: 24, border: msg.role === 'assistant' ? `1px solid ${themeVars.border}` : 'none' }}>
                      {msg.role === 'assistant' && activeSymbol && idx === messages.length - 1 && (
                        <div style={{ marginBottom: 20, height: 320, borderRadius: 16, overflow: 'hidden', border: `1px solid ${themeVars.border}` }}>
                          {historyData.length > 0 ? <TradingChart data={historyData} /> : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>Loading data...</div>}
                        </div>
                      )}
                      {msg.role === 'assistant' && msg.isTyping ? <Typewriter text={msg.content} renderer={renderMarkdown} /> : renderMarkdown(msg.content)}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
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
