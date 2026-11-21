// Night Vault — game orchestration: screens, the main loop, scoring,
// coin throws and floor flow. Steal the intel on each of three floors,
// reach the exit unseen, and finish with the best score you can.

import {
  HUD_H, CATCH_DIST, COIN_RANGE, COIN_HEAR_RADIUS, COIN_COOLDOWN, COIN_FLIGHT,
  SCORE_FLOOR_BASE, SCORE_INTEL, SCORE_GHOST_BONUS, SCORE_ALERT_PENALTY,
  SCORE_TIME_PENALTY,
} from './config.js';
import { LEVELS } from './levels.js';
import { parseLevel, isSolidAt } from './world.js';
import { createPlayer, updatePlayer } from './player.js';
import { createGuard, updateGuard, hearCoin, guardIsAlerted } from './guards.js';
import { createInput, clearOneShots } from './input.js';
import { createAudio } from './audio.js';
import { drawScene } from './render.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = createInput(canvas);
const audio = createAudio();

const state = {
  screen: 'title',
  world: null,
  player: null,
  guards: [],
  floorIndex: 0,
  hasIntel: false,
  intelTaken: false,
  score: 0,
  floorTime: 0,
  totalTime: 0,
  alertsThisFloor: 0,
  totalAlerts: 0,
  lastFloorScore: 0,
  lastGhost: false,
  coin: null,
  coinCooldown: 0,
  message: '',
  messageTimer: 0,
  muted: false,
  time: 0,
  shotMode: false,
};

function loadFloor(index) {
  state.floorIndex = index;
  state.world = parseLevel(LEVELS[index]);
  state.player = createPlayer(state.world.playerStart);
  state.guards = state.world.patrols.map((patrol) => createGuard(patrol));
  state.hasIntel = false;
  state.intelTaken = false;
  state.floorTime = 0;
  state.alertsThisFloor = 0;
  state.coin = null;
  state.coinCooldown = 0;
  state.message = '';
  state.messageTimer = 0;
}

function showMessage(text, seconds = 3.2) {
  state.message = text;
  state.messageTimer = seconds;
}

function startRun() {
  state.score = 0;
  state.totalTime = 0;
  state.totalAlerts = 0;
  loadFloor(0);
  state.screen = 'playing';
  showMessage('Floor 1 — steal the INTEL, then reach the EXIT unseen.');
}

function throwCoin(click) {
  if (state.coinCooldown > 0) return;
  const player = state.player;
  let tx = click.x;
  let ty = click.y - HUD_H;
  const dx = tx - player.x;
  const dy = ty - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist > COIN_RANGE) {
    tx = player.x + (dx / dist) * COIN_RANGE;
    ty = player.y + (dy / dist) * COIN_RANGE;
  }
  // Never land inside a wall: step back toward the player until free.
  let guard = 0;
  while (isSolidAt(state.world, tx, ty) && guard < 40) {
    tx -= (dx / (dist || 1)) * 6;
    ty -= (dy / (dist || 1)) * 6;
    guard++;
  }
  state.coin = { x: player.x, y: player.y, tx, ty, t: 0, active: true };
  state.coinCooldown = COIN_COOLDOWN;
}

function updateCoin(dt) {
  if (state.coinCooldown > 0) state.coinCooldown -= dt;
  const coin = state.coin;
  if (!coin || !coin.active) return;
  if (coin.t < 1) {
    coin.t += dt / COIN_FLIGHT;
    if (coin.t >= 1) {
      coin.t = 1;
      audio.coinClink();
      let heard = false;
      for (const g of state.guards) {
        if (hearCoin(g, { x: coin.tx, y: coin.ty }, COIN_HEAR_RADIUS)) heard = true;
      }
      if (heard) showMessage('A guard heard the coin and went to look…', 2.4);
    }
  } else {
    coin.t += dt;
    if (coin.t > 3.4) coin.active = false;
  }
}

function finishFloor() {
  const ghost = state.alertsThisFloor === 0;
  const floorScore = Math.max(
    50,
    SCORE_FLOOR_BASE + SCORE_INTEL +
      (ghost ? SCORE_GHOST_BONUS : 0) -
      Math.floor(state.floorTime) * SCORE_TIME_PENALTY -
      state.alertsThisFloor * SCORE_ALERT_PENALTY,
  );
  state.lastFloorScore = floorScore;
  state.lastGhost = ghost;
  state.score += floorScore;
  if (state.floorIndex >= LEVELS.length - 1) {
    state.screen = 'victory';
    audio.victory();
  } else {
    state.screen = 'floorclear';
    audio.floorClear();
  }
}

const guardEvents = {
  onSuspicious() {
    audio.suspiciousBlip();
    showMessage('A guard is suspicious — freeze or slip out of the cone!', 2.2);
  },
  onAlert() {
    state.alertsThisFloor += 1;
    state.totalAlerts += 1;
    audio.alarm();
    showMessage('Spotted! Break line of sight to lose the chase!', 2.6);
  },
  onFootstep(guard) {
    const dist = Math.hypot(guard.x - state.player.x, guard.y - state.player.y);
    audio.footstep(Math.max(0, 1 - dist / 330));
  },
};

function updatePlaying(dt) {
  state.floorTime += dt;
  state.totalTime += dt;
  updatePlayer(state.player, dt, input, state.world);
  for (const guard of state.guards) {
    updateGuard(guard, dt, state.world, state.player, guardEvents);
  }
  updateCoin(dt);

  // Caught: a chasing guard within arm's reach ends the run on this floor.
  for (const guard of state.guards) {
    const dist = Math.hypot(guard.x - state.player.x, guard.y - state.player.y);
    if (guardIsAlerted(guard) && dist < CATCH_DIST) {
      state.screen = 'caught';
      audio.caughtSting();
      return;
    }
  }

  // Steal the intel.
  const intel = state.world.intelPos;
  if (!state.intelTaken && intel) {
    if (Math.hypot(intel.x - state.player.x, intel.y - state.player.y) < 24) {
      state.intelTaken = true;
      state.hasIntel = true;
      audio.pickup();
      showMessage('Intel secured! Now reach the EXIT unseen.');
    }
  }

  // Reach the exit (only counts with the intel in hand).
  const exit = state.world.exitPos;
  if (exit && Math.hypot(exit.x - state.player.x, exit.y - state.player.y) < 24) {
    if (state.hasIntel) {
      finishFloor();
    } else if (state.messageTimer <= 0) {
      showMessage('The exit is locked — steal the INTEL first.', 2.0);
    }
  }
}

function update(dt) {
  if (state.messageTimer > 0) state.messageTimer -= dt;

  if (input.mutePressed) {
    state.muted = audio.toggleMute();
  }

  switch (state.screen) {
    case 'title':
      if (input.confirmPressed || input.click) {
        audio.unlock();
        audio.uiClick();
        startRun();
      }
      break;
    case 'playing':
      if (input.pausePressed) {
        state.screen = 'paused';
        break;
      }
      if (input.restartPressed) {
        loadFloor(state.floorIndex);
        showMessage('Floor restarted.');
        break;
      }
      if (input.click) throwCoin(input.click);
      updatePlaying(dt);
      break;
    case 'paused':
      if (input.pausePressed || input.confirmPressed) state.screen = 'playing';
      if (input.restartPressed) {
        loadFloor(state.floorIndex);
        state.screen = 'playing';
      }
      break;
    case 'caught':
      if (input.confirmPressed || input.restartPressed) {
        loadFloor(state.floorIndex);
        state.screen = 'playing';
        showMessage('Again — slower this time. Watch the cones.');
      }
      break;
    case 'floorclear':
      if (input.confirmPressed) {
        loadFloor(state.floorIndex + 1);
        state.screen = 'playing';
        showMessage(`${state.world.name} — steal the INTEL, reach the EXIT.`);
      }
      break;
    case 'victory':
      if (input.confirmPressed) {
        state.screen = 'title';
        loadFloor(0);
      }
      break;
    default:
      break;
  }
  clearOneShots(input);
}

// --- boot -----------------------------------------------------------------
loadFloor(0);
const shotName = new URLSearchParams(window.location.search).get('shot');
if (shotName) {
  stageShot(shotName, { state, loadFloor });
}

let lastStamp = performance.now();
let shotFrames = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - lastStamp) / 1000);
  lastStamp = now;
  if (!state.shotMode) {
    state.time += dt;
    update(dt);
  }
  drawScene(ctx, state);
  if (state.shotMode && shotFrames < 3) {
    shotFrames += 1;
    if (shotFrames >= 3) window.__shotReady = true;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
