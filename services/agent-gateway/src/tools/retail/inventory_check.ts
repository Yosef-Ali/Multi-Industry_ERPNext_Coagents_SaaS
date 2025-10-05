/**
 * T089: inventory_check tool - Check stock levels across store locations
 * Retail vertical - Multi-location inventory visibility
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const InventoryCheckInputSchema = z.object({
  item_code: z.string().optional().describe('Specific item to check. If not provided, shows top items'),
  item_group: z.string().optional().describe('Filter by item group (e.g., "Electronics", "Clothing")'),
  stores: z.array(z.string()).optional().describe('Specific store warehouses to check'),
  show_out_of_stock: z.boolean().default(false).describe('Include items with zero stock'),
  limit: z.number().positive().max(100).default(20).describe('Maximum number of items to return'),
});

export type InventoryCheckInput = z.infer<typeof InventoryCheckInputSchema>;

export interface StoreStock {
  warehouse: string;
  warehouse_name: string;
  actual_qty: number;
  reserved_qty: number;
  available_qty: number;
  reorder_level?: number;
  reorder_qty?: number;
}

export interface InventoryItem {
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  total_available: number;
  total_reserved: number;
  total_actual: number;
  stores: StoreStock[];
  needs_reorder: boolean;
  valuation_rate?: number;
  total_value?: number;
}

export interface InventoryCheckResult {
  items: InventoryItem[];
  total_items: number;
  stores_checked: string[];
  out_of_stock_count: number;
  low_stock_count: number;
  execution_time_ms: number;
}

/**
 * Check inventory levels across retail stores
 * Read-only operation - no approval required
 */
export async function inventory_check(
  input: InventoryCheckInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<InventoryCheckResult> {
  const startTime = Date.now();

  // Validate input
  const validated = InventoryCheckInputSchema.parse(input);

  try {
    // Build filters for items
    const itemFilters: Record<string, any> = {};
    
    if (validated.item_code) {
      itemFilters.name = validated.item_code;
    }
    
    if (validated.item_group) {
      itemFilters.item_group = validated.item_group;
    }

    // Get items
    const itemsResponse = await client.call<any[]>({
      method: 'frappe.client.get_list',
      params: {
        doctype: 'Item',
        filters: itemFilters,
        fields: ['name', 'item_name', 'item_group', 'stock_uom', 'valuation_rate'],
        limit_page_length: validated.limit
      }
    });

    const items: InventoryItem[] = [];
    let outOfStockCount = 0;
    let lowStockCount = 0;
    const storesChecked = new Set<string>();

    for (const item of itemsResponse) {
      // Build bin filters
      const binFilters: Record<string, any> = {
        item_code: item.name,
      };

      if (validated.stores && validated.stores.length > 0) {
        binFilters.warehouse = ['in', validated.stores];
      }

      // Get stock from all stores (Bin doctype tracks warehouse-level stock)
      const binResponse = await client.call<any[]>({
        method: 'frappe.client.get_list',
        params: {
          doctype: 'Bin',
          filters: binFilters,
          fields: [
            'warehouse',
            'actual_qty',
            'reserved_qty',
            'reorder_level',
            'reorder_qty',
            'valuation_rate'
          ],
          limit_page_length: 500
        }
      });

      // Get warehouse names
      const warehouseNames: Record<string, string> = {};
      if (binResponse.length > 0) {
        const warehouseIds = binResponse.map(b => b.warehouse);
        const warehousesResponse = await client.call<any[]>({
          method: 'frappe.client.get_list',
          params: {
            doctype: 'Warehouse',
            filters: { name: ['in', warehouseIds] },
            fields: ['name', 'warehouse_name'],
            limit_page_length: 500
          }
        });
        
        warehousesResponse.forEach(w => {
          warehouseNames[w.name] = w.warehouse_name || w.name;
        });
      }

      // Calculate totals and build store list
      let totalActual = 0;
      let totalReserved = 0;
      let totalAvailable = 0;
      let needsReorder = false;
      const stores: StoreStock[] = [];

      for (const bin of binResponse) {
        const actualQty = bin.actual_qty || 0;
        const reservedQty = bin.reserved_qty || 0;
        const availableQty = actualQty - reservedQty;

        totalActual += actualQty;
        totalReserved += reservedQty;
        totalAvailable += availableQty;

        storesChecked.add(bin.warehouse);

        // Check reorder level
        if (bin.reorder_level && availableQty <= bin.reorder_level) {
          needsReorder = true;
        }

        stores.push({
          warehouse: bin.warehouse,
          warehouse_name: warehouseNames[bin.warehouse] || bin.warehouse,
          actual_qty: actualQty,
          reserved_qty: reservedQty,
          available_qty: availableQty,
          reorder_level: bin.reorder_level,
          reorder_qty: bin.reorder_qty,
        });
      }

      // Skip if out of stock and not requested
      if (totalActual === 0 && !validated.show_out_of_stock) {
        continue;
      }

      if (totalActual === 0) {
        outOfStockCount++;
      } else if (needsReorder) {
        lowStockCount++;
      }

      const totalValue = item.valuation_rate ? item.valuation_rate * totalActual : undefined;

      items.push({
        item_code: item.name,
        item_name: item.item_name,
        item_group: item.item_group,
        stock_uom: item.stock_uom,
        total_actual: totalActual,
        total_reserved: totalReserved,
        total_available: totalAvailable,
        stores,
        needs_reorder: needsReorder,
        valuation_rate: item.valuation_rate,
        total_value: totalValue,
      });
    }

    const result: InventoryCheckResult = {
      items,
      total_items: items.length,
      stores_checked: Array.from(storesChecked),
      out_of_stock_count: outOfStockCount,
      low_stock_count: lowStockCount,
      execution_time_ms: Date.now() - startTime,
    };

    return result;
  } catch (error: any) {
    throw new Error(`Failed to check inventory: ${error.message}`);
  }
}
