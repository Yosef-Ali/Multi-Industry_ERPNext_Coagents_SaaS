/**
 * T066: bom_explosion tool - Manufacturing industry
 * Explode Bill of Materials to show all component requirements
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const BOMExplosionInputSchema = z.object({
  item_code: z.string().min(1, 'Item code is required'),
  quantity: z.number().positive('Quantity must be positive').default(1),
  with_stock_levels: z.boolean().optional().default(false),
});

export type BOMExplosionInput = z.infer<typeof BOMExplosionInputSchema>;

export interface BOMComponent {
  item_code: string;
  item_name: string;
  qty: number;
  stock_uom: string;
  available_qty?: number;
  is_sub_assembly: boolean;
  sub_components?: BOMComponent[];
}

export interface BOMExplosionResult {
  components: BOMComponent[];
  item_code: string;
  quantity: number;
  bom_name: string;
  total_components: number;
  requires_approval: false;
}

/**
 * Explode BOM recursively to show all component requirements
 * ✅ No approval required (read-only operation)
 */
export async function bom_explosion(
  input: BOMExplosionInput,
  client: FrappeAPIClient
): Promise<BOMExplosionResult> {
  // Validate input
  const validated = BOMExplosionInputSchema.parse(input);

  // Get the BOM for the item
  const bomResult = await client.searchDoc({
    doctype: 'BOM',
    filters: {
      item: validated.item_code,
      is_active: 1,
      is_default: 1,
    },
    fields: ['name', 'item', 'quantity'],
  });

  if (bomResult.documents.length === 0) {
    throw new Error(`No active BOM found for item ${validated.item_code}`);
  }

  const bom = bomResult.documents[0];
  const bomName = bom.name;

  // Get BOM items (components)
  const bomItemsResult = await client.searchDoc({
    doctype: 'BOM Item',
    filters: {
      parent: bomName,
    },
    fields: ['item_code', 'item_name', 'qty', 'stock_uom', 'bom_no'],
  });

  // Recursively explode sub-assemblies
  const components: BOMComponent[] = await Promise.all(
    bomItemsResult.documents.map(async (item: any) => {
      const itemQty = parseFloat(item.qty) * validated.quantity;
      const isSubAssembly = !!item.bom_no;

      let subComponents: BOMComponent[] | undefined;

      // If item has a BOM (sub-assembly), recursively explode it
      if (isSubAssembly && item.bom_no) {
        try {
          const subBomResult = await bom_explosion(
            {
              item_code: item.item_code,
              quantity: itemQty,
              with_stock_levels: validated.with_stock_levels,
            },
            client
          );
          subComponents = subBomResult.components;
        } catch (error) {
          // If sub-BOM explosion fails, treat as regular component
          subComponents = undefined;
        }
      }

      // Get stock levels if requested
      let availableQty: number | undefined;
      if (validated.with_stock_levels) {
        try {
          const stockResult = await client.searchDoc({
            doctype: 'Bin',
            filters: {
              item_code: item.item_code,
            },
            fields: ['actual_qty', 'reserved_qty'],
          });

          availableQty = stockResult.documents.reduce(
            (sum: number, bin: any) =>
              sum + Math.max(0, parseFloat(bin.actual_qty) - parseFloat(bin.reserved_qty)),
            0
          );
        } catch {
          availableQty = undefined;
        }
      }

      return {
        item_code: item.item_code,
        item_name: item.item_name,
        qty: itemQty,
        stock_uom: item.stock_uom,
        is_sub_assembly: isSubAssembly,
        ...(availableQty !== undefined && { available_qty: availableQty }),
        ...(subComponents && { sub_components: subComponents }),
      };
    })
  );

  // Count total components (including nested)
  const countComponents = (comps: BOMComponent[]): number => {
    return comps.reduce((count, comp) => {
      return count + 1 + (comp.sub_components ? countComponents(comp.sub_components) : 0);
    }, 0);
  };

  return {
    components,
    item_code: validated.item_code,
    quantity: validated.quantity,
    bom_name: bomName,
    total_components: countComponents(components),
    requires_approval: false,
  };
}

// Tool metadata for registry
export const bom_explosion_tool = {
  name: 'bom_explosion',
  description: 'Explode Bill of Materials to show all component requirements for production',
  inputSchema: BOMExplosionInputSchema,
  handler: bom_explosion,
  requires_approval: false,
  operation_type: 'read' as const,
  industry: 'manufacturing',
};
