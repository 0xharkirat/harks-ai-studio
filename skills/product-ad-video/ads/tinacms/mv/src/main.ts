import { Stage } from './engine/stage';
import { FPS, BEAT, BAR, gridPos } from './engine/time';
import { cuts } from './cuts';
import { loadBrandFonts } from './brand/fonts';

const params = new URLSearchParams(location.search);
const mode = params.get('mode') ?? 'preview';
const cutId = params.get('cut') ?? 'anthem';
if (mode === 'render') document.body.classList.add('render');

const stageEl = document.getElementById('stage') as HTMLDivElement;
const hud = document.getElementById('hud') as HTMLDivElement;
const scrub = document.getElementById('scrub') as HTMLDivElement;

let stage: Stage;
const ready = (async () => {
  const load = cuts[cutId];
  if (!load) throw new Error(`unknown cut ${cutId}; known: ${Object.keys(cuts).join(', ')}`);
  const cut = (await load()).default;
  await loadBrandFonts();
  stage = new Stage(stageEl, cut);
  await stage.setup();
  fit();
  return stage;
})();

function fit() {
  if (mode === 'render' || !stage) return;
  const s = Math.min(innerWidth / stage.cut.W, (innerHeight - 30) / stage.cut.H);
  stageEl.style.transform = `scale(${s})`;
  stageEl.parentElement!.style.placeItems = 'start';
  stageEl.style.margin = `${(innerHeight - 30 - stage.cut.H * s) / 2}px 0 0 ${(innerWidth - stage.cut.W * s) / 2}px`;
}
addEventListener('resize', fit);

async function seek(frame: number) {
  await ready;
  await stage.seek(frame);
  // Let the compositor pick up the DOM changes before a capture (two frames: heavy layers can lag one).
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(null))));
}

(window as any).__mv = {
  ready: ready.then(() => true),
  seek,
  get totalFrames() { return stage?.totalFrames ?? 0; },
  get W() { return stage?.cut.W; },
  get H() { return stage?.cut.H; },
  get music() { return stage?.cut.music; },
  /** Real seconds of output. */
  get duration() { return stage ? stage.cut.duration / stage.speed : undefined; },
  fps: FPS,
};

// ── interactive preview ───────────────────────────────────────────────────
if (mode === 'preview') {
  ready.then((st) => {
    const audio = new window.Audio(st.audio.url);
    let playing = false;
    let t = Number(params.get('t') ?? 0);
    let busy = false;
    let last = performance.now();
    const draw = async () => {
      if (busy) return;
      busy = true;
      await st.seek(Math.round(t * FPS));
      const g = gridPos(t * st.speed);
      const live = st.live.filter((l) => l.root.style.display !== 'none').map((l) => l.entry.scene.id).join(' + ');
      hud.textContent = `${st.cut.id}  ${t.toFixed(2)}s / ${(st.cut.duration / st.speed).toFixed(1)}s  bar ${g.bar}.${g.beat}  [${live}]  ${playing ? '▶' : '⏸'}   space play · ←/→ beat · ⇧←/→ bar · , . frame`;
      (scrub.firstElementChild as HTMLDivElement).style.width = `${((t * st.speed) / st.cut.duration) * 100}%`;
      busy = false;
    };
    const loop = async () => {
      const now = performance.now();
      if (playing) {
        t = !audio.paused && audio.duration ? audio.currentTime : t + (now - last) / 1000;
        if (t >= st.cut.duration / st.speed) { playing = false; audio.pause(); t = st.cut.duration / st.speed - 1 / FPS; }
      }
      last = now;
      await draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    const jump = (nt: number) => {
      t = Math.max(0, Math.min(st.cut.duration / st.speed - 1 / FPS, nt));
      if (playing) audio.currentTime = t;
    };
    addEventListener('keydown', (ev) => {
      if (ev.code === 'Space') {
        playing = !playing;
        if (playing) { audio.currentTime = t; audio.play().catch(() => {}); } else audio.pause();
        ev.preventDefault();
      } else if (ev.code === 'ArrowRight') jump(t + (ev.shiftKey ? BAR : BEAT) / st.speed);
      else if (ev.code === 'ArrowLeft') jump(t - (ev.shiftKey ? BAR : BEAT) / st.speed);
      else if (ev.key === '.') jump(t + 1 / FPS);
      else if (ev.key === ',') jump(t - 1 / FPS);
    });
    scrub.addEventListener('click', (ev) => jump((ev.clientX / innerWidth) * (st.cut.duration / st.speed)));
  });
}
