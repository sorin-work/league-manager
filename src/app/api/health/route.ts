import { NextResponse } from 'next/server';
import { prisma } from '@/lib/server/db';
import { version } from '../../../../package.json';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: 'ok', database: 'up', version });
  } catch {
    return NextResponse.json({ status: 'error', database: 'down', version }, { status: 503 });
  }
}
