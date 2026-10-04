import 'dart:convert';
import 'dart:io';

void main(List<String> args) {
  final j = jsonDecode(File(args[0]).readAsStringSync());
  final from = args.length > 1 ? double.parse(args[1]) : 0.0;
  final to = args.length > 2 ? double.parse(args[2]) : 1e9;
  final words = <Map>[];
  for (final s in j['segments']) {
    for (final w in (s['words'] ?? [])) {
      if (w['start'] >= from && w['end'] <= to) words.add(w);
    }
  }
  if (words.isEmpty) return print('no words');
  final span = words.last['end'] - words.first['start'];
  var pause = 0.0;
  var pauses = 0;
  for (var i = 1; i < words.length; i++) {
    final g = words[i]['start'] - words[i - 1]['end'];
    if (g > 0.35) { pause += g; pauses++; }
  }
  print('words=${words.length} span=${span.toStringAsFixed(1)}s '
      'wpm=${(words.length / span * 60).toStringAsFixed(0)} '
      'articulation_wpm=${(words.length / (span - pause) * 60).toStringAsFixed(0)} '
      'pauses>0.35s=$pauses avgPause=${(pause / (pauses == 0 ? 1 : pauses)).toStringAsFixed(2)}s');
}
