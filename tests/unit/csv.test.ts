import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '@/lib/domain/csv';

describe('csv output', () => {
  it('leaves plain cells alone', () => {
    expect(csvCell('Rovers')).toBe('Rovers');
    expect(csvCell(-3)).toBe('-3');
    expect(csvCell(null)).toBe('');
  });

  it('quotes cells with commas, quotes or newlines', () => {
    expect(csvCell('Reed, Dan')).toBe('"Reed, Dan"');
    expect(csvCell('The "Lions"')).toBe('"The ""Lions"""');
  });

  it('defuses spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
  });

  it('joins rows with CRLF', () => {
    expect(
      toCsv([
        ['a', 1],
        ['b', 2],
      ]),
    ).toBe('a,1\r\nb,2\r\n');
  });
});
