const COMMON_ZONES = [
  'Europe/London',
  'Europe/Dublin',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Rome',
  'Europe/Warsaw',
  'Europe/Bucharest',
  'Europe/Athens',
  'Europe/Istanbul',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Sao_Paulo',
  'Africa/Johannesburg',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
  'Pacific/Auckland',
  'UTC',
];

export const TIME_ZONE_LIST_ID = 'time-zones';

/** Suggestions for a time zone text input (`list={TIME_ZONE_LIST_ID}`). */
export function TimeZoneOptions() {
  return (
    <datalist id={TIME_ZONE_LIST_ID}>
      {COMMON_ZONES.map((z) => (
        <option key={z} value={z} />
      ))}
    </datalist>
  );
}
