import type { ComponentType } from 'react';
import { INDUSTRY_DISPLAY_NAMES, type IndustryKey, normalizeIndustry } from '@/lib/types/industry';
import { AvailabilityGrid, type Room } from './AvailabilityGrid';
import { BedCensus, type WardCensus } from './BedCensus';
import { type BOMData, BOMTree } from './BOMTree';
import { type Interview, InterviewCalendar } from './InterviewCalendar';
import { InventoryHeatmap, type InventoryItem } from './InventoryHeatmap';
import { OrderPreview, type OrderSet } from './OrderPreview';

export interface DomainWidgetMeta<ComponentProps> {
	name: string;
	description: string;
	component: ComponentType<ComponentProps>;
	exampleUsage?: string;
	tags: string[];
}

export const INDUSTRY_WIDGETS: Record<IndustryKey, DomainWidgetMeta<any>[]> = {
	hotel: [
		{
			name: 'AvailabilityGrid',
			description:
				'Visualises room availability by floor with occupancy stats for front-desk teams.',
			component: AvailabilityGrid,
			tags: ['occupancy', 'reservations', 'hospitality'],
			exampleUsage:
				'<AvailabilityGrid rooms={rooms} onRoomClick={handleSelect} selectedDate="2024-10-15" />',
		} satisfies DomainWidgetMeta<{
			rooms: Room[];
			onRoomClick?: (room: Room) => void;
			selectedDate?: string;
			showFilters?: boolean;
		}>,
	],
	hospital: [
		{
			name: 'BedCensus',
			description: 'Tracks bed occupancy and patient census across wards for clinical operations.',
			component: BedCensus,
			tags: ['admissions', 'capacity', 'healthcare'],
			exampleUsage:
				'<BedCensus censusData={wards} reportDate="2024-10-15" onPatientClick={openPatient} />',
		} satisfies DomainWidgetMeta<{
			censusData: WardCensus[];
			reportDate: string;
			onPatientClick?: (patient: WardCensus['patients'][number]) => void;
			showDetails?: boolean;
		}>,
	],
	manufacturing: [
		{
			name: 'BOMTree',
			description: 'Explodes multi-level bills of materials for planners and production teams.',
			component: BOMTree,
			tags: ['production', 'materials', 'engineering'],
			exampleUsage: '<BOMTree data={bomData} onSelectItem={setSelectedComponent} />',
		} satisfies DomainWidgetMeta<{ data: BOMData; onSelectItem?: (item: BOMData) => void }>,
	],
	retail: [
		{
			name: 'InventoryHeatmap',
			description: 'Highlights stock health by warehouse or category with reorder warnings.',
			component: InventoryHeatmap,
			tags: ['inventory', 'replenishment', 'analytics'],
			exampleUsage:
				'<InventoryHeatmap items={inventoryItems} groupBy="warehouse" onItemClick={openItem} />',
		} satisfies DomainWidgetMeta<{
			items: InventoryItem[];
			groupBy?: 'warehouse' | 'item_group';
			showReorderAlerts?: boolean;
			onItemClick?: (item: InventoryItem) => void;
		}>,
		{
			name: 'OrderPreview',
			description: 'Summarises customer orders with profitability insights before confirmation.',
			component: OrderPreview,
			tags: ['sales', 'orders', 'commerce'],
			exampleUsage:
				'<OrderPreview order={order} onApprove={approveOrder} onReject={rejectOrder} />',
		} satisfies DomainWidgetMeta<{
			order: OrderSet;
			onApprove?: (order: OrderSet) => void;
			onReject?: (order: OrderSet) => void;
		}>,
	],
	education: [
		{
			name: 'InterviewCalendar',
			description: 'Coordinates admissions or hiring interviews with availability and next steps.',
			component: InterviewCalendar,
			tags: ['scheduling', 'admissions', 'talent'],
			exampleUsage:
				'<InterviewCalendar interviews={interviews} defaultView="week" onSelectSlot={selectSlot} />',
		} satisfies DomainWidgetMeta<{
			interviews: Interview[];
			defaultView?: 'day' | 'week' | 'month';
			onSelectSlot?: (slot: Interview) => void;
		}>,
	],
};

export function getWidgetsForIndustry(industry: string): DomainWidgetMeta<any>[] {
	const normalized = normalizeIndustry(industry);
	return normalized ? INDUSTRY_WIDGETS[normalized] : [];
}

export function getIndustryDisplayName(industry: string): string {
	const normalized = normalizeIndustry(industry);
	return normalized ? INDUSTRY_DISPLAY_NAMES[normalized] : industry;
}
