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
  // Hapus internal thinking/thought blocks secara agresif
  let t = raw.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
  t = t.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  t = t.replace(/<internal>[\s\S]*?<\/internal>/gi, '').trim();
  
  // Preserve code blocks dulu sebelum strip markdown
  const codeBlocks: string[] = [];
  t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    const trimmedCode = code.trim();
    // Skip code block kosong — ini penyebab "kotak blank"
    if (!trimmedCode) return '';
    const label = lang ? `<span class="code-lang">${lang.toUpperCase()}</span>` : '';
    codeBlocks.push(`<pre class="ai-pre" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(124,58,237,0.2)">${label}<code>${trimmedCode.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</code></pre>`);
    return `%%CODE_${codeBlocks.length - 1}%%`;
  });

  // === HAPUS SEMUA ** dan * (Bold/Italic markdown) ===
  // User request: hapus bold sepenuhnya, biarkan text plain saja
  t = t.replace(/\*{2,}([^*]*?)\*{2,}/g, '$1');  // **text** → text
  t = t.replace(/\*{2,}/g, '');                   // Sisa ** yang tidak berpasangan
  t = t.replace(/(?<!\w)\*([^*\n]+?)\*(?!\w)/g, '$1'); // *italic* → text
  
  // Headers (setelah strip bold agar heading text bersih)
  t = t.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  t = t.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  t = t.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  
  // Inline code (single backtick)
  t = t.replace(/`([^`]+)`/g, '<code class="ai-inline-code">$1</code>');
  
  // Horizontal rule
  t = t.replace(/^---+$/gm, '<hr/>');
  
  // Tables
  t = t.replace(/((?:\|.+\|\n?)+)/g, (table) => {
    const rows = table.trim().split('\n').filter(r => r.trim());
    if (rows.length < 2) return table;
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
  
  // Ordered list
  t = t.replace(/((?:^\d+\. .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^\d+\. /, '').trim());
    return `<ol class="ai-ol">${items.map((item, i) => `<li><span class="ai-num">${i+1}</span><span>${item}</span></li>`).join('')}</ol>`;
  });
  
  // Unordered list — match lines starting with "- " only (not bare *)
  t = t.replace(/((?:^- .+\n?)+)/gm, (block) => {
    const items = block.trim().split('\n').map(l => l.replace(/^- /, '').trim());
    return `<ul class="ai-ul">${items.map(item => `<li><span class="ai-dot"></span><span>${item}</span></li>`).join('')}</ul>`;
  });
  
  // Wrap remaining plain text lines in <p>
  t = t.replace(/^(?!<[a-z%]).+$/gm, line => line.trim() ? `<p>${line}</p>` : '');
  
  // Restore code blocks
  t = t.replace(/%%CODE_(\d+)%%/g, (_, i) => codeBlocks[parseInt(i)]);
  
  // Final cleanup — hapus <p> kosong dan whitespace berlebihan
  t = t.replace(/<p>\s*<\/p>/g, '');
  
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
