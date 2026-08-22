# league-manager

Manage an amateur sports league: seasons, fixtures, results and standings, with public pages for
players and supporters and an admin area for the league secretary.

## Features

- **Seasons and divisions** with their own points rules (3/1/0 by default), ordered tiebreakers
  (goal difference, goals scored, head-to-head, wins) and yellow/red card bans. Seasons start as
  drafts and only appear publicly once they are active.
- **Teams and squads**: short names, kit colours, home grounds, shirt numbers and positions. Import
  a squad from a CSV file or copy last season's teams.
- **Fixture generation**: single or double round-robin, byes for odd team counts, balanced home and
  away games, kick-off slots, shared venues, skipped dates and an optional random draw.
- **Match management**: reschedule, postpone or cancel, set the referee, enter results with
  scorers, penalties, own goals and cards, award walkovers, or enter a whole round's scores at once.
- **Tables** with form guide, points adjustments, promotion and relegation places, CSV download and
  a print layout.
- **Top scorers and suspensions**, worked out from the match events.
- **Public pages** for seasons, divisions, teams, matches and match days, plus an iCalendar feed of
  every team's fixtures.
- **Admin accounts** with session cookies, password changes and a login rate limit.

## Stack

| Part     | Tech                                                    |
| -------- | ------------------------------------------------------- |
| App      | Next.js 15 (App Router), React 19, TypeScript           |
| Database | PostgreSQL with Prisma                                  |
| Auth     | Database sessions in an http-only cookie, bcrypt hashes |
| Tests    | Vitest: unit tests and route handlers against Postgres  |

## Quick start with Docker

```bash
docker compose up --build
```

Open http://localhost:4418 and sign in at http://localhost:4418/admin with the demo account:

- **Email:** `admin@example.com`
- **Password:** `league-admin`

On first start the app applies the database migrations and creates demo data: last season
(finished) and the current one with two divisions, squads, the results of the rounds played so
far, a walkover and a points deduction. Set `SEED_DEMO=false` to start with an empty database and
create an admin with `docker compose exec app npm run admin:create -- you@example.com a-long-password`.

| Service | Port                        | Notes                                     |
| ------- | --------------------------- | ----------------------------------------- |
| app     | `${WEB_PORT:-4418}` -> 3000 | Next.js, `/api/health` for health checks  |
| db      | not published               | Postgres 17, data in the `db-data` volume |

`docker compose down -v` removes the database volume as well.

## Local development

You need Node 22 and PostgreSQL 15 or newer.

```bash
npm install
cp .env.example .env

# postgres in docker, published on localhost:5432
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

npm run db:deploy   # apply migrations
npm run db:seed     # optional demo data
npm run dev         # http://localhost:3000
```

Change the schema in `prisma/schema.prisma` and create a migration with `npm run db:migrate`.

## Configuration

| Variable        | Default                    | Description                                                  |
| --------------- | -------------------------- | ------------------------------------------------------------ |
| `DATABASE_URL`  | (required)                 | Postgres connection string                                   |
| `SITE_URL`      | `http://localhost:3000`    | Public address, used in the sitemap and link previews        |
| `COOKIE_SECURE` | `false`                    | Set to `true` behind https so the session cookie is `Secure` |
| `SEED_DEMO`     | `false` (`true` in Docker) | Docker only: create the demo data on start                   |
| `WEB_PORT`      | `4418`                     | Docker only: port the app is published on                    |
| `PRISMA_LOG`    | (empty)                    | `query` logs every SQL query                                 |

## Scripts

| Command                   | What it does                                   |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Development server                             |
| `npm run build` / `start` | Production build and server                    |
| `npm test`                | Unit and integration tests                     |
| `npm run test:unit`       | Only the tests that need no database           |
| `npm run lint`            | ESLint                                         |
| `npm run format`          | Prettier                                       |
| `npm run typecheck`       | TypeScript                                     |
| `npm run db:deploy`       | Apply migrations                               |
| `npm run db:seed`         | Demo data (skipped when there is data already) |
| `npm run admin:create`    | Create an admin or reset their password        |

## Tests

```bash
npm test
```

Unit tests cover the domain rules in `src/lib/domain`: fixtures, scheduling, standings and
tiebreakers, scorers, suspensions, time zones, CSV and iCalendar output. Integration tests call
the route handlers directly against the database in `TEST_DATABASE_URL` (default
`postgresql://league:league@localhost:5432/league_test`). Migrations are applied once per run and
every table is emptied between tests, so do not point it at a database you care about.

## Project layout

```
prisma/              schema, migrations and the demo seed
scripts/             create-admin
src/app/             pages (public and /admin) and the /api route handlers
src/components/      shared React components, admin forms in components/admin
src/lib/domain/      league rules without database access
src/lib/server/      database, auth, http helpers and services used by pages and routes
tests/unit/          domain and helper tests
tests/integration/   route handler tests against Postgres
docs/                api reference and league rules
```

See [docs/api.md](docs/api.md) for the JSON API and [docs/rules.md](docs/rules.md) for how tables,
tiebreakers and bans are worked out.

## License

MIT
