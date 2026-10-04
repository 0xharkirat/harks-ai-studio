import 'dart:convert';
import 'dart:io';

// Gate every scene's narration before it goes into a video:
//   words  - Whisper transcript vs script; a misheard name ("Clod Code") is only flagged,
//            because captions always show the script text
//   accent - CommonAccent share of US English must stay under gate.max_us in ../voice.json
//   voice  - ECAPA speaker match vs real Hark clips must stay over gate.min_match
// Failing scene ids go to check/bad.txt; `dart tts.dart reroll` redoes only those.
//
//   dart check.dart            # every scene
//   dart check.dart intro,use  # only these

final studio = File.fromUri(Platform.script).parent.parent.path;
// The project's snapshot of voice.json wins, so an old video keeps the recipe it was made with.
final gate = (jsonDecode((File('src/config.json').existsSync() ? File('src/config.json') : File('$studio/voice.json')).readAsStringSync()) as Map)['gate'] as Map;

String norm(String s) => s
    .toLowerCase()
    .replaceAll(RegExp(r'eleven\s*labs|11\s*labs'), 'elevenlabs')
    .replaceAll(RegExp(r"[^a-z0-9' ]"), ' ')
    .replaceAll(RegExp(r'\s+'), ' ')
    .trim();

int distance(List<String> a, List<String> b) {
  final d = List.generate(a.length + 1, (i) => List.filled(b.length + 1, 0));
  for (var i = 0; i <= a.length; i++) d[i][0] = i;
  for (var j = 0; j <= b.length; j++) d[0][j] = j;
  for (var i = 1; i <= a.length; i++) {
    for (var j = 1; j <= b.length; j++) {
      d[i][j] = [d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] == b[j - 1] ? 0 : 1)].reduce((x, y) => x < y ? x : y);
    }
  }
  return d[a.length][b.length];
}

void main(List<String> args) {
  final ids = args.isNotEmpty ? args[0].split(',') : null;
  final scenes = (jsonDecode(File('script.json').readAsStringSync()) as List).where((s) => ids == null || ids.contains(s['id'])).toList();
  final files = [for (final s in scenes) 'public/audio/${s['id']}.mp3'];
  Directory('check').createSync(recursive: true);

  final w = Process.runSync('whisper', [...files, '--model', 'medium.en', '--language', 'en', '--output_format', 'txt', '--output_dir', 'check', '--fp16', 'False']);
  if (w.exitCode != 0) throw w.stderr;
  final v = Process.runSync('$studio/.venv/bin/python', ['$studio/scripts/voicecheck.py', ...files]);
  if (v.exitCode != 0) throw v.stderr;
  final voice = <String, List<double>>{}; // file name -> [match, indian, us]
  for (final line in (v.stdout as String).split('\n')) {
    final parts = line.trim().split(RegExp(r'\s+'));
    if (parts.length >= 7 && parts[0].endsWith('.mp3')) {
      voice[parts[0]] = [double.parse(parts[1]), double.parse(parts[2]), double.parse(parts[3])];
    }
  }

  final bad = <String>[];
  for (final s in scenes) {
    final id = s['id'] as String;
    final want = norm((s['lines'] as List).map((l) => l['say']).join(' ')).split(' ');
    final heard = norm(File('check/$id.txt').readAsStringSync());
    final names = RegExp(r'\b(clod|clot|plot|toad|cloud|cloth|clodcode|clotcode|harp|hart|harts)\b');
    final misheard = names.hasMatch(heard);
    // A misheard name is only flagged, so score words as if it were heard right.
    final got = heard.replaceAllMapped(names, (m) => m[0]!.startsWith('ha') ? 'hark' : 'claude').split(' ');
    final wer = distance(want, got) / want.length;
    final [match, indian, us] = voice['$id.mp3']!;
    final notes = [if (misheard) '⚠ name said differently (captions are still right)'];
    final problems = [
      if (wer >= 0.2) 'words off (${(wer * 100).round()}%)',
      if (us > gate['max_us']) 'American ${(us * 100).round()}%',
      if (match.isNaN || match < gate['min_match']) 'less like Hark (${match.toStringAsFixed(2)})',
    ];
    if (problems.isNotEmpty) bad.add(id);
    print('${problems.isEmpty ? 'ok ' : 'BAD'} ${id.padRight(10)} match ${match.toStringAsFixed(2)}  indian ${(indian * 100).round()}%  us ${(us * 100).round()}%  ${[...problems, ...notes].join(', ')}');
  }
  File('check/bad.txt').writeAsStringSync(bad.join(','));
  print(bad.isEmpty ? '\nAll scenes pass.' : '\nRe-roll with: dart ../../../scripts/tts.dart reroll');
}
