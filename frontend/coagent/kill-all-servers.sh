#!/bin/bash

echo "🔍 Finding all Node.js processes..."
ps aux | grep -i node | grep -v grep

echo ""
echo "🔍 Finding processes on ports 3000, 3001, 3002, 3003..."

# Kill processes on specific ports
for port in 3000 3001 3002 3003 8000 8001; do
    pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        echo "⚠️  Found process $pid on port $port"
        kill -9 $pid 2>/dev/null && echo "✅ Killed process on port $port" || echo "❌ Failed to kill port $port"
    else
        echo "✓  Port $port is free"
    fi
done

echo ""
echo "🔥 Killing all node processes..."
killall -9 node 2>/dev/null && echo "✅ All node processes killed" || echo "✓  No node processes running"

echo ""
echo "🔥 Killing all Next.js processes..."
killall -9 next 2>/dev/null && echo "✅ All Next.js processes killed" || echo "✓  No Next.js processes running"

echo ""
echo "🔍 Checking remaining Node processes..."
remaining=$(ps aux | grep -i node | grep -v grep | wc -l)
if [ $remaining -eq 0 ]; then
    echo "✅ All Node processes successfully terminated"
else
    echo "⚠️  Warning: $remaining Node processes still running:"
    ps aux | grep -i node | grep -v grep
fi

echo ""
echo "🔍 Final port check..."
for port in 3000 3001 3002 3003; do
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "⚠️  Port $port still occupied by PID: $(lsof -ti:$port)"
    else
        echo "✅ Port $port is now free"
    fi
done

echo ""
echo "✅ Cleanup complete!"
