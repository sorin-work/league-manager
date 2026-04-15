import { prisma } from '../db';
import { hashPassword, hashToken, verifyPassword } from '../auth';
import { badRequest, conflict, notFound } from '../http';

/** Changes the password and signs out every other session of that admin. */
export async function changePassword(
  userId: string,
  currentToken: string | undefined,
  currentPassword: string,
  newPassword: string,
) {
  const user = await prisma.adminUser.findUnique({ where: { id: userId } });
  if (!user) throw notFound('Account not found');
  if (!(await verifyPassword(currentPassword, user.passwordHash))) {
    throw badRequest('The current password is not right');
  }
  if (currentPassword === newPassword) throw badRequest('Pick a password you have not used here');

  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: userId },
      data: { passwordHash: await hashPassword(newPassword) },
    }),
    prisma.session.deleteMany({
      where: {
        userId,
        tokenHash: currentToken ? { not: hashToken(currentToken) } : undefined,
      },
    }),
  ]);
}

export function listAdmins() {
  return prisma.adminUser.findMany({
    select: { id: true, email: true, name: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createAdmin(input: { email: string; name: string; password: string }) {
  const email = input.email.trim().toLowerCase();
  if (await prisma.adminUser.findUnique({ where: { email } })) {
    throw conflict('There is already an admin with that email');
  }
  return prisma.adminUser.create({
    data: { email, name: input.name, passwordHash: await hashPassword(input.password) },
    select: { id: true, email: true, name: true, createdAt: true },
  });
}

export async function deleteAdmin(id: string, currentUserId: string) {
  if (id === currentUserId) throw badRequest('You cannot remove your own account');
  const admin = await prisma.adminUser.findUnique({ where: { id } });
  if (!admin) throw notFound('Account not found');
  await prisma.adminUser.delete({ where: { id } });
}
