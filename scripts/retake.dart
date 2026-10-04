import 'dart:convert';
import 'dart:io';

// Edit a finished narration line by line, paying credits only for lines that changed.
//
//   dart retake.dart split   # once, before editing script.json: cut every scene into line clips
//   dart retake.dart build   # after editing script.json: reuse unchanged clips, voice new ones,
//                            # rebuild public/audio/<scene>.wav and src/timings.json
// Then run layout.dart as usual.

final studio = File.fromUri(Platform.script).parent.parent.path;
final recipe = jsonDecode(File('$studio/voice.json').readAsStringSync()) as Map;
const pad = 0.45; // silence on each side of a fresh clip, about Hark's sentence pause once joined

String keyOf(Map l) => (l['tts'] ?? l['say']) as String;

double probe(String f) {
  final r = Process.runSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]);
  return double.parse((r.stdout as String).trim());
}

void ffmpeg(List<String> args) {
  final r = Process.runSync('ffmpeg', ['-v', 'error', '-y', ...args]);
  if (r.exitCode != 0) throw r.stderr;
}

void split() {
  final script = jsonDecode(File('script.json').readAsStringSync()) as List;
  final todo = [for (final s in script) for (final l in s['lines'] as List) if ('${l['say']} ${l['tts'] ?? ''}'.contains('TODO')) '${s['id']}: ${l['say']}'];
  if (todo.isNotEmpty) {
    stderr.writeln('script.json still has TODO lines, so nothing was voiced (no credits spent):\n  ${todo.join('\n  ')}');
    exit(1);
  }
  final timings = jsonDecode(File('src/timings.json').readAsStringSync()) as List;
  Directory('public/audio/lines').createSync(recursive: true);
  final index = <String, dynamic>{};
  for (final s in timings) {
    final id = s['id'];
    final lines = s['lines'] as List;
    final scriptLines = (script.firstWhere((x) => x['id'] == id)['lines'] as List);
    final cuts = [0.0, for (var k = 0; k < lines.length - 1; k++) (lines[k]['end'] + lines[k + 1]['start']) / 2, s['duration'] as double];
    for (var k = 0; k < lines.length; k++) {
      final file = 'public/audio/lines/${id}_$k.wav';
      ffmpeg(['-ss', '${cuts[k]}', '-to', '${cuts[k + 1]}', '-i', 'public/audio/$id.wav', '-ac', '1', '-ar', '44100', file]);
      index[keyOf(scriptLines[k])] = {
        'file': file,
        'speechStart': lines[k]['start'] - cuts[k],
        'speechEnd': (lines[k]['end'] as num).clamp(0, cuts[k + 1]) - cuts[k],
      };
    }
  }
  File('src/lines.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert(index));
  print('${index.length} line clips saved');
}

Future<Map> voiceLine(String text, String? previous, String? next, String file) async {
  final client = HttpClient();
  final req = await client.postUrl(Uri.parse('https://api.elevenlabs.io/v1/text-to-speech/${recipe['voice_id']}?output_format=${recipe['output_format']}'));
  req.headers..set('xi-api-key', Platform.environment['ELEVENLABS_API_KEY']!)..contentType = ContentType.json;
  req.write(jsonEncode({
    'text': (recipe['prefix'] as String) + text,
    'model_id': recipe['model_id'],
    'seed': recipe['seed'],
    'previous_text': previous,
    'next_text': next,
    'voice_settings': recipe['voice_settings'],
  }));
  final res = await req.close();
  final bytes = await res.fold<List<int>>([], (a, b) => a..addAll(b));
  client.close();
  if (res.statusCode != 200) throw 'TTS failed ${res.statusCode}: ${utf8.decode(bytes)}';
  final raw = '$file.mp3';
  File(raw).writeAsBytesSync(bytes);
  final trim = 'silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05';
  ffmpeg(['-i', raw, '-af', '$trim,areverse,$trim,areverse,adelay=${(pad * 1000).round()}:all=1,apad=pad_dur=$pad', '-ac', '1', '-ar', '44100', file]);
  File(raw).deleteSync();
  return {'file': file, 'speechStart': pad, 'speechEnd': probe(file) - pad};
}

Future<void> build() async {
  final script = jsonDecode(File('script.json').readAsStringSync()) as List;
  final index = jsonDecode(File('src/lines.json').readAsStringSync()) as Map<String, dynamic>;
  final all = [for (final s in script) for (final l in s['lines'] as List) l];
  final out = [];
  var fresh = 0;
  final voiced = <String, String>{}; // clip file -> script text, for the Whisper check
  for (final s in script) {
    final id = s['id'];
    final clips = <Map>[];
    for (final l in s['lines'] as List) {
      final key = keyOf(l);
      if (!index.containsKey(key)) {
        final i = all.indexOf(l);
        final file = 'public/audio/lines/${id}_new${fresh++}_${DateTime.now().millisecondsSinceEpoch}.wav';
        index[key] = await voiceLine(key, i > 0 ? keyOf(all[i - 1]) : null, i < all.length - 1 ? keyOf(all[i + 1]) : null, file);
        voiced[file] = l['say'];
      }
      clips.add({...index[key] as Map, 'say': l['say']});
    }
    final lines = [];
    var t = 0.0;
    for (final c in clips) {
      lines.add({'say': c['say'], 'start': t + c['speechStart'], 'end': t + c['speechEnd']});
      t += probe(c['file']);
    }
    ffmpeg([
      for (final c in clips) ...['-i', c['file'] as String],
      '-filter_complex', '${[for (var i = 0; i < clips.length; i++) '[$i:a]'].join()}concat=n=${clips.length}:v=0:a=1[o]',
      '-map', '[o]', '-ac', '1', '-ar', '44100', 'public/audio/$id.wav',
    ]);
    out.add({'id': id, 'duration': probe('public/audio/$id.wav'), 'lines': lines, 'audio': 'audio/$id.wav'});
  }
  File('src/lines.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert(index));
  File('src/timings.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert(out));
  print('$fresh line(s) voiced, ${out.length} scenes rebuilt');
  if (voiced.isEmpty) return;
  // Hear every new clip back so a misread name ("Clod Code") is caught before rendering.
  Directory('check').createSync(recursive: true);
  Process.runSync('whisper', [...voiced.keys, '--model', 'medium.en', '--language', 'en', '--output_format', 'txt', '--output_dir', 'check', '--fp16', 'False']);
  for (final MapEntry(key: file, value: say) in voiced.entries) {
    final heard = File('check/${file.split('/').last.replaceAll('.wav', '.txt')}').readAsStringSync().replaceAll('\n', ' ').trim();
    print('\nscript: $say\nheard:  $heard');
  }
  print('\nIf a line was misheard, delete its entry from src/lines.json and run build again.');
}

Future<void> main(List<String> args) async {
  switch (args.firstOrNull) {
    case 'split':
      split();
    case 'build':
      await build();
    default:
      print('usage: dart retake.dart split|build');
  }
}
