// Scene `devs` (anthem 40-48 s; dev cut parts `schema` 6 s, `graphql` 8 s, `stack` 4 s).
// Code becomes UI: `tina/config.ts` types and each field line emits a TinaCMS sidebar field; a GraphQL
// query returns typed JSON; framework names land on the beats. In the anthem it ends with a hard stop.
import type { SceneDef } from '../../engine/stage';
import { box, css, tf } from '../../engine/dom';
import { ease, seg } from '../../engine/anim';
import { NavyBg } from '../../ui/kit';
import { Headline } from '../../ui/text';
import { buildSchema, type SchemaSection } from './schema';
import { buildGql, type GqlSection } from './gql';
import { buildStack, type StackName, type StackSection } from './stack';
import { DARK, Layer } from '../git/layer';
import { FULL_RAIL, makeGeo, makePlan } from '../git/plan';
import { RepoCard } from '../git/parts';

export interface DevsProps {
  /** Which part of the developer world this entry shows (default `all`). */
  part?: 'all' | 'schema' | 'graphql' | 'stack';
  /** `all`: local time of the hard stop to black (default 7.5). */
  stop?: number;
  /** Section boundaries for `all` (local seconds): schema 0-3.5, graphql 3.5-5.5, stack 5.5-stop. */
  cuts?: [number, number];
  /** The seven times a code line emits its field (local to the schema section). */
  fieldTimes?: number[];
  /** The words of the "Works with" line and the times they land (local to the stack section). */
  names?: StackName[];
  /** `stack`: short centred lines that land one per beat instead of the names row (local times). */
  lines?: StackName[];
  /** `stack`: the small label above (default "WORKS WITH" for the names row, none for `lines`). */
  label?: string;
  /** `stack`: when "Free and open source." lands (local to the stack section; false for none). */
  oss?: number | false;
  /** Start from the last frame of the dark `git` scene (its Git line opens into the code panel). Default: `all` only. */
  fromGit?: boolean;
  /** The words (`*emphasis*`). */
  words?: { schema?: string; graphql?: string; typed?: string; oss?: string };
  /** The headline value shown in the form and the JSON (default depends on the cut). */
  headlineValue?: string;
}

const VW = 1920;
const VH = 1080;

const devs: SceneDef<DevsProps> = {
  id: 'devs',
  setup({ root, W, H, portrait, entry }, props) {
    const dur = entry.end - entry.start;
    const part = props.part ?? 'all';
    const stop = props.stop ?? 7.5;
    const cuts = props.cuts ?? [3.5, 5.5];
    const fromGit = props.fromGit ?? part === 'all';
    const headlineValue = props.headlineValue ?? (part === 'all' ? 'Edit your site. Visually.' : 'Notes your whole team actually reads.');

    // Section windows (local scene time).
    const win = {
      schema: part === 'all' ? [0, cuts[0]] : part === 'schema' ? [0, dur] : null,
      graphql: part === 'all' ? [cuts[0], cuts[1]] : part === 'graphql' ? [0, dur] : null,
      stack: part === 'all' ? [cuts[1], stop] : part === 'stack' ? [0, dur] : null,
    } as Record<'schema' | 'graphql' | 'stack', [number, number] | null>;

    const bg = new NavyBg(root, W, H);

    // All content is laid out on a 1920 x 1080 canvas; in 9:16 it is scaled to the width, inside the safe band.
    const wrap = box({ left: '0', top: '0', width: `${VW}px`, height: `${VH}px`, transformOrigin: '0 0' });
    const k = portrait ? W / VW : 1;
    css(wrap, { transform: portrait ? tf({ x: 0, y: H * 0.45 - (VH / 2) * k, s: k }) : 'none' });
    root.append(wrap);

    const words = props.words ?? {};

    // ── handoff: the last frame of the dark git scene, then it opens into the code ──
    let hand: { layer: Layer; repo: RepoCard; repoBox: HTMLDivElement; head: Headline; lineA: HTMLDivElement; lineB: HTMLDivElement } | null = null;
    if (fromGit) {
      const gp = makePlan(8, { variant: 'full', lines: [] });
      const gg = makeGeo(VW, VH, false, gp, []);
      const layer = new Layer(wrap, DARK, gp, gg);
      const repoBox = box({ inset: '0' });
      wrap.append(repoBox);
      const repo = new RepoCard(repoBox, { x: 1250, y: 300, w: 555, h: 362 });
      const lineA = box({ left: '-60px', top: `${FULL_RAIL.y - 2.5}px`, width: `${FULL_RAIL.mergeX + 60}px`, height: '5px', borderRadius: '3px', background: 'rgba(169,164,204,0.38)' });
      const lineB = box({ left: `${FULL_RAIL.mergeX}px`, top: `${FULL_RAIL.y - 2.5}px`, width: `${VW - FULL_RAIL.mergeX + 60}px`, height: '5px', borderRadius: '3px', background: '#F4F1FF' });
      wrap.append(lineA, lineB);
      const head = new Headline(wrap, { text: 'Your content\nstays in *your repo.*', size: 104, color: '#fff', lineHeight: 1.04 });
      head.place({ left: `${VW * 0.06}px`, top: '86px' });
      hand = { layer, repo, repoBox, head, lineA, lineB };
    }

    const mkHead = (text: string) => {
      const h = new Headline(wrap, { text, size: 104, color: '#fff', lineHeight: 1.02 });
      h.place({ left: `${VW * 0.06}px`, top: '86px' });
      return h;
    };

    let schema: SchemaSection | null = null;
    let headSchema: Headline | null = null;
    const headIn = fromGit ? 0.4 : 0.1;
    if (win.schema) {
      const L = win.schema[1] - win.schema[0];
      const emit = props.fieldTimes ?? (L <= 4.5 ? [0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5] : [0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 4.0]);
      schema = buildSchema(wrap, VW, VH, { code: { x: 115, y: 235, w: 960, h: 780 }, form: { x: 1165, y: 235, w: 640, h: 780 } }, emit, {
        tour: L > 4.5,
        headline: headlineValue,
        unfold: fromGit ? { y: FULL_RAIL.y, t0: 0.12 } : undefined,
      });
      headSchema = mkHead(words.schema ?? 'Defined in *TypeScript.*');
    }

    let gql: GqlSection | null = null;
    if (win.graphql) {
      const L = win.graphql[1] - win.graphql[0];
      gql = buildGql(wrap, VW, VH, L, headlineValue, { words: { graphql: words.graphql, typed: words.typed } });
    }

    let stack: StackSection | null = null;
    if (win.stack) {
      // One line on the beats: Next.js, Astro and Hugo (the frameworks tina.io names), complete 1.5 s before the stop.
      const names: StackName[] =
        props.names ??
        (part === 'all'
          ? [{ text: 'Next.js', t: 0 }, { text: 'Astro', t: 0.25 }, { text: 'Hugo', t: 0.5 }]
          : [{ text: 'Next.js', t: 0 }, { text: 'Astro', t: 0.5 }, { text: 'Hugo', t: 1.0 }]);
      // The licence is about to change, so the line names no licence: it stays free and open source.
      // Portrait lines sit on the stage at full size; the 1920 canvas, scaled to the width, made them small.
      const ownStage = portrait && !!props.lines;
      stack = buildStack(ownStage ? root : wrap, ownStage ? W : VW, ownStage ? H : VH, names, props.oss ?? (part === 'stack' && !props.lines ? 2.0 : false), words.oss ?? 'Free and\n*open source.*', props.label ?? (props.lines ? '' : 'WORKS WITH'), props.lines);
    }

    return {
      update(f) {
        const t = f.lt;
        const stopped = part === 'all' && t >= stop;
        f.post.vignette = stopped ? 0 : 0.35;
        f.post.grain = 0.06;
        root.style.background = stopped ? '#000' : '';
        css(bg.root, { display: stopped ? 'none' : '' });
        css(wrap, { display: stopped ? 'none' : '' });
        if (stopped) return;
        bg.update(t);

        if (hand) {
          const on = t < 1.2;
          css(hand.layer.root, { display: on ? '' : 'none', opacity: 1 - ease.inCubic(seg(t, 0.04, 0.34)), transform: tf({ y: seg(t, 0.04, 0.34) * 14 }) });
          css(hand.repoBox, { display: on ? '' : 'none', opacity: 1 - ease.inCubic(seg(t, 0.04, 0.3)), transform: tf({ x: seg(t, 0.04, 0.3) * 40 }) });
          css(hand.head.root, { display: on ? '' : 'none' });
          if (on) {
            hand.layer.update(7.99);
            hand.repo.update(99, 0, 0, 1e9);
            hand.head.update(t, { in: -5, out: 0.02, stagger: 0.05, outDur: 0.22 });
          }
          const fade = 1 - ease.inOutCubic(seg(t, 0.55, 1.0));
          css(hand.lineA, { display: on ? '' : 'none', opacity: fade });
          css(hand.lineB, { display: on ? '' : 'none', opacity: fade });
        }

        if (win.schema && schema && headSchema) {
          const [a, b] = win.schema;
          const on = t >= a && t < b;
          css(schema.root, { display: on ? '' : 'none' });
          css(headSchema.root, { display: on ? '' : 'none' });
          if (on) {
            schema.update(t - a, b - a);
            headSchema.update(t - a, { in: headIn, stagger: 0.07, dur: 0.6 });
          }
        }
        if (win.graphql && gql) {
          const [a, b] = win.graphql;
          const on = t >= a && t < b;
          css(gql.root, { display: on ? '' : 'none' });
          if (on) gql.update(t - a, b - a);
        }
        if (win.stack && stack) {
          const [a, b] = win.stack;
          const on = t >= a && t < b;
          css(stack.root, { display: on ? '' : 'none' });
          if (on) stack.update(t - a, f);
        }
      },
    };
  },
};
export default devs;
