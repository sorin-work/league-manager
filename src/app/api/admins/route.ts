import { requireAdmin } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { createAdmin, listAdmins } from '@/lib/server/services/admins';
import { adminSchema } from '@/lib/validation';

export const GET = handle(async (req) => {
  await requireAdmin(req);
  return json({ admins: await listAdmins() });
});

export const POST = handle(async (req) => {
  await requireAdmin(req);
  const input = adminSchema.parse(await readJson(req));
  return json({ admin: await createAdmin(input) }, { status: 201 });
});
