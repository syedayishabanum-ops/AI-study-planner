import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { useStudyPlan } from '../../context/StudyPlanContext';

const generateUniqueId = () => Math.random().toString(36).substring(7);
const getNowDate = () => new Date();

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export const AIChatAssistant: React.FC = () => {
  const { sendChatMsg } = useStudyPlan();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am **Aegis**, your AI Academic Coach. 🎓\n\nI can help you:\n- Explain complex concepts.\n- Suggest study methods (Feynman Technique, Active Recall).\n- Generate customized revision schedules.\n- Give you a motivation boost!\n\nWhat are you studying today?",
      timestamp: getNowDate()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollChatToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollChatToBottom();
  }, [messages, isTyping]);

  const quickPills = [
    { label: "Explain Feynman Method", text: "How does the Feynman Technique work?" },
    { label: "Spaced Repetition Advice", text: "How do I implement Spaced Repetition for weak subjects?" },
    { label: "I need motivation", text: "I am feeling stressed and need a motivational boost!" },
    { label: "Suggest Study Timetable", text: "Can you recommend a weekly study routine?" }
  ];

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsgId = generateUniqueId();
    const userMsg: Message = {
      id: userMsgId,
      sender: 'user',
      text: textToSend,
      timestamp: getNowDate()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      // Map message history to Gemini API format { role: 'user' | 'model', parts: string }
      // Exclude welcome message to avoid polluting initial mock prompts
      const history = messages
        .filter(m => m.id !== 'welcome')
        .map(m => ({
          role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: m.text
        }));

      const reply = await sendChatMsg(textToSend, history);
      
      const aiMsg: Message = {
        id: generateUniqueId(),
        sender: 'ai',
        text: reply,
        timestamp: getNowDate()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: generateUniqueId(),
        sender: 'ai',
        text: `⚠️ **Error:** Failed to connect to Gemini API. ${err.message || 'Check connection details.'}`,
        timestamp: getNowDate()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  // Simple formatter to parse basic markdown: **bold**, - lists, ### headers
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content: React.ReactNode = line;
      
      // Parse Bold **text**
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        content = parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-extrabold text-indigo-200">{part}</strong> : part));
      }

      // Headers ###
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-display font-bold text-lg text-white mt-3 mb-1.5">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="font-display font-extrabold text-xl text-white mt-4 mb-2">{line.replace('## ', '')}</h3>;
      }

      // Bullet Lists
      if (line.trim().startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-gray-300 my-0.5">
            {line.trim().substring(2)}
          </li>
        );
      }

      // Default paragraph
      return line.trim() === '' ? <div key={idx} className="h-2" /> : <p key={idx} className="text-sm text-gray-300 leading-relaxed my-0.5">{content}</p>;
    });
  };

  return (
    <div className="glass-panel rounded-2xl flex flex-col h-[600px] max-w-4xl w-full mx-auto overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-800/80 bg-gray-900/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/20 glow-glow">
            <Bot size={22} />
          </div>
          <div>
            <h3 className="font-display font-bold text-base tracking-wide flex items-center gap-1.5">
              Aegis Chatbot <Sparkles size={14} className="text-indigo-400 fill-indigo-400" />
            </h3>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">Active Study Coach</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold bg-indigo-950/20 border border-indigo-900/30 px-2.5 py-1 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Gemini 1.5 Enabled
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 bg-gray-950/10">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
            <div className={`p-2 rounded-lg h-9 w-9 flex items-center justify-center shrink-0 border ${
              msg.sender === 'user' 
                ? 'bg-gray-800 border-gray-700 text-gray-300' 
                : 'bg-indigo-950/40 border-indigo-900/40 text-indigo-400'
            }`}>
              {msg.sender === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>
            
            <div className={`px-4 py-3 rounded-2xl border text-sm ${
              msg.sender === 'user'
                ? 'bg-indigo-600 border-indigo-500/30 text-white rounded-tr-none'
                : 'glass-panel border-gray-850/20 rounded-tl-none'
            }`}>
              {msg.sender === 'user' ? <p className="leading-relaxed">{msg.text}</p> : renderMessageContent(msg.text)}
              <span className="text-[9px] text-gray-500 block text-right mt-1.5 font-semibold">
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex gap-3 mr-auto items-center">
            <div className="p-2 rounded-lg h-9 w-9 flex items-center justify-center bg-indigo-950/40 border border-indigo-900/40 text-indigo-400">
              <Bot size={18} />
            </div>
            <div className="glass-panel px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Pills */}
      {messages.length === 1 && !isTyping && (
        <div className="px-6 py-2 bg-gray-900/10 border-t border-gray-900/30">
          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-2">Suggested Prompts</p>
          <div className="flex flex-wrap gap-2">
            {quickPills.map((pill, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(pill.text)}
                className="text-xs bg-indigo-950/20 hover:bg-indigo-900/35 border border-indigo-900/40 hover:border-indigo-800 text-indigo-300 px-3 py-1.5 rounded-full transition cursor-pointer"
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
        className="px-6 py-4 border-t border-gray-800/80 bg-gray-900/20 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Aegis to explain a topic, make a quiz, suggest breaks..."
          disabled={isTyping}
          className="flex-1 bg-gray-950/60 border border-gray-850 px-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 disabled:opacity-50 transition"
        />
        <button
          type="submit"
          disabled={!input.trim() || isTyping}
          className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl disabled:opacity-50 disabled:hover:bg-indigo-600 transition flex items-center justify-center cursor-pointer"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
