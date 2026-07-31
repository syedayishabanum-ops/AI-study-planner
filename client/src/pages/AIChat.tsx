import React from 'react';
import { AIChatAssistant } from '../components/chat/AIChatAssistant';

export const AIChat: React.FC = () => {
  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="border-b border-gray-800/10 pb-4">
        <h1 className="font-display font-extrabold text-3xl text-white tracking-tight">AI Chat Assistant</h1>
        <p className="text-sm text-gray-400 mt-1">
          Chat with Aegis to explain difficult subjects, generate quizzes, outline plans, or get motivation.
        </p>
      </div>

      {/* Main chat window container */}
      <div className="w-full flex justify-center">
        <AIChatAssistant />
      </div>
    </div>
  );
};
