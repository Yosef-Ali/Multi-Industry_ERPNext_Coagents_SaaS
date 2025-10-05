# Co-Agent Mode System

## Overview

The Co-Agent Mode System enables v0-style multi-variant generation for AI-powered development assistance. Instead of generating a single response, the system can generate 3 distinct solution variants, each optimized for different use cases, trade-offs, and approaches.

## Features

✅ **Multiple Operating Modes**
- **Chat Mode**: Standard conversational AI (single response)
- **Developer Mode**: v0-style multi-variant generation (3 variants)
- **Analyzer Mode**: Deep analysis with visualizations (planned)
- **Refiner Mode**: Iterative artifact refinement (planned)

✅ **Rich Artifact System**
- Support for 10+ artifact types (React, Python, SQL, Mermaid, etc.)
- Automatic language detection and syntax highlighting
- Version tracking and parent-child relationships
- Metadata (tags, dependencies, differentiators)

✅ **Intelligent Variant Generation**
- Strategy-based variant creation (minimalist, feature-rich, modular)
- Automatic comparison summaries
- Key differentiators highlighted for each variant
- Follow-up question suggestions

✅ **Universal Provider Support**
- Works with any IAIProvider (OpenRouter, Cloudflare, etc.)
- Automatic content format conversion
- Token usage tracking with cost estimation

## Architecture

### Type System (`types.ts`)

Defines core types for the co-agent system:

```typescript
// Operating modes
enum CoAgentMode {
  CHAT = 'chat',
  DEVELOPER = 'developer',
  ANALYZER = 'analyzer',
  REFINER = 'refiner',
}

// Artifact types
enum ArtifactType {
  CODE = 'code',
  REACT_COMPONENT = 'react_component',
  PYTHON = 'python',
  // ... 10+ types
}

// Complete response with variants
interface CoAgentResponse {
  mode: CoAgentMode;
  explanation: string;
  artifacts: Artifact[];
  followUpQuestions?: string[];
  comparisonSummary?: string;
  usage?: TokenUsage;
}
```

### Base Class (`base.ts`)

Abstract base class providing common functionality:

- **Artifact Management**: Create, validate, manage artifacts
- **Content Parsing**: Extract code blocks and artifacts from AI responses
- **Variant Parsing**: Parse multi-variant responses with metadata
- **Language Inference**: Automatic language detection
- **Token Estimation**: Calculate token usage

Key methods:
```typescript
abstract class BaseCoAgent {
  // Must be implemented by subclasses
  abstract generateResponse(request: VariantGenerationRequest): Promise<CoAgentResponse>;
  abstract refineArtifact(request: RefinementRequest): Promise<Artifact>;
  
  // Utilities provided to all subclasses
  protected createArtifact(...): Artifact;
  protected parseVariantResponse(...): Artifact[];
  protected extractArtifactsFromResponse(...): Array<{...}>;
  protected contentToString(content: MessageContent[]): string;
}
```

### Mode Implementations (`modes.ts`)

Concrete implementations for each mode:

#### 1. ChatCoAgent
Standard conversational mode:
- Generates single response
- Includes explanation and follow-up questions
- Simplest mode for quick interactions

```typescript
const coagent = new ChatCoAgent(provider);
const response = await coagent.generateResponse({
  prompt: 'Create a function to calculate Fibonacci',
  artifactType: ArtifactType.CODE,
});
// Returns: 1 artifact
```

#### 2. DeveloperCoAgent
v0-style multi-variant generation:
- Generates 3 distinct variants
- Each variant has different approach/strategy
- Includes comparison summary
- Highlights key differentiators

```typescript
const coagent = new DeveloperCoAgent(provider);
const response = await coagent.generateResponse({
  prompt: 'Create a React todo list component',
  artifactType: ArtifactType.REACT_COMPONENT,
  preferences: ['TypeScript', 'Hooks', 'Tailwind'],
});
// Returns: 3 artifacts with different approaches
```

**Variant Strategies** (auto-generated based on artifact type):

For React components:
1. **Minimalist**: Simple, performant, minimal dependencies
2. **Feature-Rich**: Comprehensive features, accessibility, UX
3. **Modular**: Reusable, composable, flexible

For Python scripts:
1. **Procedural**: Straightforward, easy to read, beginner-friendly
2. **Object-Oriented**: Encapsulation, reusability, maintainable
3. **Functional**: Pure functions, immutability, composable

#### 3. AnalyzerCoAgent
Deep analysis mode (planned):
- Analyzes code/systems
- Generates visualizations (Mermaid diagrams)
- Provides insights and recommendations

#### 4. RefinerCoAgent
Iterative refinement mode (planned):
- Takes existing artifact
- Applies refinement instructions
- Tracks version history

## Usage Examples

### Example 1: Generate React Component with 3 Variants

```typescript
import { getGlobalProvider } from '../ai/universal-provider';
import { DeveloperCoAgent, ArtifactType } from './';

// Get AI provider
const provider = await getGlobalProvider();

// Create developer co-agent
const coagent = new DeveloperCoAgent(provider);

// Generate 3 variants
const response = await coagent.generateResponse({
  prompt: 'Create a React component for a user profile card with avatar, name, bio, and social links',
  artifactType: ArtifactType.REACT_COMPONENT,
  preferences: ['TypeScript', 'Tailwind CSS', 'Responsive'],
  constraints: ['Must work with Next.js 15', 'Accessible (WCAG AA)'],
});

// Access variants
console.log(`Generated ${response.artifacts.length} variants`);

response.artifacts.forEach((artifact, i) => {
  console.log(`\n--- Variant ${artifact.variantNumber}: ${artifact.title} ---`);
  console.log(`Description: ${artifact.description}`);
  console.log(`Key features:`);
  artifact.differentiators?.forEach(d => console.log(`  - ${d}`));
  console.log(`\nCode (${artifact.content.length} chars):`);
  // artifact.content contains the actual code
});

// View comparison
console.log(`\n--- Comparison ---`);
console.log(response.comparisonSummary);

// Follow-up questions
console.log(`\n--- Suggested Next Steps ---`);
response.followUpQuestions?.forEach(q => console.log(`  - ${q}`));

// Token usage
if (response.usage) {
  console.log(`\nTokens used: ${response.usage.totalTokens}`);
  console.log(`Cost: $${response.usage.cost?.toFixed(4) || 'N/A'}`);
}
```

### Example 2: Simple Chat Mode

```typescript
import { ChatCoAgent, ArtifactType } from './';

const coagent = new ChatCoAgent(provider);

const response = await coagent.generateResponse({
  prompt: 'Write a Python function to validate email addresses',
  artifactType: ArtifactType.PYTHON,
  conversationHistory: [
    { role: 'user', content: 'I need help with email validation' },
    { role: 'assistant', content: 'I can help with that. What language?' },
    { role: 'user', content: 'Python please' },
  ],
});

console.log(response.explanation);
console.log(response.artifacts[0].content);
```

### Example 3: Custom Configuration

```typescript
import { DeveloperCoAgent, DEFAULT_MODE_CONFIGS } from './';

// Create co-agent with custom config
const coagent = new DeveloperCoAgent(provider, {
  variantCount: 5, // Generate 5 variants instead of 3
  maxTokens: 8000, // Increase token limit
  temperature: 0.9, // More creative
  includeComparison: true,
  suggestFollowUps: true,
});

// Or update config later
coagent.updateConfig({ temperature: 0.7 });
```

## Artifact Types

The system supports 10+ artifact types:

| Type | Language | Use Case |
|------|----------|----------|
| `CODE` | TypeScript | General code snippets |
| `REACT_COMPONENT` | TSX | React components |
| `HTML` | HTML | Web pages |
| `PYTHON` | Python | Python scripts |
| `SQL` | SQL | Database queries |
| `JSON` | JSON | Configuration files |
| `MARKDOWN` | Markdown | Documentation |
| `DIAGRAM` | Mermaid | Visualizations |
| `ERPNEXT_DOCTYPE` | JSON | ERPNext DocTypes |
| `FRAPPE_WORKFLOW` | Python | Frappe workflows |

## Configuration

Each mode has default configuration:

```typescript
const DEFAULT_MODE_CONFIGS: Record<CoAgentMode, CoAgentConfig> = {
  [CoAgentMode.CHAT]: {
    generateVariants: false,
    variantCount: 1,
    maxTokens: 2000,
    temperature: 0.7,
  },
  [CoAgentMode.DEVELOPER]: {
    generateVariants: true,
    variantCount: 3,
    maxTokens: 4000,
    temperature: 0.8, // More creative for variants
  },
  // ... other modes
};
```

## Response Format

### Chat Mode Response
```typescript
{
  mode: 'chat',
  explanation: 'Here\'s a solution...',
  artifacts: [
    {
      id: 'artifact_1234_abc',
      type: 'python',
      title: 'Email Validator',
      description: 'Validates email addresses using regex',
      content: 'def validate_email(email):\n    ...',
      language: 'python',
      createdAt: Date,
      updatedAt: Date,
    }
  ],
  followUpQuestions: ['Would you like error handling?', ...],
  usage: { promptTokens: 150, completionTokens: 300, totalTokens: 450 },
}
```

### Developer Mode Response
```typescript
{
  mode: 'developer',
  explanation: 'I\'ve created 3 variants of the component...',
  artifacts: [
    {
      id: 'artifact_1234_abc',
      variantNumber: 1,
      title: 'Minimalist Profile Card',
      description: 'Simple, clean design...',
      differentiators: ['Minimal dependencies', 'Fast rendering', 'Easy to customize'],
      content: '...',
    },
    {
      id: 'artifact_1234_def',
      variantNumber: 2,
      title: 'Feature-Rich Profile Card',
      description: 'Comprehensive implementation...',
      differentiators: ['Full accessibility', 'Multiple themes', 'Animation support'],
      content: '...',
    },
    {
      id: 'artifact_1234_ghi',
      variantNumber: 3,
      title: 'Modular Profile Card',
      description: 'Composable design...',
      differentiators: ['Highly reusable', 'Plugin system', 'Customizable slots'],
      content: '...',
    }
  ],
  comparisonSummary: 'Use Variant 1 for quick projects, Variant 2 for production apps, Variant 3 for design systems',
  followUpQuestions: ['Would you like me to refine any variant?', ...],
  usage: { ... },
}
```

## Integration with AI Providers

The co-agent system works with any `IAIProvider`:

```typescript
import { getGlobalProvider } from '../ai/universal-provider';
import { DeveloperCoAgent } from './';

// Automatically uses configured provider (OpenRouter or Cloudflare)
const provider = await getGlobalProvider();
const coagent = new DeveloperCoAgent(provider);

// Or use specific provider
import { OpenRouterProvider } from '../ai/providers/openrouter';
const openrouterProvider = new OpenRouterProvider({
  apiKey: process.env.OPENROUTER_API_KEY!,
  model: 'anthropic/claude-3.5-sonnet',
});
const coagent = new DeveloperCoAgent(openrouterProvider);
```

## Error Handling

Custom error types for better debugging:

```typescript
try {
  const response = await coagent.generateResponse(request);
} catch (error) {
  if (error instanceof VariantGenerationError) {
    console.error('Failed to generate variants:', error.message);
    console.error('Details:', error.details);
  } else if (error instanceof ArtifactParsingError) {
    console.error('Failed to parse artifacts:', error.message);
  } else if (error instanceof InvalidModeError) {
    console.error('Invalid mode:', error.message);
  }
}
```

## Testing

Example test cases:

```typescript
import { ChatCoAgent, DeveloperCoAgent } from './';
import { MockAIProvider } from '../ai/mock-provider';

describe('ChatCoAgent', () => {
  it('generates single artifact', async () => {
    const mockProvider = new MockAIProvider();
    const coagent = new ChatCoAgent(mockProvider);
    
    const response = await coagent.generateResponse({
      prompt: 'Test',
      artifactType: ArtifactType.CODE,
    });
    
    expect(response.artifacts).toHaveLength(1);
    expect(response.mode).toBe(CoAgentMode.CHAT);
  });
});

describe('DeveloperCoAgent', () => {
  it('generates 3 variants', async () => {
    const mockProvider = new MockAIProvider();
    const coagent = new DeveloperCoAgent(mockProvider);
    
    const response = await coagent.generateResponse({
      prompt: 'Test',
      artifactType: ArtifactType.REACT_COMPONENT,
    });
    
    expect(response.artifacts).toHaveLength(3);
    expect(response.comparisonSummary).toBeDefined();
    expect(response.artifacts[0].variantNumber).toBe(1);
  });
});
```

## Roadmap

### Phase 5 - v0-Style Developer Co-Agent ⏳

- [x] **T148**: Co-Agent Mode System (types, base, modes) ✅
- [ ] **T149**: Developer Co-Agent Implementation
- [ ] **T150**: Artifact Generation & Storage
- [ ] **T151**: Preview & Rendering System

### Future Enhancements

- [ ] Analyzer mode implementation
- [ ] Refiner mode implementation
- [ ] Artifact version history
- [ ] Collaborative refinement (multiple users)
- [ ] Export artifacts to files
- [ ] Share artifacts via URL
- [ ] Artifact templates library

## Best Practices

1. **Choose the Right Mode**
   - Use `CHAT` for quick questions and single solutions
   - Use `DEVELOPER` when you want to explore different approaches
   - Use `ANALYZER` for understanding complex systems
   - Use `REFINER` for iterative improvements

2. **Provide Context**
   - Include conversation history for better continuity
   - Specify constraints and preferences upfront
   - Use appropriate artifact types

3. **Handle Variants Effectively**
   - Read the comparison summary to understand trade-offs
   - Check differentiators to see unique features
   - Consider your specific use case when choosing

4. **Manage Tokens**
   - Developer mode uses 2-3x tokens of chat mode
   - Monitor usage for cost optimization
   - Use free tier (Cloudflare) for development

## Files

```
services/agent-gateway/src/coagents/
├── index.ts           # Exports
├── types.ts           # Type definitions (271 lines)
├── base.ts            # Base class (377 lines)
├── modes.ts           # Mode implementations (693 lines)
└── README.md          # This file
```

**Total**: ~1,341 lines of production code

## License

Part of the ERPNext CoAgents SaaS project.
