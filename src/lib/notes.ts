const URL = /\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)]/g;

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
    .map((paragraph) => `<p>${linkify(paragraph.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}
