/**
 * T092: interview_scheduling tool - Schedule interviews with availability check
 * Education vertical - Interview management for student applicants
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const InterviewSchedulingInputSchema = z.object({
  applicant_id: z.string().describe('Student Applicant ID'),
  action: z.enum(['check_availability', 'schedule', 'reschedule', 'cancel']).describe('Scheduling action'),
  interview_date: z.string().optional().describe('Proposed interview date (YYYY-MM-DD)'),
  interview_time: z.string().optional().describe('Proposed interview time (HH:MM)'),
  interviewer: z.string().optional().describe('Interviewer user ID or name'),
  room: z.string().optional().describe('Interview room/location'),
  duration_minutes: z.number().positive().default(30).describe('Interview duration in minutes'),
  notes: z.string().optional().describe('Additional notes or cancellation reason'),
});

export type InterviewSchedulingInput = z.infer<typeof InterviewSchedulingInputSchema>;

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
  interviewer?: string;
  reason?: string;
}

export interface InterviewDetails {
  name?: string;
  applicant: string;
  applicant_name: string;
  scheduled_on: string;
  from_time: string;
  to_time: string;
  interviewer?: string;
  room?: string;
  status: string;
}

export interface InterviewSchedulingResult {
  action: string;
  requires_approval: boolean;
  applicant_id: string;
  available_slots?: TimeSlot[];
  interview?: InterviewDetails;
  preview?: {
    applicant_id: string;
    interview_date: string;
    interview_time: string;
    interviewer?: string;
    room?: string;
  };
  execute?: () => Promise<any>;
  message?: string;
  execution_time_ms: number;
}

/**
 * Calculate end time based on start time and duration
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  
  const endDate = new Date(startDate.getTime() + durationMinutes * 60000);
  
  const endHours = endDate.getHours().toString().padStart(2, '0');
  const endMinutes = endDate.getMinutes().toString().padStart(2, '0');
  
  return `${endHours}:${endMinutes}`;
}

/**
 * Schedule and manage interviews for student applicants
 * Write operations may require approval
 */
export async function interview_scheduling(
  input: InterviewSchedulingInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<InterviewSchedulingResult> {
  const startTime = Date.now();

  // Validate input
  const validated = InterviewSchedulingInputSchema.parse(input);

  try {
    // Get applicant details
    const applicantResponse = await client.call<any>({
      method: 'frappe.client.get',
      params: {
        doctype: 'Student Applicant',
        name: validated.applicant_id,
        fields: ['name', 'applicant_name', 'email_id', 'program']
      }
    });

    const applicant = applicantResponse;

    // Check availability action
    if (validated.action === 'check_availability') {
      if (!validated.interview_date || !validated.interviewer) {
        throw new Error('interview_date and interviewer are required for checking availability');
      }

      // Get existing interviews for the date and interviewer
      const existingInterviewsResponse = await client.call<any[]>({
        method: 'frappe.client.get_list',
        params: {
          doctype: 'Student Applicant Interview',
          filters: {
            scheduled_on: validated.interview_date,
            interviewer: validated.interviewer,
            status: ['not in', ['Cancelled']]
          },
          fields: ['from_time', 'to_time'],
          limit_page_length: 100
        }
      });

      // Generate time slots (9 AM to 5 PM, 30-minute intervals)
      const slots: TimeSlot[] = [];
      const businessHours = { start: 9, end: 17 }; // 9 AM to 5 PM

      for (let hour = businessHours.start; hour < businessHours.end; hour++) {
        for (let minute = 0; minute < 60; minute += 30) {
          const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
          const endTime = calculateEndTime(time, validated.duration_minutes);

          // Check if slot conflicts with existing interviews
          let available = true;
          let conflictReason: string | undefined;

          for (const interview of existingInterviewsResponse) {
            if (time < interview.to_time && endTime > interview.from_time) {
              available = false;
              conflictReason = 'Interview already scheduled';
              break;
            }
          }

          slots.push({
            date: validated.interview_date,
            time,
            available,
            interviewer: validated.interviewer,
            reason: conflictReason,
          });
        }
      }

      return {
        action: validated.action,
        requires_approval: false,
        applicant_id: validated.applicant_id,
        available_slots: slots.filter(s => s.available),
        message: `Found ${slots.filter(s => s.available).length} available slots`,
        execution_time_ms: Date.now() - startTime,
      };
    }

    // Schedule action
    if (validated.action === 'schedule') {
      if (!validated.interview_date || !validated.interview_time) {
        throw new Error('interview_date and interview_time are required for scheduling');
      }

      const endTime = calculateEndTime(validated.interview_time, validated.duration_minutes);

      const interviewData = {
        applicant: validated.applicant_id,
        applicant_name: applicant.applicant_name,
        scheduled_on: validated.interview_date,
        from_time: validated.interview_time,
        to_time: endTime,
        interviewer: validated.interviewer,
        room: validated.room,
        status: 'Pending',
        notes: validated.notes,
      };

      // Create interview (low risk - auto-execute)
      const createResponse = await client.call<any>({
        method: 'frappe.client.insert',
        params: {
          doc: {
            doctype: 'Student Applicant Interview',
            ...interviewData
          }
        }
      });

      return {
        action: validated.action,
        requires_approval: false,
        applicant_id: validated.applicant_id,
        interview: {
          name: createResponse.name,
          ...interviewData,
        } as InterviewDetails,
        message: `Interview scheduled successfully for ${validated.interview_date} at ${validated.interview_time}`,
        execution_time_ms: Date.now() - startTime,
      };
    }

    // Cancel action
    if (validated.action === 'cancel') {
      // Get existing interview
      const interviewResponse = await client.call<any[]>({
        method: 'frappe.client.get_list',
        params: {
          doctype: 'Student Applicant Interview',
          filters: {
            applicant: validated.applicant_id,
            status: ['not in', ['Cancelled', 'Completed']]
          },
          fields: ['name', 'scheduled_on', 'from_time', 'to_time'],
          limit_page_length: 1
        }
      });

      if (interviewResponse.length === 0) {
        throw new Error('No active interview found for this applicant');
      }

      const interview = interviewResponse[0];

      // Update status to cancelled
      await client.call({
        method: 'frappe.client.set_value',
        params: {
          doctype: 'Student Applicant Interview',
          name: interview.name,
          fieldname: {
            status: 'Cancelled',
            cancellation_reason: validated.notes || 'Cancelled by user'
          }
        }
      });

      return {
        action: validated.action,
        requires_approval: false,
        applicant_id: validated.applicant_id,
        message: 'Interview cancelled successfully',
        execution_time_ms: Date.now() - startTime,
      };
    }

    throw new Error(`Unsupported action: ${validated.action}`);
  } catch (error: any) {
    throw new Error(`Failed to process interview scheduling: ${error.message}`);
  }
}
