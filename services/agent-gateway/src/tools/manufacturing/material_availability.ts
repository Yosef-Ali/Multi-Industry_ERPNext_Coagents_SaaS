/**
 * T065: material_availability tool - Manufacturing industry
 * Check material availability across warehouses for production planning
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const MaterialAvailabilityInputSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  required_qty: z.number().positive('Required quantity must be positive'),
  warehouse: z.string().optional(),
});

export type MaterialAvailabilityInput = z.infer<typeof MaterialAvailabilityInputSchema>;

export interface MaterialAvailabilityResult {
  available_qty: number;
  warehouses: Array<{
    warehouse: string;
    actual_qty: number;
    reserved_qty: number;
    available_qty: number;
  }>;
  item_code: string;
  required_qty: number;
  is_available: boolean;
  shortfall_qty: number;
  requires_approval: false;
}

/**
 * Check material availability across warehouses
 * ✅ No approval required (read-only operation)
 */
export async function material_availability(
  input: MaterialAvailabilityInput,
  client: FrappeAPIClient
): Promise<MaterialAvailabilityResult> {
  // Validate input
  const validated = MaterialAvailabilityInputSchema.parse(input);

  // Build filters for stock levels
  const filters: any = {
    item_code: validated.item_code,
  };

  if (validated.warehouse) {
    filters.warehouse = validated.warehouse;
  }

  // Query stock balance for the item across warehouses
  const stockResult = await client.searchDoc({
    doctype: 'Bin',
    filters,
    fields: ['warehouse', 'actual_qty', 'reserved_qty', 'projected_qty', 'item_code'],
  });

  // Process warehouse stock levels
  const warehouses = stockResult.documents.map((bin: any) => ({
    warehouse: bin.warehouse,
    actual_qty: parseFloat(bin.actual_qty) || 0,
    reserved_qty: parseFloat(bin.reserved_qty) || 0,
    available_qty: Math.max(0, parseFloat(bin.actual_qty) - parseFloat(bin.reserved_qty)),
  }));

  // Calculate total available quantity
  const totalAvailableQty = warehouses.reduce(
    (sum, wh) => sum + wh.available_qty,
    0
  );

  // Determine if sufficient material is available
  const isAvailable = totalAvailableQty >= validated.required_qty;
  const shortfallQty = Math.max(0, validated.required_qty - totalAvailableQty);

  return {
    available_qty: totalAvailableQty,
    warehouses,
    item_code: validated.item_code,
    required_qty: validated.required_qty,
    is_available: isAvailable,
    shortfall_qty: shortfallQty,
    requires_approval: false,
  };
}

// Tool metadata for registry
export const material_availability_tool = {
  name: 'material_availability',
  description: 'Check material availability across warehouses for production planning',
  inputSchema: MaterialAvailabilityInputSchema,
  handler: material_availability,
  requires_approval: false,
  operation_type: 'read' as const,
  industry: 'manufacturing',
};
