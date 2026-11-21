// Night Vault hand-in program (Node 22, standard library only).
// Copies this repository's game/ and screenshots/ folders into the output
// directory (/output in the grader, MAKEFUN_OUTPUT_DIR locally) and writes
// dossier.json there with the vendored make.fun library. The output is
// deterministic: no timestamps, no randomness, so two runs write identical
// bytes.
//
// Local use:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Play locally with: node serve.ts  (then open http://localhost:8080)

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
// Start from a clean slate so a reused local output folder can never leak
// stale files into the dossier (the grader's /output is fresh anyway).
rmSync(join(outputDir, 'game'), { recursive: true, force: true });
rmSync(join(outputDir, 'screenshots'), { recursive: true, force: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });

const shotsDir = join(outputDir, 'screenshots');
mkdirSync(shotsDir, { recursive: true });
const sourceShots = join(repoRoot, 'screenshots');
if (existsSync(sourceShots)) {
  cpSync(sourceShots, shotsDir, { recursive: true });
}

// Caps mirror the scorer's limits: at most 4 screenshots of 256 KiB each,
// at most 993 entries and 48 MiB under game/, paths up to 1000 bytes.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);
