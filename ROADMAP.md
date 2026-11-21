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

## Later

### 6. Clash checks when moving a match

Fixture generation spreads matches over kick-off slots and shared venues, so a freshly generated
season has no clashes. After that, `updateMatchSchedule` saves any kick-off and venue without
looking at other matches. Moving a postponed match onto a Saturday can put two matches on the
same pitch at the same time, or a team in two matches on one day.

- A pure `findClashes(match, others, options)` in `domain/schedule.ts`: same venue with
  overlapping times (kick-off plus a match length per season, 105 minutes as the calendar route
  uses today), the same team twice on one day, and optionally the same referee (23).
- `PATCH /api/matches/:id` returns the clashes as `warnings`; with `force: true` it saves anyway.
  `ScheduleForm` shows them and asks.
- Tricky: matches in other divisions and other seasons share venues, so the lookup is by venue and
  time across the whole database, not within the division.
- Tests: unit tests for `findClashes` around midnight and daylight saving changes (times are UTC
  instants in a season time zone); an integration test for the warning and the forced save.

### 7. Postponed matches waiting for a date

A postponed match keeps its old kick-off and disappears into the round list. The dashboard shows
scheduled matches past their kick-off without a result, but not postponed ones.

- A "To rearrange" list on the admin dashboard: postponed matches and matches with no kick-off,
  oldest first, with the free dates of both teams (no match that day) for the next few weeks.
- Public fixtures show postponed matches in their own block instead of in the past round.
- Tests: the free date calculation as a pure function; an integration test for the list.

### 8. New season with promotion and relegation

`copy-teams` copies the teams of one division into another, with players (`includePlayers`). It
does not know about promotion and relegation, so starting a new season with two divisions means
copying each division and then moving the promoted and relegated teams by hand. The copy also
drops player positions: `copyTeams` creates players with `name` and `shirtNumber` only.

- "Start next season" on a finished season: a form that lists the new divisions (same names and
  rules by default) and, from the final tables, which teams go up and down using the existing
  `promotionPlaces` and `relegationPlaces`. The secretary can override the list (a team folds, a
  new team joins).
- One transaction creates the season as a draft, the divisions, the teams with squads, and keeps a
  link from each new team to its previous one (`previousTeamId`), which honours (28) and players
  across seasons (17) can use later.
- Copy player positions too.
- Tricky: final tables can be tied on everything and broken by name. The form must show the
  table it used so the secretary can see why a team is in a relegation place.
- Tests: an integration test for a two division league with one up and one down, and an override.

### 9. Security headers

`next.config.ts` sets `poweredByHeader: false` and nothing else. There is no
Content-Security-Policy, no `frame-ancestors` (an admin page can be framed), and no HSTS when the
site runs over https.

- `headers()` in `next.config.ts`: a CSP with `default-src 'self'` and what Next.js needs for its
  scripts (a nonce from `middleware.ts`, since App Router pages use inline bootstrap scripts),
  `frame-ancestors 'none'` for `/admin` (the public pages may be embedded later, see 26),
  `Referrer-Policy`, `X-Content-Type-Options`.
- HSTS only when `COOKIE_SECURE=true`, which already means "this runs behind https".
- Tests: a unit test on the header list; the middleware test checks the nonce is set.

### 10. Audit log of changes

Results, walkovers, point deductions and reschedules change the table, and several admins can
make them. Nothing records who changed what. When a club disputes a result, the secretary cannot
tell whether the score was changed after the match.

- An `AuditEntry` table: admin, action, target type and id, a JSON `before` and `after`, time.
- Written in the services for results, walkovers, round scores, adjustments, schedule changes,
  season rules and deletes, inside the same transaction.
- An admin page with filters by season, team and admin, and the entries for a match on its admin
  page.
- Tricky: the services do not know the admin today; route handlers call `requireAdmin` and drop
  the result. Pass the admin id into the service functions that write.
- Tests: integration tests that each write leaves one entry with the right before and after.

### 11. Safer deletes

Deleting a season deletes its divisions, teams, players and matches in one cascade after one
confirm (`DeleteButton`). A wrong click on the wrong season is unrecoverable without a backup.

- Seasons and divisions with results ask for the name to be typed before deleting.
- With the audit log (10), keep the deleted season as a JSON snapshot in the entry for 30 days and
  offer "Restore" from the audit page. Without it, typing the name is the whole item.
- Tests: integration test that a delete without the typed name is refused.

### 12. Manual suspensions and appeals

Bans come only from cards. Leagues also ban players for things that happen off the card count
(violent conduct reported after the match, a registration offence) and overturn red cards on
appeal.

- A `ManualBan` table: player, matches, reason, created by, and an optional `overturnsEventId` that
  cancels the ban from a specific red card.
- `domain/discipline.ts` takes manual bans as a second input and merges them into the same queue,
  so "a ban earned while another is running starts after it" still holds.
- Public suspensions list shows the reason only when the secretary ticks "public".
- Tests: unit tests in `tests/unit/discipline.test.ts` for a manual ban during a card ban and an
  overturned red card.

### 13. Fair play table

Cards are recorded per player and team, but nothing adds them up per team. Many amateur leagues
publish a fair play table and some use it as a tiebreaker.

- A pure `fairPlay(events, rules)` in a new `domain/fair-play.ts`: points per yellow, per red, per
  second yellow (season settings, 1/3/3 by default), lowest first.
- A "Fair play" tab on the division page next to scorers and suspensions, and
  `GET /api/divisions/:id/fair-play`.
- Tests: unit tests for the totals and the second yellow case.

### 14. More tiebreakers

The tiebreakers are goal difference, goals scored, wins and head-to-head points then goal
difference, in an order the season sets. Real league rules ask for more: head-to-head goals
scored, away goals in head-to-head, fair play points, and finally drawing lots or a play-off
match, which the app replaces with alphabetical order.

- New tiebreaker keys in `domain/standings.ts`: `HEAD_TO_HEAD_GOALS`, `HEAD_TO_HEAD_AWAY_GOALS`,
  `FAIR_PLAY` (uses 13), `MATCHES_PLAYED_FEWER`.
- A "decided by" note on the table when teams are separated by something other than points, so a
  supporter can see why.
- A manual order for teams level on everything (the result of a draw or a play-off), stored per
  division, applied last instead of the name.
- Tricky: head-to-head with three teams level re-applies the mini-table to the remaining tied
  teams in some rule books and not in others. Make it a season setting with the current behaviour
  as default, and document both in `docs/rules.md`.
- Tests: the existing `tests/unit/tiebreakers.test.ts` style, one case per new key.

### 15. Match squads and appearances

A result has a score, scorers and cards. Who actually played is not recorded, so there are no
appearance counts, no clean sheets, and the suspended player check (4) only sees players who
scored or were booked.

- A `MatchPlayer` table: match, player, started or substitute, optional minutes.
- The result form gets a squad picker per team (the roster with tick boxes, last match's squad
  preselected). Optional: a result without squads stays valid, as today.
- Appearances, starts and clean sheets (goalkeeper started, no goals against) on the team and
  player pages.
- Tests: integration tests for saving squads with a result and for the counts.

### 16. Player pages

Players exist only as rows in a squad list. Supporters and players look for "my goals this
season".

- A public page per player under the team page: goals, cards, bans and, with 15, appearances,
  with the matches they happened in.
- Linked from the scorers chart and the squad list.
- Tests: an integration test for the page data; draft seasons stay hidden (2).

### 17. Players across seasons

A player is a row in one team in one division. Next season the same person is a new row (copied
or imported), so career totals and "has played for" are impossible, and two people called Sam
Patel in different teams look the same as one.

- A `Person` table, with `Player` rows (one per team per season) pointing at it. The copy and the
  new season flow (8) link the new rows to the same person; the roster import can match by name
  and date of birth when given (19).
- Career pages: seasons, teams, goals and cards per season.
- Tricky: existing data has no people. A one-off migration can create one person per player row
  and offer an admin screen to merge duplicates, rather than guessing by name.
- Why later: it changes the model under squads, results and discipline. Worth it once a league has
  used the app for a few seasons.
- Tests: integration tests for linking on copy, merging two people, and the career totals.

### 18. Transfers during a season

A player who moves to another team in the same division has to be deleted from the old team
(which removes their history, see 3) and added again.

- "Transfer to" on a player: marks the old row as left (3) and creates a new row in the new team,
  linked to the same person once 17 exists.
- `MatchEvent.teamId` already stores the player's team at the time of the event, so the old
  team's results stay right.
- Bans follow the person to the new team: a red card for the old team is served in the new team's
  next matches. That is the common rule; make it explicit in `docs/rules.md`.
- Tests: integration test for a transfer with a running ban.

### 19. Registration rules and age groups

Youth and veterans leagues have age limits, and most leagues close registrations at some point in
the season. The app accepts any player at any time.

- Optional `dateOfBirth` on players (admin only, never public), and per division
  `minAge`/`maxAge` with an age reference date (usually the start of the season).
- A `registrationClosesOn` date per season, after which new players need an explicit override.
- The roster import reads an optional `date_of_birth` column (`domain/roster-csv.ts`).
- Tests: unit tests for the age check at the reference date; integration tests for the closed
  registration.

### 20. Player name privacy

Squads, scorers and suspensions show full player names publicly, and the JSON API serves them to
anyone. For youth leagues that is often not acceptable.

- A season setting: full names, first name and initial, or initials only on public pages and the
  public API. Admin pages always show full names.
- One formatting function used by every public component (`ScorersTable`, `SuspensionsTable`, the
  team and match pages) and the API serialisers.
- Tests: integration tests that each public endpoint respects the setting.

### 21. Roles: league admin and team manager

Every account is a full admin. Leagues want team secretaries to keep their own squad up to date
without being able to change results or other teams.

- A `role` on `AdminUser` (`ADMIN`, `TEAM_MANAGER`) and a link from team managers to their teams.
- `requireAdmin` becomes `requireRole` with a check per endpoint: team managers can edit their own
  team's details and squad, nothing else.
- The admin layout shows only what the role can use.
- Tricky: `middleware.ts` only checks the cookie exists, and the real check is in each handler. A
  matrix test that calls every write endpoint as a team manager is the only way to be sure none is
  missed (the existing `tests/integration/authorization.test.ts` is the place).
- Tests: that matrix.

### 22. Results entered by team managers

The secretary types in every result, usually from text messages on Sunday evening.

- Team managers (21) submit the result of their own match: score, scorers, cards. It is stored as
  a pending submission, not on the match.
- When both teams submit the same score it is accepted automatically; when they differ or only
  one submits within a set time, the secretary sees it on the dashboard and decides.
- Tricky: pending results must not count in the table, and the public match page should say
  "result pending".
- Tests: integration tests for agreeing, disagreeing and single submissions.

### 23. Referees as records

`Match.referee` is a free text string. Referee secretaries need to see who is assigned where, avoid
giving one referee two matches at the same time, and send each referee their list.

- A `Referee` table (name, contact, active), matches point to it; existing text becomes referees
  by exact name in a migration.
- The clash check (6) includes referees.
- A referee's own iCalendar feed with their matches, reusing `domain/ics.ts`, at a secret URL.
- Tests: migration of free text names; clash with a referee; the feed.

### 24. Team contacts and email notices

When a match is moved, the secretary has to tell both teams by hand. The app has no contact for a
team and no mail setup.

- A contact name, email and phone per team, admin only.
- Optional SMTP settings (`SMTP_HOST` and friends, nodemailer). When they are set, rescheduling,
  postponing or cancelling a match emails both teams' contacts; without them nothing is sent.
- A Mailpit service in `docker-compose.dev.yml` so it can be tried locally.
- Tricky: sending inside the request makes the admin wait for the mail server. A small outbox
  table and a send loop in the same process is enough; no queue service.
- Tests: the outbox rows are written in the same transaction as the change; the sender is mocked.

### 25. Faster public pages

The root layout sets `export const dynamic = 'force-dynamic'`, so every visit to a division page
loads all its matches and events and recomputes the table, scorers and suspensions. That is fine
for a small league and wasteful on a Saturday evening when every supporter checks the table at
once, all for data that changes a few times a week.

- Cache the public reads with `unstable_cache` keyed by division, and call `revalidateTag` from
  every service that writes results, matches, adjustments, teams or season rules.
- Keep the admin pages dynamic.
- A seed script for a large league (20 divisions of 16 teams, a full double round-robin with
  events) and numbers before and after in the pull request.
- Tricky: missing one `revalidateTag` shows a stale table. Put the tags next to the writes in the
  services, and test that a result changes the cached standings.
- Tests: an integration test that reads standings, saves a result and reads them again.

### 26. Embeddable tables and fixtures

Clubs want the league table and their fixtures on their own website.

- `/embed/<season>/<division>/table` and `/embed/<season>/<division>/teams/<team>/fixtures`: the
  same components with a bare layout, allowed in frames (the CSP from 9 keeps
  `frame-ancestors 'none'` for everything else).
- The public read API already exists (reading is public); add CORS headers on `GET` endpoints so
  club sites can fetch it from the browser.
- Tests: integration tests for the embed routes and the CORS headers.

### 27. Accessibility pass

The public pages are mostly tables, and the admin area mostly forms. Nobody has gone through them
with a keyboard and a screen reader.

- Table captions and `scope` on header cells in `StandingsTable`, `ScorersTable` and
  `SuspensionsTable`; promotion and relegation places marked with text, not only colour.
- Kit colours on `TeamBadge` are user chosen; make sure the badge has a text alternative and that
  team names are never shown only as a colour.
- Every admin form field with a label and errors linked with `aria-describedby`; focus moves to the
  first error after a failed save.
- The form guide (W, D, L squares) needs text for screen readers.
- Tests: no browser tests, so checks go into the component level where possible; a short manual
  checklist in `docs/` for the rest.

### 28. Honours and past seasons

Finished seasons stay public, but there is no page that shows who won what over the years.

- A public honours page: per finished season, the champion of each division, promoted and
  relegated teams (from the final table and the places), and the top scorer.
- Uses the team links from 8 to group a club's honours across seasons; without them, group by
  exact team name.
- Tests: integration test for the page data across two seasons.

### 29. Search on the public site

Finding a team means knowing its season and division.

- A search box in `SiteChrome` that searches team names (and player names, if the privacy setting
  from 20 allows it) across active and finished seasons, with `ILIKE` and a trigram index once the
  data grows.
- Tests: integration test that drafts are never found.

### 30. Season export and import

There is no way to take a season out of the app except the table CSV, and no way to load last
year's results kept in a spreadsheet.

- `GET /api/seasons/:id/export`: one JSON file with the season, divisions, teams, players, venues,
  matches, events and adjustments.
- Import of that file as a new draft season, for moving a league between installs and for tests.
- A results CSV import per division (date, home, away, score), for leagues coming from a
  spreadsheet, matched to the generated fixtures by teams and round.
- Tests: a round trip export then import gives the same tables; row errors for the CSV.

### 31. Admin sessions and two-factor sign in

Sessions last 14 days and are renewed while in use. Changing the password signs out other
devices, but an admin cannot see their sessions or end one.

- An account page section listing sessions (created, last used, user agent), with sign out per
  session.
- Optional TOTP for admins (`otpauth` or a small RFC 6238 implementation, it is short), with
  recovery codes stored hashed.
- Tests: unit tests for TOTP codes with a fixed clock; integration tests for sign in with a code
  and session revoke.

### 32. Monitoring and upgrade notes

`/api/health` returns status, database and version. There is nothing on how to upgrade a running
install, and the CHANGELOG does not say which releases carry migrations.

- `docs/operations.md`: upgrading with Docker (back up first, pull, `docker compose up --build`,
  what the entrypoint does), what to do when a migration fails, and restoring from a backup (5).
- Structured JSON logs for API errors from `handle()` in `lib/server/http.ts` (method, path,
  status, duration), since the `500` path currently has nothing to go on.
- `/api/health` reports the last applied migration name.
- Tests: a unit test for the log line shape.

## Maybe

### 33. Knockout cups

Many leagues run a cup next to the league. The app only does round-robin.

- A division `format` of `KNOCKOUT`: a draw (random or seeded), byes up to the next power of two,
  rounds generated as earlier ones finish, and a result that can be decided by extra time or
  penalties (new fields on `Match`).
- A bracket view on the public division page.
- Tricky: a cup match needs a winner, so the result form must refuse a plain draw, and walkovers
  advance the other team. The table, scorers and bans logic must keep working for a division
  without a table.
- Why maybe: it is the biggest single addition here, and leagues often run cups on paper.

### 34. Play-offs after the league

Some leagues decide promotion with play-offs between the teams just below the promotion places.

- A play-off bracket (from 33) seeded from the final table, with the winner promoted in the new
  season flow (8).
- Why maybe: depends on the cup work and is used by few amateur leagues.

### 35. Other sports

The rules assume football: goals, draws, yellow and red cards. Basketball has no draws, rugby has
bonus points, volleyball scores in sets.

- A sport setting per season that decides the score shape, whether draws exist, bonus point rules
  and which event types the result form offers.
- Why maybe: every rule in `domain/standings.ts` and `domain/discipline.ts` would grow a branch.
  Bonus points could come earlier as an extra season rule (points for scoring four tries, for
  losing by less than eight), which is cheap.

### 36. Live scores on match days

On a Saturday the match day page could show scores as they come in.

- Team managers (22) or the referee post the score during the match; the match day page updates
  with server-sent events from a route handler.
- Why maybe: amateur matches rarely have anyone free to post scores during play, and it needs
  submission by teams first.

### 37. Translations of the public pages

The UI is English only. Leagues in other countries would want the public site in their language.

- `next-intl` with English as the default and the public pages first; the admin area can stay
  English.
- Dates and times already use `Intl`; they would follow the locale.
- Why maybe: nobody has asked, and every string in every component moves into message files.

### 38. Browser tests for the admin forms

The admin forms are client components that call the JSON API and refresh. The integration tests
cover the API, not the forms, so a broken form (wrong field name, missing refresh) passes CI.

- Playwright against `next start` and the test database, covering sign in, generating fixtures,
  entering a result with a scorer and seeing the table change.
- Why maybe: a browser in CI is slow and flaky. Three or four flows on the most used forms would
  catch most breakage for a reasonable cost.
