// Night Vault — shared tuning constants for every module.
// One place to balance speeds, sight ranges and detection rates.

export const TILE = 32;              // pixels per map tile
export const COLS = 30;              // map width in tiles
export const ROWS = 18;              // map height in tiles
export const HUD_H = 64;             // HUD bar height in pixels
export const VIEW_W = COLS * TILE;   // 960
export const VIEW_H = ROWS * TILE + HUD_H; // 640

export const PLAYER_SPEED = 158;     // px/s walking
export const PLAYER_SNEAK = 82;      // px/s while sneaking (Shift)
export const PLAYER_R = 11;          // player collision radius

export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 138;
export const GUARD_INVESTIGATE_SPEED = 96;
export const GUARD_R = 11;
export const GUARD_VIEW_RANGE = 196; // vision cone length in px
export const GUARD_VIEW_FOV = 1.22;  // vision cone width in radians (~70 deg)
export const GUARD_TURN_RATE = 3.4;  // rad/s the guard can rotate

export const DETECT_FILL = 1.05;     // meter gained per second at point blank
export const DETECT_DECAY = 0.34;    // meter lost per second while unseen
export const SUSPICIOUS_AT = 0.42;   // meter level that makes a guard stare
export const LOSE_TRACK_AFTER = 2.6; // seconds without sight before giving up
export const CATCH_DIST = 19;        // px: a chasing guard this close catches you

export const COIN_RANGE = 230;       // max throw distance in px
export const COIN_HEAR_RADIUS = 210; // guards this close investigate the coin
export const COIN_COOLDOWN = 3.0;    // seconds between throws
export const COIN_FLIGHT = 0.45;     // seconds the coin is in the air

export const SCORE_FLOOR_BASE = 800;
export const SCORE_INTEL = 200;
export const SCORE_GHOST_BONUS = 400;
export const SCORE_ALERT_PENALTY = 150;
export const SCORE_TIME_PENALTY = 3; // points per second on a floor
