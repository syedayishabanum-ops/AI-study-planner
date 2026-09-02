import React, { useState } from 'react';
import { AIChatAssistant } from '../components/chat/AIChatAssistant';
import { AIAgentInterface } from '../components/chat/AIAgentInterface';
import { MessageSquare, Brain } from 'lucide-react';

export const AIChat: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tutor' | 'agent'>('agent'); // Default to the brand new agent!

  return (
    <div className="space-y-6 pb-12">
      {/* Header with Tabs */}
      <div className="border-b border-gray-800/10 pb-4 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">AI Academic Center</h1>
          <p className="text-sm text-gray-400 mt-1">
            {activeTab === 'tutor' 
              ? 'Chat with Aegis to explain concepts, suggest methods, or solve quick quizzes.'
              : 'Interact with the autonomous AI agent to read records, diagnose weaknesses, and schedule classes.'}
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-gray-950/60 p-1 rounded-xl border border-gray-850 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('tutor')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'tutor'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <MessageSquare size={14} /> AI Tutor Chat
          </button>
          <button
            onClick={() => setActiveTab('agent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              activeTab === 'agent'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Brain size={14} /> AI Study Agent
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full flex justify-center">
        {activeTab === 'tutor' ? <AIChatAssistant /> : <AIAgentInterface />}
      </div>
    </div>
  );
};

