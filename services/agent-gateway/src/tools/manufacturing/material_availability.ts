/**
 * T087: material_availability tool - Check stock availability across warehouses
 * Manufacturing vertical - Material planning and stock verification
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const MaterialAvailabilityInputSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  warehouses: z.array(z.string()).optional().describe('Specific warehouses to check. If not provided, checks all warehouses'),
  required_qty: z.number().positive().optional().describe('Required quantity to validate against available stock'),
  uom: z.string().optional().describe('Unit of measure'),
});

export type MaterialAvailabilityInput = z.infer<typeof MaterialAvailabilityInputSchema>;

export interface StockBalance {
  warehouse: string;
  actual_qty: number;
  reserved_qty: number;
  available_qty: number;
  uom: string;
}

export interface MaterialAvailabilityResult {
  item_code: string;
  item_name: string;
  stock_uom: string;
  total_available: number;
  warehouses: StockBalance[];
  sufficient_stock: boolean;
  required_qty?: number;
  shortfall?: number;
  execution_time_ms: number;
}

/**
 * Check material availability across warehouses
 * Read-only operation - no approval required
 */
export async function material_availability(
  input: MaterialAvailabilityInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<MaterialAvailabilityResult> {
  const startTime = Date.now();

  // Validate input
  const validated = MaterialAvailabilityInputSchema.parse(input);

  try {
    // Get item details first
    const itemResponse = await client.call<any>({
      method: 'frappe.client.get',
      params: {
        doctype: 'Item',
        name: validated.item_code,
        fields: ['name', 'item_name', 'stock_uom']
      }
    });

    const item = itemResponse;

    // Get stock balance using Frappe's standard method
    const stockBalanceResponse = await client.call<any>({
      method: 'erpnext.stock.utils.get_stock_balance',
      params: {
        item_code: validated.item_code,
        warehouse: validated.warehouses?.join(','), // Comma-separated for multiple warehouses
        with_valuation_rate: false,
      }
    });

    // If specific warehouses requested, filter
    let stockData: StockBalance[] = [];
    
    if (validated.warehouses && validated.warehouses.length > 0) {
      // Check each warehouse individually
      for (const warehouse of validated.warehouses) {
        const whStockResponse = await client.call<any>({
          method: 'erpnext.stock.utils.get_stock_balance',
          params: {
            item_code: validated.item_code,
            warehouse: warehouse,
            with_valuation_rate: false,
          }
        });

        // Get reserved quantity
        const reservedResponse = await client.call<any>({
          method: 'frappe.client.get_list',
          params: {
            doctype: 'Bin',
            filters: {
              item_code: validated.item_code,
              warehouse: warehouse,
            },
            fields: ['reserved_qty', 'actual_qty'],
            limit_page_length: 1
          }
        });

        const binData = reservedResponse.length > 0 ? reservedResponse[0] : null;
        const actualQty = binData?.actual_qty || 0;
        const reservedQty = binData?.reserved_qty || 0;
        const availableQty = actualQty - reservedQty;

        stockData.push({
          warehouse,
          actual_qty: actualQty,
          reserved_qty: reservedQty,
          available_qty: availableQty,
          uom: item.stock_uom,
        });
      }
    } else {
      // Get all warehouses with stock
      const binsResponse = await client.call<any[]>({
        method: 'frappe.client.get_list',
        params: {
          doctype: 'Bin',
          filters: {
            item_code: validated.item_code,
          },
          fields: ['warehouse', 'actual_qty', 'reserved_qty'],
          limit_page_length: 500
        }
      });

      stockData = binsResponse.map(bin => ({
        warehouse: bin.warehouse,
        actual_qty: bin.actual_qty || 0,
        reserved_qty: bin.reserved_qty || 0,
        available_qty: (bin.actual_qty || 0) - (bin.reserved_qty || 0),
        uom: item.stock_uom,
      }));
    }

    // Calculate totals
    const totalAvailable = stockData.reduce((sum, w) => sum + w.available_qty, 0);

    // Check if sufficient
    const requiredQty = validated.required_qty || 0;
    const sufficient = requiredQty <= totalAvailable;
    const shortfall = requiredQty > 0 && !sufficient ? requiredQty - totalAvailable : undefined;

    const result: MaterialAvailabilityResult = {
      item_code: validated.item_code,
      item_name: item.item_name,
      stock_uom: item.stock_uom,
      total_available: totalAvailable,
      warehouses: stockData.filter(w => w.available_qty > 0), // Only show warehouses with stock
      sufficient_stock: sufficient,
      required_qty: validated.required_qty,
      shortfall,
      execution_time_ms: Date.now() - startTime,
    };

    return result;
  } catch (error: any) {
    throw new Error(`Failed to check material availability: ${error.message}`);
  }
}
