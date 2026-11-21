// Night Vault — world model: turns an ASCII floor plan into tiles,
// answers collision and line-of-sight questions for every other module.

import { TILE, COLS, ROWS } from './config.js';

export function parseLevel(levelDef) {
  const solid = [];
  const shadow = [];
  let playerStart = null;
  let intelPos = null;
  let exitPos = null;

  for (let row = 0; row < ROWS; row++) {
    const line = levelDef.map[row] ?? '';
    const solidRow = [];
    const shadowRow = [];
    for (let col = 0; col < COLS; col++) {
      const ch = line[col] ?? '#';
      solidRow.push(ch === '#' || ch === 'C');
      shadowRow.push(ch === 'S');
      const cx = col * TILE + TILE / 2;
      const cy = row * TILE + TILE / 2;
      if (ch === 'P') playerStart = { x: cx, y: cy };
      if (ch === 'I') intelPos = { x: cx, y: cy, col, row };
      if (ch === 'E') exitPos = { x: cx, y: cy, col, row };
    }
    solid.push(solidRow);
    shadow.push(shadowRow);
  }
  return {
    name: levelDef.name,
    rows: levelDef.map.slice(),
    solid,
    shadow,
    playerStart,
    intelPos,
    exitPos,
    patrols: levelDef.patrols,
  };
}

export function tileOf(px) {
  return Math.floor(px / TILE);
}

export function isSolidTile(world, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return true;
  return world.solid[row][col];
}

export function isSolidAt(world, x, y) {
  return isSolidTile(world, tileOf(x), tileOf(y));
}

export function isShadowAt(world, x, y) {
  const col = tileOf(x);
  const row = tileOf(y);
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return false;
  return world.shadow[row][col];
}

export function charAt(world, col, row) {
  if (col < 0 || row < 0 || col >= COLS || row >= ROWS) return '#';
  return world.rows[row][col] ?? '#';
}

// Move a circular body by (dx, dy), sliding along walls axis by axis so
// actors hug corners instead of sticking to them.
export function moveWithCollision(world, body, dx, dy) {
  const r = body.r;
  const tryX = body.x + dx;
  if (
    !isSolidAt(world, tryX - r, body.y - r + 2) &&
    !isSolidAt(world, tryX + r, body.y - r + 2) &&
    !isSolidAt(world, tryX - r, body.y + r - 2) &&
    !isSolidAt(world, tryX + r, body.y + r - 2)
  ) {
    body.x = tryX;
  }
  const tryY = body.y + dy;
  if (
    !isSolidAt(world, body.x - r + 2, tryY - r) &&
    !isSolidAt(world, body.x + r - 2, tryY - r) &&
    !isSolidAt(world, body.x - r + 2, tryY + r) &&
    !isSolidAt(world, body.x + r - 2, tryY + r)
  ) {
    body.y = tryY;
  }
}

// True when the straight line between two points crosses no solid tile.
// Sampled every few pixels — cheap and plenty for a tile world.
export function hasLineOfSight(world, x1, y1, x2, y2) {
  const dist = Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.max(1, Math.ceil(dist / 6));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (isSolidAt(world, x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return false;
  }
  return true;
}

// Distance from a point along a ray until it enters a solid tile.
export function raycastDistance(world, x, y, angle, maxDist) {
  const step = 5;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  for (let d = step; d <= maxDist; d += step) {
    if (isSolidAt(world, x + cos * d, y + sin * d)) return d - step;
  }
  return maxDist;
}
