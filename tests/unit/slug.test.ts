import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from '@/lib/domain/slug';

describe('slugify', () => {
  it('lowercases and joins words with dashes', () => {
    expect(slugify('Sunday League')).toBe('sunday-league');
  });

  it('turns slashes and dots into separators', () => {
    expect(slugify('Season 2025/26')).toBe('season-2025-26');
    expect(slugify('St. Albans F.C.')).toBe('st-albans-f-c');
  });

  it('drops punctuation and collapses whitespace', () => {
    expect(slugify('  Red   Lions!! (Reserves) ')).toBe('red-lions-reserves');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('--Division One--')).toBe('division-one');
  });
});

describe('uniqueSlug', () => {
  it('returns the plain slug when it is free', () => {
    expect(uniqueSlug('Rovers', ['united'])).toBe('rovers');
  });

  it('adds the first free numeric suffix', () => {
    expect(uniqueSlug('Rovers', ['rovers', 'rovers-2'])).toBe('rovers-3');
  });

  it('falls back to a generic slug for names without letters or digits', () => {
    expect(uniqueSlug('!!!', [])).toBe('item');
  });
});
