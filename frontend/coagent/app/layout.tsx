'use client';

import './globals.css';
import { CopilotKit } from '@copilotkit/react-core';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <CopilotKit 
          runtimeUrl="/api/copilot/runtime"
          agent="erpnext_coagent"
        >
          {children}
        </CopilotKit>
      </body>
    </html>
  )
}
