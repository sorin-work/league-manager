import {
  authenticate,
  createSession,
  SESSION_COOKIE,
  sessionCookieOptions,
} from '@/lib/server/auth';
import { handle, HttpError, json, readJson } from '@/lib/server/http';
import { clientIp, loginLimiter } from '@/lib/server/rate-limit';
import { loginSchema } from '@/lib/validation';

export const POST = handle(async (req) => {
  const { email, password } = loginSchema.parse(await readJson(req));
  const key = `${clientIp(req.headers)}:${email.toLowerCase()}`;
  const wait = loginLimiter.retryAfter(key);
  if (wait > 0) {
    return json(
      { error: 'Too many failed attempts, try again later' },
      { status: 429, headers: { 'retry-after': String(wait) } },
    );
  }

  const user = await authenticate(email, password);
  if (!user) {
    loginLimiter.fail(key);
    throw new HttpError(401, 'Invalid email or password');
  }
  loginLimiter.reset(key);

  const { token, expiresAt } = await createSession(user.id);
  const res = json({ user });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(expiresAt));
  return res;
});
