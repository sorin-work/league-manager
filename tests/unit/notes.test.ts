import { describe, expect, it } from 'vitest';
import { notesToHtml } from '@/lib/notes';

describe('notesToHtml', () => {
  it('returns nothing for empty notes', () => {
    expect(notesToHtml(null)).toBe('');
    expect(notesToHtml('   \n ')).toBe('');
  });

  it('splits paragraphs on blank lines', () => {
    expect(notesToHtml('First.\n\nSecond.')).toBe('<p>First.</p><p>Second.</p>');
  });

  it('keeps single line breaks', () => {
    expect(notesToHtml('Line one\nLine two')).toBe('<p>Line one<br>Line two</p>');
  });

  it('turns web addresses into links', () => {
    expect(notesToHtml('Rules: https://example.com/rules.')).toBe(
      '<p>Rules: <a href="https://example.com/rules" target="_blank" rel="noopener nofollow">https://example.com/rules</a>.</p>',
    );
  });
});
