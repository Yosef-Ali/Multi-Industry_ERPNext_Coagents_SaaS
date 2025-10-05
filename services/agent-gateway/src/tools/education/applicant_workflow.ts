/**
 * T091: applicant_workflow tool - Manage student application workflow
 * Education vertical - Application processing and status management
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';
import { RiskClassifier } from '../../../../../apps/common/risk_classifier';

export const ApplicantWorkflowInputSchema = z.object({
  applicant_id: z.string().optional().describe('Specific applicant to process'),
  action: z.enum([
    'list_pending',
    'review',
    'approve',
    'reject',
    'request_documents',
    'schedule_interview',
    'update_status'
  ]).describe('Workflow action to perform'),
  status: z.string().optional().describe('New status for update_status action'),
  notes: z.string().optional().describe('Review notes or rejection reason'),
  program: z.string().optional().describe('Filter by program for list_pending'),
  limit: z.number().positive().max(100).default(20).describe('Max results for list operations'),
});

export type ApplicantWorkflowInput = z.infer<typeof ApplicantWorkflowInputSchema>;

export interface ApplicantInfo {
  name: string;
  applicant_name: string;
  email_id: string;
  program: string;
  status: string;
  application_date: string;
  application_status?: string;
}

export interface ApplicantWorkflowResult {
  action: string;
  requires_approval: boolean;
  applicant?: ApplicantInfo;
  applicants?: ApplicantInfo[];
  total_count?: number;
  preview?: {
    applicant_id: string;
    action: string;
    changes: Record<string, any>;
  };
  execute?: () => Promise<any>;
  message?: string;
  execution_time_ms: number;
}

/**
 * Manage student applicant workflow
 * Write operations require approval for status changes
 */
export async function applicant_workflow(
  input: ApplicantWorkflowInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<ApplicantWorkflowResult> {
  const startTime = Date.now();

  // Validate input
  const validated = ApplicantWorkflowInputSchema.parse(input);

  try {
    // Read-only actions
    if (validated.action === 'list_pending') {
      const filters: Record<string, any> = {
        docstatus: 0, // Draft
        application_status: ['in', ['Applied', 'Verification Pending', 'Under Review']]
      };

      if (validated.program) {
        filters.program = validated.program;
      }

      const applicantsResponse = await client.call<any[]>({
        method: 'frappe.client.get_list',
        params: {
          doctype: 'Student Applicant',
          filters,
          fields: [
            'name',
            'applicant_name',
            'email_id',
            'program',
            'student_admission_date as application_date',
            'application_status'
          ],
          order_by: 'student_admission_date desc',
          limit_page_length: validated.limit
        }
      });

      return {
        action: validated.action,
        requires_approval: false,
        applicants: applicantsResponse.map(a => ({
          name: a.name,
          applicant_name: a.applicant_name,
          email_id: a.email_id,
          program: a.program,
          status: a.application_status || 'Applied',
          application_date: a.application_date,
        })),
        total_count: applicantsResponse.length,
        execution_time_ms: Date.now() - startTime,
      };
    }

    // Actions requiring applicant_id
    if (!validated.applicant_id) {
      throw new Error('applicant_id is required for this action');
    }

    // Get applicant details
    const applicantResponse = await client.call<any>({
      method: 'frappe.client.get',
      params: {
        doctype: 'Student Applicant',
        name: validated.applicant_id,
        fields: [
          'name',
          'applicant_name',
          'email_id',
          'program',
          'application_status',
          'student_admission_date'
        ]
      }
    });

    const applicant: ApplicantInfo = {
      name: applicantResponse.name,
      applicant_name: applicantResponse.applicant_name,
      email_id: applicantResponse.email_id,
      program: applicantResponse.program,
      status: applicantResponse.application_status || 'Applied',
      application_date: applicantResponse.student_admission_date,
    };

    // Handle write actions with approval
    const writeActions = ['approve', 'reject', 'update_status', 'request_documents'];
    
    if (writeActions.includes(validated.action)) {
      // Determine new status and changes
      let newStatus = validated.status;
      const changes: Record<string, any> = {};

      switch (validated.action) {
        case 'approve':
          newStatus = 'Approved';
          changes.application_status = 'Approved';
          break;
        case 'reject':
          newStatus = 'Rejected';
          changes.application_status = 'Rejected';
          if (validated.notes) {
            changes.rejection_reason = validated.notes;
          }
          break;
        case 'request_documents':
          newStatus = 'Document Pending';
          changes.application_status = 'Document Pending';
          break;
        case 'update_status':
          if (!validated.status) {
            throw new Error('status is required for update_status action');
          }
          changes.application_status = validated.status;
          break;
      }

      if (validated.notes && !changes.rejection_reason) {
        changes.review_notes = validated.notes;
      }

      // Assess risk
      const riskAssessment = RiskClassifier.assess(
        'update',
        'Student Applicant',
        Object.keys(changes),
        0 // Single document
      );

      const requiresApproval = riskAssessment.level !== 'low';

      if (requiresApproval) {
        // Return approval request
        return {
          action: validated.action,
          requires_approval: true,
          applicant,
          preview: {
            applicant_id: validated.applicant_id,
            action: validated.action,
            changes,
          },
          execute: async () => {
            // Update the applicant
            await client.call({
              method: 'frappe.client.set_value',
              params: {
                doctype: 'Student Applicant',
                name: validated.applicant_id,
                fieldname: changes,
              }
            });

            return {
              success: true,
              applicant_id: validated.applicant_id,
              new_status: newStatus,
              message: `Applicant ${validated.action}d successfully`,
            };
          },
          execution_time_ms: Date.now() - startTime,
        };
      } else {
        // Low risk - execute immediately
        await client.call({
          method: 'frappe.client.set_value',
          params: {
            doctype: 'Student Applicant',
            name: validated.applicant_id,
            fieldname: changes,
          }
        });

        return {
          action: validated.action,
          requires_approval: false,
          applicant,
          message: `Applicant ${validated.action}d successfully`,
          execution_time_ms: Date.now() - startTime,
        };
      }
    }

    // Review action (read-only)
    if (validated.action === 'review') {
      return {
        action: validated.action,
        requires_approval: false,
        applicant,
        message: 'Applicant details retrieved for review',
        execution_time_ms: Date.now() - startTime,
      };
    }

    throw new Error(`Unsupported action: ${validated.action}`);
  } catch (error: any) {
    throw new Error(`Failed to process applicant workflow: ${error.message}`);
  }
}
