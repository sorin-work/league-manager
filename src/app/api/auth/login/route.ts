import {
  authenticate,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/server/auth';
import { handle, HttpError, json, readJson } from '@/lib/server/http';
import { loginSchema } from '@/lib/validation';

export const POST = handle(async (req) => {
  const { email, password } = loginSchema.parse(await readJson(req));
  const user = await authenticate(email, password);
  if (!user) throw new HttpError(401, 'Invalid email or password');

  const { token, expiresAt } = await createSession(user.id);
  const res = json({ user });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
});
