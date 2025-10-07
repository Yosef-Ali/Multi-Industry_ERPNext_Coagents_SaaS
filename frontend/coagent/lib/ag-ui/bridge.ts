/**
 * AG-UI to DataStreamProvider Bridge
 * Maps AG-UI events (tool_result, ui_state_update) to CopilotKit DataStream format
 * Enables artifacts and shared state to render in chat UI
 */

import type { AGUIEvent } from '@/lib/ag-ui/types';
import type { DataStreamWriter } from 'ai';

export interface AGUIBridgeOptions {
    dataStream: DataStreamWriter;
    onArtifact?: (artifact: any) => void;
    onStateUpdate?: (state: any) => void;
}

/**
 * Bridge AG-UI events to DataStreamProvider
 * Call this for each AG-UI event received from the gateway
 */
export function bridgeAGUIEvent(event: AGUIEvent, options: AGUIBridgeOptions): void {
    const { dataStream, onArtifact, onStateUpdate } = options;

    switch (event.type) {
        case 'tool_result': {
            // Check if tool result contains artifact data
            const result = (event as any).data?.result;

            if (result && typeof result === 'object') {
                // Check for artifact markers
                if (result.artifact_type || result.ui_component || result.render_as) {
                    // This is an artifact - emit to DataStream
                    const artifact = {
                        type: result.artifact_type || 'generic',
                        data: result.data || result,
                        metadata: {
                            tool_name: (event as any).data?.tool_name,
                            tool_call_id: (event as any).data?.tool_call_id,
                            timestamp: Date.now(),
                        },
                    };

                    dataStream.writeData({
                        type: 'artifact',
                        content: artifact,
                    });

                    onArtifact?.(artifact);
                }

                // Check for state updates
                if (result.shared_state || result.state_update) {
                    const stateUpdate = result.shared_state || result.state_update;

                    dataStream.writeData({
                        type: 'ui_state_update',
                        content: stateUpdate,
                    });

                    onStateUpdate?.(stateUpdate);
                }
            }
            break;
        }

        case 'ui_state_update': {
            // Direct state update event
            const stateData = (event as any).data;

            dataStream.writeData({
                type: 'ui_state_update',
                content: stateData,
            });

            onStateUpdate?.(stateData);
            break;
        }

        case 'ui_response': {
            // UI component response (could contain artifacts)
            const uiData = (event as any).data;

            if (uiData.artifact || uiData.component) {
                const artifact = {
                    type: uiData.type || 'ui_component',
                    data: uiData.artifact || uiData.component,
                    metadata: {
                        ui_id: uiData.ui_id,
                        timestamp: Date.now(),
                    },
                };

                dataStream.writeData({
                    type: 'artifact',
                    content: artifact,
                });

                onArtifact?.(artifact);
            }
            break;
        }

        // Pass through other events as-is
        default:
            break;
    }
}

/**
 * Create a bridged event handler for AG-UI streams
 */
export function createBridgedAGUIHandler(options: AGUIBridgeOptions) {
    return (event: AGUIEvent) => {
        bridgeAGUIEvent(event, options);
    };
}
