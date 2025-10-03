# Multi-stage build for unified ERPNext CoAgent deployment
# Includes: Frontend (Next.js) + Agent Gateway (TypeScript) + Workflow Service (Python)

# ============================================
# Stage 1: Build Frontend (Next.js)
# ============================================
FROM node:18-alpine AS frontend-builder

WORKDIR /app/frontend
COPY frontend/coagent/package*.json ./
RUN npm ci --only=production

COPY frontend/coagent .
RUN npm run build

# ============================================
# Stage 2: Build Agent Gateway (TypeScript)
# ============================================
FROM node:18-alpine AS agent-builder

WORKDIR /app/agent
COPY services/agent-gateway/package*.json ./
RUN npm ci --only=production

COPY services/agent-gateway .
RUN npm run build 2>/dev/null || echo "No build script, using source"

# ============================================
# Stage 3: Final Production Image (Python base)
# ============================================
FROM python:3.11-slim

# Install Node.js and system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    gnupg && \
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_18.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y nodejs && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ============================================
# Copy Workflow Service (Python)
# ============================================
COPY services/workflows/requirements.txt /app/workflows/requirements.txt
RUN pip install --no-cache-dir -r /app/workflows/requirements.txt

COPY services/workflows /app/workflows

# ============================================
# Copy Agent Gateway (TypeScript)
# ============================================
COPY --from=agent-builder /app/agent/node_modules /app/agent/node_modules
COPY --from=agent-builder /app/agent /app/agent

# ============================================
# Copy Frontend (Next.js)
# ============================================
COPY --from=frontend-builder /app/frontend/.next /app/frontend/.next
COPY --from=frontend-builder /app/frontend/public /app/frontend/public
COPY --from=frontend-builder /app/frontend/node_modules /app/frontend/node_modules
COPY --from=frontend-builder /app/frontend/package.json /app/frontend/package.json

# ============================================
# Create startup script
# ============================================
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
echo "🚀 Starting ERPNext CoAgent Services..."\n\
\n\
# Start workflow service in background\n\
echo "📊 Starting Workflow Service (port 8001)..."\n\
cd /app/workflows && python src/server.py &\n\
WORKFLOW_PID=$!\n\
\n\
# Wait for workflow service to be ready\n\
sleep 3\n\
\n\
# Start agent gateway in background\n\
echo "🤖 Starting Agent Gateway (port 3000)..."\n\
cd /app/agent && npm start &\n\
AGENT_PID=$!\n\
\n\
# Wait for agent gateway to be ready\n\
sleep 3\n\
\n\
# Start frontend (foreground - this keeps container running)\n\
echo "🎨 Starting Frontend (port ${PORT:-8080})..."\n\
cd /app/frontend && PORT=${PORT:-8080} npm start\n\
\n\
# If frontend exits, kill other services\n\
kill $WORKFLOW_PID $AGENT_PID 2>/dev/null || true\n\
' > /app/start.sh && chmod +x /app/start.sh

# ============================================
# Expose ports
# ============================================
EXPOSE 8080 8001 3000

# ============================================
# Health check
# ============================================
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8001/ && curl -f http://localhost:3000/health || exit 1

# ============================================
# Start all services
# ============================================
CMD ["/app/start.sh"]
