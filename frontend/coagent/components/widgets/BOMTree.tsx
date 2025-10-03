'use client';

import { Card } from '../ui/card';
import { useState } from 'react';
import { ChevronRight, ChevronDown, Package, AlertTriangle, CheckCircle } from 'lucide-react';

export interface BOMComponent {
    item_code: string;
    item_name: string;
    qty: number;
    stock_uom: string;
    available_qty?: number;
    is_sub_assembly: boolean;
    sub_components?: BOMComponent[];
}

export interface BOMData {
    item_code: string;
    quantity: number;
    bom_name: string;
    total_components: number;
    components: BOMComponent[];
}

interface BOMTreeProps {
    bomData: BOMData;
    showStock?: boolean;
    onComponentClick?: (component: BOMComponent) => void;
}

/**
 * T103: BOMTree - Manufacturing BOM explosion widget
 *
 * Displays hierarchical Bill of Materials with:
 * - Expandable tree structure for sub-assemblies
 * - Component quantities and units
 * - Stock availability indicators
 * - Missing/insufficient stock alerts
 *
 * Usage:
 * ```tsx
 * <BOMTree
 *   bomData={explosionData}
 *   showStock={true}
 *   onComponentClick={(component) => viewDetails(component)}
 * />
 * ```
 */
export function BOMTree({
    bomData,
    showStock = false,
    onComponentClick,
}: BOMTreeProps) {
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    const toggleNode = (itemCode: string) => {
        const newExpanded = new Set(expandedNodes);
        if (newExpanded.has(itemCode)) {
            newExpanded.delete(itemCode);
        } else {
            newExpanded.add(itemCode);
        }
        setExpandedNodes(newExpanded);
    };

    const getStockStatus = (component: BOMComponent) => {
        if (!showStock || component.available_qty === undefined) return null;

        const isAvailable = component.available_qty >= component.qty;
        const shortfall = Math.max(0, component.qty - component.available_qty);

        return {
            isAvailable,
            shortfall,
            icon: isAvailable ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
            ) : (
                <AlertTriangle className="w-4 h-4 text-red-600" />
            ),
        };
    };

    const renderComponent = (component: BOMComponent, level: number = 0) => {
        const isExpanded = expandedNodes.has(component.item_code);
        const hasSubComponents = component.is_sub_assembly && component.sub_components && component.sub_components.length > 0;
        const stockStatus = getStockStatus(component);
        const indent = level * 24;

        return (
            <div key={`${component.item_code}-${level}`} className="border-l-2 border-gray-200">
                <button
                    onClick={() => {
                        if (hasSubComponents) {
                            toggleNode(component.item_code);
                        }
                        onComponentClick?.(component);
                    }}
                    className="w-full p-3 hover:bg-gray-50 transition-colors text-left"
                    style={{ paddingLeft: `${indent + 12}px` }}
                >
                    <div className="flex items-start gap-3">
                        {/* Expand/Collapse Icon */}
                        <div className="w-5 h-5 flex-shrink-0 mt-0.5">
                            {hasSubComponents ? (
                                isExpanded ? (
                                    <ChevronDown className="w-5 h-5 text-gray-600" />
                                ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-600" />
                                )
                            ) : (
                                <Package className="w-4 h-4 text-gray-400" />
                            )}
                        </div>

                        {/* Component Info */}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 truncate">
                                        {component.item_name}
                                    </h4>
                                    <p className="text-sm text-gray-500">{component.item_code}</p>
                                    {component.is_sub_assembly && (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                            Sub-Assembly
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4 flex-shrink-0">
                                    {/* Quantity */}
                                    <div className="text-right">
                                        <div className="font-semibold text-gray-900">
                                            {component.qty.toLocaleString()} {component.stock_uom}
                                        </div>
                                        {showStock && component.available_qty !== undefined && (
                                            <div className="text-sm text-gray-500">
                                                Available: {component.available_qty.toLocaleString()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Stock Status */}
                                    {stockStatus && (
                                        <div className="flex items-center gap-2">
                                            {stockStatus.icon}
                                            {!stockStatus.isAvailable && (
                                                <span className="text-sm text-red-600 font-medium">
                                                    Short: {stockStatus.shortfall}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </button>

                {/* Render sub-components if expanded */}
                {hasSubComponents && isExpanded && (
                    <div className="ml-6">
                        {component.sub_components!.map(subComp =>
                            renderComponent(subComp, level + 1)
                        )}
                    </div>
                )}
            </div>
        );
    };

    // Calculate stock summary
    const stockSummary = bomData.components.reduce(
        (acc, comp) => {
            if (comp.available_qty !== undefined) {
                const isAvailable = comp.available_qty >= comp.qty;
                if (isAvailable) acc.available++;
                else acc.insufficient++;
            }
            acc.total++;
            return acc;
        },
        { total: 0, available: 0, insufficient: 0 }
    );

    return (
        <Card className="w-full">
            {/* Header */}
            <div className="bg-blue-50 p-4 border-b">
                <div className="flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">
                            BOM Explosion: {bomData.item_code}
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            BOM: {bomData.bom_name} | Quantity: {bomData.quantity.toLocaleString()}
                        </p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm text-gray-500">Total Components</div>
                        <div className="text-2xl font-bold text-blue-600">{bomData.total_components}</div>
                    </div>
                </div>
            </div>

            {/* Stock Summary */}
            {showStock && (
                <div className="bg-gray-50 p-4 border-b">
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-xs text-gray-500">Total Items</div>
                            <div className="text-lg font-semibold">{stockSummary.total}</div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Available</div>
                            <div className="text-lg font-semibold text-green-600">
                                {stockSummary.available}
                            </div>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500">Insufficient</div>
                            <div className="text-lg font-semibold text-red-600">
                                {stockSummary.insufficient}
                            </div>
                        </div>
                    </div>
                    {stockSummary.insufficient > 0 && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="font-medium">
                                {stockSummary.insufficient} component(s) have insufficient stock
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* BOM Tree */}
            <div className="divide-y">
                {bomData.components.map(component => renderComponent(component, 0))}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 p-4 border-t text-sm text-gray-600">
                <div className="flex items-center justify-between">
                    <span>Click on sub-assemblies to expand hierarchy</span>
                    {showStock && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                                <CheckCircle className="w-4 h-4 text-green-600" />
                                <span>In Stock</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <AlertTriangle className="w-4 h-4 text-red-600" />
                                <span>Insufficient</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Card>
    );
}
