"""Channel strips, sends, sidechain, stops and the master chain."""
from __future__ import annotations

import numpy as np
import pyloudnorm as pyln

from engine import fx, gamesfx
from engine.dsp import SR, db, eq, butter_hp, butter_lp, lowpass, highpass, fade_edges, sat

# ----------------------------------------------------------------------------- strip configuration
# gain: dB trim into the master. rev/dly: (preset|time, wet dB relative to the dry level).
# duck: how much of the kick sidechain this strip receives (0..1 x zone depth).

STRIPS = {
    "kick":   dict(gain=-3.5, pan=0.0, eq=[("hp", 28, 0.707, 0), ("peak", 62, 1.0, 1.5), ("peak", 380, 1.3, -3.0), ("peak", 3800, 0.9, 1.5), ("lp", 14000, 0.707, 0)], sat=1.15, duck=0.0),
    "snare":  dict(gain=-8.6, pan=0.0, eq=[("hp", 160, 0.707, 0), ("peak", 250, 1.0, -1.5), ("peak", 4200, 0.8, 1.0)], sat=1.25, rev=("plate", -10.0), duck=0.0),
    "hats":   dict(gain=-2.5, pan=0.0, eq=[("hp", 480, 0.707, 0), ("hshelf", 9000, 0.7, -1.5)], rev=("plate", -17.0), duck=0.12),
    "perc":   dict(gain=-10.0, pan=0.0, eq=[("hp", 300, 0.707, 0)], rev=("room", -12.0), dly=(0.375, -17.0), duck=0.1),
    "bass":   dict(gain=-8.0, pan=0.0, eq=[("hp", 28, 0.707, 0), ("peak", 150, 1.0, -1.5), ("lp", 5000, 0.707, 0)], sat=1.35, duck=0.9, mono=True),
    "chords": dict(gain=3.2, pan=0.0, eq=[("hp", 150, 0.707, 0), ("peak", 3200, 0.8, -1.0)], rev=("hall", -13.0), duck=1.0, width=1.15),
    "keys":   dict(gain=-9.0, pan=0.0, eq=[("hp", 150, 0.707, 0), ("peak", 300, 0.9, -1.5)], rev=("plate", -11.0), dly=(0.375, -16.0), duck=0.5, width=1.1),
    "arp":    dict(gain=-4.0, pan=0.0, eq=[("hp", 300, 0.707, 0)], rev=("plate", -12.0), dly=(0.375, -9.0), duck=0.8, width=1.1),
    "lead":   dict(gain=-1.5, pan=0.0, eq=[("hp", 250, 0.707, 0), ("peak", 3300, 1.0, -3.0), ("hshelf", 9000, 0.7, -3.0)], rev=("plate", -12.0), dly=(0.375, -12.0), duck=0.28),
    "fx":     dict(gain=-6.0, pan=0.0, eq=[("hp", 28, 0.707, 0)], rev=("big", -14.0), duck=0.0),
    "foley":  dict(gain=-8.0, pan=0.0, eq=[("hp", 200, 0.707, 0)], rev=("room", -12.0), dly=(0.375, -20.0), duck=0.0),
    "logo":   dict(gain=-8.0, pan=0.0, eq=[("hp", 200, 0.707, 0)], rev=("hall", -11.0), dly=(0.375, -17.0), duck=0.0),
}

# true-peak ceiling of the master (8x oversampled). -1.5 dBTP leaves room for AAC overshoot (stays under -1.0 after encoding).
CEILING_DB = -1.5

_REV_K: dict = {}


def _rev_norm(preset):
    """Wet/dry RMS ratio of the reverb for steady noise, so wet_db is relative to the dry level."""
    if preset not in _REV_K:
        rng = np.random.default_rng(5)
        x = rng.standard_normal((SR * 6, 2)) * 0.1
        x = eq(x, [("lp", 6000, 0.707, 0)])
        w = fx.reverb(x, preset)
        seg = slice(SR * 3, SR * 6)
        _REV_K[preset] = float(np.sqrt(np.mean(w[seg] ** 2)) / np.sqrt(np.mean(x[seg] ** 2)))
    return _REV_K[preset]


def curve(segments, n, default, log=False, sr=SR):
    """Sample-rate automation curve from segments [[(t, value), ...], ...]. Inside a segment values
    interpolate (log-frequency if log); outside every segment the default holds."""
    out = np.full(n, float(default))
    for pts in segments:
        pts = list(pts)
        if abs(pts[0][1] - default) > 1e-9:
            pts = [(pts[0][0] - 0.05, default)] + pts
        if abs(pts[-1][1] - default) > 1e-9:
            pts = pts + [(pts[-1][0] + 0.015, default)]
        ts = np.array([p[0] for p in pts]) * sr
        vs = np.array([p[1] for p in pts], dtype=np.float64)
        i0 = max(0, int(ts[0]))
        i1 = min(n, int(ts[-1]))
        if i1 <= i0:
            continue
        x = np.arange(i0, i1)
        out[i0:i1] = np.exp(np.interp(x, ts, np.log(vs))) if log else np.interp(x, ts, vs)
    return out


def stop_gate(n, stops, fade=0.003, sr=SR):
    g = np.ones(n)
    f = int(fade * sr)
    for a, b in stops:
        i0, i1 = int(round(a * sr)), int(round(b * sr))
        i1 = min(i1, n)
        g[i0:i1] = 0.0
        # fade-out ending exactly at the stop start
        if i0 - f >= 0:
            g[i0 - f:i0] = np.minimum(g[i0 - f:i0], np.linspace(1, 0, f))
        # fade-in starting exactly at the stop end
        if i1 + f <= n:
            g[i1:i1 + f] = np.minimum(g[i1:i1 + f], np.linspace(0, 1, f))
    return g


def sfx_duck(S, N, sr=SR):
    """Gain curve (dB) for the music stems: the score steps back under each foley event that asks for it
    (`duck`: depth in dB, `hold`: seconds, default per sound), so a reaction sound or a pop-up reads over a dense mix."""
    g = np.zeros(N)
    for e in getattr(S, "foley", None) or []:
        d = float(e.get("duck", 0.0))
        if d <= 0.0:
            continue
        hold = float(e.get("hold", gamesfx.HOLD.get(e["type"], 0.15)))
        t = float(e["t"])
        pts = np.array([t - 0.03, t, t + hold, t + hold + 0.3]) * sr
        i0, i1 = max(0, int(pts[0])), min(N, int(pts[-1]) + 1)
        if i1 <= i0:
            continue
        env = np.interp(np.arange(i0, i1), pts, [0.0, -d, -d, 0.0])
        g[i0:i1] = np.minimum(g[i0:i1], env)
    return g


def process_strips(S, stems, strips_over=None, rev_scale=1.0):
    """Apply every strip chain; return dict of post-fader stereo stems (float64)."""
    N = next(iter(stems.values())).shape[0]
    out = {}
    kicks = [e["t"] for e in S.ev["kick"]]
    sg = stop_gate(N, S.stops)
    sd = sfx_duck(S, N)
    sd = db(sd) if np.any(sd) else None
    for name, buf in stems.items():
        cfg = dict(STRIPS[name])
        if strips_over and name in strips_over:
            cfg.update(strips_over[name])
        x = buf.astype(np.float64)
        if not np.any(x):
            out[name] = x
            continue
        # filter automation (dry, before sends)
        lp = S.auto.get((name, "lp"))
        if lp:
            c = curve(lp, N, 20000.0, log=True)
            x = lowpass(x, c, 0.75)
            x = lowpass(x, c, 0.75)
        hp = S.auto.get((name, "hp"))
        if hp:
            c = curve(hp, N, 20.0, log=True)
            x = highpass(x, c, 0.75)
        if cfg.get("eq"):
            x = eq(x, cfg["eq"])
        if cfg.get("sat"):
            x = sat(x, cfg["sat"], os=2, mix=0.65)
        if cfg.get("mono"):
            m = 0.5 * (x[:, 0] + x[:, 1])
            x = np.stack([m, m], axis=1)
        if cfg.get("width", 1.0) != 1.0:
            x = fx.widen(x, cfg["width"])
        dry = x
        wet = np.zeros_like(x)
        if cfg.get("rev"):
            preset, wdb = cfg["rev"]
            w = fx.reverb(dry, preset)
            wet += w * (db(wdb) * rev_scale / _rev_norm(preset))
        if cfg.get("dly"):
            tm, wdb = cfg["dly"]
            d = fx.pingpong(dry, tm * S.time_scale, fb=0.36)   # dotted 8th at the cue tempo
            wet += d * db(wdb)
        y = dry + wet
        # sidechain from the kick pattern
        if cfg.get("duck", 0) > 0:
            gz = np.ones(N)
            for z in S.ducks:
                if name in z["stems"]:
                    ks = [t for t in kicks if z["start"] - 1e-9 <= t < z["end"] - 1e-9]
                    if ks:
                        d = min(0.95, z["depth"] * cfg["duck"])
                        c = fx.duck_curve(N, ks, d, z["tau"])
                        # confine to the zone (+ short tail)
                        a, b = int(z["start"] * SR), int(min(z["end"] + 0.4, N / SR) * SR)
                        gz[a:b] *= c[a:b]
            y = y * gz[:, None]
        # the music steps back under the reaction sounds and pop-ups
        if sd is not None and name not in ("foley", "logo"):
            y = y * sd[:, None]
        # stem gain automation
        ga = S.auto.get((name, "gain"))
        if ga:
            y = y * db(curve(ga, N, 0.0))[:, None]
        y = y * sg[:, None]
        # The music bed sits lower against the sound effects in some cues (the master LUFS stays the same).
        if name != "foley":
            y = y * db(getattr(S, "music_trim", 0.0))
        # fader + pan
        y = y * db(cfg["gain"])
        if cfg.get("pan", 0.0) != 0.0:
            y = fx.balance(y, cfg["pan"])
        out[name] = y
    return out


def plan_targets(S):
    return np.array([e[2] for e in S.energy])


def measure_plan(S, x):
    """LUFS of every energy-plan segment of x."""
    meter = pyln.Meter(SR)
    n = x.shape[0]
    out = []
    for (a, b, tgt) in S.energy:
        seg = x[int(a * SR):int(min(b, n / SR) * SR)]
        if seg.shape[0] < int(0.45 * SR):
            seg = np.pad(seg, ((0, int(0.45 * SR) - seg.shape[0]), (0, 0)))
        try:
            out.append(meter.integrated_loudness(seg))
        except Exception:
            out.append(-70.0)
    return np.array(out)


def apply_trims(S, x, trims, ramp=0.15):
    """Apply per-segment dB trims; gain ramps over the `ramp` seconds before each segment start so the
    new level is fully established on the downbeat."""
    n = x.shape[0]
    pts_t, pts_v = [], []
    last_v = None
    segs = sorted(zip([e[0] for e in S.energy], [e[1] for e in S.energy], trims))
    for k, (a, b, tr) in enumerate(segs):
        pts_t += [max(a - ramp, 0.0), a, b - 1e-4]
        pts_v += [tr if last_v is None else last_v, tr, tr]
        last_v = tr
    # strictly increasing times
    pts_t = np.maximum.accumulate(np.array(pts_t) + np.arange(len(pts_t)) * 1e-6)
    gdb = np.interp(np.arange(n) / SR, pts_t, pts_v)
    gdb = np.clip(gdb, -18.0, 18.0)
    return x * db(gdb)[:, None]


def initial_trims(S, x):
    ms = measure_plan(S, x)
    tg = plan_targets(S)
    ref = int(np.argmax(tg))
    return tg - ms + (ms[ref] - tg[ref])


def master_pre(mix, fade=None, air_db=3.0):
    """Glue compression, tone and mono low end (everything before the limiter)."""
    x = mix.copy()
    x = butter_hp(x, 22.0, 2)
    # glue compressor: threshold 7 dB under the mix's own peaks, so quiet sections are left alone
    pk_db = 20 * np.log10(np.percentile(np.abs(x), 99.9) + 1e-9)
    x, gr = fx.compress(x, thr_db=pk_db - 7.0, ratio=1.8, atk_ms=30.0, rel_ms=140.0, knee_db=8.0, makeup_db=0.0, return_gr=True)
    x = eq(x, [("lshelf", 90, 0.7, 0.3), ("peak", 230, 0.7, 2.0), ("hshelf", 5500, 0.7, air_db)])
    x = fx.mono_below(x, 120.0)
    if fade is not None:
        a, b = fade
        n = x.shape[0]
        g = np.ones(n)
        i0, i1 = int(a * SR), min(int(b * SR), n)
        u = np.linspace(0, 1, i1 - i0)
        g[i0:i1] = np.cos(u * np.pi / 2) ** 2
        g[i1:] = 0.0
        x = x * g[:, None]
    return x, float(gr.min())


def master_final(x, target_lufs=-14.0, ceiling_db=CEILING_DB):
    """Soft clip + true-peak limiter with the gain chosen so integrated loudness hits the target."""
    meter = pyln.Meter(SR)
    store = {}

    def render(gain_db):
        y = x * db(gain_db)
        y, gl = fx.limiter(_soft(y), ceiling_db, look_ms=1.5, rel_ms=100.0, return_gr=True)
        store["gl"] = gl
        return y

    g = target_lufs - meter.integrated_loudness(x)
    y = render(g)
    for _ in range(4):
        L = meter.integrated_loudness(y)
        if abs(L - target_lufs) < 0.04:
            break
        g += (target_lufs - L) * 0.95
        y = render(g)
    L = meter.integrated_loudness(y)
    gl_db = 20 * np.log10(np.maximum(store["gl"], 1e-6))
    return y, dict(lufs=L, gain_db=g, lim_gr_max=float(gl_db.min()), lim_gr_gt1=float(np.mean(gl_db < -1.0)), lim_gr_gt3=float(np.mean(gl_db < -3.0)))


def master_chain(mix, target_lufs=-14.0, ceiling_db=CEILING_DB, fade=None):
    x, grmax = master_pre(mix, fade)
    y, info = master_final(x, target_lufs, ceiling_db)
    info["comp_gr_max"] = grmax
    return y, info


def _soft(y, thr=0.8):
    """Gentle soft clip above thr to shave transient peaks before the limiter."""
    a = np.abs(y)
    over = a > thr
    if not over.any():
        return y
    out = y.copy()
    r = 1.0 - thr
    out[over] = np.sign(y[over]) * (thr + r * np.tanh((a[over] - thr) / r))
    return out
