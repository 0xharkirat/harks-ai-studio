import 'dart:convert';
import 'dart:io';

// Time the camera-box puppet's mouth: Rhubarb Lip Sync reads each scene's narration, with the scene's script
// as its dialog, and the cues shift to where layout.dart placed that scene. Writes src/mouth.json.
// Only the narration is read, never the final mix, so a clip of someone else talking never moves the mouth.
// Each scene's cues are cached in check/mouth/ by its audio and text, so a re-layout costs nothing.

const version = '1.14.0';
const checksums = {
  'macOS': 'f991deacac6c973a14a4431a16a58b842f436531e120cfaea142c87c0d3ab4c5',
  'Linux': 'a9a9074862cff47b2d59b8bf399a678a3b0b74f9452ad6ad94cb292913dd8667',
};

/// A scene's narration: its audio file, where it starts in the video (seconds), and what it says.
typedef Voiced = ({String id, String audio, double at, String text});

String run(String exe, List<String> args) {
  final r = Process.runSync(exe, args);
  if (r.exitCode != 0) throw '$exe ${args.join(' ')} failed (${r.exitCode}): ${r.stderr}';
  return r.stdout as String;
}

/// Rhubarb's binary, downloaded once into the studio's .cache and checked against the release checksum.
String rhubarb(String studio) {
  final os = Platform.isMacOS ? 'macOS' : Platform.isLinux ? 'Linux' : throw 'Rhubarb Lip Sync has no ${Platform.operatingSystem} build';
  final dir = '$studio/.cache/rhubarb-$version';
  final bin = '$dir/Rhubarb-Lip-Sync-$version-$os/rhubarb';
  if (File(bin).existsSync()) return bin;
  Directory(dir).createSync(recursive: true);
  final zip = '$dir/rhubarb.zip';
  print('mouth: downloading Rhubarb Lip Sync $version');
  run('curl', ['-fsSL', '-o', zip, 'https://github.com/DanielSWolf/rhubarb-lip-sync/releases/download/v$version/Rhubarb-Lip-Sync-$version-$os.zip']);
  final sum = run(os == 'macOS' ? 'shasum' : 'sha256sum', [if (os == 'macOS') ...['-a', '256'], zip]).split(' ').first;
  if (sum != checksums[os]) {
    File(zip).deleteSync();
    throw 'Rhubarb download checksum $sum does not match the $version release';
  }
  run('unzip', ['-q', '-o', zip, '-d', dir]);
  File(zip).deleteSync();
  return bin;
}

/// FNV-1a, enough to tell whether a scene's audio changed since its cues were cached.
String fingerprint(List<int> bytes) {
  var h = 0xcbf29ce484222325;
  for (final b in bytes) {
    h ^= b;
    h *= 0x100000001b3;
  }
  return h.toUnsigned(64).toRadixString(16);
}

/// Cues for every scene, in video seconds, written to src/mouth.json. Scenes not in the cache run in parallel:
/// one Rhubarb run keeps about 1 core busy.
Future<void> lipsync(String studio, List<Voiced> scenes) async {
  final bin = rhubarb(studio);
  Directory('check/mouth').createSync(recursive: true);
  final perScene = await Future.wait([for (final s in scenes) _scene(bin, s)]);
  final cues = [
    for (final (i, s) in scenes.indexed)
      for (final c in perScene[i]) {'start': _round(s.at + (c['start'] as num)), 'end': _round(s.at + (c['end'] as num)), 'value': c['value']},
  ];
  File('src/mouth.json').writeAsStringSync(jsonEncode({'cues': cues}));
}

/// One scene's cues in its own seconds, from the cache when its audio and text are unchanged.
Future<List> _scene(String bin, Voiced s) async {
  final audio = File(s.audio);
  // Audio tags such as [laughs] are directions to the voice, not words.
  final text = s.text.replaceAll(RegExp(r'\[[^\]]*\]'), ' ');
  final key = '${fingerprint(audio.readAsBytesSync())}-${fingerprint(utf8.encode(text))}';
  final cache = File('check/mouth/${s.id}.json');
  final cached = cache.existsSync() ? jsonDecode(cache.readAsStringSync()) as Map : null;
  if (cached?['key'] == key) return cached!['cues'] as List;
  final dialog = File('check/mouth/${s.id}.txt')..writeAsStringSync(text);
  final ProcessResult r;
  try {
    r = await Process.run(bin, ['-q', '-f', 'json', '-d', dialog.path, audio.path]);
  } on ProcessException catch (e) {
    // The macOS build is Intel only, so Apple Silicon runs it through Rosetta 2.
    throw e.message.contains('Bad CPU type')
        ? 'Rhubarb needs Rosetta 2: softwareupdate --install-rosetta --agree-to-license'
        : 'Rhubarb did not start: ${e.message}';
  }
  if (r.exitCode != 0) throw 'Rhubarb failed on ${s.audio}: ${r.stderr}';
  final cues = (jsonDecode(r.stdout as String) as Map)['mouthCues'] as List;
  cache.writeAsStringSync(jsonEncode({'key': key, 'cues': cues}));
  print('mouth: ${s.id}');
  return cues;
}

double _round(double s) => (s * 1000).round() / 1000;
