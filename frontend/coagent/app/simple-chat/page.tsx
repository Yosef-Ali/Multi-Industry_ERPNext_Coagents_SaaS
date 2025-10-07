'use client';

import { useEffect, useState } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotChat } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

export default function SimpleChatPage() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-800">
          ERPNext AI Coagent
        </h1>
        <p className="text-sm text-gray-600">
          Powered by zhipu-ai/glm-4-6b via OpenRouter
        </p>
      </div>
      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        {isMounted ? (
          <CopilotKit runtimeUrl="/api/copilot/developer">
            <div className="h-full flex items-center justify-center p-4">
              <div className="w-full max-w-4xl h-full">
                <CopilotChat
                  labels={{
                    title: "ERPNext AI Assistant",
                    initial:
                      "Hello! I can help you build ERPNext modules. Try asking me to create a hotel reservation system, student enrollment module, or hospital admissions workflow!",
                  }}
                />
              </div>
            </div>
          </CopilotKit>
        ) : (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-sm text-gray-500">Loading chat interface...</div>
          </div>
        )}
      </div>
    </div>
  );
}
