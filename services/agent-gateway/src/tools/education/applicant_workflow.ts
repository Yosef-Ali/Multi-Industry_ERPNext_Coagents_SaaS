/**
 * T069: applicant_workflow tool - Education industry
 * Advance applicant through workflow stages (shortlist, interview, admit)
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const ApplicantWorkflowInputSchema = z.object({
  applicant: z.string().min(1, 'Applicant ID is required'),
  action: z.enum(['shortlist', 'schedule_interview', 'reject', 'admit'], {
    errorMap: () => ({ message: 'Action must be one of: shortlist, schedule_interview, reject, admit' }),
  }),
  comments: z.string().optional(),
});

export type ApplicantWorkflowInput = z.infer<typeof ApplicantWorkflowInputSchema>;

export interface ApplicantWorkflowResult {
  requires_approval: true;
  applicant: string;
  current_status: string;
  new_status: string;
  action: string;
  preview: {
    applicant_name: string;
    program: string;
    current_status: string;
    proposed_status: string;
    action: string;
    comments?: string;
  };
}

/**
 * Advance applicant through admission workflow
 * ⚠️ Requires approval (status change operations)
 */
export async function applicant_workflow(
  input: ApplicantWorkflowInput,
  client: FrappeAPIClient
): Promise<ApplicantWorkflowResult> {
  // Validate input
  const validated = ApplicantWorkflowInputSchema.parse(input);

  // Get current applicant details
  const applicantDoc = await client.getDoc({
    doctype: 'Student Applicant',
    name: validated.applicant,
  });

  if (!applicantDoc) {
    throw new Error(`Applicant ${validated.applicant} not found`);
  }

  // Determine new status based on action
  const statusMap: Record<string, string> = {
    shortlist: 'Shortlisted',
    schedule_interview: 'Interview Scheduled',
    reject: 'Rejected',
    admit: 'Admitted',
  };

  const currentStatus = applicantDoc.application_status || 'Applied';
  const newStatus = statusMap[validated.action];

  // Return preview for approval
  return {
    requires_approval: true,
    applicant: validated.applicant,
    current_status: currentStatus,
    new_status: newStatus,
    action: validated.action,
    preview: {
      applicant_name: applicantDoc.student_name || applicantDoc.first_name,
      program: applicantDoc.program || 'Not specified',
      current_status: currentStatus,
      proposed_status: newStatus,
      action: validated.action,
      ...(validated.comments && { comments: validated.comments }),
    },
  };
}

// Tool metadata for registry
export const applicant_workflow_tool = {
  name: 'applicant_workflow',
  description: 'Advance applicant through admission workflow stages (shortlist, interview, reject, admit)',
  inputSchema: ApplicantWorkflowInputSchema,
  handler: applicant_workflow,
  requires_approval: true,
  operation_type: 'write' as const,
  industry: 'education',
};
