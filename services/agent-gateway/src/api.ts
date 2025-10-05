/**
 * Frappe REST/RPC API Client
 * T047-T049: Session token injection, rate limiting, idempotency
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';

interface RateLimiter {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per second
}

interface IdempotencyCache {
  [key: string]: {
    result: any;
    timestamp: number;
  };
}

export interface FrappeAuthConfig {
  // Option 1: Session token (for user sessions)
  sessionToken?: string;
  // Option 2: API key + secret (for server-to-server, recommended for v15+)
  apiKey?: string;
  apiSecret?: string;
}

export class FrappeAPIClient {
  private client: AxiosInstance;
  private rateLimiter: RateLimiter;
  private idempotencyCache: IdempotencyCache = {};
  private authConfig: FrappeAuthConfig;

  constructor(
    baseURL: string,
    authConfig: FrappeAuthConfig,
    rateLimit: number = 10 // requests per second
  ) {
    this.authConfig = authConfig;

    // Determine authorization header based on auth method
    const authHeader = this.getAuthorizationHeader();

    // Initialize Axios client
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      timeout: 30000, // 30 second timeout
    });

    // Initialize rate limiter (T048)
    this.rateLimiter = {
      tokens: rateLimit,
      lastRefill: Date.now(),
      maxTokens: rateLimit,
      refillRate: rateLimit, // refill all tokens per second
    };

    // Add request interceptor for rate limiting
    this.client.interceptors.request.use(async (config) => {
      await this.acquireToken();
      return config;
    });
  }

  /**
   * Get authorization header based on auth method
   * Frappe v15+ supports two methods:
   * 1. Session token: `token <session_token>`
   * 2. API key:secret: `token <api_key>:<api_secret>`
   */
  private getAuthorizationHeader(): string {
    if (this.authConfig.apiKey && this.authConfig.apiSecret) {
      // Method 2: API key:secret (recommended for server-to-server)
      return `token ${this.authConfig.apiKey}:${this.authConfig.apiSecret}`;
    } else if (this.authConfig.sessionToken) {
      // Method 1: Session token (for user sessions)
      return `token ${this.authConfig.sessionToken}`;
    } else {
      throw new Error('Either sessionToken or apiKey+apiSecret must be provided');
    }
  }

  /**
   * T048: Client-side rate limiting (10 req/sec default)
   */
  private async acquireToken(): Promise<void> {
    const now = Date.now();
    const timePassed = (now - this.rateLimiter.lastRefill) / 1000;

    // Refill tokens based on time passed
    this.rateLimiter.tokens = Math.min(
      this.rateLimiter.maxTokens,
      this.rateLimiter.tokens + timePassed * this.rateLimiter.refillRate
    );
    this.rateLimiter.lastRefill = now;

    // Wait if no tokens available
    if (this.rateLimiter.tokens < 1) {
      const waitTime = ((1 - this.rateLimiter.tokens) / this.rateLimiter.refillRate) * 1000;
      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return this.acquireToken(); // Retry after wait
    }

    // Consume one token
    this.rateLimiter.tokens -= 1;
  }

  /**
   * T049: Generate idempotency key for write operations
   */
  private generateIdempotencyKey(
    method: string,
    doctype: string,
    data: any
  ): string {
    const payload = JSON.stringify({ method, doctype, data });
    return uuidv4() + '-' + Buffer.from(payload).toString('base64').slice(0, 32);
  }

  /**
   * Check idempotency cache to prevent duplicate operations
   */
  private checkIdempotencyCache(key: string): any | null {
    const cached = this.idempotencyCache[key];
    if (!cached) return null;

    // Cache valid for 5 minutes
    const age = Date.now() - cached.timestamp;
    if (age > 5 * 60 * 1000) {
      delete this.idempotencyCache[key];
      return null;
    }

    return cached.result;
  }

  /**
   * Search documents with filters
   */
  async searchDoc(params: {
    doctype: string;
    filters?: Record<string, any>;
    fields?: string[];
    limit?: number;
    order_by?: string;
  }): Promise<any> {
    const { doctype, filters = {}, fields = ['*'], limit = 20, order_by } = params;

    const response = await this.client.get('/api/resource/' + doctype, {
      params: {
        filters: JSON.stringify(filters),
        fields: JSON.stringify(fields),
        limit_page_length: limit,
        order_by,
      },
    });

    return {
      documents: response.data.data,
      total: response.data.data.length,
    };
  }

  /**
   * Get single document by name
   */
  async getDoc(params: { doctype: string; name: string }): Promise<any> {
    const { doctype, name } = params;

    const response = await this.client.get(`/api/resource/${doctype}/${name}`);

    return {
      document: response.data.data,
    };
  }

  /**
   * Create new document (with idempotency)
   */
  async createDoc(params: {
    doctype: string;
    data: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<any> {
    const { doctype, data, idempotencyKey } = params;

    // Generate idempotency key if not provided
    const key = idempotencyKey || this.generateIdempotencyKey('create', doctype, data);

    // Check cache
    const cached = this.checkIdempotencyCache(key);
    if (cached) {
      return { ...cached, from_cache: true };
    }

    const response = await this.client.post(`/api/resource/${doctype}`, {
      data,
    });

    const result = {
      document: response.data.data,
      doctype,
      name: response.data.data.name,
    };

    // Cache result
    this.idempotencyCache[key] = {
      result,
      timestamp: Date.now(),
    };

    return result;
  }

  /**
   * Update existing document (with idempotency)
   */
  async updateDoc(params: {
    doctype: string;
    name: string;
    data: Record<string, any>;
    idempotencyKey?: string;
  }): Promise<any> {
    const { doctype, name, data, idempotencyKey } = params;

    const key = idempotencyKey || this.generateIdempotencyKey('update', doctype, { name, data });

    const cached = this.checkIdempotencyCache(key);
    if (cached) {
      return { ...cached, from_cache: true };
    }

    const response = await this.client.put(`/api/resource/${doctype}/${name}`, {
      data,
    });

    const result = {
      document: response.data.data,
      doctype,
      name,
    };

    this.idempotencyCache[key] = {
      result,
      timestamp: Date.now(),
    };

    return result;
  }

  /**
   * Submit document (change docstatus to 1)
   */
  async submitDoc(params: { doctype: string; name: string }): Promise<any> {
    const { doctype, name } = params;

    const response = await this.client.post(`/api/method/frappe.client.submit`, {
      doc: { doctype, name },
    });

    return {
      success: true,
      doctype,
      name,
      docstatus: 1,
    };
  }

  /**
   * Cancel document (change docstatus to 2)
   */
  async cancelDoc(params: { doctype: string; name: string }): Promise<any> {
    const { doctype, name } = params;

    const response = await this.client.post(`/api/method/frappe.client.cancel`, {
      doc: { doctype, name },
    });

    return {
      success: true,
      doctype,
      name,
      docstatus: 2,
    };
  }

  /**
   * Run ERPNext report
   */
  async runReport(params: {
    report_name: string;
    filters?: Record<string, any>;
  }): Promise<any> {
    const { report_name, filters = {} } = params;

    const response = await this.client.post('/api/method/frappe.desk.query_report.run', {
      report_name,
      filters,
    });

    return {
      columns: response.data.message.columns,
      data: response.data.message.result,
      report_name,
    };
  }

  /**
   * Bulk update with batch size limit
   */
  async bulkUpdate(params: {
    doctype: string;
    names: string[];
    data: Record<string, any>;
    batchSize?: number;
  }): Promise<any> {
    const { doctype, names, data, batchSize = 50 } = params;

    // Enforce batch size limit (FR-019)
    if (names.length > batchSize) {
      throw new Error(`Batch size limit exceeded. Maximum ${batchSize} documents allowed.`);
    }

    const results = [];
    const errors = [];

    for (const name of names) {
      try {
        const result = await this.updateDoc({ doctype, name, data });
        results.push(result);
      } catch (error: any) {
        errors.push({
          name,
          error: error.message,
        });
      }
    }

    return {
      success_count: results.length,
      error_count: errors.length,
      results,
      errors,
    };
  }

  /**
   * Execute custom Frappe method
   */
  async callMethod(params: {
    method: string;
    args?: Record<string, any>;
  }): Promise<any> {
    const { method, args = {} } = params;

    const response = await this.client.post(`/api/method/${method}`, args);

    return response.data.message;
  }

  /**
   * Clean up old idempotency cache entries
   */
  cleanupCache(): void {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const [key, value] of Object.entries(this.idempotencyCache)) {
      if (now - value.timestamp > maxAge) {
        delete this.idempotencyCache[key];
      }
    }
  }
}

/**
 * Factory function to create authenticated client with session token
 */
export function createFrappeClient(
  baseURL: string,
  sessionToken: string,
  rateLimit?: number
): FrappeAPIClient {
  return new FrappeAPIClient(baseURL, { sessionToken }, rateLimit);
}

/**
 * Factory function to create authenticated client with API key:secret
 * Recommended for server-to-server integration (Frappe v15+)
 */
export function createFrappeClientWithAPIKey(
  baseURL: string,
  apiKey: string,
  apiSecret: string,
  rateLimit?: number
): FrappeAPIClient {
  return new FrappeAPIClient(baseURL, { apiKey, apiSecret }, rateLimit);
}
