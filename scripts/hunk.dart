import 'dart:convert';
import 'dart:io';

// Turn a hunk of a unified diff into CodeWalk data: the new side of the code, and which lines the change added.
//
//   git show ddb49c2 | dart hunk.dart scripts/tts.dart            # lists the file's hunks, prints hunk 1
//   git show ddb49c2 | dart hunk.dart scripts/tts.dart 2          # hunk 2
//   git show ddb49c2 | dart hunk.dart scripts/tts.dart 66-83      # only new-file lines 66 to 83
//   gh pr diff 12 | dart hunk.dart lib/a.dart 40-52 --cols 90 > src/hunks/a.json
//
// Prints JSON for `import x from './hunks/x.json'`:
//   title  the file path, for CodeWalk's title
//   start  the file line number of the first row, for CodeWalk's start
//   code   the rows, with their common indent stripped; a row over --cols (default 100) ends in "…"
//   added  every added line, by file line number, for CodeWalk's added
//   runs   the added lines in unbroken runs, each one ready for a CodeWalk step's lines
// Removed lines are not shown; stderr says how many the rows leave out.

typedef Row = ({int? n, String kind, String text}); // kind: ' ' context, '+' added, '-' removed; n is the new-file line

Never fail(String message) {
  stderr.writeln(message);
  exit(1);
}

/// Every hunk of [path] in the diff, as rows. Hunk counts end each hunk, so a removed line that starts with "--" stays a row.
List<List<Row>> hunksOf(List<String> diff, String path) {
  final hunks = <List<Row>>[];
  var inFile = false;
  var oldLeft = 0, newLeft = 0, n = 0;
  for (final l in diff) {
    if (oldLeft > 0 || newLeft > 0) {
      if (l.startsWith(r'\')) continue; // "\ No newline at end of file"
      final kind = l.isEmpty ? ' ' : l[0];
      final text = l.isEmpty ? '' : l.substring(1);
      if (kind == '-') {
        oldLeft--;
        hunks.last.add((n: null, kind: '-', text: text));
      } else {
        if (kind == ' ') oldLeft--;
        newLeft--;
        hunks.last.add((n: n++, kind: kind == '+' ? '+' : ' ', text: text));
      }
      continue;
    }
    if (l.startsWith('+++ ')) {
      final name = l.substring(4).split('\t').first;
      inFile = name == 'b/$path' || name == path;
      continue;
    }
    final h = RegExp(r'^@@ -\d+(?:,(\d+))? \+(\d+)(?:,(\d+))? @@').firstMatch(l);
    if (inFile && h != null) {
      oldLeft = int.parse(h[1] ?? '1');
      n = int.parse(h[2]!);
      newLeft = int.parse(h[3] ?? '1');
      hunks.add([]);
    }
  }
  return hunks;
}

void main(List<String> args) {
  final path = args.firstOrNull;
  if (path == null || path.startsWith('-')) fail('usage: <diff> | dart hunk.dart <path> [<hunk> | <from>-<to>] [--cols N]');
  var cols = 100;
  String? pick;
  for (var i = 1; i < args.length; i++) {
    if (args[i] == '--cols' && i + 1 < args.length) {
      cols = int.parse(args[++i]);
    } else {
      pick = args[i];
    }
  }

  final diff = <String>[];
  for (String? l; (l = stdin.readLineSync(encoding: utf8)) != null;) {
    diff.add(l!);
  }
  final hunks = hunksOf(diff, path);
  if (hunks.isEmpty) fail('no hunk for $path in the diff on stdin; the path is the one after "+++ b/"');
  for (final (i, h) in hunks.indexed) {
    final kept = h.where((r) => r.n != null);
    stderr.writeln('hunk ${i + 1}: lines ${kept.first.n}-${kept.last.n}, ${h.where((r) => r.kind == '+').length} added, ${h.where((r) => r.kind == '-').length} removed');
  }

  // The rows to show: one whole hunk, or a range of new-file lines that may cross hunks.
  late List<Row> rows;
  final range = RegExp(r'^(\d+)-(\d+)$').firstMatch(pick ?? '');
  if (range != null) {
    final from = int.parse(range[1]!), to = int.parse(range[2]!);
    final all = hunks.expand((h) => h).toList();
    final first = all.indexWhere((r) => r.n == from);
    final last = all.lastIndexWhere((r) => r.n == to);
    final missing = [for (var k = from; k <= to; k++) if (!all.any((r) => r.n == k)) k];
    if (first < 0 || last < 0 || missing.isNotEmpty) {
      fail('lines ${missing.isEmpty ? '$from-$to' : '${missing.first}-${missing.last}'} are not in the diff; add context with git diff -U20, or pick a hunk');
    }
    rows = all.sublist(first, last + 1);
  } else {
    final k = int.tryParse(pick ?? '1') ?? fail('pick a hunk number or a line range like 66-83, not "$pick"');
    if (k < 1 || k > hunks.length) fail('$path has ${hunks.length} hunks in this diff');
    rows = hunks[k - 1];
  }

  final removed = rows.where((r) => r.kind == '-').length;
  final shown = rows.where((r) => r.n != null).toList();
  // CodeWalk drops blank rows at either end, which would shift its numbers, so drop them here.
  while (shown.isNotEmpty && shown.first.text.trim().isEmpty) {
    shown.removeAt(0);
  }
  while (shown.isNotEmpty && shown.last.text.trim().isEmpty) {
    shown.removeLast();
  }
  if (shown.isEmpty) fail('the rows hold no code');
  final text = [for (final r in shown) r.text.replaceAll('\t', '    ').trimRight()];
  final indent = text.where((t) => t.isNotEmpty).map((t) => t.length - t.trimLeft().length).reduce((a, b) => a < b ? a : b);
  final code = [
    for (final t in text)
      if (t.length - indent > cols) '${t.substring(indent, indent + cols - 1)}…' else t.isEmpty ? '' : t.substring(indent)
  ];
  final added = [for (final r in shown) if (r.kind == '+') r.n!];
  final runs = <List<int>>[];
  for (final n in added) {
    if (runs.isNotEmpty && runs.last.last == n - 1) {
      runs.last.add(n);
    } else {
      runs.add([n]);
    }
  }
  stderr.writeln('rows ${shown.first.n}-${shown.last.n}: ${added.length} added${removed > 0 ? ', $removed removed lines not shown' : ''}');
  final json = const JsonEncoder.withIndent('  ').convert({'title': path, 'start': shown.first.n, 'code': code.join('\n'), 'added': added, 'runs': runs});
  // One line per list of numbers, so a long run stays readable.
  print(json.replaceAllMapped(RegExp(r'\[[\d,\s]*\]'), (m) => m[0]!.replaceAll(RegExp(r'\s+'), '').replaceAll(',', ', ')));
}
