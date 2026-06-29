import type { MatchStatus } from '@prisma/client';

export const STATUS_LABELS: Record<MatchStatus, string> = {
  SCHEDULED: 'Scheduled',
  PLAYED: 'Played',
  POSTPONED: 'Postponed',
  CANCELLED: 'Cancelled',
};

/** Label to show instead of the kick-off time, if any. */
export function statusNote(status: MatchStatus): string | null {
  return status === 'POSTPONED' || status === 'CANCELLED' ? STATUS_LABELS[status] : null;
}
