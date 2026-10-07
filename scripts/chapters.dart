import 'dart:convert';
import 'dart:io';

// Print YouTube chapter lines from src/layout.json, one per scene.
// Label: the scene's "chapter" in script.json, else Intro / Recap / the capitalised id.
void main() {
  final layout = jsonDecode(File('src/layout.json').readAsStringSync());
  final script = jsonDecode(File('script.json').readAsStringSync()) as List;
  final fps = layout['fps'] as int;
  final total = layout['totalFrames'] as int;
  final scenes = layout['scenes'] as List;
  final labels = {for (final s in script) s['id']: s['chapter']};
  final short = <String>[];
  for (var i = 0; i < scenes.length; i++) {
    final s = scenes[i];
    final id = s['id'] as String;
    final label = labels[id] ?? {'intro': 'Intro', 'outro': 'Recap'}[id] ?? id[0].toUpperCase() + id.substring(1);
    final from = (s['from'] as int) ~/ fps;
    final end = i + 1 < scenes.length ? scenes[i + 1]['from'] as int : total;
    if ((end - (s['from'] as int)) / fps < 10) short.add(label);
    print('${stamp(from)} $label');
  }
  // YouTube turns these into chapters only with 3+ entries, each 10 s or longer; shorter ones still work as timestamp links.
  if (scenes.length < 3 || short.isNotEmpty) {
    stderr.writeln('note: YouTube shows chapters only with 3+ entries of 10 s or more (short: ${short.join(', ')}); the lines still link as timestamps.');
  }
}

String stamp(int sec) {
  final h = sec ~/ 3600, m = sec % 3600 ~/ 60, s = (sec % 60).toString().padLeft(2, '0');
  return h > 0 ? '$h:${m.toString().padLeft(2, '0')}:$s' : '$m:$s';
}
