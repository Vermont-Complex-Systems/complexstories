const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatMonth(dateStr: string): string {
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }
  // Fallback for MM/DD/YYYY format
  const [month, , year] = dateStr.split('/').map(Number);
  return `${MONTHS[month - 1]} ${year}`;
}

export function parseTags(tags: string, lowercase = false): string[] {
  if (!tags) return [];
  return tags.split(',').map((t) => lowercase ? t.trim().toLowerCase() : t.trim()).filter(Boolean);
}
