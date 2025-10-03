"use client";

import { CopilotKit } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { ERPNextActions } from "../src/components/ERPNextActions";

/**
 * ERPNext Coagent Chat Interface
 * Connected to LangGraph Workflow Service
 */
export default function Home() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <ERPNextActions />
      <CopilotSidebar
        labels={{
          title: "ERPNext CoAgent",
          initial: "Hi! I'm your ERPNext assistant. I can help you with hotel check-ins, sales orders, and more. What would you like to do?",
        }}
      >
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
          <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
            <h1 className="text-4xl font-bold text-center mb-4">
              ERPNext CoAgent Assistant
            </h1>
            <p className="text-center text-gray-600 mb-4">
              Connected to LangGraph Workflow Service 🔗
            </p>
            <div className="mt-8 p-6 bg-gray-50 rounded-lg">
              <h2 className="text-xl font-semibold mb-4">🏨 Try these workflows:</h2>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Hotel:</strong> "Check in John Doe to room 101 from 2024-10-10 to 2024-10-15 with reservation RES-001"</li>
                <li><strong>Retail:</strong> "Create a sales order for customer CUST-001 (Jane Smith) with item ITEM-001 qty 5, deliver on 2024-10-15 from Main Warehouse"</li>
                <li><strong>List:</strong> "Show me all available hotel workflows"</li>
              </ul>
            </div>
            <div className="mt-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
              <p className="text-sm text-blue-800">
                <strong>💡 Backend Status:</strong> Connected to workflow service at{" "}
                <code className="bg-blue-100 px-1 rounded">erpnext-workflows.onrender.com</code>
              </p>
            </div>
          </div>
        </main>
      </CopilotSidebar>
    </CopilotKit>
  );
}
