import 'dart:convert';
import 'dart:io';

// Stretch the pauses between sentences to match Hark's natural pace.
// Cuts land in real silence found by silencedetect, not on alignment guesses.
void main(List<String> args) {
  final extra = double.parse(args[0]);
  final t = jsonDecode(File('src/timings.raw.json').readAsStringSync()) as List;
  for (final s in t) {
    final id = s['id'];
    final lines = s['lines'] as List;
    final sd = Process.runSync('ffmpeg', ['-i', 'public/audio/$id.mp3', '-af', 'silencedetect=noise=-42dB:d=0.1', '-f', 'null', '-']).stderr as String;
    final st = RegExp(r'silence_start: ([\d.]+)').allMatches(sd).map((m) => double.parse(m[1]!)).toList();
    final en = RegExp(r'silence_end: ([\d.]+)').allMatches(sd).map((m) => double.parse(m[1]!)).toList();
    final gaps = [for (var i = 0; i < en.length; i++) [st[i], en[i]]];
    final cuts = <double>[];
    for (var k = 0; k < lines.length - 1; k++) {
      final guess = (lines[k]['end'] + lines[k + 1]['start']) / 2;
      gaps.sort((a, b) => ((a[0] + a[1]) / 2 - guess).abs().compareTo(((b[0] + b[1]) / 2 - guess).abs()));
      final g = gaps.first;
      if (((g[0] + g[1]) / 2 - guess).abs() > 1.2) throw 'no silence near $id boundary $k (guess $guess)';
      cuts.add((g[0] + g[1]) / 2);
      lines[k]['end'] = g[0];
      lines[k + 1]['start'] = g[1];
    }
    final parts = <String>[];
    var prev = 0.0;
    var filter = '';
    for (var k = 0; k <= cuts.length; k++) {
      final end = k < cuts.length ? cuts[k] : null;
      filter += '[0:a]atrim=start=$prev${end == null ? '' : ':end=$end'},asetpts=PTS-STARTPTS[p$k];';
      parts.add('[p$k]');
      if (end != null) {
        filter += 'anullsrc=r=44100:cl=mono,atrim=duration=$extra[s$k];';
        parts.add('[s$k]');
        prev = end;
      }
    }
    filter += '${parts.join()}concat=n=${parts.length}:v=0:a=1[out]';
    final r = Process.runSync('ffmpeg', ['-v', 'error', '-y', '-i', 'public/audio/$id.mp3', '-filter_complex', filter, '-map', '[out]', '-ac', '1', '-ar', '44100', 'public/audio/$id.wav']);
    if (r.exitCode != 0) throw r.stderr;
    for (var k = 0; k < lines.length; k++) {
      lines[k]['start'] += k * extra;
      lines[k]['end'] += k * extra;
    }
    final p = Process.runSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', 'public/audio/$id.wav']);
    s['duration'] = double.parse((p.stdout as String).trim());
    s['audio'] = 'audio/$id.wav';
  }
  File('src/timings.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert(t));
  final words = t.fold<int>(0, (a, s) => a + (s['lines'] as List).fold<int>(0, (b, l) => b + (l['say'] as String).split(' ').length));
  final dur = t.fold<double>(0, (a, s) => a + s['duration'] + 0.75);
  print('words=$words total=${dur.toStringAsFixed(1)}s wpm=${(words / dur * 60).toStringAsFixed(0)}');
}
