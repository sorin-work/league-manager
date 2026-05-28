import { describe, expect, it } from 'vitest';
import { GET } from '@/app/api/health/route';
import { call } from './helpers';

describe('GET /api/health', () => {
  it('reports the database as up', async () => {
    const res = await call(GET);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up', version: expect.any(String) });
  });
});
