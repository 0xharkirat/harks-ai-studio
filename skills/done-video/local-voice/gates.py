"""numpy ports of the wicksipedia tail-cut and rising-pitch gates (own implementation)."""
import numpy as np, soundfile as sf

FMIN, FMAX, FRAME, HOP, VOICED = 70.0, 350.0, 0.04, 0.01, 0.3

def read(path, target=24000):
    x, sr = sf.read(str(path), always_2d=True)
    x = x.mean(axis=1)
    if sr != target:
        from scipy.signal import resample_poly
        from math import gcd
        g = gcd(sr, target)
        x = resample_poly(x, target // g, sr // g)
        sr = target
    return x.astype(np.float64), sr

def tail_db(x, sr, n=0.06):
    peak = np.abs(x).max() or 1.0
    t = x[-int(n * sr):]
    return 20 * np.log10((np.sqrt((t ** 2).mean()) + 1e-9) / peak)

def trim_end(x, sr, thr_db=-50.0, frame=0.01):
    """Cut trailing/leading silence below thr_db re peak (frame RMS)."""
    peak = np.abs(x).max() or 1.0
    f = int(frame * sr)
    n = len(x) // f
    rms = np.sqrt((x[:n * f].reshape(n, f) ** 2).mean(1)) / peak
    loud = np.where(20 * np.log10(rms + 1e-9) > thr_db)[0]
    if not len(loud):
        return x
    return x[loud[0] * f:(loud[-1] + 1) * f]

def f0_track(x, sr):
    L, H = int(FRAME * sr), int(HOP * sr)
    lo, hi = int(sr / FMAX), int(sr / FMIN)
    times, pit = [], []
    nfft = 1 << (2 * L - 1).bit_length()
    for s in range(0, max(0, len(x) - L), H):
        fr = x[s:s + L]
        fr = fr - fr.mean()
        e = (fr ** 2).sum()
        if e <= 0:
            continue
        F = np.fft.rfft(fr, nfft)
        c = np.fft.irfft(F * np.conj(F))[:L]
        w = c[lo:hi]
        if len(w) == 0:
            continue
        lag = lo + int(w.argmax())
        if c[lag] / e < VOICED:
            continue
        times.append((s + L / 2) / sr)
        pit.append(sr / lag)
    return np.array(times), np.array(pit)

def median_f0(x, sr):
    _, p = f0_track(x, sr)
    return float(np.median(p)) if len(p) else 0.0

def ending_rise(x, sr, window=0.45):
    t, p = f0_track(x, sr)
    if len(p) < 4:
        return 0.0
    m = t >= t[-1] - window
    if m.sum() < 4:
        return 0.0
    return float(np.polyfit(t[m], p[m], 1)[0] * window)

def measure(path):
    x, sr = read(path)
    xt = trim_end(x, sr)
    return {"sec": len(x) / sr, "tail_raw": tail_db(x, sr), "tail": tail_db(xt, sr),
            "rise_raw": ending_rise(x, sr), "rise": ending_rise(xt, sr), "f0": median_f0(x, sr)}

if __name__ == "__main__":
    import sys
    # self-check
    sr = 24000; t = np.arange(sr) / sr
    def sweep(a, b):
        return np.sin(2 * np.pi * np.cumsum(np.linspace(a, b, sr)) / sr) * 8000
    print("up", ending_rise(sweep(150, 260), sr), "down", ending_rise(sweep(260, 150), sr), "f0", median_f0(np.sin(2*np.pi*180*t)*8000, sr))
    for p in sys.argv[1:]:
        print(p, measure(p))
