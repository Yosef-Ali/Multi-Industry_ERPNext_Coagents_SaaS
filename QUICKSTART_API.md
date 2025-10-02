# 🚀 Quick Start: Updated API Client

**For**: Developers working on Multi-Industry ERPNext Coagents SaaS  
**Updated**: January 2025

---

## TL;DR

API client now supports Frappe v15+ authentication. Use this:

```typescript
import { createFrappeClientWithAPIKey } from './api';

const client = createFrappeClientWithAPIKey(
  process.env.ERPNEXT_BASE_URL || '',
  process.env.ERPNEXT_API_KEY || '',
  process.env.ERPNEXT_API_SECRET || ''
);
```

---

## Setup (5 Minutes)

### 1. Generate API Keys in ERPNext

```bash
# Login to your ERPNext instance
# Go to: User List → Administrator → API Access
# Click: "Generate Keys"
# Copy: API Key and API Secret (shown only once!)
```

### 2. Set Environment Variables

**Local Development** (`.env`):
```bash
ERPNEXT_BASE_URL=http://localhost:8080
ERPNEXT_API_KEY=abc123xyz789
ERPNEXT_API_SECRET=def456uvw012
```

**Production** (Cloudflare Workers):
```bash
cd services/agent-gateway
pnpm dlx wrangler secret put ERPNEXT_BASE_URL
pnpm dlx wrangler secret put ERPNEXT_API_KEY
pnpm dlx wrangler secret put ERPNEXT_API_SECRET
```

---

## Usage Examples

### Basic Usage

```typescript
import { createFrappeClientWithAPIKey } from '../src/api';

// Create client
const client = createFrappeClientWithAPIKey(
  'https://your-erpnext.com',
  'your_api_key',
  'your_api_secret',
  10 // optional: rate limit (requests per second)
);

// Search documents
const customers = await client.searchDoc({
  doctype: 'Customer',
  filters: { customer_group: 'Commercial' },
  fields: ['name', 'customer_name', 'territory'],
  limit: 20
});

console.log(customers.documents);
```

### Get Single Document

```typescript
const customer = await client.getDoc({
  doctype: 'Customer',
  name: 'CUST-00001'
});

console.log(customer.document);
```

### Create Document

```typescript
const newCustomer = await client.createDoc({
  doctype: 'Customer',
  data: {
    customer_name: 'John Doe',
    customer_type: 'Individual',
    territory: 'United States'
  }
});

console.log('Created:', newCustomer.name);
```

### Update Document

```typescript
const updated = await client.updateDoc({
  doctype: 'Customer',
  name: 'CUST-00001',
  data: {
    mobile_no: '+1234567890',
    email_id: 'john@example.com'
  }
});

console.log('Updated:', updated.name);
```

### Submit Document

```typescript
const submitted = await client.submitDoc({
  doctype: 'Sales Order',
  name: 'SO-00001'
});

console.log('Submitted:', submitted.name);
```

### Run Report

```typescript
const report = await client.runReport({
  report_name: 'Sales Analytics',
  filters: {
    from_date: '2024-01-01',
    to_date: '2024-12-31',
    company: 'My Company'
  }
});

console.log('Columns:', report.columns);
console.log('Data:', report.data);
```

### Bulk Update

```typescript
const results = await client.bulkUpdate({
  doctype: 'Customer',
  names: ['CUST-00001', 'CUST-00002', 'CUST-00003'],
  data: {
    customer_group: 'VIP'
  },
  batchSize: 50 // optional: default 50
});

console.log('Success:', results.success_count);
console.log('Errors:', results.error_count);
```

### Custom Method Call

```typescript
const result = await client.callMethod({
  method: 'erpnext.selling.doctype.sales_order.sales_order.make_sales_invoice',
  args: {
    source_name: 'SO-00001'
  }
});

console.log('Invoice created:', result);
```

---

## Advanced Features

### Rate Limiting

Built-in rate limiter prevents overwhelming ERPNext:

```typescript
// Limit to 5 requests per second
const client = createFrappeClientWithAPIKey(
  baseURL,
  apiKey,
  apiSecret,
  5 // <-- rate limit
);

// Client automatically waits if rate limit exceeded
// Uses token bucket algorithm for smooth distribution
```

### Idempotency

Prevent duplicate operations with idempotency keys:

```typescript
const idempotencyKey = 'order-123-create';

// First call: creates document
const order1 = await client.createDoc({
  doctype: 'Sales Order',
  data: orderData,
  idempotencyKey
});

// Second call: returns cached result (no duplicate)
const order2 = await client.createDoc({
  doctype: 'Sales Order',
  data: orderData,
  idempotencyKey // same key
});

console.log(order1.name === order2.name); // true
console.log(order2.from_cache); // true
```

### Error Handling

```typescript
try {
  const doc = await client.getDoc({
    doctype: 'Customer',
    name: 'INVALID-NAME'
  });
} catch (error) {
  if (error.response?.status === 404) {
    console.log('Document not found');
  } else if (error.response?.status === 401) {
    console.log('Authentication failed');
  } else {
    console.log('Error:', error.message);
  }
}
```

---

## In Tools

Tools automatically receive a client instance:

```typescript
// services/agent-gateway/src/tools/common/search_doc.ts
import { FrappeAPIClient } from '../../api';

export async function handler(
  input: any,
  client: FrappeAPIClient, // <-- Injected by registry
  userId: string,
  sessionId: string
) {
  // Use the client
  const result = await client.searchDoc({
    doctype: input.doctype,
    filters: input.filters,
    limit: input.limit || 20
  });

  return result;
}
```

**No changes needed in tools!** They remain authentication-agnostic.

---

## Migration from Old Code

### Before (Session Token)

```typescript
import { createFrappeClient } from './api';

const client = createFrappeClient(
  baseURL,
  sessionToken
);
```

### After (API Key - Recommended)

```typescript
import { createFrappeClientWithAPIKey } from './api';

const client = createFrappeClientWithAPIKey(
  baseURL,
  apiKey,
  apiSecret
);
```

**Note**: Old code still works! Fully backward compatible.

---

## Testing

### Unit Test

```typescript
import { createFrappeClientWithAPIKey } from '../src/api';

describe('API Client', () => {
  it('should authenticate with API key', async () => {
    const client = createFrappeClientWithAPIKey(
      'https://demo.erpnext.com',
      'test_key',
      'test_secret'
    );

    const result = await client.searchDoc({
      doctype: 'Company',
      limit: 1
    });

    expect(result.documents).toBeDefined();
  });
});
```

### Integration Test

```typescript
describe('API Integration', () => {
  let client: FrappeAPIClient;

  beforeAll(() => {
    client = createFrappeClientWithAPIKey(
      process.env.ERPNEXT_BASE_URL || '',
      process.env.ERPNEXT_API_KEY || '',
      process.env.ERPNEXT_API_SECRET || ''
    );
  });

  it('should create and retrieve customer', async () => {
    // Create
    const created = await client.createDoc({
      doctype: 'Customer',
      data: {
        customer_name: 'Test Customer',
        customer_type: 'Individual'
      }
    });

    // Retrieve
    const retrieved = await client.getDoc({
      doctype: 'Customer',
      name: created.name
    });

    expect(retrieved.document.customer_name).toBe('Test Customer');
  });
});
```

---

## Troubleshooting

### Error: "401 Unauthorized"

**Solution**: Check API credentials
```bash
# Verify secrets are set
cd services/agent-gateway
pnpm dlx wrangler secret list

# Re-set if needed
pnpm dlx wrangler secret put ERPNEXT_API_KEY
pnpm dlx wrangler secret put ERPNEXT_API_SECRET
```

### Error: "Rate limit exceeded"

**Solution**: Increase rate limit
```typescript
const client = createFrappeClientWithAPIKey(
  baseURL,
  apiKey,
  apiSecret,
  20 // <-- increase from 10 to 20
);
```

### Error: "Network timeout"

**Solution**: Check ERPNext is reachable
```bash
# Test connection
curl https://your-erpnext.com/api/method/ping

# Check if Workers can reach it
# May need to whitelist Cloudflare IPs
```

---

## Best Practices

### ✅ Do

- Use API key:secret for server-to-server (our case)
- Store credentials in Wrangler secrets (production)
- Use `.env` file for local development (never commit!)
- Set reasonable rate limits (10-20 req/sec)
- Handle errors gracefully
- Use idempotency keys for write operations
- Clean up idempotency cache periodically

### ❌ Don't

- Don't commit API keys to git
- Don't use admin credentials for API access
- Don't skip rate limiting
- Don't ignore authentication errors
- Don't log API secrets
- Don't reuse keys across environments

---

## Quick Reference

### Factory Functions

```typescript
// API Key + Secret (recommended)
createFrappeClientWithAPIKey(baseURL, apiKey, apiSecret, rateLimit?)

// Session Token (for user sessions)
createFrappeClient(baseURL, sessionToken, rateLimit?)
```

### Client Methods

```typescript
client.searchDoc(params)      // Search documents
client.getDoc(params)          // Get single document
client.createDoc(params)       // Create document
client.updateDoc(params)       // Update document
client.submitDoc(params)       // Submit document (docstatus=1)
client.cancelDoc(params)       // Cancel document (docstatus=2)
client.runReport(params)       // Run ERPNext report
client.bulkUpdate(params)      // Bulk update documents
client.callMethod(params)      // Call custom method
client.cleanupCache()          // Clean idempotency cache
```

---

## Resources

- **API Client Code**: `services/agent-gateway/src/api.ts`
- **Detailed Guide**: `API_CLIENT_UPDATE.md`
- **Integration Patterns**: `FRAPPE_ERPNEXT_INTEGRATION.md`
- **Deployment**: `CLOUDFLARE_DEPLOYMENT.md`
- **Frappe Docs**: https://frappeframework.com/docs/user/en/api

---

**Ready to use!** 🚀

Just set your API credentials and start making calls to ERPNext.
