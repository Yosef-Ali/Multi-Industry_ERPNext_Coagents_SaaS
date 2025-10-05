# ERPNext Copilot Architecture - Complete Flow

## System Architecture

```mermaid
graph TB
    subgraph "Frontend (Next.js + CopilotKit)"
        User[User] -->|Prompt| CopilotPanel[CopilotKit Panel]
        CopilotPanel -->|start_workflow| CopilotHook[useErpNextCopilot Hook]
        CopilotPanel -->|approve_step| CopilotHook
        CopilotPanel -->|reject_step| CopilotHook
        CopilotPanel -->|provide_edit| CopilotHook
        CopilotHook -->|SSE Events| WorkflowPanel[WorkflowStreamPanel]
        WorkflowPanel -->|Render| ArtifactRenderer[Artifact Renderers]

        subgraph "Artifact Renderers"
            SpecViewer[SpecViewer]
            DiffViewer[DiffViewer]
            SchemaPlanViewer[SchemaPlanViewer]
            SampleOutputViewer[SampleOutputViewer]
        end
    end

    subgraph "Agent Gateway (Cloudflare Worker)"
        CopilotHook -->|POST /agui| Gateway[Gateway Worker]
        CopilotHook -->|POST /approve| Gateway
        CopilotHook -->|POST /reject| Gateway
        CopilotHook -->|POST /edit| Gateway
        Gateway -->|SSE Stream| CopilotHook
    end

    subgraph "Workflow Service (LangGraph)"
        Gateway -->|POST /execute| WorkflowEngine[LangGraph Workflow]
        Gateway -->|POST /approve| WorkflowEngine
        Gateway -->|POST /reject| WorkflowEngine
        Gateway -->|POST /edit| WorkflowEngine

        WorkflowEngine -->|Stream Events| Gateway

        subgraph "10-Step Workflow"
            Step1[1. Intent Analysis] -->|HITL| Step2[2. Spec Generation]
            Step2 -->|HITL| Step3[3. Schema Planning]
            Step3 -->|HITL| Step4[4. Code Generation]
            Step4 -->|HITL| Step5[5. Testing]
            Step5 -->|HITL| Step6[6. Sample Data]
            Step6 -->|HITL| Step7[7. DocType Package]
            Step7 -->|HITL| Step8[8. ERPNext Deploy]
            Step8 -->|HITL| Step9[9. Validation]
            Step9 -->|HITL| Step10[10. Completion]
        end

        WorkflowEngine -->|API Calls| ERPNext[ERPNext API]
        WorkflowEngine -->|LLM Calls| LLM[OpenRouter LLM]
    end

    style CopilotPanel fill:#e1f5fe
    style WorkflowPanel fill:#e1f5fe
    style Gateway fill:#fff3e0
    style WorkflowEngine fill:#f3e5f5
    style ERPNext fill:#e8f5e9
```

## Event Flow Diagram

```mermaid
sequenceDiagram
    participant User
    participant CopilotKit
    participant Gateway
    participant Workflow
    participant ERPNext

    User->>CopilotKit: Enter prompt
    CopilotKit->>Gateway: POST /agui {graph_name, initial_state}
    Gateway->>Workflow: POST /execute (SSE)

    Note over Workflow: Step 1: Intent Analysis
    Workflow-->>Gateway: event: workflow_initialized
    Gateway-->>CopilotKit: SSE: workflow_initialized

    Workflow->>ERPNext: GET schema info
    ERPNext-->>Workflow: DocType schemas

    Workflow-->>Gateway: event: spec_generated<br/>{artifact_type: 'spec', content: {...}}
    Gateway-->>CopilotKit: SSE: spec_generated
    CopilotKit->>CopilotKit: Render SpecViewer

    Note over Workflow: HITL Interrupt (waiting for approval)
    Workflow-->>Gateway: event: hitl_required<br/>{workflowId, stepId, artifact}
    Gateway-->>CopilotKit: SSE: hitl_required

    User->>CopilotKit: Click "Approve"
    CopilotKit->>Gateway: POST /approve {workflowId, stepId}
    Gateway->>Workflow: POST /approve
    Workflow-->>Gateway: event: step_approved
    Gateway-->>CopilotKit: SSE: step_approved

    Note over Workflow: Step 3: Schema Planning
    Workflow-->>Gateway: event: schema_plan_ready<br/>{artifact_type: 'schema_plan', changes: [...]}
    Gateway-->>CopilotKit: SSE: schema_plan_ready
    CopilotKit->>CopilotKit: Render SchemaPlanViewer

    Note over Workflow: HITL Interrupt
    User->>CopilotKit: Click "Provide Edit"
    CopilotKit->>Gateway: POST /edit {workflowId, stepId, patch}
    Gateway->>Workflow: POST /edit

    Note over Workflow: Step 4: Code Generation
    Workflow-->>Gateway: event: diff_ready<br/>{artifact_type: 'diff', files: [...]}
    Gateway-->>CopilotKit: SSE: diff_ready
    CopilotKit->>CopilotKit: Render DiffViewer

    Note over Workflow: Continue through steps 5-10

    Workflow->>ERPNext: POST new DocType
    ERPNext-->>Workflow: DocType created

    Workflow-->>Gateway: event: workflow_complete
    Gateway-->>CopilotKit: SSE: workflow_complete
    CopilotKit->>User: Show completion
```

## State Checkpointing Flow

```mermaid
graph LR
    subgraph "LangGraph State Management"
        State1[State: spec_generated] -->|User Approval| State2[State: schema_planned]
        State2 -->|User Edit| State2b[State: schema_revised]
        State2b -->|User Approval| State3[State: code_generated]
        State3 -->|User Approval| State4[State: deployed]

        State1 -.->|Store to DB| Checkpoint1[(Checkpoint 1)]
        State2 -.->|Store to DB| Checkpoint2[(Checkpoint 2)]
        State2b -.->|Store to DB| Checkpoint2b[(Checkpoint 2b)]
        State3 -.->|Store to DB| Checkpoint3[(Checkpoint 3)]
        State4 -.->|Store to DB| Checkpoint4[(Checkpoint 4)]
    end

    Checkpoint1 -.->|Resume from| State1
    Checkpoint2 -.->|Resume from| State2
    Checkpoint2b -.->|Resume from| State2b
    Checkpoint3 -.->|Resume from| State3
    Checkpoint4 -.->|Resume from| State4
```

## HITL (Human-in-the-Loop) Interaction Flow

```mermaid
stateDiagram-v2
    [*] --> Running: Start Workflow
    Running --> Interrupted: Emit HITL Event
    Interrupted --> WaitingApproval: Show Artifact

    WaitingApproval --> Approved: User Approves
    WaitingApproval --> Rejected: User Rejects
    WaitingApproval --> Edited: User Provides Edit

    Approved --> Running: Resume with Approval
    Rejected --> Running: Resume with Rejection<br/>(retry or skip)
    Edited --> Running: Resume with Edited Data

    Running --> Interrupted: Next HITL Step
    Running --> [*]: Workflow Complete
```

## Artifact Types and Renderers

```mermaid
graph TD
    WorkflowEvent[Workflow SSE Event] -->|Check artifact_type| Router{Artifact Type?}

    Router -->|spec| SpecViewer[SpecViewer Component]
    Router -->|diff| DiffViewer[DiffViewer Component]
    Router -->|schema_plan| SchemaPlanViewer[SchemaPlanViewer Component]
    Router -->|sample_output| SampleOutputViewer[SampleOutputViewer Component]
    Router -->|unknown| RawViewer[Raw JSON Viewer]

    SpecViewer --> Actions1[Approve/Reject Buttons]
    DiffViewer --> Actions2[Approve/Reject + Lint Issues]
    SchemaPlanViewer --> Actions3[Approve/Reject + Impact Analysis]
    SampleOutputViewer --> Actions4[Validate/Regenerate + Test Cases]
```

## Key Components

### Frontend (Next.js + CopilotKit)
- **CopilotKit Panel**: Main UI for user interaction
- **useErpNextCopilot Hook**: Manages workflow state and SSE streaming
- **WorkflowStreamPanel**: Displays real-time workflow events
- **Artifact Renderers**: Domain-specific UI for each artifact type

### Agent Gateway (Cloudflare Worker)
- **POST /agui**: Initiates workflow and proxies SSE stream
- **POST /approve**: Forwards approval to workflow service
- **POST /reject**: Forwards rejection to workflow service
- **POST /edit**: Forwards edit/patch to workflow service
- **SSE Streaming**: Pipes events from workflow service to frontend

### Workflow Service (LangGraph)
- **LangGraph State Machine**: 10-step workflow with HITL interrupts
- **State Checkpointing**: Persists state to DB for resume capability
- **Artifact Generation**: Creates domain-specific artifacts at each step
- **ERPNext Integration**: API calls for schema inspection and deployment

### ERPNext API
- **Schema Inspection**: GET /api/resource/:doctype
- **DocType Creation**: POST /api/resource/DocType
- **Data Operations**: CRUD operations on custom DocTypes

## Event Types

### Workflow Events
- `workflow_initialized`: Workflow started
- `workflow_complete`: Workflow finished successfully
- `workflow_error`: Error occurred
- `workflow_aborted`: User cancelled workflow

### Step Events
- `spec_generated`: Design specification created (artifact)
- `schema_plan_ready`: Schema changes planned (artifact)
- `diff_ready`: Code diff generated (artifact)
- `sample_output_generated`: Sample data created (artifact)

### HITL Events
- `hitl_required`: Workflow paused for user input
- `step_approved`: User approved current step
- `step_rejected`: User rejected current step
- `edit_provided`: User provided edits to artifact

## Technology Stack

### Frontend
- **Next.js 14**: React framework with App Router
- **CopilotKit**: AI copilot framework
- **EventSource API**: SSE streaming client
- **Tailwind CSS**: Styling

### Backend
- **Cloudflare Workers**: Serverless edge runtime
- **LangGraph**: Workflow orchestration
- **Python FastAPI**: Workflow service (assumed)
- **PostgreSQL**: State checkpointing (LangGraph)

### External Services
- **OpenRouter**: LLM API
- **ERPNext**: Target deployment platform
