import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;

import 'recording.dart';

// Render 1 chapter (a scene), or a run of scenes, of a long video as a vertical Short: 1080x1920, 60 s at most.
// Run from the video's project folder, after the video has a layout (tts.dart or recorded.dart, pad.dart, layout.dart).
//
//   dart short.dart what                                  # the scene "what", out/short-what.mp4
//   dart short.dart what..help --hook "Claude Code is 1 session. Paperclip adds the company."
//   dart short.dart what --out ~/Desktop/short.mp4 --no-render   # only prepare src/short/; render by hand
//
// The scenes are not a crop of the 16:9 render: scenes.tsx is drawn again by short-video/vertical/Short.tsx on a
// 1920x1080 stage scaled to the width of the frame, under a hook line, above big word-by-word captions.
// The narration is the scene audio the long video plays (public/audio/<scene>.wav), mixed again and set to -16 LUFS.
// When tts.provider is "recorded", a scene that was not built from your recordings stops the Short.
// Word times come from the layout (recorded.dart writes them); a video with a made voice gets them from Whisper.
// The hook is --hook, else the scene's "hook" in script.json, else the scene's first line.

final studio = File.fromUri(Platform.script).parent.parent.path;
// Config lookup lives in scripts/config-path.sh; a project's own snapshot (src/config.json) wins over it,
// so an old video keeps the recipe it was made with.
String configFile(String studio) => File('src/config.json').existsSync()
    ? 'src/config.json'
    : (Process.runSync('zsh', ['$studio/scripts/config-path.sh']).stdout as String).trim();

/// A Short is 60 s at most.
const maxSeconds = 60.0;

/// After the last spoken line, the Short holds the picture this long (plus the scene's own "hold").
const endHold = 0.9;

Never fail(String message) {
  stderr.writeln('short: $message');
  exit(1);
}

/// With tts.provider "recorded", every scene must come from your recordings, built and laid out since.
void verifyRecorded(List<String> ids) {
  final file = File('src/recorded.json');
  if (!file.existsSync()) fail('tts.provider is "recorded", but src/recorded.json is missing, so this Short would not have your voice. Run recorded.dart, pad.dart and layout.dart first.');
  final built = (jsonDecode(file.readAsStringSync()) as Map)['scenes'] as Map;
  final problems = <String>[];
  for (final id in ids) {
    final m = built[id] as Map?;
    if (m == null) {
      problems.add('$id: not built from recordings');
      continue;
    }
    for (final s in m['sources'] as List) {
      final rec = File(s['file'] as String);
      if (!rec.existsSync()) {
        problems.add('$id: the recording ${s['file']} is gone');
      } else if (rec.lengthSync() != s['size'] || rec.lastModifiedSync().millisecondsSinceEpoch != s['changed']) {
        problems.add('$id: ${s['file']} changed after the last build');
      }
    }
    final mp3 = File('public/audio/$id.mp3'), wav = File('public/audio/$id.wav');
    if (!mp3.existsSync() || mp3.lengthSync() != m['mp3Bytes']) {
      problems.add('$id: public/audio/$id.mp3 is not the file recorded.dart wrote (another voice may have replaced it)');
    } else if (!wav.existsSync() || wav.lastModifiedSync().isBefore(mp3.lastModifiedSync())) {
      problems.add('$id: pad.dart has not run since recorded.dart');
    } else if (File('src/layout.json').lastModifiedSync().isBefore(wav.lastModifiedSync())) {
      problems.add('$id: layout.dart has not run since pad.dart');
    }
  }
  if (problems.isNotEmpty) {
    fail('this Short would not have your recorded voice:\n  ${problems.join('\n  ')}\nRun recorded.dart, pad.dart and layout.dart again.');
  }
}

/// A scene's label: its "chapter" in script.json, else the capitalised id (as chapters.dart prints it).
String labelOf(Map? scene, String id) => (scene?['chapter'] as String?) ?? (id.isEmpty ? id : id[0].toUpperCase() + id.substring(1));

Future<void> run(List<String> args) async {
  final positional = <String>[];
  String? hookArg, outArg, modelArg;
  var render = true;
  var i = 0;
  String value() => i + 1 < args.length ? args[++i] : fail('${args[i]} needs a value');
  for (; i < args.length; i++) {
    switch (args[i]) {
      case '--hook':
        hookArg = value();
      case '--out':
        outArg = value();
      case '--model':
        modelArg = value();
      case '--no-render':
        render = false;
      default:
        positional.add(args[i]);
    }
  }
  if (positional.length != 1) {
    stderr.writeln('usage: dart short.dart <scene | first..last> [--hook "text"] [--out file.mp4] [--model small.en] [--no-render]\n(run from the video\'s project folder)');
    exit(2);
  }
  for (final f in ['src/layout.json', 'script.json', 'src/scenes.tsx', 'src/ui.tsx']) {
    if (!File(f).existsSync()) fail('$f is missing: run this from the video\'s project folder, after tts.dart or recorded.dart, pad.dart and layout.dart');
  }
  final layout = jsonDecode(File('src/layout.json').readAsStringSync()) as Map;
  final fps = layout['fps'] as int;
  final all = layout['scenes'] as List;
  final script = {for (final s in jsonDecode(File('script.json').readAsStringSync()) as List) s['id'] as String: s as Map};
  final ids = parseScenes(positional.first, [for (final s in all) s['id'] as String]);
  final at = all.indexWhere((s) => s['id'] == ids.first);
  for (final (k, id) in ids.indexed) {
    if (all[at + k]['id'] != id) fail('the scenes of a Short must follow each other in the video; "$id" does not come right after "${ids[k - 1]}"');
  }
  final chosen = [for (var k = 0; k < ids.length; k++) all[at + k] as Map];

  final config = jsonDecode(File(configFile(studio)).readAsStringSync()) as Map;
  final provider = ((config['tts'] as Map?)?['provider'] ?? 'elevenlabs') as String;
  if (provider == 'recorded') verifyRecorded(ids);

  // The timeline: the scenes end to end, with the black cards and the first scene's long lead-in cut.
  final scenes = <Map>[];
  final audioAt = <double>[]; // seconds into the Short where each scene's narration file starts
  var cursor = 0;
  for (final (k, s) in chosen.indexed) {
    final from = s['from'] as int;
    final lines = s['lines'] as List;
    final lead = (s['audioFrom'] as int) - from; // frames before the voice, a black card included
    var skip = (s['black'] as int?) ?? 0;
    if (k == 0) skip = math.max(skip, lead - (fps * 0.3).round()); // the voice starts within 0.3 s of frame 0
    var frames = (s['frames'] as int) - skip;
    if (k == chosen.length - 1) {
      final hold = (script[s['id']]?['hold'] as num?)?.toDouble() ?? 0.0;
      frames = math.min(frames, (lines.last['end'] as int) - from - skip + ((endHold + hold) * fps).round());
    }
    scenes.add({
      'id': s['id'],
      'from': cursor,
      'frames': frames,
      'skip': skip,
      if (k > 0 && s['continues'] == true) 'continues': true,
      'cue': [for (final l in lines) (l['start'] as int) - from],
      'ends': [for (final l in lines) (l['end'] as int) - from],
    });
    audioAt.add((cursor + lead - skip) / fps);
    cursor += frames;
  }
  final total = cursor;
  if (total > maxSeconds * fps) {
    fail('${ids.join(', ')} run ${(total / fps).toStringAsFixed(1)} s, and a Short is ${maxSeconds.round()} s at most. Scenes: '
        '${[for (final s in scenes) '${s['id']} ${((s['frames'] as int) / fps).toStringAsFixed(1)} s'].join(', ')}. Pick fewer scenes.');
  }

  // The narration: the scene audio the long video plays, placed on the Short's timeline, at -16 LUFS.
  final key = ids.length == 1 ? ids.first : '${ids.first}-${ids.last}';
  for (final id in ids) {
    if (!File('public/audio/$id.wav').existsSync()) fail('public/audio/$id.wav is missing: run pad.dart and layout.dart');
  }
  Directory('public/short').createSync(recursive: true);
  Directory('check/short').createSync(recursive: true);
  final duration = total / fps;
  sh('ffmpeg', [
    '-v', 'error', '-y',
    for (final id in ids) ...['-i', 'public/audio/$id.wav'],
    '-filter_complex',
    '${[for (var k = 0; k < ids.length; k++) '[$k:a]adelay=${(audioAt[k] * 1000).round()}:all=1[a$k];'].join()}'
        '${[for (var k = 0; k < ids.length; k++) '[a$k]'].join()}amix=inputs=${ids.length}:normalize=0,apad=whole_dur=$duration,atrim=end=$duration[out]',
    '-map', '[out]', '-ac', '1', '-ar', '44100', 'check/short/$key.mix.wav',
  ]);
  final level = normalise('check/short/$key.mix.wav', 'public/short/$key.wav');

  // Word times in Short frames, for the captions.
  final words = <Map>[];
  String wordsFrom;
  if (chosen.every((s) => (s['lines'] as List).every((l) => l['words'] != null))) {
    wordsFrom = 'the layout';
    for (final (k, s) in chosen.indexed) {
      final shift = (scenes[k]['from'] as int) - (s['from'] as int) - (scenes[k]['skip'] as int);
      for (final l in s['lines'] as List) {
        for (final w in l['words'] as List) {
          words.add({'w': w['w'], 'start': (w['start'] as int) + shift, 'end': (w['end'] as int) + shift});
        }
      }
    }
  } else {
    wordsFrom = 'Whisper ${modelArg ?? 'small.en'}';
    final lines = scriptLines([for (final id in ids) script[id]!]);
    final heard = hear(['public/short/$key.wav'], model: modelArg ?? 'small.en', cacheDir: 'check/recorded/whisper');
    final results = alignLines(lines, heard['public/short/$key.wav']!);
    final layoutLines = [for (final (k, s) in chosen.indexed) for (final l in s['lines'] as List) (shift: (scenes[k]['from'] as int) - (s['from'] as int) - (scenes[k]['skip'] as int), line: l as Map)];
    for (final (i, r) in results.indexed) {
      if (r.start != null && r.cer <= veryDifferentLine) {
        for (final w in r.words) {
          words.add({'w': w.w, 'start': (w.start * fps).round(), 'end': (w.end * fps).round()});
        }
      } else {
        // Not found in the audio: spread the line's words over the time the layout gives it.
        stderr.writeln('short: ${r.line.id} was not found in the audio, so its captions are spread evenly over the line');
        final l = layoutLines[i];
        final ws = r.line.words;
        final chars = ws.map((w) => w.length).reduce((a, b) => a + b);
        final a = (l.line['start'] as int) + l.shift, b = (l.line['end'] as int) + l.shift;
        var done = 0;
        for (final w in ws) {
          words.add({'w': w, 'start': a + ((b - a) * done / chars).round(), 'end': a + ((b - a) * (done + w.length) / chars).round()});
          done += w.length;
        }
      }
    }
  }
  words.sort((a, b) => (a['start'] as int).compareTo(b['start'] as int));

  final firstLine = (script[ids.first]!['lines'] as List).first['say'] as String;
  final hook = hookArg ?? (script[ids.first]?['hook'] as String?) ?? firstLine;
  final label = ids.length == 1 ? labelOf(script[ids.first], ids.first) : '${labelOf(script[ids.first], ids.first)} - ${labelOf(script[ids.last], ids.last)}';

  Directory('src/short').createSync(recursive: true);
  for (final f in Directory('$studio/short-video/vertical').listSync().whereType<File>()) {
    f.copySync('src/short/${f.path.split('/').last}');
  }
  File('src/short/short.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert({
    'fps': fps,
    'totalFrames': total,
    'hook': hook,
    'label': label,
    'audio': 'short/$key.wav',
    'scenes': scenes,
    'words': words,
  }));
  print('short $key: ${ids.length} scene(s), ${duration.toStringAsFixed(1)} s of $maxSeconds, narration ${level.before.toStringAsFixed(1)} -> ${level.after.toStringAsFixed(1)} LUFS (${provider == 'recorded' ? 'your recordings, checked against src/recorded.json' : 'a made voice, "$provider"'})');
  print('hook (${hookArg != null ? '--hook' : script[ids.first]?['hook'] != null ? 'script.json' : 'the first line, pass --hook to change it'}): $hook');
  print('captions: ${words.length} words from $wordsFrom');

  final out = outArg ?? 'out/short-$key.mp4';
  if (!render) {
    print('prepared src/short/. Render with: pnpm exec remotion render src/short/index.ts Short $out');
    return;
  }
  if (!Directory('node_modules').existsSync()) fail('no node_modules here: run zsh $studio/scripts/install-deps.sh');
  Directory(File(out).parent.path).createSync(recursive: true);
  final p = await Process.start('pnpm', ['exec', 'remotion', 'render', 'src/short/index.ts', 'Short', out], mode: ProcessStartMode.inheritStdio);
  final code = await p.exitCode;
  if (code != 0) exit(code);

  // Check the render, as step 7 of SKILL.md does by hand.
  final info = jsonDecode(sh('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration,size', '-of', 'json', out])) as Map;
  final stream = (info['streams'] as List).first as Map;
  final seconds = double.parse(info['format']['duration'] as String);
  final loud = Process.runSync('ffmpeg', ['-hide_banner', '-nostats', '-i', out, '-af', 'ebur128', '-f', 'null', '-']).stderr as String;
  final lufs = RegExp(r'I:\s+(-?[\d.]+) LUFS').allMatches(loud).lastOrNull?[1] ?? '?';
  final mb = int.parse(info['format']['size'] as String) / 1e6;
  print('\nShort: $out  ${stream['width']}x${stream['height']}  ${seconds.toStringAsFixed(1)} s  $lufs LUFS  ${mb.toStringAsFixed(1)} MB');
  if (stream['width'] != 1080 || stream['height'] != 1920) fail('the render is ${stream['width']}x${stream['height']}, not 1080x1920');
  if (seconds > maxSeconds) fail('the render is ${seconds.toStringAsFixed(1)} s, over the ${maxSeconds.round()} s limit');
}

/// A line whose heard words are this far off the script is treated as not found, and its captions are spread evenly.
const veryDifferentLine = 0.5;

Future<void> main(List<String> args) async {
  try {
    await run(args);
  } on String catch (message) {
    stderr.writeln('short: $message');
    exit(1);
  }
}
