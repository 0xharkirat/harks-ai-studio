// A TinaCMS-sidebar-style form: white panel, Inter, subtle borders, orange focus ring.
// Every item is built once and pops in when its code line emits it.
import { box, css, el, tf } from '../../engine/dom';
import { clamp, ease, lerp, seg, spring } from '../../engine/anim';
import { FONT } from '../../brand/fonts';
import { C, GRAD_ORANGE, SHADOW } from '../../brand/tokens';
import type { Rect } from '../../ui/kit';

const BORDER = '#E3E0EE';
const LABEL = '#3F3B5A';
const MUTED = '#8A86A6';

export type FieldKey = 'sections' | 'hero' | 'headline' | 'tagline' | 'image' | 'actions' | 'rows';

interface Item {
  key: FieldKey;
  root: HTMLDivElement;
  ring: HTMLDivElement | null;
  top: number;
  h: number;
  /** y of the leader's landing point, relative to the panel. */
  anchorY: number;
}

const grip = `<svg width="14" height="20" viewBox="0 0 14 20" fill="${MUTED}"><circle cx="4" cy="4" r="1.8"/><circle cx="10" cy="4" r="1.8"/><circle cx="4" cy="10" r="1.8"/><circle cx="10" cy="10" r="1.8"/><circle cx="4" cy="16" r="1.8"/><circle cx="10" cy="16" r="1.8"/></svg>`;
const chevronDown = (c = MUTED) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>`;
const chevronRight = (c = MUTED) => `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${c}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>`;
const trash = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="${MUTED}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/></svg>`;

export class Sidebar {
  root: HTMLDivElement;
  items: Item[] = [];
  private heroCard!: HTMLDivElement;
  private innerKeys: FieldKey[] = ['headline', 'tagline', 'image', 'actions'];
  private typed!: HTMLSpanElement;
  private caret!: HTMLSpanElement;
  readonly innerW: number;
  readonly padX = 28;
  readonly heroTop = 136;

  constructor(parent: HTMLElement, public r: Rect, headline = 'Notes your whole team actually reads.') {
    this.innerW = r.w - this.padX * 2;
    this.root = box({
      left: `${r.x}px`, top: `${r.y}px`, width: `${r.w}px`, height: `${r.h}px`, borderRadius: '18px', background: '#fff', border: '1px solid rgba(15,23,42,0.08)',
      boxShadow: SHADOW.xl, overflow: 'hidden', fontFamily: FONT.ui,
    });
    // header: menu, breadcrumb
    const head = box({ left: '0', top: '0', right: '0', height: '64px', borderBottom: `1px solid ${BORDER}`, background: '#FAF9FD', display: 'flex', alignItems: 'center', padding: '0 22px', gap: '14px' });
    head.innerHTML = `<div style="width:38px;height:38px;border-radius:10px;background:#fff;border:1px solid ${BORDER};display:grid;place-items:center"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3F3B5A" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg></div><span style="font:500 18px ${FONT.ui};color:${MUTED}">Pages</span><span style="color:${MUTED}">/</span><span style="font:600 18px ${FONT.ui};color:#1F1B3A">home</span><span style="margin-left:auto;display:flex;align-items:center;gap:8px;font:600 14px ${FONT.ui};color:#1A7F37"><span style="width:9px;height:9px;border-radius:50%;background:${C.seafoam}"></span>Saved</span>`;
    this.root.append(head);
    parent.append(this.root);

    const x0 = this.padX;
    const w = this.innerW;

    // ── Sections header ──
    const sections = box({ left: `${x0}px`, top: '82px', width: `${w}px`, height: '44px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' });
    sections.innerHTML = `<span style="font:600 17px ${FONT.ui};color:${LABEL}">Sections</span><span style="display:flex;align-items:center;gap:8px;height:38px;padding:0 16px;border-radius:999px;border:1.5px solid ${C.orange};color:${C.orange};font:600 15px ${FONT.ui}"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="${C.orange}" stroke-width="3.2" stroke-linecap="round"><path d="M12 4v16M4 12h16"/></svg>Add Block</span>`;
    this.add('sections', sections, 82, 44, 82 + 22, null);

    // ── Hero group card (grows as its fields arrive) ──
    this.heroCard = box({ left: `${x0 - 10}px`, top: `${this.heroTop}px`, width: `${w + 20}px`, height: '52px', borderRadius: '14px', background: '#F7F6FB', border: `1px solid ${BORDER}` });
    this.root.append(this.heroCard);
    const heroRow = box({ left: `${x0}px`, top: `${this.heroTop}px`, width: `${w}px`, height: '52px', display: 'flex', alignItems: 'center', gap: '12px' });
    heroRow.innerHTML = `${grip}<span style="font:600 19px ${FONT.ui};color:#1F1B3A">Hero</span><span style="margin-left:auto;display:flex;gap:14px;align-items:center">${trash}${chevronDown('#3F3B5A')}</span>`;
    this.add('hero', heroRow, this.heroTop, 52, this.heroTop + 26, null);

    // ── inner fields ──
    let y = this.heroTop + 62;
    const label = (t: string) => `<div style="font:600 15px ${FONT.ui};color:${LABEL};height:22px;margin-bottom:6px">${t}</div>`;
    const input = (value: string) => `<div style="height:46px;border-radius:8px;border:1px solid ${BORDER};background:#fff;box-shadow:inset 0 1px 2px rgba(15,23,42,0.06);display:flex;align-items:center;padding:0 14px;font:500 17px ${FONT.ui};color:#1F1B3A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${value}</div>`;

    const mk = (key: FieldKey, h: number, html: string, ringTop: number, ringH: number) => {
      const d = box({ left: `${x0}px`, top: `${y}px`, width: `${w}px`, height: `${h}px` });
      d.innerHTML = html;
      const ring = box({ left: '-3px', top: `${ringTop - 3}px`, right: '-3px', height: `${ringH + 6}px`, borderRadius: '10px', border: `2px solid ${C.orange}`, boxShadow: `0 0 0 4px ${C.orange}33`, opacity: '0', pointerEvents: 'none' });
      d.append(ring);
      this.add(key, d, y, h, y + ringTop + ringH / 2, ring);
      y += h + 12;
    };
    mk('headline', 76, label('Headline') + input(headline), 28, 46);
    mk('tagline', 76, label('Tagline') + input('Fieldnote turns scattered docs into one calm, searchable home'), 28, 46);
    const img = `${label('Image')}<div style="height:74px;border-radius:10px;border:1px solid ${BORDER};background:#fff;display:flex;align-items:center;gap:16px;padding:0 12px;box-shadow:inset 0 1px 2px rgba(15,23,42,0.05)">
      <div style="width:84px;height:54px;border-radius:7px;background:linear-gradient(135deg,#EEF0FF 0%,#C7D2FE 55%,#A5B4FC 100%);position:relative;overflow:hidden"><div style="position:absolute;left:10px;top:10px;width:40px;height:6px;border-radius:3px;background:rgba(255,255,255,0.9)"></div><div style="position:absolute;left:10px;top:22px;width:62px;height:5px;border-radius:3px;background:rgba(255,255,255,0.6)"></div><div style="position:absolute;left:10px;top:32px;width:50px;height:5px;border-radius:3px;background:rgba(255,255,255,0.6)"></div></div>
      <span style="font:500 16px ${FONT.mono};color:#3F3B5A;white-space:nowrap">fieldnote-workspace.png</span>
      <span style="margin-left:auto;height:34px;padding:0 14px;border-radius:8px;border:1px solid ${BORDER};display:flex;align-items:center;font:600 14px ${FONT.ui};color:#3F3B5A">Replace</span></div>`;
    mk('image', 104, img, 28, 74);
    const act = (t: string) => `<div style="height:42px;border-radius:8px;border:1px solid ${BORDER};background:#fff;display:flex;align-items:center;gap:12px;padding:0 12px;font:600 16px ${FONT.ui};color:#1F1B3A">${grip}<span>${t}</span><span style="margin-left:auto">${chevronRight()}</span></div>`;
    mk('actions', 134, `${label('Actions')}<div style="display:flex;flex-direction:column;gap:8px">${act('Start free')}${act('See how it works')}</div>`, 28, 92);

    // ── the other blocks, collapsed (the `templates` line) ──
    const rows = box({ left: `${x0}px`, top: `${y + 6}px`, width: `${w}px`, height: '96px', display: 'flex', flexDirection: 'column', gap: '8px' });
    const row = (t: string) => `<div style="height:44px;border-radius:12px;border:1px solid ${BORDER};background:#fff;display:flex;align-items:center;gap:12px;padding:0 14px;font:600 17px ${FONT.ui};color:#1F1B3A">${grip}<span>${t}</span><span style="margin-left:auto;display:flex;gap:14px;align-items:center">${trash}${chevronRight()}</span></div>`;
    rows.innerHTML = ['Callout', 'Stats'].map(row).join('');
    this.add('rows', rows, y + 6, 96, y + 6 + 48, null);

    // typed value overlay for the headline (the live-edit moment)
    this.typed = el('span');
    this.caret = el('span');
  }

  private add(key: FieldKey, d: HTMLDivElement, top: number, h: number, anchorY: number, ring: HTMLDivElement | null) {
    this.root.append(d);
    css(d, { opacity: 0 });
    this.items.push({ key, root: d, ring, top, h, anchorY });
  }

  item(key: FieldKey) {
    return this.items.find((i) => i.key === key)!;
  }

  /** Left edge (absolute) where a leader line lands, and its y, for field `key`. */
  anchor(key: FieldKey): [number, number] {
    const it = this.item(key);
    return [this.r.x + this.padX - (key === 'sections' || key === 'rows' ? 0 : 0), this.r.y + it.anchorY];
  }

  /** `emit[key]` = local time the field pops in (after its leader has landed). */
  update(t: number, emit: Partial<Record<FieldKey, number>>) {
    let heroBottom = this.heroTop + 52;
    for (const it of this.items) {
      const e = emit[it.key];
      const on = e != null && t >= e;
      const p = on ? spring(t - e!, 3.0, 0.62) : 0;
      css(it.root, {
        opacity: on ? clamp((t - e!) * 10) : 0,
        transform: tf({ x: (1 - clamp(p, 0, 1.2)) * 36, s: lerp(0.97, 1, clamp(p, 0, 1.1)) }),
      });
      if (it.ring) {
        const q = on ? t - e! : -1;
        // the orange focus ring: flashes in, holds, then rests
        const a = q < 0 ? 0 : q < 0.5 ? 1 : 1 - ease.outCubic(seg(q, 0.5, 0.9));
        css(it.ring, { opacity: a });
      }
      if (on && this.innerKeys.includes(it.key)) heroBottom = Math.max(heroBottom, it.top + it.h * clamp(p, 0, 1) - 8);
    }
    // hero card grows to hold its fields
    const heroOn = emit.hero != null && t >= emit.hero;
    const hp = heroOn ? spring(t - emit.hero!, 3.0, 0.62) : 0;
    css(this.heroCard, {
      opacity: heroOn ? clamp((t - emit.hero!) * 10) : 0,
      height: Math.max(52, heroBottom - this.heroTop + 14),
      transform: tf({ x: (1 - clamp(hp, 0, 1.2)) * 36 }),
    });
  }
}
