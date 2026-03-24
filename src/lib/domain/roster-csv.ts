export interface RosterRow {
  name: string;
  shirtNumber: number | null;
}

export interface RosterParseResult {
  players: RosterRow[];
  errors: { line: number; message: string }[];
}

/** Splits one CSV line, honouring double quotes ("Smith, Jr." and "" escapes). */
export function splitCsvLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      cells.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells.map((c) => c.trim());
}

const NAME_HEADERS = ['name', 'player', 'player name'];
const NUMBER_HEADERS = ['number', 'no', 'no.', 'shirt', 'shirt number', '#'];

/**
 * Reads a roster exported from a spreadsheet. Columns are found by their
 * header (name / number); without a header the first column is the name and
 * the second, if any, the shirt number. Comma and semicolon both work.
 */
export function parseRosterCsv(text: string): RosterParseResult {
  const lines = text
    .replace(/^﻿/, '')
    .split(/\r?\n/)
    .map((l, i) => ({ text: l, line: i + 1 }))
    .filter((l) => l.text.trim() !== '');
  const result: RosterParseResult = { players: [], errors: [] };
  if (lines.length === 0) return result;

  const delimiter = lines[0].text.includes(';') && !lines[0].text.includes(',') ? ';' : ',';
  const first = splitCsvLine(lines[0].text, delimiter).map((h) => h.toLowerCase());
  let nameCol = first.findIndex((h) => NAME_HEADERS.includes(h));
  let numberCol = first.findIndex((h) => NUMBER_HEADERS.includes(h));
  const hasHeader = nameCol !== -1;
  if (!hasHeader) {
    nameCol = 0;
    numberCol = first.length > 1 ? 1 : -1;
  }

  const seen = new Map<number, number>();
  for (const { text: raw, line } of hasHeader ? lines.slice(1) : lines) {
    const cells = splitCsvLine(raw, delimiter);
    const name = cells[nameCol]?.replace(/\s+/g, ' ') ?? '';
    const numberText = numberCol === -1 ? '' : (cells[numberCol] ?? '');
    if (!name) {
      result.errors.push({ line, message: 'Missing player name' });
      continue;
    }
    if (name.length > 80) {
      result.errors.push({ line, message: 'Name is longer than 80 characters' });
      continue;
    }
    let shirtNumber: number | null = null;
    if (numberText) {
      const n = Number(numberText);
      if (!Number.isInteger(n) || n < 1 || n > 99) {
        result.errors.push({ line, message: `Shirt number "${numberText}" must be 1-99` });
        continue;
      }
      if (seen.has(n)) {
        result.errors.push({
          line,
          message: `Shirt number ${n} is also used on line ${seen.get(n)}`,
        });
        continue;
      }
      seen.set(n, line);
      shirtNumber = n;
    }
    result.players.push({ name, shirtNumber });
  }
  return result;
}
