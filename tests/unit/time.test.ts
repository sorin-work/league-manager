import { describe, expect, it } from 'vitest';
import {
  formatKickoff,
  formatTime,
  isValidTimeZone,
  offsetMinutes,
  toLocalInput,
  zonedTimeToUtc,
} from '@/lib/domain/time';

describe('time zones', () => {
  it('recognises valid zones', () => {
    expect(isValidTimeZone('Europe/Bucharest')).toBe(true);
    expect(isValidTimeZone('Nowhere/Special')).toBe(false);
  });

  it('knows the offset in summer and winter', () => {
    expect(offsetMinutes(new Date('2025-07-01T12:00:00Z'), 'Europe/London')).toBe(60);
    expect(offsetMinutes(new Date('2025-12-01T12:00:00Z'), 'Europe/London')).toBe(0);
    expect(offsetMinutes(new Date('2025-12-01T12:00:00Z'), 'America/New_York')).toBe(-300);
  });
});

describe('zonedTimeToUtc', () => {
  it('converts a summer kick-off in London', () => {
    expect(zonedTimeToUtc('2025-08-16T15:00', 'Europe/London').toISOString()).toBe(
      '2025-08-16T14:00:00.000Z',
    );
  });

  it('converts a winter kick-off in London', () => {
    expect(zonedTimeToUtc('2025-11-15T15:00', 'Europe/London').toISOString()).toBe(
      '2025-11-15T15:00:00.000Z',
    );
  });

  it('handles the day the clocks go back', () => {
    // 26 Oct 2025: BST ends at 02:00, a 15:00 kick-off is already GMT
    expect(zonedTimeToUtc('2025-10-26T15:00', 'Europe/London').toISOString()).toBe(
      '2025-10-26T15:00:00.000Z',
    );
  });

  it('works east of UTC across midnight', () => {
    expect(zonedTimeToUtc('2025-09-06T01:30', 'Europe/Bucharest').toISOString()).toBe(
      '2025-09-05T22:30:00.000Z',
    );
  });

  it('moves a time inside the spring-forward gap past the gap', () => {
    // 29 Mar 2026: 01:00-02:00 does not exist in London
    expect(zonedTimeToUtc('2026-03-29T01:30', 'Europe/London').toISOString()).toBe(
      '2026-03-29T01:30:00.000Z',
    );
    expect(toLocalInput(zonedTimeToUtc('2026-03-29T01:30', 'Europe/London'), 'Europe/London')).toBe(
      '2026-03-29T02:30',
    );
  });

  it('picks one of the two instants of an hour that happens twice', () => {
    const instant = zonedTimeToUtc('2025-10-26T01:30', 'Europe/London');
    expect(['2025-10-26T00:30:00.000Z', '2025-10-26T01:30:00.000Z']).toContain(
      instant.toISOString(),
    );
  });

  it('handles zones with half-hour offsets', () => {
    expect(zonedTimeToUtc('2025-09-06T10:00', 'Asia/Kolkata').toISOString()).toBe(
      '2025-09-06T04:30:00.000Z',
    );
  });

  it('rejects malformed input', () => {
    expect(() => zonedTimeToUtc('2025-09-06 10:00', 'UTC')).toThrow();
  });

  it('round-trips with toLocalInput', () => {
    const instant = zonedTimeToUtc('2026-03-29T11:00', 'Europe/Berlin');
    expect(toLocalInput(instant, 'Europe/Berlin')).toBe('2026-03-29T11:00');
  });
});

describe('formatting', () => {
  it('formats kick-offs in the league time zone', () => {
    const instant = new Date('2025-08-16T14:00:00Z');
    expect(formatKickoff(instant, 'Europe/London')).toBe('Sat 16 Aug, 15:00');
    expect(formatTime(instant, 'Europe/London')).toBe('15:00');
  });

  it('says when the date is not known', () => {
    expect(formatKickoff(null, 'Europe/London')).toBe('Date to be confirmed');
  });
});
