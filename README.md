# league-manager

Manage an amateur sports league: seasons, fixtures, results and standings.

- **Seasons and divisions** with their own points rules, tiebreakers and card limits
- **Teams and rosters** with shirt numbers and home grounds
- **Fixture generation**: single or double round-robin, byes for odd team counts, kick-off
  slots and venues spread over each match day
- **Results** with scorers, own goals, penalties and cards
- **Standings**, top scorers and suspensions, worked out from the results
- **Public pages** for every season, division, team and match

## Quick start with Docker

```bash
docker compose up --build
```

Open http://localhost:4418 and sign in at `/admin` with the demo account:

- **Email:** `admin@example.com`
- **Password:** `league-admin`

On first start the app applies the database migrations and creates a demo season with two
divisions and the results of the rounds played so far. Set `SEED_DEMO=false` to start empty.

## Local development

You need Node 22 and PostgreSQL 15+.

```bash
npm install
cp .env.example .env          # point DATABASE_URL at your database

# or run only postgres in docker
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d db

npm run db:deploy             # apply migrations
npm run db:seed               # optional demo data
npm run dev                   # http://localhost:3000
```

## Tests

```bash
npm test
```

Unit tests cover the domain logic (fixtures, standings, tiebreakers, suspensions). Integration
tests call the route handlers against a real database given by `TEST_DATABASE_URL`
(default `postgresql://league:league@localhost:5432/league_test`); its tables are emptied
between tests.

## License

MIT
