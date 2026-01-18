import { beforeEach, describe, expect, it } from 'vitest';
import { GET as list, POST as create } from '@/app/api/seasons/route';
import { DELETE as remove, GET as show, PATCH as update } from '@/app/api/seasons/[id]/route';
import { adminCookie, call, resetDb } from './helpers';

const autumn = { name: 'Autumn 2025', startDate: '2025-09-06', endDate: '2025-12-13' };

describe('seasons api', () => {
  let cookie: string;

  beforeEach(async () => {
    await resetDb();
    cookie = await adminCookie();
  });

  it('requires an admin to create a season', async () => {
    const res = await call(create, { method: 'POST', body: autumn });
    expect(res.status).toBe(401);
  });

  it('creates a season with default rules and a slug', async () => {
    const res = await call(create, { method: 'POST', body: autumn, cookie });
    expect(res.status).toBe(201);
    expect(res.body.season).toMatchObject({
      name: 'Autumn 2025',
      slug: 'autumn-2025',
      startDate: '2025-09-06',
      endDate: '2025-12-13',
      pointsForWin: 3,
      tiebreakers: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
    });
  });

  it('gives seasons with the same name different slugs', async () => {
    await call(create, { method: 'POST', body: autumn, cookie });
    const res = await call(create, { method: 'POST', body: autumn, cookie });
    expect(res.body.season.slug).toBe('autumn-2025-2');
  });

  it('returns validation errors', async () => {
    const res = await call(create, {
      method: 'POST',
      body: { ...autumn, endDate: '2025-01-01' },
      cookie,
    });
    expect(res.status).toBe(400);
    expect(res.body.details[0].path).toBe('endDate');
  });

  it('lists seasons, newest first, without signing in', async () => {
    await call(create, { method: 'POST', body: autumn, cookie });
    await call(create, {
      method: 'POST',
      body: { name: 'Spring 2026', startDate: '2026-03-07', endDate: '2026-06-20' },
      cookie,
    });
    const res = await call(list);
    expect(res.status).toBe(200);
    expect(res.body.seasons.map((s: { name: string }) => s.name)).toEqual([
      'Spring 2026',
      'Autumn 2025',
    ]);
  });

  it('shows a single season and 404s for unknown ids', async () => {
    const { body } = await call(create, { method: 'POST', body: autumn, cookie });
    const id = body.season.id;
    expect((await call(show, { params: { id } })).body.season.id).toBe(id);
    expect((await call(show, { params: { id: 'missing' } })).status).toBe(404);
  });

  it('updates only the fields that are sent', async () => {
    const { body } = await call(create, { method: 'POST', body: autumn, cookie });
    const res = await call(update, {
      method: 'PATCH',
      params: { id: body.season.id },
      body: { pointsForWin: 2, tiebreakers: ['HEAD_TO_HEAD'] },
      cookie,
    });
    expect(res.status).toBe(200);
    expect(res.body.season).toMatchObject({
      pointsForWin: 2,
      pointsForDraw: 1,
      tiebreakers: ['HEAD_TO_HEAD'],
      slug: 'autumn-2025',
    });
  });

  it('stores notes and clears them with an empty string', async () => {
    const { body } = await call(create, {
      method: 'POST',
      body: { ...autumn, notes: '  Registration closes 1 September.  ' },
      cookie,
    });
    expect(body.season.notes).toBe('Registration closes 1 September.');
    const res = await call(update, {
      method: 'PATCH',
      params: { id: body.season.id },
      body: { notes: '' },
      cookie,
    });
    expect(res.body.season.notes).toBeNull();
  });

  it('renaming a season updates its slug', async () => {
    const { body } = await call(create, { method: 'POST', body: autumn, cookie });
    const res = await call(update, {
      method: 'PATCH',
      params: { id: body.season.id },
      body: { name: 'Autumn League' },
      cookie,
    });
    expect(res.body.season.slug).toBe('autumn-league');
  });

  it('rejects an update that would end the season before it starts', async () => {
    const { body } = await call(create, { method: 'POST', body: autumn, cookie });
    const res = await call(update, {
      method: 'PATCH',
      params: { id: body.season.id },
      body: { endDate: '2025-08-01' },
      cookie,
    });
    expect(res.status).toBe(400);
  });

  it('deletes a season', async () => {
    const { body } = await call(create, { method: 'POST', body: autumn, cookie });
    const res = await call(remove, { method: 'DELETE', params: { id: body.season.id }, cookie });
    expect(res.status).toBe(204);
    expect((await call(list)).body.seasons).toEqual([]);
  });

  it('requires an admin to delete', async () => {
    const { body } = await call(create, { method: 'POST', body: autumn, cookie });
    const res = await call(remove, { method: 'DELETE', params: { id: body.season.id } });
    expect(res.status).toBe(401);
  });
});
