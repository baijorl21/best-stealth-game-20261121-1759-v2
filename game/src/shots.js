// Night Vault — screenshot staging: deterministic posed scenes for the
// ?shot=title|cover|alert|win captures. Each pose freezes real gameplay
// state (real guards, real cones, real HUD) so the screenshots are honest
// renders of the game itself, just arranged to read at a glance.

import { TILE } from './config.js';

function placeAt(actor, col, row, angle) {
  actor.x = col * TILE + TILE / 2;
  actor.y = row * TILE + TILE / 2;
  if (angle !== undefined) actor.angle = angle;
}

function poseTitle(game) {
  game.loadFloor(0);
  const s = game.state;
  s.screen = 'title';
  // Guards mid-patrol behind the title overlay, cones sweeping the lobby.
  placeAt(s.guards[0], 14, 7, 0);
  placeAt(s.guards[1], 24, 13, Math.PI);
  placeAt(s.player, 3, 8, 0);
}

function poseCover(game) {
  game.loadFloor(1);
  const s = game.state;
  s.screen = 'playing';
  s.score = 1450;
  s.floorTime = 42;
  s.hasIntel = false;
  s.intelTaken = false;
  // Player crouched in shadow behind crates, mid-floor.
  placeAt(s.player, 9, 9, -Math.PI / 2);
  s.player.sneaking = true;
  s.player.inShadow = true;
  // Guard A patrols the middle corridor, cone across the open floor.
  placeAt(s.guards[0], 18, 8, Math.PI);
  s.guards[0].state = 'patrol';
  s.guards[0].meter = 0;
  // Guard B has half-seen something: suspicious, staring down the
  // corridor at the player, meter rising.
  placeAt(s.guards[1], 13, 8, Math.atan2(1, -4));
  s.guards[1].state = 'suspicious';
  s.guards[1].meter = 0.62;
  s.guards[1].lastKnown = { x: s.player.x, y: s.player.y };
  // Guard C watches the exit approach.
  placeAt(s.guards[2], 24, 12, Math.PI);
  s.guards[2].state = 'patrol';
  s.guards[2].meter = 0.18;
  // A coin hangs mid-flight toward the far corner — the distraction tool.
  s.coin = {
    x: s.player.x, y: s.player.y,
    tx: 5 * TILE + 16, ty: 12 * TILE + 16,
    t: 0.55, active: true,
  };
  s.message = 'Sneak in shadow. Throw a coin to pull guards away.';
  s.messageTimer = 99;
}

function poseAlert(game) {
  game.loadFloor(2);
  const s = game.state;
  s.screen = 'playing';
  s.score = 2600;
  s.floorTime = 96;
  s.hasIntel = true;
  s.intelTaken = true;
  s.alertsThisFloor = 1;
  // Player sprinting for the exit with the intel, guard in full chase.
  placeAt(s.player, 20, 14, Math.PI / 2);
  s.player.sneaking = false;
  placeAt(s.guards[0], 18, 12, Math.atan2(2, 2));
  s.guards[0].state = 'chase';
  s.guards[0].meter = 1;
  s.guards[0].lastKnown = { x: s.player.x, y: s.player.y };
  placeAt(s.guards[1], 12, 5, Math.PI / 2);
  s.guards[1].state = 'suspicious';
  s.guards[1].meter = 0.55;
  s.guards[1].lastKnown = { x: s.player.x, y: s.player.y };
  placeAt(s.guards[2], 22, 13, -Math.PI / 2);
  s.guards[2].state = 'patrol';
  s.guards[2].meter = 0.3;
  placeAt(s.guards[3], 9, 14, 0);
  s.guards[3].state = 'patrol';
  s.guards[3].meter = 0;
  s.message = 'Spotted! Break line of sight to lose the chase!';
  s.messageTimer = 99;
}

function poseWin(game) {
  game.loadFloor(2);
  const s = game.state;
  s.screen = 'victory';
  s.score = 3850;
  s.totalTime = 214;
  s.totalAlerts = 1;
  s.hasIntel = true;
  s.intelTaken = true;
  placeAt(s.player, 24, 16, 0);
  placeAt(s.guards[0], 10, 9, 0);
  placeAt(s.guards[1], 12, 6, Math.PI);
  placeAt(s.guards[2], 20, 13, -Math.PI / 2);
  placeAt(s.guards[3], 9, 14, Math.PI / 2);
}

export function stageShot(name, game) {
  switch (name) {
    case 'title': poseTitle(game); break;
    case 'alert': poseAlert(game); break;
    case 'win': poseWin(game); break;
    case 'cover':
    default: poseCover(game); break;
  }
  game.state.time = 12.5; // fixed clock: identical pixels on every capture
  game.state.shotMode = true;
}
