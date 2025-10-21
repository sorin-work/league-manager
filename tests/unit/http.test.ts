import { describe, expect, it, vi } from 'vitest';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { HttpError, notFound, toErrorResponse } from '@/lib/server/http';

describe('toErrorResponse', () => {
  it('uses the status and message of an HttpError', () => {
    expect(toErrorResponse(notFound('No such season'))).toEqual({
      status: 404,
      body: { error: 'No such season', details: undefined },
    });
  });

  it('passes details through', () => {
    const res = toErrorResponse(new HttpError(422, 'Nope', { field: 'x' }));
    expect(res.body.details).toEqual({ field: 'x' });
  });

  it('turns zod errors into a 400 with field paths', () => {
    const parsed = z.object({ name: z.string().min(1) }).safeParse({ name: '' });
    const res = toErrorResponse(parsed.error);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual([{ path: 'name', message: expect.any(String) }]);
  });

  it('maps unique constraint violations to 409', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    expect(toErrorResponse(err).status).toBe(409);
  });

  it('maps missing records to 404', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Missing', {
      code: 'P2025',
      clientVersion: 'test',
    });
    expect(toErrorResponse(err).status).toBe(404);
  });

  it('hides unexpected errors behind a 500', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = toErrorResponse(new Error('db exploded'));
    expect(res).toEqual({ status: 500, body: { error: 'Internal server error' } });
    spy.mockRestore();
  });
});
