'use client';

import { AlertTriangle, Package, TrendingDown, TrendingUp } from 'lucide-react';
import { useCallback, useMemo } from 'react';
import { Card } from '../ui/card';

export interface InventoryItem {
	item_code: string;
	item_name: string;
	warehouse: string;
	actual_qty: number;
	reserved_qty: number;
	available_qty: number;
	reorder_level?: number;
	item_group?: string;
}

interface InventoryHeatmapProps {
	items: InventoryItem[];
	groupBy?: 'warehouse' | 'item_group';
	showReorderAlerts?: boolean;
	onItemClick?: (item: InventoryItem) => void;
}

/**
 * T104: InventoryHeatmap - Retail inventory levels widget
 *
 * Displays inventory levels as a color-coded heatmap:
 * - Green: Healthy stock levels
 * - Yellow: Below reorder point
 * - Red: Critical/out of stock
 * - Grouped by warehouse or item category
 * - Quick stock level insights
 *
 * Usage:
 * ```tsx
 * <InventoryHeatmap
 *   items={inventoryData}
 *   groupBy="warehouse"
 *   showReorderAlerts={true}
 * />
 * ```
 */
export function InventoryHeatmap({
	items,
	groupBy = 'warehouse',
	showReorderAlerts = true,
	onItemClick,
}: InventoryHeatmapProps) {
	// Group items
	const groupedItems = useMemo(() => {
		const grouped = new Map<string, InventoryItem[]>();
		items.forEach((item) => {
			const key = groupBy === 'warehouse' ? item.warehouse : item.item_group || 'Uncategorized';
			if (!grouped.has(key)) {
				grouped.set(key, []);
			}
			grouped.get(key)?.push(item);
		});
		return Array.from(grouped.entries()).sort(([a], [b]) => a.localeCompare(b));
	}, [items, groupBy]);

	const getStockLevel = useCallback(
		(item: InventoryItem): 'healthy' | 'low' | 'critical' | 'out' => {
			if (item.available_qty <= 0) return 'out';

			if (item.reorder_level) {
				if (item.available_qty >= item.reorder_level * 1.5) return 'healthy';
				if (item.available_qty >= item.reorder_level) return 'low';
				return 'critical';
			}

			// Fallback if no reorder level
			if (item.available_qty < 5) return 'critical';
			if (item.available_qty < 20) return 'low';
			return 'healthy';
		},
		[]
	);

	// Calculate overall statistics
	const stats = useMemo(() => {
		return items.reduce(
			(acc, item) => {
				acc.total += 1;
				const level = getStockLevel(item);

				if (level === 'healthy') {
					acc.healthy += 1;
				} else if (level === 'out') {
					acc.outOfStock += 1;
				} else {
					acc.lowStock += 1;
				}

				return acc;
			},
			{ total: 0, healthy: 0, lowStock: 0, outOfStock: 0 }
		);
	}, [items, getStockLevel]);

	const getHeatmapColor = (level: string) => {
		switch (level) {
			case 'healthy':
				return 'bg-green-500';
			case 'low':
				return 'bg-yellow-500';
			case 'critical':
				return 'bg-orange-500';
			case 'out':
				return 'bg-red-500';
			default:
				return 'bg-gray-300';
		}
	};

	const _getStockLevelLabel = (level: string) => {
		switch (level) {
			case 'healthy':
				return 'Healthy';
			case 'low':
				return 'Low';
			case 'critical':
				return 'Critical';
			case 'out':
				return 'Out of Stock';
			default:
				return 'Unknown';
		}
	};

	return (
		<div className="w-full space-y-4">
			{/* Statistics */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
				<Card className="p-4">
					<div className="flex items-center gap-2">
						<Package className="w-5 h-5 text-gray-600" />
						<div>
							<div className="text-xs text-gray-500">Total Items</div>
							<div className="text-2xl font-bold">{stats.total}</div>
						</div>
					</div>
				</Card>
				<Card className="p-4 bg-green-50">
					<div className="flex items-center gap-2">
						<TrendingUp className="w-5 h-5 text-green-600" />
						<div>
							<div className="text-xs text-gray-500">Healthy</div>
							<div className="text-2xl font-bold text-green-600">{stats.healthy}</div>
						</div>
					</div>
				</Card>
				<Card className="p-4 bg-yellow-50">
					<div className="flex items-center gap-2">
						<AlertTriangle className="w-5 h-5 text-yellow-600" />
						<div>
							<div className="text-xs text-gray-500">Low Stock</div>
							<div className="text-2xl font-bold text-yellow-600">{stats.lowStock}</div>
						</div>
					</div>
				</Card>
				<Card className="p-4 bg-red-50">
					<div className="flex items-center gap-2">
						<TrendingDown className="w-5 h-5 text-red-600" />
						<div>
							<div className="text-xs text-gray-500">Out of Stock</div>
							<div className="text-2xl font-bold text-red-600">{stats.outOfStock}</div>
						</div>
					</div>
				</Card>
			</div>

			{/* Heatmap by Group */}
			<div className="space-y-6">
				{groupedItems.map(([groupName, groupItems]) => {
					const groupStats = {
						healthy: groupItems.filter((i) => getStockLevel(i) === 'healthy').length,
						low: groupItems.filter((i) => getStockLevel(i) === 'low').length,
						critical: groupItems.filter((i) => getStockLevel(i) === 'critical').length,
						out: groupItems.filter((i) => getStockLevel(i) === 'out').length,
					};

					return (
						<Card key={groupName} className="overflow-hidden">
							{/* Group Header */}
							<div className="bg-gray-50 p-4 border-b">
								<div className="flex items-center justify-between">
									<h3 className="text-lg font-semibold">{groupName}</h3>
									<div className="flex items-center gap-3 text-sm">
										<span className="text-gray-600">{groupItems.length} items</span>
										{groupStats.out > 0 && (
											<span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-medium">
												{groupStats.out} out of stock
											</span>
										)}
									</div>
								</div>
							</div>

							{/* Heatmap Grid */}
							<div className="p-4">
								<div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
									{groupItems.map((item) => {
										const level = getStockLevel(item);
										return (
											<button
												key={item.item_code}
												onClick={() => onItemClick?.(item)}
												className={`
                                                    aspect-square rounded p-2 transition-all duration-200
                                                    ${getHeatmapColor(level)}
                                                    hover:ring-2 hover:ring-blue-500 hover:scale-110
                                                    cursor-pointer relative group
                                                `}
												title={`${item.item_name}\nAvailable: ${item.available_qty}\n${item.reorder_level ? `Reorder Level: ${item.reorder_level}` : ''}`}
											>
												{/* Tooltip */}
												<div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
													{item.item_name.length > 20
														? `${item.item_name.slice(0, 20)}...`
														: item.item_name}
													<br />
													Qty: {item.available_qty}
												</div>
											</button>
										);
									})}
								</div>

								{/* Group Summary Bar */}
								<div className="mt-4 flex gap-1 h-2 rounded overflow-hidden">
									{groupStats.healthy > 0 && (
										<div
											className="bg-green-500"
											style={{ width: `${(groupStats.healthy / groupItems.length) * 100}%` }}
											title={`${groupStats.healthy} healthy`}
										/>
									)}
									{groupStats.low > 0 && (
										<div
											className="bg-yellow-500"
											style={{ width: `${(groupStats.low / groupItems.length) * 100}%` }}
											title={`${groupStats.low} low`}
										/>
									)}
									{groupStats.critical > 0 && (
										<div
											className="bg-orange-500"
											style={{ width: `${(groupStats.critical / groupItems.length) * 100}%` }}
											title={`${groupStats.critical} critical`}
										/>
									)}
									{groupStats.out > 0 && (
										<div
											className="bg-red-500"
											style={{ width: `${(groupStats.out / groupItems.length) * 100}%` }}
											title={`${groupStats.out} out of stock`}
										/>
									)}
								</div>
							</div>
						</Card>
					);
				})}
			</div>

			{/* Legend */}
			<div className="flex flex-wrap gap-4 text-sm border-t pt-4">
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-green-500 rounded"></div>
					<span>Healthy Stock</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-yellow-500 rounded"></div>
					<span>Low Stock</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-orange-500 rounded"></div>
					<span>Critical</span>
				</div>
				<div className="flex items-center gap-2">
					<div className="w-4 h-4 bg-red-500 rounded"></div>
					<span>Out of Stock</span>
				</div>
			</div>

			{/* Reorder Alerts */}
			{showReorderAlerts &&
				items.filter((i) => getStockLevel(i) === 'critical' || getStockLevel(i) === 'out').length >
					0 && (
					<Card className="bg-red-50 border-red-200">
						<div className="p-4">
							<div className="flex items-start gap-3">
								<AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
								<div>
									<h4 className="font-semibold text-red-900 mb-2">Reorder Required</h4>
									<p className="text-sm text-red-700">
										{
											items.filter(
												(i) => getStockLevel(i) === 'critical' || getStockLevel(i) === 'out'
											).length
										}{' '}
										items need immediate attention
									</p>
								</div>
							</div>
						</div>
					</Card>
				)}
		</div>
	);
}
