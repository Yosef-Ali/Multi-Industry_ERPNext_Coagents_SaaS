'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAGUIStream } from '@/hooks/use-ag-ui-stream';

export default function AGUIGatewayTestPage() {
  const gateway = process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL || 'http://localhost:3001';
  const endpoint = `${gateway}/agui`;
  const { state, isStreaming, sendMessage, error, stop, reset } = useAGUIStream({
    endpoint,
  });
  const [input, setInput] = useState('Build a manufacturing BOM explosion tool');

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-4 text-xl font-semibold">AG-UI Gateway Test</h1>
      <div className="mb-4 text-sm text-muted-foreground">Endpoint: {endpoint}</div>

      <div className="mb-4 flex gap-2">
        <input
          className="flex-1 rounded-md border px-3 py-2"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <Button onClick={() => sendMessage(input)} disabled={isStreaming}>
          {isStreaming ? 'Streaming…' : 'Send'}
        </Button>
        <Button variant="outline" onClick={stop} disabled={!isStreaming}>
          Stop
        </Button>
        <Button variant="ghost" onClick={reset}>
          Reset
        </Button>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <div className="space-y-3">
        {state.messages.map((m, i) => (
          <div key={i} className="rounded-md border p-3">
            <div className="mb-1 text-xs text-muted-foreground">{m.role}</div>
            <div className="whitespace-pre-wrap text-sm">{m.content}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

