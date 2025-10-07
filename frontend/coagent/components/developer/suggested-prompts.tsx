'use client';

import Link from 'next/link';

type Prompt = {
  label: string;
  query: string;
};

const developerPrompts: Prompt[] = [
  {
    label: 'Create a simple DocType for student enrollment',
    query: 'Create a simple DocType for student enrollment with fields: full_name, date_of_birth, parent_contact, grade_level',
  },
  {
    label: 'Generate a workflow for order fulfillment',
    query: 'Generate an ERPNext workflow: validate_inventory → create_pick_list → pack_order → ship_order',
  },
  {
    label: 'Build a manufacturing BOM explosion tool',
    query: 'Build a manufacturing BOM explosion tool that lists component requirements and stock availability',
  },
  {
    label: 'Create a hotel reservation system',
    query: 'Create a hotel reservation module with room availability check and reservation creation',
  },
  {
    label: 'Show me best practices for ERPNext apps',
    query: 'List best practices for building ERPNext apps with client scripts and server validations',
  },
  {
    label: 'Design hospital admission workflow',
    query: 'Design a hospital admissions workflow: register_patient → create_admission → create_orders → schedule_billing',
  },
  {
    label: 'Retail inventory sync tool',
    query: 'Create a retail inventory_check tool to show stock across store locations with alerts for low stock',
  },
  {
    label: 'Education interview scheduling',
    query: 'Implement interview_scheduling for student applications with availability checks and reminders',
  },
];

export function SuggestedPrompts() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {developerPrompts.map((p) => (
        <Link
          key={p.label}
          href={`/developer?query=${encodeURIComponent(p.query)}`}
          className="rounded-xl border border-border bg-background px-3 py-2 text-sm hover:bg-muted"
        >
          {p.label}
        </Link>
      ))}
    </div>
  );
}

