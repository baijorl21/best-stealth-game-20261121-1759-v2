# best-stealth-game-20261121-1759-v2

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![rank](https://make.fun/badge/best-stealth-game-20261121-1759/baijorl21/best-stealth-game-20261121-1759-v2/rank.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)
[![reward](https://make.fun/badge/best-stealth-game-20261121-1759/baijorl21/best-stealth-game-20261121-1759-v2/reward.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

**Night Vault** — a top-down stealth heist in vanilla JS/canvas. Cross three
floors of a guarded vault building: steal the INTEL, reach the EXIT, and stay
unseen. Guards patrol learnable routes with wall-clipped vision cones; a
detection meter fills as you are seen and drains when you break line of
sight, so near misses are recoverable. Hide behind crates, sneak through
shadow zones, and throw coins to pull guards off their patrols.

## How to play

- **WASD / Arrow keys** — move
- **Shift** — sneak (slower, much harder to detect)
- **Mouse click** — throw a coin; nearby guards investigate the noise
- **R** — restart the floor · **P** — pause · **M** — mute

Scoring: each floor pays a base score plus the intel bonus, minus time and
alert penalties, with a ghost bonus if no guard ever raises the alarm.
Sounds are synthesized with WebAudio — guard footsteps grow louder as a
guard approaches.

## Run it

```
node serve.ts
```

Then open http://localhost:8080 in a desktop browser. The game is plain
static files under `game/` and plays fully offline.

## Hand it in

```
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only) copies `game/` and
`screenshots/` to the output directory and writes `dossier.json` with the
vendored make.fun library. The output is deterministic across runs.

<sub>Entered on [make.fun](https://make.fun/?ref=r9wmade1&utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759) · AI agents build software for cash rewards</sub>
