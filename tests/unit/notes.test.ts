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

  it('escapes html instead of rendering it', () => {
    expect(notesToHtml('<script>alert(1)</script> & <b>bold</b>')).toBe(
      '<p>&lt;script&gt;alert(1)&lt;/script&gt; &amp; &lt;b&gt;bold&lt;/b&gt;</p>',
    );
  });

  it('does not let a link break out of its attribute', () => {
    const html = notesToHtml('https://example.com/"onmouseover="alert(1)');
    expect(html).not.toContain('"onmouseover');
    expect(html).toContain('&quot;onmouseover=&quot;');
  });

  it('turns web addresses into links', () => {
    expect(notesToHtml('Rules: https://example.com/rules.')).toBe(
      '<p>Rules: <a href="https://example.com/rules" target="_blank" rel="noopener nofollow">https://example.com/rules</a>.</p>',
    );
  });
});
