// Date-only helpers to avoid timezone issues
// Stores dates as "YYYY-MM-DD" strings without time component

/**
 * Convert a Date to a date-only string "YYYY-MM-DD"
 */
export function toDateOnlyString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date-only string "YYYY-MM-DD" to a local Date (at midnight)
 */
export function fromDateOnlyString(dateString: string): Date {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Check if a string is in ISO format (contains 'T')
 * Used for migrating legacy dates
 */
export function isISOFormat(dateString: string): boolean {
  return dateString.includes('T');
}

/**
 * Migrate a legacy ISO date string to date-only format
 */
export function migrateToDateOnly(dateString: string): string {
  if (isISOFormat(dateString)) {
    return toDateOnlyString(new Date(dateString));
  }
  return dateString;
}
