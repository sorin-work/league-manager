import { requireAdmin } from '@/lib/server/auth';
import { handle, json, positiveInt, readJson } from '@/lib/server/http';
import { saveRoundScores } from '@/lib/server/services/results';
import { roundScoresSchema } from '@/lib/validation';

type Params = { id: string; round: string };

export const PUT = handle<Params>(async (req, { id, round }) => {
  await requireAdmin(req);
  const number = positiveInt(round, 'round');
  const input = roundScoresSchema.parse(await readJson(req));
  return json(await saveRoundScores(id, number, input.scores));
});
