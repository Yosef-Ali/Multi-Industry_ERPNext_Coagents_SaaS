sum, inv) => sum + (inv.grand_total || 0), 0);
    const totalQty = invoicesResponse.reduce((sum, inv) => sum + (inv.total_qty || 0), 0);
    const totalTransactions = invoicesResponse.length;
    const avgTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    // Aggregate by item
    const itemMap: Record<string, {
      item_name: string;
      item_group: string;
      qty: number;
      revenue: number;
      transactions: Set<string>;
    }> = {};

    for (const item of itemsResponse) {
      if (!itemMap[item.item_code]) {
        itemMap[item.item_code] = {
          item_name: item.item_name,
          item_group: item.item_group,
          qty: 0,
          revenue: 0,
          transactions: new Set(),
        };
      }

      itemMap[item.item_code].qty += item.qty || 0;
      itemMap[item.item_code].revenue += item.amount || 0;
      itemMap[item.item_code].transactions.add(item.parent);
    }

    // Build top products list
    const topProducts: TopProduct[] = Object.entries(itemMap)
      .map(([item_code, data]) => ({
        item_code,
        item_name: data.item_name,
        item_group: data.item_group,
        qty_sold: data.qty,
        total_revenue: data.revenue,
        avg_price: data.qty > 0 ? data.revenue / data.qty : 0,
        transaction_count: data.transactions.size,
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, validated.top_n);

    // Aggregate daily sales
    const dailyMap: Record<string, { revenue: number; qty: number; transactions: number }> = {};

    for (const invoice of invoicesResponse) {
      const date = invoice.posting_date;
      if (!dailyMap[date]) {
        dailyMap[date] = { revenue: 0, qty: 0, transactions: 0 };
      }
      dailyMap[date].revenue += invoice.grand_total || 0;
      dailyMap[date].qty += invoice.total_qty || 0;
      dailyMap[date].transactions += 1;
    }

    const dailySales: DailySales[] = Object.entries(dailyMap)
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        qty: data.qty,
        transactions: data.transactions,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Calculate period length
    const fromDate = new Date(validated.from_date);
    const toDate = new Date(validated.to_date);
    const days = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    const result: SalesAnalyticsResult = {
      period: {
        from_date: validated.from_date,
        to_date: validated.to_date,
        days,
      },
      metrics: {
        total_revenue: totalRevenue,
        total_qty_sold: totalQty,
        total_transactions: totalTransactions,
        avg_transaction_value: avgTransactionValue,
        unique_customers: uniqueCustomers,
        unique_items: Object.keys(itemMap).length,
      },
      top_products: topProducts,
      daily_sales: dailySales,
      store: validated.store,
      execution_time_ms: Date.now() - startTime,
    };

    return result;
  } catch (error: any) {
    throw new Error(`Failed to analyze sales: ${error.message}`);
  }
}
