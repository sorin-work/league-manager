export interface Page {
  page: number;
  pageSize: number;
}

export const DEFAULT_PAGE_SIZE = 10;
export const MAX_PAGE_SIZE = 50;

function positiveInt(value: string | null | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const n = Number(value);
  return n >= 1 ? n : null;
}

/** Reads ?page= and ?pageSize= leniently: bad values fall back to the defaults. */
export function parsePage(params: URLSearchParams, defaultSize = DEFAULT_PAGE_SIZE): Page {
  const page = positiveInt(params.get('page')) ?? 1;
  const size = positiveInt(params.get('pageSize')) ?? defaultSize;
  return { page, pageSize: Math.min(size, MAX_PAGE_SIZE) };
}

/** Number of pages needed for `total` items; an empty list still has one page. */
export function pageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.floor(total / pageSize));
}

export function offset({ page, pageSize }: Page): number {
  return (page - 1) * pageSize;
}
