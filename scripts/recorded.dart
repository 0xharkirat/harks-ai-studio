import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'recording.dart';

// Build the narration from your own recordings, in place of a voice made by text to speech.
// It writes what tts.dart writes (public/audio/<scene>.mp3 and src/timings.raw.json), so pad.dart, layout.dart,
// check.dart and the render run unchanged. It adds public/audio/recorded/<scene>_<n>.wav (1 clip per line),
// word times in timings.raw.json (for subtitles), and src/recorded.json (which file made which scene).
//
//   dart recorded.dart                      # every scene, from recordings/
//   dart recorded.dart --scenes intro..help # only these scenes (a test clip); also --scenes intro,what
//   dart recorded.dart --dry-run            # which recording each line would use; changes nothing
//   dart recorded.dart --force              # write the files even when a line differs or is missing
//   dart recorded.dart --dir ~/Desktop/rec --model medium.en
//
// Recordings, in the folder tts.recorded.dir (default recordings/ in the project). Names, any of wav m4a aiff mp3 flac:
//   take.wav       one continuous take of the whole script (or of the scenes named with --scenes)
//   intro.wav      all the lines of the scene "intro", read in order with a pause between lines
//   intro_2.wav    line 2 of "intro" alone (lines count from 1, as in the reading sheet)
// A line uses intro_2 first, then intro, then take, so re-recording 1 line or 1 scene never means a new take.
//
// Each file is raised or lowered to -16 LUFS (what layout.dart targets for the whole narration), Whisper
// (tts.recorded.model, default small.en) gives the word times, the words are matched to the script, and each
// line is cut out with its leading and trailing silence trimmed and tts.recorded.pad of clean silence kept.
// What Whisper heard is compared with the script line by line. A line with no recording, or one that is
// very different from the script, stops the build and names the line.

final studio = File.fromUri(Platform.script).parent.parent.path;
// Config lookup lives in scripts/config-path.sh; a project's own snapshot (src/config.json) wins over it,
// so an old video keeps the recipe it was made with.
String configFile(String studio) => File('src/config.json').existsSync()
    ? 'src/config.json'
    : (Process.runSync('zsh', ['$studio/scripts/config-path.sh']).stdout as String).trim();

/// A line is `ok` up to this character error rate against the script, `differs` up to [veryDifferent], and `BAD` above it.
const closeEnough = 0.10;
const veryDifferent = 0.30;

/// Where each recording is, by name: take, a scene id, or `<scene>_<n>`.
typedef Found = Map<String, File>;

Found findRecordings(Directory dir, Set<String> sceneIds, Map<String, int> lineCounts) {
  if (!dir.existsSync()) throw 'no recordings folder at ${dir.path}: make it and put the recordings in it (names: take, <scene>, <scene>_<n>; see the top of scripts/recorded.dart)';
  final found = <String, File>{};
  final ignored = <String>[];
  for (final f in dir.listSync().whereType<File>()) {
    final base = f.path.split('/').last;
    final dot = base.lastIndexOf('.');
    if (base.startsWith('.') || dot < 0 || !audioExts.contains(base.substring(dot + 1).toLowerCase())) continue;
    final name = base.substring(0, dot).toLowerCase();
    final m = RegExp(r'^(.+)_(\d+)$').firstMatch(name);
    final scene = m?[1] ?? name;
    if (name != 'take' && !lineCounts.containsKey(scene)) {
      ignored.add(base);
      continue;
    }
    if (!sceneIds.contains(scene) && name != 'take') continue; // a scene left out by --scenes
    if (m != null && (int.parse(m[2]!) < 1 || int.parse(m[2]!) > lineCounts[scene]!)) {
      throw '$base: scene "$scene" has lines 1-${lineCounts[scene]}, so there is no line ${m[2]}';
    }
    if (found.containsKey(name)) throw 'two recordings are named "$name" (${found[name]!.path.split('/').last} and $base): keep one';
    found[name] = f;
  }
  if (ignored.isNotEmpty) stderr.writeln('ignored (not named take, a scene id, or <scene>_<n>): ${ignored.join(', ')}');
  return found;
}

/// The recording that voices a line: its own file, else its scene's file, else the take.
String? sourceOf(ScriptLine l, Found found) {
  for (final name in ['${l.scene}_${l.index}', l.scene, 'take']) {
    if (found.containsKey(name)) return name;
  }
  return null;
}

String rounded(num v) => v.toStringAsFixed(1);

double r3(double v) => (v * 1000).round() / 1000;

Future<void> run(List<String> args) async {
  String? flag(String name) {
    final i = args.indexOf(name);
    if (i < 0) return null;
    if (i + 1 >= args.length) throw '$name needs a value';
    return args[i + 1];
  }

  final dry = args.contains('--dry-run') || args.contains('status');
  final force = args.contains('--force');
  final verbose = args.contains('-v') || args.contains('--verbose');
  final config = jsonDecode(File(configFile(studio)).readAsStringSync()) as Map;
  final tts = (config['tts'] as Map?) ?? const {};
  final settings = (tts['recorded'] as Map?) ?? const {};
  final dirPath = flag('--dir') ?? (settings['dir'] ?? 'recordings') as String;
  final model = flag('--model') ?? (settings['model'] ?? 'small.en') as String;
  final pad = (settings['pad'] as num?)?.toDouble() ?? 0.1;
  final gap = (settings['gap'] as num?)?.toDouble() ?? 0.25;
  if (tts['provider'] != 'recorded') {
    stderr.writeln('note: tts.provider is "${tts['provider'] ?? 'elevenlabs'}", not "recorded". Run `zsh ../../../scripts/voice-mode.sh recorded` so check.dart skips the clone gates and the AI voice tags go.');
  }

  final script = jsonDecode(File('script.json').readAsStringSync()) as List;
  final todo = [for (final l in scriptLines(script)) if ('${l.say} ${l.tts ?? ''}'.contains('TODO')) '${l.id}: ${l.say}'];
  if (todo.isNotEmpty) {
    stderr.writeln('script.json still has TODO lines, so nothing was built:\n  ${todo.join('\n  ')}');
    exit(1);
  }
  final allIds = [for (final s in script) s['id'] as String];
  final spec = flag('--scenes');
  final ids = spec == null ? allIds : parseScenes(spec, allIds);
  final scenes = [for (final s in script) if (ids.contains(s['id'])) s as Map];
  final lines = scriptLines(scenes);

  final dir = Directory(dirPath.replaceFirst(RegExp(r'^~'), Platform.environment['HOME'] ?? '~'));
  final found = findRecordings(dir, ids.toSet(), {for (final s in script) s['id'] as String: (s['lines'] as List).length});
  final source = {for (final l in lines) l.id: sourceOf(l, found)};

  // Which recording voices what.
  print('recordings in ${dir.path}: ${found.isEmpty ? 'none' : (found.values.map((f) => f.path.split('/').last).toList()..sort()).join(', ')}');
  final missing = <String>[];
  for (final s in scenes) {
    final of = [for (final l in scriptLines([s])) source[l.id]];
    final sceneId = s['id'] as String;
    final n = of.length;
    if (of.every((x) => x == null)) {
      print('  ${sceneId.padRight(10)} $n lines   MISSING: record $sceneId.wav (all $n lines) or ${sceneId}_1.wav to ${sceneId}_$n.wav, or put it in take.wav');
    } else if (of.toSet().length == 1) {
      print('  ${sceneId.padRight(10)} $n lines   ${found[of.first]!.path.split('/').last}');
    } else {
      print('  ${sceneId.padRight(10)} $n lines   ${[for (final (i, x) in of.indexed) '${i + 1}:${x == null ? 'MISSING' : found[x]!.path.split('/').last}'].join('  ')}');
    }
    for (final (i, x) in of.indexed) {
      if (x == null) missing.add('${sceneId}_${i + 1}');
    }
  }
  if (dry) exit(missing.isEmpty ? 0 : 1);

  // Hear and normalise each recording that voices a line.
  final used = {for (final v in source.values) if (v != null) v};
  final work = Directory('check/recorded')..createSync(recursive: true);
  final heard = hear([for (final n in used) found[n]!.path], model: model, cacheDir: '${work.path}/whisper');
  final results = <String, List<LineResult>>{}; // source name -> a result per line it covers
  final norm = <String, String>{};
  final envelopes = <String, Envelope>{};
  print('\nsource                      length   loudness');
  for (final name in used) {
    final f = found[name]!;
    final out = '${work.path}/$name.wav';
    final level = normalise(f.path, out);
    norm[name] = out;
    envelopes[name] = Envelope.of(out);
    print('${f.path.split('/').last.padRight(26)} ${rounded(seconds(f.path)).padLeft(6)} s  ${rounded(level.before).padLeft(6)} -> ${rounded(level.after)} LUFS');
    final covers = name == 'take'
        ? lines
        : RegExp(r'^(.+)_(\d+)$').hasMatch(name)
            ? [for (final l in lines) if ('${l.scene}_${l.index}' == name) l]
            : [for (final l in lines) if (l.scene == name) l];
    results[name] = alignLines(covers, heard[f.path]!);
  }

  // Compare what was heard with the script, the way retake.dart prints its playback check.
  final bad = <String>[];
  var heading = false;
  var oks = 0, differs = 0;
  final byLine = <String, ({String name, LineResult r})>{};
  for (final l in lines) {
    final name = source[l.id];
    if (name == null) continue;
    final r = results[name]!.firstWhere((r) => r.line.id == l.id);
    byLine[l.id] = (name: name, r: r);
    final status = r.start == null ? 'BAD ' : r.cer > veryDifferent ? 'BAD ' : r.cer > closeEnough ? 'diff' : 'ok  ';
    if (status == 'BAD ') bad.add(l.id);
    if (status == 'ok  ') oks++;
    if (status == 'diff') differs++;
    final why = r.start == null ? 'not heard in ${found[name]!.path.split('/').last}' : '${(r.cer * 100).round()}% off';
    if (status == 'ok  ' && !verbose) continue;
    if (!heading) print('\nline            what Whisper heard against the script');
    heading = true;
    print('$status ${l.id.padRight(14)} $why\n  script: ${l.say}\n  heard:  ${r.start == null ? '(nothing)' : r.heard}');
  }
  print('${verbose ? '' : '\n$oks line(s) match the script and are not listed. '}$differs differ a little, ${bad.length} are BAD, ${missing.length} have no recording.');
  if ((bad.isNotEmpty || missing.isNotEmpty) && !force) {
    stderr.writeln('\nFAILED: ${[...bad.map((b) => '$b (very different from the script, or not heard)'), ...missing.map((m) => '$m (no recording)')].join(', ')}.\n'
        'Nothing was built. Record these lines again (names are listed above), or change script.json if the script is what changed, then run recorded.dart again. --force builds anyway.');
    exit(1);
  }

  // Cut each line out of its normalised source.
  final clips = Directory('public/audio/recorded');
  if (clips.existsSync()) clips.deleteSync(recursive: true);
  clips.createSync(recursive: true);
  final timings = [];
  final manifest = <String, dynamic>{};
  var speech = 0.0, cutLines = 0;
  for (final s in scenes) {
    final id = s['id'] as String;
    final sceneLines = scriptLines([s]);
    final files = <String>[];
    final built = [];
    var t = 0.0;
    for (final l in sceneLines) {
      final hit = byLine[l.id];
      if (hit == null || hit.r.start == null) continue; // missing, under --force
      final r = hit.r;
      final all = results[hit.name]!;
      final env = envelopes[hit.name]!;
      final at = all.indexOf(r);
      final dur = seconds(norm[hit.name]!);
      // Neighbours in the same recording bound the line. Whisper's times only say roughly where the line before
      // ends and this one starts; the cut is made in the real silence nearby.
      final prev = all.take(at).lastWhere((x) => x.end != null, orElse: () => LineResult(l));
      final next = all.skip(at + 1).firstWhere((x) => x.start != null, orElse: () => LineResult(l));
      final lo = prev.end == null ? 0.0 : env.cutNear((prev.end! + r.start!) / 2);
      final hi = next.start == null ? dur : env.cutNear((r.end! + next.start!) / 2);
      // Speech starts at the first loud frame and stops at the last one, inside the cuts.
      final onset = env.firstSound(lo, hi) ?? r.start!;
      final offset = env.lastSound(lo, hi) ?? r.end!;
      final a = math.max(lo, onset - 0.08);
      final b = math.min(hi, offset + 0.08);
      final file = '${clips.path}/${l.id}.wav';
      final fade = 0.008;
      sh('ffmpeg', [
        '-v', 'error', '-y', '-ss', '$a', '-to', '$b', '-i', norm[hit.name]!,
        '-af', 'afade=t=in:d=$fade,afade=t=out:st=${math.max(0, b - a - fade)}:d=$fade,adelay=${(pad * 1000).round()}:all=1,apad=pad_dur=$pad',
        '-ac', '1', '-ar', '44100', '-c:a', 'pcm_s16le', file,
      ]);
      final length = seconds(file);
      if (files.isNotEmpty) t += gap;
      double local(double x) => r3(t + pad + (x.clamp(onset, offset) - a));
      built.add({
        'say': l.say,
        'start': local(onset),
        'end': local(offset),
        'words': [for (final w in r.words) {'w': w.w, 'start': local(w.start), 'end': local(w.end)}],
      });
      speech += offset - onset;
      cutLines++;
      t += length;
      files.add(file);
    }
    if (files.isEmpty) continue;
    final gaps = [for (var k = 1; k < files.length; k++) 'anullsrc=r=44100:cl=mono,atrim=duration=$gap[g$k];'].join();
    final parts = [for (var k = 0; k < files.length; k++) '${k > 0 ? '[g$k]' : ''}[$k:a]'].join();
    sh('ffmpeg', [
      '-v', 'error', '-y',
      for (final f in files) ...['-i', f],
      '-filter_complex', '$gaps${parts}concat=n=${2 * files.length - 1}:v=0:a=1[out]',
      '-map', '[out]', '-c:a', 'libmp3lame', '-q:a', '2', 'public/audio/$id.mp3',
    ]);
    timings.add({'id': id, 'duration': seconds('public/audio/$id.mp3'), 'lines': built});
    manifest[id] = {
      'sources': [
        for (final n in {for (final l in sceneLines) byLine[l.id]?.name}.whereType<String>())
          {'file': found[n]!.path, 'size': found[n]!.lengthSync(), 'changed': found[n]!.lastModifiedSync().millisecondsSinceEpoch},
      ],
      'mp3Bytes': File('public/audio/$id.mp3').lengthSync(),
    };
    print('$id: ${files.length} lines, ${rounded(t)} s');
  }
  File('src/timings.raw.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert(timings));
  File('src/recorded.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert({
    'model': model,
    'loudness': targetLufs,
    'pad': pad,
    'gap': gap,
    'scenes': manifest,
  }));
  print('recorded voice: ${timings.length} scene(s), $cutLines line(s), ${rounded(speech)} s of speech from ${used.length} recording(s); no credits spent');
  if (bad.isNotEmpty || missing.isNotEmpty) {
    stderr.writeln('WARNING: --force built this with ${bad.isEmpty ? '' : 'the wrong words in ${bad.join(', ')}'}${bad.isNotEmpty && missing.isNotEmpty ? ' and ' : ''}${missing.isEmpty ? '' : 'no audio for ${missing.join(', ')}'}. Subtitles show the script, not what was said.');
  }
  print('Next: dart ../../../scripts/pad.dart 0.2   then   dart ../../../scripts/layout.dart');
}

Future<void> main(List<String> args) async {
  try {
    await run(args);
  } on String catch (message) {
    stderr.writeln('recorded: $message');
    exit(1);
  }
}
