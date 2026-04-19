import { requireAdmin } from '@/lib/server/auth';
import { handle } from '@/lib/server/http';
import { deleteAdmin } from '@/lib/server/services/admins';

type Params = { id: string };

export const DELETE = handle<Params>(async (req, { id }) => {
  const admin = await requireAdmin(req);
  await deleteAdmin(id, admin.id);
  return new Response(null, { status: 204 });
});
