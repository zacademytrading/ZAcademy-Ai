'use client';
import React, { useState, useEffect } from 'react';
import { ExportPDFButton } from './ExportPDFButton';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

interface ChatMessageProps {
  msg: Message;
  themeVars: any;
}

const Typewriter = ({ text, renderer }: { text: string, renderer: (t: string) => React.ReactNode }) => {
  const [displayedText, setDisplayedText] = useState('');
  useEffect(() => {
    let i = 0; setDisplayedText('');
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1)); i++;
      if (i >= text.length) clearInterval(interval);
    }, 10);
    return () => clearInterval(interval);
  }, [text]);
  return <>{renderer(displayedText)}</>;
};

const mdToHtml = (raw: string): string => {
  if (!raw) return '';
  // Hapus internal thinking jika ada
  let t = raw.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
  
  const codeBlocks: string[] = [];
  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const label = lang ? `<span class="code-lang">${lang.toUpperCase()}</span>` : '';
    // Gunakan background yang lebih transparan
    codeBlocks.push(`<pre class="ai-pre" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(124,58,237,0.2)">${label}<code>${code.trim().replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`);
    return `%%CODE_${codeBlocks.length - 1}%%`;
  });
  t = t.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  t = t.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  t = t.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/\*([^*\n]+?)\*/g, '<em>$1</em>');
  t = t.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
  t = t.replace(/^---+$/gm, '<hr/>');
  t = t.replace(/((?:\|.+\|\n?)+)/g, (table) => {
    const rows = table.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return table; // Bukan tabel sungguran
    let html = '<div class="ai-table-wrap"><table>';
    let headerDone = false;
    rows.forEach(row => {
      const cells = row.split('|').map(c => c.trim()).filter((_, i, a) => !(i === 0 && _ === '') && !(i === a.length-1 && _ === ''));
      if (cells.every(c => /^[\-: ]+$/.test(c))) return;
      if (!headerDone) { html += `<thead><tr>${cells.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>`; headerDone = true; }
      else html += `<tr>${cells.map(c=>`<td>${c}</td>`).join('')}</tr>`;
    });
    html += '</tbody></table></div>';
    return html;
  });
  t = t.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^\d+\. /, '').trim());
    return `<ol class="ai-ol">${items.map((item, i) => `<li><span class="ai-num">${i+1}</span><span>${item}</span></li>`).join('')}</ol>`;
  });
  t = t.replace(/((?:^[-*] .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^[-*] /, '').trim());
    return `<ul class="ai-ul">${items.map(item => `<li><span class="ai-dot"></span><span>${item}</span></li>`).join('')}</ul>`;
  });
  t = t.replace(/^(?!<[a-z%]).+$/gm, line => line.trim() ? `<p>${line}</p>` : '');
  t = t.replace(/%%CODE_(\d+)%%/g, (_, i) => codeBlocks[parseInt(i)]);
  return t;
};

export const ChatMessage: React.FC<ChatMessageProps> = ({ msg, themeVars }) => {
  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 32, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
      {msg.role === 'assistant' && (
        <div style={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: '1px solid #7c3aed' }}>
          <img src="/logo-dark.jpg" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Assistant" />
        </div>
      )}
      <div style={{ 
        maxWidth: '85%', 
        background: msg.role === 'user' ? themeVars.userBubble : themeVars.inputBg, 
        padding: '16px 20px', 
        borderRadius: 24, 
        border: msg.role === 'assistant' ? `1px solid ${themeVars.border}` : 'none' 
      }}>
        <div id={`msg-content-${msg.id}`}>
          {msg.role === 'assistant' && msg.isTyping ? (
            <Typewriter text={msg.content} renderer={(t) => <div className="ai-content" dangerouslySetInnerHTML={{ __html: mdToHtml(t) }} />} />
          ) : (
            <div className="ai-content" dangerouslySetInnerHTML={{ __html: mdToHtml(msg.content) }} />
          )}
        </div>
        
        {msg.role === 'assistant' && !msg.isTyping && (
          <ExportPDFButton elementId={`msg-content-${msg.id}`} filename={`ZENIX-Trading-Plan-${msg.id}`} />
        )}
      </div>
    </div>
  );
};
