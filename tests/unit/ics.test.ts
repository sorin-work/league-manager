import { describe, expect, it } from 'vitest';
import { buildCalendar, escapeText, foldLine, formatUtc } from '@/lib/domain/ics';

const now = new Date('2025-08-01T12:00:00Z');

describe('buildCalendar', () => {
  it('wraps events in a calendar with CRLF line endings', () => {
    const ics = buildCalendar('Rovers fixtures', [], now);
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics).toContain('X-WR-CALNAME:Rovers fixtures');
  });

  it('writes one event per fixture with start and end in UTC', () => {
    const ics = buildCalendar(
      'Rovers',
      [
        {
          uid: 'm1@league-manager',
          start: new Date('2025-09-06T09:00:00Z'),
          durationMinutes: 105,
          summary: 'Rovers v United',
          location: 'Victoria Park',
        },
      ],
      now,
    );
    expect(ics).toContain('UID:m1@league-manager');
    expect(ics).toContain('DTSTART:20250906T090000Z');
    expect(ics).toContain('DTEND:20250906T104500Z');
    expect(ics).toContain('SUMMARY:Rovers v United');
    expect(ics).toContain('LOCATION:Victoria Park');
    expect(ics).toContain('DTSTAMP:20250801T120000Z');
  });

  it('marks cancelled matches', () => {
    const ics = buildCalendar(
      'x',
      [{ uid: 'a', start: now, durationMinutes: 90, summary: 'A v B', cancelled: true }],
      now,
    );
    expect(ics).toContain('STATUS:CANCELLED');
  });
});

describe('escapeText', () => {
  it('escapes commas, semicolons, backslashes and newlines', () => {
    expect(escapeText('Pitch 2; car park, gate B\\C\nBring boots')).toBe(
      'Pitch 2\; car park\\, gate B\\\\C\\nBring boots',
    );
  });
});

describe('foldLine', () => {
  it('leaves short lines alone', () => {
    expect(foldLine('SUMMARY:Rovers v United')).toBe('SUMMARY:Rovers v United');
  });

  it('folds long lines at 75 octets with a leading space', () => {
    const line = `DESCRIPTION:${'x'.repeat(150)}`;
    const parts = foldLine(line).split('\r\n');
    expect(parts[0]).toHaveLength(75);
    expect(parts.slice(1).every((p) => p.startsWith(' ') && p.length <= 75)).toBe(true);
    expect(parts.map((p, i) => (i === 0 ? p : p.slice(1))).join('')).toBe(line);
  });

  it('does not split multi-byte characters', () => {
    const line = `SUMMARY:${'ş'.repeat(60)}`;
    for (const part of foldLine(line).split('\r\n')) {
      expect(Buffer.byteLength(part)).toBeLessThanOrEqual(75);
      expect(part).not.toContain('�');
    }
  });
});

describe('formatUtc', () => {
  it('drops separators and milliseconds', () => {
    expect(formatUtc(new Date('2026-01-02T03:04:05.678Z'))).toBe('20260102T030405Z');
  });
});
