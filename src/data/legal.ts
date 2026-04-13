import details from './legal-details.json';

export const legalDetails = details;
type LegalField = keyof typeof details;

export function legalValue(field: LegalField): string {
  return details[field].trim();
}

export function legalDate(value: string): string {
  if (!value.trim()) return '';
  const date = new Date(`${value}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    throw new Error('Legal document dates must use YYYY-MM-DD.');
  }
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}
