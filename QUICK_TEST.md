# 🚀 Quick Test Guide

## Start
```bash
# Server already running on localhost:3000
# Just open: http://localhost:3000/developer
```

## Test Messages (Copy & Paste)

### 1️⃣ Simple Customer DocType
```
Create a Customer doctype with name, email, and phone
```

### 2️⃣ Purchase Order Workflow
```
Create an approval workflow for Purchase Orders
```

### 3️⃣ Healthcare Form
```
Create a Patient Registration form for healthcare
```

### 4️⃣ Sales Report
```
Generate a Sales Report for monthly revenue
```

## What You Should See

1. **Message sends** → ✅
2. **"🔍 Analyzing..."** appears → ✅
3. **"✅ Detected: DOCTYPE"** → ✅
4. **"⚙️ Generating 3 variants..."** → ✅
5. **Three variants listed** → ✅
6. **Variants in right panel** → ✅
7. **Click to view code** → ✅

## Expected Time
- **< 1 second total**
- No backend needed
- Zero Anthropic API costs

## If Something Goes Wrong

### Check Browser Console
```
F12 → Console Tab
Look for: "[DataStreamHandler] Variant set created"
```

### Check Server Terminal
```
Look for: "POST /api/developer/chat 200"
```

### Check Network Tab
```
F12 → Network Tab → Find "/api/developer/chat"
Should see: 200 status
```

## Quick Commands

```bash
# Restart server if needed
cd frontend/coagent
pnpm run dev

# View server logs
# Already visible in terminal

# Clear browser cache
Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
```

## Success = All Green Checkmarks! ✅✅✅
