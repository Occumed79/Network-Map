const FORMULA_PREFIX = /^[\s\u0000-\u001f]*[=+\-@]/;

/**
 * Prevents spreadsheet applications from interpreting user/provider data as a
 * formula when exported to CSV/XLSX. The apostrophe is intentionally part of
 * the cell value and remains visible to CSV consumers that do not understand
 * spreadsheet quoting semantics.
 */
export function sanitizeSpreadsheetCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
}

export function csvCell(value: unknown): string {
  const safe = sanitizeSpreadsheetCell(value);
  return `"${safe.replace(/"/g, '""')}"`;
}

export function csvRow(values: unknown[]): string {
  return values.map(csvCell).join(",");
}
