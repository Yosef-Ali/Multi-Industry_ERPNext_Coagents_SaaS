/**
 * T058-T059: Dynamic Tool Registry
 * Loads tools based on enabled industry verticals
 * Integrates with RiskClassifier for dynamic risk assessment
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../api';
// import { RiskClassifier } from '../../../../apps/common/risk_classifier';

// Import common tools
import { search_doc_tool } from './common/search_doc';
import { get_doc_tool } from './common/get_doc';
import { create_doc_tool } from './common/create_doc';
import { mcp_context7_docs_search_tool } from './common/mcp_context7_docs';
import { mcp_erpnext_introspect_doctype_tool } from './common/mcp_erpnext_metadata';
import { mcp_erpnext_run_report_tool } from './common/mcp_erpnext_run_report';
import { mcp_erpnext_search_records_tool } from './common/mcp_erpnext_search_records';
import { mcp_erpnext_list_doctypes_tool } from './common/mcp_erpnext_list_doctypes';
import { mcp_erpnext_list_fields_tool } from './common/mcp_erpnext_list_fields';
import { mcp_erpnext_list_reports_tool } from './common/mcp_erpnext_list_reports';
import { mcp_erpnext_get_report_info_tool } from './common/mcp_erpnext_get_report_info';
import { mcp_erpnext_list_print_formats_tool } from './common/mcp_erpnext_list_print_formats';
import { mcp_erpnext_list_roles_tool } from './common/mcp_erpnext_list_roles';
import { mcp_erpnext_count_docs_tool } from './common/mcp_erpnext_count_docs';
import { mcp_erpnext_list_link_fields_tool } from './common/mcp_erpnext_list_link_fields';
import { mcp_erpnext_list_child_tables_tool } from './common/mcp_erpnext_list_child_tables';
import { mcp_erpnext_get_doctype_permissions_tool } from './common/mcp_erpnext_get_doctype_permissions';
import { mcp_erpnext_list_workflows_tool } from './common/mcp_erpnext_list_workflows';
import { mcp_erpnext_get_workflow_tool } from './common/mcp_erpnext_get_workflow';
import { mcp_erpnext_list_comments_tool } from './common/mcp_erpnext_list_comments';
import { mcp_erpnext_list_files_tool } from './common/mcp_erpnext_list_files';
import { mcp_erpnext_list_versions_tool } from './common/mcp_erpnext_list_versions';
import { mcp_erpnext_list_users_tool } from './common/mcp_erpnext_list_users';
import { mcp_erpnext_get_user_tool } from './common/mcp_erpnext_get_user';
import { mcp_erpnext_list_user_roles_tool } from './common/mcp_erpnext_list_user_roles';
import { mcp_erpnext_list_custom_fields_tool } from './common/mcp_erpnext_list_custom_fields';
import { mcp_erpnext_list_property_setters_tool } from './common/mcp_erpnext_list_property_setters';
import { mcp_erpnext_list_modules_tool } from './common/mcp_erpnext_list_modules';
import { mcp_erpnext_get_installed_apps_tool } from './common/mcp_erpnext_get_installed_apps';
import { mcp_erpnext_list_dashboard_charts_tool } from './common/mcp_erpnext_list_dashboard_charts';
import { mcp_erpnext_get_dashboard_chart_tool } from './common/mcp_erpnext_get_dashboard_chart';
import { mcp_erpnext_list_companies_tool } from './common/mcp_erpnext_list_companies';
import { mcp_erpnext_list_currencies_tool } from './common/mcp_erpnext_list_currencies';
import { mcp_erpnext_list_currency_exchanges_tool } from './common/mcp_erpnext_list_currency_exchanges';
import { mcp_erpnext_list_uoms_tool } from './common/mcp_erpnext_list_uoms';
import { mcp_erpnext_list_countries_tool } from './common/mcp_erpnext_list_countries';
import { mcp_erpnext_list_workspaces_tool } from './common/mcp_erpnext_list_workspaces';
import { mcp_erpnext_get_workspace_tool } from './common/mcp_erpnext_get_workspace';
import { mcp_erpnext_list_server_scripts_tool } from './common/mcp_erpnext_list_server_scripts';
import { mcp_erpnext_list_auto_email_reports_tool } from './common/mcp_erpnext_list_auto_email_reports';
import { mcp_erpnext_list_notifications_tool } from './common/mcp_erpnext_list_notifications';
import { mcp_erpnext_list_email_accounts_tool } from './common/mcp_erpnext_list_email_accounts';
import { mcp_erpnext_list_scheduled_jobs_tool } from './common/mcp_erpnext_list_scheduled_jobs';
import { mcp_erpnext_get_system_settings_tool } from './common/mcp_erpnext_get_system_settings';
import { mcp_erpnext_list_web_pages_tool } from './common/mcp_erpnext_list_web_pages';
import { mcp_erpnext_get_web_page_tool } from './common/mcp_erpnext_get_web_page';
import { mcp_erpnext_list_website_routes_tool } from './common/mcp_erpnext_list_website_routes';
import { mcp_erpnext_list_custom_scripts_tool } from './common/mcp_erpnext_list_custom_scripts';
import { mcp_erpnext_list_user_permissions_tool } from './common/mcp_erpnext_list_user_permissions';
import { mcp_erpnext_list_assignment_rules_tool } from './common/mcp_erpnext_list_assignment_rules';
import { mcp_erpnext_list_auto_repeat_tool } from './common/mcp_erpnext_list_auto_repeat';
import { mcp_erpnext_list_documents_tool } from './common/mcp_erpnext_list_documents';
import { mcp_erpnext_get_document_tool } from './common/mcp_erpnext_get_document';

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
    this.registerTool(mcp_context7_docs_search_tool);
    this.registerTool(mcp_erpnext_introspect_doctype_tool);
    this.registerTool(mcp_erpnext_search_records_tool);
    this.registerTool(mcp_erpnext_run_report_tool);
    this.registerTool(mcp_erpnext_list_doctypes_tool);
    this.registerTool(mcp_erpnext_list_fields_tool);
    this.registerTool(mcp_erpnext_list_reports_tool);
    this.registerTool(mcp_erpnext_get_report_info_tool);
    this.registerTool(mcp_erpnext_list_print_formats_tool);
    this.registerTool(mcp_erpnext_list_roles_tool);
    this.registerTool(mcp_erpnext_count_docs_tool);
    this.registerTool(mcp_erpnext_list_link_fields_tool);
    this.registerTool(mcp_erpnext_list_child_tables_tool);
    this.registerTool(mcp_erpnext_get_doctype_permissions_tool);
    this.registerTool(mcp_erpnext_list_workflows_tool);
    this.registerTool(mcp_erpnext_get_workflow_tool);
    this.registerTool(mcp_erpnext_list_comments_tool);
    this.registerTool(mcp_erpnext_list_files_tool);
    this.registerTool(mcp_erpnext_list_versions_tool);
    this.registerTool(mcp_erpnext_list_users_tool);
    this.registerTool(mcp_erpnext_get_user_tool);
    this.registerTool(mcp_erpnext_list_user_roles_tool);
    this.registerTool(mcp_erpnext_list_custom_fields_tool);
    this.registerTool(mcp_erpnext_list_property_setters_tool);
    this.registerTool(mcp_erpnext_list_modules_tool);
    this.registerTool(mcp_erpnext_get_installed_apps_tool);
    this.registerTool(mcp_erpnext_list_dashboard_charts_tool);
    this.registerTool(mcp_erpnext_get_dashboard_chart_tool);
    this.registerTool(mcp_erpnext_list_companies_tool);
    this.registerTool(mcp_erpnext_list_currencies_tool);
    this.registerTool(mcp_erpnext_list_currency_exchanges_tool);
    this.registerTool(mcp_erpnext_list_uoms_tool);
    this.registerTool(mcp_erpnext_list_countries_tool);
    this.registerTool(mcp_erpnext_list_workspaces_tool);
    this.registerTool(mcp_erpnext_get_workspace_tool);
    this.registerTool(mcp_erpnext_list_server_scripts_tool);
    this.registerTool(mcp_erpnext_list_auto_email_reports_tool);
    this.registerTool(mcp_erpnext_list_notifications_tool);
    this.registerTool(mcp_erpnext_list_email_accounts_tool);
    this.registerTool(mcp_erpnext_list_scheduled_jobs_tool);
    this.registerTool(mcp_erpnext_get_system_settings_tool);
    this.registerTool(mcp_erpnext_list_web_pages_tool);
    this.registerTool(mcp_erpnext_get_web_page_tool);
    this.registerTool(mcp_erpnext_list_website_routes_tool);
    this.registerTool(mcp_erpnext_list_custom_scripts_tool);
    this.registerTool(mcp_erpnext_list_user_permissions_tool);
    this.registerTool(mcp_erpnext_list_assignment_rules_tool);
    this.registerTool(mcp_erpnext_list_auto_repeat_tool);
    this.registerTool(mcp_erpnext_list_documents_tool);
    this.registerTool(mcp_erpnext_get_document_tool);

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
  private loadHotelTools(): void {
    // TODO: Import and register hotel tools
    // this.registerTool(room_availability_tool);
    // this.registerTool(occupancy_report_tool);
    console.log('Hotel tools loaded (placeholder)');
  }

  /**
   * Load hospital-specific tools
   */
  private loadHospitalTools(): void {
    // TODO: Import and register hospital tools
    // this.registerTool(create_order_set_tool);
    // this.registerTool(census_report_tool);
    // this.registerTool(ar_by_payer_tool);
    console.log('Hospital tools loaded (placeholder)');
  }

  /**
   * Load manufacturing-specific tools
   */
  private loadManufacturingTools(): void {
    // TODO: Import and register manufacturing tools
    // this.registerTool(material_availability_tool);
    // this.registerTool(bom_explosion_tool);
    console.log('Manufacturing tools loaded (placeholder)');
  }

  /**
   * Load retail-specific tools
   */
  private loadRetailTools(): void {
    // TODO: Import and register retail tools
    // this.registerTool(inventory_check_tool);
    // this.registerTool(sales_analytics_tool);
    console.log('Retail tools loaded (placeholder)');
  }

  /**
   * Load education-specific tools
   */
  private loadEducationTools(): void {
    // TODO: Import and register education tools
    // this.registerTool(applicant_workflow_tool);
    // this.registerTool(interview_scheduling_tool);
    console.log('Education tools loaded (placeholder)');
  }

  /**
   * Load custom/generated tools from apps/custom_generated/
   */
  private loadCustomTools(): void {
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

    // TODO: Restore RiskClassifier when common module is available
    // return RiskClassifier.assess(
    //   tool.operation_type,
    //   input.doctype || 'Unknown',
    //   fields,
    //   input.document_state || 'draft',
    //   input.operation_count || 1,
    //   input.data || input
    // );

    // Temporary implementation
    return {
      level: tool.requires_approval ? 'high' : 'low',
      requires_approval: tool.requires_approval,
      reasoning: `${tool.operation_type} operation on ${input.doctype || 'Unknown'}`,
    };
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
