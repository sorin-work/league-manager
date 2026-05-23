import { cache } from 'react';
import { getDivisionBySlugs } from './services/divisions';
import { getMatchDetails } from './services/matches';
import { getSeasonBySlug } from './services/seasons';
import { getTeamBySlugs } from './services/teams';

// generateMetadata and the page itself both need the same record; cache()
// makes that one query per request instead of two.
export const loadSeason = cache((slug: string) => getSeasonBySlug(slug));
export const loadDivision = cache((season: string, division: string) =>
  getDivisionBySlugs(season, division),
);
export const loadTeam = cache((season: string, division: string, team: string) =>
  getTeamBySlugs(season, division, team),
);
export const loadMatch = cache((id: string) => getMatchDetails(id));
