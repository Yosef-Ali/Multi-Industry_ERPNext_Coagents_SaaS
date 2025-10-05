/**
 * T088: bom_explosion tool - Explode BOM to component requirements
 * Manufacturing vertical - Bill of Materials explosion for production planning
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const BOMExplosionInputSchema = z.object({
  bom: z.string().min(1, 'BOM ID is required').describe('Bill of Materials ID'),
  qty: z.number().positive().default(1).describe('Quantity to produce'),
  include_stock: z.boolean().default(true).describe('Include current stock levels in result'),
  warehouse: z.string().optional().describe('Default warehouse for stock check'),
});

export type BOMExplosionInput = z.infer<typeof BOMExplosionInputSchema>;

export interface BOMItem {
  item_code: string;
  item_name: string;
  qty_per_unit: number;
  total_qty_required: number;
  stock_uom: string;
  available_qty?: number;
  shortage?: number;
  rate?: number;
  amount?: number;
  description?: string;
}

export interface BOMExplosionResult {
  bom: string;
  item: string;
  item_name: string;
  qty_to_produce: number;
  uom: string;
  items: BOMItem[];
  total_items: number;
  items_in_stock: number;
  items_short: number;
  total_cost?: number;
  execution_time_ms: number;
}

/**
 * Explode BOM to show all component requirements
 * Read-only operation - no approval required
 */
export async function bom_explosion(
  input: BOMExplosionInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<BOMExplosionResult> {
  const startTime = Date.now();

  // Validate input
  const validated = BOMExplosionInputSchema.parse(input);

  try {
    // Get BOM details
    const bomResponse = await client.call<any>({
      method: 'frappe.client.get',
      params: {
        doctype: 'BOM',
        name: validated.bom,
        fields: ['name', 'item', 'item_name', 'quantity', 'uom']
      }
    });

    const bom = bomResponse;

    // Get BOM items (components)
    const bomItemsResponse = await client.call<any[]>({
      method: 'frappe.client.get_list',
      params: {
        doctype: 'BOM Item',
        filters: {
          parent: validated.bom,
        },
        fields: [
          'item_code',
          'item_name',
          'qty',
          'stock_uom',
          'rate',
          'amount',
          'description'
        ],
        limit_page_length: 500
      }
    });

    // Calculate requirements for requested quantity
    const qtyMultiplier = validated.qty / bom.quantity;
    
    // Process each BOM item
    const items: BOMItem[] = [];
    let itemsInStock = 0;
    let itemsShort = 0;
    let totalCost = 0;

    for (const bomItem of bomItemsResponse) {
      const totalQtyRequired = bomItem.qty * qtyMultiplier;
      
      let availableQty: number | undefined;
      let shortage: number | undefined;

      // Get stock if requested
      if (validated.include_stock) {
        try {
          const stockResponse = await client.call<any>({
            method: 'erpnext.stock.utils.get_stock_balance',
            params: {
              item_code: bomItem.item_code,
              warehouse: validated.warehouse,
            }
          });

          availableQty = stockResponse || 0;
          
          // Calculate shortage
          if (availableQty < totalQtyRequired) {
            shortage = totalQtyRequired - availableQty;
            itemsShort++;
          } else {
            itemsInStock++;
          }
        } catch (error) {
          // If stock check fails, mark as unknown
          availableQty = undefined;
        }
      }

      const itemCost = (bomItem.rate || 0) * totalQtyRequired;
      totalCost += itemCost;

      items.push({
        item_code: bomItem.item_code,
        item_name: bomItem.item_name,
        qty_per_unit: bomItem.qty,
        total_qty_required: totalQtyRequired,
        stock_uom: bomItem.stock_uom,
        available_qty: availableQty,
        shortage: shortage,
        rate: bomItem.rate,
        amount: itemCost,
        description: bomItem.description,
      });
    }

    const result: BOMExplosionResult = {
      bom: validated.bom,
      item: bom.item,
      item_name: bom.item_name,
      qty_to_produce: validated.qty,
      uom: bom.uom,
      items,
      total_items: items.length,
      items_in_stock: itemsInStock,
      items_short: itemsShort,
      total_cost: totalCost > 0 ? totalCost : undefined,
      execution_time_ms: Date.now() - startTime,
    };

    return result;
  } catch (error: any) {
    throw new Error(`Failed to explode BOM: ${error.message}`);
  }
}
