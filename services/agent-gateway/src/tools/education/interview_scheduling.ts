/**
 * T070: interview_scheduling tool - Education industry
 * Schedule interviews for multiple applicants with availability checking
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const InterviewSchedulingInputSchema = z.object({
  applicants: z.array(z.string()).min(1, 'At least one applicant is required'),
  interviewer: z.string().min(1, 'Interviewer is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  start_time: z.string().regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format').optional(),
  duration_minutes: z.number().int().positive().optional().default(30),
  room: z.string().optional(),
});

export type InterviewSchedulingInput = z.infer<typeof InterviewSchedulingInputSchema>;

export interface ScheduledInterview {
  applicant: string;
  applicant_name: string;
  scheduled_date: string;
  scheduled_time: string;
  interviewer: string;
  room?: string;
  duration_minutes: number;
}

export interface InterviewSchedulingResult {
  requires_approval: true;
  scheduled_count: number;
  interviews: ScheduledInterview[];
  date: string;
  interviewer: string;
  preview: {
    total_applicants: number;
    scheduled_date: string;
    interviewer_name: string;
    time_slots: Array<{
      applicant: string;
      time: string;
    }>;
    conflicts?: string[];
  };
}

/**
 * Schedule interviews for multiple applicants
 * ⚠️ Requires approval (creating interview appointments)
 */
export async function interview_scheduling(
  input: InterviewSchedulingInput,
  client: FrappeAPIClient
): Promise<InterviewSchedulingResult> {
  // Validate input
  const validated = InterviewSchedulingInputSchema.parse(input);

  // Get interviewer details
  const interviewerDoc = await client.getDoc({
    doctype: 'User',
    name: validated.interviewer,
  }).catch(() => ({ full_name: validated.interviewer }));

  const interviewerName = interviewerDoc.full_name || validated.interviewer;

  // Get applicant details
  const applicantPromises = validated.applicants.map(applicantId =>
    client.getDoc({
      doctype: 'Student Applicant',
      name: applicantId,
    }).catch(() => ({ name: applicantId, student_name: applicantId }))
  );

  const applicantDocs = await Promise.all(applicantPromises);

  // Check for existing appointments on the date
  const existingAppointments = await client.searchDoc({
    doctype: 'Interview',
    filters: {
      scheduled_on: validated.date,
      interviewer: validated.interviewer,
    },
    fields: ['scheduled_on', 'from_time', 'to_time', 'student_applicant'],
  }).catch(() => ({ documents: [] }));

  // Generate time slots (starting from start_time or 09:00)
  const startTime = validated.start_time || '09:00';
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const durationMinutes = validated.duration_minutes;

  const interviews: ScheduledInterview[] = [];
  const timeSlots: Array<{ applicant: string; time: string }> = [];
  const conflicts: string[] = [];

  let currentMinutes = startHour * 60 + startMinute;

  for (let i = 0; i < applicantDocs.length; i++) {
    const applicant = applicantDocs[i];
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    const timeSlot = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // Check for conflicts
    const hasConflict = existingAppointments.documents.some((appt: any) => {
      const fromTime = appt.from_time;
      const toTime = appt.to_time;
      return timeSlot >= fromTime && timeSlot < toTime;
    });

    if (hasConflict) {
      conflicts.push(`${timeSlot} - ${applicant.student_name || applicant.name} (time slot conflict)`);
    }

    interviews.push({
      applicant: applicant.name,
      applicant_name: applicant.student_name || applicant.first_name || applicant.name,
      scheduled_date: validated.date,
      scheduled_time: timeSlot,
      interviewer: validated.interviewer,
      ...(validated.room && { room: validated.room }),
      duration_minutes: durationMinutes,
    });

    timeSlots.push({
      applicant: applicant.student_name || applicant.name,
      time: timeSlot,
    });

    // Increment time for next slot
    currentMinutes += durationMinutes;
  }

  return {
    requires_approval: true,
    scheduled_count: interviews.length,
    interviews,
    date: validated.date,
    interviewer: validated.interviewer,
    preview: {
      total_applicants: validated.applicants.length,
      scheduled_date: validated.date,
      interviewer_name: interviewerName,
      time_slots: timeSlots,
      ...(conflicts.length > 0 && { conflicts }),
    },
  };
}

// Tool metadata for registry
export const interview_scheduling_tool = {
  name: 'interview_scheduling',
  description: 'Schedule interviews for multiple applicants with conflict detection and time slot allocation',
  inputSchema: InterviewSchedulingInputSchema,
  handler: interview_scheduling,
  requires_approval: true,
  operation_type: 'write' as const,
  industry: 'education',
};
