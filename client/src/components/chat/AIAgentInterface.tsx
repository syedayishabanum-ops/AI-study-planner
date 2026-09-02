import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Bot, User, Sparkles, Brain, 
  Terminal, Calendar, ListChecks, Zap 
} from 'lucide-react';
import { useStudyPlan } from '../../context/StudyPlanContext';

interface AgentMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
  reasoning?: string;
  action?: string;
  recommendations?: Array<{
    type: string;
    title: string;
    priority: 'low' | 'medium' | 'high';
    description: string;
    topic?: string;
    subjectId?: string;
  }>;
  studyPlan?: any[];
  steps?: string[];
}

export const AIAgentInterface: React.FC = () => {
  const { askStudyAgent } = useStudyPlan();
  const [messages, setMessages] = useState<AgentMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your **AI Study Planner Agent**. 🧠🤖\n\nUnlike a regular chatbot, I can access your student profile, enrollments, checklist tasks, and performance logs to automate your study planning.\n\nTry asking me:\n- *\"What should I study today?\"*\n- *\"I scored low in DBMS, what should I focus on?\"*\n- *\"I have 3 hours today. Create my study plan.\"*\n- *\"I missed yesterday's study plan, help me reschedule.\"*",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeAgentState, setActiveAgentState] = useState<AgentMessage | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollChatToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollChatToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: AgentMessage = {
      id: Math.random().toString(36).substring(7),
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await askStudyAgent(textToSend);
      
      const aiMsg: AgentMessage = {
        id: Math.random().toString(36).substring(7),
        sender: 'ai',
        text: response.message,
        timestamp: new Date(),
        reasoning: response.reasoning,
        action: response.action,
        recommendations: response.recommendations,
        studyPlan: response.studyPlan,
        steps: response.steps
      };

      setMessages(prev => [...prev, aiMsg]);
      setActiveAgentState(aiMsg);
    } catch (err: any) {
      const errMsg: AgentMessage = {
        id: Math.random().toString(36).substring(7),
        sender: 'ai',
        text: `⚠️ **Agent Error:** Failed to execute request. ${err.message || 'Check database connection.'}`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      let content: React.ReactNode = line;
      
      const boldRegex = /\*\*(.*?)\*\*/g;
      if (boldRegex.test(line)) {
        const parts = line.split(boldRegex);
        content = parts.map((part, i) => (i % 2 === 1 ? <strong key={i} className="font-extrabold text-indigo-200">{part}</strong> : part));
      }

      if (line.trim().startsWith('- ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-gray-300 my-0.5">
            {line.trim().substring(2)}
          </li>
        );
      }

      return line.trim() === '' ? <div key={idx} className="h-2" /> : <p key={idx} className="text-sm text-gray-300 leading-relaxed my-0.5">{content}</p>;
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full max-w-6xl mx-auto min-h-[600px]">
      
      {/* LEFT: Conversation Chat Interface */}
      <div className="lg:col-span-7 glass-panel rounded-2xl flex flex-col h-[650px] overflow-hidden border border-gray-850">
        
        {/* Chat Header */}
        <div className="px-6 py-4 border-b border-gray-800/80 bg-gray-900/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/20 glow-glow">
              <Brain size={22} />
            </div>
            <div>
              <h3 className="font-display font-bold text-base tracking-wide flex items-center gap-1.5 text-white">
                Aegis Planner Agent
              </h3>
              <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-black flex items-center gap-1">
                <Zap size={10} className="animate-pulse" /> Decides & Executes Tasks
              </p>
            </div>
          </div>
        </div>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-gray-950/10">
          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-3 max-w-[90%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}>
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
                
                {/* Visual state change indicator for agent executions */}
                {msg.sender === 'ai' && msg.action && (
                  <div className="mt-2.5 pt-2 border-t border-indigo-950/40 flex items-center gap-1 text-[10px] text-indigo-300 font-bold uppercase tracking-wider">
                    <Sparkles size={11} /> Action Decided: {msg.action}
                  </div>
                )}
                
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
              <div className="glass-panel px-4 py-3 rounded-2xl rounded-tl-none flex flex-col gap-2">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[9px] text-indigo-300/80 uppercase font-black tracking-widest animate-pulse">Agent reasoning...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt pills */}
        {messages.length === 1 && !isTyping && (
          <div className="px-6 py-2.5 bg-gray-900/10 border-t border-gray-900/30">
            <p className="text-[9px] text-gray-400 uppercase tracking-widest font-black mb-2 flex items-center gap-1">
              <Terminal size={10} /> Test Student Agent Commands
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleSendMessage("What should I study today?")}
                className="text-xs bg-indigo-950/20 hover:bg-indigo-900/30 border border-indigo-900/40 hover:border-indigo-800 text-indigo-300 px-3 py-1.5 rounded-full transition cursor-pointer"
              >
                📝 "What should I study today?"
              </button>
              <button
                onClick={() => handleSendMessage("I scored low in DBMS. What should I study?")}
                className="text-xs bg-indigo-950/20 hover:bg-indigo-900/30 border border-indigo-900/40 hover:border-indigo-800 text-indigo-300 px-3 py-1.5 rounded-full transition cursor-pointer"
              >
                🔬 "Low grade in DBMS?"
              </button>
              <button
                onClick={() => handleSendMessage("I have 3 hours today. Create my study plan.")}
                className="text-xs bg-indigo-950/20 hover:bg-indigo-900/30 border border-indigo-900/40 hover:border-indigo-800 text-indigo-300 px-3 py-1.5 rounded-full transition cursor-pointer"
              >
                📅 "Create 3h study plan"
              </button>
              <button
                onClick={() => handleSendMessage("I missed yesterday's study plan.")}
                className="text-xs bg-indigo-950/20 hover:bg-indigo-900/30 border border-indigo-900/40 hover:border-indigo-800 text-indigo-300 px-3 py-1.5 rounded-full transition cursor-pointer"
              >
                🔄 "Missed yesterday's plan"
              </button>
            </div>
          </div>
        )}

        {/* Send prompt input */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
          className="px-6 py-4 border-t border-gray-800/80 bg-gray-900/20 flex gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a request (e.g. 'Identify my weakest topics')..."
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

      {/* RIGHT: Active Agent Reasoning Workspace */}
      <div className="lg:col-span-5 flex flex-col gap-6">
        
        {/* Workspace Panel */}
        <div className="glass-panel p-6 rounded-2xl border border-gray-850 flex-1 h-[650px] overflow-y-auto space-y-5">
          
          <div className="flex items-center gap-2 border-b border-gray-900 pb-3">
            <Terminal size={18} className="text-indigo-400" />
            <div>
              <h4 className="font-display font-bold text-sm text-white">Agent Reasoning Log</h4>
              <p className="text-[10px] text-gray-400 uppercase font-black mt-0.5">Workspace Execution Context</p>
            </div>
          </div>

          {activeAgentState ? (
            <>
              {/* Reasoning Block */}
              <div className="bg-indigo-950/20 border border-indigo-900/40 p-4 rounded-xl space-y-2">
                <h5 className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Brain size={14} /> Agent Reflection & Rationale
                </h5>
                <p className="text-xs text-gray-300 leading-relaxed font-medium">
                  {activeAgentState.reasoning || "Analyzing active metrics in database context..."}
                </p>
              </div>

              {/* Tools Executed Step Log */}
              {activeAgentState.steps && activeAgentState.steps.length > 0 && (
                <div className="space-y-1.5">
                  <h5 className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Executed Database Tools</h5>
                  <div className="bg-black/40 border border-gray-900 rounded-xl p-3 font-mono text-[10px] text-gray-400 space-y-1">
                    {activeAgentState.steps.map((step, sIdx) => (
                      <div key={sIdx} className="flex items-center gap-1 text-indigo-200">
                        <span className="text-indigo-500 font-bold">&gt;</span> {step}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations list */}
              {activeAgentState.recommendations && activeAgentState.recommendations.length > 0 && (
                <div className="space-y-2.5">
                  <h5 className="text-[10px] text-gray-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                    <ListChecks size={13} /> Target Recommendations
                  </h5>
                  <div className="space-y-2.5">
                    {activeAgentState.recommendations.map((rec, rIdx) => (
                      <div key={rIdx} className="p-3 bg-gray-900/40 border border-gray-850 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase tracking-wide text-indigo-400">
                            {rec.type.replace('_', ' ')}
                          </span>
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            rec.priority === 'high' 
                              ? 'bg-rose-950/20 text-rose-400 border border-rose-900/30' 
                              : rec.priority === 'medium'
                              ? 'bg-amber-950/20 text-amber-400 border border-amber-900/30'
                              : 'bg-indigo-950/20 text-indigo-400 border border-indigo-900/30'
                          }`}>
                            {rec.priority} priority
                          </span>
                        </div>
                        <h6 className="text-xs font-bold text-white">{rec.title}</h6>
                        <p className="text-xs text-gray-400 leading-normal">{rec.description}</p>
                        {rec.topic && (
                          <div className="text-[10px] text-indigo-200 font-semibold bg-indigo-950/30 w-fit px-2 py-0.5 rounded border border-indigo-900/20">
                            Topic: {rec.topic}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Study Plan Slots Preview */}
              {activeAgentState.studyPlan && activeAgentState.studyPlan.length > 0 && (
                <div className="space-y-2.5">
                  <h5 className="text-[10px] text-gray-400 uppercase font-black tracking-wider flex items-center gap-1.5">
                    <Calendar size={13} /> Generated Calendar Schedule
                  </h5>
                  <div className="bg-gray-900/20 border border-gray-850 rounded-xl p-3.5 space-y-3 max-h-56 overflow-y-auto">
                    {activeAgentState.studyPlan.map((day: any, dIdx: number) => (
                      <div key={dIdx} className="space-y-2 border-b border-gray-900/50 pb-2.5 last:border-0 last:pb-0">
                        <div className="text-xs font-black text-indigo-400">{day.date}</div>
                        <div className="space-y-1.5">
                          {day.slots.map((slot: any, sIdx: number) => (
                            <div key={sIdx} className="text-xs p-2 bg-black/20 border border-gray-900 rounded-lg flex items-center justify-between gap-1">
                              <div className="overflow-hidden pr-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: slot.color || '#6366f1' }} />
                                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-400">{slot.type}</span>
                                  <span className="font-bold text-white truncate block">{slot.subjectName}</span>
                                </div>
                                <div className="text-[10px] text-gray-500 mt-0.5 truncate">{slot.topic}</div>
                              </div>
                              <span className="text-[9px] font-bold text-indigo-300 bg-indigo-950/30 px-1.5 py-0.5 rounded shrink-0">
                                {slot.duration}m
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-24 flex flex-col items-center justify-center h-full">
              <Bot className="text-gray-700 animate-pulse mb-3" size={48} />
              <h5 className="font-display font-bold text-sm text-gray-300">Wait for Student Commands</h5>
              <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
                Run prompts or click the diagnostic pills in the chat to see real-time agent execution summaries.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
