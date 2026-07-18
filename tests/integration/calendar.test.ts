import { beforeEach, describe, expect, it } from 'vitest';
import { POST as generate } from '@/app/api/divisions/[id]/fixtures/route';
import { GET as calendar } from '@/app/api/teams/[id]/calendar/route';
import { prisma } from '@/lib/server/db';
import { adminCookie, createLeague, resetDb } from './helpers';
import { NextRequest } from 'next/server';

beforeEach(resetDb);

async function feed(teamId: string) {
  const res = await calendar(new NextRequest(`http://localhost/api/teams/${teamId}/calendar`), {
    params: Promise.resolve({ id: teamId }),
  });
  return { res, text: await res.text() };
}

describe('GET /api/teams/:id/calendar', () => {
  it("lists the team's matches as calendar events", async () => {
    const cookie = await adminCookie();
    const { division, teams } = await createLeague({ teams: 4 });
    const req = new NextRequest(`http://localhost/api/divisions/${division.id}/fixtures`, {
      method: 'POST',
      headers: { cookie, 'content-type': 'application/json' },
      body: JSON.stringify({ startDate: '2025-09-06', kickoffTimes: ['10:00'] }),
    });
    await generate(req, { params: Promise.resolve({ id: division.id }) });

    const { res, text } = await feed(teams[0].id);
    expect(res.headers.get('content-type')).toContain('text/calendar');
    expect(text.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(text).toContain('DTSTART:20250906T090000Z');
    expect(text).toContain(`X-WR-CALNAME:${teams[0].name} (Premier)`);
  });

  it('puts the score in the title of played matches', async () => {
    const { division, teams } = await createLeague({ teams: 2 });
    await prisma.match.create({
      data: {
        divisionId: division.id,
        round: 1,
        homeTeamId: teams[0].id,
        awayTeamId: teams[1].id,
        kickoffAt: new Date('2025-09-06T09:00:00Z'),
        status: 'PLAYED',
        homeScore: 2,
        awayScore: 1,
      },
    });
    const { text } = await feed(teams[1].id);
    expect(text).toContain(`SUMMARY:${teams[0].name} 2–1 ${teams[1].name}`);
  });

  it('is not available for draft seasons', async () => {
    const { teams } = await createLeague({ teams: 2, season: { status: 'DRAFT' } });
    expect((await feed(teams[0].id)).res.status).toBe(404);
  });
});
