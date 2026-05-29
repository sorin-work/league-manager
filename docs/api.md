# API reference

All endpoints live under `/api`, take and return JSON and use these status codes:

| Status | Meaning                                                  |
| ------ | -------------------------------------------------------- |
| 200    | OK                                                       |
| 201    | Created                                                  |
| 204    | Deleted, no body                                         |
| 400    | Validation failed (see `details`) or a bad request       |
| 401    | Sign in required                                         |
| 404    | Not found (also for draft seasons when not signed in)    |
| 409    | Conflict: already exists, still in use, already has data |
| 429    | Too many failed logins, see the `retry-after` header     |

Errors look like this:

```json
{ "error": "Validation failed", "details": [{ "path": "endDate", "message": "..." }] }
```

Reading is public. Every endpoint that changes data needs an admin session: sign in with
`POST /api/auth/login` and send the `lm_session` cookie it sets.

## Auth

| Method | Path                 | Body                               | Notes                               |
| ------ | -------------------- | ---------------------------------- | ----------------------------------- |
| POST   | `/api/auth/login`    | `{ email, password }`              | Sets the session cookie             |
| POST   | `/api/auth/logout`   |                                    | Deletes the session                 |
| GET    | `/api/auth/me`       |                                    | The signed-in admin                 |
| POST   | `/api/auth/password` | `{ currentPassword, newPassword }` | Signs out the admin's other devices |
| GET    | `/api/admins`        |                                    | Admin accounts                      |
| POST   | `/api/admins`        | `{ email, name, password }`        |                                     |
| DELETE | `/api/admins/:id`    |                                    | Not your own account                |

## Seasons and divisions

| Method | Path                         | Body / query                                                         |
| ------ | ---------------------------- | -------------------------------------------------------------------- |
| GET    | `/api/seasons`               | Drafts only for admins                                               |
| POST   | `/api/seasons`               | `{ name, startDate, endDate, timezone?, ... }`                       |
| GET    | `/api/seasons/:id`           |                                                                      |
| PATCH  | `/api/seasons/:id`           | Any season field                                                     |
| DELETE | `/api/seasons/:id`           | Deletes divisions, teams and matches too                             |
| GET    | `/api/seasons/:id/divisions` |                                                                      |
| POST   | `/api/seasons/:id/divisions` | `{ name, format?, sortOrder?, promotionPlaces?, relegationPlaces? }` |
| GET    | `/api/divisions/:id`         |                                                                      |
| PATCH  | `/api/divisions/:id`         |                                                                      |
| DELETE | `/api/divisions/:id`         |                                                                      |

Season fields: `name`, `startDate` and `endDate` (`YYYY-MM-DD`), `timezone` (IANA name, default
`Europe/London`), `status` (`DRAFT`, `ACTIVE`, `FINISHED`; new seasons are drafts),
`pointsForWin`/`pointsForDraw`/`pointsForLoss` (default 3/1/0), `tiebreakers` (ordered list of
`GOAL_DIFFERENCE`, `GOALS_FOR`, `HEAD_TO_HEAD`, `WINS`), `yellowCardLimit`, `yellowCardBan`,
`redCardBan` and `notes`.

## Teams, players and venues

| Method | Path                            | Body                                                   |
| ------ | ------------------------------- | ------------------------------------------------------ |
| GET    | `/api/divisions/:id/teams`      |                                                        |
| POST   | `/api/divisions/:id/teams`      | `{ name, shortName?, homeVenueId?, colour? }`          |
| POST   | `/api/divisions/:id/copy-teams` | `{ fromDivisionId, includePlayers? }`                  |
| GET    | `/api/teams/:id`                | With players                                           |
| PATCH  | `/api/teams/:id`                |                                                        |
| DELETE | `/api/teams/:id`                | 409 when the team has fixtures                         |
| GET    | `/api/teams/:id/calendar`       | iCalendar feed of the team's matches                   |
| GET    | `/api/teams/:id/players`        |                                                        |
| POST   | `/api/teams/:id/players`        | `{ name, shirtNumber?, position? }`                    |
| POST   | `/api/teams/:id/players/import` | `{ csv, replace? }`; row errors come back in `details` |
| PATCH  | `/api/players/:id`              |                                                        |
| DELETE | `/api/players/:id`              |                                                        |
| GET    | `/api/venues`                   |                                                        |
| POST   | `/api/venues`                   | `{ name, address? }`                                   |
| PATCH  | `/api/venues/:id`               |                                                        |
| DELETE | `/api/venues/:id`               | Teams and matches keep existing without a venue        |

## Fixtures and results

| Method | Path                          | Body / query                                                                                        |
| ------ | ----------------------------- | --------------------------------------------------------------------------------------------------- |
| POST   | `/api/divisions/:id/fixtures` | `{ startDate, daysBetweenRounds?, kickoffTimes?, venueIds?, skipDates?, format?, shuffle?, seed? }` |
| DELETE | `/api/divisions/:id/fixtures` | Only before any result is entered                                                                   |
| GET    | `/api/divisions/:id/matches`  | `?round=`                                                                                           |
| GET    | `/api/divisions/:id/results`  | `?page=&pageSize=` (max 50), newest first                                                           |
| GET    | `/api/matches/:id`            |                                                                                                     |
| PATCH  | `/api/matches/:id`            | `{ kickoffAt?, venueId?, status?, referee?, notes? }`                                               |
| PUT    | `/api/matches/:id/result`     | `{ homeScore, awayScore, events: [{ playerId, type, minute? }] }`                                   |
| DELETE | `/api/matches/:id/result`     | Back to scheduled                                                                                   |
| POST   | `/api/matches/:id/walkover`   | `{ winner: "HOME" \| "AWAY", goals? }`                                                              |

Kick-off times are sent and generated as wall-clock time in the season's time zone
(`kickoffAt: "2025-10-04T14:30"`) and returned as UTC ISO timestamps.

Event types: `GOAL`, `PENALTY_GOAL`, `OWN_GOAL`, `YELLOW_CARD`, `RED_CARD`. The player must
belong to one of the two teams. Goals with a known scorer may not add up to more than the score.

## Tables and statistics

| Method | Path                             | Notes                                    |
| ------ | -------------------------------- | ---------------------------------------- |
| GET    | `/api/divisions/:id/standings`   | `{ rules, standings }`                   |
| GET    | `/api/divisions/:id/scorers`     | `?limit=` (max 100)                      |
| GET    | `/api/divisions/:id/suspensions` | Active bans; `?all=true` includes served |
| GET    | `/api/divisions/:id/adjustments` |                                          |
| POST   | `/api/divisions/:id/adjustments` | `{ teamId, points, reason }`             |
| DELETE | `/api/adjustments/:id`           |                                          |
| GET    | `/api/health`                    | `{ status, database, version }`          |
