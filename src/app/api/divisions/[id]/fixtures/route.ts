import { FixtureError } from '@/lib/domain/fixtures';
import { requireAdmin } from '@/lib/server/auth';
import { badRequest, handle, json, readJson } from '@/lib/server/http';
import { clearDivisionFixtures, generateDivisionFixtures } from '@/lib/server/services/fixtures';
import { generateFixturesSchema } from '@/lib/validation';

type Params = { id: string };

export const POST = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = generateFixturesSchema.parse(await readJson(req));
  try {
    return json(await generateDivisionFixtures(id, input), { status: 201 });
  } catch (err) {
    if (err instanceof FixtureError) throw badRequest(err.message);
    throw err;
  }
});

export const DELETE = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  return json(await clearDivisionFixtures(id));
});
