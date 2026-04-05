export const POSITIONS = ['GOALKEEPER', 'DEFENDER', 'MIDFIELDER', 'FORWARD'] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABELS: Record<Position, string> = {
  GOALKEEPER: 'Goalkeeper',
  DEFENDER: 'Defender',
  MIDFIELDER: 'Midfielder',
  FORWARD: 'Forward',
};

export const POSITION_SHORT: Record<Position, string> = {
  GOALKEEPER: 'GK',
  DEFENDER: 'DF',
  MIDFIELDER: 'MF',
  FORWARD: 'FW',
};
