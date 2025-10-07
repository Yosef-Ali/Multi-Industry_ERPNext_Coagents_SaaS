'use client';

import Link from 'next/link';

type Prompt = {
  label: string;
  query: string;
};

const developerPrompts: Prompt[] = [
  {
    label: 'Build a dental clinic app',
    query: 'Create a dental clinic ERPNext app with appointment scheduling, patient intake, treatment plans, and billing automation.',
  },
  {
    label: 'Student enrollment DocType',
    query: 'Create a simple DocType for student enrollment with fields: full_name, date_of_birth, parent_contact, grade_level',
  },
  {
    label: 'Order fulfillment workflow',
    query: 'Generate an ERPNext workflow: validate_inventory → create_pick_list → pack_order → ship_order',
  },
  {
    label: 'Manufacturing BOM tool',
    query: 'Build a manufacturing BOM explosion tool that lists component requirements and stock availability',
  },
  {
    label: 'Hospital admission workflow',
    query: 'Design a hospital admissions workflow: register_patient → create_admission → create_orders → schedule_billing',
  },
  {
    label: 'Retail inventory sync',
    query: 'Create a retail inventory_check tool to show stock across store locations with alerts for low stock',
  },
];

export function SuggestedPrompts() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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

