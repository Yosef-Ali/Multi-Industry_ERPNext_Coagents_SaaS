-- Cloudflare D1 Database Schema
-- For LangGraph Checkpoints and Workflow State
-- Created: 2025-10-02

-- ============================================================================
-- LangGraph Checkpoints Table
-- Stores workflow state for resume functionality
-- ============================================================================

CREATE TABLE IF NOT EXISTS checkpoints (
    thread_id TEXT NOT NULL,
    checkpoint_ns TEXT NOT NULL DEFAULT 'default',
    checkpoint BLOB NOT NULL,
    metadata TEXT,
    parent_checkpoint_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (thread_id, checkpoint_ns)
);

CREATE INDEX IF NOT EXISTS idx_checkpoints_thread ON checkpoints(thread_id);
CREATE INDEX IF NOT EXISTS idx_checkpoints_created ON checkpoints(created_at);

-- ============================================================================
-- Workflow Execution History
-- Tracks all workflow executions for analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_executions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL,
    graph_name TEXT NOT NULL,
    industry TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    initial_state TEXT,
    final_state TEXT,
    error TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    duration_ms INTEGER,
    FOREIGN KEY (thread_id) REFERENCES checkpoints(thread_id)
);

CREATE INDEX IF NOT EXISTS idx_executions_thread ON workflow_executions(thread_id);
CREATE INDEX IF NOT EXISTS idx_executions_graph ON workflow_executions(graph_name);
CREATE INDEX IF NOT EXISTS idx_executions_status ON workflow_executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_started ON workflow_executions(started_at);

-- ============================================================================
-- Approval History
-- Tracks all human approval decisions
-- ============================================================================

CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL,
    execution_id INTEGER,
    operation TEXT NOT NULL,
    prompt_data TEXT,
    decision TEXT CHECK(decision IN ('approve', 'reject', 'pending')),
    decided_by TEXT,
    decided_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES checkpoints(thread_id),
    FOREIGN KEY (execution_id) REFERENCES workflow_executions(id)
);

CREATE INDEX IF NOT EXISTS idx_approvals_thread ON approvals(thread_id);
CREATE INDEX IF NOT EXISTS idx_approvals_execution ON approvals(execution_id);
CREATE INDEX IF NOT EXISTS idx_approvals_decision ON approvals(decision);

-- ============================================================================
-- Session Management
-- User sessions (complementary to KV storage)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sessions (
    session_id TEXT PRIMARY KEY,
    user_id TEXT,
    agent_name TEXT,
    context TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ============================================================================
-- Analytics & Metrics
-- Workflow performance metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS workflow_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    graph_name TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    metric_value REAL NOT NULL,
    tags TEXT,
    recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_metrics_graph ON workflow_metrics(graph_name);
CREATE INDEX IF NOT EXISTS idx_metrics_type ON workflow_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_metrics_recorded ON workflow_metrics(recorded_at);

-- ============================================================================
-- Initial Data
-- ============================================================================

-- Insert initial workflow metrics placeholders
INSERT OR IGNORE INTO workflow_metrics (graph_name, metric_type, metric_value, tags)
VALUES
    ('hotel_o2c', 'total_executions', 0, 'industry:hospitality'),
    ('hospital_admissions', 'total_executions', 0, 'industry:healthcare'),
    ('manufacturing_production', 'total_executions', 0, 'industry:manufacturing'),
    ('retail_fulfillment', 'total_executions', 0, 'industry:retail'),
    ('education_admissions', 'total_executions', 0, 'industry:education');

-- ============================================================================
-- Cleanup Triggers
-- Auto-delete old checkpoints after 30 days
-- ============================================================================

CREATE TRIGGER IF NOT EXISTS cleanup_old_checkpoints
AFTER INSERT ON checkpoints
BEGIN
    DELETE FROM checkpoints
    WHERE created_at < datetime('now', '-30 days');
END;

-- Auto-update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS update_checkpoint_timestamp
AFTER UPDATE ON checkpoints
BEGIN
    UPDATE checkpoints
    SET updated_at = CURRENT_TIMESTAMP
    WHERE thread_id = NEW.thread_id AND checkpoint_ns = NEW.checkpoint_ns;
END;

-- ============================================================================
-- Views for Analytics
-- ============================================================================

CREATE VIEW IF NOT EXISTS workflow_stats AS
SELECT
    graph_name,
    COUNT(*) as total_executions,
    AVG(duration_ms) as avg_duration_ms,
    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
    MAX(started_at) as last_execution
FROM workflow_executions
GROUP BY graph_name;

CREATE VIEW IF NOT EXISTS approval_stats AS
SELECT
    operation,
    COUNT(*) as total_requests,
    SUM(CASE WHEN decision = 'approve' THEN 1 ELSE 0 END) as approved,
    SUM(CASE WHEN decision = 'reject' THEN 1 ELSE 0 END) as rejected,
    SUM(CASE WHEN decision = 'pending' THEN 1 ELSE 0 END) as pending
FROM approvals
GROUP BY operation;

-- ============================================================================
-- Complete
-- ============================================================================

-- Verify tables created
SELECT 'Schema created successfully. Tables:' as status;
SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
