"""Key, chords, voicings, the hook and the sonic logo. Key: A major (F#m colour in the verses)."""
from __future__ import annotations

STEP = 0.125            # one 16th at 120 BPM
BEAT = 0.5
BAR = 2.0
KEY_PCS = {9, 11, 1, 2, 4, 6, 8}   # A B C# D E F# G#
BPM = 120


def tb(bar: int, step: float = 0.0) -> float:
    """Time in seconds of bar (1-indexed) plus a 16th-step offset."""
    return (bar - 1) * BAR + step * STEP


def tbeat(bar: int, beat: float = 1.0) -> float:
    return (bar - 1) * BAR + (beat - 1.0) * BEAT


def note(name: str) -> int:
    pcs = {"C": 0, "C#": 1, "D": 2, "D#": 3, "E": 4, "F": 5, "F#": 6, "G": 7, "G#": 8, "A": 9, "A#": 10, "B": 11}
    pc = pcs[name[:-1]]
    return 12 * (int(name[-1]) + 1) + pc


# --------------------------------------------------------------------------- chords
# bass: low root (sub range); sw: supersaw/keys voicing under the lead; pad: wide soft voicing.
CHORDS = {
    "A":      dict(bass=33, sw=[57, 61, 64, 69],          pad=[45, 52, 57, 61, 64],      ep=[52, 57, 61, 64],  tones=[0, 4, 7]),
    "Aadd9":  dict(bass=33, sw=[57, 61, 64, 69, 71],      pad=[45, 52, 57, 61, 64, 71],  ep=[52, 57, 61, 64, 71], tones=[0, 2, 4, 7]),
    "A/C#":   dict(bass=37, sw=[57, 61, 64, 69],          pad=[49, 52, 57, 61, 64],      ep=[52, 57, 61, 64],  tones=[0, 4, 7]),
    "E/G#":   dict(bass=32, sw=[56, 59, 64, 68],          pad=[44, 52, 56, 59, 64],      ep=[52, 56, 59, 64],  tones=[0, 4, 7]),
    "E":      dict(bass=40, sw=[56, 59, 64, 68],          pad=[40, 47, 52, 56, 59, 64],  ep=[52, 56, 59, 64],  tones=[0, 4, 7]),
    "Esus4":  dict(bass=40, sw=[57, 59, 64, 69],          pad=[40, 47, 52, 57, 59],      ep=[52, 57, 59, 64],  tones=[0, 5, 7]),
    "F#m7":   dict(bass=30, sw=[57, 61, 64, 66],          pad=[42, 49, 57, 61, 64],      ep=[49, 57, 61, 64],  tones=[0, 3, 7, 10]),
    "F#m9":   dict(bass=30, sw=[57, 61, 64, 68],          pad=[42, 49, 57, 61, 64, 68],  ep=[49, 57, 61, 64, 68], tones=[0, 3, 7, 10, 14]),
    "Dadd9":  dict(bass=38, sw=[57, 62, 64, 66, 69],      pad=[38, 50, 57, 62, 66, 69],  ep=[50, 57, 62, 66],  tones=[0, 2, 4, 7]),
    "Dmaj7":  dict(bass=38, sw=[50, 57, 61, 66],          pad=[38, 50, 57, 61, 66],      ep=[50, 57, 61, 66],  tones=[0, 4, 7, 11]),
    "Bm7":    dict(bass=35, sw=[57, 62, 66, 69],          pad=[35, 47, 54, 57, 62],      ep=[50, 57, 62, 66],  tones=[0, 3, 7, 10]),
}

# 4 roots for the pitch-class sets used by plucks/arps (ascending pools E4..E6)
ARP_POOL = {
    "A":     [64, 69, 73, 76, 81, 85],
    "Aadd9": [64, 69, 71, 73, 76, 81],
    "A/C#":  [64, 69, 73, 76, 81, 85],
    "E/G#":  [64, 68, 71, 76, 80, 83],
    "E":     [64, 68, 71, 76, 80, 83],
    "Esus4": [64, 69, 71, 76, 81, 83],
    "F#m7":  [64, 69, 73, 76, 78, 81],
    "F#m9":  [64, 68, 69, 73, 76, 80],
    "Dadd9": [64, 66, 69, 74, 76, 78],
    "Dmaj7": [66, 69, 73, 74, 78, 81],
    "Bm7":   [66, 69, 71, 74, 78, 81],
}

DISPLAY = {
    "Aadd9": "Aadd9", "A": "A", "A/C#": "A/C#", "E/G#": "E/G#", "E": "E", "Esus4": "Esus4",
    "F#m7": "F#m7", "F#m9": "F#m9", "Dadd9": "Dadd9", "Dmaj7": "Dmaj7", "Bm7": "Bm7",
}

# Progressions (one entry per bar; a tuple = two chords splitting the bar).
CHORUS_A = ["A", "E/G#", "F#m7", "Dadd9"]
CHORUS_B = ["A", "E/G#", "F#m7", ("Dadd9", "E")]
VERSE = ["F#m7", "Dmaj7", "A/C#", ("E", "Esus4")]
BRIDGE = ["F#m9", "Dmaj7", "Bm7", ("Esus4", "E")]
BUILD = ["Dmaj7", "E", "F#m7", ("E", "Esus4")]
INTRO = ["F#m9", "Dmaj7"]

# --------------------------------------------------------------------------- hook (lead melody)
# (step in the bar, midi, length in 16ths).  Bars of a 4-bar phrase over A | E/G# | F#m7 | D.
HOOK = {
    0: [(0, 76, 3), (3, 81, 3), (6, 83, 2), (8, 81, 3), (11, 76, 3), (14, 73, 2)],      # E5 A5 B5 . A5 E5 C#5
    1: [(0, 71, 3), (3, 76, 3), (6, 80, 2), (8, 78, 3), (11, 76, 3), (14, 71, 2)],      # B4 E5 G#5 . F#5 E5 B4
    2: [(0, 73, 2), (2, 76, 2), (4, 78, 2), (6, 81, 6), (12, 78, 2), (14, 76, 2)],      # C#5 E5 F#5 A5(long) F#5 E5
}
HOOK_END_OPEN = [(0, 78, 3), (3, 76, 3), (6, 74, 2), (8, 76, 8)]                         # F#5 E5 D5 E5(long, the 9th)
HOOK_END_TURN = [(0, 78, 3), (3, 76, 3), (6, 74, 2), (8, 76, 3), (11, 80, 3), (14, 83, 2)]   # ... E G# B up into the next bar
HOOK_TAG = [(0, 81, 14)]                                                                # A5 held: resolution on the final chord


def hook_bar(i: int, ending: str = "open"):
    """Notes of bar i (0..3) of the hook phrase."""
    if i < 3:
        return HOOK[i]
    return HOOK_END_OPEN if ending == "open" else HOOK_END_TURN


# --------------------------------------------------------------------------- sonic logo
# E5 A5 B5 . C#6 . E6 bloom (A major bell chord). Offsets in seconds from the logo start, on the 16th grid:
# three quick notes (the first three notes of the hook), then C#6 and the high E6 on the 8th grid.
LOGO_NOTES = [(0.000, 76), (0.125, 81), (0.250, 83), (0.500, 85), (0.750, 88)]
LOGO_BLOOM = [81, 85]            # held under the final note (A5, C#6) beside E6
LOGO_LEN = 1.5                   # last note at 0.75 s, main body rings to about 1.5 s; tail is natural
