/**
 * T077: Session Management with CoagentSession Lifecycle
 * Manages user sessions for AG-UI streaming connections
 */

import { randomUUID } from 'crypto';

export interface CoagentSession {
  session_id: string;
  user_id: string;
  doctype?: string;
  doc_name?: string;
  enabled_industries: string[];
  created_at: Date;
  last_activity: Date;
  state: SessionState;
  context: Record<string, any>;
}

export type SessionState = 'active' | 'idle' | 'terminated';

/**
 * In-memory session store
 * Production: Use Redis with TTL for distributed sessions
 */
class SessionStore {
  private sessions: Map<string, CoagentSession> = new Map();
  private readonly SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Periodic cleanup of expired sessions
    setInterval(() => this.cleanupExpiredSessions(), this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Create new session
   */
  create(params: {
    user_id: string;
    doctype?: string;
    doc_name?: string;
    enabled_industries?: string[];
  }): CoagentSession {
    const session: CoagentSession = {
      session_id: randomUUID(),
      user_id: params.user_id,
      doctype: params.doctype,
      doc_name: params.doc_name,
      enabled_industries: params.enabled_industries || [],
      created_at: new Date(),
      last_activity: new Date(),
      state: 'active',
      context: {},
    };

    this.sessions.set(session.session_id, session);
    console.log(`[Session] Created session ${session.session_id} for user ${params.user_id}`);

    return session;
  }

  /**
   * Get existing session or create new one
   */
  getOrCreate(
    session_id: string | undefined,
    params: {
      user_id: string;
      doctype?: string;
      doc_name?: string;
      enabled_industries?: string[];
    }
  ): CoagentSession {
    if (session_id) {
      const existing = this.get(session_id);
      if (existing) {
        // Update last activity
        existing.last_activity = new Date();
        return existing;
      }
    }

    // Create new session
    return this.create(params);
  }

  /**
   * Get session by ID
   */
  get(session_id: string): CoagentSession | undefined {
    return this.sessions.get(session_id);
  }

  /**
   * Update session context
   */
  updateContext(session_id: string, context: Record<string, any>): void {
    const session = this.sessions.get(session_id);
    if (session) {
      session.context = { ...session.context, ...context };
      session.last_activity = new Date();
    }
  }

  /**
   * Mark session as idle
   */
  markIdle(session_id: string): void {
    const session = this.sessions.get(session_id);
    if (session) {
      session.state = 'idle';
      session.last_activity = new Date();
    }
  }

  /**
   * Terminate session
   */
  terminate(session_id: string): void {
    const session = this.sessions.get(session_id);
    if (session) {
      session.state = 'terminated';
      console.log(`[Session] Terminated session ${session_id}`);
      this.sessions.delete(session_id);
    }
  }

  /**
   * Cleanup expired sessions
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [session_id, session] of this.sessions.entries()) {
      const inactiveTime = now - session.last_activity.getTime();

      if (inactiveTime > this.SESSION_TIMEOUT_MS) {
        console.log(
          `[Session] Cleaning up expired session ${session_id} (inactive for ${Math.round(
            inactiveTime / 1000 / 60
          )}m)`
        );
        this.sessions.delete(session_id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[Session] Cleaned up ${cleaned} expired session(s)`);
    }
  }

  /**
   * Get session statistics
   */
  getStats(): {
    total: number;
    active: number;
    idle: number;
    by_user: Record<string, number>;
  } {
    const stats = {
      total: this.sessions.size,
      active: 0,
      idle: 0,
      by_user: {} as Record<string, number>,
    };

    for (const session of this.sessions.values()) {
      if (session.state === 'active') stats.active++;
      if (session.state === 'idle') stats.idle++;

      stats.by_user[session.user_id] = (stats.by_user[session.user_id] || 0) + 1;
    }

    return stats;
  }
}

// Singleton session store
export const sessionStore = new SessionStore();

/**
 * Session middleware helper
 * Extract or create session from request
 */
export function getSessionFromRequest(
  req: any,
  body: {
    session_id?: string;
    user_id: string;
    doctype?: string;
    doc_name?: string;
    enabled_industries?: string[];
  }
): CoagentSession {
  return sessionStore.getOrCreate(body.session_id, {
    user_id: body.user_id,
    doctype: body.doctype,
    doc_name: body.doc_name,
    enabled_industries: body.enabled_industries,
  });
}
