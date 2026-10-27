/**
 * A stadium-shaped circuit in a 200 × 120 box: two straights joined by half circles.
 * The start/finish line sits in the middle of the bottom straight and racers run anticlockwise on screen.
 */
export const TRACK_WIDTH = 200;
export const TRACK_HEIGHT = 120;
export const TRACK_PATH = "M100 100 H140 A40 40 0 0 0 140 20 H60 A40 40 0 0 0 60 100 Z";
/** The grass inside the inner edge of the tarmac. */
export const INFIELD_PATH = "M60 31.5 H140 A28.5 28.5 0 0 1 140 88.5 H60 A28.5 28.5 0 0 1 60 31.5 Z";

const RADIUS = 40;
const ARC = Math.PI * RADIUS;
const SEGMENTS = [40, ARC, 80, ARC, 40];
const LENGTH = SEGMENTS.reduce((sum, length) => sum + length, 0);

export interface TrackPoint {
  x: number;
  y: number;
}

/** A point `fraction` of a lap past the line, nudged `offset` units outward (negative is the inside). */
export function trackPoint(fraction: number, offset = 0): TrackPoint {
  let distance = (((fraction % 1) + 1) % 1) * LENGTH;
  if (distance < SEGMENTS[0]) return { x: 100 + distance, y: 100 + offset };
  distance -= SEGMENTS[0];
  if (distance < SEGMENTS[1]) {
    const angle = Math.PI / 2 - distance / RADIUS;
    const radius = RADIUS + offset;
    return { x: 140 + radius * Math.cos(angle), y: 60 + radius * Math.sin(angle) };
  }
  distance -= SEGMENTS[1];
  if (distance < SEGMENTS[2]) return { x: 140 - distance, y: 20 - offset };
  distance -= SEGMENTS[2];
  if (distance < SEGMENTS[3]) {
    const angle = -Math.PI / 2 - distance / RADIUS;
    const radius = RADIUS + offset;
    return { x: 60 + radius * Math.cos(angle), y: 60 + radius * Math.sin(angle) };
  }
  distance -= SEGMENTS[3];
  return { x: 60 + distance, y: 100 + offset };
}

/** CSS position for a point inside the map box. */
export const toPercent = ({ x, y }: TrackPoint) => ({ left: `${(x / TRACK_WIDTH) * 100}%`, top: `${(y / TRACK_HEIGHT) * 100}%` });

/** Spread racers across the track's width. */
export const laneOffset = (index: number) => [-6, 6, -2, 2, -9, 9][index % 6];

/** How many racers each part of the map can draw before it only lists them. */
export const MAP_LIMIT = 12;
export const PARK_LIMIT = 15;

/** Ready racers line up two abreast behind the start line, following the track round the bend. */
export const gridSlot = (index: number): TrackPoint => trackPoint(-(0.02 + Math.floor(index / 2) * 0.035), index % 2 === 0 ? -6 : 6);

/** Where item `index` of `count` sits in rows of `columns`, each row centred on the middle of the map. */
function centredColumn(index: number, count: number, columns: number) {
  const row = Math.floor(index / columns);
  const inRow = Math.min(columns, Math.max(count, index + 1) - row * columns);
  return { row, offset: (index % columns) - (inRow - 1) / 2 };
}

/** Racers still getting set wait in the pit lane, two centred rows across the bottom of the infield. */
export function pitSlot(index: number, count: number): TrackPoint {
  const { row, offset } = centredColumn(index, Math.min(count, MAP_LIMIT), 6);
  return { x: 100 + offset * 13, y: row === 0 ? 70 : 81 };
}

/** Finishers park in the infield in finishing order: rows of three for a small race, rows of five for a big one. */
export function parkSlot(place: number, finishers: number): TrackPoint {
  const columns = finishers <= 6 ? 3 : 5;
  const rows = columns === 3 ? [52, 70] : [45, 58, 71];
  const { row, offset } = centredColumn(place - 1, Math.min(finishers, PARK_LIMIT), columns);
  return { x: 100 + offset * (columns === 3 ? 20 : 14), y: rows[Math.min(rows.length - 1, row)] };
}
