import 'dart:convert';
import 'dart:io';

// Fill {{speaker fields}} in a new project's script.json from voice.json, so the template
// works for anyone who edits voice.json. Run by new-video.sh from the project folder.
void main() {
  final studio = File.fromUri(Platform.script).parent.parent.path;
  final speaker = (jsonDecode(File('$studio/voice.json').readAsStringSync()) as Map)['speaker'] as Map;
  var script = File('script.json').readAsStringSync();
  speaker.forEach((k, v) => script = script.replaceAll('{{$k}}', '$v'));
  final left = RegExp(r'\{\{(\w+)\}\}').allMatches(script).map((m) => m[1]).toSet();
  if (left.isNotEmpty) throw 'voice.json speaker is missing: ${left.join(', ')}';
  File('script.json').writeAsStringSync(script);
}
