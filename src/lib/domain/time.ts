export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-GB', { timeZone });
    return true;
  } catch {
    return false;
  }
}

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

/** Minutes the time zone is ahead of UTC at the given instant. */
export function offsetMinutes(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(instant.getTime() / 1000) * 1000) / 60000);
}

const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Converts a wall-clock time in a time zone ("2025-10-26T15:00" in Europe/London)
 * to the UTC instant. Times that fall in a DST gap move forward by the gap.
 */
export function zonedTimeToUtc(local: string, timeZone: string): Date {
  const m = LOCAL.exec(local);
  if (!m) throw new Error(`Expected YYYY-MM-DDTHH:MM, got ${local}`);
  const [, y, mo, d, h, mi] = m.map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const first = offsetMinutes(new Date(guess), timeZone);
  let result = guess - first * 60_000;
  const second = offsetMinutes(new Date(result), timeZone);
  if (second !== first) result = guess - second * 60_000;
  return new Date(result);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** The instant as "YYYY-MM-DDTHH:MM" wall-clock time, for datetime-local inputs. */
export function toLocalInput(instant: Date, timeZone: string): string {
  const p = zonedParts(instant, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatKickoff(instant: Date | null | undefined, timeZone: string): string {
  if (!instant) return 'Date to be confirmed';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}

export function formatTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);
}
