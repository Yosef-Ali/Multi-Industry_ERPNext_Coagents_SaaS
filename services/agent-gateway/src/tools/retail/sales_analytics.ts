/**
 * T068: sales_analytics tool - Retail industry
 * Generate sales analytics and insights for retail operations
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const SalesAnalyticsInputSchema = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  warehouse: z.string().optional(),
  customer_group: z.string().optional(),
  top_n: z.number().int().positive().optional().default(10),
});

export type SalesAnalyticsInput = z.infer<typeof SalesAnalyticsInputSchema>;

export interface TopProduct {
  item_code: string;
  item_name: string;
  quantity_sold: number;
  total_revenue: number;
  avg_price: number;
}

export interface SalesAnalyticsResult {
  total_sales: number;
  total_orders: number;
  avg_order_value: number;
  top_products: TopProduct[];
  sales_by_day: Array<{
    date: string;
    sales: number;
    orders: number;
  }>;
  from_date: string;
  to_date: string;
  requires_approval: false;
}

/**
 * Generate sales analytics for retail operations
 * ✅ No approval required (read-only operation)
 */
export async function sales_analytics(
  input: SalesAnalyticsInput,
  client: FrappeAPIClient
): Promise<SalesAnalyticsResult> {
  // Validate input
  const validated = SalesAnalyticsInputSchema.parse(input);

  // Build filters for sales invoices
  const invoiceFilters: any = {
    docstatus: 1, // Submitted invoices only
    posting_date: ['between', [validated.from_date, validated.to_date]],
  };

  if (validated.customer_group) {
    invoiceFilters.customer_group = validated.customer_group;
  }

  // Get sales invoices
  const invoicesResult = await client.searchDoc({
    doctype: 'Sales Invoice',
    filters: invoiceFilters,
    fields: ['name', 'posting_date', 'grand_total', 'customer', 'customer_group'],
  });

  // Calculate totals
  const totalOrders = invoicesResult.documents.length;
  const totalSales = invoicesResult.documents.reduce(
    (sum: number, inv: any) => sum + (parseFloat(inv.grand_total) || 0),
    0
  );
  const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

  // Get sales invoice items for product analysis
  const invoiceNames = invoicesResult.documents.map((inv: any) => inv.name);

  let invoiceItemsResult = { documents: [] };
  if (invoiceNames.length > 0) {
    const itemFilters: any = {
      parent: ['in', invoiceNames],
      docstatus: 1,
    };

    if (validated.warehouse) {
      itemFilters.warehouse = validated.warehouse;
    }

    invoiceItemsResult = await client.searchDoc({
      doctype: 'Sales Invoice Item',
      filters: itemFilters,
      fields: ['item_code', 'item_name', 'qty', 'amount', 'rate', 'parent'],
    });
  }

  // Aggregate product sales
  const productMap = new Map<string, {
    item_code: string;
    item_name: string;
    quantity_sold: number;
    total_revenue: number;
  }>();

  for (const item of invoiceItemsResult.documents) {
    const key = item.item_code;
    if (!productMap.has(key)) {
      productMap.set(key, {
        item_code: item.item_code,
        item_name: item.item_name,
        quantity_sold: 0,
        total_revenue: 0,
      });
    }

    const product = productMap.get(key)!;
    product.quantity_sold += parseFloat(item.qty) || 0;
    product.total_revenue += parseFloat(item.amount) || 0;
  }

  // Sort products by revenue and get top N
  const topProducts: TopProduct[] = Array.from(productMap.values())
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, validated.top_n)
    .map(p => ({
      ...p,
      avg_price: p.quantity_sold > 0 ? p.total_revenue / p.quantity_sold : 0,
    }));

  // Group sales by day
  const salesByDayMap = new Map<string, { sales: number; orders: number }>();

  for (const invoice of invoicesResult.documents) {
    const date = invoice.posting_date;
    if (!salesByDayMap.has(date)) {
      salesByDayMap.set(date, { sales: 0, orders: 0 });
    }

    const dayData = salesByDayMap.get(date)!;
    dayData.sales += parseFloat(invoice.grand_total) || 0;
    dayData.orders += 1;
  }

  // Convert to array and sort by date
  const salesByDay = Array.from(salesByDayMap.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    total_sales: parseFloat(totalSales.toFixed(2)),
    total_orders: totalOrders,
    avg_order_value: parseFloat(avgOrderValue.toFixed(2)),
    top_products: topProducts,
    sales_by_day: salesByDay,
    from_date: validated.from_date,
    to_date: validated.to_date,
    requires_approval: false,
  };
}

// Tool metadata for registry
export const sales_analytics_tool = {
  name: 'sales_analytics',
  description: 'Generate sales analytics and insights for retail operations over a date range',
  inputSchema: SalesAnalyticsInputSchema,
  handler: sales_analytics,
  requires_approval: false,
  operation_type: 'read' as const,
  industry: 'retail',
};
