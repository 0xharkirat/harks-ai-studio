import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

import 'recording.dart';

// Clean the raw takes from record.dart into the narration voice: close, warm, even, and silent between words.
// Run it from the video's project folder.
//
//   dart ../../../scripts/voice.dart                  # every take in recordings/raw/ with no clean copy yet
//   dart ../../../scripts/voice.dart --force          # clean every take again
//   dart ../../../scripts/voice.dart --fit            # fit the EQ to the reference again, from the takes in raw/
//   dart ../../../scripts/voice.dart --play hook      # play a take before and after the chain, at the same loudness
//   dart ../../../scripts/voice.dart --play test      # the same, for the newest test take
//   dart ../../../scripts/voice.dart --measure a.mp3  # print the tone curve of any audio file
//
// The chain: the louder channel (the DJI receiver can send the voice on 1 side only), a highpass, the speech raised
// to a fixed level, a light denoise, a gentle expander that lowers the room between words, an EQ fitted band by
// band to the reference tone curve, a de-esser, a compressor, then the loudness recorded.dart wants and a limiter.
//
// Raw takes never change. A clean take goes to recordings/<same name>.wav, where recorded.dart reads it. A test take
// goes to recordings/check/, with the before copies that --play makes, so recorded.dart never sees them.
// The settings for this voice and mic are in recordings/voice.json. The first run writes it with the defaults and
// an EQ fitted to the takes it finds. Edit it to tune the sound: a take is cleaned again when voice.json is newer
// than its clean copy. "eq" is the fit, and --fit replaces it. "eqTrim" is your own change per band in dB: it adds
// on top of the fit and stays when you fit again.

const rawDir = 'recordings/raw';
const cleanDir = 'recordings';
const checkDir = 'recordings/check';
const settingsFile = 'recordings/voice.json';

/// The bands of the tone curve, 2/3 octave wide, by centre (Hz).
const bands = [60, 100, 160, 250, 400, 630, 1000, 1600, 2500, 4000, 6300, 10000];

/// The fit leaves the bands below this alone: under the highpass, a boost only lifts rumble and handling noise.
const fitFrom = 100;

/// The tone the EQ aims for: Kit Langton's Scrawl narration (https://scrawl.kitlangton.com/narration.mp3), as
/// --measure prints it. dB per band, relative to the 1 kHz band.
const reference = {
  60: -2.7, 100: 15.0, 160: 7.6, 250: 6.8, 400: 0.4, 630: -1.0, //
  1000: 0.0, 1600: 0.7, 2500: 2.9, 4000: 3.1, 6300: -1.6, 10000: -10.0,
};

const defaults = <String, Object>{
  'highpass': 70, // Hz
  'speechLufs': -20, // the speech is raised or lowered to this before the denoise, the expander, and the compressor
  'denoise': 10, // dB that the denoise takes off the room
  'expanderBelow': 12, // dB under speechLufs where the expander starts: breaths and rustle between phrases sit below it
  'expanderRatio': 6, // tested on Hark's first takes: breaths stay as soft as in the raw take, and word ends keep their level
  'expanderRange': 30, // dB: the most the expander lowers the sound between phrases
  'eqCap': 6, // dB: the most the fit boosts or cuts 1 band
  'eq': <String, double>{},
  'eqTrim': <String, double>{},
  'deesser': 0.4, // 0 to 1
  'compressorThreshold': -26, // dBFS, at speechLufs
  'compressorRatio': 3,
  'limiter': -2.5, // dBFS sample peak: the true peak lands up to about 1 dB higher, under the -1.5 dB that recorded.dart allows
};

Future<void> main(List<String> args) async {
  try {
    run(args);
  } catch (e) {
    fail('$e');
  }
}

void run(List<String> args) {
  final measure = valueOf(args, '--measure');
  if (measure != null) {
    printCurve({measure.split('/').last: toneCurve([measure])});
    return;
  }
  if (!Directory(rawDir).existsSync()) fail('no $rawDir/ here. Run this from a video project folder, after record.dart');
  final takes = rawTakes();
  if (takes.isEmpty) fail('no takes in $rawDir/ yet. Record them with record.dart');
  Directory(checkDir).createSync(recursive: true);

  var s = loadSettings();
  if (args.contains('--fit') || !File(settingsFile).existsSync()) {
    final scenes = takes.where((t) => !isTest(t)).toList();
    s = fit(scenes.isNotEmpty ? scenes : takes, s);
    saveSettings(s);
  }

  final play = valueOf(args, '--play');
  if (play != null) {
    final raw = findTake(takes, play);
    if (!upToDate(raw)) cleanTake(raw, s);
    final before = '$checkDir/${baseName(raw)}.before.wav';
    final m = speechStats(raw, pickChannel(raw), s['highpass'] as num);
    sh('ffmpeg', [
      '-v', 'error', '-y', '-i', raw, //
      '-af', '${pickChannel(raw)},volume=${(targetLufs - m.lufs).toStringAsFixed(2)}dB,alimiter=limit=${lin(-1)}:level=0:latency=1',
      '-c:a', 'pcm_s24le', before,
    ]);
    print('Before: the raw take, at the same loudness as the clean one ($before)');
    Process.runSync('afplay', [before]);
    print('After: the clean take (${cleanPath(raw)})');
    Process.runSync('afplay', [cleanPath(raw)]);
    return;
  }

  final force = args.contains('--force');
  final todo = [for (final t in takes) if (force || !upToDate(t)) t];
  if (todo.isEmpty) {
    print('Every take in $rawDir/ has a clean copy. Clean them again with --force.');
    return;
  }
  for (final t in todo) {
    cleanTake(t, s);
  }
  printCurve({'reference': reference, 'clean takes': toneCurve([for (final t in todo) cleanPath(t)])});
}

// ---- Takes ----

List<String> rawTakes() {
  final all = [
    for (final f in Directory(rawDir).listSync().whereType<File>())
      if (!f.path.split('/').last.startsWith('.') && !f.path.endsWith('.part.wav') && audioExts.contains(f.path.split('.').last.toLowerCase())) f.path,
  ];
  return all..sort();
}

String baseName(String path) {
  final base = path.split('/').last;
  return base.substring(0, base.lastIndexOf('.'));
}

bool isTest(String raw) => baseName(raw).startsWith('test-');

String cleanPath(String raw) => '${isTest(raw) ? checkDir : cleanDir}/${baseName(raw)}.wav';

/// A clean copy is up to date when it is newer than its raw take and than the settings.
bool upToDate(String raw) {
  final clean = File(cleanPath(raw));
  if (!clean.existsSync()) return false;
  final made = clean.lastModifiedSync();
  final settings = File(settingsFile);
  return made.isAfter(File(raw).lastModifiedSync()) && (!settings.existsSync() || made.isAfter(settings.lastModifiedSync()));
}

/// The take named [name], or the newest test take for "test".
String findTake(List<String> takes, String name) {
  if (name == 'test') {
    final tests = takes.where(isTest).toList();
    if (tests.isEmpty) fail('no test take in $rawDir/. Record one with record.dart --test');
    return tests.last; // the names carry the time, so the last one is the newest
  }
  return takes.firstWhere((t) => baseName(t) == name, orElse: () => fail('no take "$name" in $rawDir/ (takes: ${takes.map(baseName).join(', ')})'));
}

// ---- The chain ----

/// Cleans [raw] into [cleanPath] (or [out]), prints what changed unless [quiet], and returns the clean file.
String cleanTake(String raw, Map<String, dynamic> s, {String? out, bool quiet = false}) {
  out ??= cleanPath(raw);
  final pick = pickChannel(raw);
  final m = speechStats(raw, pick, s['highpass'] as num);
  final tmp = '${Directory.systemTemp.createTempSync('voice').path}/chain.wav';
  sh('ffmpeg', ['-v', 'error', '-y', '-i', raw, '-af', chain(s, pick, m, seconds(raw)), '-c:a', 'pcm_f32le', tmp]);
  // The limiter takes a little off the loud parts, so up to 3 passes bring the take to targetLufs: recorded.dart
  // then needs no more gain, and its loudnorm stays linear.
  final limit = 'alimiter=limit=${lin((s['limiter'] as num).toDouble())}:attack=5:release=50:level=0:latency=1';
  var gain = targetLufs - speechStats(tmp, 'anull', 0).lufs;
  late ({double lufs, double floor, double peak}) done;
  for (var pass = 0; pass < 3; pass++) {
    sh('ffmpeg', ['-v', 'error', '-y', '-i', tmp, '-af', 'volume=${gain.toStringAsFixed(2)}dB,$limit', '-ar', '48000', '-c:a', 'pcm_s24le', out]);
    done = speechStats(out, 'anull', 0);
    if ((done.lufs - targetLufs).abs() <= 0.1) break;
    gain += targetLufs - done.lufs;
  }
  File(tmp).parent.deleteSync(recursive: true);

  final drift = (seconds(out) - seconds(raw)).abs();
  if (drift > 0.05) throw 'the chain changed the length of $raw by ${drift.toStringAsFixed(2)} s, so word times would no longer match';
  if (quiet) return out;
  print('${baseName(raw)}: ${seconds(out).toStringAsFixed(1)} s, ${m.lufs.toStringAsFixed(1)} -> ${done.lufs.toStringAsFixed(1)} LUFS, '
      'true peak ${done.peak.toStringAsFixed(1)} dB, room ${m.floor.toStringAsFixed(0)} -> ${done.floor.toStringAsFixed(0)} dBFS'
      '${pick == 'anull' ? '' : ', channel ${int.parse(pick.substring(pick.length - 1)) + 1} of the raw take'}');
  return out;
}

/// The ffmpeg filters from the channel pick to the compressor, set from the level [m] and the [length] of the take.
String chain(Map<String, dynamic> s, String pick, ({double lufs, double floor, double peak}) m, double length) {
  double n(String key) => (s[key] as num).toDouble();
  final gain = n('speechLufs') - m.lufs;
  final room = m.floor + gain;
  // Set from the speech, not the room: a close mic makes breaths and rustle much louder than the room, and the
  // compressor and the presence boost lift them again, so they must go down before those.
  final open = n('speechLufs') - n('expanderBelow');
  final eq = bandGains(s);
  return [
    pick,
    'aresample=48000',
    'highpass=f=${n('highpass')}:poles=2',
    'volume=${gain.toStringAsFixed(2)}dB',
    // The denoise delays the sound by 1200 samples at 48 kHz and drops as much at the end: the pad and the trim undo it.
    'apad=pad_len=1200',
    'afftdn=nr=${n('denoise')}:nf=${room.clamp(-80.0, -20.0).toStringAsFixed(1)}:tn=1',
    'atrim=start_sample=1200,asetpts=PTS-STARTPTS',
    'agate=threshold=${lin(open)}:ratio=${n('expanderRatio')}:range=${lin(-n('expanderRange'))}:attack=5:release=200',
    // The EQ delays the sound by its 0.05 s and adds twice that at the end; the trim puts every word back in place.
    "firequalizer=gain_entry='${[for (final b in bands) 'entry($b,${eq[b]!.toStringAsFixed(2)})'].join(';')}':delay=0.05",
    'atrim=start=0.05:duration=${length.toStringAsFixed(6)},asetpts=PTS-STARTPTS',
    'deesser=i=${n('deesser')}',
    'acompressor=threshold=${lin(n('compressorThreshold'))}:ratio=${n('compressorRatio')}:attack=10:release=150',
  ].join(',');
}

/// The EQ gain of each band: the fit plus your trim.
Map<int, double> bandGains(Map<String, dynamic> s) {
  double band(String key, int b) => ((s[key] as Map)['$b'] as num?)?.toDouble() ?? 0;
  return {for (final b in bands) b: band('eq', b) + band('eqTrim', b)};
}

/// Fits the EQ so that the clean [takes] together match the shape of [reference]. Each round cleans them, measures
/// the curve, and moves each band by what is left, up to 6 rounds or until no free band is off by 0.5 dB.
/// Both curves are smoothed first: each voice has a peak at its own pitch (Kit near 100 Hz, Hark near 160 Hz), and
/// fitting band by band would boost one band and cut the next to move that peak, which sounds boomy and boxy.
/// The loudness is set after the EQ, so only the shape counts: each move is centred on its median, which spends
/// the [eqCap] dB a band may move where the shapes differ. A band at the cap is not free.
Map<String, dynamic> fit(List<String> takes, Map<String, dynamic> s) {
  final cap = (s['eqCap'] as num).toDouble();
  final fitted = bands.where((b) => b >= fitFrom).toList();
  final eq = {for (final b in bands) b: 0.0};
  final tmp = Directory.systemTemp.createTempSync('voice-fit');
  print('Fitting the EQ to the reference, from ${takes.length} take(s)...');
  for (var round = 1; round <= 6; round++) {
    final trial = {...s, 'eq': {for (final b in bands) '$b': eq[b]}};
    final curve = toneCurve([for (final (i, t) in takes.indexed) cleanTake(t, trial, out: '${tmp.path}/$i.wav', quiet: true)]);
    final want = smooth(reference), got = smooth(curve);
    final miss = {for (final b in fitted) b: want[b]! - got[b]!};
    final centre = median(miss.values);
    final worst = [for (final b in fitted) if (eq[b]!.abs() < cap) (miss[b]! - centre).abs()].fold(0.0, math.max);
    print('  round $round: the worst free band is off by ${worst.toStringAsFixed(1)} dB');
    if (worst < 0.5) break;
    for (final b in fitted) {
      eq[b] = (eq[b]! + miss[b]! - centre).clamp(-cap, cap);
    }
  }
  tmp.deleteSync(recursive: true);
  print('EQ: ${[for (final b in bands) '$b Hz ${eq[b]!.toStringAsFixed(1)}'].join(', ')}');
  return {...s, 'eq': {for (final b in bands) '$b': double.parse(eq[b]!.toStringAsFixed(1))}};
}

/// Each band averaged with its 2 neighbours (1:2:1), so a curve shows the tone and not the pitch of 1 voice.
Map<int, double> smooth(Map<int, double> c) => {
      for (final (i, b) in bands.indexed)
        b: (2 * c[b]! + c[bands[math.max(i - 1, 0)]]! + c[bands[math.min(i + 1, bands.length - 1)]]!) / 4,
    };

double median(Iterable<double> values) {
  final v = values.toList()..sort();
  return v.length.isOdd ? v[v.length ~/ 2] : (v[v.length ~/ 2 - 1] + v[v.length ~/ 2]) / 2;
}

// ---- Levels ----

/// The filter that keeps the louder channel of [file], or `anull` for a mono file.
String pickChannel(String file) {
  final channels = int.parse(sh('ffprobe', ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=channels', '-of', 'csv=p=0', file]).trim());
  if (channels < 2) return 'anull';
  final err = Process.runSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'astats=metadata=0:measure_overall=none', '-f', 'null', '-']).stderr as String;
  final rms = [for (final m in RegExp(r'RMS level dB: (-?[0-9.inf]+)').allMatches(err)) double.tryParse(m[1]!) ?? -120.0];
  if (rms.length < channels) throw 'ffmpeg could not measure the channels of $file: $err';
  var best = 0;
  for (var c = 1; c < channels; c++) {
    if (rms[c] > rms[best]) best = c;
  }
  return 'pan=mono|c0=c$best';
}

/// The loudness and the true peak of [file] after [pick] and a highpass at [highpass] Hz (0: none), and its quietest
/// 50 ms (the room).
({double lufs, double floor, double peak}) speechStats(String file, String pick, num highpass) {
  final hp = highpass > 0 ? 'highpass=f=$highpass:poles=2,' : '';
  final r = Process.runSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', '$pick,${hp}astats=metadata=0:length=0.05,ebur128=peak=true', '-f', 'null', '-']);
  final err = r.stderr as String;
  double? last(String pattern) => RegExp(pattern).allMatches(err).map((m) => double.tryParse(m[1]!) ?? -120.0).lastOrNull;
  final lufs = last(r'I:\s+(-?[0-9.]+) LUFS'), peak = last(r'Peak:\s+(-?[0-9.inf]+) dBFS');
  final floor = last(r'RMS (?:trough|through) dB: (-?[0-9.inf]+)');
  if (r.exitCode != 0 || lufs == null || floor == null || peak == null) {
    throw 'ffmpeg could not measure $file: ${err.trim().split('\n').reversed.take(4).toList().reversed.join('\n')}';
  }
  if (lufs < -70) throw '$file has no sound (it measures below -70 LUFS); record it again';
  return (lufs: lufs, floor: floor.isFinite ? floor : -120.0, peak: peak);
}

/// dB to the linear level that ffmpeg filters take.
String lin(double db) => math.pow(10, db / 20).toStringAsFixed(6);

// ---- Tone curve ----

/// The tone curve of [files] together: the speech energy in each band, in dB relative to the 1 kHz band.
/// Only frames within 30 dB of the loud speech count, so the pauses and the room do not tilt it.
Map<int, double> toneCurve(List<String> files) {
  const size = 8192, hop = 4096, rate = 48000;
  final window = Float64List.fromList([for (var i = 0; i < size; i++) 0.5 - 0.5 * math.cos(2 * math.pi * i / size)]);
  final edges = {for (final b in bands) b: (lo: b / math.pow(2, 1 / 3), hi: b * math.pow(2, 1 / 3))};
  final frames = <({double db, Float64List power})>[];
  for (final f in files) {
    final r = Process.runSync('ffmpeg', ['-v', 'error', '-i', f, '-ac', '1', '-ar', '$rate', '-f', 'f32le', '-'], stdoutEncoding: null);
    if (r.exitCode != 0) throw 'ffmpeg could not read $f: ${r.stderr}';
    final bytes = r.stdout as List<int>;
    final pcm = Uint8List.fromList(bytes.sublist(0, bytes.length - bytes.length % 4)).buffer.asFloat32List();
    for (var start = 0; start + size <= pcm.length; start += hop) {
      final re = Float64List(size), im = Float64List(size);
      var sum = 0.0;
      for (var i = 0; i < size; i++) {
        sum += pcm[start + i] * pcm[start + i];
        re[i] = pcm[start + i] * window[i];
      }
      fft(re, im);
      final power = Float64List(size ~/ 2);
      for (var k = 0; k < size ~/ 2; k++) {
        power[k] = re[k] * re[k] + im[k] * im[k];
      }
      frames.add((db: 10 * math.log(sum / size + 1e-20) / math.ln10, power: power));
    }
  }
  if (frames.isEmpty) throw 'no audio to measure in ${files.join(', ')}';
  final sorted = [for (final f in frames) f.db]..sort();
  final loud = sorted[(sorted.length * 0.9).floor().clamp(0, sorted.length - 1)];
  final energy = {for (final b in bands) b: 0.0};
  for (final f in frames.where((f) => f.db > loud - 30 && f.db > -70)) {
    for (final b in bands) {
      for (var k = (edges[b]!.lo * size / rate).ceil(); k < edges[b]!.hi * size / rate; k++) {
        energy[b] = energy[b]! + f.power[k];
      }
    }
  }
  return {for (final b in bands) b: 10 * math.log((energy[b]! + 1e-30) / (energy[1000]! + 1e-30)) / math.ln10};
}

/// An in-place radix-2 FFT; the length must be a power of 2.
void fft(Float64List re, Float64List im) {
  final n = re.length;
  for (var i = 1, j = 0; i < n; i++) {
    var bit = n >> 1;
    for (; j & bit != 0; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      final r = re[i], m = im[i];
      re[i] = re[j];
      im[i] = im[j];
      re[j] = r;
      im[j] = m;
    }
  }
  for (var len = 2; len <= n; len <<= 1) {
    final angle = -2 * math.pi / len;
    final wr = math.cos(angle), wi = math.sin(angle);
    for (var i = 0; i < n; i += len) {
      var cr = 1.0, ci = 0.0;
      for (var k = 0; k < len ~/ 2; k++) {
        final a = i + k, b = a + len ~/ 2;
        final tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr;
        im[b] = im[a] - ti;
        re[a] += tr;
        im[a] += ti;
        final next = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = next;
      }
    }
  }
}

void printCurve(Map<String, Map<int, double>> curves) {
  final names = curves.keys.toList();
  print('\nTone curve, dB relative to 1 kHz:');
  print('  ${'Hz'.padLeft(6)}  ${names.map((n) => n.padLeft(14)).join()}');
  for (final b in bands) {
    print('  ${'$b'.padLeft(6)}  ${names.map((n) => curves[n]![b]!.toStringAsFixed(1).padLeft(14)).join()}');
  }
}

// ---- Settings ----

Map<String, dynamic> loadSettings() {
  final f = File(settingsFile);
  final mine = f.existsSync() ? jsonDecode(f.readAsStringSync()) as Map<String, dynamic> : <String, dynamic>{};
  return {...defaults, ...mine};
}

void saveSettings(Map<String, dynamic> s) => File(settingsFile).writeAsStringSync('${const JsonEncoder.withIndent('  ').convert(s)}\n');

String? valueOf(List<String> args, String flag) {
  final i = args.indexOf(flag);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

Never fail(String message) {
  stderr.writeln('voice.dart: $message');
  exit(1);
}
