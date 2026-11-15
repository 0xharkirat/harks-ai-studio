"""timing.json, envelopes.json and overview.png."""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from scipy import signal

from engine.dsp import SR
from .theory import BPM, CHORDS, DISPLAY, LOGO_BLOOM, LOGO_NOTES


def _r(t):
    return round(float(t), 4)


def _q(d):
    """Note length rounded to the 16th grid (the sounding length is a hair shorter for the release)."""
    return _r(max(round(float(d) / 0.125), 1) * 0.125)


def timing(S):
    ev = S.ev
    chords = {}
    keys = {}
    for e in ev["chord"]:
        if e.get("transpose", 0) != 0:
            continue
        k = (round(e["t"], 4), e["name"])
        if e["style"] == "ep":
            keys[k] = max(keys.get(k, 0.0), e["dur"])      # piano stabs are rhythm, not harmony changes
        else:
            chords[k] = max(chords.get(k, 0.0), e["dur"])
    chord_list = [dict(t=_r(t), dur=_q(d), name=DISPLAY.get(n, n)) for (t, n), d in sorted(chords.items())]
    key_list = [dict(t=_r(t), dur=_q(d), name=DISPLAY.get(n, n)) for (t, n), d in sorted(keys.items())]
    lead = [dict(t=_r(e["t"]), dur=_q(e["dur"]), midi=int(e["midi"])) for e in sorted(ev["lead"], key=lambda e: e["t"]) if e["layer"] in ("main", "tag")]
    lead_layers = [dict(t=_r(e["t"]), dur=_q(e["dur"]), midi=int(e["midi"]), layer=e["layer"]) for e in sorted(ev["lead"], key=lambda e: e["t"]) if e["layer"] not in ("main", "tag")]
    logo = []
    logo_starts = []
    for e in ev["logo"]:
        if e.get("teaser"):
            for i, (off, m) in enumerate(LOGO_NOTES[:4]):
                nxt = LOGO_NOTES[i + 1][0] if i + 1 < len(LOGO_NOTES) else off + 0.25
                logo.append(dict(t=_r(e["t"] + off), dur=_r(nxt - off), midi=m, teaser=True, index=i))
            continue
        logo_starts.append(_r(e["t"]))
        for i, (off, m) in enumerate(LOGO_NOTES):
            last = i == len(LOGO_NOTES) - 1
            nxt = LOGO_NOTES[i + 1][0] if not last else off + 2.0
            logo.append(dict(t=_r(e["t"] + off), dur=_r(nxt - off), midi=m, index=i))
        for m in LOGO_BLOOM:
            logo.append(dict(t=_r(e["t"] + LOGO_NOTES[-1][0]), dur=2.0, midi=m, index=4, bloom=True))
    logo.sort(key=lambda x: (x["t"], x["midi"]))
    foley = [{k: v for k, v in e.items()} for e in getattr(S, "foley", [])]
    for e in foley:
        e["t"] = _r(e["t"])
    bass = [dict(t=_r(e["t"]), dur=_q(e["dur"]), midi=int(e["midi"])) for e in sorted(ev["bass"], key=lambda e: e["t"])]
    out = dict(
        bpm=BPM / S.time_scale, timeScale=S.time_scale, beatsPerBar=4, sampleRate=SR, duration=S.file_dur,
        musicDuration=S.music_dur,
        sections=[dict(id=s["id"], name=s["name"], startBar=s["startBar"], endBar=s["endBar"], start=_r(s["start"]), end=_r(s["end"])) for s in S.sections],
        events=dict(
            kick=sorted(_r(e["t"]) for e in ev["kick"]),
            snare=sorted(_r(e["t"]) for e in ev["snare"]),
            clap=sorted(_r(e["t"]) for e in ev["clap"]),
            hatClosed=sorted(_r(e["t"]) for e in ev["hatClosed"]),
            hatOpen=sorted(_r(e["t"]) for e in ev["hatOpen"]),
            crash=sorted({_r(e["t"]) for e in ev["crash"]} | {_r(e["t"]) for e in ev["finalChord"]} | {_r(e["t"]) for e in ev["accent"]} | {_r(e["t"]) for e in ev["hit"]}),
            impact=sorted(_r(e["t"]) for e in ev["impact"]),
            endHit=sorted(_r(e["t"]) for e in ev["endHit"]),
            finalChord=sorted(_r(e["t"]) for e in ev["finalChord"]),
            accent=sorted(_r(e["t"]) for e in ev["accent"]),
            hit=sorted(_r(e["t"]) for e in ev["hit"]),
            riser=[dict(start=_r(e["start"]), end=_r(e["end"])) for e in sorted(ev["riser"], key=lambda e: e["start"])],
            swell=[dict(start=_r(e["start"]), end=_r(e["end"])) for e in sorted(ev["swell"], key=lambda e: e["start"])],
            stop=[dict(start=_r(a), end=_r(b)) for a, b in S.stops],
            foley=foley,
            chords=chord_list,
            keys=key_list,
            lead=lead,
            leadLayers=lead_layers,
            logo=logo,
            logoStart=logo_starts,
            bass=bass,
            shaker=sorted(_r(e["t"]) for e in ev["shaker"]),
            rim=sorted(_r(e["t"]) for e in ev["rim"]),
            tick=sorted(_r(e["t"]) for e in ev["tick"]),
            tom=sorted(_r(e["t"]) for e in ev["tom"]),
            arp=[dict(t=_r(e["t"]), dur=_q(e["dur"]), midi=int(e["midi"])) for e in sorted(ev["arp"], key=lambda e: e["t"])],
        ),
    )
    return out


def write_timing(S, path: Path):
    path.write_text(json.dumps(timing(S), indent=1))


# --------------------------------------------------------------------------- envelopes


def frame_rms(x, n_frames):
    """RMS per 60 fps frame, window centred on frame time i/60 (width 1/60 s)."""
    m = x.mean(axis=1) if x.ndim == 2 else x
    hop = SR // 60
    pad = hop // 2
    mp = np.concatenate([np.zeros(pad), m, np.zeros(hop * n_frames + pad - len(m))])[: hop * n_frames + 2 * pad]
    c = np.concatenate([[0.0], np.cumsum(mp ** 2)])
    idx = np.arange(n_frames) * hop
    e = (c[idx + 2 * pad] - c[idx]) / (2 * pad)
    return np.sqrt(np.maximum(e, 0.0))


def onset_curve(x, n_frames):
    m = x.mean(axis=1) if x.ndim == 2 else x
    hop = SR // 60
    f, t, Z = signal.stft(m, SR, nperseg=1024, noverlap=1024 - hop, boundary="zeros", padded=False)
    mag = np.log1p(np.abs(Z) * 30.0)
    flux = np.maximum(0, np.diff(mag, axis=1, prepend=mag[:, :1])).sum(axis=0)
    # stft frame k is centred at k*hop (boundary zeros) -> frame i == i/60 s
    out = np.zeros(n_frames)
    k = min(n_frames, len(flux))
    out[:k] = flux[:k]
    p = np.percentile(out, 99.5)
    return np.clip(out / (p + 1e-12), 0, 1)


def norm_env(e):
    m = e.max()
    return e / m if m > 0 else e


def write_envelopes(S, post, master, path: Path):
    n_frames = int(round(S.file_dur * 60))
    groups = {
        "master": [master],
        "kick": [post["kick"]],
        "snare": [post["snare"]],
        "hats": [post["hats"], post["perc"]],
        "bass": [post["bass"]],
        "chords": [post["chords"], post["keys"]],
        "arp": [post["arp"]],
        "lead": [post["lead"]],
        "fx": [post["fx"]],
        "foley": [post["foley"]],
        "logo": [post["logo"]],
    }
    out = dict(fps=60, frames=n_frames, duration=S.file_dur)
    for k, parts in groups.items():
        tot = sum(p for p in parts)
        out[k] = [round(float(v), 4) for v in norm_env(frame_rms(tot, n_frames))]
    out["onset"] = [round(float(v), 4) for v in onset_curve(master, n_frames)]
    path.write_text(json.dumps(out, separators=(",", ":")))


# --------------------------------------------------------------------------- overview


def overview_png(S, audio, path: Path, name: str):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from . import analysis as A

    fig, axes = plt.subplots(3, 1, figsize=(16, 9.5), sharex=True, gridspec_kw=dict(height_ratios=[1.1, 2.2, 1.2]))
    dur = audio.shape[0] / SR
    m = audio.mean(axis=1)
    # waveform (min/max per ~10 ms)
    hop = 480
    n = len(m) // hop
    seg = m[: n * hop].reshape(n, hop)
    tt = (np.arange(n) + 0.5) * hop / SR
    axes[0].fill_between(tt, seg.min(axis=1), seg.max(axis=1), color="#2b6cb0", lw=0)
    axes[0].set_ylim(-1, 1)
    axes[0].set_ylabel("waveform")
    f, t, Z = signal.stft(m, SR, nperseg=4096, noverlap=3072)
    P = 20 * np.log10(np.abs(Z) + 1e-7)
    axes[1].pcolormesh(t, f, P, vmin=-110, vmax=-30, shading="auto", cmap="magma")
    axes[1].set_yscale("symlog", linthresh=200)
    axes[1].set_ylim(30, 20000)
    axes[1].set_ylabel("Hz")
    ts, ls = A.momentary_curve(audio)
    axes[2].plot(ts, ls, color="#999", lw=0.8, label="momentary power (dB)")
    st, sl = A.short_term(audio)
    axes[2].plot(st, sl, color="#e53e3e", lw=1.8, label="short-term LUFS (3 s)")
    axes[2].axhline(-14, color="#38a169", ls="--", lw=1, label="-14 LUFS")
    axes[2].set_ylim(-45, 0)
    axes[2].set_ylabel("dB")
    axes[2].legend(loc="lower right", fontsize=8)
    axes[2].set_xlabel("seconds")
    for ax in axes:
        for s in S.sections:
            ax.axvline(s["start"], color="w" if ax is axes[1] else "#444", lw=0.7, alpha=0.8)
    for s in S.sections:
        axes[0].text(s["start"] + 0.1, 0.78, s["id"], fontsize=8, color="#222")
    for a, b in S.stops:
        for ax in axes:
            ax.axvspan(a, b, color="#f6ad55", alpha=0.35)
    axes[0].set_title(f"{name}  ({dur:.2f} s)  sections / stops (orange)")
    axes[0].set_xlim(0, dur)
    fig.tight_layout()
    fig.savefig(path, dpi=90)
    plt.close(fig)
