import 'dart:convert';
import 'dart:io';
import 'dart:math' as math;
import 'dart:typed_data';

// Shared by recorded.dart (recorded voice) and short.dart (Shorts):
//   hear()        - word times from the local Whisper, cached per file
//   alignLines()  - match what Whisper heard to script lines, word by word
//   normalise()   - loudness to the level layout.dart targets (-16 LUFS, true peak -1.5 dB)
//   Envelope      - a 10 ms energy curve, to find where speech starts and stops
//   parseScenes() - "a,b" or "a..b" into scene ids

/// layout.dart runs loudnorm=I=-16:TP=-1.5:LRA=11 on the narration track, so recordings meet it at -16.
const targetLufs = -16.0;

/// Audio formats ffmpeg reads that a voice recording usually comes in.
const audioExts = {'wav', 'm4a', 'aif', 'aiff', 'aifc', 'mp3', 'flac', 'caf', 'ogg', 'opus', 'aac'};

/// Runs [exe] and returns its stdout; a failure throws with the command's own message.
String sh(String exe, List<String> args) {
  final r = Process.runSync(exe, args);
  if (r.exitCode != 0) throw '$exe failed (${r.exitCode}): ${r.stderr}';
  return r.stdout as String;
}

double seconds(String file) => double.parse(sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).trim());

/// 64-bit FNV-1a, for cache file names.
String fnv(String s) {
  var h = 0xcbf29ce484222325;
  for (final b in utf8.encode(s)) {
    h = ((h ^ b) * 0x100000001b3) & 0xFFFFFFFFFFFFFFFF;
  }
  return h.toRadixString(16).padLeft(16, '0');
}

/// Scene ids from "a,b,c" or a range "a..b" (in the order of [all]); an unknown id throws.
List<String> parseScenes(String spec, List<String> all) {
  void known(String id) {
    if (!all.contains(id)) throw 'no scene "$id" in script.json (scenes: ${all.join(', ')})';
  }

  if (spec.contains('..')) {
    final [a, b] = spec.split('..');
    known(a);
    known(b);
    final i = all.indexOf(a), j = all.indexOf(b);
    if (j < i) throw 'scene range "$spec" runs backwards: $b comes before $a in script.json';
    return all.sublist(i, j + 1);
  }
  final ids = spec.split(',').where((s) => s.isNotEmpty).toList();
  ids.forEach(known);
  return [for (final id in all) if (ids.contains(id)) id];
}

// ---- Loudness ----

/// The numbers the first loudnorm pass prints for [src] (strings, as loudnorm writes them).
Map<String, dynamic> measureLoudness(String src) {
  final r = Process.runSync('ffmpeg', [
    '-hide_banner', '-nostats', '-i', src,
    '-af', 'aformat=channel_layouts=mono,loudnorm=I=$targetLufs:TP=-1.5:LRA=11:print_format=json',
    '-f', 'null', '-',
  ]);
  final err = r.stderr as String;
  final open = err.lastIndexOf('{'), close = err.lastIndexOf('}');
  if (r.exitCode != 0 || open < 0 || close < open) throw 'ffmpeg could not measure the loudness of $src: $err';
  return jsonDecode(err.substring(open, close + 1)) as Map<String, dynamic>;
}

double? _lufs(Map<String, dynamic> m) {
  final v = double.tryParse('${m['input_i']}');
  return v == null || v.isInfinite || v.isNaN || v < -70 ? null : v;
}

/// Writes [out] as a mono 44.1 kHz WAV: [src] at [targetLufs] by a two-pass, linear loudnorm (a plain gain
/// when the recording allows it). Returns the loudness before and after.
({double before, double after}) normalise(String src, String out) {
  final m = measureLoudness(src);
  final before = _lufs(m);
  if (before == null) throw '$src has no sound (it measures below -70 LUFS); record it again';
  final filter = 'aformat=channel_layouts=mono,loudnorm=I=$targetLufs:TP=-1.5:LRA=11:'
      'measured_I=${m['input_i']}:measured_TP=${m['input_tp']}:measured_LRA=${m['input_lra']}:'
      'measured_thresh=${m['input_thresh']}:offset=${m['target_offset']}:linear=true,aresample=44100';
  sh('ffmpeg', ['-v', 'error', '-y', '-i', src, '-af', filter, '-c:a', 'pcm_s16le', out]);
  final drift = (seconds(out) - seconds(src)).abs();
  if (drift > 0.05) throw 'normalising $src changed its length by ${drift.toStringAsFixed(2)} s, so word times would no longer match';
  return (before: before, after: _lufs(measureLoudness(out)) ?? before);
}

// ---- Speech edges ----

/// The energy of a recording in 10 ms frames (dBFS of the RMS), to find where speech starts and stops.
class Envelope {
  Envelope._(this.db);

  static const frame = 0.01;
  final List<double> db;

  factory Envelope.of(String wav) {
    final r = Process.runSync('ffmpeg', ['-v', 'error', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], stdoutEncoding: null);
    if (r.exitCode != 0) throw 'ffmpeg could not read $wav: ${r.stderr}';
    final bytes = Uint8List.fromList(r.stdout as List<int>);
    final pcm = Int16List.view(bytes.buffer, 0, bytes.length ~/ 2);
    const per = 160;
    final db = <double>[];
    for (var i = 0; i + per <= pcm.length; i += per) {
      var sum = 0.0;
      for (var k = i; k < i + per; k++) {
        final v = pcm[k] / 32768;
        sum += v * v;
      }
      db.add(sum == 0 ? -120.0 : 10 * math.log(sum / per) / math.ln10);
    }
    return Envelope._(db);
  }

  late final List<double> _sorted = [...db]..sort();

  /// Level of the room: a low percentile of the frames, since a recording always has some quiet in it.
  late final double floor = db.isEmpty ? -120.0 : _sorted[(_sorted.length * 0.05).floor()];

  /// Level of loud speech: a high percentile of the frames.
  late final double loud = db.isEmpty ? -120.0 : _sorted[(_sorted.length * 0.95).floor()];

  /// Above this a frame counts as speech: 14 dB over the room and within 30 dB of loud speech,
  /// so a breath or a click does not count; never above -38 dB or below -55 dB.
  late final double threshold = (math.max(floor + 14, loud - 30)).clamp(-55.0, -38.0);

  int _at(double t) => (t / frame).floor().clamp(0, db.isEmpty ? 0 : db.length - 1);

  /// Start of the first frame in [from, to] that counts as sound, or null.
  double? firstSound(double from, double to) {
    for (var i = _at(from); i <= _at(to) && i < db.length; i++) {
      if (db[i] >= threshold) return i * frame;
    }
    return null;
  }

  /// End of the last frame in [from, to] that counts as sound, or null.
  double? lastSound(double from, double to) {
    for (var i = _at(to); i >= _at(from); i--) {
      if (i < db.length && db[i] >= threshold) return (i + 1) * frame;
    }
    return null;
  }

  /// The quietest moment in [from, to] (3 frames averaged), for a cut between 2 lines with no pause between them.
  double quietest(double from, double to) {
    var best = double.infinity, at = (from + to) / 2;
    for (var i = _at(from); i <= _at(to) && i < db.length; i++) {
      final a = i > 0 ? db[i - 1] : db[i], c = db[i], b = i + 1 < db.length ? db[i + 1] : db[i];
      final level = (a + c + b) / 3;
      if (level < best) {
        best = level;
        at = (i + 0.5) * frame;
      }
    }
    return at;
  }

  /// Where to cut between 2 lines that Whisper puts at [boundary] (the end of one and the start of the next).
  /// Whisper stretches a word over the pause next to it, so the boundary can be off by half a second:
  /// the cut goes to the middle of the longest silence near it (at least 0.1 s, and the nearer one wins a tie),
  /// or, when the lines run together, to the quietest moment.
  double cutNear(double boundary) {
    final from = boundary - 0.5, to = boundary + 0.8;
    var best = 0.0, at = -1.0;
    var run = -1;
    void close(int end) {
      if (run < 0) return;
      final length = (end - run) * frame, centre = (run + end) / 2 * frame;
      final score = length - 0.25 * (centre - boundary).abs();
      if (length >= 0.1 && score > best) {
        best = score;
        at = centre;
      }
      run = -1;
    }

    final last = math.min(_at(to), db.length - 1);
    for (var i = _at(from); i <= last; i++) {
      if (db[i] < threshold) {
        if (run < 0) run = i;
      } else {
        close(i);
      }
    }
    close(last + 1);
    return at >= 0 ? at : quietest(boundary - 0.1, boundary + 0.1);
  }
}

// ---- Whisper ----

/// One word Whisper heard, with its time in the file.
class Heard {
  Heard(this.text, this.start, this.end);
  final String text;
  final double start, end;
}

/// Word times for each file in [files] from the local Whisper (`whisper` CLI, model cached in ~/.cache/whisper).
/// One whisper run loads the model once for all uncached files; each result is cached in [cacheDir] by the
/// file's name, size, change time, and the model, so a rebuild only waits for recordings that changed.
Map<String, List<Heard>> hear(List<String> files, {required String model, required String cacheDir}) {
  Directory(cacheDir).createSync(recursive: true);
  String cacheOf(String f) {
    final s = File(f).statSync();
    return '$cacheDir/${fnv('$model|${f.split('/').last}|${s.size}|${s.modified.millisecondsSinceEpoch}')}.json';
  }

  final todo = [for (final f in files) if (!File(cacheOf(f)).existsSync()) f];
  if (todo.isNotEmpty) {
    final names = todo.map((f) => f.split('/').last.replaceFirst(RegExp(r'\.[^.]+$'), '')).toList();
    if (names.toSet().length != names.length) throw 'two recordings share a name once the extension is removed (${todo.map((f) => f.split('/').last).join(', ')}); keep one';
    final tmp = Directory.systemTemp.createTempSync('whisper');
    try {
      print('whisper $model: hearing ${todo.length} recording(s)');
      final w = Process.runSync('whisper', [
        ...todo, '--model', model, '--language', 'en', '--word_timestamps', 'True', '--output_format', 'json',
        '--output_dir', tmp.path, '--fp16', 'False', '--verbose', 'False', '--condition_on_previous_text', 'False',
      ]);
      if (w.exitCode != 0) throw 'whisper failed: ${w.stderr}';
      for (var i = 0; i < todo.length; i++) {
        final out = File('${tmp.path}/${names[i]}.json');
        if (!out.existsSync()) throw 'whisper wrote no transcript for ${todo[i]}: ${w.stderr}';
        out.copySync(cacheOf(todo[i]));
      }
    } finally {
      tmp.deleteSync(recursive: true);
    }
  }
  return {
    for (final f in files)
      f: [
        for (final s in (jsonDecode(File(cacheOf(f)).readAsStringSync())['segments'] as List))
          for (final w in (s['words'] as List? ?? const []))
            if ((w['word'] as String).trim().isNotEmpty) Heard((w['word'] as String).trim(), (w['start'] as num).toDouble(), (w['end'] as num).toDouble()),
      ].fold<List<Heard>>([], (out, w) {
        // Whisper writes "100,000" as "100" and ",000"; put them back together.
        if (out.isNotEmpty && RegExp(r'^[,.]\d').hasMatch(w.text) && RegExp(r'\d$').hasMatch(out.last.text)) {
          out.last = Heard(out.last.text + w.text, out.last.start, w.end);
        } else {
          out.add(w);
        }
        return out;
      }),
  };
}

// ---- Script lines ----

/// One line of script.json. [index] counts from 1, as in the file names of a recording (`intro_2.wav`).
class ScriptLine {
  ScriptLine(this.scene, this.index, this.say, this.tts);
  final String scene;
  final int index;
  final String say;
  final String? tts;

  String get id => '${scene}_$index';
  List<String> get words => say.split(RegExp(r'\s+')).where((w) => w.isNotEmpty).toList();
}

List<ScriptLine> scriptLines(List scenes) => [
      for (final s in scenes)
        for (final (i, l) in (s['lines'] as List).indexed) ScriptLine(s['id'] as String, i + 1, l['say'] as String, l['tts'] as String?),
    ];

// ---- Matching what was heard to the script ----

const _numberWords = {
  'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9', 'ten': '10',
  'eleven': '11', 'twelve': '12', 'thirteen': '13', 'fourteen': '14', 'fifteen': '15', 'sixteen': '16', 'seventeen': '17', 'eighteen': '18',
  'nineteen': '19', 'twenty': '20',
};

/// Words to compare: lowercase letters and digits, "100,000" as 100000, a hyphen or slash as a break,
/// and "seven" as 7, because Whisper writes small numbers as digits.
List<String> tokens(String word) => word
    .toLowerCase()
    .replaceAll('’', "'")
    .replaceAllMapped(RegExp(r'(\d),(?=\d)'), (m) => m[1]!)
    .split(RegExp(r'[-\u2013\u2014/]'))
    .map((p) => p.replaceAll(RegExp(r"[^a-z0-9']"), '').replaceAll(RegExp(r"^'+|'+$"), ''))
    .where((p) => p.isNotEmpty)
    .map((p) => _numberWords[p] ?? p)
    .toList();

int editDistance(String a, String b) {
  if (a.isEmpty) return b.length;
  if (b.isEmpty) return a.length;
  var prev = List<int>.generate(b.length + 1, (j) => j);
  for (var i = 1; i <= a.length; i++) {
    final cur = List<int>.filled(b.length + 1, 0)..[0] = i;
    for (var j = 1; j <= b.length; j++) {
      final c = a.codeUnitAt(i - 1) == b.codeUnitAt(j - 1) ? 0 : 1;
      final best = prev[j - 1] + c;
      final del = prev[j] + 1, ins = cur[j - 1] + 1;
      cur[j] = best < del ? (best < ins ? best : ins) : (del < ins ? del : ins);
    }
    prev = cur;
  }
  return prev[b.length];
}

/// A script word with the time it was spoken, in the file's seconds.
class WordTime {
  WordTime(this.w, this.start, this.end);
  final String w;
  double start, end;
}

/// What the recording says for one script line.
class LineResult {
  LineResult(this.line);
  final ScriptLine line;

  /// Seconds in the recording where the line's first word starts and its last word ends; null when it was not heard.
  double? start, end;

  /// Character error rate, spaces ignored, against the better of `say` and `tts`: 0 is a perfect match, 1 is nothing like it.
  double cer = 1;

  /// What Whisper heard over the line, as it wrote it.
  String heard = '';

  /// One entry per word of `say`, with times.
  List<WordTime> words = [];
}

/// Matches [heard] (the words of a recording, in order) to [lines] (the script it should contain, in order):
/// an edit-distance alignment over normalised words, so a missing line, an extra word, or a misheard word
/// stays local to where it happens. Spoken extras within 0.35 s of a line (such as "paper clip" for
/// "Paperclip") belong to that line; anything else stays out of every line.
List<LineResult> alignLines(List<ScriptLine> lines, List<Heard> heard) {
  // Script tokens, remembering their line and word.
  final sTok = <String>[], sLine = <int>[], sWord = <int>[];
  for (final (li, l) in lines.indexed) {
    for (final (wi, w) in l.words.indexed) {
      for (final t in tokens(w)) {
        sTok.add(t);
        sLine.add(li);
        sWord.add(wi);
      }
    }
  }
  final hTok = <String>[], hWord = <int>[];
  for (final (wi, w) in heard.indexed) {
    for (final t in tokens(w.text)) {
      hTok.add(t);
      hWord.add(wi);
    }
  }
  final n = sTok.length, m = hTok.length;

  // Cost 0 for the same word, 0.2-1 for a similar or different word, 1 to skip a word on either side.
  double sub(String a, String b) => a == b ? 0 : 0.2 + 0.8 * editDistance(a, b) / (a.length > b.length ? a.length : b.length);
  final cost = List.generate(n + 1, (_) => Float32List(m + 1));
  final step = List.generate(n + 1, (_) => Uint8List(m + 1)); // 1 diagonal, 2 skip a script word, 3 skip a heard word
  for (var i = 1; i <= n; i++) {
    cost[i][0] = i.toDouble();
    step[i][0] = 2;
  }
  for (var j = 1; j <= m; j++) {
    cost[0][j] = j.toDouble();
    step[0][j] = 3;
  }
  for (var i = 1; i <= n; i++) {
    for (var j = 1; j <= m; j++) {
      final d = cost[i - 1][j - 1] + sub(sTok[i - 1], hTok[j - 1]);
      final up = cost[i - 1][j] + 1, left = cost[i][j - 1] + 1;
      if (d <= up && d <= left) {
        cost[i][j] = d;
        step[i][j] = 1;
      } else if (up <= left) {
        cost[i][j] = up;
        step[i][j] = 2;
      } else {
        cost[i][j] = left;
        step[i][j] = 3;
      }
    }
  }
  final map = List<int>.filled(n, -1); // script token -> heard token
  for (var i = n, j = m; i > 0 || j > 0;) {
    final s = step[i][j];
    if (s == 1) {
      map[i - 1] = j - 1;
      i--;
      j--;
    } else if (s == 2) {
      i--;
    } else {
      j--;
    }
  }

  final claimed = List<bool>.filled(m, false);
  for (final h in map) {
    if (h >= 0) claimed[h] = true;
  }
  final results = <LineResult>[];
  var from = 0;
  for (final (li, line) in lines.indexed) {
    final r = LineResult(line);
    results.add(r);
    var to = from;
    while (to < n && sLine[to] == li) {
      to++;
    }
    final hs = [for (var t = from; t < to; t++) if (map[t] >= 0) map[t]];
    final mine = (from: from, to: to);
    from = to;
    if (hs.isEmpty) continue;
    var lo = hs.reduce((a, b) => a < b ? a : b), hi = hs.reduce((a, b) => a > b ? a : b);
    // Take the spoken extras that sit right against the line.
    while (lo > 0 && !claimed[lo - 1] && heard[hWord[lo]].start - heard[hWord[lo - 1]].end <= 0.35) {
      lo--;
      claimed[lo] = true;
    }
    while (hi + 1 < m && !claimed[hi + 1] && heard[hWord[hi + 1]].start - heard[hWord[hi]].end <= 0.35) {
      hi++;
      claimed[hi] = true;
    }
    final w0 = hWord[lo], w1 = hWord[hi];
    r.start = heard[w0].start;
    r.end = heard[w1].end;
    r.heard = [for (var w = w0; w <= w1; w++) heard[w].text].join(' ');
    final got = [for (var h = lo; h <= hi; h++) hTok[h]].join();
    double cerOf(String text) {
      final want = [for (final w in text.split(RegExp(r'\s+'))) ...tokens(w)].join();
      return want.isEmpty ? 1 : editDistance(want, got) / want.length;
    }

    r.cer = [cerOf(line.say), if (line.tts != null) cerOf(line.tts!)].reduce((a, b) => a < b ? a : b).clamp(0.0, 1.0);

    // A time for every word of `say`: from the heard word it matched, else spread between the words around it.
    final words = line.words;
    final times = List<({double start, double end})?>.filled(words.length, null);
    for (var t = mine.from; t < mine.to; t++) {
      final h = map[t];
      if (h < 0) continue;
      final hw = heard[hWord[h]];
      final cur = times[sWord[t]];
      times[sWord[t]] = (start: cur == null || hw.start < cur.start ? hw.start : cur.start, end: cur == null || hw.end > cur.end ? hw.end : cur.end);
    }
    for (var wi = 0; wi < words.length; wi++) {
      if (times[wi] != null) continue;
      var a = wi, b = wi;
      while (a > 0 && times[a - 1] == null) {
        a--;
      }
      while (b + 1 < words.length && times[b + 1] == null) {
        b++;
      }
      final t0 = a > 0 ? times[a - 1]!.end : r.start!;
      final t1 = b + 1 < words.length ? times[b + 1]!.start : r.end!;
      final chars = [for (var k = a; k <= b; k++) words[k].length].reduce((x, y) => x + y);
      var at = t0;
      for (var k = a; k <= b; k++) {
        final len = (t1 - t0).clamp(0.0, 1e9) * words[k].length / chars;
        times[k] = (start: at, end: at + len);
        at += len;
      }
    }
    var prev = r.start!;
    for (final (wi, t) in times.indexed) {
      final start = t!.start < prev ? prev : t.start;
      final next = wi + 1 < times.length ? times[wi + 1]!.start : r.end!;
      var end = t.end > next && next > start ? next : t.end;
      if (end < start + 0.02) end = start + 0.02;
      r.words.add(WordTime(words[wi], start, end));
      prev = start;
    }
    // Whisper sometimes gives a word a few hundredths of a second and its neighbour the rest ("Claude" 0.04 s,
    // "Code" 0.30 s). Where a very short word touches a neighbour, share their time by length.
    final ws = r.words;
    for (var k = 0; k < ws.length; k++) {
      for (final j in [k + 1, k - 1]) {
        if (j < 0 || j >= ws.length || ws[k].end - ws[k].start >= 0.1) continue;
        final (a, b) = j > k ? (ws[k], ws[j]) : (ws[j], ws[k]); // a comes first in time
        if (b.start - a.end > 0.05) continue;
        final span = b.end - a.start;
        if (span < 0.2) continue;
        final cut = a.start + span * a.w.length / (a.w.length + b.w.length);
        a.end = cut;
        b.start = cut;
        break;
      }
    }
  }
  return results;
}
