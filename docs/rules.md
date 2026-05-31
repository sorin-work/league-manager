# League rules as implemented

How the app turns fixtures and results into tables, rankings and bans. The code lives in
`src/lib/domain` and has no database access, so it is covered by plain unit tests.

## Fixtures (`fixtures.ts`, `schedule.ts`)

- Round-robin with the circle method: one slot stays put, the others rotate one place per round.
  Every pair meets exactly once (twice in a double round-robin).
- With an odd number of teams an empty slot is added; the team drawn against it has a bye. Every
  team gets exactly one bye per leg.
- Home and away alternate: home games per team differ by at most one, and nobody plays three
  home or three away games in a row.
- The second leg of a double round-robin repeats the first with home and away swapped.
- Teams are paired in alphabetical order, or in a seeded random order ("random draw"). The seed
  is returned so a draw can be repeated.
- Match days start at the first match day and move on by `daysBetweenRounds`. Skipped dates push
  the round to the next free date. Matches are spread over the kick-off slots in order; each slot
  uses every shared venue once before the next slot starts. A team's own ground wins over the
  shared venues.
- Kick-off times are wall-clock time in the season's time zone and stored in UTC, so a 10:00
  kick-off stays 10:00 across a daylight saving change.

## Table (`standings.ts`)

- Points per win, draw and loss come from the season (3/1/0 by default).
- Only played matches count. Postponed and cancelled matches do not, even if a score was
  entered before.
- Points adjustments are added on top of the points from results. They do not count for
  head-to-head.
- Teams level on points are separated by the season's tiebreakers, in order:
  - goal difference, goals scored, matches won;
  - head-to-head: a mini-table of the matches between the tied teams only (points, then goal
    difference). With three or more teams level, the mini-table includes all of them.
  - When everything is level the teams are listed by name.
- The form guide shows the last five results, oldest first.

## Top scorers (`scorers.ts`)

- Goals and penalties count for the scorer. Own goals count for the other team in the score
  but never for the player.
- Players on the same number of goals share a rank (1, 2, 2, 4).

## Suspensions (`discipline.ts`)

- A player who reaches the season's yellow card limit misses the team's next
  `yellowCardBan` matches, and the count starts again.
- A red card, or two yellow cards in the same match, means a ban of `redCardBan` matches. Those
  two yellows do not count towards the limit.
- A ban earned while another is still running starts after it.
- A ban is served by the team's matches being played (or awarded). Bans for matches that are
  not scheduled yet stay open.
