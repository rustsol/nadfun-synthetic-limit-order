'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { api } from '@/lib/api';

interface ChatAction {
  type: string;
  result: { success?: boolean; orderId?: string; error?: string };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  provider?: string;
  actions?: ChatAction[];
}

function getChatKey(wallet: string) {
  return `nadfun_chat_${wallet.toLowerCase()}`;
}

function loadMessages(wallet: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(getChatKey(wallet));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveMessages(wallet: string, messages: ChatMessage[]) {
  try {
    localStorage.setItem(getChatKey(wallet), JSON.stringify(messages));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

export default function ChatPage() {
  const { address, isConnected } = useAccount();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage when wallet connects
  useEffect(() => {
    if (address) {
      setMessages(loadMessages(address));
    }
  }, [address]);

  // Save to localStorage whenever messages change
  const updateMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
    if (address) saveMessages(address, msgs);
  }, [address]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleClear = () => {
    updateMessages([]);
  };

  const handleSend = async () => {
    if (!input.trim() || !address || loading) return;

    const userMessage: ChatMessage = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    updateMessages(newMessages);
    setInput('');
    setLoading(true);

    try {
      const result = await api.aiChat({
        wallet: address,
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
      });
      updateMessages([...newMessages, {
        role: 'assistant',
        content: result.response,
        provider: result.provider,
        actions: result.actions,
      }]);
    } catch (err) {
      updateMessages([...newMessages, {
        role: 'assistant',
        content: 'Sorry, I encountered an error. Make sure you have AI API keys configured in Settings.',
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="text-center text-gray-500 py-20">
        Connect your wallet to chat with your AI agent
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-white">AI Agent Chat</h1>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-gray-500 hover:text-red-400 transition"
            >
              Clear Chat
            </button>
          )}
          <span className="text-xs text-gray-500">
            Ask about tokens, strategies, and orders
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <div className="text-4xl">🤖</div>
            <p className="text-gray-400">
              Hi! I can help you place orders, explain strategies, and manage your synthetic limit orders.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                'What order types can I place?',
                'Place a DCA order for me',
                'How do my orders get executed?',
                'Show my active orders',
              ].map(suggestion => (
                <button
                  key={suggestion}
                  onClick={() => { setInput(suggestion); }}
                  className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-monad-600 text-white'
                  : 'bg-gray-800 text-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              {msg.actions && msg.actions.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.actions.map((action, ai) => (
                    <div key={ai} className={`text-xs px-2 py-1 rounded ${action.result.success ? 'bg-green-900/50 text-green-300 border border-green-700' : 'bg-red-900/50 text-red-300 border border-red-700'}`}>
                      {action.type === 'CREATE_ORDER' && action.result.success && (
                        <span>Order created (ID: {action.result.orderId?.slice(0, 8)}...) - View it on your Orders page</span>
                      )}
                      {action.type === 'CANCEL_ORDER' && action.result.success && (
                        <span>Order {action.result.orderId?.slice(0, 8)}... cancelled</span>
                      )}
                      {action.result.error && (
                        <span>Failed: {action.result.error}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {msg.provider && msg.provider !== 'none' && (
                <p className="text-[10px] mt-1 opacity-50">via {msg.provider}</p>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-2xl px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 pt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask your AI agent anything..."
            className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-monad-500"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="px-6 py-3 bg-monad-600 hover:bg-monad-700 disabled:bg-gray-700 disabled:text-gray-500 text-white font-medium rounded-xl transition"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
