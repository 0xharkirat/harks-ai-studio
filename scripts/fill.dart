import 'dart:convert';
import 'dart:io';

// Fill {{speaker fields}} in a new project's script.json from src/config.json (the snapshot new-video.sh
// just wrote), so the template works for anyone. Run by new-video.sh from the project folder.
void main() {
  final speaker = (jsonDecode(File('src/config.json').readAsStringSync()) as Map)['speaker'] as Map;
  var script = File('script.json').readAsStringSync();
  speaker.forEach((k, v) => script = script.replaceAll('{{$k}}', '${v ?? ''}'));
  final left = RegExp(r'\{\{(\w+)\}\}').allMatches(script).map((m) => m[1]).toSet();
  if (left.isNotEmpty) throw 'config speaker is missing: ${left.join(', ')}';
  File('script.json').writeAsStringSync(script);
}
