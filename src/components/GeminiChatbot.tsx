/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Bot, 
  User as UserIcon, 
  Search, 
  MapPin, 
  ExternalLink, 
  Zap, 
  BrainCircuit, 
  RefreshCw, 
  ChevronDown, 
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
  groundingCitations?: Array<{ title: string; url: string }>;
  webSearchQueries?: string[];
  modelUsed?: string;
}

interface GeminiChatbotProps {
  onClose?: () => void;
  isFloating?: boolean;
}

export default function GeminiChatbot({ onClose, isFloating = false }: GeminiChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Bonjour! I am your Leish! Couture Beauty Concierge. I can guide you through our verified Independent MUAs, flagship makeup ateliers, and the latest 2026 runway beauty aesthetics. How can I curate your beauty experience today?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      modelUsed: 'gemini-3.5-flash'
    }
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [modelChoice, setModelChoice] = useState<'fast' | 'general' | 'complex'>('general');
  const [grounding, setGrounding] = useState<'none' | 'search' | 'maps'>('search');
  const [isMinimized, setIsMinimized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || loading) return;

    const userText = input.trim();
    setInput('');

    const newMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setLoading(true);

    // Format messages for @google/genai multi-turn chat history
    const apiContents = updatedMessages.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiContents,
          modelChoice,
          grounding
        })
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.statusText}`);
      }

      const data = await res.json();
      const modelReply: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.reply || 'I am delighted to assist with your beauty styling questions.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        groundingCitations: data.groundingCitations || [],
        webSearchQueries: data.webSearchQueries || [],
        modelUsed: data.modelUsed
      };

      setMessages(prev => [...prev, modelReply]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'model',
          text: 'I apologize, but my beauty concierge service encountered a momentary connection interruption. Please try asking again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (promptText: string) => {
    setInput(promptText);
  };

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-[#9A1A18] hover:bg-[#C82A27] text-white shadow-2xl transition-all font-mono text-xs font-bold cursor-pointer"
      >
        <Sparkles className="h-4 w-4 animate-spin-slow" />
        <span>Open Beauty AI Concierge</span>
      </button>
    );
  }

  return (
    <div className={`flex flex-col rounded-3xl border border-[#2B231F] bg-[#14100E] shadow-2xl overflow-hidden ${
      isFloating ? 'fixed bottom-6 right-6 z-50 w-[95vw] sm:w-[460px] h-[600px]' : 'w-full h-[650px]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#2B231F] bg-[#1C1613]">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-[#9A1A18]/20 border border-[#9A1A18]/50 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-[#E9D2C4]" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-sm text-[#FAF8F5] flex items-center gap-1.5">
              <span>Leish! AI Artistry Concierge</span>
              <span className="text-[9px] font-mono uppercase bg-[#9A1A18] text-white px-1.5 py-0.2 rounded">
                Gemini
              </span>
            </h3>
            <p className="text-[10px] text-[#A89F91]">
              Multi-turn beauty advisor with Google Search & Maps Grounding
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {isFloating && (
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#FAF8F5] hover:bg-[#2B231F]"
              title="Minimize"
            >
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#A89F91] hover:text-[#FAF8F5] hover:bg-[#2B231F]"
              title="Close"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Model & Grounding Controls Toolbar */}
      <div className="px-4 py-2 border-b border-[#261E1A] bg-[#100D0B] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
        {/* Model Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[#736A63]">Model:</span>
          <div className="flex rounded-lg bg-[#181310] border border-[#2B231F] p-0.5">
            <button
              type="button"
              onClick={() => setModelChoice('fast')}
              className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                modelChoice === 'fast' ? 'bg-[#9A1A18] text-white font-bold' : 'text-[#8E867E] hover:text-[#FAF8F5]'
              }`}
              title="gemini-3.1-flash-lite (Ultra fast)"
            >
              Lite
            </button>
            <button
              type="button"
              onClick={() => setModelChoice('general')}
              className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                modelChoice === 'general' ? 'bg-[#9A1A18] text-white font-bold' : 'text-[#8E867E] hover:text-[#FAF8F5]'
              }`}
              title="gemini-3.5-flash (Balanced)"
            >
              Flash 3.5
            </button>
            <button
              type="button"
              onClick={() => setModelChoice('complex')}
              className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                modelChoice === 'complex' ? 'bg-[#9A1A18] text-white font-bold' : 'text-[#8E867E] hover:text-[#FAF8F5]'
              }`}
              title="gemini-3.1-pro-preview (Deep reasoning)"
            >
              Pro
            </button>
          </div>
        </div>

        {/* Grounding Selector */}
        <div className="flex items-center gap-1">
          <span className="text-[#736A63]">Grounding:</span>
          <div className="flex rounded-lg bg-[#181310] border border-[#2B231F] p-0.5">
            <button
              type="button"
              onClick={() => setGrounding('none')}
              className={`px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                grounding === 'none' ? 'bg-[#382F2A] text-white' : 'text-[#8E867E] hover:text-[#FAF8F5]'
              }`}
            >
              None
            </button>
            <button
              type="button"
              onClick={() => setGrounding('search')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                grounding === 'search' ? 'bg-blue-900/60 text-blue-200 border border-blue-700/50' : 'text-[#8E867E] hover:text-[#FAF8F5]'
              }`}
              title="Ground responses with Google Search real-time web data"
            >
              <Search className="h-2.5 w-2.5 text-blue-400" />
              <span>Search</span>
            </button>
            <button
              type="button"
              onClick={() => setGrounding('maps')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-all cursor-pointer ${
                grounding === 'maps' ? 'bg-emerald-900/60 text-emerald-200 border border-emerald-700/50' : 'text-[#8E867E] hover:text-[#FAF8F5]'
              }`}
              title="Ground responses with Google Maps location data"
            >
              <MapPin className="h-2.5 w-2.5 text-emerald-400" />
              <span>Maps</span>
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Message Thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'model' && (
              <div className="h-7 w-7 rounded-full bg-[#1C1613] border border-[#9A1A18]/50 flex items-center justify-center shrink-0 mt-0.5">
                <Bot className="h-3.5 w-3.5 text-[#E9D2C4]" />
              </div>
            )}

            <div className={`max-w-[82%] space-y-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#9A1A18] text-white rounded-br-none shadow-md'
                  : 'bg-[#1C1613] text-[#E5DFD9] border border-[#2B231F] rounded-bl-none'
              }`}>
                <p className="whitespace-pre-line">{m.text}</p>
              </div>

              {/* Citations & Metadata */}
              {m.groundingCitations && m.groundingCitations.length > 0 && (
                <div className="p-2.5 rounded-xl bg-[#14100E] border border-[#2B231F] space-y-1.5">
                  <span className="text-[10px] font-mono uppercase text-[#736A63] flex items-center gap-1">
                    <Search className="h-2.5 w-2.5 text-blue-400" />
                    <span>Google Search Grounding Sources</span>
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {m.groundingCitations.slice(0, 3).map((cit, idx) => (
                      <a
                        key={idx}
                        href={cit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-mono text-[#E9D2C4] hover:underline bg-[#1E1714] px-2 py-0.5 rounded border border-[#382F2A]"
                      >
                        <span className="truncate max-w-[140px]">{cit.title}</span>
                        <ExternalLink className="h-2.5 w-2.5 text-[#736A63]" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 text-[9px] font-mono text-[#736A63] px-1">
                <span>{m.timestamp}</span>
                {m.modelUsed && <span>· {m.modelUsed}</span>}
              </div>
            </div>

            {m.role === 'user' && (
              <div className="h-7 w-7 rounded-full bg-[#382F2A] flex items-center justify-center shrink-0 mt-0.5">
                <UserIcon className="h-3.5 w-3.5 text-[#FAF8F5]" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start items-center text-xs text-[#A89F91] font-mono">
            <div className="h-7 w-7 rounded-full bg-[#1C1613] border border-[#9A1A18]/50 flex items-center justify-center shrink-0 animate-pulse">
              <Sparkles className="h-3.5 w-3.5 text-[#E9D2C4]" />
            </div>
            <div className="p-3 rounded-2xl bg-[#1C1613] border border-[#2B231F] flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9A1A18] animate-bounce" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#9A1A18] animate-bounce [animation-delay:0.2s]" />
              <span className="h-1.5 w-1.5 rounded-full bg-[#9A1A18] animate-bounce [animation-delay:0.4s]" />
              <span className="text-[11px] text-[#A89F91]">
                {grounding === 'search' ? 'Searching Google & consulting trends...' : 'Analyzing makeup artistry options...'}
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="px-4 py-1.5 bg-[#100D0B] border-t border-[#261E1A] flex gap-1.5 overflow-x-auto scrollbar-none">
        <button
          type="button"
          onClick={() => handleQuickPrompt("What are the top 2026 bridal makeup trends right now?")}
          className="text-[10px] font-mono text-[#A89F91] hover:text-[#FAF8F5] bg-[#181310] px-2.5 py-1 rounded-full border border-[#2B231F] shrink-0"
        >
          2026 Bridal Trends
        </button>
        <button
          type="button"
          onClick={() => handleQuickPrompt("Which MUA specializes in South Asian cut-crease bridal?")}
          className="text-[10px] font-mono text-[#A89F91] hover:text-[#FAF8F5] bg-[#181310] px-2.5 py-1 rounded-full border border-[#2B231F] shrink-0"
        >
          South Asian Bridal MUA
        </button>
        <button
          type="button"
          onClick={() => handleQuickPrompt("Where can I learn airbrush makeup in a masterclass?")}
          className="text-[10px] font-mono text-[#A89F91] hover:text-[#FAF8F5] bg-[#181310] px-2.5 py-1 rounded-full border border-[#2B231F] shrink-0"
        >
          Airbrush Masterclass
        </button>
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#2B231F] bg-[#14100E] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about MUAs, skin matching, wedding trials, masterclasses..."
          className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#2B231F] bg-[#1C1613] text-xs text-[#FAF8F5] placeholder-[#736A63] focus:border-[#9A1A18] focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-4 py-2.5 rounded-xl bg-[#9A1A18] hover:bg-[#B52220] disabled:opacity-40 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Send className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
    </div>
  );
}
