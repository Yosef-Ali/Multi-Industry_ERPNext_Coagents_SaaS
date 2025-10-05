/**
 * T067: inventory_check tool - Retail industry
 * Check inventory levels across store locations for retail operations
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const InventoryCheckInputSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  warehouse: z.string().optional(),
  min_qty_threshold: z.number().optional(),
});

export type InventoryCheckInput = z.infer<typeof InventoryCheckInputSchema>;

export interface InventoryCheckResult {
  stock_level: number;
  locations: Array<{
    warehouse: string;
    actual_qty: number;
    reserved_qty: number;
    available_qty: number;
    reorder_level?: number;
    is_below_threshold: boolean;
  }>;
  item_code: string;
  total_available: number;
  low_stock_locations: number;
  requires_approval: false;
}

/**
 * Check inventory levels across store locations
 * ✅ No approval required (read-only operation)
 */
export async function inventory_check(
  input: InventoryCheckInput,
  client: FrappeAPIClient
): Promise<InventoryCheckResult> {
  // Validate input
  const validated = InventoryCheckInputSchema.parse(input);

  // Build filters for stock levels
  const filters: any = {
    item_code: validated.item_code,
  };

  if (validated.warehouse) {
    filters.warehouse = validated.warehouse;
  }

  // Query stock balance across warehouses
  const stockResult = await client.searchDoc({
    doctype: 'Bin',
    filters,
    fields: ['warehouse', 'actual_qty', 'reserved_qty', 'projected_qty', 'item_code'],
  });

  // Get reorder levels for warehouses if available
  const reorderResult = await client.searchDoc({
    doctype: 'Item Reorder',
    filters: {
      parent: validated.item_code,
    },
    fields: ['warehouse', 'warehouse_reorder_level'],
  }).catch(() => ({ documents: [] })); // Gracefully handle if Item Reorder doesn't exist

  // Create reorder level map
  const reorderLevelMap = new Map<string, number>();
  for (const reorder of reorderResult.documents) {
    reorderLevelMap.set(reorder.warehouse, parseFloat(reorder.warehouse_reorder_level) || 0);
  }

  // Use minimum quantity threshold from input or reorder level
  const minThreshold = validated.min_qty_threshold || 0;

  // Process warehouse stock levels
  const locations = stockResult.documents.map((bin: any) => {
    const actualQty = parseFloat(bin.actual_qty) || 0;
    const reservedQty = parseFloat(bin.reserved_qty) || 0;
    const availableQty = Math.max(0, actualQty - reservedQty);
    const reorderLevel = reorderLevelMap.get(bin.warehouse);

    // Determine if below threshold (use reorder level if available, else min_qty_threshold)
    const threshold = reorderLevel !== undefined ? reorderLevel : minThreshold;
    const isBelowThreshold = availableQty < threshold;

    return {
      warehouse: bin.warehouse,
      actual_qty: actualQty,
      reserved_qty: reservedQty,
      available_qty: availableQty,
      ...(reorderLevel !== undefined && { reorder_level: reorderLevel }),
      is_below_threshold: isBelowThreshold,
    };
  });

  // Calculate totals
  const totalStockLevel = locations.reduce((sum, loc) => sum + loc.actual_qty, 0);
  const totalAvailable = locations.reduce((sum, loc) => sum + loc.available_qty, 0);
  const lowStockLocations = locations.filter(loc => loc.is_below_threshold).length;

  return {
    stock_level: totalStockLevel,
    locations,
    item_code: validated.item_code,
    total_available: totalAvailable,
    low_stock_locations: lowStockLocations,
    requires_approval: false,
  };
}

// Tool metadata for registry
export const inventory_check_tool = {
  name: 'inventory_check',
  description: 'Check inventory levels across store locations for retail operations',
  inputSchema: InventoryCheckInputSchema,
  handler: inventory_check,
  requires_approval: false,
  operation_type: 'read' as const,
  industry: 'retail',
};
