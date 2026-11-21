// Night Vault — rendering: draws the whole scene on one canvas.
// Floor, shadow zones, walls and crates first, then vision cones so
// cover reads at a glance, then actors, HUD and full-screen overlays.

import { TILE, COLS, ROWS, HUD_H, VIEW_W, VIEW_H } from './config.js';
import { charAt } from './world.js';
import { computeVisionPolygon } from './vision.js';

const COLORS = {
  floorA: '#1c2740',
  floorB: '#19223a',
  shadow: '#0d1526',
  wall: '#46587c',
  wallTop: '#5a6f9c',
  crate: '#a8742c',
  crateEdge: '#7c551e',
  conePatrol: 'rgba(255, 214, 90, 0.26)',
  coneSuspicious: 'rgba(255, 150, 60, 0.34)',
  coneAlert: 'rgba(255, 70, 60, 0.36)',
  player: '#2dd4bf',
  playerDark: '#0f766e',
  guard: '#e5484d',
  guardDark: '#8f2b30',
  intel: '#38e1ff',
  exit: '#4ade80',
  text: '#e6edff',
  dim: '#93a5cc',
};

function drawTiles(ctx, world) {
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const x = col * TILE;
      const y = row * TILE + HUD_H;
      const ch = charAt(world, col, row);
      if (ch === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(x, y, TILE, 5);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
      } else if (ch === 'C') {
        ctx.fillStyle = (col + row) % 2 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = COLORS.crateEdge;
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 4, y + 4, TILE - 8, TILE - 8);
        ctx.beginPath();
        ctx.moveTo(x + 4, y + 4);
        ctx.lineTo(x + TILE - 4, y + TILE - 4);
        ctx.moveTo(x + TILE - 4, y + 4);
        ctx.lineTo(x + 4, y + TILE - 4);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else if (ch === 'S') {
        ctx.fillStyle = COLORS.shadow;
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = 'rgba(120,160,255,0.10)';
        ctx.fillRect(x + 4, y + TILE - 8, TILE - 8, 2);
      } else {
        ctx.fillStyle = (col + row) % 2 ? COLORS.floorA : COLORS.floorB;
        ctx.fillRect(x, y, TILE, TILE);
      }
    }
  }
}

function drawPatrolRoutes(ctx, guards) {
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  for (const guard of guards) {
    for (const wp of guard.waypoints) {
      ctx.beginPath();
      ctx.arc(wp.x, wp.y + HUD_H, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawVisionCones(ctx, world, guards) {
  for (const guard of guards) {
    const poly = computeVisionPolygon(world, guard);
    ctx.fillStyle =
      guard.state === 'chase'
        ? COLORS.coneAlert
        : guard.state === 'suspicious' || guard.state === 'search' || guard.state === 'investigate'
          ? COLORS.coneSuspicious
          : COLORS.conePatrol;
    ctx.beginPath();
    ctx.moveTo(poly[0].x, poly[0].y + HUD_H);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y + HUD_H);
    ctx.closePath();
    ctx.fill();
  }
}

function drawObjectives(ctx, state, time) {
  const { world } = state;
  if (!state.intelTaken && world.intelPos) {
    const { x, y } = world.intelPos;
    const pulse = 1 + Math.sin(time * 3) * 0.12;
    ctx.save();
    ctx.translate(x, y + HUD_H);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = COLORS.intel;
    ctx.shadowColor = COLORS.intel;
    ctx.shadowBlur = 12;
    ctx.fillRect(-7 * pulse, -7 * pulse, 14 * pulse, 14 * pulse);
    ctx.restore();
    ctx.fillStyle = COLORS.intel;
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('INTEL', x, y + HUD_H - 16);
  }
  if (world.exitPos) {
    const { x, y } = world.exitPos;
    const open = state.hasIntel;
    ctx.fillStyle = open ? COLORS.exit : '#3f6212';
    ctx.shadowColor = open ? COLORS.exit : 'transparent';
    ctx.shadowBlur = open ? 14 : 0;
    ctx.fillRect(x - 13, y + HUD_H - 13, 26, 26);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0a0e18';
    ctx.font = 'bold 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', x, y + HUD_H + 4);
  }
}

function drawCoin(ctx, state) {
  const coin = state.coin;
  if (!coin || !coin.active) return;
  const t = Math.min(1, coin.t);
  const x = coin.x + (coin.tx - coin.x) * t;
  const y = coin.y + (coin.ty - coin.y) * t - Math.sin(t * Math.PI) * 26;
  ctx.fillStyle = '#fde047';
  ctx.shadowColor = '#fde047';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(x, y + HUD_H, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (t >= 1) {
    ctx.strokeStyle = 'rgba(253,224,71,0.5)';
    ctx.beginPath();
    ctx.arc(coin.tx, coin.ty + HUD_H, 10 + Math.sin(state.time * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawActor(ctx, actor, bodyColor, darkColor, isPlayer) {
  const y = actor.y + HUD_H;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(actor.x, y + 8, 11, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(actor.x, y, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = darkColor;
  ctx.beginPath();
  ctx.arc(actor.x, y, 6.5, 0, Math.PI * 2);
  ctx.fill();
  // facing nub
  const nx = actor.x + Math.cos(actor.angle) * 12;
  const ny = y + Math.sin(actor.angle) * 12;
  ctx.fillStyle = bodyColor;
  ctx.beginPath();
  ctx.arc(nx, ny, 3.5, 0, Math.PI * 2);
  ctx.fill();
  if (isPlayer) {
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(actor.x, y, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
  }
}

function drawGuardIndicators(ctx, guard) {
  const y = guard.y + HUD_H;
  if (guard.meter > 0.03 && guard.state !== 'chase') {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(guard.x - 14, y - 26, 28, 5);
    ctx.fillStyle = guard.meter > 0.42 ? '#fb923c' : '#fde047';
    ctx.fillRect(guard.x - 13, y - 25, 26 * Math.min(1, guard.meter), 3);
  }
  let mark = null;
  let color = '#fde047';
  if (guard.state === 'chase') { mark = '!'; color = '#ff5a52'; }
  else if (guard.state === 'suspicious' || guard.state === 'search' || guard.state === 'investigate') {
    mark = '?'; color = '#fb923c';
  }
  if (mark) {
    ctx.fillStyle = color;
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(mark, guard.x, y - 16);
  }
}

function drawHud(ctx, state) {
  ctx.fillStyle = '#0d1424';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.strokeStyle = '#2b3a5c';
  ctx.beginPath();
  ctx.moveTo(0, HUD_H - 0.5);
  ctx.lineTo(VIEW_W, HUD_H - 0.5);
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('NIGHT VAULT', 14, 26);
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(state.world.name, 14, 46);

  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillStyle = COLORS.text;
  ctx.fillText(`SCORE ${state.score}`, 220, 26);
  const secs = Math.floor(state.floorTime);
  ctx.fillText(`TIME ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`, 220, 48);

  ctx.fillStyle = state.hasIntel ? COLORS.intel : COLORS.dim;
  ctx.fillText(state.hasIntel ? 'INTEL: SECURED — GET TO EXIT' : 'INTEL: NOT YET', 400, 26);
  ctx.fillStyle = state.alertsThisFloor === 0 ? '#4ade80' : '#fb923c';
  ctx.fillText(
    state.alertsThisFloor === 0 ? 'GHOST: UNSEEN' : `ALERTS: ${state.alertsThisFloor}`,
    400, 48,
  );

  // highest guard meter as the global detection readout
  let maxMeter = 0;
  for (const g of state.guards) maxMeter = Math.max(maxMeter, g.meter);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('DETECTION', 700, 20);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fillRect(700, 26, 150, 10);
  ctx.fillStyle = maxMeter > 0.42 ? '#ff5a52' : '#fde047';
  ctx.fillRect(700, 26, 150 * maxMeter, 10);

  ctx.fillStyle = COLORS.dim;
  ctx.fillText(state.coinCooldown > 0 ? 'COIN …' : 'COIN READY', 700, 52);
  ctx.fillStyle = COLORS.text;
  ctx.textAlign = 'right';
  ctx.fillText(state.muted ? 'MUTED (M)' : 'SOUND ON (M)', VIEW_W - 14, 26);
  ctx.fillStyle = COLORS.dim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText('Shift sneak · R restart · P pause', VIEW_W - 14, 52);
  ctx.textAlign = 'left';
}

function overlay(ctx, alpha) {
  ctx.fillStyle = `rgba(5, 8, 16, ${alpha})`;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function centerText(ctx, text, y, size, color, bold = true) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW_W / 2, y);
  ctx.textAlign = 'left';
}

function drawTitle(ctx, state) {
  overlay(ctx, 0.62);
  centerText(ctx, 'NIGHT VAULT', 210, 64, '#f5d76e');
  centerText(ctx, 'Steal the intel. Reach the exit. Stay unseen.', 252, 19, COLORS.text, false);
  centerText(ctx, 'WASD / Arrows — move        Shift — sneak (harder to spot)', 310, 15, COLORS.dim, false);
  centerText(ctx, 'Click — throw a coin to distract guards', 336, 15, COLORS.dim, false);
  centerText(ctx, 'Hide behind crates and in shadow. Break line of sight to lose a chase.', 362, 15, COLORS.dim, false);
  centerText(ctx, 'PRESS ENTER TO START', 430, 22, '#4ade80');
  centerText(ctx, '3 floors · ghost bonus if no guard ever raises the alarm', 462, 13, COLORS.dim, false);
}

function drawPause(ctx) {
  overlay(ctx, 0.55);
  centerText(ctx, 'PAUSED', 300, 44, COLORS.text);
  centerText(ctx, 'Press P to resume · R to restart the floor', 340, 15, COLORS.dim, false);
}

function drawCaught(ctx) {
  overlay(ctx, 0.6);
  centerText(ctx, 'CAUGHT!', 290, 52, '#ff5a52');
  centerText(ctx, 'The guard got a hand on you. The floor resets.', 332, 16, COLORS.text, false);
  centerText(ctx, 'PRESS ENTER TO RETRY THE FLOOR', 384, 19, '#4ade80');
}

function drawFloorClear(ctx, state) {
  overlay(ctx, 0.55);
  centerText(ctx, 'FLOOR CLEAR', 270, 46, '#4ade80');
  centerText(ctx, `Floor score: ${state.lastFloorScore}`, 316, 19, COLORS.text, false);
  if (state.lastGhost) centerText(ctx, 'GHOST BONUS — never fully spotted!', 346, 16, '#f5d76e', false);
  centerText(ctx, `Total score: ${state.score}`, 380, 17, COLORS.text, false);
  centerText(ctx, 'PRESS ENTER FOR THE NEXT FLOOR', 432, 19, '#4ade80');
}

function drawVictory(ctx, state) {
  overlay(ctx, 0.62);
  centerText(ctx, 'VAULT CLEANED OUT', 240, 48, '#f5d76e');
  centerText(ctx, 'You crossed all three floors and vanished into the night.', 282, 16, COLORS.text, false);
  centerText(ctx, `FINAL SCORE: ${state.score}`, 340, 28, COLORS.text);
  const secs = Math.floor(state.totalTime);
  centerText(ctx, `Total time: ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}   ·   Alerts raised: ${state.totalAlerts}`, 376, 15, COLORS.dim, false);
  centerText(ctx, state.totalAlerts === 0 ? 'PERFECT GHOST RUN — nobody ever saw you.' : 'A cleaner run earns the ghost bonus on every floor.', 406, 14, '#f5d76e', false);
  centerText(ctx, 'PRESS ENTER TO PLAY AGAIN', 460, 19, '#4ade80');
}

export function drawScene(ctx, state) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  drawTiles(ctx, state.world);
  drawPatrolRoutes(ctx, state.guards);
  drawVisionCones(ctx, state.world, state.guards);
  drawObjectives(ctx, state, state.time);
  drawCoin(ctx, state);
  for (const guard of state.guards) {
    drawActor(ctx, guard, COLORS.guard, COLORS.guardDark, false);
    drawGuardIndicators(ctx, guard);
  }
  drawActor(ctx, state.player, COLORS.player, COLORS.playerDark, true);
  drawHud(ctx, state);

  if (state.message && state.messageTimer > 0) {
    ctx.fillStyle = 'rgba(5,8,16,0.72)';
    const w = ctx.measureText(state.message).width + 90;
    ctx.fillRect(VIEW_W / 2 - w / 2, VIEW_H - 52, w, 32);
    centerText(ctx, state.message, VIEW_H - 30, 15, '#f5d76e');
  }

  switch (state.screen) {
    case 'title': drawTitle(ctx, state); break;
    case 'paused': drawPause(ctx); break;
    case 'caught': drawCaught(ctx); break;
    case 'floorclear': drawFloorClear(ctx, state); break;
    case 'victory': drawVictory(ctx, state); break;
    default: break;
  }
}
