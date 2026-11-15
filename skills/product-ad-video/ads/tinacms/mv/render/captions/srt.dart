// Builds the plain-text SRT files from the sampler JSON files (extract.mjs output, 30 samples per second).
// dart srt.dart <samplerDir> <outDir> [cut ...]   (no cut ids: every cut)
import 'dart:convert';
import 'dart:io';

const dt = 1 / 30; // one sample step: a line is on screen from a step before its first sample to a step after its last
const cmd = 'npx create-tina-app@latest';
const tagline = 'Sites, Docs and Llamas. No Dramas.';
const maxLine = 32;
const twoLine = {
  'Devs define. Teams compose.': 'Devs define.\nTeams compose.',
  'Built for developers. And editors.': 'Built for developers.\nAnd editors.',
  'Built for developers. And content editors.': 'Built for developers.\nAnd content editors.',
  tagline: 'Sites, Docs and Llamas.\nNo Dramas.',
};

/// A one-line text longer than [maxLine] breaks at the space nearest its middle.
String wrap(String t) {
  if (t.length <= maxLine || t.contains('\n')) return t;
  var best = -1;
  for (var i = 0; i < t.length; i++) {
    if (t[i] == ' ' && (best < 0 || (i - t.length / 2).abs() < (best - t.length / 2).abs())) best = i;
  }
  return best < 0 ? t : '${t.substring(0, best)}\n${t.substring(best + 1)}';
}

class It {
  String text, kind, scene;
  double first, last;
  It(this.text, this.kind, this.scene, this.first, this.last);
}

class Cue {
  double s, e;
  String text;
  Cue(this.s, this.e, this.text);
}

const files = {
  'anthem': ['TinaCMS-Anthem-v2-76s-16x9', 76.0],
  'thirty': ['TinaCMS-30s-16x9', 30.0],
  'fifteen': ['TinaCMS-15s-16x9', 15.0],
  'vertical': ['TinaCMS-30s-9x16', 30.0],
  'dev': ['TinaCMS-Developers-45s-16x9', 45.0],
  'six': ['TinaCMS-Bumper-6s-16x9', 6.0],
};

String norm(String t) => t.replaceAll(RegExp(r'\s+'), ' ').trim();

List<It> load(String path) {
  final j = jsonDecode(File(path).readAsStringSync()) as Map<String, dynamic>;
  final raw = <It>[];
  for (final i in j['items'] as List) {
    raw.add(It(norm(i['text'] as String), i['kind'] as String, i['scene'] as String, (i['first'] as num).toDouble(), (i['last'] as num).toDouble()));
  }
  // The three stack words are one line on screen.
  final stack = raw.where((i) => i.kind == 'stack').toList();
  raw.removeWhere((i) => i.kind == 'stack');
  if (stack.isNotEmpty) {
    raw.add(It('Next.js · Astro · Hugo', 'stack', stack.first.scene, stack.map((i) => i.first).reduce((a, b) => a < b ? a : b), stack.map((i) => i.last).reduce((a, b) => a > b ? a : b)));
  }
  // Merge items with the same text that overlap or touch (a headline can be drawn twice, or cross scenes).
  raw.sort((a, b) => a.first.compareTo(b.first));
  final out = <It>[];
  for (final i in raw) {
    final m = out.where((o) => o.text == i.text && i.first - o.last < 0.2).toList();
    if (m.isNotEmpty) {
      if (i.last > m.first.last) m.first.last = i.last;
    } else {
      out.add(It(i.text, i.kind, i.scene, i.first, i.last));
    }
  }
  return out;
}

It? find(List<It> l, bool Function(It) f) {
  for (final i in l) { if (f(i)) return i; }
  return null;
}

List<Cue> build(String id, List<It> items, double dur) {
  final cues = <Cue>[];
  String tx(String t) => twoLine[t] ?? wrap(t);
  final used = <It>{};

  // The proof scene: the open source line (with a licence pill when one is named), then the 13.8k counter caption.
  final pill = find(items, (i) => i.kind == 'pill');
  final count = find(items, (i) => i.kind == 'count');
  final cap = find(items, (i) => i.text == 'stars on GitHub.');
  final open = find(items, (i) => i.scene == 'proof' && i.text.toLowerCase().endsWith('open source.'));
  if (open != null && cap != null) {
    cues.add(Cue(open.first - dt, cap.first - dt, pill != null ? '${open.text} ${pill.text}.' : open.text));
    cues.add(Cue(cap.first - dt, cap.last + dt, '13.8k stars on GitHub.'));
    used..add(open)..add(cap);
    if (pill != null) used.add(pill);
    if (count != null) used.add(count);
  }
  // The devs stack scene: the open source line is two headlines of one sentence ("Free and" / "open source.").
  final o1 = find(items, (i) => (i.text == 'Open source.' || i.text == 'Free and') && !used.contains(i));
  final o2 = find(items, (i) => (i.text == 'Apache 2.0.' || i.text == 'open source.') && !used.contains(i));
  if (o1 != null && o2 != null) {
    cues.add(Cue(o1.first - dt, (o1.last > o2.last ? o1.last : o2.last) + dt, '${o1.text} ${o2.text}'));
    used..add(o1)..add(o2);
  }
  // The anthem's framework line: "WORKS WITH" over three stacked lines that land a beat apart, read as one cue.
  const promise = ['Astro.', 'Next.js.', 'Or bring your own.'];
  final pr = items.where((i) => promise.contains(i.text)).toList();
  if (pr.length == promise.length) {
    final s0 = pr.map((i) => i.first).reduce((a, b) => a < b ? a : b), e0 = pr.map((i) => i.last).reduce((a, b) => a > b ? a : b);
    cues.add(Cue(s0 - dt, e0 + dt, 'Works with Astro and Next.js.\nOr bring your own.'));
    used.addAll(pr);
  }
  // A headline with a smaller line under it (git: "Powered by GitHub."): the headline gets its own cue first.
  final gh = find(items, (i) => i.text == 'Powered by GitHub.');
  final ghSub = find(items, (i) => i.text.startsWith('The best collaboration'));
  if (gh != null && ghSub != null && ghSub.first < gh.first + 1.7) ghSub.first = gh.first + 1.7;
  // The closing scene: command, tina.io and the tagline (when there is one) stay on screen once they land.
  final ctaCmd = find(items, (i) => i.text == cmd && i.scene == 'cta');
  final tina = find(items, (i) => i.text == 'tina.io');
  final tag = find(items, (i) => i.text == tagline);
  if (ctaCmd != null && tina != null) {
    final end = tag?.first ?? tina.last + dt;
    final extra = items.where((i) => i.scene == 'cta' && i != ctaCmd && i != tina && i != tag).toList();
    // A line that lands after the command, under an "or" divider (the anthem: "With your favourite AI agent").
    final alt = extra.where((e) => e.first > ctaCmd.first + 0.5 && e.first < tina.first).toList();
    extra.removeWhere(alt.contains);
    // The emoji is decoration: the caption keeps the words, so the line fits 32 characters.
    final altText = alt.isEmpty ? '' : 'Or ${alt.map((e) => e.text).join(' ').replaceAll(RegExp(r'\s*[\u{1F300}-\u{1FAFF}]', unicode: true), '').replaceFirst(RegExp(r'^W'), 'w')}.';
    if (tina.first - ctaCmd.first < 0.5) {
      final lead = [for (final e in extra) e.text, cmd, 'tina.io'].join('\n');
      var start = ctaCmd.first;
      for (final e in extra) { if (e.first < start) start = e.first; }
      cues.add(Cue(start - dt, end - dt, lead));
    } else {
      // A headline above the command ("Try TinaCMS today.") leads, then shares the first command cue.
      final head = [for (final e in extra) e.text].join(' ');
      if (head.isNotEmpty) {
        final start = extra.map((e) => e.first).reduce((a, b) => a < b ? a : b);
        if (start < ctaCmd.first) cues.add(Cue(start - dt, ctaCmd.first - dt, wrap(head)));
      }
      final cmdEnd = alt.isEmpty ? tina.first : alt.first.first;
      cues.add(Cue(ctaCmd.first - dt, cmdEnd - dt, head.isNotEmpty ? '$head\n$cmd' : cmd));
      if (alt.isNotEmpty) cues.add(Cue(cmdEnd - dt, tina.first - dt, '$cmd\n$altText'));
      cues.add(Cue(tina.first - dt, end - dt, alt.isEmpty ? '$cmd\ntina.io' : '$altText\ntina.io'));
    }
    if (tag != null) cues.add(Cue(tag.first - dt, tag.last + dt, tx(tagline)));
    used..add(ctaCmd)..add(tina)..addAll(extra)..addAll(alt);
    if (tag != null) used.add(tag);
  }
  for (final i in items) {
    if (used.contains(i)) continue;
    cues.add(Cue(i.first - dt, i.last + dt, tx(i.text)));
  }

  cues.sort((a, b) => a.s.compareTo(b.s));
  for (var k = 0; k < cues.length; k++) {
    if (cues[k].s < 0) cues[k].s = 0;
    if (cues[k].e > dur - 0.02) cues[k].e = dur - 0.02;
  }
  // A cue ends when the next one starts when they overlap or sit within 0.1 s of each other.
  for (var k = 1; k < cues.length; k++) {
    final gap = cues[k].s - cues[k - 1].e;
    if (gap < 0.1) cues[k - 1].e = cues[k].s;
  }
  return cues;
}

String ts(double s) {
  final ms = (s * 1000).round();
  String p(int n, int w) => n.toString().padLeft(w, '0');
  return '${p(ms ~/ 3600000, 2)}:${p(ms ~/ 60000 % 60, 2)}:${p(ms ~/ 1000 % 60, 2)},${p(ms % 1000, 3)}';
}

void main(List<String> args) {
  final dir = args[0], out = args[1];
  final only = args.skip(2).toSet();
  final built = <String, List<Cue>>{};
  files.forEach((id, v) {
    if (only.isNotEmpty && !only.contains(id)) return;
    final name = v[0] as String, dur = v[1] as double;
    final cues = build(id, load('$dir/$id.json'), dur);
    for (var k = 0; k < cues.length; k++) {
      final c = cues[k];
      if (!(c.e > c.s)) throw '$name cue ${k + 1}: end not after start';
      if (k > 0 && c.s < cues[k - 1].e - 1e-9) throw '$name cue ${k + 1}: overlap';
      if (c.e > dur + 1e-9) throw '$name cue ${k + 1}: past video end';
      for (final line in c.text.split('\n')) { if (line.length > maxLine) throw '$name: line too long: $line'; }
    }
    final b = StringBuffer();
    for (var k = 0; k < cues.length; k++) {
      b.write('${k + 1}\n${ts(cues[k].s)} --> ${ts(cues[k].e)}\n${cues[k].text}\n\n');
    }
    File('$out/$name.srt').writeAsStringSync(b.toString());
    built[id] = cues;
    print('$name: ${cues.length} cues, last ends ${cues.last.e.toStringAsFixed(3)} of $dur');
  });
  // The vertical cut must carry the same cues as thirty.
  final a = built['thirty'], v = built['vertical'];
  if (a == null || v == null) return;
  var same = a.length == v.length;
  for (var k = 0; same && k < a.length; k++) { same = a[k].s == v[k].s && a[k].e == v[k].e && a[k].text == v[k].text; }
  print('vertical == thirty: $same');
}
