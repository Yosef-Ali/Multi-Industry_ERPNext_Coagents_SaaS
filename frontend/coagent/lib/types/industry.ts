/**
 * Industry type helpers
 * Maintains canonical industry identifiers used across the app
 */

export type IndustryKey = 'hotel' | 'hospital' | 'manufacturing' | 'retail' | 'education';

export const SUPPORTED_INDUSTRIES: IndustryKey[] = [
  'hotel',
  'hospital',
  'manufacturing',
  'retail',
  'education',
];

const INDUSTRY_SYNONYMS: Record<string, IndustryKey> = {
  hotel: 'hotel',
  hospitality: 'hotel',
  hospital: 'hospital',
  clinic: 'hospital',
  healthcare: 'hospital',
  manufacturing: 'manufacturing',
  factory: 'manufacturing',
  warehouse: 'manufacturing',
  retail: 'retail',
  commerce: 'retail',
  storefront: 'retail',
  education: 'education',
  school: 'education',
  university: 'education',
};

export const INDUSTRY_DISPLAY_NAMES: Record<IndustryKey, string> = {
  hotel: 'Hotel & Hospitality',
  hospital: 'Healthcare',
  manufacturing: 'Manufacturing & Warehouse',
  retail: 'Retail & Commerce',
  education: 'Education',
};

export const INDUSTRY_CAPABILITIES: Record<IndustryKey, string> = {
  hotel: 'room reservations, guest check-ins, billing, and housekeeping management',
  hospital: 'patient admissions, appointments, clinical documentation, and billing workflows',
  manufacturing: 'production planning, work orders, inventory transfers, and quality checks',
  retail: 'sales orders, customer management, inventory, and point of sale operations',
  education: 'student enrollment, attendance tracking, grade management, and reporting',
};

/**
 * Return the canonical industry key for a given label or alias.
 */
export function normalizeIndustry(value?: string | null): IndustryKey | null {
  if (!value) return null;
  const key = value.toLowerCase().trim();
  return INDUSTRY_SYNONYMS[key] ?? null;
}

/**
 * Format a string into Title Case for display when industry is unknown.
 */
export function toDisplayName(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
