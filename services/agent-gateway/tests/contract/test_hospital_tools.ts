/**
 * Contract Tests for Hospital-Specific Tools
 */

import { describe, it, expect } from '@jest/globals';

describe('create_order_set tool contract', () => {
  it('should create linked orders and require approval', async () => {
    const { create_order_set } = await import('../../src/tools/hospital/create_order_set');

    const result = await create_order_set({
      patient: 'PAT-001',
      protocol: 'sepsis',
      orders: [
        { type: 'Lab', name: 'CBC' },
        { type: 'Medication', name: 'Ceftriaxone', dosage: '2g IV' },
      ],
    });

    expect(result).toHaveProperty('requires_approval', true);
    expect(result).toHaveProperty('order_count');
  });
});

describe('census_report tool contract', () => {
  it('should return daily census by ward', async () => {
    const { census_report } = await import('../../src/tools/hospital/census_report');

    const result = await census_report({ date: '2024-01-15' });

    expect(result).toHaveProperty('census_data');
    expect(Array.isArray(result.census_data)).toBe(true);
  });
});

describe('ar_by_payer tool contract', () => {
  it('should return accounts receivable by payer', async () => {
    const { ar_by_payer } = await import('../../src/tools/hospital/ar_by_payer');

    const result = await ar_by_payer({ as_of_date: '2024-01-31' });

    expect(result).toHaveProperty('ar_summary');
    expect(Array.isArray(result.ar_summary)).toBe(true);
  });
});
