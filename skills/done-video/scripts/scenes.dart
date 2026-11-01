import 'dart:io';

// The scene library (scenes/) in a video project. Run from the video's project folder.
//
//   dart ../../../scripts/scenes.dart sync    # refresh src/lib from the studio's scenes/src, then the channel mark
//   dart ../../../scripts/scenes.dart brand   # copy the channel mark from the brand export folder into public/brand/
//   dart ../../../scripts/scenes.dart check   # type scale lint on the studio's scenes/src (run from anywhere)
//
// new-video.sh --channel copies the library once, so a video is a snapshot. `sync` is how an existing video takes
// a newer library on purpose; it never touches src/scenes.tsx, script.json, or anything the video itself holds.

final studio = File.fromUri(Platform.script).parent.parent.path;

Never fail(String message) {
  stderr.writeln('scenes: $message');
  exit(1);
}

/// Where the logo lives: the factory's brand/export folder, or FCB_BRAND_DIR.
String brandDir() => Platform.environment['FCB_BRAND_DIR'] ?? '${Platform.environment['HOME']}/youtube-factory/brand/export';

/// The mark to use: a file named like a mark or logo first (svg before png), else the only image in the folder.
File? findMark(Directory dir) {
  if (!dir.existsSync()) return null;
  final images = dir.listSync().whereType<File>().where((f) => RegExp(r'\.(svg|png|webp)$', caseSensitive: false).hasMatch(f.path)).toList()..sort((a, b) => a.path.compareTo(b.path));
  if (images.isEmpty) return null;
  for (final want in ['mark', 'logo', 'icon', 'brand']) {
    for (final ext in ['svg', 'png', 'webp']) {
      final hit = images.where((f) => f.uri.pathSegments.last.toLowerCase().startsWith(want) && f.path.toLowerCase().endsWith('.$ext'));
      if (hit.isNotEmpty) return hit.first;
    }
  }
  return images.first;
}

void brand() {
  if (!File('package.json').existsSync() || !Directory('src/lib').existsSync()) fail('run this from a channel video\'s project folder (no src/lib here)');
  final dir = brandDir();
  final mark = findMark(Directory(dir));
  final json = File('src/lib/brand.json');
  Directory('public/brand').createSync(recursive: true);
  for (final old in Directory('public/brand').listSync().whereType<File>()) {
    old.deleteSync();
  }
  if (mark == null) {
    json.writeAsStringSync('{"file": null}\n');
    print('brand: no logo in $dir, so the channel mark is the placeholder');
    return;
  }
  final name = mark.uri.pathSegments.last;
  mark.copySync('public/brand/$name');
  json.writeAsStringSync('{"file": "brand/$name"}\n');
  print('brand: channel mark is $name, from $dir');
}

void sync() {
  if (!File('package.json').existsSync() || !Directory('src').existsSync()) fail('run this from a channel video\'s project folder');
  final from = Directory('$studio/scenes/src');
  final to = Directory('src/lib');
  if (to.existsSync()) to.deleteSync(recursive: true);
  to.createSync(recursive: true);
  var n = 0;
  for (final e in from.listSync(recursive: true).whereType<File>()) {
    final rel = e.path.substring(from.path.length + 1);
    File('${to.path}/$rel').createSync(recursive: true);
    e.copySync('${to.path}/$rel');
    n++;
  }
  print('sync: $n files from scenes/src into src/lib');
  brand();
}

/// The type scale is the only place a text size is set. A literal font size anywhere else in the library is a bug.
/// A line that sets a glyph, not text to read (the "?" in a badge), says `type-exempt` in a comment.
void check() {
  final bad = <String>[];
  final re = RegExp(r'fontSize\s*[:=]\s*\{?\s*[0-9]');
  var files = 0;
  for (final f in Directory('$studio/scenes/src').listSync(recursive: true).whereType<File>()) {
    if (!f.path.endsWith('.ts') && !f.path.endsWith('.tsx')) continue;
    files++;
    final lines = f.readAsLinesSync();
    for (var i = 0; i < lines.length; i++) {
      if (re.hasMatch(lines[i]) && !lines[i].contains('type-exempt')) bad.add('${f.path.substring(studio.length + 1)}:${i + 1}: ${lines[i].trim()}');
    }
  }
  if (bad.isNotEmpty) {
    stderr.writeln('scenes check: a literal font size outside the type scale (core/type.ts):\n  ${bad.join('\n  ')}');
    exit(1);
  }
  print('scenes check: $files files, every text size comes from the type scale');
}

void main(List<String> args) {
  switch (args.isEmpty ? '' : args.first) {
    case 'sync':
      sync();
    case 'brand':
      brand();
    case 'check':
      check();
    default:
      stderr.writeln('usage: dart scenes.dart sync | brand | check');
      exit(2);
  }
}
