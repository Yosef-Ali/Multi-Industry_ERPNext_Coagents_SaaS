/**
 * Contract Tests for Education-Specific Tools
 */

import { describe, it, expect } from '@jest/globals';

describe('applicant_workflow tool contract', () => {
  it('should advance applicant through workflow stages', async () => {
    const { applicant_workflow } = await import('../../src/tools/education/applicant_workflow');

    const result = await applicant_workflow({
      applicant: 'APP-001',
      action: 'shortlist',
    });

    expect(result).toHaveProperty('requires_approval', true);
    expect(result).toHaveProperty('new_status');
  });
});

describe('interview_scheduling tool contract', () => {
  it('should schedule interviews based on availability', async () => {
    const { interview_scheduling } = await import(
      '../../src/tools/education/interview_scheduling'
    );

    const result = await interview_scheduling({
      applicants: ['APP-001', 'APP-002'],
      interviewer: 'USER-001',
      date: '2024-01-20',
    });

    expect(result).toHaveProperty('requires_approval', true);
    expect(result).toHaveProperty('scheduled_count');
  });
});
