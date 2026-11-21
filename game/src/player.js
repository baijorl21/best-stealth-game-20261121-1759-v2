// Night Vault — the player: a lone infiltrator crossing each floor.
// Movement is plain WASD/arrows; holding Shift sneaks — slower, but far
// harder for a guard's detection meter to fill.

import { TILE, PLAYER_SPEED, PLAYER_SNEAK, PLAYER_R } from './config.js';
import { moveWithCollision, isShadowAt } from './world.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    r: PLAYER_R,
    angle: -Math.PI / 2,
    sneaking: false,
    inShadow: false,
    moving: false,
    stepPhase: 0,
  };
}

export function updatePlayer(player, dt, input, world) {
  let dx = 0;
  let dy = 0;
  if (input.left) dx -= 1;
  if (input.right) dx += 1;
  if (input.up) dy -= 1;
  if (input.down) dy += 1;

  player.sneaking = input.sneak;
  player.inShadow = isShadowAt(world, player.x, player.y);
  player.moving = dx !== 0 || dy !== 0;

  if (player.moving) {
    const len = Math.hypot(dx, dy);
    const speed = player.sneaking ? PLAYER_SNEAK : PLAYER_SPEED;
    moveWithCollision(world, player, (dx / len) * speed * dt, (dy / len) * speed * dt);
    player.angle = Math.atan2(dy, dx);
    player.stepPhase += dt * (player.sneaking ? 5 : 9);
  }
}

// How visible the player is right now: 1 = fully exposed.
// Sneaking and standing in shadow each cut detection sharply.
export function playerVisibility(player) {
  let v = 1;
  if (player.sneaking) v *= 0.45;
  if (player.inShadow) v *= 0.5;
  if (!player.moving) v *= 0.8;
  return v;
}

export function playerTile(player) {
  return { col: Math.floor(player.x / TILE), row: Math.floor(player.y / TILE) };
}
