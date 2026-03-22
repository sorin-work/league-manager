import { describe, expect, it } from 'vitest';
import { offset, pageCount, parsePage } from '@/lib/domain/pagination';

const params = (query: string) => new URLSearchParams(query);

describe('parsePage', () => {
  it('defaults to the first page', () => {
    expect(parsePage(params(''))).toEqual({ page: 1, pageSize: 10 });
  });

  it('reads page and page size', () => {
    expect(parsePage(params('page=3&pageSize=20'))).toEqual({ page: 3, pageSize: 20 });
  });

  it('ignores invalid values', () => {
    expect(parsePage(params('page=0&pageSize=-5'))).toEqual({ page: 1, pageSize: 10 });
    expect(parsePage(params('page=abc&pageSize=2.5'))).toEqual({ page: 1, pageSize: 10 });
  });

  it('caps the page size', () => {
    expect(parsePage(params('pageSize=1000')).pageSize).toBe(50);
  });
});

describe('pageCount and offset', () => {
  it('counts pages', () => {
    expect(pageCount(20, 10)).toBe(2);
    expect(pageCount(30, 10)).toBe(3);
  });

  it('has one page when empty', () => {
    expect(pageCount(0, 10)).toBe(1);
  });

  it('skips the earlier pages', () => {
    expect(offset({ page: 1, pageSize: 10 })).toBe(0);
    expect(offset({ page: 3, pageSize: 10 })).toBe(20);
  });
});
