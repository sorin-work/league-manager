export const EVENT_TYPES = ['GOAL', 'PENALTY_GOAL', 'OWN_GOAL', 'YELLOW_CARD', 'RED_CARD'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const CARD_TYPES: readonly EventType[] = ['YELLOW_CARD', 'RED_CARD'];
/** Goals that count for the player who scored them. Own goals do not. */
export const SCORING_TYPES: readonly EventType[] = ['GOAL', 'PENALTY_GOAL'];

export const EVENT_LABELS: Record<EventType, string> = {
  GOAL: 'Goal',
  PENALTY_GOAL: 'Penalty',
  OWN_GOAL: 'Own goal',
  YELLOW_CARD: 'Yellow card',
  RED_CARD: 'Red card',
};

export const isCard = (type: EventType) => CARD_TYPES.includes(type);
