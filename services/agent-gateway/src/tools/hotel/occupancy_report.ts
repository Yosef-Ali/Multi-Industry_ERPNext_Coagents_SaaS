/**
 * T061: occupancy_report tool - Hotel industry
 * Generate occupancy metrics: occupancy rate, ADR, RevPAR
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const OccupancyReportInputSchema = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  room_type: z.string().optional(),
});

export type OccupancyReportInput = z.infer<typeof OccupancyReportInputSchema>;

export interface OccupancyReportResult {
  occupancy_rate: number; // Percentage
  adr: number; // Average Daily Rate
  revpar: number; // Revenue Per Available Room
  total_rooms: number;
  total_nights: number;
  occupied_room_nights: number;
  total_revenue: number;
  from_date: string;
  to_date: string;
  requires_approval: false;
}

/**
 * Calculate occupancy metrics for date range
 * Metrics: Occupancy Rate, ADR (Average Daily Rate), RevPAR (Revenue Per Available Room)
 * ✅ No approval required (read-only operation)
 */
export async function occupancy_report(
  input: OccupancyReportInput,
  client: FrappeAPIClient
): Promise<OccupancyReportResult> {
  // Validate input
  const validated = OccupancyReportInputSchema.parse(input);

  // Get total rooms
  const roomFilters: any = {};
  if (validated.room_type) {
    roomFilters.room_type = validated.room_type;
  }

  const roomsResult = await client.searchDoc({
    doctype: 'Room',
    filters: roomFilters,
    fields: ['name'],
  });

  const totalRooms = roomsResult.total;

  // Get reservations in date range
  const reservationsResult = await client.searchDoc({
    doctype: 'Reservation',
    filters: {
      check_in: ['<=', validated.to_date],
      check_out: ['>=', validated.from_date],
      status: ['!=', 'Cancelled'],
      ...(validated.room_type ? { room_type: validated.room_type } : {}),
    },
    fields: ['check_in', 'check_out', 'total_amount', 'room_number'],
  });

  // Calculate metrics
  const fromDate = new Date(validated.from_date);
  const toDate = new Date(validated.to_date);
  const totalNights = Math.ceil(
    (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  let occupiedRoomNights = 0;
  let totalRevenue = 0;

  for (const reservation of reservationsResult.documents) {
    const checkIn = new Date(Math.max(new Date(reservation.check_in).getTime(), fromDate.getTime()));
    const checkOut = new Date(Math.min(new Date(reservation.check_out).getTime(), toDate.getTime()));

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));

    if (nights > 0) {
      occupiedRoomNights += nights;
      totalRevenue += reservation.total_amount || 0;
    }
  }

  // Calculate KPIs
  const availableRoomNights = totalRooms * totalNights;
  const occupancyRate = availableRoomNights > 0
    ? (occupiedRoomNights / availableRoomNights) * 100
    : 0;

  const adr = occupiedRoomNights > 0
    ? totalRevenue / occupiedRoomNights
    : 0;

  const revpar = availableRoomNights > 0
    ? totalRevenue / availableRoomNights
    : 0;

  return {
    occupancy_rate: parseFloat(occupancyRate.toFixed(2)),
    adr: parseFloat(adr.toFixed(2)),
    revpar: parseFloat(revpar.toFixed(2)),
    total_rooms: totalRooms,
    total_nights: totalNights,
    occupied_room_nights: occupiedRoomNights,
    total_revenue: totalRevenue,
    from_date: validated.from_date,
    to_date: validated.to_date,
    requires_approval: false,
  };
}

// Tool metadata for registry
export const occupancy_report_tool = {
  name: 'occupancy_report',
  description: 'Generate hotel occupancy metrics: occupancy rate, ADR, RevPAR',
  inputSchema: OccupancyReportInputSchema,
  handler: occupancy_report,
  requires_approval: false,
  operation_type: 'read' as const,
  industry: 'hotel',
};
