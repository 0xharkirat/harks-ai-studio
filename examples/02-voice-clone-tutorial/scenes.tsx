import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Appear, Backdrop, Between, BrowserShot, c, Chip, Header, LowerThird, mono, PermissionPicker, PermRow, sans, SswTag, Terminal, useIn} from './ui';

export type SceneProps = {cue: number[]; frames: number};

const Photo: React.FC<{frames: number; dim?: number}> = ({frames, dim = 0}) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, frames], [1.04, 1.12]);
  return (
    <AbsoluteFill>
      <Img src={staticFile('hark.jpg')} style={{width: '100%', height: '100%', objectFit: 'cover', transform: `scale(${scale})`}} />
      <AbsoluteFill style={{background: `linear-gradient(90deg, rgba(0,0,0,${dim}) 0%, rgba(0,0,0,${dim * 0.3}) 55%, transparent 100%)`}} />
    </AbsoluteFill>
  );
};

const AiBadge: React.FC<{at: number}> = ({at}) => {
  const p = useIn(at);
  return (
    <div
      style={{
        position: 'absolute',
        top: 48,
        right: 56,
        opacity: p,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(0,0,0,0.6)',
        border: `2px solid ${c.red}`,
        borderRadius: 999,
        padding: '10px 22px',
        fontFamily: sans,
        fontWeight: 700,
        fontSize: 24,
        color: 'white',
      }}
    >
      <div style={{width: 12, height: 12, borderRadius: 6, background: c.red}} />
      AI voice · made with Claude Code + ElevenLabs
    </div>
  );
};

export const Intro: React.FC<SceneProps> = ({cue, frames}) => (
  <AbsoluteFill>
    <Photo frames={frames} />
    <AiBadge at={6} />
    <Between from={0} to={cue[2]}>
      <LowerThird at={cue[0] - 4} name="Hark's AI" title="AI voice clone of Hark Singh · SSW Software Engineer" style={{bottom: 150}} />
      <SswTag at={Math.round(cue[1] + 0.42 * (cue[2] - cue[1]))} lead="👑" text="The real Hark: His Holy Harkness, High Priest of Vibe Coders" style={{bottom: 300}} />
    </Between>
    <Between from={cue[2]}>
      <LowerThird at={cue[2]} name="Today" title="Clone your voice for done videos · ElevenLabs + Claude Code" style={{bottom: 150}} />
    </Between>
  </AbsoluteFill>
);

export const Result: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="The result" title="One prompt → a full done video" />
    <Appear at={cue[0] + 6} style={{position: 'absolute', left: 96, top: 170}}>
      <div style={{width: 1200, borderRadius: 16, overflow: 'hidden', position: 'relative', boxShadow: '0 30px 80px rgba(0,0,0,0.5)'}}>
        <Img src={staticFile('shots/donevideo.jpg')} style={{width: 1200, display: 'block'}} />
        <div style={{position: 'absolute', left: '50%', top: '50%', width: 130, height: 130, marginLeft: -65, marginTop: -65, borderRadius: 65, background: 'rgba(204,65,65,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{width: 0, height: 0, borderTop: '28px solid transparent', borderBottom: '28px solid transparent', borderLeft: '44px solid white', marginLeft: 10}} />
        </div>
      </div>
    </Appear>
  </AbsoluteFill>
);

export const Account: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="Step 1" title="Create an ElevenLabs account" />
    <BrowserShot
      at={cue[0]}
      src="shots/signup.png"
      url="elevenlabs.io/app/sign-up"
      style={{position: 'absolute', left: 96, top: 150}}
      steps={[
        {at: cue[1], box: [620, 238, 360, 46], click: true, zoom: 1.35},
        {at: cue[1] + 50, box: [620, 400, 360, 76], zoom: 1.35},
      ]}
    />
  </AbsoluteFill>
);

export const Plan: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="Step 2" title="Pick the Starter plan" />
    <BrowserShot
      at={cue[0]}
      src="shots/pricing.png"
      url="elevenlabs.io/pricing"
      style={{position: 'absolute', left: 96, top: 150}}
      steps={[
        {at: cue[1], box: [522, 375, 262, 200], zoom: 1.25},
        {at: cue[1] + 70, box: [522, 773, 262, 30], zoom: 1.35},
        {at: cue[2], box: [536, 492, 248, 66], click: true, zoom: 1.4},
      ]}
    />
    <SswTag at={cue[2] + 30} lead="💸" text="$6/month · $1 first month (offer until Oct 18)" style={{top: 880}} />
  </AbsoluteFill>
);

export const Key: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="Step 3" title="Create an API key" />
    <BrowserShot
      at={cue[0]}
      src="shots/apikeys.png"
      url="elevenlabs.io/app/developers/api-keys"
      blur={[[756, 394, 96, 26]]}
      style={{position: 'absolute', left: 96, top: 150}}
      steps={[
        {at: cue[1], box: [14, 834, 228, 24], click: true},
        {at: cue[1] + 45, box: [444, 216, 80, 30], click: true},
        {at: cue[1] + 95, box: [1380, 278, 124, 40], click: true, zoom: 1.2},
        {at: cue[2], box: [350, 394, 116, 26], zoom: 1.45},
      ]}
    />
    <SswTag at={cue[2] + 40} lead="Name it" text="done-videos · so future Hark knows what it's for" style={{top: 880}} />
  </AbsoluteFill>
);

const options = [
  {title: 'Restrict Key', note: 'On by default. Pick the access level per endpoint.'},
  {title: 'Usage limits', note: 'Cap how many credits this key can burn.'},
  {title: 'Auto-disable if leaked', note: 'On by default. Found in a public GitHub repo? ElevenLabs tries to switch it off.'},
];

// What the done-video pipeline calls. Verified with scripts/permission-test.sh.
const donePerms: PermRow[] = [
  {name: 'Text to Speech', levels: ['No Access', 'Access'], pick: 1},
  {name: 'Voices', levels: ['No Access', 'Read', 'Write'], pick: 2},
  {name: 'Sound Effects', levels: ['No Access', 'Access'], pick: 1},
  {name: 'Music Generation', levels: ['No Access', 'Access'], pick: 1},
  {name: 'User', levels: ['No Access', 'Access'], pick: 1},
];

export const Privilege: React.FC<SceneProps> = ({cue}) => {
  const ats = [cue[0] + 10, cue[0] + 40, cue[4]];
  const leakFocus = useIn(cue[4]);
  const frame = useCurrentFrame();
  // Zoom into the picker while its line is spoken, then settle back.
  const pickerZoom = interpolate(frame, [cue[1] - 10, cue[1] + 10, cue[2] - 10, cue[2] + 10], [1, 1.14, 1.14, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill>
      <Backdrop />
      <Header tag="Pro tip" title="Least privilege, happy sysadmin" />
      <div style={{position: 'absolute', left: 96, top: 170, width: 700}}>
        <Appear at={cue[0]}>
          <div style={{fontFamily: sans, fontSize: 24, color: c.muted, marginBottom: 16}}>Options in the Create Key form</div>
        </Appear>
        {options.map((o, i) => (
          <Appear key={o.title} at={ats[i]} x={-30} y={0}>
            <div
              style={{
                background: c.panel,
                border: `2px solid ${i === 2 && leakFocus > 0.5 ? c.red : c.line}`,
                borderRadius: 16,
                padding: '20px 26px',
                marginBottom: 14,
              }}
            >
              <div style={{fontFamily: sans, fontSize: 30, fontWeight: 800, color: c.text}}>{o.title}</div>
              <div style={{fontFamily: sans, fontSize: 24, color: c.muted, marginTop: 6}}>{o.note}</div>
            </div>
          </Appear>
        ))}
      </div>
      <div style={{position: 'absolute', left: 860, top: 160, transformOrigin: '0 0', transform: `scale(${pickerZoom})`}}>
      <PermissionPicker
        at={cue[1]}
        every={Math.max(16, Math.floor((cue[2] - cue[1] - 50) / donePerms.length))}
        rows={donePerms}
        title="Endpoints for done videos"
        footer="Everything else: No Access"
        width={600}
      />
      </div>
      <Between from={0} to={cue[2]}>
        <SswTag at={cue[0] + 70} lead="✅ Good example" text="- least privileges, sysadmin stays happy" style={{top: 790}} />
      </Between>
      <Between from={cue[2]} to={cue[3]}>
        <SswTag at={cue[2]} lead="❌ Bad example" text="- Hark's key has full access (shh 🤫)" style={{top: 790}} />
      </Between>
      <Between from={cue[3]}>
        <SswTag at={cue[3]} lead="✅ Fixed" text="- by the time you watch this, Hark's key has least privileges" style={{top: 790}} />
      </Between>
    </AbsoluteFill>
  );
};

export const Env: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="Step 4" title="Put the key in your terminal" />
    <div style={{position: 'absolute', left: 96, top: 160}}>
      <Terminal
        at={cue[0]}
        width={1340}
        fontSize={24}
        lines={[
          {at: cue[1], kind: 'prompt', text: 'set up a global env variable ELEVENLABS_API_KEY in my zshrc. I will paste the key myself'},
          {at: cue[1] + 62, kind: 'claude', text: '⏺ Added the line to ~/.zshrc and opened it for you:'},
          {at: cue[1] + 74, kind: 'dim', text: '    # ElevenLabs API key'},
          {at: cue[1] + 78, kind: 'out', text: '    export ELEVENLABS_API_KEY="<paste your key here>"'},
          {at: cue[2] + 70, kind: 'ok', text: '    export ELEVENLABS_API_KEY="sk_••••••••••••••••••••••••"   ✓ saved'},
          {at: cue[3], kind: 'prompt', text: 'check if ElevenLabs is set up'},
          {at: cue[3] + 30, kind: 'ok', text: '✓ ELEVENLABS_API_KEY is set (51 chars, starts with sk_)'},
          {at: cue[3] + 42, kind: 'ok', text: '✓ ElevenLabs API answers 200 · key value never printed'},
        ]}
      />
    </div>
    <Between from={cue[2]} to={cue[3]}>
      <SswTag at={cue[2]} lead="❌ Bad example" text="- pasting your API key into the chat" style={{top: 760}} />
      <SswTag at={cue[2] + 60} lead="✅ Good example" text="- pasting it into ~/.zshrc yourself" style={{top: 850}} />
    </Between>
    <Between from={cue[3]}>
      <SswTag at={cue[3] - 4} lead="↻" text="Restart the terminal first" style={{top: 760}} />
    </Between>
  </AbsoluteFill>
);

const steps5 = [
  {k: 'yt-dlp', v: 'audio from 5 SSW TV videos'},
  {k: 'clean bits only', v: 'no music, only Hark talking'},
  {k: '4:12 of audio', v: '4 clips, levelled'},
  {k: '1 API call', v: "Instant Voice Clone → Hark's AI"},
];

export const Clone: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="Step 5" title="Let it cook 🔥" />
    <Between from={0} to={cue[3]}>
      <div style={{position: 'absolute', left: 96, top: 160}}>
        <Terminal
          at={cue[0]}
          width={1340}
          fontSize={24}
          lines={[{at: cue[1], kind: 'prompt', text: 'here is my SSW TV playlist. use yt-dlp to get my audio and clone my voice in ElevenLabs'}]}
        />
      </div>
      <div style={{position: 'absolute', left: 96, top: 360, display: 'flex', gap: 20}}>
        {steps5.map((s, i) => (
          <Appear key={s.k} at={cue[2] + i * 26}>
            <div style={{width: 315, height: 170, background: c.panel, border: `1px solid ${i === 3 ? c.red : c.line}`, borderRadius: 16, padding: '24px 24px', boxSizing: 'border-box'}}>
              <div style={{fontFamily: mono, fontSize: 28, color: i === 3 ? c.red : c.text, fontWeight: 600}}>{s.k}</div>
              <div style={{fontFamily: sans, fontSize: 24, color: c.muted, marginTop: 12}}>{s.v}</div>
            </div>
          </Appear>
        ))}
      </div>
      <div style={{position: 'absolute', left: 96, top: 560, display: 'flex', gap: 20}}>
        {['grid_fumadocs.jpg', 'grid_playwright.jpg'].map((g, i) => (
          <Appear key={g} at={cue[2] + 40 + i * 12}>
            <Img src={staticFile(g)} style={{width: 500, borderRadius: 12, border: `1px solid ${c.line}`}} />
          </Appear>
        ))}
      </div>
    </Between>
    <Between from={cue[3]}>
      <BrowserShot
        at={cue[3]}
        src="shots/voices.png"
        url="elevenlabs.io/app/voice-lab"
        style={{position: 'absolute', left: 96, top: 150}}
        steps={[{at: cue[3] + 6, box: [350, 394, 300, 44], click: true, zoom: 1.4}]}
      />
      <SswTag at={cue[4]} lead="⚠️" text="Only clone your own voice, or one you have permission for" style={{top: 880}} />
    </Between>
  </AbsoluteFill>
);

const flow = [
  {t: 'PBI done', s: 'work finished in Claude Code'},
  {t: 'Script', s: 'SSW done video structure'},
  {t: "Hark's AI", s: 'narration in his voice'},
  {t: 'Video', s: 'Remotion → MP4'},
];

export const Use: React.FC<SceneProps> = ({cue}) => (
  <AbsoluteFill>
    <Backdrop />
    <Header tag="Step 6" title="Every PBI gets a done video" />
    <div style={{position: 'absolute', left: 96, top: 190, display: 'flex', alignItems: 'center', gap: 16}}>
      {flow.map((f, i) => (
        <React.Fragment key={f.t}>
          <Appear at={cue[0] + i * 22}>
            <div style={{width: 290, height: 160, background: i === 2 ? c.red : c.panel, border: `2px solid ${i === 2 ? c.red : c.line}`, borderRadius: 16, padding: 24, boxSizing: 'border-box'}}>
              <div style={{fontFamily: sans, fontSize: 32, fontWeight: 800, color: 'white'}}>{f.t}</div>
              <div style={{fontFamily: sans, fontSize: 23, color: i === 2 ? 'white' : c.muted, marginTop: 10}}>{f.s}</div>
            </div>
          </Appear>
          {i < flow.length - 1 && (
            <Appear at={cue[0] + i * 22 + 14} y={0} x={-10}>
              <div style={{fontFamily: sans, fontSize: 44, color: c.red, fontWeight: 800}}>→</div>
            </Appear>
          )}
        </React.Fragment>
      ))}
    </div>
    <SswTag at={cue[2] + 10} lead="❌ v1" text="- no SSW lower thirds, no music" style={{top: 560}} />
    <SswTag at={cue[3]} lead="✅ v2" text="- SSW lower thirds + music by ElevenLabs 🎵" style={{top: 650}} />
  </AbsoluteFill>
);

const recap = ['Make an ElevenLabs account', 'Pick Starter', 'Create a named API key, least privileges', 'Set it in your terminal', 'Let Claude Code clone your voice'];

export const Outro: React.FC<SceneProps> = ({cue, frames}) => (
  <AbsoluteFill>
    <Photo frames={frames} dim={0.85} />
    <AiBadge at={0} />
    <div style={{position: 'absolute', left: 96, top: 170}}>
      <Appear at={cue[0]}>
        <div style={{fontFamily: sans, fontSize: 30, fontWeight: 800, color: c.red, letterSpacing: 3, marginBottom: 22}}>QUICK RECAP</div>
      </Appear>
      {recap.map((r, i) => (
        <Appear key={r} at={cue[0] + 30 + i * 40} x={-30} y={0}>
          <div style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 20}}>
            <div style={{fontFamily: mono, fontSize: 30, color: c.red, fontWeight: 600}}>{i + 1}</div>
            <div style={{fontFamily: sans, fontSize: 44, fontWeight: 700, color: 'white'}}>{r}</div>
          </div>
        </Appear>
      ))}
    </div>
    <Between from={cue[2] - 6}>
      <LowerThird at={cue[2] - 4} name="Hark's AI" title="signing off · cheers!" style={{bottom: 150}} />
    </Between>
  </AbsoluteFill>
);
