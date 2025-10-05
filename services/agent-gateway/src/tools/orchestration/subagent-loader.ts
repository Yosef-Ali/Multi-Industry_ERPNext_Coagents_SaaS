/**
 * Subagent Configuration Loader
 *
 * Loads subagent configurations from /agents/*.md files
 * Parses YAML frontmatter and system prompts
 * Provides subagent metadata for orchestrator routing
 *
 * Part of Claude Agent SDK orchestrator-worker pattern (T161)
 */

import * as fs from "fs/promises";
import * as path from "path";
import * as yaml from "yaml";

export interface SubagentConfig {
  name: string;
  description: string;
  tools: string[];
  model: string;
  systemPrompt: string;
  filePath: string;
}

export interface SubagentRegistry {
  [key: string]: SubagentConfig;
}

/**
 * Parse a subagent markdown file with YAML frontmatter
 */
export async function loadSubagentConfig(filePath: string): Promise<SubagentConfig> {
  try {
    const content = await fs.readFile(filePath, "utf-8");

    // Extract YAML frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      throw new Error(`Invalid subagent file format: ${filePath}`);
    }

    const [, frontmatterText, systemPrompt] = frontmatterMatch;

    // Parse YAML
    const frontmatter = yaml.parse(frontmatterText);

    if (!frontmatter.name || !frontmatter.description || !frontmatter.tools || !frontmatter.model) {
      throw new Error(`Missing required fields in subagent config: ${filePath}`);
    }

    return {
      name: frontmatter.name,
      description: frontmatter.description,
      tools: frontmatter.tools,
      model: frontmatter.model,
      systemPrompt: systemPrompt.trim(),
      filePath
    };

  } catch (error) {
    console.error(`Failed to load subagent config from ${filePath}:`, error);
    throw error;
  }
}

/**
 * Load all subagent configurations from /agents directory
 */
export async function loadAllSubagents(agentsDir: string): Promise<SubagentRegistry> {
  const registry: SubagentRegistry = {};

  try {
    const files = await fs.readdir(agentsDir);

    // Filter for .md files (exclude orchestrator if needed in some contexts)
    const subagentFiles = files.filter(f =>
      f.endsWith(".md") && f !== "orchestrator.md"
    );

    // Load all configs in parallel
    const configs = await Promise.all(
      subagentFiles.map(file =>
        loadSubagentConfig(path.join(agentsDir, file))
      )
    );

    // Build registry
    for (const config of configs) {
      registry[config.name] = config;
    }

    console.log(`Loaded ${Object.keys(registry).length} subagent configurations`);

    return registry;

  } catch (error) {
    console.error(`Failed to load subagents from ${agentsDir}:`, error);
    throw error;
  }
}

/**
 * Get subagent config by name
 */
export function getSubagentConfig(
  registry: SubagentRegistry,
  subagentName: string
): SubagentConfig | null {
  const config = registry[subagentName];

  if (!config) {
    console.warn(`Subagent not found: ${subagentName}`);
    return null;
  }

  return config;
}

/**
 * Get MCP servers required for a subagent based on its tools
 */
export function getMCPServersForSubagent(
  config: SubagentConfig,
  allMCPServers: string[]
): string[] {
  const requiredServers: Set<string> = new Set();

  // Tool to MCP server mapping
  const toolToServerMap: { [key: string]: string } = {
    // ERPNext common tools
    "search_doc": "erpnext-core",
    "get_doc": "erpnext-core",
    "create_doc": "erpnext-core",
    "update_doc": "erpnext-core",
    "submit_doc": "erpnext-core",
    "run_report": "erpnext-core",

    // Hotel-specific tools
    "search_room_availability": "erpnext-hotel",
    "create_reservation": "erpnext-hotel",
    "check_in_guest": "erpnext-hotel",
    "check_out_guest": "erpnext-hotel",
    "calculate_occupancy": "erpnext-hotel",
    "calculate_adr": "erpnext-hotel",
    "calculate_revpar": "erpnext-hotel",

    // Hospital-specific tools
    "create_order_set": "erpnext-hospital",
    "schedule_appointment": "erpnext-hospital",
    "create_encounter": "erpnext-hospital",
    "query_census": "erpnext-hospital",
    "query_ar_by_payer": "erpnext-hospital",

    // Manufacturing-specific tools
    "material_availability": "erpnext-manufacturing",
    "bom_explosion": "erpnext-manufacturing",
    "create_work_order": "erpnext-manufacturing",
    "check_production_capacity": "erpnext-manufacturing",

    // Retail-specific tools
    "check_inventory_levels": "erpnext-retail",
    "validate_stock_availability": "erpnext-retail",
    "create_sales_order": "erpnext-retail",
    "process_fulfillment": "erpnext-retail",
    "send_customer_notification": "erpnext-retail",
    "calculate_sales_analytics": "erpnext-retail",

    // Education-specific tools
    "search_applicants": "erpnext-education",
    "schedule_interview": "erpnext-education",
    "update_application_status": "erpnext-education",
    "create_student_record": "erpnext-education",
    "manage_academic_calendar": "erpnext-education",

    // Workflow bridge tool
    "execute_workflow_graph": "workflow-bridge",

    // Deep research tools
    "query_database": "erpnext-core",
    "spawn_verification_agent": "orchestration",
    "cross_validate_findings": "orchestration",
    "synthesize_analysis": "orchestration",

    // Orchestration tools
    "classify_request": "orchestration",
    "invoke_subagent": "orchestration",
    "aggregate_results": "orchestration",
    "initiate_deep_research": "orchestration"
  };

  // Map tools to servers
  for (const tool of config.tools) {
    const server = toolToServerMap[tool];
    if (server && allMCPServers.includes(server)) {
      requiredServers.add(server);
    }
  }

  return Array.from(requiredServers);
}

/**
 * Validate subagent configuration
 */
export function validateSubagentConfig(config: SubagentConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check required fields
  if (!config.name || config.name.trim() === "") {
    errors.push("Subagent name is required");
  }

  if (!config.description || config.description.trim() === "") {
    errors.push("Subagent description is required");
  }

  if (!config.tools || config.tools.length === 0) {
    errors.push("Subagent must have at least one tool");
  }

  if (!config.model || config.model.trim() === "") {
    errors.push("Subagent model is required");
  }

  if (!config.systemPrompt || config.systemPrompt.trim() === "") {
    errors.push("Subagent system prompt is required");
  }

  // Validate model format
  if (config.model && !config.model.startsWith("claude-")) {
    errors.push("Subagent model must be a Claude model");
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Get subagent statistics
 */
export function getSubagentStats(registry: SubagentRegistry): {
  totalSubagents: number;
  byIndustry: { [key: string]: number };
  totalUniqueTools: number;
  averageToolsPerSubagent: number;
} {
  const totalSubagents = Object.keys(registry).length;
  const byIndustry: { [key: string]: number } = {};
  const allTools = new Set<string>();

  for (const config of Object.values(registry)) {
    // Classify by industry (based on name pattern)
    const industry = config.name.includes("hotel") ? "hotel"
      : config.name.includes("hospital") ? "hospital"
      : config.name.includes("manufacturing") ? "manufacturing"
      : config.name.includes("retail") ? "retail"
      : config.name.includes("education") ? "education"
      : config.name.includes("deep-research") ? "research"
      : "general";

    byIndustry[industry] = (byIndustry[industry] || 0) + 1;

    // Collect unique tools
    config.tools.forEach(tool => allTools.add(tool));
  }

  const totalTools = Array.from(allTools).length;
  const averageTools = totalSubagents > 0
    ? Object.values(registry).reduce((sum, c) => sum + c.tools.length, 0) / totalSubagents
    : 0;

  return {
    totalSubagents,
    byIndustry,
    totalUniqueTools: totalTools,
    averageToolsPerSubagent: Math.round(averageTools * 10) / 10
  };
}
