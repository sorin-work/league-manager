import { NextResponse, type NextRequest } from 'next/server';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new HttpError(400, message, details);
export const unauthorized = (message = 'Sign in required') => new HttpError(401, message);
export const forbidden = (message = 'Not allowed') => new HttpError(403, message);
export const notFound = (message = 'Not found') => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);

export interface ErrorBody {
  error: string;
  details?: unknown;
}

/** Maps any thrown value to an http status and a JSON body. */
export function toErrorResponse(err: unknown): { status: number; body: ErrorBody } {
  if (err instanceof HttpError) {
    return { status: err.status, body: { error: err.message, details: err.details } };
  }
  if (err instanceof ZodError) {
    return {
      status: 400,
      body: {
        error: 'Validation failed',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') return { status: 409, body: { error: 'Already exists' } };
    if (err.code === 'P2025') return { status: 404, body: { error: 'Not found' } };
    if (err.code === 'P2003') return { status: 409, body: { error: 'Still in use' } };
  }
  console.error(err);
  return { status: 500, body: { error: 'Internal server error' } };
}

export function json<T>(data: T, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw badRequest('Request body must be valid JSON');
  }
}

type RouteContext<P> = { params: Promise<P> };

/** Wraps a route handler so errors become JSON responses. */
export function handle<P = Record<string, never>>(
  fn: (req: NextRequest, params: P) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: RouteContext<P>): Promise<Response> => {
    try {
      return await fn(req, await ctx.params);
    } catch (err) {
      const { status, body } = toErrorResponse(err);
      return NextResponse.json(body, { status });
    }
  };
}
