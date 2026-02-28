import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { addAdjustment, listAdjustments } from '@/lib/server/services/adjustments';
import { adjustmentSchema } from '@/lib/validation';

type Params = { id: string };

export const GET = handle<Params>(async (_req, { id }) =>
  json({ adjustments: await listAdjustments(id) }),
);

export const POST = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  const input = adjustmentSchema.parse(await readJson(req));
  return json({ adjustment: await addAdjustment(id, input) }, { status: 201 });
});
