/**
 * Creates an admin account, or resets the password of an existing one.
 *
 *   npm run admin:create -- <email> <password> [name]
 */
import { hashPassword } from '../src/lib/server/auth';
import { prisma } from '../src/lib/server/db';

async function main() {
  const [email, password, ...nameParts] = process.argv.slice(2);
  if (!email || !password) {
    console.error('usage: npm run admin:create -- <email> <password> [name]');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('password must be at least 8 characters');
    process.exit(1);
  }
  const normalized = email.trim().toLowerCase();
  const name = nameParts.join(' ') || normalized.split('@')[0];
  const passwordHash = await hashPassword(password);
  const user = await prisma.adminUser.upsert({
    where: { email: normalized },
    create: { email: normalized, name, passwordHash },
    update: { passwordHash },
  });
  console.log(`admin ${user.email} is ready`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
