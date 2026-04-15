import { requireAdmin, SESSION_COOKIE } from '@/lib/server/auth';
import { handle, json, readJson } from '@/lib/server/http';
import { changePassword } from '@/lib/server/services/admins';
import { passwordChangeSchema } from '@/lib/validation';

export const POST = handle(async (req) => {
  const admin = await requireAdmin(req);
  const input = passwordChangeSchema.parse(await readJson(req));
  await changePassword(
    admin.id,
    req.cookies.get(SESSION_COOKIE)?.value,
    input.currentPassword,
    input.newPassword,
  );
  return json({ ok: true });
});
