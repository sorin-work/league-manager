# Roadmap

Things I might add to league-manager. The app runs a whole league season today (seasons,
divisions, squads, fixtures, results, tables, scorers and bans, public pages), so nothing here is
promised or scheduled. These are ideas, written down with enough detail that I (or anyone else)
can pick one up later without starting from zero. Items may change, move between groups or be
dropped.

What the app does today is in the [README](README.md), the [rules](docs/rules.md), the
[API reference](docs/api.md) and the [architecture notes](docs/architecture.md).

- **Next**: small or well understood. I would start with these.
- **Later**: worth doing, but bigger or waiting on a decision.
- **Maybe**: not sure yet that they are worth the extra complexity.

Sizes are rough: **S** is an evening or two, **M** a few evenings up to a couple of weekends, **L**
several weeks of spare time.

Each item is meant to fit in one pull request and to be covered by the test suite. There are two
levels of tests and no browser tests: `tests/unit` covers the pure code in `src/lib/domain`, and
`tests/integration` calls the exported route handlers with a `NextRequest` against PostgreSQL. So
league rules worth testing (draws, tables, bans, clashes) belong in `src/lib/domain`, database
work in a service under `src/lib/server/services`, and route handlers stay thin. Most items add
columns, and each brings its own migration under `prisma/migrations`. File names below are
relative to `src/` unless they start with `prisma/`, `tests/`, `docs/`, `docker/` or `scripts/`.

When an item ships, its Overview row says **Shipped** in the Group column, its section moves under
a `## Shipped` heading at the end with one paragraph on what was built and what was left out, and
the same pull request updates the README, the notes under `docs/` it touches and an
`## Unreleased` entry at the top of `CHANGELOG.md`.

"Depends on" lists real prerequisites only. Items that merely touch the same file are not listed
there; the bigger overlaps are mentioned in the items.

## Overview

| #   | Item                                          | Group | Area         | Size | Depends on |
| --- | --------------------------------------------- | ----- | ------------ | ---- | ---------- |
| 1   | Login limit that a header cannot reset        | Next  | security     | S    | -          |
| 2   | Draft seasons hidden from the JSON API too    | Next  | security     | S    | -          |
| 3   | Removing a player keeps their goals and cards | Next  | squads       | S    | -          |
| 4   | Warning for suspended players in a result     | Next  | discipline   | S    | -          |
| 5   | Scheduled backups                             | Next  | ops          | S    | -          |
| 6   | Clash checks when moving a match              | Later | fixtures     | M    | -          |
| 7   | Postponed matches waiting for a date          | Later | fixtures     | S    | -          |
| 8   | New season with promotion and relegation      | Later | seasons      | M    | -          |
| 9   | Security headers                              | Later | security     | S    | -          |
| 10  | Audit log of changes                          | Later | admin        | M    | -          |
| 11  | Safer deletes                                 | Later | admin        | S    | 10         |
| 12  | Manual suspensions and appeals                | Later | discipline   | M    | -          |
| 13  | Fair play table                               | Later | discipline   | S    | -          |
| 14  | More tiebreakers                              | Later | tables       | M    | 13         |
| 15  | Match squads and appearances                  | Later | results      | M    | -          |
| 16  | Player pages                                  | Later | public       | S    | -          |
| 17  | Players across seasons                        | Later | squads       | L    | -          |
| 18  | Transfers during a season                     | Later | squads       | M    | 3          |
| 19  | Registration rules and age groups             | Later | squads       | M    | -          |
| 20  | Player name privacy                           | Later | public       | S    | -          |
| 21  | Roles: league admin and team manager          | Later | admin        | L    | -          |
| 22  | Results entered by team managers              | Later | results      | M    | 21         |
| 23  | Referees as records                           | Later | fixtures     | M    | 6          |
| 24  | Team contacts and email notices               | Later | teams        | M    | -          |
| 25  | Faster public pages                           | Later | performance  | M    | -          |
| 26  | Embeddable tables and fixtures                | Later | public       | M    | -          |
| 27  | Accessibility pass                            | Later | ui           | M    | -          |
| 28  | Honours and past seasons                      | Later | public       | S    | 8          |
| 29  | Search on the public site                     | Later | public       | S    | -          |
| 30  | Season export and import                      | Later | ops          | M    | -          |
| 31  | Admin sessions and two-factor sign in         | Later | security     | M    | -          |
| 32  | Monitoring and upgrade notes                  | Later | ops          | S    | 5          |
| 33  | Knockout cups                                 | Maybe | competitions | L    | -          |
| 34  | Play-offs after the league                    | Maybe | competitions | M    | 33         |
| 35  | Other sports                                  | Maybe | rules        | L    | -          |
| 36  | Live scores on match days                     | Maybe | public       | M    | 22         |
| 37  | Translations of the public pages              | Maybe | public       | M    | -          |
| 38  | Browser tests for the admin forms             | Maybe | tests        | M    | -          |

## Next

### 1. Login limit that a header cannot reset

Failed logins are limited to 5 per 15 minutes per key, and the key is
`${clientIp(req.headers)}:${email}` (`api/auth/login/route.ts`). `clientIp` in
`lib/server/rate-limit.ts` takes the first value of `X-Forwarded-For` whenever the header is
present. The Docker setup publishes the app directly on port 4418 with no proxy in front, so anyone
can send a different `X-Forwarded-For` with every request and get a fresh key each time. The limit
then does nothing.

- Trust forwarding headers only when a `TRUSTED_PROXY` setting says so (off by default). Without
  it, use the socket address. Next.js route handlers do not expose the socket address directly, so
  the realistic choice is: no proxy configured means the IP part of the key is a constant, and the
  limit is per email only.
- Add a second limiter per email alone, a little looser (say 20 per hour), so spreading attempts
  over many IPs still hits a wall.
- With `TRUSTED_PROXY=1`, take the address that number of hops from the right of
  `X-Forwarded-For`, not the leftmost one, which the client controls.
- README: the new setting in the configuration table, with the reverse proxy example.
- Tricky: a per email limit lets a stranger lock an admin out by failing on purpose. Fifteen
  minutes of lockout is an acceptable cost for a league site; say so in the docs.
- Tests: `tests/unit/rate-limit.test.ts` for the header parsing with and without a trusted proxy;
  one case in `tests/integration/auth.test.ts` showing that changing the header no longer resets
  the count.

### 2. Draft seasons hidden from the JSON API too

Draft seasons are hidden from the public pages and from `GET /api/seasons` and
`GET /api/seasons/:id` (`optionalAdmin` decides). The other reads do not check:
`GET /api/seasons/:id/divisions` calls `listDivisions`, which calls `getSeason` with its default
`includeDrafts: true`, and `GET /api/divisions/:id`, `/api/teams/:id`, `/api/teams/:id/players`,
`/api/matches/:id`, the standings, scorers and suspensions endpoints load by id with no status
check. The team calendar route is the only one that refuses drafts. The ids are cuids and hard to
guess, but once one is known (an old link, a shared screenshot of the admin) the draft's teams,
squads and fixtures are readable without signing in. The API docs say draft seasons give 404 when
not signed in.

- One helper in `lib/server/auth.ts` or the services, `assertVisible(season, admin)`, used by every
  public `GET` that reaches a season through a division, team or match.
- `listDivisions` and friends take the same `Visibility` option `getSeason` already has, so the
  default is no longer "show drafts".
- Tests: extend `tests/integration/visibility.test.ts` with one anonymous request per endpoint for
  a draft season (404) and the same requests as an admin (200).

### 3. Removing a player keeps their goals and cards

`MatchEvent.player` has `onDelete: Cascade`, and `deletePlayer` in `services/players.ts` deletes
the player without looking at their events. Removing a player who scored in round 2 silently takes
those goals off the scorers chart and those cards off the suspension count, while the match score
stays the same. The roster import with `replace` already refuses this case ("Players with goals or
cards cannot be replaced"); the single delete does not.

- `deletePlayer` refuses with 409 when the player has events, with a message that suggests marking
  them as left instead.
- A `leftAt DateTime?` on `Player`. A player who has left is hidden from the result form's player
  lists and from the public squad, but their events, goals and bans stay.
- Migration: change the relation to `onDelete: Restrict`, so the database enforces it too.
- The admin `Roster` component shows "Left" players folded away with a button to bring them back.
- Tests: integration tests for the refused delete, for marking as left, and that a left player's
  goals still count in `GET /api/divisions/:id/scorers`.

### 4. Warning for suspended players in a result

The app works out bans (`domain/discipline.ts`) and shows them on the team page, but `saveResult`
accepts goals and cards for a player who was suspended for that match. In most leagues fielding a
suspended player means a points deduction or a walkover, and the secretary has to notice it by
hand.

- A pure `suspendedFor(match, bans)` in `domain/discipline.ts` that says which players were
  serving a ban in a given match, from the same calculation the suspensions table uses.
- `saveResult` returns the list as `warnings` next to the match; it does not refuse, because the
  ban list can be wrong (a card entered against the wrong player) and the result has to be
  recorded anyway.
- `ResultForm` shows the warning after saving, with a link to add a points adjustment.
- Tricky: bans are served by the team's matches in kick-off order. Entering results out of order
  (round 5 before round 4) changes which matches a ban covers. The check must run on the whole
  division's events, not just earlier rows.
- Tricky: without lineups (15) the app only knows a suspended player played if they scored or got
  a card. Say so in the warning text and in `docs/rules.md`.
- Tests: unit tests for `suspendedFor` with yellow card accumulation and red cards; an integration
  test that the warning comes back.

### 5. Scheduled backups

The whole league lives in the `db-data` volume. The README mentions `docker compose down -v`,
which deletes it, and there is no documented way to back up or restore. A lost season of results
is the worst thing that can happen to a league secretary.

- A `backup` service in `docker-compose.yml` on the same `postgres:17-alpine` image, running
  `pg_dump --format=custom` on a schedule (a shell loop with `sleep`, no cron image) into a
  `./backups` bind mount, keeping the last 14 (`BACKUP_KEEP`, `BACKUP_INTERVAL_HOURS`).
- `scripts/restore.sh` that stops the app, restores a chosen dump with
  `pg_restore --clean --if-exists` and starts the app again.
- README: a Backups section and a warning next to `docker compose down -v`.
- Tricky: the entrypoint runs `prisma migrate deploy` before the app starts. The backup service
  should wait for the app's healthcheck before its first dump, so it never dumps half a migration.
- Tests: none in Vitest. One CI step in the `docker` job that starts the stack, dumps, and restores
  into a fresh database would be the real test.
