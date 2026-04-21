const URL = /\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g;

const ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ENTITIES[ch]);
}

/** Expects already escaped text, so a url cannot break out of the attribute. */
function linkify(text: string): string {
  return text.replace(
    URL,
    (url) => `<a href="${url}" target="_blank" rel="noopener nofollow">${url}</a>`,
  );
}

/**
 * Formats the free-text season notes for display: blank lines start a new
 * paragraph, single line breaks are kept and web addresses become links.
 */
export function notesToHtml(notes: string | null | undefined): string {
  if (!notes?.trim()) return '';
  return notes
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => `<p>${linkify(escapeHtml(paragraph.trim())).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
