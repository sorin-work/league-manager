export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** First validation message for a field, if the API sent one. */
  fieldError(path: string): string | undefined {
    return this.details?.find((d) => d.path === path)?.message;
  }
}

/** Small fetch wrapper for the JSON API, used by the admin forms. */
export async function api<T = unknown>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const res = await fetch(path, {
    method: options.method ?? 'GET',
    headers: options.body === undefined ? undefined : { 'content-type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const details = Array.isArray(data?.details) ? data.details : undefined;
    throw new ApiError(res.status, data?.error ?? `Request failed (${res.status})`, details);
  }
  return data as T;
}
