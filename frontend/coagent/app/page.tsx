"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

/**
 * Simple ERPNext Coagent Chat Interface
 * Using CopilotKit with Next.js API route
 */
export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <CopilotSidebar
        labels={{
          title: "ERPNext CoAgent",
          initial: "Hi! I'm your ERPNext assistant. How can I help you today?",
        }}
      >
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
          <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
            <h1 className="text-4xl font-bold text-center mb-4">
              ERPNext CoAgent Assistant
            </h1>
            <p className="text-center text-gray-600">
              Ask me about guests, rooms, orders, or any ERPNext operations!
            </p>
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">Try asking:</h2>
              <ul className="space-y-2 text-gray-700">
                <li>• "Check in guest John Doe for room 101"</li>
                <li>• "Show me available rooms"</li>
                <li>• "Create a sales order"</li>
                <li>• "What's the occupancy rate?"</li>
              </ul>
            </div>
          </div>
        </main>
      </CopilotSidebar>
    </CopilotKit>
  );
}
