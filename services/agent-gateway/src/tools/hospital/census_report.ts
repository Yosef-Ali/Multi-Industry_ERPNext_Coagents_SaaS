/**
 * T063: census_report tool - Hospital industry
 * Generate daily census report by ward/unit
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const CensusReportInputSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  ward: z.string().optional(),
  unit: z.string().optional(),
});

export type CensusReportInput = z.infer<typeof CensusReportInputSchema>;

export interface CensusReportResult {
  census_data: Array<{
    ward: string;
    unit: string;
    occupied_beds: number;
    total_beds: number;
    occupancy_rate: number;
    patients: Array<{
      patient_id: string;
      patient_name: string;
      admission_date: string;
      bed_number: string;
      primary_diagnosis: string;
    }>;
  }>;
  total_occupied: number;
  total_beds: number;
  overall_occupancy_rate: number;
  report_date: string;
  requires_approval: false;
}

/**
 * Generate daily census report showing bed occupancy by ward
 * ✅ No approval required (read-only operation)
 */
export async function census_report(
  input: CensusReportInput,
  client: FrappeAPIClient
): Promise<CensusReportResult> {
  // Validate input
  const validated = CensusReportInputSchema.parse(input);

  // Use today's date if not specified
  const reportDate = validated.date || new Date().toISOString().split('T')[0];

  // Build filters
  const filters: any = {
    admission_date: ['<=', reportDate],
    discharge_date: [['is', 'not set'], ['>=', reportDate]],
  };

  if (validated.ward) {
    filters.ward = validated.ward;
  }

  if (validated.unit) {
    filters.unit = validated.unit;
  }

  // Get active admissions
  const admissionsResult = await client.searchDoc({
    doctype: 'Patient Admission',
    filters,
    fields: ['patient', 'patient_name', 'admission_date', 'ward', 'unit', 'bed_number', 'primary_diagnosis'],
  });

  // Get total beds per ward
  const bedsResult = await client.searchDoc({
    doctype: 'Healthcare Bed',
    filters: validated.ward ? { ward: validated.ward } : {},
    fields: ['ward', 'unit', 'bed_number', 'status'],
  });

  // Group by ward/unit
  const wardData = new Map<string, any>();

  // Initialize ward data from beds
  for (const bed of bedsResult.documents) {
    const key = `${bed.ward}|${bed.unit || 'General'}`;
    if (!wardData.has(key)) {
      wardData.set(key, {
        ward: bed.ward,
        unit: bed.unit || 'General',
        occupied_beds: 0,
        total_beds: 0,
        patients: [],
      });
    }
    wardData.get(key).total_beds++;
  }

  // Add patient data
  for (const admission of admissionsResult.documents) {
    const key = `${admission.ward}|${admission.unit || 'General'}`;
    if (!wardData.has(key)) {
      wardData.set(key, {
        ward: admission.ward,
        unit: admission.unit || 'General',
        occupied_beds: 0,
        total_beds: 0,
        patients: [],
      });
    }

    const ward = wardData.get(key);
    ward.occupied_beds++;
    ward.patients.push({
      patient_id: admission.patient,
      patient_name: admission.patient_name,
      admission_date: admission.admission_date,
      bed_number: admission.bed_number,
      primary_diagnosis: admission.primary_diagnosis || 'Not specified',
    });
  }

  // Calculate occupancy rates
  const censusData = Array.from(wardData.values()).map(ward => ({
    ...ward,
    occupancy_rate: ward.total_beds > 0
      ? parseFloat(((ward.occupied_beds / ward.total_beds) * 100).toFixed(2))
      : 0,
  }));

  // Calculate totals
  const totalOccupied = censusData.reduce((sum, w) => sum + w.occupied_beds, 0);
  const totalBeds = censusData.reduce((sum, w) => sum + w.total_beds, 0);
  const overallOccupancyRate = totalBeds > 0
    ? parseFloat(((totalOccupied / totalBeds) * 100).toFixed(2))
    : 0;

  return {
    census_data: censusData,
    total_occupied: totalOccupied,
    total_beds: totalBeds,
    overall_occupancy_rate: overallOccupancyRate,
    report_date: reportDate,
    requires_approval: false,
  };
}

// Tool metadata for registry
export const census_report_tool = {
  name: 'census_report',
  description: 'Generate daily hospital census report showing bed occupancy by ward',
  inputSchema: CensusReportInputSchema,
  handler: census_report,
  requires_approval: false,
  operation_type: 'read',
  industry: 'hospital',
};
