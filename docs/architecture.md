# Architecture notes

## Layers

```
app/ (pages, route handlers)  ->  lib/server/services  ->  Prisma / Postgres
                \                        |
                 \-------------->  lib/domain (pure functions)
```

- **`src/lib/domain`** holds the league rules: fixture generation, scheduling, standings,
  tiebreakers, scorers, suspensions, time zones, CSV and iCalendar output. Nothing in there
  touches the database or Next.js, so it is tested with plain unit tests.
- **`src/lib/server/services`** loads data with Prisma, calls the domain functions and writes the
  results. Services throw `HttpError`s (`notFound`, `badRequest`, `conflict`) that the route
  wrapper turns into JSON responses.
- **Route handlers** in `src/app/api` stay thin: check the admin session, parse the body with the
  Zod schemas from `src/lib/validation.ts`, call a service. `handle()` in `lib/server/http.ts`
  maps Zod errors to 400 and Prisma's unique/foreign key errors to 409.
- **Pages** are server components that call the services directly. Admin forms are small client
  components that call the JSON API and refresh the page.

## Auth

Admins sign in with email and password (bcrypt). A random token goes into the `lm_session`
http-only cookie and only its sha256 hash is stored in the `Session` table. Sessions last 14 days
and are renewed while in use. `middleware.ts` only checks that the cookie exists, to send
signed-out visitors to the login page early; the admin layout and every write endpoint validate
the session against the database. Failed logins are limited per address and email in memory.

## Time

Kick-off times are entered and generated as wall-clock times in the season's time zone and stored
as UTC instants. `zonedTimeToUtc` and `toLocalInput` in `lib/domain/time.ts` convert between the
two with `Intl`, so no time zone database has to be shipped. Calendar dates such as the season's
start and end are stored as `date` columns and formatted in UTC.

## Concurrency

Generating fixtures takes a Postgres advisory lock per division inside a transaction, and matches
are unique per division, round and home team, so a double click cannot create two sets of
fixtures. Results replace a match's events in one transaction.

## Testing

`vitest.config.ts` defines two projects. `unit` runs everything in `tests/unit`. `integration`
applies the migrations to `TEST_DATABASE_URL` once per run (`prisma migrate deploy`), runs the
files one at a time and empties all tables before each test. Tests call the exported route
handlers with a `NextRequest`, the same way Next.js does.
