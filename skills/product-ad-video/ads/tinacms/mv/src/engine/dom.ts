// Tiny DOM helpers. Scenes build their DOM once in setup() and only touch styles/text in update().

type Child = Node | string | null | undefined | false;
export interface ElOpts {
  cls?: string;
  style?: Partial<CSSStyleDeclaration> | Record<string, string | number>;
  text?: string;
  html?: string;
  attrs?: Record<string, string>;
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, opts: ElOpts = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (opts.cls) e.className = opts.cls;
  if (opts.style) Object.assign(e.style, normStyle(opts.style));
  if (opts.attrs) for (const [k, v] of Object.entries(opts.attrs)) e.setAttribute(k, v);
  if (opts.html != null) e.innerHTML = opts.html;
  else if (opts.text != null) e.textContent = opts.text;
  for (const c of children) if (c) e.append(c);
  return e;
}

/** Absolutely positioned div. */
export const box = (style: ElOpts['style'] = {}, ...children: Child[]) =>
  el('div', { style: { position: 'absolute', ...(style as object) } }, ...children);

export function svg(markup: string, style: ElOpts['style'] = {}) {
  const d = document.createElement('div');
  d.innerHTML = markup.trim();
  const s = d.firstElementChild as SVGSVGElement;
  Object.assign(s.style, normStyle(style));
  return s;
}

const unitless = new Set(['opacity', 'zIndex', 'fontWeight', 'lineHeight', 'flex', 'flexGrow', 'flexShrink', 'order', 'scale']);
function normStyle(s: Record<string, any>) {
  const o: Record<string, string> = {};
  for (const [k, v] of Object.entries(s)) o[k] = typeof v === 'number' && !unitless.has(k) ? `${v}px` : String(v);
  return o;
}

/** Set styles only when they changed (cheap per-frame updates). */
export function css(e: HTMLElement | SVGElement, s: Record<string, string | number>) {
  const st = e.style as any;
  for (const k in s) {
    const v = s[k];
    const str = typeof v === 'number' && !unitless.has(k) ? `${v}px` : String(v);
    if (st[k] !== str) st[k] = str;
  }
}

export interface TF { x?: number; y?: number; z?: number; s?: number; sx?: number; sy?: number; r?: number; rx?: number; ry?: number; skx?: number; persp?: number }
/** Build a transform string; angles in degrees. */
export function tf(o: TF) {
  let s = '';
  if (o.persp) s += `perspective(${o.persp}px) `;
  if (o.x || o.y || o.z) s += `translate3d(${(o.x ?? 0).toFixed(2)}px, ${(o.y ?? 0).toFixed(2)}px, ${(o.z ?? 0).toFixed(2)}px) `;
  if (o.rx) s += `rotateX(${o.rx.toFixed(3)}deg) `;
  if (o.ry) s += `rotateY(${o.ry.toFixed(3)}deg) `;
  if (o.r) s += `rotate(${o.r.toFixed(3)}deg) `;
  if (o.skx) s += `skewX(${o.skx.toFixed(3)}deg) `;
  if (o.s != null && o.s !== 1) s += `scale(${o.s.toFixed(4)}) `;
  if (o.sx != null || o.sy != null) s += `scale(${(o.sx ?? 1).toFixed(4)}, ${(o.sy ?? 1).toFixed(4)}) `;
  return s || 'none';
}

export function setText(e: HTMLElement, s: string) {
  if (e.textContent !== s) e.textContent = s;
}
export function setHTML(e: HTMLElement, s: string) {
  if ((e as any).__html !== s) { e.innerHTML = s; (e as any).__html = s; }
}
export const show = (e: HTMLElement | SVGElement, on: boolean) => css(e, { display: on ? '' : 'none' });
export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
