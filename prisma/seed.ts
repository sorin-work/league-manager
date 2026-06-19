/**
 * Demo data: one season, two divisions, venues, rosters and results for every
 * round that is already in the past. Runs only on an empty database.
 *
 *   npm run db:seed            # skip when there is already data
 *   npm run db:seed -- --force # add the demo season anyway
 */
import { PrismaClient, type EventType, type Position } from '@prisma/client';
import { generateFixtures } from '../src/lib/domain/fixtures';
import { addDays, scheduleFixtures } from '../src/lib/domain/schedule';
import { slugify } from '../src/lib/domain/slug';
import { hashPassword } from '../src/lib/server/auth';

const prisma = new PrismaClient();

export const DEMO_ADMIN = {
  email: 'admin@example.com',
  password: 'league-admin',
  name: 'Demo Admin',
};

// small deterministic PRNG so every seed run produces the same league
let state = 20251;
function random() {
  state = (state * 1103515245 + 12345) % 2147483648;
  return state / 2147483648;
}
const pick = <T>(list: T[]) => list[Math.floor(random() * list.length)];

/** Goals in amateur football: mostly 0-3, the odd 5-4. */
function goals() {
  const r = random();
  if (r < 0.22) return 0;
  if (r < 0.5) return 1;
  if (r < 0.74) return 2;
  if (r < 0.88) return 3;
  if (r < 0.96) return 4;
  return 5;
}

const FIRST = [
  'Adam',
  'Ben',
  'Cal',
  'Dan',
  'Eli',
  'Finn',
  'Gus',
  'Harry',
  'Ian',
  'Jack',
  'Kai',
  'Leo',
  'Max',
  'Noah',
  'Owen',
  'Pete',
  'Rory',
  'Sam',
  'Theo',
  'Will',
  'Zac',
  'Luca',
  'Ryan',
  'Joe',
];
const LAST = [
  'Archer',
  'Bailey',
  'Carter',
  'Dixon',
  'Ellis',
  'Fletcher',
  'Grant',
  'Hughes',
  'Irwin',
  'Jones',
  'Knight',
  'Lowe',
  'Mason',
  'Nash',
  'Owens',
  'Parker',
  'Quinn',
  'Reed',
  'Shaw',
  'Turner',
  'Walsh',
  'Young',
  'Hale',
  'Cross',
];

const DIVISIONS = [
  {
    name: 'Premier Division',
    format: 'DOUBLE' as const,
    teams: [
      'Ashby Athletic',
      'Brookside Borough',
      'Castle City',
      'Dale Dynamo',
      'Eastfield United',
      'Fernhill Rangers',
      'Greenway Wanderers',
      'Harbour Town',
    ],
  },
  {
    name: 'Championship',
    format: 'SINGLE' as const,
    teams: [
      'Ivy Lane',
      'Jubilee Park',
      'Kingsmead Celtic',
      'Larkhill Albion',
      'Millbrook',
      'Northgate Rovers',
      'Oakwood Villa',
    ],
  },
];

const VENUES = [
  { name: 'Victoria Park', address: 'Park Road' },
  { name: 'Albert Recreation Ground', address: 'Albert Street' },
  { name: 'Riverside Pitches', address: 'Mill Lane' },
  { name: "St Mary's Playing Fields", address: 'Church Walk' },
];

const COLOURS = [
  '#d92d20',
  '#1d4ed8',
  '#16a34a',
  '#f59e0b',
  '#7c3aed',
  '#0f172a',
  '#db2777',
  '#0891b2',
];

function positionFor(shirt: number): Position {
  if (shirt === 1 || shirt === 13) return 'GOALKEEPER';
  if (shirt <= 5 || shirt === 12) return 'DEFENDER';
  if (shirt <= 8 || shirt === 14) return 'MIDFIELDER';
  return 'FORWARD';
}

function lastSunday(from: Date) {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

async function main() {
  const force = process.argv.includes('--force');
  if (!force && (await prisma.season.count()) > 0) {
    console.log('seed: database already has data, skipping');
    return;
  }

  await prisma.adminUser.upsert({
    where: { email: DEMO_ADMIN.email },
    create: {
      email: DEMO_ADMIN.email,
      name: DEMO_ADMIN.name,
      passwordHash: await hashPassword(DEMO_ADMIN.password),
    },
    update: {},
  });

  // eight rounds played, the rest still to come
  const today = new Date();
  const start = addDays(lastSunday(today), -7 * 8);
  const startYear = Number(start.slice(0, 4));
  const seasonName = `Sunday League ${startYear}/${String(startYear + 1).slice(2)}`;

  const venues = [];
  for (const v of VENUES) venues.push(await prisma.venue.create({ data: v }));

  const season = await prisma.season.create({
    data: {
      name: seasonName,
      slug: `${slugify(seasonName)}${force ? `-${Date.now().toString(36)}` : ''}`,
      startDate: new Date(`${start}T00:00:00Z`),
      endDate: new Date(`${addDays(start, 7 * 20)}T00:00:00Z`),
      timezone: 'Europe/London',
      notes: [
        'Matches are played on Sunday mornings. Teams must be ready ten minutes before kick-off.',
        'Results and scorers are entered by the league secretary on Sunday evening.',
      ].join('\n\n'),
    },
  });

  for (const [index, def] of DIVISIONS.entries()) {
    const division = await prisma.division.create({
      data: {
        seasonId: season.id,
        name: def.name,
        slug: slugify(def.name),
        format: def.format,
        sortOrder: index,
      },
    });

    const teams = [];
    for (const [t, name] of def.teams.entries()) {
      const team = await prisma.team.create({
        data: {
          divisionId: division.id,
          name,
          slug: slugify(name),
          shortName: name.replace(/[^A-Z]/g, '').slice(0, 3) || name.slice(0, 3).toUpperCase(),
          homeVenueId: t % 3 === 0 ? venues[(t / 3) % venues.length].id : null,
          colour: COLOURS[(t + index * 3) % COLOURS.length],
        },
      });
      const used = new Set<string>();
      const players = [];
      for (let n = 1; n <= 14; n++) {
        let name = `${pick(FIRST)} ${pick(LAST)}`;
        while (used.has(name)) name = `${pick(FIRST)} ${pick(LAST)}`;
        used.add(name);
        players.push({ teamId: team.id, name, shirtNumber: n, position: positionFor(n) });
      }
      await prisma.player.createMany({ data: players });
      teams.push({
        ...team,
        players: await prisma.player.findMany({
          where: { teamId: team.id },
          orderBy: { shirtNumber: 'asc' },
        }),
      });
    }

    const rounds = generateFixtures(
      teams.map((t) => t.id),
      def.format,
    );
    const scheduled = scheduleFixtures(rounds, {
      startDate: start,
      daysBetweenRounds: 7,
      kickoffTimes: index === 0 ? ['10:30', '12:30'] : ['10:00', '12:00'],
      venueIds: venues.map((v) => v.id),
      homeVenues: Object.fromEntries(teams.map((t) => [t.id, t.homeVenueId])),
      timeZone: season.timezone,
    });

    for (const m of scheduled) {
      const match = await prisma.match.create({ data: { ...m, divisionId: division.id } });
      if (m.kickoffAt.getTime() > today.getTime() - 3 * 60 * 60 * 1000) continue;

      const homeScore = goals();
      const awayScore = goals();
      const events: { playerId: string; teamId: string; type: EventType; minute: number }[] = [];
      for (const [teamId, count] of [
        [m.homeTeamId, homeScore],
        [m.awayTeamId, awayScore],
      ] as const) {
        const squad = teams.find((t) => t.id === teamId)!.players;
        // forwards (higher shirt numbers) score more often
        for (let g = 0; g < count; g++) {
          const scorer = squad[Math.min(squad.length - 1, 6 + Math.floor(random() * 8))];
          events.push({
            playerId: scorer.id,
            teamId,
            type: random() < 0.1 ? 'PENALTY_GOAL' : 'GOAL',
            minute: 1 + Math.floor(random() * 90),
          });
        }
        if (random() < 0.7) {
          const booked = pick(squad);
          events.push({
            playerId: booked.id,
            teamId,
            type: 'YELLOW_CARD',
            minute: 1 + Math.floor(random() * 90),
          });
        }
        if (random() < 0.06) {
          const sentOff = pick(squad);
          events.push({
            playerId: sentOff.id,
            teamId,
            type: 'RED_CARD',
            minute: 46 + Math.floor(random() * 44),
          });
        }
      }
      await prisma.match.update({
        where: { id: match.id },
        data: {
          status: 'PLAYED',
          homeScore,
          awayScore,
          events: {
            create: events.map(({ playerId, teamId, type, minute }) => ({
              playerId,
              teamId,
              type,
              minute,
            })),
          },
        },
      });
    }
  }

  // a couple of things a real season always has
  const championship = await prisma.division.findFirstOrThrow({
    where: { seasonId: season.id, slug: 'championship' },
  });
  const noShow = await prisma.match.findFirst({
    where: { divisionId: championship.id, round: 3, status: 'PLAYED' },
    orderBy: { kickoffAt: 'asc' },
  });
  if (noShow) {
    await prisma.matchEvent.deleteMany({ where: { matchId: noShow.id } });
    await prisma.match.update({
      where: { id: noShow.id },
      data: { walkover: true, homeScore: 3, awayScore: 0 },
    });
  }
  const premier = await prisma.division.findFirstOrThrow({
    where: { seasonId: season.id, slug: 'premier-division' },
    include: { teams: { orderBy: { name: 'asc' } } },
  });
  await prisma.pointsAdjustment.create({
    data: {
      divisionId: premier.id,
      teamId: premier.teams[5].id,
      points: -3,
      reason: 'Fielded an unregistered player',
    },
  });
  await prisma.division.update({
    where: { id: premier.id },
    data: { promotionPlaces: 0, relegationPlaces: 2 },
  });
  await prisma.division.update({
    where: { id: championship.id },
    data: { promotionPlaces: 2 },
  });

  console.log(
    `seed: created ${seasonName}; sign in as ${DEMO_ADMIN.email} / ${DEMO_ADMIN.password}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
