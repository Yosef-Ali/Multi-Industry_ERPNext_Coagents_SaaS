/**
 * T056: run_report tool - Execute ERPNext report
 * Read-only operation, no approval required
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const RunReportInputSchema = z.object({
  report_name: z.string().min(1, 'Report name is required'),
  filters: z.record(z.unknown()).optional().default({}),
  format: z.enum(['json', 'csv', 'xlsx']).optional().default('json'),
});

export type RunReportInput = z.infer<typeof RunReportInputSchema>;

export interface RunReportResult {
  columns: Array<{
    label: string;
    fieldname: string;
    fieldtype: string;
    width?: number;
  }>;
  data: any[];
  report_name: string;
  filters: Record<string, any>;
  row_count: number;
  requires_approval: false;
  execution_time_ms: number;
}

/**
 * Execute ERPNext report with filters
 * ✅ No approval required (read-only operation)
 */
export async function run_report(
  input: RunReportInput,
  client: FrappeAPIClient
): Promise<RunReportResult> {
  const startTime = Date.now();

  // Validate input
  const validated = RunReportInputSchema.parse(input);

  // Execute report via Frappe API
  const result = await client.runReport({
    report_name: validated.report_name,
    filters: validated.filters,
  });

  const executionTime = Date.now() - startTime;

  return {
    columns: result.columns,
    data: result.data,
    report_name: validated.report_name,
    filters: validated.filters,
    row_count: result.data.length,
    requires_approval: false, // Read-only
    execution_time_ms: executionTime,
  };
}

// Tool metadata for registry
export const run_report_tool = {
  name: 'run_report',
  description: 'Execute ERPNext report with filters and return formatted results',
  inputSchema: RunReportInputSchema,
  handler: run_report,
  requires_approval: false,
  operation_type: 'read',
};
