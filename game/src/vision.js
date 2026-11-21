// Night Vault — guard vision: builds the wall-clipped cone polygon the
// renderer draws, and decides whether a guard can actually see the player.

import { GUARD_VIEW_RANGE, GUARD_VIEW_FOV } from './config.js';
import { hasLineOfSight, raycastDistance } from './world.js';

// Fan of short rays across the cone, each stopped by the first wall or
// crate it meets, so the drawn cone hugs cover exactly like real sight.
export function computeVisionPolygon(world, guard) {
  const rays = 42;
  const points = [{ x: guard.x, y: guard.y }];
  const start = guard.angle - GUARD_VIEW_FOV / 2;
  for (let i = 0; i <= rays; i++) {
    const angle = start + (GUARD_VIEW_FOV * i) / rays;
    const dist = raycastDistance(world, guard.x, guard.y, angle, GUARD_VIEW_RANGE);
    points.push({
      x: guard.x + Math.cos(angle) * dist,
      y: guard.y + Math.sin(angle) * dist,
    });
  }
  return points;
}

export function angleDifference(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Returns { seen, dist } — seen only inside range, inside the cone and
// with an unbroken line of sight past walls and crates.
export function canSeePlayer(world, guard, player) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_VIEW_RANGE) return { seen: false, dist };
  const toPlayer = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(toPlayer, guard.angle)) > GUARD_VIEW_FOV / 2) {
    return { seen: false, dist };
  }
  if (!hasLineOfSight(world, guard.x, guard.y, player.x, player.y)) {
    return { seen: false, dist };
  }
  return { seen: true, dist };
}
