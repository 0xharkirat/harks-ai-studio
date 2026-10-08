import 'dart:convert';
import 'dart:io';

// Voice script.json into public/audio/<scene>.mp3 and src/timings.raw.json.
// The config's tts.provider picks the voice (no tts block means elevenlabs):
//   elevenlabs - the cloned voice, with the locked recipe described below
//   say        - macOS `say`, free and offline, set by tts.say (voice, rate)
// Every provider writes the same two outputs, so pad.dart and layout.dart run unchanged after it.
//
//   dart tts.dart          # every scene
//   dart tts.dart reroll   # elevenlabs only: chunks holding a scene listed in check/bad.txt, each with its next seed
//
// ElevenLabs: scenes are merged into chunks of up to `chunk_chars` characters, because short requests drift more.
// Each chunk is stitched to the ones before it with previous_request_ids (v4 request stitching), so
// tone and accent carry through the video. Chunks are then cut back into scenes at real silences.
// Seeds live in src/seeds.json: same text + same seed + same recipe gives back the same take.

final studio = File.fromUri(Platform.script).parent.parent.path;
// Config lookup lives in scripts/config-path.sh; a project's own snapshot (src/config.json) wins over it,
// so an old video keeps the recipe it was made with.
String configFile(String studio) => File('src/config.json').existsSync()
    ? 'src/config.json'
    : (Process.runSync('zsh', ['$studio/scripts/config-path.sh']).stdout as String).trim();
final recipe = jsonDecode(File(configFile(studio)).readAsStringSync()) as Map;
const stitchMaxAge = Duration(minutes: 110); // ElevenLabs keeps request ids for 2 hours

String ttsOf(Map s) => (s['lines'] as List).map((l) => l['tts'] ?? l['say']).join(' ');

List<List<Map>> chunk(List scenes, int max) {
  final chunks = <List<Map>>[[]];
  var size = 0;
  for (final s in scenes.cast<Map>()) {
    final n = ttsOf(s).length + 1;
    if (chunks.last.isNotEmpty && size + n > max) {
      chunks.add([]);
      size = 0;
    }
    chunks.last.add(s);
    size += n;
  }
  return chunks;
}

List<List<double>> silences(String file) {
  final sd = Process.runSync('ffmpeg', ['-i', file, '-af', 'silencedetect=noise=-42dB:d=0.1', '-f', 'null', '-']).stderr as String;
  final st = RegExp(r'silence_start: ([\d.]+)').allMatches(sd).map((m) => double.parse(m[1]!)).toList();
  final en = RegExp(r'silence_end: ([\d.]+)').allMatches(sd).map((m) => double.parse(m[1]!)).toList();
  return [for (var i = 0; i < en.length; i++) [st[i], en[i]]];
}

double probe(String f) =>
    double.parse((Process.runSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).stdout as String).trim());

void run(String cmd, List<String> args) {
  final r = Process.runSync(cmd, args);
  if (r.exitCode != 0) throw '$cmd failed: ${r.stderr}';
}

Future<void> main(List<String> args) async {
  final scenes = jsonDecode(File('script.json').readAsStringSync()) as List;
  final todo = [for (final s in scenes) for (final l in s['lines'] as List) if ('${l['say']} ${l['tts'] ?? ''}'.contains('TODO')) '${s['id']}: ${l['say']}'];
  if (todo.isNotEmpty) {
    stderr.writeln('script.json still has TODO lines, so nothing was voiced (no credits spent):\n  ${todo.join('\n  ')}');
    exit(1);
  }
  final tts = (recipe['tts'] as Map?) ?? const {};
  final provider = (tts['provider'] ?? 'elevenlabs') as String;
  if (provider == 'elevenlabs') return elevenlabs(scenes, args);
  final speak = localVoice(provider, (tts[provider] as Map?) ?? const {});
  if (speak == null) throw 'unknown tts.provider "$provider" in ${configFile(studio)}: use elevenlabs or say';
  if (args.firstOrNull == 'reroll') print('reroll only applies to elevenlabs; a local voice gives the same take every time');
  voiceLocally(scenes, speak, provider);
}

/// Writes one line of speech to a WAV file.
typedef Speak = void Function(String text, String wav);

/// Local providers, keyed by tts.provider; each reads its own settings block, tts.<provider>.
/// A new local model (Kokoro, KittenTTS) is one more case here; voiceLocally does the rest.
Speak? localVoice(String provider, Map settings) => switch (provider) {
      'say' => sayVoice((settings['voice'] ?? 'Aman') as String, settings['rate'] as num?),
      _ => null,
    };

Speak sayVoice(String voice, num? rate) {
  // `say` falls back to the system voice without an error, so check the name first.
  final installed = RegExp(r'^(.+?)\s+[a-z]{2,3}_\w+\s+#', multiLine: true)
      .allMatches(Process.runSync('say', ['-v', '?']).stdout as String)
      .map((m) => m[1]!);
  if (!installed.any((n) => n == voice || n.startsWith('$voice ('))) {
    throw 'tts.say.voice "$voice" is not installed; `say -v "?"` lists the voices, and System Settings > Accessibility > Spoken Content adds more';
  }
  return (text, wav) {
    final input = File('$wav.txt')..writeAsStringSync(text); // a file, so a line that starts with "-" is not read as a flag
    run('say', ['-v', voice, if (rate != null) ...['-r', '$rate'], '--file-format=WAVE', '--data-format=LEI16@44100', '-o', wav, '-f', input.path]);
    input.deleteSync();
  };
}

// Silence between lines in a local take; pad.dart finds it and widens it to the video's pace.
const lineGap = 0.25;

/// Voices each line on its own, so line times are exact, then joins a scene's lines with [lineGap].
void voiceLocally(List scenes, Speak speak, String provider) {
  final tmp = Directory.systemTemp.createTempSync('tts');
  const trim = 'silenceremove=start_periods=1:start_threshold=-60dB:start_silence=0.02';
  final out = [];
  for (final s in scenes) {
    final id = s['id'];
    final clips = <String>[];
    final lines = [];
    var t = 0.0;
    for (final l in s['lines'] as List) {
      final raw = '${tmp.path}/raw.wav';
      speak((l['tts'] ?? l['say']) as String, raw);
      final clip = '${tmp.path}/${id}_${clips.length}.wav';
      run('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', '$trim,areverse,$trim,areverse', '-ac', '1', '-ar', '44100', clip]);
      if (clips.isNotEmpty) t += lineGap;
      final d = probe(clip);
      lines.add({'say': l['say'], 'start': t, 'end': t + d});
      t += d;
      clips.add(clip);
    }
    final gaps = [for (var k = 1; k < clips.length; k++) 'anullsrc=r=44100:cl=mono,atrim=duration=$lineGap[g$k];'].join();
    final parts = [for (var k = 0; k < clips.length; k++) '${k > 0 ? '[g$k]' : ''}[$k:a]'].join();
    run('ffmpeg', [
      '-v', 'error', '-y',
      for (final c in clips) ...['-i', c],
      '-filter_complex', '$gaps${parts}concat=n=${2 * clips.length - 1}:v=0:a=1[out]',
      '-map', '[out]', '-c:a', 'libmp3lame', '-q:a', '2', 'public/audio/$id.mp3',
    ]);
    out.add({'id': id, 'duration': probe('public/audio/$id.mp3'), 'lines': lines});
    print('$id: ${lines.length} lines, ${t.toStringAsFixed(1)}s');
  }
  tmp.deleteSync(recursive: true);
  File('src/timings.raw.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert(out));
  print('voiced with $provider: no credits spent');
}

Future<void> elevenlabs(List scenes, List<String> args) async {
  final key = Platform.environment['ELEVENLABS_API_KEY']!;
  final chunks = chunk(scenes, recipe['chunk_chars'] as int);
  final seedsFile = File('src/seeds.json');
  final seeds = seedsFile.existsSync() ? Map<String, dynamic>.from(jsonDecode(seedsFile.readAsStringSync())) : <String, dynamic>{};
  final reqFile = File('src/requests.json');
  final requests = reqFile.existsSync() ? Map<String, dynamic>.from(jsonDecode(reqFile.readAsStringSync())) : <String, dynamic>{};
  final rawFile = File('src/timings.raw.json');
  final previous = rawFile.existsSync() ? jsonDecode(rawFile.readAsStringSync()) as List : [];

  String chunkId(List<Map> c) => '${c.first['id']}..${c.last['id']}';
  Set<String>? redo;
  if (args.firstOrNull == 'reroll') {
    final bad = File('check/bad.txt').readAsStringSync().split(',').where((s) => s.isNotEmpty).toSet();
    redo = {for (final c in chunks) if (c.any((s) => bad.contains(s['id']))) chunkId(c)};
    for (final id in redo) {
      seeds[id] = (seeds[id] ?? recipe['seed']) + 1;
    }
  }

  final prefix = recipe['prefix'] as String;
  final client = HttpClient();
  final out = <String, dynamic>{for (final p in previous) p['id']: p};
  var spent = 0;
  for (var ci = 0; ci < chunks.length; ci++) {
    final c = chunks[ci];
    final cid = chunkId(c);
    if (redo != null && !redo.contains(cid)) continue;
    final seed = seeds[cid] ??= recipe['seed'];
    final text = prefix + c.map(ttsOf).join(' ');
    final fresh = [
      for (var k = ci - 1; k >= 0 && k >= ci - 3; k--)
        if (requests[chunkId(chunks[k])] case {'id': String rid, 'at': String at}
            when DateTime.now().difference(DateTime.parse(at)) < stitchMaxAge)
          rid
    ].reversed.toList();
    final req = await client.postUrl(Uri.parse(
        'https://api.elevenlabs.io/v1/text-to-speech/${recipe['voice_id']}/with-timestamps?output_format=${recipe['output_format']}'));
    req.headers..set('xi-api-key', key)..contentType = ContentType.json;
    req.write(jsonEncode({
      'text': text,
      'model_id': recipe['model_id'],
      'seed': seed,
      if (fresh.isNotEmpty) 'previous_request_ids': fresh else if (ci > 0) 'previous_text': chunks[ci - 1].map(ttsOf).join(' '),
      if (ci < chunks.length - 1) 'next_text': chunks[ci + 1].map(ttsOf).join(' '),
      'voice_settings': recipe['voice_settings'],
    }));
    final res = await req.close();
    final body = await res.transform(utf8.decoder).join();
    if (res.statusCode != 200) throw 'TTS $cid failed ${res.statusCode}: $body';
    requests[cid] = {'id': res.headers.value('request-id'), 'at': DateTime.now().toIso8601String()};
    spent += int.tryParse(res.headers.value('character-cost') ?? '') ?? 0;
    final j = jsonDecode(body);
    final chunkFile = 'public/audio/chunk_$ci.mp3';
    File(chunkFile).writeAsBytesSync(base64Decode(j['audio_base64']));
    final starts = (j['alignment']['character_start_times_seconds'] as List).cast<num>();
    final ends = (j['alignment']['character_end_times_seconds'] as List).cast<num>();

    // Line times inside the chunk, then cut points between scenes at the nearest real silence.
    var offset = prefix.length;
    final sceneLines = <List<Map>>[];
    for (final s in c) {
      final lines = <Map>[];
      for (final l in s['lines'] as List) {
        final t = (l['tts'] ?? l['say']) as String;
        lines.add({'say': l['say'], 'start': starts[offset].toDouble(), 'end': ends[offset + t.length - 1].toDouble()});
        offset += t.length + 1;
      }
      sceneLines.add(lines);
    }
    final gaps = silences(chunkFile);
    final cuts = <double>[0];
    for (var k = 1; k < c.length; k++) {
      final guess = sceneLines[k].first['start'] as double;
      gaps.sort((a, b) => ((a[0] + a[1]) / 2 - guess).abs().compareTo(((b[0] + b[1]) / 2 - guess).abs()));
      final near = gaps.isNotEmpty && ((gaps.first[0] + gaps.first[1]) / 2 - guess).abs() <= 1.2;
      // No real pause near the boundary: fall back to the alignment and say so, rather than cut mid-word far away.
      if (!near) stderr.writeln('warning: no silence near the start of ${c[k]['id']}; cutting at the alignment instead');
      cuts.add(near ? (gaps.first[0] + gaps.first[1]) / 2 : ((sceneLines[k - 1].last['end'] as double) + guess) / 2);
    }
    cuts.add(probe(chunkFile));
    for (var k = 0; k < c.length; k++) {
      final id = c[k]['id'];
      final file = 'public/audio/$id.mp3';
      final r = Process.runSync('ffmpeg', ['-v', 'error', '-y', '-ss', '${cuts[k]}', '-to', '${cuts[k + 1]}', '-i', chunkFile, '-c', 'copy', file]);
      if (r.exitCode != 0) throw r.stderr;
      out[id] = {
        'id': id,
        'duration': probe(file),
        'lines': [
          for (final l in sceneLines[k])
            {'say': l['say'], 'start': ((l['start'] as double) - cuts[k]).clamp(0, 1e9), 'end': (l['end'] as double) - cuts[k]}
        ],
      };
    }
    print('$cid: seed $seed, ${text.length} chars, ${fresh.length} stitched');
  }
  client.close();
  rawFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert([for (final s in scenes) out[s['id']]]));
  seedsFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(seeds));
  reqFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(requests));
  print('credits charged: $spent');
}
