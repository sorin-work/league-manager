import { requireAdmin } from '@/lib/server/auth';
import { handle } from '@/lib/server/http';
import { removeAdjustment } from '@/lib/server/services/adjustments';

type Params = { id: string };

export const DELETE = handle<Params>(async (req, { id }) => {
  await requireAdmin(req);
  await removeAdjustment(id);
  return new Response(null, { status: 204 });
});
