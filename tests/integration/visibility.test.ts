import { beforeEach, describe, expect, it } from 'vitest';
import { GET as list, POST as create } from '@/app/api/seasons/route';
import { GET as show, PATCH as update } from '@/app/api/seasons/[id]/route';
import { getDivisionBySlugs } from '@/lib/server/services/divisions';
import { getSeasonBySlug, listSeasonsWithDivisions } from '@/lib/server/services/seasons';
import { adminCookie, call, createLeague, resetDb } from './helpers';

const draft = { name: 'Next Season', startDate: '2026-09-05', endDate: '2027-05-29' };

describe('season visibility', () => {
  let cookie: string;

  beforeEach(async () => {
    await resetDb();
    cookie = await adminCookie();
  });

  it('creates new seasons as drafts', async () => {
    const res = await call(create, { method: 'POST', body: draft, cookie });
    expect(res.body.season.status).toBe('DRAFT');
  });

  it('leaves drafts out of the public season list', async () => {
    await call(create, { method: 'POST', body: draft, cookie });
    await createLeague();
    const publicList = await call(list);
    expect(publicList.body.seasons.map((s: { name: string }) => s.name)).toEqual(['Test Season']);
    const adminList = await call(list, { cookie });
    expect(adminList.body.seasons).toHaveLength(2);
  });

  it('404s a draft season for the public but not for admins', async () => {
    const { body } = await call(create, { method: 'POST', body: draft, cookie });
    const id = body.season.id;
    expect((await call(show, { params: { id } })).status).toBe(404);
    expect((await call(show, { params: { id }, cookie })).status).toBe(200);
  });

  it('publishes a season by making it active', async () => {
    const { body } = await call(create, { method: 'POST', body: draft, cookie });
    await call(update, {
      method: 'PATCH',
      params: { id: body.season.id },
      body: { status: 'ACTIVE' },
      cookie,
    });
    expect((await call(show, { params: { id: body.season.id } })).status).toBe(200);
  });

  it('hides draft seasons and their divisions from the public pages', async () => {
    const { season, division } = await createLeague({ season: { status: 'DRAFT' } });
    expect(await getSeasonBySlug(season.slug)).toBeNull();
    expect(await getSeasonBySlug(season.slug, { includeDrafts: true })).not.toBeNull();
    expect(await getDivisionBySlugs(season.slug, division.slug)).toBeNull();
    expect(await listSeasonsWithDivisions()).toEqual([]);
  });

  it('keeps finished seasons public', async () => {
    const { season } = await createLeague({ season: { status: 'FINISHED' } });
    expect(await getSeasonBySlug(season.slug)).not.toBeNull();
  });
});
