import 'dart:convert';
import 'dart:io';

import 'lipsync.dart';

// Lay scenes end to end, then build one narration track to match, and time the puppet's mouth to it.
const fps = 30;

Future<void> main() async {
  final t = jsonDecode(File('src/timings.json').readAsStringSync()) as List;
  final script = {for (final s in jsonDecode(File('script.json').readAsStringSync()) as List) s['id']: s as Map};
  // A scene's optional "hold" in script.json adds silent seconds after its last line, e.g. to let a recorded clip play.
  final hold = {for (final e in script.entries) e.key: (e.value['hold'] as num?)?.toDouble() ?? 0.0};
  // "continues": true marks a scene that carries on the picture of the scene before it; Video.tsx cuts to it with no fade.
  final continues = {for (final e in script.entries) if (e.value['continues'] == true) e.key};
  // "black": seconds of black screen before a scene, "card": text shown on it (such as "Before" or "After"),
  // and "reveal": the sfx key (ui.tsx) that plays as the scene appears.
  final black = {for (final e in script.entries) e.key: (e.value['black'] as num?)?.toDouble() ?? 0.0};
  // "theme": "A" | "B" | "C" | "D" (or a name such as "sketch") names the look of a channel video (scenes/README.md).
  // 1 theme per video: the first scene that names one sets it, and a different one later is ignored with a warning.
  String? theme;
  for (final s in t) {
    final named = script[s['id']]?['theme'] as String?;
    if (named == null) continue;
    if (theme == null) {
      theme = named;
    } else if (named != theme) {
      stderr.writeln('layout: scene "${s['id']}" names theme "$named", but the video uses "$theme" (1 theme per video), so it is ignored');
    }
  }
  var cursor = 0.0;
  final scenes = [];
  final filter = StringBuffer();
  final inputs = <String>[];
  final voiced = <Voiced>[];
  for (var i = 0; i < t.length; i++) {
    final s = t[i];
    final dark = black[s['id']] ?? 0.0;
    final lead = (i == 0 ? 1.2 : 0.3) + dark; // SSW: smile for a beat before speaking
    final tail = (i == t.length - 1 ? 2.2 : 0.45) + (hold[s['id']] ?? 0.0);
    final total = lead + s['duration'] + tail;
    scenes.add({
      'id': s['id'],
      'from': (cursor * fps).round(),
      'frames': ((cursor + total) * fps).round() - (cursor * fps).round(),
      if (i > 0 && continues.contains(s['id'])) 'continues': true,
      if (dark > 0) 'black': (dark * fps).round(),
      if (dark > 0 && script[s['id']]?['card'] != null) 'card': script[s['id']]!['card'],
      if (script[s['id']]?['reveal'] != null) 'reveal': script[s['id']]!['reveal'],
      'audioFrom': ((cursor + lead) * fps).round(),
      'lines': [
        for (final l in s['lines'])
          {
            'say': l['say'],
            'start': ((cursor + lead + l['start']) * fps).round(),
            'end': ((cursor + lead + l['end']) * fps).round(),
            // Word times exist when recorded.dart made the narration; captions.ts and short.dart use them.
            if (l['words'] != null)
              'words': [
                for (final w in l['words']) {'w': w['w'], 'start': ((cursor + lead + w['start']) * fps).round(), 'end': ((cursor + lead + w['end']) * fps).round()}
              ],
          }
      ],
    });
    inputs.addAll(['-i', 'public/${s['audio']}']);
    final lines = (script[s['id']]?['lines'] as List?) ?? [];
    voiced.add((id: s['id'], audio: 'public/${s['audio']}', at: cursor + lead, text: [for (final l in lines) l['tts'] ?? l['say']].join('\n')));
    filter.write('[$i:a]adelay=${((cursor + lead) * 1000).round()}:all=1[a$i];');
    cursor += total;
  }
  filter.write('${[for (var i = 0; i < t.length; i++) '[a$i]'].join()}amix=inputs=${t.length}:normalize=0,apad=whole_dur=$cursor,loudnorm=I=-16:TP=-1.5:LRA=11[out]');
  final r = Process.runSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter.toString(), '-map', '[out]', '-ar', '48000', '-ac', '1', 'public/narration.wav']);
  if (r.exitCode != 0) throw r.stderr;
  final totalFrames = scenes.fold<int>(0, (a, s) => a + (s['frames'] as int));
  File('src/layout.json').writeAsStringSync(const JsonEncoder.withIndent('  ').convert({'fps': fps, 'totalFrames': totalFrames, if (theme != null) 'theme': theme, 'scenes': scenes}));
  print('total ${cursor.toStringAsFixed(1)}s, $totalFrames frames${theme != null ? ', theme $theme' : ''}');
  // A puppet in the camera box (new-video.sh builds src/puppet.json from speaker.puppet) needs mouth timing.
  final puppet = File('src/puppet.json');
  if (puppet.existsSync() && (jsonDecode(puppet.readAsStringSync()) as Map).containsKey('canvas')) {
    await lipsync(File.fromUri(Platform.script).parent.parent.path, voiced);
  }
}
