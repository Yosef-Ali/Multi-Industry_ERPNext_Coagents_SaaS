/**
 * Contract Tests for Manufacturing-Specific Tools
 */

import { describe, it, expect } from '@jest/globals';

describe('material_availability tool contract', () => {
  it('should check material availability across warehouses', async () => {
    const { material_availability } = await import(
      '../../src/tools/manufacturing/material_availability'
    );

    const result = await material_availability({
      item_code: 'MAT-001',
      required_qty: 100,
    });

    expect(result).toHaveProperty('available_qty');
    expect(result).toHaveProperty('warehouses');
  });
});

describe('bom_explosion tool contract', () => {
  it('should explode BOM to show component requirements', async () => {
    const { bom_explosion } = await import('../../src/tools/manufacturing/bom_explosion');

    const result = await bom_explosion({
      item_code: 'FG-001',
      quantity: 10,
    });

    expect(result).toHaveProperty('components');
    expect(Array.isArray(result.components)).toBe(true);
  });
});
