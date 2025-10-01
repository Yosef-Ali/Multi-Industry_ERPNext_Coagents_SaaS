/**
 * T064: ar_by_payer tool - Hospital industry
 * Generate accounts receivable report by insurance payer
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const ARByPayerInputSchema = z.object({
  as_of_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  payer: z.string().optional(), // Specific insurance payer
  aging_buckets: z.array(z.number()).optional().default([30, 60, 90, 120]),
});

export type ARByPayerInput = z.infer<typeof ARByPayerInputSchema>;

export interface ARByPayerResult {
  ar_summary: Array<{
    payer: string;
    payer_type: string;
    current: number;      // 0-30 days
    days_31_60: number;
    days_61_90: number;
    days_91_120: number;
    over_120: number;
    total_ar: number;
    claim_count: number;
  }>;
  grand_total_ar: number;
  total_claims: number;
  as_of_date: string;
  requires_approval: false;
}

/**
 * Generate A/R report by insurance payer with aging analysis
 * ✅ No approval required (read-only operation)
 */
export async function ar_by_payer(
  input: ARByPayerInput,
  client: FrappeAPIClient
): Promise<ARByPayerResult> {
  // Validate input
  const validated = ARByPayerInputSchema.parse(input);

  // Use today's date if not specified
  const asOfDate = validated.as_of_date || new Date().toISOString().split('T')[0];
  const asOfTimestamp = new Date(asOfDate).getTime();

  // Build filters for outstanding claims
  const filters: any = {
    status: ['in', ['Submitted', 'Partially Paid']],
    outstanding_amount: ['>', 0],
  };

  if (validated.payer) {
    filters.insurance_payer = validated.payer;
  }

  // Get outstanding claims
  const claimsResult = await client.searchDoc({
    doctype: 'Insurance Claim',
    filters,
    fields: ['name', 'insurance_payer', 'payer_type', 'submission_date', 'outstanding_amount', 'total_amount'],
  });

  // Group by payer and calculate aging
  const payerData = new Map<string, any>();

  for (const claim of claimsResult.documents) {
    const payerKey = claim.insurance_payer;

    if (!payerData.has(payerKey)) {
      payerData.set(payerKey, {
        payer: claim.insurance_payer,
        payer_type: claim.payer_type || 'Unknown',
        current: 0,
        days_31_60: 0,
        days_61_90: 0,
        days_91_120: 0,
        over_120: 0,
        total_ar: 0,
        claim_count: 0,
      });
    }

    const payer = payerData.get(payerKey);
    const submissionDate = new Date(claim.submission_date).getTime();
    const daysOld = Math.floor((asOfTimestamp - submissionDate) / (1000 * 60 * 60 * 24));
    const amount = claim.outstanding_amount;

    // Classify into aging bucket
    if (daysOld <= 30) {
      payer.current += amount;
    } else if (daysOld <= 60) {
      payer.days_31_60 += amount;
    } else if (daysOld <= 90) {
      payer.days_61_90 += amount;
    } else if (daysOld <= 120) {
      payer.days_91_120 += amount;
    } else {
      payer.over_120 += amount;
    }

    payer.total_ar += amount;
    payer.claim_count++;
  }

  // Convert to array and round amounts
  const arSummary = Array.from(payerData.values()).map(payer => ({
    ...payer,
    current: parseFloat(payer.current.toFixed(2)),
    days_31_60: parseFloat(payer.days_31_60.toFixed(2)),
    days_61_90: parseFloat(payer.days_61_90.toFixed(2)),
    days_91_120: parseFloat(payer.days_91_120.toFixed(2)),
    over_120: parseFloat(payer.over_120.toFixed(2)),
    total_ar: parseFloat(payer.total_ar.toFixed(2)),
  }));

  // Sort by total AR descending
  arSummary.sort((a, b) => b.total_ar - a.total_ar);

  // Calculate grand totals
  const grandTotalAR = arSummary.reduce((sum, p) => sum + p.total_ar, 0);
  const totalClaims = arSummary.reduce((sum, p) => sum + p.claim_count, 0);

  return {
    ar_summary: arSummary,
    grand_total_ar: parseFloat(grandTotalAR.toFixed(2)),
    total_claims: totalClaims,
    as_of_date: asOfDate,
    requires_approval: false,
  };
}

// Tool metadata for registry
export const ar_by_payer_tool = {
  name: 'ar_by_payer',
  description: 'Generate accounts receivable report by insurance payer with aging analysis',
  inputSchema: ARByPayerInputSchema,
  handler: ar_by_payer,
  requires_approval: false,
  operation_type: 'read',
  industry: 'hospital',
};
