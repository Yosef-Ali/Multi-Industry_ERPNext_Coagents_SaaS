# Re-run Prompt Button Feature

## ✅ Implementation Complete

### What Was Added
A new **"Re-run prompt"** button has been added to user messages that allows users to quickly re-execute their previous prompts without retyping them.

### Features

#### 1. **Re-run Button**
- **Icon**: Circular arrow (redo icon) 
- **Location**: Appears on hover next to user messages
- **Position**: Between the "Edit" and "Copy" buttons
- **Tooltip**: "Re-run prompt"
- **Action**: Regenerates the response using the same user message

#### 2. **User Experience**
- **Hover State**: Button appears with smooth opacity transition when hovering over user messages
- **Toast Notification**: Shows "Re-running prompt..." when clicked
- **Immediate Feedback**: "Generating response…" indicator appears
- **Seamless Integration**: Matches existing design system

#### 3. **Visual Hierarchy**
When hovering over a user message, three buttons appear from left to right:
1. **Edit** (pencil icon) - positioned at `-left-[4.5rem]`
2. **Re-run** (redo icon) - positioned at `-left-9`  
3. **Copy** (copy icon) - visible by default

### Technical Implementation

#### Files Modified

**1. `components/message-actions.tsx`**
- Added `RedoIcon` import
- Added `regenerate` prop to function signature (type: `UseChatHelpers<ChatMessage>['regenerate']`)
- Added re-run button for user messages with proper positioning
- Updated button container to `flex gap-0.5` for proper spacing

**2. `components/message.tsx`**
- Added `regenerate` prop when rendering `MessageActions` component
- Passed down the `regenerate` function from `UseChatHelpers`

### Code Changes

```typescript
// message-actions.tsx - Added regenerate button
{regenerate && (
  <Action
    className="-left-9 absolute top-0 opacity-0 transition-opacity group-hover/message:opacity-100"
    onClick={() => {
      regenerate();
      toast.success('Re-running prompt...');
    }}
    tooltip="Re-run prompt"
  >
    <RedoIcon />
  </Action>
)}
```

```typescript
// message.tsx - Pass regenerate prop
<MessageActions
  chatId={chatId}
  isLoading={isLoading}
  message={message}
  regenerate={regenerate}  // ← Added
  setMode={setMode}
  vote={vote}
/>
```

### Benefits

1. **Improved User Experience**: Users can quickly retry prompts with different model selections
2. **Time Savings**: No need to retype or copy/paste previous messages
3. **Consistency**: Follows existing design patterns (hover-to-reveal actions)
4. **Accessibility**: Includes proper tooltips and visual feedback

### Design System Compliance

✅ Uses existing `RedoIcon` component  
✅ Matches hover behavior of Edit button  
✅ Consistent button styling and spacing  
✅ Proper toast notifications  
✅ Smooth opacity transitions  

### Testing

✅ Button appears on hover over user messages  
✅ Clicking re-run button triggers regeneration  
✅ Toast notification displays "Re-running prompt..."  
✅ "Generating response…" indicator appears  
✅ New response is generated successfully  
✅ All existing features remain functional  

### Usage Example

1. User sends a message: "Hello test"
2. AI responds: "Hello there! How can I help you today?"
3. User hovers over their message "Hello test"
4. Three buttons appear: Edit, Re-run, Copy
5. User clicks the Re-run button (circular arrow icon)
6. Toast shows "Re-running prompt..."
7. AI generates a new response to the same prompt

### Future Enhancements (Optional)

- Add keyboard shortcut for re-running (e.g., Ctrl+R on message)
- Show loading state on the re-run button itself
- Add analytics to track re-run usage patterns
- Option to re-run with a different model selection

---

## Status: ✅ Complete and Tested

The re-run button feature is now live and working perfectly in the chat interface!
