export interface PointsRules {
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
}

export const DEFAULT_POINTS: PointsRules = { pointsForWin: 3, pointsForDraw: 1, pointsForLoss: 0 };

export interface StandingsTeam {
  id: string;
  name: string;
}

export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

export interface StandingRow {
  position: number;
  teamId: string;
  name: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

function emptyRow(team: StandingsTeam): StandingRow {
  return {
    position: 0,
    teamId: team.id,
    name: team.name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0,
  };
}

function record(row: StandingRow, scored: number, conceded: number, rules: PointsRules) {
  row.played += 1;
  row.goalsFor += scored;
  row.goalsAgainst += conceded;
  row.goalDifference = row.goalsFor - row.goalsAgainst;
  if (scored > conceded) {
    row.won += 1;
    row.points += rules.pointsForWin;
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += rules.pointsForDraw;
  } else {
    row.lost += 1;
    row.points += rules.pointsForLoss;
  }
}

/**
 * Builds the league table from played matches. Teams without results still
 * appear with zeros. Results involving unknown teams are ignored.
 */
export function computeStandings(
  teams: StandingsTeam[],
  results: MatchResult[],
  rules: PointsRules = DEFAULT_POINTS,
): StandingRow[] {
  const rows = new Map(teams.map((t) => [t.id, emptyRow(t)]));

  for (const r of results) {
    const home = rows.get(r.homeTeamId);
    const away = rows.get(r.awayTeamId);
    if (!home || !away) continue;
    record(home, r.homeScore, r.awayScore, rules);
    record(away, r.awayScore, r.homeScore, rules);
  }

  const sorted = [...rows.values()].sort(
    (a, b) =>
      b.points - a.points || b.goalDifference - a.goalDifference || a.name.localeCompare(b.name),
  );
  sorted.forEach((row, i) => (row.position = i + 1));
  return sorted;
}
