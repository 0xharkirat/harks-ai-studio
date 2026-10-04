import 'dart:convert';
import 'dart:io';

// Lay scenes end to end, then build one narration track to match.
const fps = 30;

void main() {
  final t = jsonDecode(File('src/timings.json').readAsStringSync()) as List;
  var cursor = 0.0;
  final scenes = [];
  final filter = StringBuffer();
  final inputs = <String>[];
  for (var i = 0; i < t.length; i++) {
    final s = t[i];
    final lead = i == 0 ? 1.2 : 0.3; // SSW: smile for a beat before speaking
    final tail = i == t.length - 1 ? 2.2 : 0.45;
    final total = lead + s['duration'] + tail;
    scenes.add({
      'id': s['id'],
      'from': (cursor * fps).round(),
      'frames': ((cursor + total) * fps).round() - (cursor * fps).round(),
      'audioFrom': ((cursor + lead) * fps).round(),
      'lines': [
        for (final l in s['lines'])
          {'say': l['say'], 'start': ((cursor + lead + l['start']) * fps).round(), 'end': ((cursor + lead + l['end']) * fps).round()}
      ],
    });
    inputs.addAll(['-i', 'public/${s['audio']}']);
    filter.write('[$i:a]adelay=${((cursor + lead) * 1000).round()}:all=1[a$i];');
    cursor += total;
  }
  filter.write('${[for (var i = 0; i < t.length; i++) '[a$i]'].join()}amix=inputs=${t.length}:normalize=0,apad=whole_dur=$cursor,loudnorm=I=-16:TP=-1.5:LRA=11[out]');
  final r = Process.runSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter.toString(), '-map', '[out]', '-ar', '48000', '-ac', '1', 'public/narration.wav']);
  if (r.exitCode != 0) throw r.stderr;
  final totalFrames = scenes.fold<int>(0, (a, s) => a + (s['frames'] as int));
  File('src/layout.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert({'fps': fps, 'totalFrames': totalFrames, 'scenes': scenes}));
  print('total ${cursor.toStringAsFixed(1)}s, $totalFrames frames');
}
