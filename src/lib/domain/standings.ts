export interface PointsRules {
  pointsForWin: number;
  pointsForDraw: number;
  pointsForLoss: number;
}

export const TIEBREAKERS = ['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD', 'WINS'] as const;
export type Tiebreaker = (typeof TIEBREAKERS)[number];

export const TIEBREAKER_LABELS: Record<Tiebreaker, string> = {
  GOAL_DIFFERENCE: 'Goal difference',
  GOALS_FOR: 'Goals scored',
  HEAD_TO_HEAD: 'Head-to-head',
  WINS: 'Matches won',
};

export interface StandingsRules extends PointsRules {
  /** Applied in order to teams level on points. Ties left after all of them are broken by name. */
  tiebreakers: Tiebreaker[];
}

export const DEFAULT_RULES: StandingsRules = {
  pointsForWin: 3,
  pointsForDraw: 1,
  pointsForLoss: 0,
  tiebreakers: ['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD'],
};

export interface StandingsTeam {
  id: string;
  name: string;
}

export interface MatchResult {
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  /** When the match was played; used to order the form guide. */
  playedAt?: Date | null;
}

export type FormResult = 'W' | 'D' | 'L';
export const FORM_LENGTH = 5;

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
  /** Last results, oldest first. */
  form: FormResult[];
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
    form: [],
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
    row.form.push('W');
  } else if (scored === conceded) {
    row.drawn += 1;
    row.points += rules.pointsForDraw;
    row.form.push('D');
  } else {
    row.lost += 1;
    row.points += rules.pointsForLoss;
    row.form.push('L');
  }
  if (row.form.length > FORM_LENGTH) row.form.shift();
}

/** Oldest first; results without a date keep their place at the start. */
function chronological(results: MatchResult[]): MatchResult[] {
  return [...results].sort(
    (a, b) => (a.playedAt?.getTime() ?? -Infinity) - (b.playedAt?.getTime() ?? -Infinity) || 0,
  );
}

function tabulate(teams: StandingsTeam[], results: MatchResult[], rules: PointsRules) {
  const rows = new Map(teams.map((t) => [t.id, emptyRow(t)]));
  for (const r of results) {
    const home = rows.get(r.homeTeamId);
    const away = rows.get(r.awayTeamId);
    if (home) record(home, r.homeScore, r.awayScore, rules);
    if (away) record(away, r.awayScore, r.homeScore, rules);
  }
  return rows;
}

type Score = number[];

function compareScores(a: Score, b: Score): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Mini-table between the tied teams only: points first, then goal difference. */
function headToHead(group: StandingRow[], results: MatchResult[], rules: PointsRules) {
  const ids = new Set(group.map((r) => r.teamId));
  const games = results.filter((r) => ids.has(r.homeTeamId) && ids.has(r.awayTeamId));
  const mini = tabulate(
    group.map((r) => ({ id: r.teamId, name: r.name })),
    games,
    rules,
  );
  return (row: StandingRow): Score => {
    const m = mini.get(row.teamId)!;
    return [m.points, m.goalDifference];
  };
}

function scorer(
  criterion: Tiebreaker,
  group: StandingRow[],
  results: MatchResult[],
  rules: PointsRules,
): (row: StandingRow) => Score {
  switch (criterion) {
    case 'GOAL_DIFFERENCE':
      return (r) => [r.goalDifference];
    case 'GOALS_FOR':
      return (r) => [r.goalsFor];
    case 'WINS':
      return (r) => [r.won];
    case 'HEAD_TO_HEAD':
      return headToHead(group, results, rules);
  }
}

/** Splits rows into consecutive groups that are equal under `score`. */
function splitBy(rows: StandingRow[], score: (row: StandingRow) => Score): StandingRow[][] {
  const scored = rows.map((row) => ({ row, s: score(row) }));
  scored.sort((a, b) => compareScores(a.s, b.s));
  const groups: StandingRow[][] = [];
  let prev: Score | null = null;
  for (const { row, s } of scored) {
    if (prev && compareScores(prev, s) === 0) groups[groups.length - 1].push(row);
    else groups.push([row]);
    prev = s;
  }
  return groups;
}

function rank(
  group: StandingRow[],
  criteria: Tiebreaker[],
  results: MatchResult[],
  rules: PointsRules,
): StandingRow[] {
  if (group.length <= 1) return group;
  if (criteria.length === 0) return [...group].sort((a, b) => a.name.localeCompare(b.name));
  const [first, ...rest] = criteria;
  return splitBy(group, scorer(first, group, results, rules)).flatMap((g) =>
    rank(g, rest, results, rules),
  );
}

/**
 * Builds the league table from played matches. Teams without results still
 * appear with zeros. Results involving teams outside the list are ignored.
 */
export function computeStandings(
  teams: StandingsTeam[],
  results: MatchResult[],
  rules: StandingsRules = DEFAULT_RULES,
): StandingRow[] {
  const ids = new Set(teams.map((t) => t.id));
  const valid = chronological(
    results.filter((r) => ids.has(r.homeTeamId) && ids.has(r.awayTeamId)),
  );
  const rows = [...tabulate(teams, valid, rules).values()];

  const sorted = splitBy(rows, (r) => [r.points]).flatMap((group) =>
    rank(group, rules.tiebreakers, valid, rules),
  );
  sorted.forEach((row, i) => (row.position = i + 1));
  return sorted;
}
