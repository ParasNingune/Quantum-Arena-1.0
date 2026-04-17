'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, User, Bot, Loader2 } from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

function renderChatMarkdown(text: string) {
  if (!text) return null;
  const lines = text.split('\n');
  
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return null;
        
        let isBullet = false;
        let cleanLine = line;
        
        // Check if line starts with bullet
        if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          isBullet = true;
          cleanLine = line.trim().substring(2);
        }
        
        // Parse bold
        const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
        const mappedParts = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={j} className="font-semibold text-[color:var(--zen-text)]">{part.slice(2, -2)}</strong>;
          }
          return <span key={j}>{part}</span>;
        });

        if (isBullet) {
          return (
            <div key={i} className="flex gap-2 items-start ml-2">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-current flex-shrink-0 opacity-40" />
              <span>{mappedParts}</span>
            </div>
          );
        }
        
        return <div key={i}>{mappedParts}</div>;
      })}
    </div>
  );
}

export default function ChatWidget({ analysisData }: { analysisData: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          role: 'model',
          content: "Hi! I'm your MediSense AI health assistant. I can help explain your test results, suggest lifestyle changes, and answer medical questions based on your report. How can I help you today?"
        }
      ]);
    }
  }, [isOpen, messages.length]);

  const sendMessage = async () => {
    if (!inputMsg.trim() || isTyping) return;
    
    const newMsg: ChatMessage = { role: 'user', content: inputMsg };
    setMessages(prev => [...prev, newMsg]);
    setInputMsg('');
    setIsTyping(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: newMsg.content,
          history: messages,
          context: analysisData || {}
        })
      });
      
      if (!res.ok) throw new Error('Chat request failed');
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'model', content: data.reply }]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'model', content: "Sorry, I'm having trouble connecting right now. Please try again later." }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            onClick={() => setIsOpen(true)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--zen-brand-solid)', color: 'white' }}
          >
            <MessageCircle className="w-8 h-8" />
            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="absolute right-[80px] bg-white text-gray-800 px-4 py-2 rounded-xl text-sm font-semibold shadow-lg whitespace-nowrap"
                >
                  Chat with MediSense AI
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 w-[380px] max-w-[calc(100vw-48px)] h-[600px] max-h-[calc(100vh-140px)] rounded-3xl overflow-hidden flex flex-col z-50 zen-glass-solid"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.08)' }}
          >
            {/* Header */}
            <div className="px-5 py-4 flex items-center justify-between shadow-sm" style={{ background: 'var(--zen-brand)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white shadow-sm">
                  <span className="text-xl">🩺</span>
                </div>
                <div>
                  <h3 className="font-semibold text-sm" style={{ color: 'var(--zen-brand-text)' }}>MediSense AI</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--zen-brand-text)', opacity: 0.8 }}>Online</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors bg-black/5 hover:bg-black/10"
                style={{ color: 'var(--zen-brand-text)' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ background: 'var(--zen-bg-warm)' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm ${msg.role === 'user' ? 'bg-white' : ''}`}
                    style={msg.role === 'model' ? { background: 'var(--zen-brand-solid)', color: 'white' } : { color: 'var(--zen-text)' }}
                  >
                    {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                  </div>
                  
                  <div 
                    className={`px-4 py-3 text-sm leading-relaxed ${msg.role === 'user' ? 'rounded-2xl rounded-tr-sm text-white shadow-md' : 'rounded-2xl rounded-tl-sm bg-white shadow-sm'}`}
                    style={msg.role === 'user' ? { background: 'var(--zen-text)' } : { color: 'var(--zen-text-secondary)' }}
                  >
                    {msg.role === 'model' ? renderChatMarkdown(msg.content) : msg.content}
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 shadow-sm text-white" style={{ background: 'var(--zen-brand-solid)' }}>
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="px-5 py-4 rounded-2xl rounded-tl-sm bg-white shadow-sm flex items-center gap-1.5">
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-gray-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-gray-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }} />
                    <motion.div className="w-1.5 h-1.5 rounded-full bg-gray-400" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }} />
                  </div>
                </div>
              )}
              
              <div ref={endOfMessagesRef} />
            </div>

            {/* Input Form */}
            <div className="p-4 bg-white border-t" style={{ borderColor: 'var(--zen-border)' }}>
              <form 
                onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                className="flex items-end gap-2 relative bg-gray-100 rounded-2xl p-1"
              >
                <textarea
                  value={inputMsg}
                  onChange={e => setInputMsg(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder="Ask about your report..."
                  className="w-full bg-transparent resize-none outline-none py-3 pl-4 pr-1 text-sm max-h-32"
                  style={{ color: 'var(--zen-text)' }}
                  rows={1}
                />
                <button
                  type="submit"
                  disabled={!inputMsg.trim() || isTyping}
                  className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center mb-1 mr-1 transition-colors"
                  style={{ 
                    background: inputMsg.trim() && !isTyping ? 'var(--zen-brand-solid)' : '#D1D5DB', 
                    color: 'white' 
                  }}
                >
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
