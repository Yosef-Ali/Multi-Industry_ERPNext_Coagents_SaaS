/**
 * Domain Widgets - Phase 3.6 (T100-T105)
 *
 * Industry-specific UI components for Canvas Builder
 * and generated ERPNext apps with CopilotKit integration
 */

export type { Room } from './AvailabilityGrid';
export { AvailabilityGrid } from './AvailabilityGrid';
export type { Patient, WardCensus } from './BedCensus';
export { BedCensus } from './BedCensus';
export type { BOMComponent, BOMData } from './BOMTree';
export { BOMTree } from './BOMTree';
export type { Interview } from './InterviewCalendar';
export { InterviewCalendar } from './InterviewCalendar';
export type { InventoryItem } from './InventoryHeatmap';
export { InventoryHeatmap } from './InventoryHeatmap';
export {
	type DomainWidgetMeta,
	getIndustryDisplayName,
	getWidgetsForIndustry,
	INDUSTRY_WIDGETS,
} from './industry-catalog';
export type { OrderItem, OrderSet } from './OrderPreview';
export { OrderPreview } from './OrderPreview';
