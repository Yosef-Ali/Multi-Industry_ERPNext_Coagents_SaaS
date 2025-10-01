/**
 * T060: room_availability tool - Hotel industry
 * Check available rooms for date range and guest count
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const RoomAvailabilityInputSchema = z.object({
  check_in: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  check_out: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  guest_count: z.number().int().positive().optional(),
  room_type: z.string().optional(),
});

export type RoomAvailabilityInput = z.infer<typeof RoomAvailabilityInputSchema>;

export interface RoomAvailabilityResult {
  available_rooms: Array<{
    room_number: string;
    room_type: string;
    rate: number;
    capacity: number;
    amenities: string[];
  }>;
  total_available: number;
  check_in: string;
  check_out: string;
  requires_approval: false;
}

/**
 * Query available rooms for specified date range
 * ✅ No approval required (read-only operation)
 */
export async function room_availability(
  input: RoomAvailabilityInput,
  client: FrappeAPIClient
): Promise<RoomAvailabilityResult> {
  // Validate input
  const validated = RoomAvailabilityInputSchema.parse(input);

  // Build filters for available rooms
  const filters: any = {
    status: 'Available',
  };

  if (validated.room_type) {
    filters.room_type = validated.room_type;
  }

  if (validated.guest_count) {
    filters.capacity = ['>=', validated.guest_count];
  }

  // Search for rooms
  const roomsResult = await client.searchDoc({
    doctype: 'Room',
    filters,
    fields: ['name', 'room_type', 'rate', 'capacity', 'amenities'],
  });

  // Check reservations for date overlap
  const reservationsResult = await client.searchDoc({
    doctype: 'Reservation',
    filters: {
      check_in: ['<=', validated.check_out],
      check_out: ['>=', validated.check_in],
      status: ['!=', 'Cancelled'],
    },
    fields: ['room_number'],
  });

  // Extract reserved room numbers
  const reservedRooms = new Set(
    reservationsResult.documents.map((r: any) => r.room_number)
  );

  // Filter out reserved rooms
  const availableRooms = roomsResult.documents
    .filter((room: any) => !reservedRooms.has(room.name))
    .map((room: any) => ({
      room_number: room.name,
      room_type: room.room_type,
      rate: room.rate,
      capacity: room.capacity,
      amenities: room.amenities || [],
    }));

  return {
    available_rooms: availableRooms,
    total_available: availableRooms.length,
    check_in: validated.check_in,
    check_out: validated.check_out,
    requires_approval: false,
  };
}

// Tool metadata for registry
export const room_availability_tool = {
  name: 'room_availability',
  description: 'Check available hotel rooms for specified date range and guest count',
  inputSchema: RoomAvailabilityInputSchema,
  handler: room_availability,
  requires_approval: false,
  operation_type: 'read' as const,
  industry: 'hotel',
};
