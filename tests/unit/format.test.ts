import { describe, expect, it } from 'vitest';
import { formatDateRange, formatDay, plural } from '@/lib/format';

describe('format helpers', () => {
  it('formats calendar dates without shifting the day', () => {
    expect(formatDay('2025-09-06')).toBe('6 Sept 2025');
  });

  it('formats a date range', () => {
    expect(formatDateRange('2025-09-06', '2026-05-30')).toBe('6 Sept 2025 – 30 May 2026');
  });

  it('pluralises counts', () => {
    expect(plural(1, 'team')).toBe('1 team');
    expect(plural(3, 'team')).toBe('3 teams');
    expect(plural(0, 'match', 'matches')).toBe('0 matches');
  });
});
