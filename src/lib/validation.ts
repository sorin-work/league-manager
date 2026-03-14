import { z } from 'zod';
import { EVENT_TYPES } from './domain/events';
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
  status: z.enum(['DRAFT', 'ACTIVE', 'FINISHED']),
  notes: z
    .string()
    .trim()
    .max(4000, 'Keep the notes under 4000 characters')
    .transform((v) => (v === '' ? null : v))
    .nullable(),
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
    status: seasonFields.shape.status.default('DRAFT'),
    notes: seasonFields.shape.notes.optional(),
  })
  .refine((s) => s.endDate >= s.startDate, {
    path: ['endDate'],
    message: 'The season must end after it starts',
  });

/** Partial update: only the fields that are sent are changed. */
export const seasonUpdateSchema = seasonFields.partial();

export type SeasonInput = z.infer<typeof seasonSchema>;
export type SeasonUpdate = z.infer<typeof seasonUpdateSchema>;

const divisionFields = z.object({
  name,
  format: z.enum(['SINGLE', 'DOUBLE']),
  sortOrder: z.int().min(0).max(999),
  promotionPlaces: z.int().min(0).max(10),
  relegationPlaces: z.int().min(0).max(10),
});

export const divisionSchema = divisionFields.extend({
  format: divisionFields.shape.format.default('SINGLE'),
  sortOrder: divisionFields.shape.sortOrder.default(0),
  promotionPlaces: divisionFields.shape.promotionPlaces.default(0),
  relegationPlaces: divisionFields.shape.relegationPlaces.default(0),
});
export const divisionUpdateSchema = divisionFields.partial();

export type DivisionInput = z.infer<typeof divisionSchema>;
export type DivisionUpdate = z.infer<typeof divisionUpdateSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep it under ${max} characters`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional();

export const teamSchema = z.object({
  name,
  shortName: optionalText(5).transform((v) => (v ? v.toUpperCase() : v)),
  homeVenueId: z.string().min(1).nullable().optional(),
});
export const teamUpdateSchema = teamSchema.partial();

export type TeamInput = z.infer<typeof teamSchema>;
export type TeamUpdate = z.infer<typeof teamUpdateSchema>;

export const playerSchema = z.object({
  name,
  shirtNumber: z.int('Must be a whole number').min(1).max(99).nullable().optional(),
});
export const playerUpdateSchema = playerSchema.partial();

export type PlayerInput = z.infer<typeof playerSchema>;
export type PlayerUpdate = z.infer<typeof playerUpdateSchema>;

export const venueSchema = z.object({
  name,
  address: optionalText(200),
});
export const venueUpdateSchema = venueSchema.partial();

export type VenueInput = z.infer<typeof venueSchema>;
export type VenueUpdate = z.infer<typeof venueUpdateSchema>;

const clockTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use the format HH:MM');

export const generateFixturesSchema = z.object({
  startDate: isoDate,
  daysBetweenRounds: z.int().min(1).max(28).default(7),
  kickoffTimes: z.array(clockTime).min(1, 'Give at least one kick-off time').default(['10:00']),
  venueIds: z.array(z.string().min(1)).default([]),
  skipDates: z.array(isoDate).default([]),
  format: z.enum(['SINGLE', 'DOUBLE']).optional(),
});

export type GenerateFixturesInput = z.infer<typeof generateFixturesSchema>;

export const matchUpdateSchema = z.object({
  /** Wall-clock time in the season's time zone, as sent by a datetime-local input. */
  kickoffAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Use the format YYYY-MM-DDTHH:MM')
    .nullable()
    .optional(),
  venueId: z.string().min(1).nullable().optional(),
  status: z.enum(['SCHEDULED', 'POSTPONED', 'CANCELLED']).optional(),
});

export type MatchUpdate = z.infer<typeof matchUpdateSchema>;

const score = z.int('Must be a whole number').min(0).max(99);

export const matchEventSchema = z.object({
  playerId: z.string().min(1),
  type: z.enum(EVENT_TYPES),
  minute: z.int().min(1).max(130).nullable().optional(),
});

export const resultSchema = z.object({
  homeScore: score,
  awayScore: score,
  events: z.array(matchEventSchema).max(80).default([]),
});

export const adjustmentSchema = z.object({
  teamId: z.string().min(1),
  points: z
    .int('Must be a whole number')
    .min(-100)
    .max(100)
    .refine((n) => n !== 0, 'An adjustment of zero points does nothing'),
  reason: z.string().trim().min(1, 'Say why the points are adjusted').max(200),
});

export type AdjustmentInput = z.infer<typeof adjustmentSchema>;

export type MatchEventInput = z.infer<typeof matchEventSchema>;
export type ResultInput = z.infer<typeof resultSchema>;
