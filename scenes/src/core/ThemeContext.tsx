import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {continueRender, delayRender, getInputProps, useCurrentFrame, useVideoConfig} from 'remotion';
import {FONT_LOADS} from './fonts';
import {getTheme, resolveThemeId, THEMES, type Theme} from './theme';

const Ctx = createContext<Theme>(THEMES.A);

/** The theme of the nearest ThemeRoot (theme A outside one). */
export const useTheme = () => useContext(Ctx);

/**
 * The theme for a whole render. One flag picks it, in this order:
 *   1. the Remotion input prop `theme`  (remotion render ... --props='{"theme":"B"}', or scripts/render.dart --theme B)
 *   2. `preferred`                      (the theme named in script.json, passed down through layout.json)
 *   3. "A"
 */
export const pickTheme = (preferred?: string | null): string => {
  let flag: unknown;
  try {
    flag = (getInputProps() as {theme?: unknown}).theme;
  } catch {
    flag = undefined;
  }
  if (typeof flag === 'string' && flag) return resolveThemeId(flag);
  return resolveThemeId(preferred);
};

let fontsPromise: Promise<unknown> | null = null;
const loadFonts = () => {
  if (!fontsPromise) {
    fontsPromise = Promise.all(FONT_LOADS.map((f) => document.fonts.load(f, 'Aa0123456789?%.,')))
      .then(() => document.fonts.ready)
      .catch(() => undefined);
  }
  return fontsPromise;
};

/** Mounts its children only once every font is loaded, so measured text and a render never use a fallback font. */
const useFontsReady = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender('fonts'));
  useEffect(() => {
    let live = true;
    loadFonts().then(() => {
      if (live) {
        setReady(true);
        continueRender(handle);
      }
    });
    return () => {
      live = false;
    };
  }, [handle]);
  return ready;
};

/** The 4 boil filters: low-frequency warp plus a little jitter, re-seeded 4 ways. Only in a theme with boiling lines. */
const BoilDefs: React.FC<{theme: Theme}> = ({theme}) => {
  const {width: W, height: H} = useVideoConfig();
  if (!theme.line.boil) return null;
  const k = theme.line.wobble;
  return (
    <svg width={0} height={0} style={{position: 'absolute', left: 0, top: 0}} aria-hidden>
      <defs>
        {[0, 1, 2, 3].map((i) => (
          <filter key={i} id={`fcb-boil-${i}`} filterUnits="userSpaceOnUse" x={-30} y={-30} width={W + 60} height={H + 60} colorInterpolationFilters="sRGB">
            <feTurbulence type="fractalNoise" baseFrequency="0.011 0.013" numOctaves={2} seed={i * 13 + 5} result="warp" />
            <feDisplacementMap in="SourceGraphic" in2="warp" scale={k} xChannelSelector="R" yChannelSelector="G" result="a" />
            <feTurbulence type="fractalNoise" baseFrequency="0.075" numOctaves={1} seed={i * 29 + 11} result="jit" />
            <feDisplacementMap in="a" in2="jit" scale={k * 0.32} xChannelSelector="G" yChannelSelector="B" />
          </filter>
        ))}
      </defs>
    </svg>
  );
};

/**
 * Wrap a composition (or a scene) in a theme. Holds children back until the fonts are ready, and defines the
 * boil filters. Pass `theme` as a name ("A", "sketch", ...); pass `useFlag` to let the render flag win.
 */
export const ThemeRoot: React.FC<{theme?: string | null; useFlag?: boolean; children: React.ReactNode}> = ({theme, useFlag = true, children}) => {
  const resolved = useMemo(() => (useFlag ? pickTheme(theme) : resolveThemeId(theme)), [theme, useFlag]);
  const t = useMemo(() => getTheme(resolved), [resolved]);
  const ready = useFontsReady();
  if (!ready) return null;
  return (
    <Ctx.Provider value={t}>
      <BoilDefs theme={t} />
      {children}
    </Ctx.Provider>
  );
};

/** The index (0..3) of the current boil drawing: a new one every 1/boilFps seconds, and always 0 in a clean theme. */
export const useBoilIndex = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const theme = useTheme();
  if (!theme.line.boil) return 0;
  return Math.floor((f / fps) * theme.line.boilFps) % 4;
};
