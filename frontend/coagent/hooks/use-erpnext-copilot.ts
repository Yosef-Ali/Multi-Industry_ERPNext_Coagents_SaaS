'use client';

import { useCopilotAction, useCopilotReadable } from '@copilotkit/react-core';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EventSourceParserStream } from 'eventsource-parser/stream';
import { normalizeIndustry } from '@/lib/types/industry';
import { useDataStream } from '@/components/data-stream-provider';

export interface WorkflowStreamEvent {
  id: string;
  eventName: string;
  payload: unknown;
  raw: string;
  timestamp: number;
}

export interface ErpNextCopilotContext {
  appType: string;
  currentPage: string;
  userRole?: string;
  appData?: unknown;
}

export interface StartWorkflowParams {
  prompt: string;
  visibility?: 'private' | 'team' | 'public';
  graphName?: string;
  initialState?: Record<string, unknown>;
}

export interface ApproveStepParams {
  workflowId: string;
  stepId: string;
  notes?: string;
}

export interface RejectStepParams {
  workflowId: string;
  stepId: string;
  reason?: string;
}

export interface ProvideEditParams {
  workflowId: string;
  stepId: string;
  patch: Record<string, unknown>;
}

export interface UseErpNextCopilotResult {
  startWorkflow: (params: StartWorkflowParams) => Promise<string>;
  stopWorkflow: () => void;
  isWorkflowStreaming: boolean;
  workflowEvents: WorkflowStreamEvent[];
  workflowError: Error | null;
}

export function useErpNextCopilot(context: ErpNextCopilotContext): UseErpNextCopilotResult {
  const { setDataStream } = useDataStream();
  const [events, setEvents] = useState<WorkflowStreamEvent[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const gatewayBase = process.env.NEXT_PUBLIC_GATEWAY_URL;
  const aguiEndpoint = useMemo(() => {
    if (gatewayBase && gatewayBase.length > 0) {
      return `${gatewayBase.replace(/\/+$/, '')}/agui`;
    }
    return '/api/ag-ui';
  }, [gatewayBase]);

  const defaultGraphName = useMemo(() => {
    const normalized = normalizeIndustry(context.appType) ?? context.appType;
    const mapping: Record<string, string> = {
      hotel: 'hotel_o2c',
      hospital: 'hospital_admissions',
      manufacturing: 'manufacturing_production',
      retail: 'retail_fulfillment',
      education: 'education_admissions',
    };
    return mapping[normalized] ?? 'hotel_o2c';
  }, [context.appType]);

  const pushEvent = useCallback(
    (eventName: string, payload: unknown) => {
      const record: WorkflowStreamEvent = {
        id: `${eventName}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        eventName,
        payload,
        raw: JSON.stringify(payload ?? null),
        timestamp: Date.now(),
      };
      setEvents((prev) => [...prev, record]);
      setDataStream((prev) => [
        ...prev,
        {
          type: 'data-workflowEvent',
          data: {
            eventName,
            payload,
          },
        } as any,
      ]);
    },
    [setDataStream]
  );

  const stopWorkflow = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const startWorkflow = useCallback(
    async ({ prompt, graphName, initialState }: StartWorkflowParams) => {
      const workflowId = crypto.randomUUID();
      const resolvedGraph = graphName?.length ? graphName : defaultGraphName;

      stopWorkflow();
      setEvents([]);
      setStreamError(null);
      setIsStreaming(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const body = {
        graph_name: resolvedGraph,
        initial_state: {
          thread_id: workflowId,
          prompt,
          app_context: {
            appType: context.appType,
            currentPage: context.currentPage,
            userRole: context.userRole ?? 'user',
            appData: context.appData ?? {},
          },
          visibility: initialState?.visibility ?? null,
          ...initialState,
        },
      };

      const run = async () => {
        try {
          pushEvent('workflow_initialized', {
            workflowId,
            graph: resolvedGraph,
            prompt,
          });

          const response = await fetch(aguiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'text/event-stream',
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          if (!response.ok || !response.body) {
            const text = await response.text().catch(() => '');
            throw new Error(
              `Workflow stream error (${response.status}): ${text || response.statusText}`
            );
          }

          const stream = response.body
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new EventSourceParserStream());

          for await (const evt of stream) {
            if (evt.type !== 'event') continue;
            const eventName = evt.event || 'message';
            let payload: unknown = evt.data;
            if (evt.data) {
              try {
                payload = JSON.parse(evt.data);
              } catch {
                payload = evt.data;
              }
            }

            pushEvent(eventName, payload);

            if (eventName === 'workflow_complete' || eventName === 'workflow_error') {
              break;
            }
          }
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            pushEvent('workflow_aborted', { workflowId });
            return;
          }
          const err = error as Error;
          setStreamError(err);
          pushEvent('workflow_error', { message: err.message });
        } finally {
          setIsStreaming(false);
          abortControllerRef.current = null;
        }
      };

      run().catch((err) => {
        console.error('[Copilot] workflow stream failed', err);
      });

      return workflowId;
    },
    [aguiEndpoint, context.appData, context.appType, context.currentPage, context.userRole, defaultGraphName, pushEvent, stopWorkflow]
  );

  useCopilotReadable({
    description: 'ERPNext app context (page, role, data)',
    value: {
      appType: context.appType,
      currentPage: context.currentPage,
      userRole: context.userRole ?? 'user',
      appData: context.appData ?? {},
    },
  });

  useCopilotAction<StartWorkflowParams>({
    name: 'start_workflow',
    description:
      'Start an ERPNext copilot workflow from a short prompt (no code). Returns tracking info.',
    parameters: [
      { name: 'prompt', type: 'string', description: 'Short task description' },
      {
        name: 'visibility',
        type: 'string',
        description: 'Message visibility scope',
        required: false,
      },
      {
        name: 'graphName',
        type: 'string',
        description: 'Workflow graph name (optional)',
        required: false,
      },
    ],
    handler: async ({ prompt, visibility, graphName, initialState }) => {
      const workflowId = await startWorkflow({
        prompt,
        visibility,
        graphName,
        initialState,
      }).catch((error) => {
        setStreamError(error as Error);
        throw error;
      });

      return { ok: true, workflowId, accepted: true };
    },
  });

  useCopilotAction<ApproveStepParams>({
    name: 'approve_step',
    description: 'Approve the current human-in-the-loop step.',
    parameters: [
      { name: 'workflowId', type: 'string', description: 'Workflow id' },
      { name: 'stepId', type: 'string', description: 'Step id' },
      { name: 'notes', type: 'string', required: false },
    ],
    handler: async ({ workflowId, stepId, notes }) => {
      console.info('[Copilot] approve_step called', { workflowId, stepId, notes });
      return { ok: true };
    },
  });

  useCopilotAction<RejectStepParams>({
    name: 'reject_step',
    description: 'Reject the current human-in-the-loop step.',
    parameters: [
      { name: 'workflowId', type: 'string', description: 'Workflow id' },
      { name: 'stepId', type: 'string', description: 'Step id' },
      { name: 'reason', type: 'string', required: false },
    ],
    handler: async ({ workflowId, stepId, reason }) => {
      console.info('[Copilot] reject_step called', { workflowId, stepId, reason });
      return { ok: true };
    },
  });

  useCopilotAction<ProvideEditParams>({
    name: 'provide_edit',
    description: 'Provide an edit/patch for the current step artifact.',
    parameters: [
      { name: 'workflowId', type: 'string', description: 'Workflow id' },
      { name: 'stepId', type: 'string', description: 'Step id' },
      { name: 'patch', type: 'object', description: 'Partial changes' },
    ],
    handler: async ({ workflowId, stepId, patch }) => {
      console.info(EOF
        '[Copilot] provide_edit called',
        { workflowId, stepId, patch }
      );
      return { ok: true };
    },
  });

  useEffect(() => {
    console.debug('[Copilot] ERPNext hook initialized', context);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => stopWorkflow(), [stopWorkflow]);

  return {
    startWorkflow,
    stopWorkflow,
    isWorkflowStreaming: isStreaming,
    workflowEvents: events,
    workflowError: streamError,
  };
}
