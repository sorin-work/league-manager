import { requireAdmin } from '@/lib/server/auth';
import { handle, json } from '@/lib/server/http';

export const GET = handle(async (req) => {
  const user = await requireAdmin(req);
  return json({ user });
});
