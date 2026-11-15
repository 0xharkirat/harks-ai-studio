# TinaCMS ads, built in code

A family of music-driven motion-graphics ads for TinaCMS.
Every frame is a pure function of time, rendered by a small deterministic web engine and captured frame by frame.
The music is synthesized from code, so TinaCMS owns it outright.
The idea comes from Fuma Nama's [`fumadocs-mv`](https://github.com/fuma-nama/fumadocs-mv); the engine, scenes and music here are new.

| folder | what |
|---|---|
| `docs/` | the brief, treatment, music spec, scene-by-scene scripts, engine guide and workflow |
| `mv/` | the engine (Vite + TypeScript + DOM), the scenes, the cuts, and the render scripts |
| `music/` | the soundtrack: synth, sequencer, songs and mix (Python); `music/out/` (the rendered cues) is not in git: render it with `src/render.py` |
| `plates/` | a real TinaCMS site and the Playwright capture scripts; `plates/out/` (the captures) is not in git: see `plates/README.md` |
| `assets/` | brand fonts, official logos and llama art from tina.io |
| `out/` | renders (not tracked) |

## Versions

| cut | length | ratio | for |
|---|---|---|---|
| `anthem` | 65 s | 16:9 | all socials, YouTube, the tina.io hero (v2) |
| `thirty` | 30 s | 16:9 | YouTube, LinkedIn |
| `fifteen` | 15 s | 16:9 | pre-roll, LinkedIn |
| `vertical` | 30 s | 9:16 | Shorts, Reels, LinkedIn mobile |
| `dev` | 45 s | 16:9 | developer channels |
| `six` | 6 s | 16:9 | YouTube bumper |

## Make them

```bash
cd music && uv sync && uv run python src/render.py   # the soundtrack (about 30 s)
cd ../mv && pnpm install
node render/all.mjs                                  # render + master every cut into out/deliver
node render/report.mjs                               # out/deliver/index.html
```

Preview a cut live: `cd mv && pnpm dev`, then open `http://localhost:5190/?cut=anthem` (space plays, arrows step beats).
Check a master for one-frame capture glitches: `mv/render/glitchscan.sh out/deliver/<file>.mp4` (designed fast cuts, flashes and irises also show up; look at each flagged time).
The full process is in `docs/workflow.md`.

## Licences

- Code, docs and music: original work made in this repository for TinaCMS. The music uses no samples, loops or AI services. Some sound effects in the anthem are recordings: the scream (CC0, from Freesound) and SSW TV's pop, chat bubble, mouse click and typing (SSW internal assets, not in this repo). See `music/assets/sfx/README.md`.
- Fonts: IBM Plex Sans, Inter and IBM Plex Mono (the files tina.io serves), SIL Open Font License 1.1 (the licence files are in `assets/fonts/`).
- Logos and llama art: TinaCMS brand assets from tina.io.
- Characters (anthem v2): original 3D cartoon art made with Codex image generation for this ad (`assets/characters/`). They show no real person.
- No third-party logos, customer quotes or stock media are used.
