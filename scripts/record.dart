import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'recording.dart';

// Record your narration scene by scene, for recorded.dart. Run it from the video's project folder.
//
//   dart ../../../scripts/record.dart --test     # 1 test take: checks the level and the room first
//   dart ../../../scripts/record.dart            # every scene, from the first one with no take yet
//   dart ../../../scripts/record.dart --scenes hook..data
//   dart ../../../scripts/record.dart --list     # the audio inputs
//   dart ../../../scripts/record.dart --device 2 # an input by number or by part of its name (default: the DJI receiver)
//
// Each scene shows its lines, numbered as in the reading script. Enter starts a take and Enter stops it.
// A fumbled line: finish the scene, then redo that line alone (l 3), or redo the scene (r). Never read a line
// twice in 1 take: recorded.dart matches the words in order, so a repeat breaks the match.
//
// Takes go to recordings/raw/ as the mic sends them (48 kHz, 24 bit): <scene>.wav, or <scene>_<n>.wav for 1 line.
// A replaced take moves to recordings/raw/old/, so no take is ever lost. Nothing changes raw/ after that: the voice
// chain reads it and writes the cleaned files that recorded.dart uses into recordings/.

const rawDir = 'recordings/raw';

/// Level checks on a finished take, in dBFS.
const tooHot = -1.0; // a peak above this has probably clipped
/// More samples than this exactly at the peak: the receiver clipped or limited them. The DJI Mic Mini stops at
/// -2 dBFS, so its clipping never reaches [tooHot]; a clean take has 1 or 2 samples at its peak.
const flatTop = 8;
const tooQuiet = -24.0; // a peak below this wastes the mic's range
const noisyRoom = -55.0; // the quietest 50 ms above this: a fan, traffic, or a noisy receiver gain

Future<void> main(List<String> args) async {
  if (!File('script.json').existsSync()) fail('run this from a video project folder (no script.json here)');
  final scenes = jsonDecode(File('script.json').readAsStringSync()) as List;
  final ids = [for (final s in scenes) s['id'] as String];
  final lines = scriptLines(scenes);

  if (args.contains('--list')) {
    for (final (i, name) in audioInputs()) {
      print('[$i] $name');
    }
    return;
  }
  final input = pickInput(valueOf(args, '--device'));
  Directory('$rawDir/old').createSync(recursive: true);

  if (args.contains('--test')) {
    final test = lines.where((l) => l.scene == ids.first).toList();
    final stamp = DateTime.now().toIso8601String().substring(0, 19).replaceAll(':', '-');
    await take(input, '$rawDir/test-$stamp.wav', 'Test take (input: ${input.label})', test,
        'Read these lines in your recording voice. Then stay silent for 3 seconds, so the room gets measured, and press Enter.');
    return;
  }

  final spec = valueOf(args, '--scenes');
  final todo = spec != null ? parseScenes(spec, ids) : ids.skipWhile((id) => File('$rawDir/$id.wav').existsSync()).toList();
  if (todo.isEmpty) {
    print('Every scene has a take in $rawDir/. Redo 1 with --scenes <id>.');
    return;
  }
  for (final (n, id) in todo.indexed) {
    final mine = lines.where((l) => l.scene == id).toList();
    final title = 'Scene ${ids.indexOf(id) + 1} of ${ids.length}: $id   (${n + 1} of ${todo.length} in this session)';
    while (true) {
      final verdict = await take(input, '$rawDir/$id.wav', title, mine, 'Read every line once, with a short pause between lines.');
      if (verdict == null) break;
      final next = await afterTake(input, id, mine, verdict);
      if (next == 'next') break;
      if (next == 'quit') return;
    }
  }
  print('\nDone: every scene in this session has a take. The voice chain cleans them next.');
}

/// Records 1 take into [out] and prints its level check. Returns false when the take is not usable, null when skipped.
Future<bool?> take(Input input, String out, String title, List<ScriptLine> show, String hint) async {
  stdout.write('\x1B[2J\x1B[H');
  print('$title\n');
  for (final l in show) {
    print('  ${l.index.toString().padLeft(2)}   ${l.tts ?? l.say}\n');
  }
  print(hint);
  if (prompt('Enter: start recording   s: skip') == 's') return null;

  final tmp = '$out.part.wav';
  final ffmpeg = await Process.start('ffmpeg', ['-hide_banner', '-nostdin', '-y', ...input.ffmpegArgs, '-c:a', 'pcm_s24le', '-ar', '48000', tmp]);
  final started = Completer<void>();
  final log = StringBuffer();
  ffmpeg.stderr.transform(utf8.decoder).listen((s) {
    log.write(s);
    if (!started.isCompleted && s.contains('size=')) started.complete();
  });
  await Future.any([started.future, ffmpeg.exitCode, Future.delayed(const Duration(seconds: 8))]);
  if (!started.isCompleted) {
    ffmpeg.kill(ProcessSignal.sigint);
    fail('the recording did not start. ffmpeg said:\n$log');
  }
  print('\n\x1B[1;31m● RECORDING\x1B[0m   Press Enter to stop.');
  stdin.readLineSync();
  ffmpeg.kill(ProcessSignal.sigint); // ffmpeg finishes the WAV header on SIGINT
  await ffmpeg.exitCode;

  final f = File(out);
  if (f.existsSync()) f.renameSync('$rawDir/old/${out.split('/').last.replaceAll('.wav', '')}-${DateTime.now().millisecondsSinceEpoch}.wav');
  File(tmp).renameSync(out);
  return check(out);
}

/// Prints the length, the peak, and the room noise of [file], with what to change. Returns false when it must be redone.
bool check(String file) {
  final s = levels(file);
  print('\nSaved $file: ${s.seconds.toStringAsFixed(1)} s, peak ${s.peak.toStringAsFixed(1)} dBFS, room ${s.floor.toStringAsFixed(0)} dBFS');
  if (s.peak < -70) {
    print('NO SOUND. Check that the receiver shows the transmitter connected, and that macOS gives your terminal app the microphone '
        '(System Settings > Privacy & Security > Microphone).');
    return false;
  }
  var ok = true;
  if (s.peak > tooHot) {
    print('TOO LOUD: it probably clipped. Turn the gain dial on the receiver down 1 step, then redo it.');
    ok = false;
  } else if (s.atPeak > flatTop) {
    print('TOO LOUD: ${s.atPeak} samples sit exactly at the peak, so the receiver clipped them. Turn the gain dial down 1 step, '
        'hold the mic a little to the side of your mouth, then redo it.');
    ok = false;
  } else if (s.peak < tooQuiet) {
    print('Quiet: turn the gain dial on the receiver up 1 step for the next take.');
  }
  if (s.floor > noisyRoom) print('Noisy room: turn off fans and the air conditioner, and close the window.');
  if (ok) print('Level OK.');
  return ok;
}

/// The menu after a scene's take: next, redo the scene, redo 1 line, play, or quit.
Future<String> afterTake(Input input, String id, List<ScriptLine> mine, bool ok) async {
  while (true) {
    final a = prompt('\nEnter: next scene   r: redo the scene   l <n>: redo line n alone   p: play   q: quit');
    if (a == '' && ok) return 'next';
    if (a == '') {
      print('This take needs a redo (see above). Type r to redo it, or n to keep it anyway.');
      continue;
    }
    if (a == 'n') return 'next';
    if (a == 'q') return 'quit';
    if (a == 'r') return 'redo';
    if (a == 'p') {
      Process.runSync('afplay', ['$rawDir/$id.wav']);
      continue;
    }
    final m = RegExp(r'^l\s*(\d+)$').firstMatch(a);
    final n = m == null ? null : int.parse(m[1]!);
    if (n == null || n < 1 || n > mine.length) {
      print('Type a line number from 1 to ${mine.length}, for example: l 2');
      continue;
    }
    await take(input, '$rawDir/${id}_$n.wav', 'Scene $id, line $n alone', [mine[n - 1]], 'Read this line once.');
  }
}

String prompt(String text) {
  stdout.write('$text\n> ');
  return (stdin.readLineSync() ?? 'q').trim().toLowerCase();
}

({double seconds, double peak, double floor, int atPeak}) levels(String file) {
  final r = Process.runSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'astats=metadata=0:length=0.05', '-f', 'null', '-']);
  double last(String key) {
    final all = RegExp('$key: (-?[0-9.inf]+)').allMatches(r.stderr as String).map((m) => double.tryParse(m[1]!) ?? -120).toList();
    return all.isEmpty ? -120 : all.last; // the last match is the Overall block
  }

  return (seconds: seconds(file), peak: last('Peak level dB'), floor: last('RMS (?:trough|through) dB'), atPeak: last('Abs Peak count').round());
}

// ---- Inputs ----

class Input {
  Input(this.label, this.ffmpegArgs);
  final String label;
  final List<String> ffmpegArgs;
}

/// The macOS audio inputs that ffmpeg sees, as (index, name).
List<(int, String)> audioInputs() {
  final r = Process.runSync('ffmpeg', ['-hide_banner', '-f', 'avfoundation', '-list_devices', 'true', '-i', '']);
  final err = r.stderr as String;
  final audio = err.substring(err.indexOf('audio devices') < 0 ? err.length : err.indexOf('audio devices'));
  return [for (final m in RegExp(r'\[(\d+)\] (.+)').allMatches(audio)) (int.parse(m[1]!), m[2]!.trim())];
}

/// The input to record from: [want] as a number or part of a name; by default the DJI receiver.
/// `sine` records a test tone, to check this script with no mic.
Input pickInput(String? want) {
  if (want == 'sine') return Input('test tone', ['-re', '-f', 'lavfi', '-i', 'sine=frequency=220:sample_rate=48000']);
  final all = audioInputs();
  final pattern = want == null ? RegExp('dji|mic mini|wireless', caseSensitive: false) : null;
  for (final (i, name) in all) {
    if (pattern != null ? pattern.hasMatch(name) : (want == '$i' || name.toLowerCase().contains(want!.toLowerCase()))) {
      return Input(name, ['-f', 'avfoundation', '-i', ':$i']);
    }
  }
  fail('${want == null ? 'no DJI receiver found. Plug the receiver into the Mac with USB-C and switch it on' : 'no input matches "$want"'}.\n'
      'Inputs: ${all.map((d) => '[${d.$1}] ${d.$2}').join(', ')}');
}

String? valueOf(List<String> args, String flag) {
  final i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

Never fail(String message) {
  stderr.writeln('record.dart: $message');
  exit(1);
}
