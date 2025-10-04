'use client';

/**
 * AG-UI Protocol Test Page
 * Demonstrates the AG-UI protocol implementation
 */

import { useState } from 'react';
import { useAGUIStream } from '@/hooks/use-ag-ui-stream';
import { useAGUIState } from '@/hooks/use-ag-ui-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function AGUITestPage() {
  const [inputMessage, setInputMessage] = useState('');

  // AG-UI streaming hook
  const { state, sendMessage, isStreaming, error } = useAGUIStream({
    endpoint: '/api/ag-ui',
    onStateChange: (newState) => {
      console.log('AG-UI State updated:', newState);
    },
  });

  // AG-UI shared state hook
  const {
    state: sharedState,
    patchState,
    appendState,
    getDeltas,
  } = useAGUIState({
    initialState: {
      count: 0,
      items: [],
      userPreferences: {},
    },
    onStateChange: (newState) => {
      console.log('Shared state updated:', newState);
    },
  });

  const handleSend = async () => {
    if (!inputMessage.trim() || isStreaming) return;

    await sendMessage(inputMessage, {
      page: 'ag-ui-test',
      sharedState,
    });

    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-8">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>AG-UI Protocol Test</CardTitle>
            <CardDescription>
              Testing Agent-User Interaction Protocol with streaming events and shared state
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Status Indicators */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Agent State</p>
                <p className="text-2xl font-bold capitalize">{state.agentState}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Messages</p>
                <p className="text-2xl font-bold">{state.messages.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Tool Calls</p>
                <p className="text-2xl font-bold">{state.toolCalls.length}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <Card>
          <CardHeader>
            <CardTitle>AG-UI Chat</CardTitle>
            <CardDescription>
              Send messages and receive streaming responses via AG-UI protocol
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Messages */}
            <div className="space-y-4 rounded-lg border p-4 max-h-96 overflow-y-auto">
              {state.messages.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm">
                  No messages yet. Send a message to start!
                </p>
              ) : (
                state.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-xs font-semibold mb-1 capitalize">{message.role}</p>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="rounded-lg bg-destructive/10 border border-destructive p-4">
                <p className="text-sm text-destructive">
                  <strong>Error:</strong> {error.message}
                </p>
              </div>
            )}

            {/* Input */}
            <div className="flex gap-2">
              <Input
                placeholder="Send a message to test AG-UI streaming..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isStreaming}
                className="flex-1"
              />
              <Button onClick={handleSend} disabled={isStreaming || !inputMessage.trim()}>
                {isStreaming ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Shared State Testing */}
        <Card>
          <CardHeader>
            <CardTitle>Shared State (Bi-directional Sync)</CardTitle>
            <CardDescription>
              Test AG-UI's STATE_DELTA events for real-time state synchronization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* State Display */}
            <div className="rounded-lg bg-muted p-4">
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(sharedState, null, 2)}
              </pre>
            </div>

            {/* State Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => patchState(['count'], sharedState.count + 1)}
              >
                Increment Count
              </Button>
              <Button
                variant="outline"
                onClick={() => appendState(['items'], `Item ${sharedState.items.length + 1}`)}
              >
                Add Item
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  const deltas = getDeltas();
                  console.log('State deltas:', deltas);
                  alert(`${deltas.length} deltas recorded. Check console.`);
                }}
              >
                Show Deltas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tool Calls */}
        {state.toolCalls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Tool Calls</CardTitle>
              <CardDescription>
                AG-UI TOOL_CALL events from the agent
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {state.toolCalls.map((toolCall) => (
                  <div
                    key={toolCall.id}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{toolCall.name}</p>
                      <span
                        className={`text-xs px-2 py-1 rounded ${
                          toolCall.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : toolCall.status === 'error'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {toolCall.status}
                      </span>
                    </div>
                    <details className="text-xs">
                      <summary className="cursor-pointer">Arguments</summary>
                      <pre className="mt-2 bg-muted p-2 rounded overflow-x-auto">
                        {JSON.stringify(toolCall.args, null, 2)}
                      </pre>
                    </details>
                    {toolCall.result && (
                      <details className="text-xs">
                        <summary className="cursor-pointer">Result</summary>
                        <pre className="mt-2 bg-muted p-2 rounded overflow-x-auto">
                          {JSON.stringify(toolCall.result, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Documentation */}
        <Card>
          <CardHeader>
            <CardTitle>About AG-UI Protocol</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm text-muted-foreground">
              This page demonstrates the AG-UI (Agent-User Interaction) protocol implementation:
            </p>
            <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
              <li>
                <strong>Event Streaming:</strong> Real-time Server-Sent Events (SSE) from agent to UI
              </li>
              <li>
                <strong>Message Events:</strong> TEXT_MESSAGE_START, TEXT_MESSAGE_CONTENT, TEXT_MESSAGE_END
              </li>
              <li>
                <strong>Tool Events:</strong> TOOL_CALL_START, TOOL_CALL_RESULT
              </li>
              <li>
                <strong>State Events:</strong> STATE_DELTA for bi-directional state synchronization
              </li>
              <li>
                <strong>Agent State:</strong> Track agent lifecycle (idle, thinking, working, done)
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
