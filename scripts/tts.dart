import 'dart:async';
import 'dart:convert';
import 'dart:io';

// Voice script.json into public/audio/<scene>.mp3 and src/timings.raw.json.
// The config's tts.provider picks the voice (no tts block means elevenlabs):
//   elevenlabs - the cloned voice, with the locked recipe described below
//   say        - macOS `say`, free and offline, set by tts.say (voice, rate)
//   qwen       - local Qwen3-TTS clone through one long-lived helper, set by tts.qwen (python, server, config, attempts)
// Every provider writes the same two outputs, so pad.dart and layout.dart run unchanged after it.
//
//   dart tts.dart            # every scene
//   dart tts.dart reroll     # elevenlabs only: chunks holding a scene listed in check/bad.txt, each with its next seed
//   dart tts.dart --dry-run  # elevenlabs only: print each request it would send and the character total; calls nothing
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
  if (args.contains('--dry-run')) {
    print('dry run: tts.provider is "$provider", a local voice; it calls ElevenLabs never and spends no credits');
    return;
  }
  final settings = (tts[provider] as Map?) ?? const {};
  final speak = localVoice(provider, settings);
  if (speak == null) throw 'unknown tts.provider "$provider" in ${configFile(studio)}: use elevenlabs, say or qwen';
  if (args.contains('reroll')) print('reroll only applies to elevenlabs; a local voice gives the same take every time');
  try {
    // A cached take is reused only while the provider settings (and, for qwen, its voice config) are unchanged.
    final qwenConfig = File(studioPath((settings['config'] ?? 'local-voice/qwen.json') as String));
    final signature = '$provider|${jsonEncode(settings)}|${provider == 'qwen' && qwenConfig.existsSync() ? qwenConfig.readAsStringSync() : ''}';
    await voiceLocally(scenes, speak, provider, signature);
  } finally {
    for (final stop in helpers) {
      await stop(); // a helper process (qwen) holds its model in memory until told to stop
    }
  }
}

/// Writes one line of speech to a WAV file.
/// [say] is the subtitle text, for a provider that checks its own takes against what a listener would hear.
typedef Speak = Future<void> Function(String text, String wav, {String? say});

/// Stop functions for helper processes a provider started; main runs them when voicing ends.
final helpers = <Future<void> Function()>[];

/// Local providers, keyed by tts.provider; each reads its own settings block, tts.<provider>.
/// A new local model (Kokoro, KittenTTS) is one more case here; voiceLocally does the rest.
Speak? localVoice(String provider, Map settings) => switch (provider) {
      'say' => sayVoice((settings['voice'] ?? 'Aman') as String, settings['rate'] as num?),
      'qwen' => qwenVoice(settings),
      _ => null,
    };

Speak sayVoice(String voice, num? rate) {
  // `say` falls back to the system voice without an error, so check the name first.
  final installed = RegExp(r'^(.+?)\s+[a-z]{2,3}_\w+\s+#', multiLine: true)
      .allMatches(Process.runSync('say', ['-v', '?']).stdout as String)
      .map((m) => m[1]!);
  if (!voice.startsWith('com.apple.') && !installed.any((n) => n == voice || n.startsWith('$voice ('))) {
    throw 'tts.say.voice "$voice" is not installed; `say -v "?"` lists the voices, and System Settings > Accessibility > Spoken Content adds more';
  }
  return (text, wav, {say}) async {
    final input = File('$wav.txt')..writeAsStringSync(text); // a file, so a line that starts with "-" is not read as a flag
    run('say', ['-v', voice, if (rate != null) ...['-r', '$rate'], '--file-format=WAVE', '--data-format=LEI16@44100', '-o', wav, '-f', input.path]);
    input.deleteSync();
  };
}

/// A path from the config: ~ expands, and a relative path is relative to the studio.
String studioPath(String v) {
  final home = v.replaceFirst(RegExp(r'^~'), Platform.environment['HOME'] ?? '~');
  return home.startsWith('/') ? home : '$studio/$home';
}

/// Qwen3-TTS: starts the helper (tts.qwen.server, run with tts.qwen.python) on the first line and reuses it for
/// every line, because loading the 3 GB model per line is far too slow. The helper reads {"text", "out"} JSON
/// lines on stdin and answers each with one JSON line holding the attempt it kept and its gate numbers.
/// tts.qwen.config (a JSON file of voice settings) is passed to it as --config; tts.qwen.attempts goes in every request.
/// python, server and config are paths relative to the studio (~ and absolute paths also work), and default to the
/// local-voice/ folder that scripts/setup-local-voice.sh builds.
Speak qwenVoice(Map settings) {
  String path(String key, String fallback) => studioPath((settings[key] ?? fallback) as String);

  final python = path('python', 'local-voice/.venv/bin/python');
  final server = path('server', 'local-voice/qwen_server.py');
  final config = path('config', 'local-voice/qwen.json');
  final attempts = settings['attempts'];
  Process? proc;
  StreamIterator<String>? replies;

  Future<Map> next() async {
    while (await replies!.moveNext()) {
      try {
        final r = jsonDecode(replies!.current);
        if (r is Map && r['event'] != 'ready') return r; // the ready line only says the model has loaded
      } on FormatException {
        stderr.writeln('qwen: ${replies!.current}'); // stray library output
      }
    }
    throw 'the qwen helper stopped (exit ${await proc!.exitCode}); its messages are above';
  }

  return (text, wav, {say}) async {
    if (proc == null) {
      for (final f in [python, server, config]) {
        if (!File(f).existsSync()) throw 'tts.qwen: $f does not exist; run scripts/setup-local-voice.sh';
      }
      proc = await Process.start(python, [server, '--config', config]);
      proc!.stderr.listen(stderr.add);
      replies = StreamIterator(proc!.stdout.transform(utf8.decoder).transform(const LineSplitter()));
      helpers.add(() async {
        await proc!.stdin.close();
        await replies!.cancel(); // a paused stdout subscription would keep dart alive after the helper exits
        await proc!.exitCode.timeout(const Duration(seconds: 15), onTimeout: () {
          proc!.kill();
          return -1;
        });
      });
      print('qwen: loading the model (once)');
    }
    // A request that fails every gate in its attempts is sent again with a new seed group (up to 3 more times).
    for (var group = 0;; group++) {
      proc!.stdin.writeln(jsonEncode({'text': text, 'out': wav, if (say != null) 'say': say, if (attempts != null) 'attempts': attempts, if (group > 0) 'seed': 100000 * group}));
      await proc!.stdin.flush();
      final r = await next();
      if (r['ok'] == false) throw 'qwen failed on "$text": ${r['error']}';
      if (!File(wav).existsSync()) throw 'qwen reported success but wrote no $wav: $r';
      final failed = r['all_pass'] == false;
      final gates = [for (final k in ['tail_db', 'rise_hz']) if (r[k] is num) '$k ${(r[k] as num).toStringAsFixed(1)}'];
      print('  qwen${group > 0 ? ' seed group $group' : ''} ${r['attempt'] != null ? 'attempt ${r['attempt']}' : 'takes joined'}${failed ? ' FAILED the gates' : ''} ${gates.join(', ')}: ${text.length > 48 ? '${text.substring(0, 48)}...' : text}');
      if (!failed) return;
      if (group == 3) {
        stderr.writeln('qwen: no seed group passed the gates for "$text"; kept the last take');
        return;
      }
    }
  };
}

// Silence between lines in a local take; pad.dart finds it and widens it to the video's pace.
const lineGap = 0.25;

/// 64-bit FNV-1a, for the cache file names.
String fnv(String s) {
  var h = 0xcbf29ce484222325;
  for (final b in utf8.encode(s)) {
    h = ((h ^ b) * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF;
  }
  return h.toRadixString(16).padLeft(16, '0');
}

/// Voices each line on its own, so line times are exact, then joins a scene's lines with [lineGap].
/// A voiced line is kept in .voice-cache/ (next to script.json), so a script edit re-voices only the lines that changed.
Future<void> voiceLocally(List scenes, Speak speak, String provider, String signature) async {
  final cache = Directory('.voice-cache')..createSync();
  var reused = 0, voiced = 0;
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
      final text = (l['tts'] ?? l['say']) as String;
      final hit = File('${cache.path}/${fnv('$signature|$text|${l['say']}')}.wav');
      if (hit.existsSync()) {
        hit.copySync(raw);
        reused++;
      } else {
        await speak(text, raw, say: l['say'] as String);
        File(raw).copySync(hit.path);
        voiced++;
      }
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
  print('voiced with $provider: $voiced line(s) voiced, $reused reused from .voice-cache; no credits spent');
}

Future<void> elevenlabs(List scenes, List<String> args) async {
  final dry = args.contains('--dry-run');
  final key = dry ? '' : Platform.environment['ELEVENLABS_API_KEY']!;
  final chunks = chunk(scenes, recipe['chunk_chars'] as int);
  final seedsFile = File('src/seeds.json');
  final seeds = seedsFile.existsSync() ? Map<String, dynamic>.from(jsonDecode(seedsFile.readAsStringSync())) : <String, dynamic>{};
  final reqFile = File('src/requests.json');
  final requests = reqFile.existsSync() ? Map<String, dynamic>.from(jsonDecode(reqFile.readAsStringSync())) : <String, dynamic>{};
  final rawFile = File('src/timings.raw.json');
  final previous = rawFile.existsSync() ? jsonDecode(rawFile.readAsStringSync()) as List : [];

  String chunkId(List<Map> c) => '${c.first['id']}..${c.last['id']}';
  Set<String>? redo;
  if (args.contains('reroll')) {
    final bad = File('check/bad.txt').readAsStringSync().split(',').where((s) => s.isNotEmpty).toSet();
    redo = {for (final c in chunks) if (c.any((s) => bad.contains(s['id']))) chunkId(c)};
    for (final id in redo) {
      seeds[id] = (seeds[id] ?? recipe['seed']) + 1;
    }
  }

  final prefix = recipe['prefix'] as String;
  if (dry) {
    print('dry run: would POST https://api.elevenlabs.io/v1/text-to-speech/${recipe['voice_id']}/with-timestamps, '
        'model ${recipe['model_id']}, prefix "${recipe['prefix']}", ${chunks.length} chunk(s)');
  }
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
    if (dry) {
      spent += text.length;
      print('would send $cid: seed $seed, ${text.length} chars, ${fresh.length} stitched: "${text.length > 60 ? '${text.substring(0, 60)}...' : text}"');
      continue;
    }
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
  if (dry) {
    print('dry run: nothing was sent and no file was written. A real run sends these requests: about $spent credits (an estimate, about 1 per character).');
    return;
  }
  rawFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert([for (final s in scenes) out[s['id']]]));
  seedsFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(seeds));
  reqFile.writeAsStringSync(const JsonEncoder.withIndent('  ').convert(requests));
  print('credits charged: $spent');
}
