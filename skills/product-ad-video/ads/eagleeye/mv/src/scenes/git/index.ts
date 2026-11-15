// Scene `git` (anthem 32-40 s; thirty 20-24; fifteen 8-10 `flash`; dev 28-36; vertical 4 s).
// The Save button is pressed, the change flies out as a glowing dot and lands on a Git line as a commit.
// More commits drop on the pings, a branch splits and merges back as a pull request, and the world turns
// into the dark developer world with the Git line running right, into the code of the next scene.
import type { SceneDef } from '../../engine/stage';
import { box, css, tf } from '../../engine/dom';
import { clamp, ease, lerp, seg } from '../../engine/anim';
import { Cursor, EditBox, NavyBg, WashBg, pathAt } from '../../ui/kit';
import { C } from '../../brand/tokens';
import { Layer, LIGHT, DARK, bez } from './layer';
import { Dot, DiffCard, PRCard, RepoCard, SaveButton, SAVE_H, SAVE_W } from './parts';
import { labelWidth, makeGeo, makePlan, type GitProps, type Pt } from './plan';
import { FONT } from '../../brand/fonts';

export type { GitProps, CommitSpec, LineSpec, Variant } from './plan';

const git: SceneDef<GitProps> = {
  id: 'git',
  setup({ root, W, H, portrait, entry }, props) {
    const dur = entry.end - entry.start;
    const plan = makePlan(dur, props);
    // 9:16 single rail: scale the timeline up (about 1.4x, k up to 1.5) as far as the longest label still fits the safe width.
    if (portrait && !plan.branch) {
      const w1 = plan.commits.map((c) => labelWidth(c.msg, 1, FONT.ui, true));
      plan.k = Math.min(1.5, (W * 0.88) / (Math.max(...w1) + 75));
    }
    const widths = plan.commits.map((c) => labelWidth(c.msg, plan.k * (portrait && plan.branch ? 0.78 : 1), FONT.ui, portrait));
    const geo = makeGeo(W, H, portrait, plan, widths);
    const cs = geo.camStart;

    // ── light world ──────────────────────────────────────────────────────
    const lightRoot = box({ inset: '0' });
    root.append(lightRoot);
    const bg = new WashBg(lightRoot, W, H, { base: C.bg, strength: 1.0 });
    const world = box({ left: '0', top: '0', width: `${W}px`, height: `${H}px`, transformOrigin: '0 0' });
    lightRoot.append(world);
    // The short variants keep their headline on screen (out of the camera), so it can start while the camera is still pulling back.
    const hud = box({ inset: '0' });
    const lightLayer = new Layer(world, LIGHT, plan, geo, plan.variant === 'full' ? undefined : hud);
    if (plan.variant !== 'full') lightRoot.append(hud);

    const button = new SaveButton(world, geo.buttonC, !plan.saveBox);
    const ebox = new EditBox(world, 'Save', { tagSize: 20 });
    const btnRect = { x: geo.buttonC[0] - SAVE_W / 2, y: geo.buttonC[1] - SAVE_H / 2, w: SAVE_W, h: SAVE_H };

    // The cursor lives in screen space (over the camera), so it keeps its size while the camera pulls back.
    const cursor = props.cursor ? new Cursor(lightRoot, 1.6) : null;

    const diff = plan.diff ? new DiffCard(world, geo.card, plan.file, plan.diffLines, portrait ? 26 : 31) : null;
    const pr = plan.pr ? new PRCard(world, geo.card, plan.prTitle) : null;

    // The dots: one per commit. The first leaves the Save button, the others leave the diff card or drop in.
    const dots: Dot[] = plan.commits.map((c, i) => {
      const to = lightLayer.nodePos(i);
      if (i === 0) {
        return new Dot(world, { from: [geo.buttonC[0] - 30, geo.buttonC[1] + SAVE_H / 2 - 8], to, t0: plan.pressAt + 0.03, t1: c.t, arc: 0.3 });
      }
      if (plan.branch && i === plan.commits.length - 1) {
        const a = geo.P('branch', geo.mergeA), b = geo.P('main', geo.mergeB);
        const k = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.55;
        const c1: Pt = [a[0] + geo.dir[0] * k, a[1] + geo.dir[1] * k], c2: Pt = [b[0] - geo.dir[0] * k, b[1] - geo.dir[1] * k];
        return new Dot(world, { from: a, to: b, t0: c.t - 0.55, t1: c.t, path: (p) => bez(a, c1, c2, b, p), ease: (p) => ease.inQuad(p) * 0.55 + p * 0.45 });
      }
      let from: Pt;
      if (plan.diff) from = [geo.card.x + 70 + (i - 1) * 40, geo.card.y + geo.card.h - 24];
      else if (portrait) from = [to[0] + 360, to[1] - 30]; // from the right, below the previous label
      // Drop in from the right of the headline (which fills the left), never across it.
      else from = [Math.max(to[0] + 130, 1010), to[1] - 300];
      return new Dot(world, { from, to, t0: c.t - 0.38, t1: c.t, arc: 0.28 });
    });

    // ── dark world (revealed by an expanding ring from the merge node) ───
    let darkRoot: HTMLDivElement | null = null;
    let darkWorld: HTMLDivElement | null = null;
    let darkLayer: Layer | null = null;
    let navy: NavyBg | null = null;
    let ring: HTMLDivElement | null = null;
    let ringGlow: HTMLDivElement | null = null;
    let repo: RepoCard | null = null;
    const last = plan.commits.length - 1;
    const wipeC = lightLayer.nodePos(last);
    const R = Math.hypot(Math.max(wipeC[0], W - wipeC[0]), Math.max(wipeC[1], H - wipeC[1])) * 1.08;
    if (plan.darkAt != null) {
      darkRoot = box({ inset: '0' });
      root.append(darkRoot);
      navy = new NavyBg(darkRoot, W, H);
      darkWorld = box({ left: '0', top: '0', width: `${W}px`, height: `${H}px`, transformOrigin: '0 0' });
      darkRoot.append(darkWorld);
      darkLayer = new Layer(darkWorld, DARK, plan, geo);
      if (!portrait) repo = new RepoCard(darkWorld, { x: 1250, y: 300, w: 555, h: 362 });
      ringGlow = box({ left: '0', top: '0', width: '10px', height: '10px', borderRadius: '50%', pointerEvents: 'none' });
      ring = box({ left: '0', top: '0', width: '10px', height: '10px', borderRadius: '50%', pointerEvents: 'none', border: `5px solid ${C.orange}` });
      root.append(ringGlow, ring);
    }

    return {
      update(f) {
        const t = f.lt;
        f.post.vignette = 0.12;
        f.post.grain = 0.05;
        const at = plan.pressAt;

        // ── camera: starts on the Save button, pulls back to the whole stage ──
        const cp = ease.outCubic(seg(t, at + 0.05, plan.variant === 'full' ? plan.camEnd + 0.2 : plan.camEnd));
        const punch = t >= at ? Math.exp(-(t - at) * 11) * 0.03 : 0;
        const s = lerp(cs.s, 1, cp) * (1 + punch);
        const cx = lerp(cs.c[0], W / 2, cp), cy = lerp(cs.c[1], H / 2, cp);
        const camTf = tf({ x: W / 2 - s * cx, y: H / 2 - s * cy, s });
        css(world, { transform: camTf });

        bg.update(t);
        lightLayer.update(t);

        // The cursor glides onto the button's label, clicks on pressAt, rides the pull-back and fades.
        if (cursor) {
          const tip: Pt = [geo.buttonC[0] + 34, geo.buttonC[1] + 10];
          const tx = W / 2 + s * (tip[0] - cx), ty = H / 2 + s * (tip[1] - cy);
          const c0 = Math.max(0.05, at - 0.85);
          const [x, y] = t < at ? pathAt(t, [[c0, tx + 430, ty + 330], [at - 0.1, tx, ty]]) : [tx, ty];
          const a = t < c0 ? 0 : Math.min(1, (t - c0) * 6) * (1 - seg(t, at + 0.35, at + 0.6));
          cursor.update(x, y, t, at, a);
        }

        // The press.
        const exit = seg(t, plan.btnExit[0], plan.btnExit[1], ease.inOutCubic);
        button.update(t, at, exit);
        const eb = seg(t, at + 0.08, at + 0.3);
        ebox.update(btnRect, plan.saveBox && t < at + 0.3 ? 1 - ease.inCubic(eb) : 0, 0, true);

        for (const d of dots) d.update(t);

        // Cards.
        if (diff) {
          // The diff card does not wait for a late headline (the dev cut sets it to 1.0).
          // It never shows before the Save click.
          const inAt = Math.max(plan.pressAt + 0.3, Math.min(plan.lines[0]?.t ?? 1.0, 0.55));
          const third = plan.commits[Math.min(2, last)];
          diff.update(t, inAt, third.t, inAt + 0.5);
        }
        if (pr) pr.update(t, plan.prOpen, plan.prChecks, plan.prMerge, plan.prMerge + 0.35);

        // ── the turn into the dark developer world ──
        if (darkRoot && darkLayer && darkWorld && navy && ring && ringGlow && plan.darkAt != null) {
          const dp = seg(t, plan.darkAt, plan.darkAt + 0.85, ease.outCubic);
          const on = t >= plan.darkAt;
          const done = dp >= 1;
          css(darkRoot, { display: on ? '' : 'none', clipPath: done ? 'none' : `circle(${(dp * R).toFixed(1)}px at ${wipeC[0]}px ${wipeC[1]}px)` });
          css(lightRoot, { display: done ? 'none' : '' });
          css(darkWorld, { transform: camTf });
          if (on) {
            navy.update(t);
            darkLayer.update(t);
            repo?.update(t, plan.darkAt + 0.3, Math.max(plan.darkAt + 1.0, plan.dur - 0.9), plan.dur + 1);
            f.post.vignette = lerp(0.12, 0.4, ease.outCubic(seg(dp, 0.2, 1)));
          }
          const ringOn = on && !done;
          const rd = dp * R * 2 + 10;
          css(ring, { display: ringOn ? '' : 'none', width: rd, height: rd, transform: tf({ x: wipeC[0] - rd / 2, y: wipeC[1] - rd / 2 }), opacity: 1 - ease.inCubic(seg(dp, 0.55, 1)), borderWidth: `${lerp(7, 2, dp).toFixed(1)}px` });
          css(ringGlow, { display: ringOn ? '' : 'none', width: rd, height: rd, transform: tf({ x: wipeC[0] - rd / 2, y: wipeC[1] - rd / 2 }), boxShadow: `0 0 60px 10px ${C.orange}77, inset 0 0 60px 10px ${C.orange}55`, opacity: 1 - ease.inCubic(seg(dp, 0.5, 1)) });
        }
        void clamp;
      },
    };
  },
};
export default git;
