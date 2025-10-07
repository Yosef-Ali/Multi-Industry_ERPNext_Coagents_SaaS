["Basic CRUD", "Simple validation"]}
  />
  <VariantCard
    title="Standard"
    complexity="Medium" 
    time="15 min"
    features={["CRUD", "Workflows", "Reports"]}
    recommended
  />
  <VariantCard
    title="Advanced"
    complexity="High"
    time="30 min"
    features={["Full automation", "AI features", "Analytics"]}
  />
</div>
```

**Afternoon: Enhanced Input**
```tsx
<EnhancedInput
  onFileUpload={(file) => attachPRD(file)}
  commands={[
    { trigger: '/help', action: showHelp },
    { trigger: '/clear', action: clearChat },
    { trigger: '/export', action: exportConversation }
  ]}
  mentions={previousArtifacts}
  placeholder="Describe your DocType or type / for commands..."
/>
```

### Day 7: Keyboard Shortcuts + Testing

**Morning: Shortcuts**
```tsx
// hooks/use-keyboard-shortcuts.ts
export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        focusInput();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        newConversation();
      }
      if (e.key === 'Escape') {
        stopGeneration();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);
}
```

**Afternoon: Testing**
- Test all features end-to-end
- Fix bugs
- Polish animations
- Document usage

---

## 🎯 Testing Checklist

### Artifact Panel
- [ ] Code artifacts render with syntax highlighting
- [ ] Preview artifacts show live HTML/React
- [ ] Copy/export buttons work
- [ ] Side-by-side view responsive
- [ ] Artifact closes when conversation changes

### Message Actions  
- [ ] Copy message works
- [ ] Edit message updates conversation
- [ ] Delete message removes from history
- [ ] Actions appear on hover
- [ ] Actions work on mobile

### Suggested Prompts
- [ ] Prompts show on empty conversation
- [ ] Clicking prompt populates input
- [ ] Contextual suggestions based on conversation
- [ ] Prompts hide after first message

### Streaming
- [ ] Status messages show correctly
- [ ] Progress indicator accurate
- [ ] Can stop generation mid-stream
- [ ] Streaming smooth (no jumps)

### Conversation History
- [ ] Conversations list in sidebar
- [ ] Switching conversations works
- [ ] Search finds conversations
- [ ] Delete conversation works
- [ ] Auto-title generation works

### Error Handling
- [ ] Network errors show retry option
- [ ] Rate limit shows wait time
- [ ] Invalid input shows helpful message
- [ ] Errors don't crash app
- [ ] Recovery actions work

### Rich Rendering
- [ ] Markdown formats correctly
- [ ] Code blocks have syntax highlighting
- [ ] Code copy button works
- [ ] Links are clickable
- [ ] Images render

### Keyboard Shortcuts
- [ ] Cmd/Ctrl+K focuses input
- [ ] Cmd/Ctrl+N starts new conversation
- [ ] Esc stops generation
- [ ] Cmd/Ctrl+/ shows help
- [ ] Shortcuts documented

---

## 📊 Success Metrics Dashboard

```typescript
// Track these metrics
const metrics = {
  // User Engagement
  avgMessagesPerConversation: 8.5,
  conversationCompletionRate: 0.85,
  variantSelectionRate: 0.92,
  
  // Performance
  avgFirstTokenTime: 1.2, // seconds
  avgGenerationTime: 8.5, // seconds
  errorRate: 0.03,
  
  // Feature Usage
  artifactOpenRate: 0.95,
  copyActionRate: 0.65,
  promptUsageRate: 0.45,
  conversationSearchRate: 0.25,
  
  // Quality
  userSatisfactionScore: 4.3, // out of 5
  retryRate: 0.08,
  feedbackRate: 0.15
};
```

---

## 🐛 Common Issues & Fixes

### Issue 1: Artifact Panel Not Showing
```tsx
// Check artifact store is initialized
import { useArtifactStore } from '@/lib/store/artifact-store';

// Debug
console.log('Artifact state:', useArtifactStore.getState());

// Fix: Make sure artifact detection is working
if (message.content.includes('```')) {
  setArtifact({
    type: 'code',
    content: extractCode(message.content),
    language: detectLanguage(message.content)
  });
}
```

### Issue 2: Streaming Stutters
```tsx
// Use throttle from AI SDK
const { messages, ... } = useChat({
  experimental_throttle: 100, // ms
  // ... other config
});
```

### Issue 3: Copy Button Doesn't Work
```tsx
// Use modern clipboard API
async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast({ description: 'Copied to clipboard!' });
  } catch (err) {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
```

### Issue 4: Conversation Not Saving
```tsx
// Check database connection
// Make sure chat ID persists
useEffect(() => {
  persistChatIdInUrl(id);
  saveChatMetadata(id, { title, model, timestamp });
}, [id]);
```

---

## 🎨 Design System Reference

### Colors
```css
/* From Vercel chatbot */
--primary: 222.2 47.4% 11.2%;
--secondary: 210 40% 96.1%;
--muted: 210 40% 96.1%;
--accent: 210 40% 96.1%;
--destructive: 0 84.2% 60.2%;
```

### Spacing
```css
/* Message spacing */
.message { @apply gap-4 md:gap-6; }
.message-content { @apply px-5 py-2.5; }
.chat-container { @apply max-w-4xl mx-auto; }
```

### Animations
```tsx
// Smooth streaming
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>
  {message.content}
</motion.div>
```

---

## 📚 Code Snippets Library

### Copy Message Button
```tsx
function CopyButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button size="sm" variant="ghost" onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
```

### Edit Message
```tsx
function EditMessage({ message, onSave }: EditMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(message.content);

  if (!isEditing) {
    return (
      <Button onClick={() => setIsEditing(true)}>
        <Edit className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className="flex gap-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 rounded border p-2"
      />
      <Button onClick={() => { onSave(content); setIsEditing(false); }}>
        Save
      </Button>
      <Button variant="ghost" onClick={() => setIsEditing(false)}>
        Cancel
      </Button>
    </div>
  );
}
```

### Variant Selector
```tsx
function VariantSelector({ variants, onSelect }: VariantSelectorProps) {
  const [selected, setSelected] = useState(1); // Default to standard

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {variants.map((variant, index) => (
        <Card
          key={index}
          className={cn(
            "cursor-pointer transition-all",
            selected === index && "ring-2 ring-primary"
          )}
          onClick={() => { setSelected(index); onSelect(variant); }}
        >
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              {variant.title}
              {variant.recommended && (
                <Badge variant="secondary">Recommended</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {variant.description}
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Complexity:</span>
                <span className="font-medium">{variant.complexity}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Setup Time:</span>
                <span className="font-medium">{variant.time}</span>
              </div>
            </div>
            <div className="mt-4 space-y-1">
              {variant.features.map((feature) => (
                <div key={feature} className="flex items-center gap-2 text-sm">
                  <Check className="h-3 w-3 text-green-600" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Streaming Status
```tsx
function StreamingStatus({ status, progress, step }: StreamingStatusProps) {
  const statusMessages = {
    analyzing: {
      icon: Search,
      text: "Analyzing your requirements...",
      color: "text-blue-600"
    },
    generating: {
      icon: Code,
      text: "Generating ERPNext code...",
      color: "text-purple-600"
    },
    optimizing: {
      icon: Sparkles,
      text: "Optimizing implementation...",
      color: "text-green-600"
    }
  };

  const current = statusMessages[status];
  const Icon = current.icon;

  return (
    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
      <Icon className={cn("h-5 w-5 animate-pulse", current.color)} />
      <div className="flex-1">
        <p className="text-sm font-medium">{current.text}</p>
        {step && (
          <p className="text-xs text-muted-foreground mt-1">{step}</p>
        )}
      </div>
      {progress !== undefined && (
        <div className="w-24">
          <Progress value={progress} />
        </div>
      )}
    </div>
  );
}
```

### Enhanced Input with Commands
```tsx
function EnhancedInput({ value, onChange, onSubmit }: EnhancedInputProps) {
  const [showCommands, setShowCommands] = useState(false);
  
  const commands = [
    { trigger: '/help', description: 'Show help menu', icon: HelpCircle },
    { trigger: '/clear', description: 'Clear conversation', icon: Trash },
    { trigger: '/export', description: 'Export to markdown', icon: Download },
    { trigger: '/template', description: 'Use template', icon: FileText }
  ];

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === '/' && value === '') {
      setShowCommands(true);
    }
    if (e.key === 'Escape') {
      setShowCommands(false);
    }
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type / for commands..."
        className="w-full p-4 rounded-lg border"
      />
      
      {showCommands && (
        <div className="absolute bottom-full mb-2 w-full bg-background border rounded-lg shadow-lg">
          {commands.map(({ trigger, description, icon: Icon }) => (
            <button
              key={trigger}
              onClick={() => {
                onChange(trigger);
                setShowCommands(false);
              }}
              className="flex items-center gap-3 w-full p-3 hover:bg-muted"
            >
              <Icon className="h-4 w-4" />
              <div className="text-left">
                <p className="font-medium text-sm">{trigger}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## 🚀 Deployment Checklist

### Before Deploying

- [ ] All tests pass
- [ ] Error boundaries in place
- [ ] Loading states everywhere
- [ ] Mobile responsive
- [ ] Keyboard shortcuts work
- [ ] Analytics tracking implemented
- [ ] Performance metrics acceptable
- [ ] Security review complete

### After Deploying

- [ ] Monitor error rates
- [ ] Check performance metrics
- [ ] Gather user feedback
- [ ] Track feature usage
- [ ] Plan next iteration

---

## 📞 Getting Help

### Documentation
- Full guide: `DEVELOPER_CHAT_FLOW_IMPROVEMENTS.md`
- Architecture: `AG_UI_README.md`
- Project overview: `README.md`

### Reference Implementations
- Vercel AI Chatbot: https://github.com/vercel/ai-chatbot
- CopilotKit Docs: https://docs.copilotkit.ai
- Next.js Docs: https://nextjs.org/docs

### Quick Commands
```bash
# Start development
cd frontend/coagent && pnpm dev

# Run tests
pnpm test

# Check types
pnpm type-check

# Lint code
pnpm lint

# Build for production
pnpm build
```

---

## 🎉 You're Ready!

Start with the **30-Minute Quick Wins** and work through the phases. Each improvement makes the developer experience better!

**Remember:**
- Components already exist in `components/artifacts/`
- Reference the Vercel chatbot for patterns
- Test each feature before moving to the next
- Keep CopilotKit integration intact

Good luck! 🚀