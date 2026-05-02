'use client';
import React from 'react';
import { Plus, MessageSquare, Trash2, Settings, LogIn } from 'lucide-react';

interface ChatSession {
  id: string;
  title: string;
}

interface SidebarProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  isMobile: boolean;
  activeSession: string | null;
  setActiveSession: (id: string | null) => void;
  setMessages: (msgs: any[]) => void;
  groupedChats: [string, ChatSession[]][];
  loadSession: (id: string) => void;
  deleteChat: (e: React.MouseEvent, id: string) => void;
  user: any;
  profileOpen: boolean;
  setProfileOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  handleLogout: () => void;
  settings: { language: string; theme: string };
  themeVars: any;
}

export const Sidebar: React.FC<SidebarProps> = ({
  sidebarOpen,
  isMobile,
  activeSession,
  setActiveSession,
  setMessages,
  groupedChats,
  loadSession,
  deleteChat,
  user,
  profileOpen,
  setProfileOpen,
  setSettingsOpen,
  handleLogout,
  settings,
  themeVars,
}) => {
  return (
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
  );
};
