"""Score: an event container that is both the render input and the source of timing.json."""
from __future__ import annotations

from collections import defaultdict

from .theory import BAR, STEP, tb


class Score:
    def __init__(self, name: str, nbars: int, file_dur: float, kind: str = "anthem"):
        self.name = name
        self.kind = kind
        self.nbars = nbars
        self.music_dur = nbars * BAR
        self.file_dur = file_dur
        self.ev = defaultdict(list)
        self.sections = []
        self.auto = defaultdict(list)       # (stem, param) -> [(t, value)]
        self.ducks = []                      # dict(start, end, depth, tau, stems)
        self.fade_out = None                 # (start, end) master fade
        self.stops = []
        self.energy = []
        self.ceiling_db = None             # per-cue true-peak ceiling override (default mix.CEILING_DB)
        self.target_lufs = -14.0
        self.time_scale = 1.0               # real seconds per design second (retime); 1.2 plays 120 BPM at 100 BPM
        self.cuts = []                      # (t0, t1) spans removed by cut_span, in the final time base (foley follows them)

    # ----- tempo
    def retime(self, k: float):
        """Play the whole score k times slower: a real tempo change (note times and lengths scale,
        while attacks, releases and drum sounds keep their natural length). Call it last.
        Foley in cues/<name>.foley.json stays in design time; load_foley applies the same k."""
        for evs in self.ev.values():
            for e in evs:
                for key in ("t", "dur", "start", "end"):
                    if e.get(key) is not None:
                        e[key] *= k
        for s in self.sections:
            s["start"] *= k
            s["end"] *= k
        self.auto = defaultdict(list, {key: [[(t * k, v) for t, v in seg] for seg in segs] for key, segs in self.auto.items()})
        for d in self.ducks:
            d["start"] *= k
            d["end"] *= k
        self.stops = [(a * k, b * k) for a, b in self.stops]
        self.energy = [(a * k, b * k, db) for a, b, db in self.energy]
        if self.fade_out:
            self.fade_out = (self.fade_out[0] * k, self.fade_out[1] * k)
        self.music_dur *= k
        self.file_dur *= k
        self.time_scale *= k
        return self

    def cut_span(self, t0, t1):
        """Remove [t0, t1) from the score (current time base) and pull everything after it earlier by t1 - t0.
        A note that starts inside the gap is dropped; a note that rings into or across it gets shorter by the overlap.
        Foley follows through `cuts` (instruments.apply_cuts). Call it after retime."""
        d = t1 - t0
        tm = lambda t: t if t < t0 else (t0 if t < t1 else t - d)
        for key in list(self.ev):
            keep = []
            for e in self.ev[key]:
                if e.get("t") is not None:
                    t = e["t"]
                    if t0 - 1e-9 <= t < t1 - 1e-9:
                        continue
                    if e.get("dur") is not None:
                        e["dur"] = tm(t + e["dur"]) - tm(t)
                    e["t"] = tm(t)
                elif e.get("start") is not None:
                    if e["start"] >= t0 - 1e-9 and e["end"] <= t1 + 1e-9:
                        continue
                    e["start"], e["end"] = tm(e["start"]), tm(e["end"])
                keep.append(e)
            self.ev[key] = keep
        for s in self.sections:
            s["start"], s["end"] = tm(s["start"]), tm(s["end"])
        self.auto = defaultdict(list, {k: [[(tm(t), v) for t, v in seg] for seg in segs] for k, segs in self.auto.items()})
        self.ducks = [dict(dk, start=tm(dk["start"]), end=tm(dk["end"])) for dk in self.ducks if tm(dk["end"]) > tm(dk["start"])]
        self.stops = [(tm(a), tm(b)) for a, b in self.stops if tm(b) > tm(a)]
        self.energy = [(tm(a), tm(b), db_) for a, b, db_ in self.energy if tm(b) > tm(a)]
        if self.fade_out:
            self.fade_out = (tm(self.fade_out[0]), tm(self.fade_out[1]))
        self.music_dur -= d
        self.file_dur -= d
        self.cuts.append((t0, t1))
        return self

    def repeat_span(self, t0, t1):
        """Play [t0, t1) twice: copy its events to [t1, t1 + d) and push everything from t1 on later by d = t1 - t0.
        A note that rings across t1 keeps its length. Ducks, energy segments and `ev` spans that sit inside the
        span are copied too; ones that run across t1 grow by d. Automation points are not copied (from t1 on they
        move later), so a curve over the span stretches. Foley does not follow: the cue sets its own foley file.
        Call it after retime, like cut_span."""
        d = t1 - t0
        eps = 1e-9
        sh = lambda t: t + d if t >= t1 - eps else t
        for key in list(self.ev):
            out = []
            for e in self.ev[key]:
                if e.get("t") is not None:
                    t = e["t"]
                    if t0 - eps <= t < t1 - eps:
                        out.append(dict(e, t=t + d))
                    elif t >= t1 - eps:
                        e["t"] = t + d
                elif e.get("start") is not None:
                    a, b = e["start"], e["end"]
                    if a >= t0 - eps and b <= t1 + eps:
                        out.append(dict(e, start=a + d, end=b + d))
                    else:
                        e["start"], e["end"] = sh(a), sh(b)
                out.append(e)
            self.ev[key] = out
        for s in self.sections:
            s["start"], s["end"] = sh(s["start"]), sh(s["end"])
        self.auto = defaultdict(list, {k: [[(sh(t), v) for t, v in seg] for seg in segs] for k, segs in self.auto.items()})
        ducks = []
        for dk in self.ducks:
            if dk["start"] >= t0 - eps and dk["end"] <= t1 + eps:
                ducks.append(dict(dk, start=dk["start"] + d, end=dk["end"] + d))
            ducks.append(dict(dk, start=sh(dk["start"]), end=sh(dk["end"])))
        self.ducks = ducks
        energy = []
        for a, b, db_ in self.energy:
            if a >= t0 - eps and b <= t1 + eps:
                energy.append((a + d, b + d, db_))
            energy.append((sh(a), sh(b), db_))
        self.energy = sorted(energy)
        self.stops = [(sh(a), sh(b)) for a, b in self.stops]
        if self.fade_out:
            self.fade_out = (sh(self.fade_out[0]), sh(self.fade_out[1]))
        self.music_dur += d
        self.file_dur += d
        return self

    # ----- structure
    def section(self, sid, name, bar0, bar1):
        """bar1 inclusive, like the spec table."""
        self.sections.append(dict(id=sid, name=name, startBar=bar0, endBar=bar1, start=tb(bar0), end=min(tb(bar1 + 1), self.file_dur)))

    def section_t(self, sid, name, t0, t1):
        """Section by time (for cues that are not bar-aligned, like six)."""
        self.sections.append(dict(id=sid, name=name, startBar=int(t0 // BAR) + 1, endBar=int((t1 - 1e-9) // BAR) + 1, start=t0, end=min(t1, self.file_dur)))

    def stop(self, start, end):
        self.stops.append((start, end))
        self.ev["stop"].append(dict(start=start, end=end))

    def in_stop(self, t):
        return any(a - 1e-9 <= t < b - 1e-9 for a, b in self.stops)

    # ----- drums
    def kick(self, t, vel=1.0, v="main"):
        self.ev["kick"].append(dict(t=t, vel=vel, v=v))

    def snare(self, t, vel=1.0, v="main"):
        self.ev["snare"].append(dict(t=t, vel=vel, v=v))

    def clap(self, t, vel=1.0):
        self.ev["clap"].append(dict(t=t, vel=vel))

    def hatC(self, t, vel=0.6):
        self.ev["hatClosed"].append(dict(t=t, vel=vel))

    def hatO(self, t, vel=0.7):
        self.ev["hatOpen"].append(dict(t=t, vel=vel))

    def shaker(self, t, vel=0.5):
        self.ev["shaker"].append(dict(t=t, vel=vel))

    def rim(self, t, vel=0.7):
        self.ev["rim"].append(dict(t=t, vel=vel))

    def tick(self, t, vel=0.4):
        self.ev["tick"].append(dict(t=t, vel=vel))

    def tom(self, t, vel=0.8, f=110.0):
        self.ev["tom"].append(dict(t=t, vel=vel, f=f))

    # ----- fx
    def crash(self, t, vel=1.0, short=False):
        self.ev["crash"].append(dict(t=t, vel=vel, short=short))

    def impact(self, t, size="big", vel=1.0):
        self.ev["impact"].append(dict(t=t, size=size, vel=vel))

    def boom(self, t, vel=1.0, size="med"):
        """Sub boom + crash under a final chord (listed as finalChord in timing.json, not as an impact)."""
        self.ev["finalChord"].append(dict(t=t, vel=vel, size=size))

    def accent(self, t, vel=1.0):
        """Small accent on a picture cut: short crash + small boom (timing.json: accent)."""
        self.ev["accent"].append(dict(t=t, vel=vel))

    def hit(self, t, vel=1.0, f=82.0):
        """A tom + short crash hit (timing.json: hit)."""
        self.ev["hit"].append(dict(t=t, vel=vel, f=f))

    def endhit(self, t, vel=1.0):
        self.ev["endHit"].append(dict(t=t, vel=vel))

    def riser(self, start, end, kind="noise", pitch=None, vel=1.0):
        self.ev["riser"].append(dict(start=start, end=end, kind=kind, pitch=pitch, vel=vel))

    def swell(self, start, end, vel=1.0):
        self.ev["swell"].append(dict(start=start, end=end, vel=vel))

    def whoosh(self, t, dur=0.4, up=True, vel=1.0):
        self.ev["whoosh"].append(dict(t=t, dur=dur, up=up, vel=vel))

    def down(self, t, dur=1.2, vel=1.0):
        self.ev["down"].append(dict(t=t, dur=dur, vel=vel))

    # ----- pitched
    def bass(self, t, dur, midi, style="sub", vel=1.0, glide=None):
        self.ev["bass"].append(dict(t=t, dur=dur, midi=midi, style=style, vel=vel, glide=glide))

    def chord(self, t, dur, name, style="saw", vel=1.0, **kw):
        self.ev["chord"].append(dict(t=t, dur=dur, name=name, style=style, vel=vel, **kw))

    def lead(self, t, dur, midi, vel=1.0, layer="main", **kw):
        self.ev["lead"].append(dict(t=t, dur=dur, midi=midi, vel=vel, layer=layer, **kw))

    def arp(self, t, dur, midi, vel=0.7, **kw):
        self.ev["arp"].append(dict(t=t, dur=dur, midi=midi, vel=vel, **kw))

    def bell(self, t, dur, midi, vel=0.8, muted=False):
        self.ev["bell"].append(dict(t=t, dur=dur, midi=midi, vel=vel, muted=muted))

    def logo(self, t, vel=1.0, teaser=False, motif=None):
        """The sonic logo. `motif` picks the notes (theory.LOGO_MOTIFS): None is the TinaCMS motif, "yak" is YakShaver's."""
        self.ev["logo"].append(dict(t=t, vel=vel, teaser=teaser, motif=motif))

    # ----- automation / sidechain
    def set_auto(self, stem, param, points):
        """One automation segment: values interpolate between the points and revert to the
        default (no filter / 0 dB) outside [first, last] time."""
        self.auto[(stem, param)].append(sorted(points))

    def stem_gain(self, stem, t0, t1, db_, ramp=0.08):
        """Gain offset (dB) on one stem between t0 and t1, with short ramps."""
        self.auto[(stem, "gain")].append([(t0 - ramp, 0.0), (t0, db_), (t1, db_), (t1 + ramp, 0.0)])

    def plan(self, *segments):
        """Energy plan: (t0, t1, target dB relative to the loudest section). Used by the mix to ride section levels."""
        self.energy = list(segments)

    def duck(self, start, end, depth=0.6, tau=0.11, stems=("chords", "arp", "bass")):
        self.ducks.append(dict(start=start, end=end, depth=depth, tau=tau, stems=tuple(stems)))
