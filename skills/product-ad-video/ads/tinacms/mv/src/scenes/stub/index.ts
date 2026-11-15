// Placeholder for a scene that is not built yet: shows its name and the beat.
import type { SceneDef } from '../../engine/stage';
import { box, css, el } from '../../engine/dom';
import { FONT } from '../../brand/fonts';

const stub: SceneDef<{ name: string; dark?: boolean }> = {
  id: 'stub',
  setup({ root }, props) {
    const bg = box({ inset: '0', background: props.dark ? '#1C1B2E' : '#F1F5F9' });
    const label = el('div', { style: { position: 'absolute', left: '80px', top: '80px', font: `600 64px ${FONT.head}`, color: props.dark ? '#fff' : '#0F172A' } });
    const beat = box({ left: '80px', top: '180px', width: '40px', height: '40px', borderRadius: '50%', background: '#EC4815' });
    root.append(bg, label, beat);
    return {
      update(f) {
        label.textContent = `${props.name}  ${f.lt.toFixed(2)} / ${f.dur.toFixed(1)}`;
        css(beat, { opacity: f.audio.pulse('kick', f.t, 8) });
      },
    };
  },
};
export default stub;
