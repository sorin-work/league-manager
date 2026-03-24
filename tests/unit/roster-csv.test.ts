import { describe, expect, it } from 'vitest';
import { parseRosterCsv, splitCsvLine } from '@/lib/domain/roster-csv';

describe('splitCsvLine', () => {
  it('splits on the delimiter and trims cells', () => {
    expect(splitCsvLine(' Ana Pop , 7 ', ',')).toEqual(['Ana Pop', '7']);
  });

  it('keeps delimiters and escaped quotes inside quotes', () => {
    expect(splitCsvLine('"Reed, Dan",9,"say ""hi"""', ',')).toEqual(['Reed, Dan', '9', 'say "hi"']);
  });
});

describe('parseRosterCsv', () => {
  it('reads a file with a header in any column order', () => {
    const res = parseRosterCsv('Number,Name\n1,Sam Keeper\n9,Ben Striker\n');
    expect(res.errors).toEqual([]);
    expect(res.players).toEqual([
      { name: 'Sam Keeper', shirtNumber: 1 },
      { name: 'Ben Striker', shirtNumber: 9 },
    ]);
  });

  it('reads a file without a header', () => {
    expect(parseRosterCsv('Ana Pop,4\nCal Moss').players).toEqual([
      { name: 'Ana Pop', shirtNumber: 4 },
      { name: 'Cal Moss', shirtNumber: null },
    ]);
  });

  it('accepts semicolons, a byte order mark and windows line endings', () => {
    const res = parseRosterCsv('﻿name;shirt\r\nŞtefan Ionescu;10\r\n');
    expect(res.players).toEqual([{ name: 'Ştefan Ionescu', shirtNumber: 10 }]);
  });

  it('skips blank lines', () => {
    expect(parseRosterCsv('\n\nAna,1\n\n').players).toHaveLength(1);
  });

  it('reports bad rows with their line number and keeps the good ones', () => {
    const res = parseRosterCsv('name,number\nAna,1\n,2\nBen,100\nCal,1\nDan,x');
    expect(res.players).toEqual([{ name: 'Ana', shirtNumber: 1 }]);
    expect(res.errors.map((e) => e.line)).toEqual([3, 4, 5, 6]);
    expect(res.errors[2].message).toMatch(/also used on line 2/);
  });

  it('returns nothing for an empty file', () => {
    expect(parseRosterCsv('')).toEqual({ players: [], errors: [] });
  });
});
