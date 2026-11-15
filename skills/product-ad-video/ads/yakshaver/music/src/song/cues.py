"""Arrangements for the four cues. Every cue is built from the same blocks, the same hook and sounds."""
from __future__ import annotations

import math

from . import blocks as B
from .score import Score
from .theory import (BAR, BEAT, BRIDGE, BUILD, CHORUS_A, CHORUS_B, HOOK_TAG, INTRO, STEP, VERSE,
                     tb, tbeat)


def _third_below(m):
    """Diatonic third below in A major."""
    scale = [9, 11, 1, 2, 4, 6, 8]
    # find index of this pitch class
    pc = m % 12
    i = scale.index(pc)
    tgt = scale[(i - 2) % 7]
    d = (pc - tgt) % 12
    return m - d


def harmony(S, bar, n_bars=4, ending="turn", vel=0.5):
    from .theory import hook_bar
    for i in range(n_bars):
        for step, m, ln in hook_bar(i, ending):
            S.lead(tb(bar + i, step), ln * STEP * 0.98, _third_below(m), vel=vel, layer="harm", vib=0.6, bright=0.7)


def cut(S, kinds, t0, t1):
    for k in kinds:
        S.ev[k] = [e for e in S.ev[k] if not (t0 - 1e-9 <= e["t"] < t1 - 1e-9)]


def logo_focus(S, t0, t1, chords_db=-4.0, bass_db=-1.5, logo_db=1.5):
    """Duck the sustained chord/bass a little under the sonic logo and lift the logo so the motif reads clearly."""
    S.stem_gain("chords", t0, t1, chords_db, ramp=0.15)
    S.stem_gain("bass", t0, t1, bass_db, ramp=0.15)
    S.stem_gain("logo", t0, t1, logo_db, ramp=0.1)


def pedal_arp(S, t0, t1, notes=(76, 76, 83, 76), v0=0.3, v1=0.85):
    """Rising 16th-note pluck pedal (tension in a build)."""
    n = int(round((t1 - t0) / STEP))
    for i in range(n):
        u = i / max(n - 1, 1)
        S.arp(t0 + i * STEP, STEP * 0.9, notes[i % len(notes)], vel=v0 + (v1 - v0) * u ** 1.4)


# --------------------------------------------------------------------------- anthem


def anthem() -> Score:
    S = Score("anthem", 31, 64.0)
    S.section("open", "Cold open", 1, 2)
    S.section("title", "Title", 3, 4)
    S.section("verse", "Verse: the problem", 5, 8)
    S.section("chorus1a", "Chorus 1: visual editing", 9, 12)
    S.section("chorus1b", "Chorus 1: blocks", 13, 16)
    S.section("bridge", "Bridge: Git", 17, 20)
    S.section("build", "Build: developers", 21, 24)
    S.section("chorus2", "Final chorus: proof", 25, 28)
    S.section("outro", "Outro: call to action", 29, 31)
    S.fade_out = (62.6, 63.9)

    # ---- bars 1-2: cold open
    S.chord(tb(1), 2.0, "F#m9", "pad", vel=0.8, cutoff=1300.0, atk=0.9, rel=0.6, voicing="sw")
    S.chord(tb(2), 1.5, "Dmaj7", "pad", vel=0.8, cutoff=1300.0, atk=0.3, rel=0.4, voicing="sw")
    S.bass(tb(1), 1.9, 30, "sub", vel=0.32)
    S.bass(tb(2), 1.45, 38, "sub", vel=0.32)
    S.logo(0.5, vel=0.8, teaser=True)
    S.riser(tb(2), 3.5, "noise", pitch=(57, 93), vel=0.9)
    S.stop(3.5, 4.0)
    S.set_auto("chords", "lp", [(0.0, 500.0), (3.5, 3200.0)])
    S.set_auto("chords", "gain", [(0.0, -9.0), (3.5, -2.0)])

    # ---- bars 3-4: title
    S.impact(4.0, "big")
    S.crash(4.0, 0.8)
    S.logo(4.0)
    S.chord(4.0, 3.0, "Aadd9", "saw", vel=0.7, cutoff=4200.0, snap=0.8, atk=0.02, rel=0.5, spread=0.9)
    S.chord(4.0, 3.0, "Aadd9", "pad", vel=0.8, cutoff=1800.0, atk=0.15, rel=0.8)
    S.chord(7.0, 1.0, "E/G#", "saw", vel=0.7, cutoff=4200.0, snap=0.5, atk=0.02, rel=0.4, spread=0.9)
    S.chord(7.0, 1.0, "E/G#", "pad", vel=0.8, cutoff=1800.0, atk=0.1, rel=0.6)
    S.bass(4.0, 1.9, 33, "sub", vel=0.8)
    S.bass(6.0, 0.9, 33, "sub", vel=0.8)
    S.bass(7.0, 0.95, 32, "sub", vel=0.8)
    B.d_light(S, 4, 1, 0.9)
    S.duck(6.0, 8.0, depth=0.35, tau=0.12)
    logo_focus(S, 4.4, 6.5)

    # ---- bars 5-8: verse (cool, mechanical)
    prog = VERSE
    B.d_verse(S, 5, 4)
    B.bass_pattern(S, 5, prog, B.BASS_VERSE, "pluck", 0.9)
    B.keys_stabs(S, 5, prog, [(0, 1.0), (3, 0.7), (6, 0.85), (10, 0.75), (13, 0.7)], vel=0.78)
    B.chords_pad(S, 5, prog, cutoff=1400.0, vel=0.55)
    B.arp_pluck(S, 7, prog[2:], B.ARP_SPARSE, vel=0.5)
    cut(S, ["kick", "snare", "clap", "hatClosed", "hatOpen", "tick", "bass", "arp"], 15.0, 16.0)
    S.swell(15.0, 16.0)
    S.set_auto("chords", "lp", [(15.0, 3200.0), (16.0, 600.0)])
    S.duck(8.0, 15.0, depth=0.3, tau=0.1)

    # ---- bars 9-16: chorus 1
    S.crash(16.0, 1.0)
    S.impact(16.0, "med", 0.9)
    B.d_chorus(S, 9, 7, 1.0)
    B.d_chorus(S, 16, 1, 1.0, fill_last=True)
    S.crash(24.0, 0.85)
    S.whoosh(23.0, 1.0, up=True, vel=0.9)
    B.chords_saw(S, 9, CHORUS_A, cutoff=7500.0, vel=0.95)
    B.chords_saw(S, 13, CHORUS_B, cutoff=8500.0, vel=1.0)
    B.bass_pattern(S, 9, CHORUS_A, B.BASS_OFFBEAT, "subsaw", 1.0)
    B.bass_pattern(S, 13, CHORUS_B, B.BASS_OFFBEAT_B, "subsaw", 1.0)
    B.lead_hook(S, 9, "open")
    B.lead_hook(S, 13, "turn")
    B.arp_pluck(S, 13, CHORUS_B, B.ARP_UP, vel=0.55)
    harmony(S, 13, 4, "turn", 0.38)
    S.duck(16.0, 32.0, depth=0.62, tau=0.12)

    # ---- bars 17-20: bridge (Git): half-time, filtered, mechanical
    B.d_half(S, 17, 4, 1.0)
    B.chords_saw(S, 17, BRIDGE, cutoff=5000.0, vel=0.7, snap=0.0, atk=0.03)
    B.bass_pattern(S, 17, BRIDGE, B.BASS_HALF, "sub", 0.95)
    B.arp_pluck(S, 17, BRIDGE, B.ARP_MECH, vel=0.62)
    S.set_auto("chords", "lp", [(32.0, 650.0), (38.0, 900.0), (40.0, 3000.0)])
    S.duck(32.0, 40.0, depth=0.45, tau=0.14)
    S.stem_gain("bass", 32.0, 40.0, -3.0)

    # ---- bars 21-24: build
    B.d_build(S, 21, 2, 1.0)
    B.d_build(S, 23, 2, 1.0)
    cut(S, ["kick", "clap", "snare", "hatClosed", "hatOpen"], 46.0, 48.0)
    cut(S, ["kick", "clap", "hatClosed", "hatOpen"], 44.0, 46.0)
    for s in (0, 4, 8, 12):
        S.kick(tb(23, s), 0.95)
    B.snare_roll(S, tb(23), tb(24), 0.25, 0.25, 0.7)
    B.snare_roll(S, tb(24), tbeat(24, 4), 0.125, 0.6, 1.0)
    B.chords_saw(S, 21, BUILD, cutoff=6000.0, vel=0.95, snap=0.2)
    B.bass_pattern(S, 21, BUILD[:3], B.BASS_OFFBEAT, "subsaw", 0.95)
    B.bass_pattern(S, 24, [("E", "E")], [(2, 0, 3, 1.0), (6, 0, 3, 0.95)], "subsaw", 0.9)
    B.arp_pluck(S, 21, BUILD, B.ARP_16, vel=0.5)
    pedal_arp(S, 44.0, 47.5)
    S.riser(38.0, 47.5, "noise", pitch=(45, 93), vel=1.0)
    S.stop(47.5, 48.0)
    S.set_auto("chords", "hp", [(40.0, 20.0), (47.5, 1400.0)])
    S.duck(40.0, 46.0, depth=0.5, tau=0.11)
    S.duck(46.0, 47.5, depth=0.2, tau=0.11)

    # ---- bars 25-28: final chorus
    S.crash(48.0, 1.0)
    S.impact(48.0, "big", 1.0)
    S.crash(52.0, 0.9)
    B.d_chorus(S, 25, 3, 1.15)
    B.d_chorus(S, 28, 1, 1.15, fill_last=True)
    B.chords_saw(S, 25, CHORUS_B, cutoff=9500.0, vel=1.05, spread=1.15)
    for entry_i, entry in enumerate(CHORUS_B):
        pass
    B.chords_saw(S, 25, CHORUS_B, cutoff=12000.0, vel=0.38, spread=1.3, hp=420.0)
    # octave-up supersaw layer
    for i, entry in enumerate(CHORUS_B):
        b = 25 + i
        if isinstance(entry, tuple):
            for j, nm in enumerate(entry):
                S.chord(tb(b, 8 * j), 0.98, nm, "saw", vel=0.34, cutoff=11000.0, snap=0.2, spread=1.4, hp=500.0, transpose=12, atk=0.015, rel=0.25)
        else:
            S.chord(tb(b), 1.98, entry, "saw", vel=0.34, cutoff=11000.0, snap=0.2, spread=1.4, hp=500.0, transpose=12, atk=0.015, rel=0.3)
    B.bass_pattern(S, 25, CHORUS_B, B.BASS_OFFBEAT_B, "subsaw", 1.05)
    B.lead_hook(S, 25, "turn", vel=1.0)
    B.lead_hook(S, 25, "turn", transpose=12, vel=0.4, layer="oct")
    harmony(S, 25, 4, "turn", 0.5)
    B.arp_pluck(S, 25, CHORUS_B, B.ARP_UP, vel=0.62)
    S.duck(48.0, 56.0, depth=0.68, tau=0.12)

    # ---- bars 29-31: outro
    S.boom(56.0, 0.9)
    S.chord(56.0, 4.0, "Aadd9", "saw", vel=1.0, cutoff=9000.0, snap=0.4, atk=0.02, rel=1.8, spread=1.1)
    S.chord(56.0, 4.0, "Aadd9", "pad", vel=0.9, cutoff=2400.0, atk=0.2, rel=1.8)
    S.bass(56.0, 3.8, 33, "sub", vel=1.0)
    S.lead(56.0, 1.8, 81, vel=0.9, layer="tag", vib=1.0)
    S.kick(56.0, 1.0)
    S.kick(57.0, 0.9)
    S.clap(57.0, 0.7)
    for s in (0, 2, 4, 6, 8, 10, 12, 14):
        S.hatC(tb(29, s), 0.38 - 0.02 * s / 2)
    S.logo(58.0)
    S.swell(57.4, 58.0, vel=0.45)
    S.endhit(60.0)
    S.chord(60.0, 0.6, "Aadd9", "saw", vel=0.5, cutoff=5000.0, snap=0.0, atk=0.01, rel=1.2, spread=0.9)
    S.set_auto("chords", "gain", [(60.0, 0.0), (62.0, -9.0)])
    logo_focus(S, 57.9, 61.0)
    S.duck(56.0, 58.0, depth=0.5, tau=0.12)
    S.plan((0.0, 2.0, -12.0), (2.0, 3.5, -9.0),
           (4.0, 4.5, -0.5), (4.5, 6.0, -5.5), (6.0, 15.0, -6.0), (15.0, 16.0, -8.0),
           (16.0, 16.5, 1.5), (16.5, 32.0, 0.0), (32.0, 38.0, -6.5), (38.0, 40.0, -5.0), (40.0, 44.0, -4.0), (44.0, 47.5, -2.0),
           (48.0, 48.5, 2.7), (48.5, 56.0, 1.2),
           (56.0, 56.5, 1.0), (56.5, 58.0, -0.5), (58.0, 60.0, -4.5), (60.0, 62.0, -6.5))
    return S



# --------------------------------------------------------------------------- anthem v2


def anthem2(k: float = 1.2) -> Score:
    """The anthem after the v1 review: written on the 120 BPM design grid (54 s), played at 100 BPM (retime k = 1.2).
    No silent stops (only a 16th breath before each drop), a 5-bar verse with a pre-chorus bar for the llama's
    answer, then visual editing, Git, a 2-bar build for the frameworks, the final chorus and the end card."""
    S = Score("anthem2", 27, 54.0)
    S.section("open", "Cold open", 1, 2)
    S.section("title", "Title", 3, 4)
    S.section("verse", "Verse: the problem, the llama's answer", 5, 9)
    S.section("chorus1", "Chorus 1: visual editing", 10, 13)
    S.section("bridge", "Bridge: Git", 14, 17)
    S.section("build", "Build: frameworks", 18, 19)
    S.section("chorus2", "Final chorus: proof", 20, 23)
    S.section("outro", "Outro: call to action", 24, 27)
    S.fade_out = (50.8, 53.9)
    S.target_lufs = -16.0
    S.ceiling_db = -2.4   # the AAC encode adds about 0.8 dB; delivery needs -1 dBTP or lower

    # ---- bars 1-2: cold open (a still half-beat, then the typing)
    S.chord(tb(1), 2.0, "F#m9", "pad", vel=0.8, cutoff=1300.0, atk=0.9, rel=0.6, voicing="sw")
    S.chord(tb(2), 1.9, "Dmaj7", "pad", vel=0.8, cutoff=1300.0, atk=0.3, rel=0.4, voicing="sw")
    S.bass(tb(1), 1.9, 30, "sub", vel=0.32)
    S.bass(tb(2), 1.85, 38, "sub", vel=0.32)
    S.logo(0.5, vel=0.8, teaser=True)
    S.riser(tb(2), 3.875, "noise", pitch=(57, 93), vel=0.9)
    pre_impact_stop(S, 4.0)
    S.set_auto("chords", "lp", [(0.0, 500.0), (3.875, 3200.0)])
    S.set_auto("chords", "gain", [(0.0, -9.0), (3.875, -2.0)])

    # ---- bars 3-4: title
    S.impact(4.0, "big")
    S.crash(4.0, 0.8)
    S.logo(4.0)
    S.chord(4.0, 3.0, "Aadd9", "saw", vel=0.7, cutoff=4200.0, snap=0.8, atk=0.02, rel=0.5, spread=0.9)
    S.chord(4.0, 3.0, "Aadd9", "pad", vel=0.8, cutoff=1800.0, atk=0.15, rel=0.8)
    S.chord(7.0, 1.0, "E/G#", "saw", vel=0.7, cutoff=4200.0, snap=0.5, atk=0.02, rel=0.4, spread=0.9)
    S.chord(7.0, 1.0, "E/G#", "pad", vel=0.8, cutoff=1800.0, atk=0.1, rel=0.6)
    S.bass(4.0, 1.9, 33, "sub", vel=0.8)
    S.bass(6.0, 0.9, 33, "sub", vel=0.8)
    S.bass(7.0, 0.95, 32, "sub", vel=0.8)
    B.d_light(S, 4, 1, 0.9)
    S.duck(6.0, 8.0, depth=0.35, tau=0.12)
    logo_focus(S, 4.4, 6.5)

    # ---- bars 5-8: verse (cool, mechanical); bar 9: pre-chorus on E while the llama answers
    prog = VERSE
    B.d_verse(S, 5, 4)
    B.bass_pattern(S, 5, prog, B.BASS_VERSE, "pluck", 0.9)
    B.keys_stabs(S, 5, prog, [(0, 1.0), (3, 0.7), (6, 0.85), (10, 0.75), (13, 0.7)], vel=0.78)
    B.chords_pad(S, 5, prog, cutoff=1400.0, vel=0.55)
    B.arp_pluck(S, 7, prog[2:], B.ARP_SPARSE, vel=0.5)
    S.duck(8.0, 16.0, depth=0.3, tau=0.1)
    S.chord(16.0, 1.0, "Esus4", "pad", vel=0.75, cutoff=1800.0, atk=0.1, rel=0.4)
    S.chord(17.0, 0.875, "E", "pad", vel=0.8, cutoff=2200.0, atk=0.05, rel=0.3)
    S.bass(16.0, 1.85, 40, "sub", vel=0.6)
    B.d_verse(S, 9, 1, 0.8)
    cut(S, ["kick", "snare", "clap", "hatClosed", "hatOpen", "tick"], 17.0, 18.0)
    pedal_arp(S, 16.0, 17.875, v0=0.25, v1=0.7)
    B.snare_roll(S, 17.0, 17.875, 0.125, 0.25, 0.8)
    S.riser(16.0, 17.875, "noise", pitch=(57, 93), vel=0.75)
    S.set_auto("chords", "lp", [(16.0, 3200.0), (17.875, 1500.0)])
    pre_impact_stop(S, 18.0)

    # ---- bars 10-13: chorus 1 (visual editing)
    S.crash(18.0, 1.0)
    S.impact(18.0, "med", 0.9)
    B.d_chorus(S, 10, 3, 1.0)
    B.d_chorus(S, 13, 1, 1.0, fill_last=True)
    S.whoosh(25.0, 1.0, up=True, vel=0.9)
    B.chords_saw(S, 10, CHORUS_A, cutoff=7500.0, vel=0.95)
    B.bass_pattern(S, 10, CHORUS_A, B.BASS_OFFBEAT, "subsaw", 1.0)
    B.lead_hook(S, 10, "open")
    B.arp_pluck(S, 10, CHORUS_A, B.ARP_UP, vel=0.45)
    S.duck(18.0, 26.0, depth=0.62, tau=0.12)

    # ---- bars 14-17: bridge (Git): half-time, filtered, mechanical
    S.crash(26.0, 0.8)
    B.d_half(S, 14, 4, 1.0)
    B.chords_saw(S, 14, BRIDGE, cutoff=5000.0, vel=0.7, snap=0.0, atk=0.03)
    B.bass_pattern(S, 14, BRIDGE, B.BASS_HALF, "sub", 0.95)
    B.arp_pluck(S, 14, BRIDGE, B.ARP_MECH, vel=0.62)
    S.set_auto("chords", "lp", [(26.0, 650.0), (32.0, 900.0), (34.0, 3000.0)])
    S.duck(26.0, 34.0, depth=0.45, tau=0.14)
    S.stem_gain("bass", 26.0, 34.0, -3.0)

    # ---- bars 18-19: build (frameworks)
    B.d_build(S, 18, 2, 1.0)
    cut(S, ["kick", "clap", "snare", "hatClosed", "hatOpen"], 36.0, 38.0)
    for s in (0, 4, 8, 12):
        S.kick(tb(19, s), 0.95)
    B.snare_roll(S, tb(19), tbeat(19, 4), 0.125, 0.5, 1.0)
    B.chords_saw(S, 18, BUILD[2:], cutoff=6000.0, vel=0.95, snap=0.2)
    B.bass_pattern(S, 18, [BUILD[2]], B.BASS_OFFBEAT, "subsaw", 0.95)
    B.bass_pattern(S, 19, [("E", "E")], [(2, 0, 3, 1.0), (6, 0, 3, 0.95)], "subsaw", 0.9)
    B.arp_pluck(S, 18, BUILD[2:], B.ARP_16, vel=0.5)
    pedal_arp(S, 36.0, 37.875)
    S.riser(32.0, 37.875, "noise", pitch=(45, 93), vel=1.0)
    pre_impact_stop(S, 38.0)
    S.set_auto("chords", "hp", [(34.0, 20.0), (37.875, 1400.0)])
    S.duck(34.0, 37.0, depth=0.5, tau=0.11)
    S.duck(37.0, 37.875, depth=0.2, tau=0.11)

    # ---- bars 20-23: final chorus
    S.crash(38.0, 1.0)
    S.impact(38.0, "big", 1.0)
    S.crash(42.0, 0.9)
    B.d_chorus(S, 20, 3, 1.15)
    B.d_chorus(S, 23, 1, 1.15, fill_last=True)
    B.chords_saw(S, 20, CHORUS_B, cutoff=9500.0, vel=1.05, spread=1.15)
    B.chords_saw(S, 20, CHORUS_B, cutoff=12000.0, vel=0.38, spread=1.3, hp=420.0)
    for i, entry in enumerate(CHORUS_B):   # octave-up supersaw layer
        b = 20 + i
        if isinstance(entry, tuple):
            for j, nm in enumerate(entry):
                S.chord(tb(b, 8 * j), 0.98, nm, "saw", vel=0.34, cutoff=11000.0, snap=0.2, spread=1.4, hp=500.0, transpose=12, atk=0.015, rel=0.25)
        else:
            S.chord(tb(b), 1.98, entry, "saw", vel=0.34, cutoff=11000.0, snap=0.2, spread=1.4, hp=500.0, transpose=12, atk=0.015, rel=0.3)
    B.bass_pattern(S, 20, CHORUS_B, B.BASS_OFFBEAT_B, "subsaw", 1.05)
    B.lead_hook(S, 20, "turn", vel=1.0)
    B.lead_hook(S, 20, "turn", transpose=12, vel=0.4, layer="oct")
    harmony(S, 20, 4, "turn", 0.5)
    B.arp_pluck(S, 20, CHORUS_B, B.ARP_UP, vel=0.62)
    S.duck(38.0, 46.0, depth=0.68, tau=0.12)

    # ---- bars 24-27: outro (end card): the logo, then the chord fades out, with no second hit
    final_chord(S, 46.0, 2.0, 4.0, 8.0, end_hit=False)   # the notes ring to the end; the master fade ends them
    for s in (0, 2, 4, 6, 8, 10, 12, 14):
        S.hatC(tb(24, s), 0.38 - 0.02 * s / 2)
    # One chords gain curve from the logo duck into the fade. It replaces the duck's own chords segment:
    # 2 overlapping segments override each other, and the jump back to 0 dB sounded like a glitch.
    S.set_auto("chords", "gain", [(47.75, 0.0), (47.9, -4.0), (50.0, -4.0), (52.5, -12.0), (54.0, -12.0)])
    S.plan((0.0, 2.0, -12.0), (2.0, 3.875, -9.0),
           (4.0, 4.5, -0.5), (4.5, 6.0, -5.5), (6.0, 16.0, -6.0), (16.0, 17.875, -5.0),
           (18.0, 18.5, 1.5), (18.5, 26.0, 0.0), (26.0, 32.0, -6.5), (32.0, 34.0, -5.0), (34.0, 36.0, -4.0), (36.0, 37.875, -2.0),
           (38.0, 38.5, 2.7), (38.5, 46.0, 1.2),
           (46.0, 46.5, 1.0), (46.5, 48.0, -0.5), (48.0, 50.0, -4.5))
    # No plan segment after 50.0: the planner would lift the fading chord to its target (a +9.6 dB jump at 1:00);
    # past the last segment the trim holds, so the tail decays naturally.
    # Round 4: the bed sits 3 dB lower, so every pop, click and typing run reads over it (the master stays -16 LUFS).
    S.music_trim = -3.0
    return S.retime(k)


# Round 5 (2026-11-11): the product owner found the music too intense; a reviewer heard 3 bumps (0:04, 0:22, 0:46), the drops,
# where the bed jumped 8-9 dB in under 1 s. These 2 versions keep the song, its sections, the beat grid and the
# sonic logo (so the picture stays in sync) and take the hype out. They share anthem2's sound effects.
DROPS = (4.0, 18.0, 38.0)   # design time


def _calm(S: Score, name: str, chill: bool) -> Score:
    """No stop, riser, impact, snare roll or fill into a drop; soft cymbals; light sidechain; darker synths; and a level
    plan with a 6 dB range (anthem2: 15 dB), so no section change is more than 2.5 dB. `chill` also swaps the dance
    kit for a light groove (kick on 1 and 3, a rim on 4), the supersaws for pads and the saw bass for a sub."""
    k = S.time_scale
    S.name = name
    S.foley_from = "anthem2"
    d = lambda e: e["t"] / k   # design time
    near = lambda e, before: any(x - before <= d(e) < x for x in DROPS)
    for key in ("impact", "riser", "stop", "tom"):
        S.ev[key] = []
    S.stops = []
    for e in S.ev["crash"]:
        e["vel"] *= 0.3
    # The snare rolls and fills into each drop, and half of the rising pluck pedal.
    S.ev["snare"] = [e for e in S.ev["snare"] if not near(e, 2.0)]
    S.ev["clap"] = [e for e in S.ev["clap"] if not near(e, 0.25)]
    for e in S.ev["arp"]:
        if near(e, 2.0):
            e["vel"] *= 0.5
    for dk in S.ducks:
        dk["depth"] *= 0.3 if chill else 0.4
    # The final chorus loses its octave-up and bright supersaw layers and the octave lead.
    S.ev["chord"] = [e for e in S.ev["chord"] if not (e["style"] == "saw" and 38.0 <= d(e) < 46.0 and (e.get("transpose", 0) == 12 or e.get("hp") == 420.0))]
    S.ev["lead"] = [e for e in S.ev["lead"] if e.get("layer") != "oct"]
    for e in S.ev["chord"]:
        if e["style"] != "saw":
            continue
        if chill:
            for kw in ("snap", "spread", "hp", "voices"):
                e.pop(kw, None)
            e.update(style="pad", cutoff=min(e.get("cutoff", 2200.0), 2200.0), atk=0.06, rel=0.5, vel=e["vel"] * 0.9)
        else:
            e["cutoff"] = e.get("cutoff", 7000.0) * 0.55
            e["vel"] *= 0.85
    for e in S.ev["lead"]:
        e["vel"] *= 0.7 if chill else 0.8
    for e in S.ev["clap"] + S.ev["snare"] + S.ev["hatOpen"] + S.ev["shaker"]:
        e["vel"] *= 0.7
    if chill:
        for e in S.ev["bass"]:
            if e["style"] == "subsaw":
                e["style"] = "sub"
        # A light groove from the first chorus on: kick on beats 1 and 3, a rim on 4, closed hats only.
        busy = lambda e: d(e) >= 18.0 and d(e) < 46.0
        on = lambda e, beats: any(abs(((d(e) - b * 0.5 + 1.0) % 2.0) - 1.0) < 1e-3 for b in beats)
        S.ev["kick"] = [e for e in S.ev["kick"] if not busy(e) or on(e, (0, 2))]
        for e in S.ev["kick"]:
            if busy(e):
                e.update(v="soft", vel=e["vel"] * 0.75)
        for key in ("clap", "snare", "hatOpen", "shaker"):
            S.ev[key] = [e for e in S.ev[key] if not busy(e)]
        for e in S.ev["hatClosed"]:
            if busy(e):
                e["vel"] *= 0.7
        for bar in range(10, 24):
            if tb(bar) < 46.0:
                S.rim(tb(bar, 12) * k, 0.4)
    # anthem2 thins the bar before each drop (drums cut, chords filtered), so the full band lands on a thin bar:
    # that was the bump. Here the chords stay open and a light kit plays through into the drop.
    S.auto[("chords", "lp")] = [seg for seg in S.auto[("chords", "lp")] if abs(seg[-1][0] / k - 17.875) > 1e-3]
    S.auto.pop(("chords", "hp"), None)
    for e in S.ev["kick"]:
        if 36.0 <= d(e) < 38.0:
            e["vel"] *= 0.75
        if any(abs(d(e) - x) < 1e-3 for x in DROPS[1:]):
            e["vel"] *= 0.8
    S.kick(17.0 * k, 0.6, "soft")
    for t0, t1 in ((17.0, 18.0), (36.0, 38.0)):
        for i in range(int(round((t1 - t0) / 0.25))):
            S.hatC((t0 + i * 0.25) * k, 0.36 if i % 2 == 0 else 0.26)
    for t in (17.5, 37.5):
        S.rim(t * k, 0.38)
    # anthem2 also drops the bass for the last bar of the build, so the bass and the kick land together on 0:46.
    # A soft E under that bar keeps the low end going.
    S.bass(37.0 * k, 0.875 * k, 40, "sub", 0.55)
    # Round 6 (Hark: a slight bump at 0:06-0:08): the drums and bass enter on bar 4 (0:07.2) just before the chords
    # come back from under the sonic logo (0:07.8). The chords now come back over 1.5 s, and bar 4 has its own level.
    for key in (("chords", "gain"), ("bass", "gain")):
        for seg in S.auto[key]:
            if abs(seg[0][0] / k - 4.25) < 1e-3:
                seg[-1] = (8.0 * k, 0.0)
    S.energy = [(a * k, b * k, db_) for a, b, db_ in (
        (0.0, 2.0, -6.0), (2.0, 3.875, -5.0),
        (4.0, 4.5, -2.5), (4.5, 6.0, -3.0), (6.0, 8.0, -4.0), (8.0, 16.0, -3.5), (16.0, 17.875, -3.0),
        (18.0, 18.5, -1.0), (18.5, 26.0, -1.0), (26.0, 32.0, -3.5), (32.0, 34.0, -3.0), (34.0, 36.0, -2.5), (36.0, 37.875, -2.0),
        (38.0, 38.5, 0.0), (38.5, 46.0, 0.0),
        (46.0, 46.5, -0.5), (46.5, 48.0, -1.0), (48.0, 50.0, -3.5))]
    S.air_db = 1.0 if chill else 1.5   # anthem2: +3 dB of air (5.5 kHz shelf) in the master
    # Round 6 (Hark): the music at 80% (-1.9 dB) under the sound effects, and the film 2 dB quieter, so the sound
    # effects keep their level and only the music drops. Round 6 also cuts 2 beats of the build (design 36-37): after
    # "Or bring your own." the frame held still for 3 s before the drop.
    S.music_trim = -3.0 + 20 * math.log10(0.8)
    S.target_lufs = -18.0
    S.cut_span(36.0 * k, 37.0 * k)
    return S


def anthem2_soft() -> Score:
    """anthem2, calm: the same arrangement and kit, without the drops' hype."""
    return _calm(anthem2(), "anthem2_soft", chill=False)


def anthem2_chill() -> Score:
    """anthem2, calmer still: pads and a light groove under the same melody."""
    return _calm(anthem2(), "anthem2_chill", chill=True)


def anthem3() -> Score:
    """Round 8 (2026-11-12, "slow everything down, I can't read much"): anthem2_chill at 90 BPM (retime 4/3, was
    100 BPM), with 2 more verse bars for the chat bubbles. Round 8d (Hark, after the round 8c pass): the title "Edit
    your site. Visually." goes back to its round 7 place, after the cold open, with its own 2 bars and sonic logo hit.
    The click on the llama's answer opens the edit scene on the drop of chorus 1, as in round 8. The bridge has 4 bars.
    The picture is cut `anthem` (57 design s, 76 s). Old design time (after the round 6 cut) to new:
    cold open 0-4 and title 4-8 (same); verse bars 5-8 (8-16) to 8-20, with bars 7-8 played twice (12-20 holds them
    twice); pre-chorus 20-22; the rest 4 s later (chorus 1 22-30, bridge 30-38, build 38-41, chorus 2 41-49, outro 49-57).
    The foley file anthem3.foley.json is already in the new design time."""
    S = _calm(anthem2(4 / 3), "anthem3", chill=True)
    k = S.time_scale
    S.repeat_span(12.0 * k, 16.0 * k)   # verse bars 7-8 (A/C#, E-Esus4) twice: the 4 chat bubbles, 1.5 s apart
    S.foley_from = "anthem3"
    S.cuts = []   # the anthem3 foley is written in the new design time; nothing to follow
    return S


# Round 8 (2026-11-11): topic ads, 16:9, 14-18 s: one part of the anthem and the first 5 s of its end card, cut from
# anthem2_chill, so each ad keeps the anthem's music, sound effects and beat. Spans are design seconds after the
# round 6 cut (the anthem is 53 design seconds); each starts on a downbeat.
TOPICS = {
    "topic_visual": [(18.0, 26.0)],              # edit: click anything, edit it, see it live, swap an image
    "topic_markdown": [(8.0, 18.0)],             # problem: the Markdown pain and the llama's answer
    "topic_git": [(26.0, 34.0)],                 # git: every edit is a commit, powered by GitHub
    "topic_frameworks": [(4.0, 8.0), (34.0, 37.0)],  # title, then "Works with Astro. Next.js. Or bring your own."
    "topic_opensource": [(37.0, 45.0)],          # proof: free and open source, built for Developers and Content Editors
}
END_CARD = (45.0, 50.0)   # the logo, "Try TinaCMS today.", the command (Copied on the sonic logo at 47), the llama


def _topic(name: str) -> Score:
    S = anthem2_chill()
    k = S.time_scale
    keep = TOPICS[name] + [END_CARD]
    # Cut every gap from the end back, so each span is still in the time base it was written in.
    gaps, nxt = [], S.file_dur / k
    for a, b in reversed(keep):
        if b < nxt - 1e-9:
            gaps.append((b, nxt))
        nxt = a
    if nxt > 1e-9:
        gaps.append((0.0, nxt))
    for a, b in gaps:
        S.cut_span(a * k, b * k)
    S.name = name
    S.fade_out = (S.file_dur - 1.0 * k, S.file_dur)   # the last design second of the end card
    return S


def topic_visual() -> Score:
    return _topic("topic_visual")


def topic_markdown() -> Score:
    return _topic("topic_markdown")


def topic_git() -> Score:
    return _topic("topic_git")


def topic_frameworks() -> Score:
    return _topic("topic_frameworks")


def topic_opensource() -> Score:
    return _topic("topic_opensource")


# --------------------------------------------------------------------------- shared pieces


def final_chord(S, t, logo_dt, hit_dt, hold, groove=True, end_hit=True):
    """Big sustained final chord, sonic logo and soft end hit (anthem outro, thirty, fifteen, dev)."""
    S.boom(t, 0.9)
    S.chord(t, hold, "Aadd9", "saw", vel=1.0, cutoff=9000.0, snap=0.4, atk=0.02, rel=1.8, spread=1.1)
    S.chord(t, hold, "Aadd9", "pad", vel=0.9, cutoff=2400.0, atk=0.2, rel=1.8)
    S.bass(t, hold - 0.2, 33, "sub", vel=1.0)
    S.lead(t, 1.8, 81, vel=0.9, layer="tag", vib=1.0)
    if groove:
        S.kick(t, 1.0)
        S.kick(t + 1.0, 0.9)
        S.clap(t + 1.0, 0.7)
        for k in range(8):
            S.hatC(t + k * 0.25, 0.38 - 0.02 * k)
    S.logo(t + logo_dt)
    if logo_dt >= 1.0:
        S.swell(t + logo_dt - 0.6, t + logo_dt, vel=0.45)   # reverse cymbal breathes into the logo
    logo_focus(S, t + logo_dt - 0.1, t + hit_dt + 1.0)
    if end_hit:
        S.endhit(t + hit_dt)
        S.chord(t + hit_dt, 0.6, "Aadd9", "saw", vel=0.5, cutoff=5000.0, snap=0.0, atk=0.01, rel=1.2, spread=0.9)
    S.duck(t, t + logo_dt, depth=0.5, tau=0.12)


def pre_impact_stop(S, t):
    S.stop(t - 0.125, t)


# --------------------------------------------------------------------------- thirty


def thirty() -> Score:
    S = Score("thirty", 15, 30.0, "thirty")
    S.section("hook", "Hook", 1, 1)
    S.section("title", "Title", 2, 3)
    S.section("edit", "Visual editing", 4, 7)
    S.section("blocks", "Blocks", 8, 10)
    S.section("git", "Git", 11, 12)
    S.section("cta", "Call to action", 13, 15)
    S.fade_out = (28.9, 29.9)

    # bar 1: a live edit already happening: filtered chorus chords, riser, teaser
    S.chord(0.0, 1.0, "A", "saw", vel=0.8, cutoff=3000.0, snap=0.0, atk=0.03, rel=0.3)
    S.chord(1.0, 0.875, "E/G#", "saw", vel=0.8, cutoff=3000.0, snap=0.0, atk=0.03, rel=0.2)
    S.chord(0.0, 1.0, "A", "pad", vel=0.7, cutoff=1500.0, atk=0.3, rel=0.5)
    S.chord(1.0, 0.875, "E/G#", "pad", vel=0.7, cutoff=1500.0, atk=0.2, rel=0.3)
    S.set_auto("chords", "lp", [(0.0, 450.0), (1.875, 4500.0)])
    S.set_auto("chords", "gain", [(0.0, -7.0), (1.875, 0.0)])
    S.logo(0.5, vel=0.8, teaser=True)
    S.riser(0.25, 1.875, "noise", pitch=(57, 93), vel=0.9)
    S.bass(0.0, 1.0, 33, "sub", vel=0.5)
    S.bass(1.0, 0.85, 32, "sub", vel=0.5)
    pre_impact_stop(S, 2.0)

    # bars 2-3: impact, logo, groove enters
    S.impact(2.0, "big")
    S.crash(2.0, 1.0)
    S.logo(2.0)
    S.chord(2.0, 3.0, "Aadd9", "saw", vel=0.7, cutoff=4200.0, snap=0.8, atk=0.02, rel=0.5, spread=0.9)
    S.chord(2.0, 3.0, "Aadd9", "pad", vel=0.8, cutoff=1800.0, atk=0.15, rel=0.8)
    S.chord(5.0, 1.0, "E/G#", "saw", vel=0.7, cutoff=4200.0, snap=0.5, atk=0.02, rel=0.4, spread=0.9)
    S.chord(5.0, 1.0, "E/G#", "pad", vel=0.8, cutoff=1800.0, atk=0.1, rel=0.6)
    S.bass(2.0, 1.9, 33, "sub", vel=0.8)
    S.bass(4.0, 0.9, 33, "sub", vel=0.8)
    S.bass(5.0, 0.95, 32, "sub", vel=0.8)
    B.d_light(S, 3, 1, 0.9)
    S.duck(4.0, 6.0, depth=0.35, tau=0.12)
    logo_focus(S, 2.4, 4.5)

    # bars 4-7: visual editing (chorus groove with the hook)
    S.crash(6.0, 0.9)
    B.d_chorus(S, 4, 4, 1.0)
    B.chords_saw(S, 4, CHORUS_B, cutoff=8000.0, vel=1.0)
    B.bass_pattern(S, 4, CHORUS_B, B.BASS_OFFBEAT, "subsaw", 1.0)
    B.lead_hook(S, 4, "turn")
    B.arp_pluck(S, 6, CHORUS_B[2:], B.ARP_UP, vel=0.5)
    S.duck(6.0, 14.0, depth=0.62, tau=0.12)

    # bars 8-10: blocks (the chorus continues)
    S.crash(14.0, 1.0)
    S.whoosh(13.0, 1.0, up=True, vel=0.8)
    B.d_chorus(S, 8, 2, 1.05)
    B.d_chorus(S, 10, 1, 1.05, fill_last=True)
    prog3 = ["A", "E/G#", "F#m7"]
    B.chords_saw(S, 8, prog3, cutoff=9000.0, vel=1.0)
    B.bass_pattern(S, 8, prog3, B.BASS_OFFBEAT_B, "subsaw", 1.0)
    B.lead_hook(S, 8, "open", n_bars=3)
    B.arp_pluck(S, 8, prog3, B.ARP_UP, vel=0.58)
    harmony(S, 8, 3, "open", 0.4)
    S.duck(14.0, 20.0, depth=0.64, tau=0.12)

    # bars 11-12: Git, breakdown-lite
    git = ["Dmaj7", ("Esus4", "E")]
    B.d_half(S, 11, 2, 0.8)
    B.chords_saw(S, 11, git, cutoff=4500.0, vel=0.75, snap=0.0, atk=0.03)
    B.bass_pattern(S, 11, git, B.BASS_HALF, "sub", 0.95)
    B.arp_pluck(S, 11, git, B.ARP_MECH, vel=0.6)
    S.set_auto("chords", "lp", [(20.0, 700.0), (24.0, 4500.0)])
    S.riser(20.0, 24.0, "noise", pitch=(45, 93), vel=1.0)
    S.duck(20.0, 24.0, depth=0.45, tau=0.14)

    # bars 13-15: call to action
    final_chord(S, 24.0, 2.0, 4.0, 4.0)
    S.plan((0.0, 1.875, -9.0), (2.0, 2.5, -0.5), (2.5, 6.0, -5.5), (6.0, 20.0, 0.0), (20.0, 24.0, -6.0),
           (24.0, 24.5, 0.5), (24.5, 26.0, -0.5), (26.0, 28.0, -4.5), (28.0, 30.0, -6.5))
    return S


# --------------------------------------------------------------------------- fifteen


def fifteen() -> Score:
    S = Score("fifteen", 7.5, 15.0, "fifteen")
    S.section("hook", "Hook", 1, 1)
    S.section("features", "Four features", 2, 5)
    S.section("cta", "Call to action", 6, 8)
    S.fade_out = (13.9, 14.9)
    S.music_dur = 15.0

    S.chord(0.0, 1.0, "A", "saw", vel=0.8, cutoff=3000.0, snap=0.0, atk=0.03, rel=0.3)
    S.chord(1.0, 0.875, "E/G#", "saw", vel=0.8, cutoff=3000.0, snap=0.0, atk=0.03, rel=0.2)
    S.chord(0.0, 1.0, "A", "pad", vel=0.7, cutoff=1500.0, atk=0.3, rel=0.5)
    S.chord(1.0, 0.875, "E/G#", "pad", vel=0.7, cutoff=1500.0, atk=0.2, rel=0.3)
    S.set_auto("chords", "lp", [(0.0, 450.0), (1.875, 4500.0)])
    S.set_auto("chords", "gain", [(0.0, -7.0), (1.875, 0.0)])
    S.logo(0.5, vel=0.8, teaser=True)
    S.riser(0.25, 1.875, "noise", pitch=(57, 93), vel=0.9)
    S.bass(0.0, 1.0, 33, "sub", vel=0.5)
    S.bass(1.0, 0.85, 32, "sub", vel=0.5)
    pre_impact_stop(S, 2.0)

    # 2.0 impact; 2-10 four features, accents on the cuts
    S.impact(2.0, "big")
    S.crash(2.0, 1.0)
    B.d_chorus(S, 2, 3, 1.0)
    B.d_chorus(S, 5, 1, 1.0, fill_last=True)
    B.chords_saw(S, 2, CHORUS_B, cutoff=8500.0, vel=1.0)
    B.bass_pattern(S, 2, CHORUS_B, B.BASS_OFFBEAT, "subsaw", 1.0)
    B.lead_hook(S, 2, "turn")
    B.arp_pluck(S, 4, CHORUS_B[2:], B.ARP_UP, vel=0.55)
    S.duck(2.0, 10.0, depth=0.62, tau=0.12)
    for t in (4.0, 6.0, 8.0):
        S.swell(t - 0.5, t, vel=0.7)
        S.accent(t, 1.0)
    final_chord(S, 10.0, 1.0, 3.0, 4.0)
    S.plan((0.0, 1.875, -9.0), (2.0, 2.5, 0.5), (2.5, 10.0, 0.0), (10.0, 10.5, 0.5), (10.5, 11.0, -0.5),
           (11.0, 13.0, -4.5), (13.0, 15.0, -6.5))
    return S


# --------------------------------------------------------------------------- dev


def d_dev(S, bar, n=1, e=1.0, ticks=True, hats16=True, kick_steps=(0, 7, 10)):
    """Dark mechanical groove: sparse kick, side-stick on 2 and 4, 16th hats and ticks."""
    for k in range(n):
        b = bar + k
        for s in kick_steps:
            S.kick(tb(b, s), 0.95 * e, "hard")
        for s in (4, 12):
            S.rim(tb(b, s), 0.75 * e)
        if hats16:
            for s in range(16):
                S.hatC(tb(b, s), (0.4 if s % 4 == 2 else 0.25) * e)
        if ticks:
            for s in (1, 3, 5, 9, 11, 13, 15):
                S.tick(tb(b, s), 0.28 * e)


def dev() -> Score:
    S = Score("dev", 22, 45.0, "dev")
    S.ceiling_db = -2.0     # dense transients: AAC 320k overshoots 0.6 dB at -1.5, so keep more room
    S.section("terminal", "Terminal", 1, 2)
    S.section("schema", "Schema", 3, 6)
    S.section("graphql", "GraphQL", 7, 10)
    S.section("edit", "Visual editing for the team", 11, 14)
    S.section("git", "Git", 15, 18)
    S.section("frameworks", "Frameworks and open source", 19, 20)
    S.section("cta", "Call to action", 21, 22)
    S.fade_out = (44.0, 44.95)

    # bars 1-2: terminal. Dark pad, sub drone, typing, enter clunk at 3.0, blips, stop 3.5-4.0
    S.chord(0.0, 2.0, "F#m9", "pad", vel=0.8, cutoff=1000.0, atk=0.9, rel=0.6, voicing="sw")
    S.chord(2.0, 1.5, "F#m7", "pad", vel=0.8, cutoff=1000.0, atk=0.3, rel=0.4, voicing="sw")
    S.bass(0.0, 3.4, 30, "sub", vel=0.55)
    S.logo(0.5, vel=0.7, teaser=True)
    S.riser(2.0, 3.5, "noise", pitch=(54, 90), vel=0.8)
    S.stop(3.5, 4.0)
    S.set_auto("chords", "lp", [(0.0, 400.0), (3.5, 2400.0)])
    S.set_auto("chords", "gain", [(0.0, -8.0), (3.5, -3.0)])

    # bars 3-6: schema: impact + logo, mechanical groove
    S.impact(4.0, "big")
    S.crash(4.0, 0.8)
    S.logo(4.0)
    sch = ["F#m7", "Dmaj7", "A/C#", ("E", "Esus4")]
    B.chords_pad(S, 3, sch, cutoff=1200.0, vel=0.7, atk=0.3)
    S.set_auto("chords", "lp", [(4.0, 1300.0), (12.0, 1800.0)])
    d_dev(S, 3, 1, 0.45, kick_steps=())
    d_dev(S, 4, 3, 1.0)
    B.bass_pattern(S, 3, sch[:1], [(0, 0, 14, 1.0)], "sub", 0.75)
    B.bass_pattern(S, 4, sch[1:], B.BASS_DEV, "dark", 0.85)
    B.arp_pluck(S, 4, sch[1:], B.ARP_MECH, vel=0.5)
    S.duck(6.0, 12.0, depth=0.3, tau=0.1)
    logo_focus(S, 4.4, 6.5)

    # bars 7-10: GraphQL: groove + arp, riser in bar 10
    gq = ["F#m7", "Dmaj7", "Bm7", ("E", "Esus4")]
    d_dev(S, 7, 4, 1.05)
    B.bass_pattern(S, 7, gq, B.BASS_DEV, "dark", 0.9)
    B.arp_pluck(S, 7, gq, B.ARP_16, vel=0.58)
    B.chords_saw(S, 7, gq, cutoff=2400.0, vel=0.55, snap=0.0, atk=0.04)
    B.keys_stabs(S, 7, gq, [(0, 1.0), (6, 0.7), (10, 0.75)], vel=0.55)
    S.riser(18.0, 20.0, "noise", pitch=(45, 93), vel=1.0)
    S.set_auto("chords", "lp", [(12.0, 2200.0), (18.0, 2600.0), (20.0, 6000.0)])
    S.duck(12.0, 20.0, depth=0.35, tau=0.1)
    pre_impact_stop(S, 20.0)

    # bars 11-14: DROP at 20.0, the chorus hook
    S.crash(20.0, 1.0)
    S.impact(20.0, "big", 0.95)
    B.d_chorus(S, 11, 3, 1.0, kv="hard")
    B.d_chorus(S, 14, 1, 1.0, kv="hard", fill_last=True)
    B.chords_saw(S, 11, CHORUS_A[:3] + [("Dadd9", "E")], cutoff=7000.0, vel=0.95)
    B.bass_pattern(S, 11, CHORUS_A[:3] + [("Dadd9", "E")], B.BASS_OFFBEAT_B, "subsaw", 1.0)
    B.lead_hook(S, 11, "turn", vel=1.0)
    B.arp_pluck(S, 11, CHORUS_A[:3] + [("Dadd9", "E")], B.ARP_UP, vel=0.5)
    S.duck(20.0, 28.0, depth=0.6, tau=0.12)

    # bars 15-18: Git: continues, stripped; commit pings on beat 1 (foley)
    git = ["F#m9", "Dmaj7", "Bm7", ("Esus4", "E")]
    d_dev(S, 15, 4, 0.95, ticks=True, kick_steps=(0, 8))
    B.chords_saw(S, 15, git, cutoff=3000.0, vel=0.7, snap=0.0, atk=0.03)
    B.bass_pattern(S, 15, git, B.BASS_DEV, "dark", 0.9)
    B.arp_pluck(S, 15, git, B.ARP_MECH, vel=0.55)
    S.set_auto("chords", "lp", [(28.0, 900.0), (36.0, 3500.0)])
    S.duck(28.0, 36.0, depth=0.4, tau=0.12)

    # bars 19-20: frameworks + open source: builds, a hit on every beat of bar 20
    fw = ["Dmaj7", ("E", "Esus4")]
    B.d_build(S, 19, 2, 1.0)
    cut(S, ["kick", "clap", "hatClosed", "hatOpen"], 38.0, 40.0)
    B.snare_roll(S, 38.0, 40.0, 0.25, 0.3, 0.9)
    for k in range(4):
        t = 38.0 + k * 0.5
        S.hit(t, 0.9)
        S.kick(t, 1.0, "hard")
    B.chords_saw(S, 19, fw, cutoff=6000.0, vel=0.95, snap=0.2)
    B.bass_pattern(S, 19, fw, B.BASS_OFFBEAT, "subsaw", 0.95)
    B.arp_pluck(S, 19, fw, B.ARP_16, vel=0.5)
    S.riser(36.0, 40.0, "noise", pitch=(45, 93), vel=1.0)
    S.set_auto("chords", "hp", [(37.0, 20.0), (39.9, 1200.0)])
    S.duck(36.0, 40.0, depth=0.5, tau=0.11)

    # bars 21-22: call to action
    final_chord(S, 40.0, 1.0, 3.0, 4.0)
    S.plan((0.0, 3.5, -12.0), (4.0, 4.5, -0.5), (4.5, 12.0, -5.0), (12.0, 19.875, -4.0), (20.0, 20.5, 1.0), (20.5, 28.0, 0.0),
           (28.0, 36.0, -5.0), (36.0, 40.0, -2.0), (40.0, 40.5, 0.5), (40.5, 41.0, -0.5), (41.0, 43.0, -4.5), (43.0, 45.0, -6.5))
    return S


# --------------------------------------------------------------------------- six (YouTube bumper)


def six() -> Score:
    """6.0 s bumper: typing + filtered chords + riser, impact at 1.5, 1 s of groove, final chord 2.5, logo 3.0, end hit 5.0."""
    S = Score("six", 3, 6.0, "six")
    S.section_t("hook", "Hook", 0.0, 1.5)
    S.section_t("impact", "Impact and groove", 1.5, 2.5)
    S.section_t("cta", "Call to action", 2.5, 6.0)
    S.fade_out = (5.1, 5.9)

    # 0-1.5: typing foley (json), filtered chorus chords, short riser
    S.chord(0.0, 1.0, "A", "saw", vel=0.8, cutoff=3000.0, snap=0.0, atk=0.03, rel=0.3)
    S.chord(0.0, 1.0, "A", "pad", vel=0.7, cutoff=1500.0, atk=0.3, rel=0.5)
    S.chord(1.0, 0.375, "E/G#", "saw", vel=0.8, cutoff=3000.0, snap=0.0, atk=0.02, rel=0.1)
    S.chord(1.0, 0.375, "E/G#", "pad", vel=0.7, cutoff=1500.0, atk=0.1, rel=0.1)
    S.set_auto("chords", "lp", [(0.0, 450.0), (1.375, 4500.0)])
    S.set_auto("chords", "gain", [(0.0, -6.0), (1.375, 0.0)])
    S.riser(0.25, 1.375, "noise", pitch=(57, 93), vel=0.9)
    S.bass(0.0, 1.0, 33, "sub", vel=0.5)
    S.bass(1.0, 0.35, 32, "sub", vel=0.5)
    pre_impact_stop(S, 1.5)

    # 1.5: impact + crash, 1 s of chorus groove with the first notes of the hook
    S.impact(1.5, "big")
    S.crash(1.5, 1.0)
    S.chord(1.5, 0.98, "A", "saw", vel=1.0, cutoff=8000.0, snap=0.5)
    S.chord(2.0, 0.48, "E/G#", "saw", vel=1.0, cutoff=8000.0, snap=0.5, rel=0.1)
    S.bass(1.5, 0.45, 33, "subsaw", vel=1.0)
    S.bass(2.0, 0.35, 32, "subsaw", vel=1.0)
    S.kick(1.5, 1.0)
    S.kick(2.0, 1.0)
    S.clap(2.0, 0.9)
    S.snare(2.0, 0.55)
    S.hatO(1.75, 0.75)
    S.hatO(2.25, 0.75)
    for k in range(8):
        S.hatC(1.5 + k * 0.125, 0.42 if k % 2 == 0 else 0.28)
    S.lead(1.5, 0.37, 76, vel=1.0)
    S.lead(1.875, 0.37, 81, vel=1.0)
    S.lead(2.25, 0.2, 83, vel=1.0)
    S.duck(1.5, 2.5, depth=0.6, tau=0.12)

    # 2.5: final chord, logo at 3.0, end hit at 5.0
    final_chord(S, 2.5, 0.5, 2.5, 2.5)
    S.plan((0.0, 1.375, -9.0), (1.5, 2.0, 0.5), (2.0, 2.5, 0.0), (2.5, 3.0, 0.0), (3.0, 5.0, -4.5), (5.0, 6.0, -6.5))
    return S
