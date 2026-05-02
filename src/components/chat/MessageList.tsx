'use client';
import React from 'react';
import { ChatMessage } from './ChatMessage';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

interface MessageListProps {
  messages: Message[];
  themeVars: any;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, themeVars, messagesEndRef }) => {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', width: '100%', padding: 20 }}>
      {messages.map((msg) => (
        <ChatMessage key={msg.id} msg={msg} themeVars={themeVars} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};
