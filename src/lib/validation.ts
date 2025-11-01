import { z } from 'zod';
import { TIEBREAKERS } from './domain/standings';
import { isValidTimeZone } from './domain/time';

const name = z.string().trim().min(1, 'Required').max(80, 'Keep it under 80 characters');
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD');
const points = z.int('Must be a whole number').min(0).max(10);
const cards = z.int('Must be a whole number').min(0).max(20);

export const loginSchema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

const timezone = z.string().refine(isValidTimeZone, 'Unknown time zone');
const tiebreakers = z
  .array(z.enum(TIEBREAKERS))
  .refine((list) => new Set(list).size === list.length, 'Each tiebreaker can be used once');

const seasonFields = z.object({
  name,
  startDate: isoDate,
  endDate: isoDate,
  timezone,
  pointsForWin: points,
  pointsForDraw: points,
  pointsForLoss: points,
  tiebreakers,
  yellowCardLimit: cards.min(1),
  yellowCardBan: cards,
  redCardBan: cards,
});

export const seasonSchema = seasonFields
  .extend({
    timezone: timezone.default('Europe/London'),
    pointsForWin: points.default(3),
    pointsForDraw: points.default(1),
    pointsForLoss: points.default(0),
    tiebreakers: tiebreakers.default(['GOAL_DIFFERENCE', 'GOALS_FOR', 'HEAD_TO_HEAD']),
    yellowCardLimit: cards.min(1).default(5),
    yellowCardBan: cards.default(1),
    redCardBan: cards.default(1),
  })
  .refine((s) => s.endDate >= s.startDate, {
    path: ['endDate'],
    message: 'The season must end after it starts',
  });

/** Partial update: only the fields that are sent are changed. */
export const seasonUpdateSchema = seasonFields.partial();

export type SeasonInput = z.infer<typeof seasonSchema>;
export type SeasonUpdate = z.infer<typeof seasonUpdateSchema>;
