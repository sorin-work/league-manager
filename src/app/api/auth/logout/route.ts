import { destroySession, SESSION_COOKIE } from '@/lib/server/auth';
import { handle, json } from '@/lib/server/http';

export const POST = handle(async (req) => {
  await destroySession(req.cookies.get(SESSION_COOKIE)?.value);
  const res = json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
});
