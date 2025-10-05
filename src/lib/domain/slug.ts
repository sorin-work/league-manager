/**
 * Turns a display name into a url-safe slug, e.g. "Sunday League 2025/26" -> "sunday-league-2025-26".
 */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[/\\.]+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Returns `slugify(name)` or, when that slug is already taken, the first free
 * variant with a numeric suffix ("rovers", "rovers-2", "rovers-3", ...).
 */
export function uniqueSlug(name: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const base = slugify(name) || 'item';
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) {
    const candidate = `${base}-${i}`;
    if (!used.has(candidate)) return candidate;
  }
}
