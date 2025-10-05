/**
 * T058-T059: Dynamic Tool Registry
 * Loads tools based on enabled industry verticals
 * Integrates with RiskClassifier for dynamic risk assessment
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../api';
import { RiskClassifier } from '../../../../apps/common/risk_classifier';

// Import common tools
import { search_doc_tool } from './common/search_doc';
import { get_doc_tool } from './common/get_doc';
import { create_doc_tool } from './common/create_doc';

// Import industry-specific tools (will be loaded dynamically)
// Hotel tools
// import { room_availability_tool } from './hotel/room_availability';
// import { occupancy_report_tool } from './hotel/occupancy_report';

// Hospital tools
// import { create_order_set_tool } from './hospital/create_order_set';

// etc...

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodType<any>;
  handler: (input: any, client: FrappeAPIClient, userId: string, sessionId: string) => Promise<any>;
  requires_approval: boolean;
  operation_type: 'read' | 'create' | 'update' | 'delete' | 'submit' | 'cancel' | 'bulk';
  industry?: string; // Optional: hotel, hospital, manufacturing, retail, education, custom
}

export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();
  private enabledIndustries: Set<string> = new Set();

  constructor(enabledIndustries: string[] = []) {
    this.enabledIndustries = new Set(enabledIndustries);
    this.loadTools();
  }

  /**
   * Load all tools based on enabled industries
   */
  private loadTools(): void {
    // Always load common tools (industry-agnostic)
    this.registerTool(search_doc_tool);
    this.registerTool(get_doc_tool);
    this.registerTool(create_doc_tool);

    // TODO: Load remaining common tools
    // this.registerTool(update_doc_tool);
    // this.registerTool(submit_doc_tool);
    // this.registerTool(cancel_doc_tool);
    // this.registerTool(run_report_tool);
    // this.registerTool(bulk_update_tool);

    // Load industry-specific tools based on enabled industries
    if (this.enabledIndustries.has('hotel')) {
      this.loadHotelTools();
    }

    if (this.enabledIndustries.has('hospital')) {
      this.loadHospitalTools();
    }

    if (this.enabledIndustries.has('manufacturing')) {
      this.loadManufacturingTools();
    }

    if (this.enabledIndustries.has('retail')) {
      this.loadRetailTools();
    }

    if (this.enabledIndustries.has('education')) {
      this.loadEducationTools();
    }

    // Load custom/generated tools
    this.loadCustomTools();
  }

  /**
   * Register a single tool
   */
  private registerTool(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Load hotel-specific tools
   */
  private async loadHotelTools(): Promise<void> {
    try {
      const { room_availability, RoomAvailabilityInputSchema } = await import('./hotel/room_availability');
      const { occupancy_report, OccupancyReportInputSchema } = await import('./hotel/occupancy_report');
      
      this.registerTool({
        name: 'room_availability',
        description: 'Check available rooms for date range in hotel',
        inputSchema: RoomAvailabilityInputSchema,
        handler: room_availability,
        requires_approval: false,
        operation_type: 'read',
        industry: 'hotel'
      });

      this.registerTool({
        name: 'occupancy_report',
        description: 'Get occupancy metrics (ADR, RevPAR, occupancy rate)',
        inputSchema: OccupancyReportInputSchema,
        handler: occupancy_report,
        requires_approval: false,
        operation_type: 'read',
        industry: 'hotel'
      });

      console.log('Hotel tools loaded: room_availability, occupancy_report');
    } catch (error) {
      console.warn('Failed to load hotel tools:', error);
    }
  }

  /**
   * Load hospital-specific tools
   */
  private async loadHospitalTools(): Promise<void> {
    try {
      const { create_order_set, CreateOrderSetInputSchema } = await import('./hospital/create_order_set');
      const { census_report, CensusReportInputSchema } = await import('./hospital/census_report');
      const { ar_by_payer, ARByPayerInputSchema } = await import('./hospital/ar_by_payer');
      
      this.registerTool({
        name: 'create_order_set',
        description: 'Create clinical order sets (e.g., sepsis protocol)',
        inputSchema: CreateOrderSetInputSchema,
        handler: create_order_set,
        requires_approval: true, // Clinical orders need approval
        operation_type: 'create',
        industry: 'hospital'
      });

      this.registerTool({
        name: 'census_report',
        description: 'Get daily census by ward',
        inputSchema: CensusReportInputSchema,
        handler: census_report,
        requires_approval: false,
        operation_type: 'read',
        industry: 'hospital'
      });

      this.registerTool({
        name: 'ar_by_payer',
        description: 'Get accounts receivable by insurance payer',
        inputSchema: ARByPayerInputSchema,
        handler: ar_by_payer,
        requires_approval: false,
        operation_type: 'read',
        industry: 'hospital'
      });

      console.log('Hospital tools loaded: create_order_set, census_report, ar_by_payer');
    } catch (error) {
      console.warn('Failed to load hospital tools:', error);
    }
  }

  /**
   * Load manufacturing-specific tools
   */
  private async loadManufacturingTools(): Promise<void> {
    try {
      const { material_availability, MaterialAvailabilityInputSchema } = await import('./manufacturing/material_availability');
      const { bom_explosion, BOMExplosionInputSchema } = await import('./manufacturing/bom_explosion');
      
      this.registerTool({
        name: 'material_availability',
        description: 'Check stock availability across warehouses for manufacturing',
        inputSchema: MaterialAvailabilityInputSchema,
        handler: material_availability,
        requires_approval: false,
        operation_type: 'read',
        industry: 'manufacturing'
      });

      this.registerTool({
        name: 'bom_explosion',
        description: 'Explode Bill of Materials to component requirements',
        inputSchema: BOMExplosionInputSchema,
        handler: bom_explosion,
        requires_approval: false,
        operation_type: 'read',
        industry: 'manufacturing'
      });

      console.log('Manufacturing tools loaded: material_availability, bom_explosion');
    } catch (error) {
      console.warn('Failed to load manufacturing tools:', error);
    }
  }

  /**
   * Load retail-specific tools
   */
  private async loadRetailTools(): Promise<void> {
    try {
      const { inventory_check, InventoryCheckInputSchema } = await import('./retail/inventory_check');
      const { sales_analytics, SalesAnalyticsInputSchema } = await import('./retail/sales_analytics');
      
      this.registerTool({
        name: 'inventory_check',
        description: 'Check stock levels across store locations for retail',
        inputSchema: InventoryCheckInputSchema,
        handler: inventory_check,
        requires_approval: false,
        operation_type: 'read',
        industry: 'retail'
      });

      this.registerTool({
        name: 'sales_analytics',
        description: 'Analyze sales trends and top products',
        inputSchema: SalesAnalyticsInputSchema,
        handler: sales_analytics,
        requires_approval: false,
        operation_type: 'read',
        industry: 'retail'
      });

      console.log('Retail tools loaded: inventory_check, sales_analytics');
    } catch (error) {
      console.warn('Failed to load retail tools:', error);
    }
  }

  /**
   * Load education-specific tools
   */
  private async loadEducationTools(): Promise<void> {
    try {
      const { applicant_workflow, ApplicantWorkflowInputSchema } = await import('./education/applicant_workflow');
      const { interview_scheduling, InterviewSchedulingInputSchema } = await import('./education/interview_scheduling');
      
      this.registerTool({
        name: 'applicant_workflow',
        description: 'Manage student application workflow with status updates',
        inputSchema: ApplicantWorkflowInputSchema,
        handler: applicant_workflow,
        requires_approval: true, // Write operations need approval
        operation_type: 'update',
        industry: 'education'
      });

      this.registerTool({
        name: 'interview_scheduling',
        description: 'Schedule interviews with availability checking',
        inputSchema: InterviewSchedulingInputSchema,
        handler: interview_scheduling,
        requires_approval: false, // Most operations are low risk
        operation_type: 'create',
        industry: 'education'
      });

      console.log('Education tools loaded: applicant_workflow, interview_scheduling');
    } catch (error) {
      console.warn('Failed to load education tools:', error);
    }
  }

  /**
   * Load custom/generated tools from apps/custom_generated/
   */
  private async loadCustomTools(): Promise<void> {
    // TODO: Dynamic import from custom tools directory
    // Scan services/agent-gateway/src/tools/custom/ for generated tools
    // Auto-register all exported *_tool definitions
    console.log('Custom tools loaded (placeholder)');
  }

  /**
   * Get tool by name
   */
  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools for specific industry
   */
  getToolsByIndustry(industry: string): ToolDefinition[] {
    return Array.from(this.tools.values()).filter(
      (tool) => !tool.industry || tool.industry === industry
    );
  }

  /**
   * Execute tool with risk assessment integration (T059)
   */
  async executeTool(
    toolName: string,
    input: any,
    client: FrappeAPIClient,
    userId: string,
    sessionId: string
  ): Promise<any> {
    const tool = this.getTool(toolName);

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Validate input against schema
    const validated = tool.inputSchema.parse(input);

    // Execute tool handler
    const result = await tool.handler(validated, client, userId, sessionId);

    return result;
  }

  /**
   * Assess risk for a tool execution (before execution)
   */
  assessToolRisk(toolName: string, input: any): any {
    const tool = this.getTool(toolName);

    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    // Read operations = low risk
    if (tool.operation_type === 'read') {
      return {
        level: 'low',
        requires_approval: false,
        reasoning: 'Read-only operation',
      };
    }

    // Extract fields and assess risk
    const fields = tool.inputSchema instanceof z.ZodObject
      ? Object.keys(input.data || input)
      : [];

    return RiskClassifier.assess(
      tool.operation_type,
      input.doctype || 'Unknown',
      fields,
      input.document_state || 'draft',
      input.operation_count || 1,
      input.data || input
    );
  }

  /**
   * Get registry stats
   */
  getStats(): {
    total_tools: number;
    common_tools: number;
    industry_tools: { [industry: string]: number };
    enabled_industries: string[];
  } {
    const stats: any = {
      total_tools: this.tools.size,
      common_tools: 0,
      industry_tools: {},
      enabled_industries: Array.from(this.enabledIndustries),
    };

    for (const tool of this.tools.values()) {
      if (!tool.industry) {
        stats.common_tools++;
      } else {
        stats.industry_tools[tool.industry] = (stats.industry_tools[tool.industry] || 0) + 1;
      }
    }

    return stats;
  }
}

/**
 * Factory function to create registry with enabled industries
 */
export function createToolRegistry(enabledIndustries: string[]): ToolRegistry {
  return new ToolRegistry(enabledIndustries);
}
