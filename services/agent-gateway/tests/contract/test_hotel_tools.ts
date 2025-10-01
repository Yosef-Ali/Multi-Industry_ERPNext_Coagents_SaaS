/**
 * Contract Tests for Hotel-Specific Tools
 * CRITICAL: These tests MUST FAIL until implementation is complete (TDD)
 */

import { describe, it, expect } from '@jest/globals';

describe('room_availability tool contract', () => {
  it('should return available rooms for date range', async () => {
    const { room_availability } = await import('../../src/tools/hotel/room_availability');

    const result = await room_availability({
      check_in: '2024-01-15',
      check_out: '2024-01-20',
      guest_count: 2,
      room_type: 'Deluxe',
    });

    expect(result).toHaveProperty('available_rooms');
    expect(Array.isArray(result.available_rooms)).toBe(true);
    expect(result.available_rooms[0]).toHaveProperty('room_number');
    expect(result.available_rooms[0]).toHaveProperty('room_type');
    expect(result.available_rooms[0]).toHaveProperty('rate');
  });

  it('should not require approval (read-only)', async () => {
    const { room_availability } = await import('../../src/tools/hotel/room_availability');

    const result = await room_availability({
      check_in: '2024-01-15',
      check_out: '2024-01-20',
      guest_count: 2,
    });

    expect(result).not.toHaveProperty('requires_approval');
  });
});

describe('occupancy_report tool contract', () => {
  it('should return ADR and RevPAR metrics', async () => {
    const { occupancy_report } = await import('../../src/tools/hotel/occupancy_report');

    const result = await occupancy_report({
      from_date: '2024-01-01',
      to_date: '2024-01-31',
    });

    expect(result).toHaveProperty('occupancy_rate');
    expect(result).toHaveProperty('adr'); // Average Daily Rate
    expect(result).toHaveProperty('revpar'); // Revenue Per Available Room
    expect(typeof result.occupancy_rate).toBe('number');
    expect(typeof result.adr).toBe('number');
    expect(typeof result.revpar).toBe('number');
  });
});
