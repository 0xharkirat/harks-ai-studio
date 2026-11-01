import 'dart:convert';
import 'dart:io';

// Render a channel video (one made with new-video.sh --channel) in one theme and one orientation.
// Run from the video's project folder, after layout.dart.
//
//   dart ../../../scripts/render.dart --theme B                 # out/video-B.mp4, 1920x1080
//   dart ../../../scripts/render.dart --theme C --tall          # out/video-C-tall.mp4, 1080x1920, every scene laid out for 9:16
//   dart ../../../scripts/render.dart --theme A --still 120     # one frame, out/still-A-120.png
//   flags: --out file, --no-music, --no-captions, --frames 0-89, --concurrency 2 (Remotion's frame workers; the default is half the cores)
//
// The theme is a render flag, not a code change: it is passed to Remotion as the input prop `theme`, and the library's
// ThemeRoot reads it. Without --theme the video uses the theme named in script.json (layout.json), else "A".

Never fail(String message) {
  stderr.writeln('render: $message');
  exit(1);
}

Future<void> main(List<String> args) async {
  String? theme, out, frames;
  int? still, concurrency;
  var tall = false, music = true, captions = true;
  for (var i = 0; i < args.length; i++) {
    String value() => i + 1 < args.length ? args[++i] : fail('${args[i]} needs a value');
    switch (args[i]) {
      case '--theme':
        theme = value();
      case '--tall':
        tall = true;
      case '--no-music':
        music = false;
      case '--no-captions':
        captions = false;
      case '--out':
        out = value();
      case '--frames':
        frames = value();
      case '--still':
        still = int.tryParse(value()) ?? fail('--still needs a frame number');
      case '--concurrency':
        concurrency = int.tryParse(value()) ?? fail('--concurrency needs a number');
      default:
        stderr.writeln('usage: dart render.dart [--theme A|B|C|D] [--tall] [--out file] [--still N] [--frames a-b] [--concurrency N] [--no-music] [--no-captions]');
        exit(2);
    }
  }
  if (!File('src/lib/index.ts').existsSync()) fail('src/lib/index.ts is missing: this is not a channel video (new-video.sh --channel starts one)');
  if (!File('src/layout.json').existsSync()) fail('src/layout.json is missing: run tts.dart (or recorded.dart), pad.dart and layout.dart first');
  if (!Directory('node_modules').existsSync()) fail('no node_modules here: run zsh ../../../scripts/install-deps.sh');
  final props = <String, Object>{if (theme != null) 'theme': theme, if (!music) 'music': false, if (!captions) 'captions': false};
  final tag = [if (theme != null) theme, if (tall) 'tall'].join('-');
  final comp = tall ? 'VideoTall' : 'Video';
  final isStill = still != null;
  final file = out ?? 'out/${isStill ? 'still' : 'video'}${tag.isEmpty ? '' : '-$tag'}${isStill ? '-$still' : ''}.${isStill ? 'png' : 'mp4'}';
  Directory(File(file).parent.path).createSync(recursive: true);
  final cmd = [
    'exec', 'remotion', isStill ? 'still' : 'render', 'src/index.ts', comp, file,
    '--props=${jsonEncode(props)}',
    if (isStill) '--frame=$still',
    if (!isStill && frames != null) '--frames=$frames',
    if (!isStill && concurrency != null) '--concurrency=$concurrency',
  ];
  final t0 = DateTime.now();
  final p = await Process.start('pnpm', cmd, mode: ProcessStartMode.inheritStdio);
  final code = await p.exitCode;
  if (code != 0) exit(code);
  final secs = DateTime.now().difference(t0).inMilliseconds / 1000;
  if (isStill) {
    print('\nrender: $file  (${secs.toStringAsFixed(1)} s)');
    return;
  }
  final info = jsonDecode(Process.runSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height:format=duration,size', '-of', 'json', file]).stdout as String) as Map;
  final stream = (info['streams'] as List).first as Map;
  final len = double.parse(info['format']['duration'] as String);
  final mb = int.parse(info['format']['size'] as String) / 1e6;
  print('\nrender: $file  ${stream['width']}x${stream['height']}  ${len.toStringAsFixed(1)} s  ${mb.toStringAsFixed(1)} MB  rendered in ${secs.toStringAsFixed(1)} s${theme != null ? '  theme $theme' : ''}');
}
