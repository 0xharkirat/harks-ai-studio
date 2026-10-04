import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {loadFont as loadInter} from '@remotion/google-fonts/Inter';
import {loadFont as loadMono} from '@remotion/google-fonts/JetBrainsMono';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {toCues} from './captions';
import config from './config.json'; // copy of voice.json, written by new-video.sh

export const sans = loadInter('normal', {weights: ['400', '500', '600', '700', '800'], subsets: ['latin']}).fontFamily;
export const mono = loadMono('normal', {weights: ['400', '600'], subsets: ['latin']}).fontFamily;
// SSW TV lower thirds use a Helvetica-style bold.
export const ssw = '"Helvetica Neue", Helvetica, Arial, sans-serif';

export const c = {
  bg: '#121212',
  panel: '#1C1C1C',
  panel2: '#242424',
  line: '#2E2E2E',
  text: '#F4F4F4',
  muted: '#9C9C9C',
  red: '#CC4141',
  redSoft: 'rgba(204,65,65,0.16)',
  green: '#3FB950',
  amber: '#E3A33B',
};

export const sfx = {
  type: {src: 'sfx/typewriter_loop.wav', volume: 0.32},
  click: {src: 'sfx/mouse_click.wav', volume: 0.45},
};

export type Line = {say: string; start: number; end: number};

export const useIn = (at: number, damping = 18) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return spring({frame: frame - at, fps, config: {damping, mass: 0.6}});
};

export const Appear: React.FC<{at: number; y?: number; x?: number; children: React.ReactNode; style?: React.CSSProperties}> = ({
  at,
  y = 24,
  x = 0,
  children,
  style,
}) => {
  const p = useIn(at);
  return <div style={{opacity: p, transform: `translate(${(1 - p) * x}px, ${(1 - p) * y}px)`, ...style}}>{children}</div>;
};

/** Visible only between two scene-local frames, with short fades. */
export const Between: React.FC<{from: number; to?: number; children: React.ReactNode}> = ({from, to = 1e9, children}) => {
  const f = useCurrentFrame();
  const o = interpolate(f, [from, from + 8, to - 6, to], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (o === 0) return null;
  return <AbsoluteFill style={{opacity: o}}>{children}</AbsoluteFill>;
};

export const Backdrop: React.FC = () => (
  <AbsoluteFill style={{background: `radial-gradient(1200px 700px at 20% 0%, #1E1E1E 0%, ${c.bg} 60%)`}}>
    <AbsoluteFill
      style={{
        backgroundImage: `linear-gradient(${c.line}55 1px, transparent 1px), linear-gradient(90deg, ${c.line}55 1px, transparent 1px)`,
        backgroundSize: '64px 64px',
        maskImage: 'radial-gradient(900px 600px at 30% 20%, black, transparent)',
      }}
    />
  </AbsoluteFill>
);

export const Header: React.FC<{tag: string; title: string}> = ({tag, title}) => {
  const p = useIn(0);
  return (
    <div style={{position: 'absolute', left: 96, top: 64, display: 'flex', alignItems: 'center', gap: 20, opacity: p, transform: `translateX(${(1 - p) * -40}px)`}}>
      <div style={{background: c.red, color: 'white', fontFamily: ssw, fontWeight: 800, fontSize: 22, letterSpacing: 2, padding: '8px 16px', textTransform: 'uppercase'}}>
        {tag}
      </div>
      <div style={{fontFamily: sans, fontWeight: 700, fontSize: 50, color: c.text, letterSpacing: -1}}>{title}</div>
    </div>
  );
};

/** The SSW TV bar: white box flush left, red strip underneath, red slanted edge on the right. */
const SswBar: React.FC<{at: number; children: React.ReactNode; padY?: number}> = ({at, children, padY = 14}) => {
  const p = useIn(at, 20);
  const reveal = interpolate(p, [0, 1], [100, 0]);
  return (
    <div style={{position: 'relative', display: 'inline-block', clipPath: `inset(0 ${reveal}% 0 0)`}}>
      <div style={{background: 'white', padding: `${padY}px 44px ${padY}px 96px`, position: 'relative'}}>{children}</div>
      <div style={{height: 9, background: c.red}} />
      <div style={{position: 'absolute', top: 0, bottom: 0, right: -14, width: 14, background: c.red, transform: 'skewX(-12deg)', transformOrigin: 'bottom'}} />
    </div>
  );
};

export const LowerThird: React.FC<{at: number; name: string; title: string; style?: React.CSSProperties}> = ({at, name, title, style}) => (
  <div style={{position: 'absolute', left: 0, ...style}}>
    <SswBar at={at} padY={16}>
      <div style={{fontFamily: ssw, fontWeight: 800, fontSize: 48, color: '#111', letterSpacing: 1, lineHeight: 1.1, textTransform: 'uppercase'}}>{name}</div>
      <div style={{fontFamily: ssw, fontWeight: 400, fontSize: 32, color: '#222', marginTop: 4}}>{title}</div>
    </SswBar>
  </div>
);

/** "✅ Good example - ...", "❌ Bad example - ..." and "LEARN MORE link" tags. */
export const SswTag: React.FC<{at: number; lead?: string; text: string; style?: React.CSSProperties}> = ({at, lead, text, style}) => (
  <div style={{position: 'absolute', left: 0, ...style}}>
    <SswBar at={at} padY={12}>
      <div style={{fontFamily: ssw, fontWeight: 700, fontSize: 32, color: '#111', whiteSpace: 'nowrap'}}>
        {lead && <span style={{fontWeight: 800, marginRight: 14}}>{lead}</span>}
        {text}
      </div>
    </SswBar>
  </div>
);

export const Chip: React.FC<{at: number; children: React.ReactNode; tone?: 'green' | 'red' | 'neutral'; style?: React.CSSProperties}> = ({
  at,
  children,
  tone = 'neutral',
  style,
}) => {
  const p = useIn(at);
  const border = tone === 'green' ? c.green : tone === 'red' ? c.red : c.line;
  const bg = tone === 'green' ? 'rgba(63,185,80,0.12)' : tone === 'red' ? c.redSoft : c.panel2;
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 12,
        border: `2px solid ${border}`,
        background: bg,
        color: c.text,
        fontFamily: sans,
        fontWeight: 600,
        fontSize: 30,
        padding: '12px 22px',
        borderRadius: 12,
        opacity: p,
        transform: `scale(${0.9 + 0.1 * p})`,
        ...style,
      }}
    >
      {children}
    </div>
  );
};

export type TermLine = {text: string; at: number; kind?: 'cmd' | 'prompt' | 'out' | 'ok' | 'bad' | 'dim' | 'json' | 'claude'};
const CPS = 1.6; // typed characters per frame

/** Terminal window. Commands and prompts type out with typewriter sound, output fades in. */
export const Terminal: React.FC<{lines: TermLine[]; title?: string; width?: number; at?: number; fontSize?: number; style?: React.CSSProperties}> = ({
  lines,
  title = 'Claude Code',
  width = 1300,
  at = 0,
  fontSize = 25,
  style,
}) => {
  const frame = useCurrentFrame();
  const p = useIn(at);
  const color = (k?: TermLine['kind']) =>
    k === 'ok' ? c.green : k === 'bad' ? '#FF7B72' : k === 'dim' ? c.muted : k === 'json' ? '#79C0FF' : k === 'claude' ? '#E8A07A' : c.text;
  return (
    <div
      style={{
        width,
        background: '#0D0D0D',
        border: `1px solid ${c.line}`,
        borderRadius: 16,
        boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        opacity: p,
        transform: `translateY(${(1 - p) * 30}px)`,
        ...style,
      }}
    >
      <div style={{height: 44, background: '#1A1A1A', display: 'flex', alignItems: 'center', padding: '0 18px', gap: 10}}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((col) => (
          <div key={col} style={{width: 14, height: 14, borderRadius: 7, background: col}} />
        ))}
        <div style={{flex: 1, textAlign: 'center', color: c.muted, fontFamily: sans, fontSize: 18, marginRight: 60}}>{title}</div>
      </div>
      <div style={{padding: '22px 28px', fontFamily: mono, fontSize, lineHeight: 1.55}}>
        {lines.map((l, i) => {
          const typed = l.kind === 'cmd' || l.kind === 'prompt';
          const sound = typed ? (
            <Sequence key={`s${i}`} from={l.at} durationInFrames={Math.ceil(l.text.length / CPS)} layout="none">
              <Audio src={staticFile(sfx.type.src)} volume={sfx.type.volume} loop />
            </Sequence>
          ) : null;
          if (frame < l.at) return sound;
          if (typed) {
            const chars = Math.floor((frame - l.at) * CPS);
            const typing = chars < l.text.length;
            return (
              <React.Fragment key={i}>
                {sound}
                <div style={{color: c.text, whiteSpace: 'pre-wrap', background: l.kind === 'prompt' ? '#1B1B1B' : undefined, borderRadius: 8, padding: l.kind === 'prompt' ? '6px 10px' : 0, margin: l.kind === 'prompt' ? '6px 0' : 0}}>
                  <span style={{color: c.red}}>{l.kind === 'prompt' ? '> ' : '❯ '}</span>
                  {l.text.slice(0, chars)}
                  {typing && <span style={{background: c.text}}>▌</span>}
                </div>
              </React.Fragment>
            );
          }
          const o = interpolate(frame - l.at, [0, 8], [0, 1], {extrapolateRight: 'clamp'});
          return (
            <div key={i} style={{color: color(l.kind), opacity: o, whiteSpace: 'pre-wrap'}}>
              {l.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export type Box = [number, number, number, number];
export type ShotStep = {at: number; box: Box; click?: boolean; zoom?: number};

export const Cursor: React.FC<{x: number; y: number; press: number}> = ({x, y, press}) => (
  <svg width={36} height={44} viewBox="0 0 24 30" style={{position: 'absolute', left: x - 3, top: y - 2, transform: `scale(${1 - press * 0.15})`, transformOrigin: '3px 2px', filter: 'drop-shadow(0 3px 4px rgba(0,0,0,0.45))'}}>
    <path d="M2 1 L2 23 L8 17.5 L12 27 L16 25.3 L12.2 16 L20 16 Z" fill="white" stroke="black" strokeWidth={1.6} strokeLinejoin="round" />
  </svg>
);

/**
 * Real screenshot in a browser frame. The cursor glides to each step's box,
 * clicks with sound when asked, and the box gets a red highlight.
 */
export const BrowserShot: React.FC<{
  src: string;
  url: string;
  steps: ShotStep[];
  blur?: Box[];
  at?: number;
  width?: number;
  shot?: [number, number];
  style?: React.CSSProperties;
}> = ({src, url, steps, blur = [], at = 0, width = 1300, shot = [1600, 900], style}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = useIn(at);
  const k = width / shot[0];
  const height = shot[1] * k;
  const current = [...steps].reverse().find((s) => frame >= s.at);
  const idx = current ? steps.indexOf(current) : -1;
  const center = (b: Box): [number, number] => [(b[0] + b[2] / 2) * k, (b[1] + b[3] / 2) * k];
  const start: [number, number] = [width * 0.62, height * 0.78];
  let cx = start[0];
  let cy = start[1];
  let press = 0;
  if (idx >= 0) {
    const from = idx > 0 ? center(steps[idx - 1].box) : start;
    const to = center(steps[idx].box);
    const m = spring({frame: frame - steps[idx].at, fps, config: {damping: 22, mass: 0.7}});
    cx = from[0] + (to[0] - from[0]) * m;
    cy = from[1] + (to[1] - from[1]) * m;
    const clickAt = steps[idx].at + 18;
    if (steps[idx].click) press = interpolate(frame, [clickAt - 2, clickAt, clickAt + 5], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  }
  const zoom = current?.zoom ?? 1;
  const z = idx >= 0 ? interpolate(spring({frame: frame - current!.at, fps, config: {damping: 24}}), [0, 1], [idx > 0 ? steps[idx - 1].zoom ?? 1 : 1, zoom]) : 1;
  const focus = idx >= 0 ? center(current!.box) : [width / 2, height / 2];
  return (
    <div style={{width, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, ...style}}>
      <div style={{height: 46, background: '#2A2A2A', borderRadius: '14px 14px 0 0', display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px'}}>
        {['#FF5F57', '#FEBC2E', '#28C840'].map((col) => (
          <div key={col} style={{width: 13, height: 13, borderRadius: 7, background: col}} />
        ))}
        <div style={{marginLeft: 24, flex: 1, background: '#1B1B1B', color: '#D0D0D0', fontFamily: sans, fontSize: 20, padding: '6px 16px', borderRadius: 8}}>🔒 {url}</div>
      </div>
      <div style={{width, height, position: 'relative', overflow: 'hidden', borderRadius: '0 0 14px 14px', boxShadow: '0 30px 80px rgba(0,0,0,0.5)'}}>
        <div style={{position: 'absolute', inset: 0, transform: `scale(${z})`, transformOrigin: `${focus[0]}px ${focus[1]}px`}}>
          <Img src={staticFile(src)} style={{width, height, display: 'block'}} />
          {blur.map((b, i) => (
            <div key={i} style={{position: 'absolute', left: b[0] * k, top: b[1] * k, width: b[2] * k, height: b[3] * k, backdropFilter: 'blur(9px)', background: 'rgba(255,255,255,0.35)', borderRadius: 4}} />
          ))}
          {idx >= 0 && (
            <div
              style={{
                position: 'absolute',
                left: current!.box[0] * k - 8,
                top: current!.box[1] * k - 8,
                width: current!.box[2] * k + 16,
                height: current!.box[3] * k + 16,
                border: `4px solid ${c.red}`,
                borderRadius: 12,
                boxShadow: `0 0 0 9999px rgba(0,0,0,${0.28 * spring({frame: frame - current!.at - 10, fps})})`,
                opacity: spring({frame: frame - current!.at - 10, fps}),
              }}
            />
          )}
          {press > 0 && (
            <div style={{position: 'absolute', left: cx - 30, top: cy - 30, width: 60, height: 60, borderRadius: 30, border: `4px solid ${c.red}`, opacity: press, transform: `scale(${1.6 - press * 0.6})`}} />
          )}
          <Cursor x={cx} y={cy} press={press} />
        </div>
        {steps.map((s, i) =>
          s.click ? (
            <Sequence key={i} from={s.at + 16} durationInFrames={8} layout="none">
              <Audio src={staticFile(sfx.click.src)} volume={sfx.click.volume} />
            </Sequence>
          ) : null,
        )}
      </div>
    </div>
  );
};

/** Bottom-right camera box, like SSW TV, with the AI disclosure and a voice meter. */
export const PiP: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const audio = useAudioData(staticFile('narration.wav'));
  let level = 0;
  if (audio) {
    const v = visualizeAudio({fps, frame, audioData: audio, numberOfSamples: 32});
    level = Math.min(1, (v.slice(0, 12).reduce((a, b) => a + b, 0) / 12) * 6);
  }
  const bars = [0.6, 1, 0.75, 0.9, 0.5];
  return (
    <div style={{position: 'absolute', right: 48, bottom: 48, width: 320, height: 320, overflow: 'hidden', boxShadow: '0 20px 50px rgba(0,0,0,0.55)'}}>
      <Img src={staticFile('portrait.jpg')} style={{position: 'absolute', width: 940, left: -282, top: -22}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: 8, background: c.red}} />
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 8, padding: '28px 14px 10px', background: 'linear-gradient(transparent, rgba(0,0,0,0.8))', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between'}}>
        <div style={{fontFamily: ssw, fontWeight: 800, color: 'white', fontSize: 24}}>{config.speaker.ai_name.toUpperCase()}</div>
        <div style={{display: 'flex', gap: 4, alignItems: 'flex-end', height: 26}}>
          {bars.map((b, i) => (
            <div key={i} style={{width: 6, borderRadius: 3, background: c.red, height: 4 + 22 * b * level}} />
          ))}
        </div>
      </div>
      <div style={{position: 'absolute', top: 10, left: 10, background: c.red, color: 'white', fontFamily: ssw, fontWeight: 800, fontSize: 15, letterSpacing: 1.5, padding: '5px 10px'}}>
        AI VOICE
      </div>
    </div>
  );
};

/** Burned-in subtitles, cut at natural phrase breaks (see captions.ts for the rules). */
export const Captions: React.FC<{lines: Line[]}> = ({lines}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cues = React.useMemo(() => toCues(lines, fps), [lines, fps]);
  const cue = cues.find((q) => frame >= q.start && frame < q.end);
  if (!cue) return null;
  return (
    <div style={{position: 'absolute', left: 0, right: 0, bottom: 40, display: 'flex', justifyContent: 'center', pointerEvents: 'none'}}>
      <div style={{background: 'rgba(0,0,0,0.78)', color: 'white', fontFamily: sans, fontWeight: 600, fontSize: 36, lineHeight: 1.3, padding: '10px 24px', borderRadius: 10, textAlign: 'center'}}>
        {cue.lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
};

export type PermRow = {name: string; levels: string[]; pick: number};

/**
 * ElevenLabs-style endpoint access list. The cursor clicks each chosen level in turn,
 * with the click sound, and the chosen pill turns red.
 */
export const PermissionPicker: React.FC<{rows: PermRow[]; at: number; every?: number; title?: string; footer?: string; width?: number; style?: React.CSSProperties}> = ({
  rows,
  at,
  every = 22,
  title = 'Endpoints',
  footer,
  width = 600,
  style,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const p = useIn(at);
  const rowH = 74;
  const top = 70;
  const pillW = (r: PermRow) => (r.levels.length === 2 ? 120 : 92);
  const pillX = (r: PermRow, j: number) => width - 24 - (r.levels.length - j) * (pillW(r) + 6);
  const target = (i: number): [number, number] => [pillX(rows[i], rows[i].pick) + pillW(rows[i]) / 2, top + i * rowH + rowH / 2];
  const step = Math.min(rows.length - 1, Math.floor((frame - at - 10) / every));
  let cx = width * 0.5;
  let cy = top + rows.length * rowH + 40;
  let press = 0;
  if (step >= 0) {
    const from = step > 0 ? target(step - 1) : [cx, cy];
    const to = target(step);
    const t0 = at + 10 + step * every;
    const m = spring({frame: frame - t0, fps, config: {damping: 22, mass: 0.6}});
    cx = from[0] + (to[0] - from[0]) * m;
    cy = from[1] + (to[1] - from[1]) * m;
    press = interpolate(frame, [t0 + 12, t0 + 14, t0 + 19], [0, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  }
  return (
    <div style={{position: 'relative', width, opacity: p, transform: `translateY(${(1 - p) * 30}px)`, background: 'white', borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,0.5)', paddingBottom: 18, ...style}}>
      <div style={{height: top, display: 'flex', alignItems: 'center', padding: '0 26px', fontFamily: sans, fontWeight: 700, fontSize: 26, color: '#111'}}>{title}</div>
      {rows.map((r, i) => {
        const chosen = frame >= at + 10 + i * every + 13;
        return (
          <div key={r.name} style={{height: rowH, display: 'flex', alignItems: 'center', padding: '0 26px', borderTop: '1px solid #EEE', position: 'relative'}}>
            <div style={{fontFamily: sans, fontSize: 26, color: '#111', fontWeight: 500}}>{r.name}</div>
            {r.levels.map((lv, j) => {
              const on = chosen ? j === r.pick : j === 0;
              return (
                <div
                  key={lv}
                  style={{
                    position: 'absolute',
                    left: pillX(r, j),
                    width: pillW(r),
                    height: 40,
                    top: (rowH - 40) / 2,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: sans,
                    fontSize: 17,
                    fontWeight: 600,
                    background: on ? (j === 0 ? '#E9E9E9' : c.red) : '#F6F6F6',
                    color: on && j > 0 ? 'white' : '#555',
                  }}
                >
                  {lv}
                </div>
              );
            })}
            <Sequence from={at + 10 + i * every + 12} durationInFrames={8} layout="none">
              <Audio src={staticFile(sfx.click.src)} volume={sfx.click.volume} />
            </Sequence>
          </div>
        );
      })}
      {footer && <div style={{padding: '14px 26px 0', fontFamily: sans, fontSize: 21, color: '#666'}}>{footer}</div>}
      {step >= 0 && frame < at + 10 + rows.length * every + 30 && <Cursor x={cx} y={cy} press={press} />}
    </div>
  );
};


/** Frame where line i starts; falls back to the last line so short scenes never get NaN timings. */
export const at = (cue: number[], i: number) => cue[Math.min(i, cue.length - 1)] ?? 0;

/** Full-screen portrait with a slow push-in, for intros and outros. */
export const Photo: React.FC<{frames: number; dim?: number; src?: string}> = ({frames, dim = 0, src = 'portrait.jpg'}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, frames], [1.04, 1.12]);
  return (
    <AbsoluteFill>
      <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`}} />
      <AbsoluteFill style={{background: `linear-gradient(90deg, rgba(0,0,0,${dim}) 0%, rgba(0,0,0,${dim * 0.3}) 55%, transparent 100%)`}} />
    </AbsoluteFill>
  );
};

/** Top-right disclosure pill. Keep it on every intro and outro. */
export const AiBadge: React.FC<{at: number; text?: string}> = ({at: from, text = 'AI voice · made with Claude Code + ElevenLabs'}) => {
  const p = useIn(from);
  return (
    <div
      style={{
        position: 'absolute', top: 48, right: 56, opacity: p, display: 'flex', alignItems: 'center', gap: 12,
        background: 'rgba(0,0,0,0.6)', border: `2px solid ${c.red}`, borderRadius: 999, padding: '10px 22px',
        fontFamily: sans, fontWeight: 700, fontSize: 24, color: 'white',
      }}
    >
      <div style={{width: 12, height: 12, borderRadius: 6, background: c.red}} />
      {text}
    </div>
  );
};

/** SSW intro: portrait, AI badge, name lower third, then a "Today" lower third from the given line. */
export const IntroCard: React.FC<{cue: number[]; frames: number; name: string; title: string; today: string; todayAt?: number}> = ({
  cue, frames, name, title, today, todayAt = 2,
}) => (
  <AbsoluteFill>
    <Photo frames={frames} />
    <AiBadge at={6} />
    <Between from={0} to={at(cue, todayAt)}>
      <LowerThird at={at(cue, 0) - 4} name={name} title={title} style={{bottom: 150}} />
    </Between>
    <Between from={at(cue, todayAt)}>
      <LowerThird at={at(cue, todayAt)} name="Today" title={today} style={{bottom: 150}} />
    </Between>
  </AbsoluteFill>
);

/** SSW outro: dimmed portrait, recap list, and the sign-off lower third on the last line. */
export const OutroCard: React.FC<{cue: number[]; frames: number; name: string; recap: string[]; signOff?: string}> = ({
  cue, frames, name, recap, signOff = 'signing off',
}) => (
  <AbsoluteFill>
    <Photo frames={frames} dim={0.85} />
    <AiBadge at={0} />
    <div style={{position: 'absolute', left: 96, top: 170}}>
      <Appear at={at(cue, 0)}>
        <div style={{fontFamily: sans, fontSize: 30, fontWeight: 800, color: c.red, letterSpacing: 3, marginBottom: 22}}>QUICK RECAP</div>
      </Appear>
      {recap.map((r, i) => (
        <Appear key={r} at={at(cue, 0) + 30 + i * 40} x={-30} y={0}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20}}>
            <div style={{fontFamily: mono, fontSize: 30, color: c.red, fontWeight: 600}}>{i + 1}</div>
            <div style={{fontFamily: sans, fontSize: 44, fontWeight: 700, color: 'white'}}>{r}</div>
          </div>
        </Appear>
      ))}
    </div>
    <Between from={at(cue, cue.length - 1) - 6}>
      <LowerThird at={at(cue, cue.length - 1) - 4} name={name} title={signOff} style={{bottom: 150}} />
    </Between>
  </AbsoluteFill>
);
