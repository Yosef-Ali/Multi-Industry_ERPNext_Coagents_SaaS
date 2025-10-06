/**
 * PostgreSQL Checkpointer for LangGraph State Persistence
 *
 * Enables conversation state persistence and resume capability after interrupts.
 * Implements best practices from LANGGRAPH_BEST_PRACTICES.md
 */

import { Pool, PoolConfig } from 'pg';
import { BaseCheckpointSaver, Checkpoint, CheckpointMetadata } from '@langchain/langgraph';
import { RunnableConfig } from '@langchain/core/runnables';

export interface PostgresCheckpointerConfig {
  connectionString?: string;
  poolConfig?: PoolConfig;
  tableName?: string;
}

/**
 * PostgreSQL-based checkpoint saver for LangGraph workflows
 *
 * Stores conversation state to enable:
 * - Resume after interrupt()
 * - Conversation history persistence
 * - Multi-session support via thread_id
 */
export class PostgresCheckpointer extends BaseCheckpointSaver {
  private pool: Pool;
  private tableName: string;
  private initialized: boolean = false;

  constructor(config: PostgresCheckpointerConfig = {}) {
    super();

    const connectionString =
      config.connectionString ||
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL;

    if (!connectionString) {
      console.warn('[PostgresCheckpointer] No Postgres connection string provided, using in-memory fallback');
      // Will fall back to in-memory storage
    }

    this.pool = new Pool({
      connectionString,
      ...config.poolConfig,
      // Connection pool settings
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.tableName = config.tableName || 'langgraph_checkpoints';
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          thread_id TEXT NOT NULL,
          checkpoint_id TEXT NOT NULL,
          parent_checkpoint_id TEXT,
          checkpoint JSONB NOT NULL,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (thread_id, checkpoint_id)
        );

        CREATE INDEX IF NOT EXISTS idx_thread_id ON ${this.tableName}(thread_id);
        CREATE INDEX IF NOT EXISTS idx_created_at ON ${this.tableName}(created_at);
      `);

      this.initialized = true;
      console.log(`[PostgresCheckpointer] Initialized table: ${this.tableName}`);
    } catch (error) {
      console.error('[PostgresCheckpointer] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get checkpoint by thread_id and checkpoint_id
   */
  async getTuple(config: RunnableConfig): Promise<[Checkpoint, CheckpointMetadata] | undefined> {
    if (!this.initialized) {
      await this.initialize();
    }

    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;

    if (!threadId) {
      console.warn('[PostgresCheckpointer] No thread_id provided');
      return undefined;
    }

    try {
      let query: string;
      let params: any[];

      if (checkpointId) {
        // Get specific checkpoint
        query = `
          SELECT checkpoint, metadata
          FROM ${this.tableName}
          WHERE thread_id = $1 AND checkpoint_id = $2
        `;
        params = [threadId, checkpointId];
      } else {
        // Get latest checkpoint for thread
        query = `
          SELECT checkpoint, metadata
          FROM ${this.tableName}
          WHERE thread_id = $1
          ORDER BY created_at DESC
          LIMIT 1
        `;
        params = [threadId];
      }

      const result = await this.pool.query(query, params);

      if (result.rows.length === 0) {
        return undefined;
      }

      const row = result.rows[0];
      return [row.checkpoint, row.metadata || {}];
    } catch (error) {
      console.error('[PostgresCheckpointer] Failed to get checkpoint:', error);
      return undefined;
    }
  }

  /**
   * Save checkpoint to database
   */
  async putTuple(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const threadId = config.configurable?.thread_id;
    const checkpointId = checkpoint.id;
    const parentCheckpointId = checkpoint.parent_id;

    if (!threadId || !checkpointId) {
      console.warn('[PostgresCheckpointer] Missing thread_id or checkpoint_id');
      return;
    }

    try {
      await this.pool.query(
        `
        INSERT INTO ${this.tableName} (thread_id, checkpoint_id, parent_checkpoint_id, checkpoint, metadata)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (thread_id, checkpoint_id)
        DO UPDATE SET
          checkpoint = EXCLUDED.checkpoint,
          metadata = EXCLUDED.metadata,
          created_at = CURRENT_TIMESTAMP
        `,
        [threadId, checkpointId, parentCheckpointId, JSON.stringify(checkpoint), JSON.stringify(metadata)]
      );

      console.log(`[PostgresCheckpointer] Saved checkpoint: ${checkpointId} for thread: ${threadId}`);
    } catch (error) {
      console.error('[PostgresCheckpointer] Failed to save checkpoint:', error);
      throw error;
    }
  }

  /**
   * List checkpoints for a thread
   */
  async list(config: RunnableConfig, limit?: number): Promise<Array<[Checkpoint, CheckpointMetadata]>> {
    if (!this.initialized) {
      await this.initialize();
    }

    const threadId = config.configurable?.thread_id;

    if (!threadId) {
      return [];
    }

    try {
      const result = await this.pool.query(
        `
        SELECT checkpoint, metadata
        FROM ${this.tableName}
        WHERE thread_id = $1
        ORDER BY created_at DESC
        ${limit ? `LIMIT ${limit}` : ''}
        `,
        [threadId]
      );

      return result.rows.map(row => [row.checkpoint, row.metadata || {}]);
    } catch (error) {
      console.error('[PostgresCheckpointer] Failed to list checkpoints:', error);
      return [];
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.pool.end();
    console.log('[PostgresCheckpointer] Connection pool closed');
  }
}

/**
 * Create checkpointer with environment-based configuration
 */
export function createCheckpointer(config?: PostgresCheckpointerConfig): PostgresCheckpointer {
  return new PostgresCheckpointer(config);
}

/**
 * In-memory checkpointer for development/testing
 */
export class InMemoryCheckpointer extends BaseCheckpointSaver {
  private checkpoints: Map<string, Map<string, [Checkpoint, CheckpointMetadata]>> = new Map();

  async getTuple(config: RunnableConfig): Promise<[Checkpoint, CheckpointMetadata] | undefined> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = config.configurable?.checkpoint_id;

    if (!threadId) return undefined;

    const threadCheckpoints = this.checkpoints.get(threadId);
    if (!threadCheckpoints) return undefined;

    if (checkpointId) {
      return threadCheckpoints.get(checkpointId);
    }

    // Get latest checkpoint
    const entries = Array.from(threadCheckpoints.entries());
    if (entries.length === 0) return undefined;

    return entries[entries.length - 1][1];
  }

  async putTuple(
    config: RunnableConfig,
    checkpoint: Checkpoint,
    metadata: CheckpointMetadata
  ): Promise<void> {
    const threadId = config.configurable?.thread_id;
    const checkpointId = checkpoint.id;

    if (!threadId || !checkpointId) return;

    if (!this.checkpoints.has(threadId)) {
      this.checkpoints.set(threadId, new Map());
    }

    this.checkpoints.get(threadId)!.set(checkpointId, [checkpoint, metadata]);
  }

  async list(config: RunnableConfig, limit?: number): Promise<Array<[Checkpoint, CheckpointMetadata]>> {
    const threadId = config.configurable?.thread_id;

    if (!threadId) return [];

    const threadCheckpoints = this.checkpoints.get(threadId);
    if (!threadCheckpoints) return [];

    const entries = Array.from(threadCheckpoints.values());
    return limit ? entries.slice(-limit) : entries;
  }
}

/**
 * Factory function to create appropriate checkpointer
 */
export function createAppropriateCheckpointer(config?: PostgresCheckpointerConfig): BaseCheckpointSaver {
  const hasPostgres =
    config?.connectionString ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (hasPostgres) {
    console.log('[Checkpointer] Using PostgreSQL for state persistence');
    return new PostgresCheckpointer(config);
  } else {
    console.log('[Checkpointer] Using in-memory storage (development mode)');
    return new InMemoryCheckpointer();
  }
}
