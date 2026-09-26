# Changelog

## 1.0.0 (2026-09-26)

First stable release.

### Features

- Seasons with their own points, tiebreakers, card limits, time zone, notes and a draft/active/finished status
- Divisions with single or double round-robin, promotion and relegation places
- Teams with short names, kit colours and home grounds; squads with shirt numbers and positions
- Squad import from CSV and copying teams from another division
- Fixture generation with byes, balanced home and away games, kick-off slots, shared venues,
  skipped dates and an optional seeded random draw
- Rescheduling, postponing and cancelling matches, referees and match notes
- Results with scorers, penalties, own goals and cards; walkovers; quick score entry per round
- League tables with form guide, points adjustments, CSV download and print layout
- Top scorers and automatic suspensions for yellow card accumulation and red cards
- Public pages for seasons, divisions, teams, matches and match days; iCalendar feeds per team
- Admin area with dashboard, admin accounts, password changes and login rate limiting
- Dark mode and a layout that works on phones
- Docker Compose setup with health checks and a demo league (`SEED_DEMO=true`)

### Fixes since the first previews

- The first team in the list played every match at home
- Own goals were counted for the player who scored them in the scorers chart
- Kick-off times ignored the season time zone
- Head-to-head counted matches against teams outside the tie
- Match results could be entered without signing in
- Yellow card bans started one card too late
- Team names with accents lost letters in their urls
- Goals and cards could be given to players of other teams
- Generating fixtures twice in quick succession created duplicate fixtures
- HTML in season notes was rendered on the public page
- The last page of results could not be reached
- A match postponed after its result was entered kept counting in the table
