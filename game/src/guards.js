// Night Vault — guards: patrols you can learn, a detection meter that
// fills and drains, suspicion that makes a guard stop and stare, a chase
// you can break by breaking line of sight, and coin investigations.
// States: patrol -> suspicious -> chase -> search -> return -> patrol,
// plus investigate for thrown coins.

import {
  TILE, GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_INVESTIGATE_SPEED,
  GUARD_R, GUARD_TURN_RATE, GUARD_VIEW_RANGE,
  DETECT_FILL, DETECT_DECAY, SUSPICIOUS_AT, LOSE_TRACK_AFTER,
} from './config.js';
import { moveWithCollision } from './world.js';
import { canSeePlayer, angleDifference } from './vision.js';
import { playerVisibility } from './player.js';

function tileCenter(col, row) {
  return { x: col * TILE + TILE / 2, y: row * TILE + TILE / 2 };
}

export function createGuard(patrolTiles) {
  const waypoints = patrolTiles.map(([c, r]) => tileCenter(c, r));
  const start = waypoints[0];
  const next = waypoints[1] ?? start;
  return {
    x: start.x,
    y: start.y,
    r: GUARD_R,
    angle: Math.atan2(next.y - start.y, next.x - start.x),
    waypoints,
    waypointIndex: 1 % waypoints.length,
    state: 'patrol',
    meter: 0,               // detection meter 0..1
    pauseTimer: 0,          // pause at each waypoint
    scanPhase: 0,           // looking around while paused
    lastKnown: null,        // last seen player position
    unseenTimer: 0,         // time since the player was last seen
    investigateTarget: null,
    investigateTimer: 0,
    stepTimer: 0,           // footstep sound pacing
    wasSuspicious: false,
    wasAlerted: false,
  };
}

function turnToward(guard, targetAngle, dt) {
  const diff = angleDifference(targetAngle, guard.angle);
  const maxTurn = GUARD_TURN_RATE * dt;
  guard.angle += Math.max(-maxTurn, Math.min(maxTurn, diff));
}

function moveToward(guard, target, speed, dt, world) {
  const dx = target.x - guard.x;
  const dy = target.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 3) return true;
  turnToward(guard, Math.atan2(dy, dx), dt);
  const step = Math.min(dist, speed * dt);
  moveWithCollision(world, guard, (dx / dist) * step, (dy / dist) * step);
  guard.stepTimer -= dt;
  return dist <= step + 2;
}

// events: { onSuspicious(guard), onAlert(guard), onFootstep(guard) }
export function updateGuard(guard, dt, world, player, events) {
  const sight = canSeePlayer(world, guard, player);

  // --- detection meter -------------------------------------------------
  if (sight.seen) {
    const closeness = 1 - (sight.dist / GUARD_VIEW_RANGE) * 0.55;
    guard.meter = Math.min(
      1,
      guard.meter + DETECT_FILL * closeness * playerVisibility(player) * dt,
    );
    guard.lastKnown = { x: player.x, y: player.y };
    guard.unseenTimer = 0;
  } else {
    guard.unseenTimer += dt;
    if (guard.state !== 'chase') {
      guard.meter = Math.max(0, guard.meter - DETECT_DECAY * dt);
    }
  }

  // --- state transitions from the meter --------------------------------
  if (guard.meter >= 1 && guard.state !== 'chase') {
    guard.state = 'chase';
    if (!guard.wasAlerted) events.onAlert(guard);
    guard.wasAlerted = true;
  } else if (
    guard.meter >= SUSPICIOUS_AT &&
    (guard.state === 'patrol' || guard.state === 'return' || guard.state === 'investigate')
  ) {
    guard.state = 'suspicious';
    if (!guard.wasSuspicious) events.onSuspicious(guard);
    guard.wasSuspicious = true;
  } else if (guard.state === 'suspicious' && guard.meter < SUSPICIOUS_AT * 0.5) {
    guard.state = 'patrol';
    guard.wasSuspicious = false;
  }
  if (guard.meter < 0.05) guard.wasSuspicious = false;

  // --- behaviour per state ---------------------------------------------
  switch (guard.state) {
    case 'patrol': {
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        guard.scanPhase += dt;
        guard.angle += Math.sin(guard.scanPhase * 1.6) * 0.9 * dt;
        break;
      }
      const target = guard.waypoints[guard.waypointIndex];
      if (moveToward(guard, target, GUARD_PATROL_SPEED, dt, world)) {
        guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = 1.1;
        guard.scanPhase = 0;
      }
      break;
    }
    case 'suspicious': {
      // Stop and stare at whatever caught the eye; meter keeps filling
      // while the player stays in view, drains once they slip away.
      if (guard.lastKnown) {
        turnToward(guard, Math.atan2(guard.lastKnown.y - guard.y, guard.lastKnown.x - guard.x), dt);
      }
      break;
    }
    case 'chase': {
      const target = sight.seen ? player : guard.lastKnown;
      if (target) moveToward(guard, target, GUARD_CHASE_SPEED, dt, world);
      if (guard.unseenTimer > LOSE_TRACK_AFTER) {
        guard.state = 'search';
        guard.investigateTimer = 2.2;
        guard.meter = 0.55;
        guard.wasAlerted = false;
      }
      break;
    }
    case 'search': {
      if (guard.lastKnown) {
        moveToward(guard, guard.lastKnown, GUARD_INVESTIGATE_SPEED, dt, world);
      }
      guard.scanPhase += dt;
      guard.angle += Math.sin(guard.scanPhase * 2.2) * 1.4 * dt;
      guard.investigateTimer -= dt;
      if (guard.investigateTimer <= 0) guard.state = 'return';
      break;
    }
    case 'investigate': {
      if (guard.investigateTarget) {
        const arrived = moveToward(
          guard, guard.investigateTarget, GUARD_INVESTIGATE_SPEED, dt, world,
        );
        if (arrived) {
          guard.scanPhase += dt;
          guard.angle += Math.sin(guard.scanPhase * 2.0) * 1.3 * dt;
          guard.investigateTimer -= dt;
          if (guard.investigateTimer <= 0) guard.state = 'return';
        }
      } else {
        guard.state = 'return';
      }
      break;
    }
    case 'return': {
      // Head for the nearest patrol waypoint, then resume the loop.
      let best = guard.waypoints[0];
      let bestDist = Infinity;
      for (const wp of guard.waypoints) {
        const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
        if (d < bestDist) { bestDist = d; best = wp; }
      }
      if (moveToward(guard, best, GUARD_PATROL_SPEED, dt, world)) {
        guard.waypointIndex = (guard.waypoints.indexOf(best) + 1) % guard.waypoints.length;
        guard.state = 'patrol';
      }
      break;
    }
    default:
      guard.state = 'patrol';
  }

  // Footsteps: paced by movement so the player can hear a guard approach.
  if (guard.stepTimer <= 0 && guard.state !== 'suspicious') {
    guard.stepTimer = 0.42;
    events.onFootstep(guard);
  }
}

// A landed coin: nearby guards who are not already chasing come to look.
export function hearCoin(guard, coinPos, hearRadius) {
  if (guard.state === 'chase') return false;
  const dist = Math.hypot(coinPos.x - guard.x, coinPos.y - guard.y);
  if (dist > hearRadius) return false;
  guard.state = 'investigate';
  guard.investigateTarget = { x: coinPos.x, y: coinPos.y };
  guard.investigateTimer = 2.4;
  guard.scanPhase = 0;
  return true;
}

export function guardIsAlerted(guard) {
  return guard.state === 'chase';
}
