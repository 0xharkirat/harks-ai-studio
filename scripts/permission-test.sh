#!/bin/zsh
# Prove which ElevenLabs key permissions the done-video pipeline needs.
# Makes every call the pipeline makes with a restricted key, plus 2 calls the key
# should be refused, so a pass means the restriction is real. Costs about 100 credits.
# Usage: TEST_ELEVENLABS_KEY=... scripts/permission-test.sh <10s-voice-sample.mp3>
set -u
key=${TEST_ELEVENLABS_KEY:?set TEST_ELEVENLABS_KEY}
api=https://api.elevenlabs.io
voice=EtyQYZi13hBpNi6qJGxp
tmp=$(mktemp -d)
pass=0; fail=0

check() { # name, expected (ok|refused), http status, body file
  local ok=$([[ $3 == 2* ]] && echo ok || echo refused)
  local detail=$(head -c 160 $4 | LC_ALL=C tr -d '\n' | LC_ALL=C grep -a -o '"message":"[^"]*"\|"status":"[^"]*"' | head -1)
  if [[ $ok == $2 ]]; then pass=$((pass+1)); print "PASS  $1 -> $3"; else fail=$((fail+1)); print "FAIL  $1 -> $3 (wanted $2) $detail"; fi
}
req() { curl -s -o $tmp/body -w '%{http_code}' -H "xi-api-key: $key" "$@"; }

check "User: read subscription"        ok "$(req $api/v1/user/subscription)" $tmp/body
check "Voices: list my voices"         ok "$(req "$api/v2/voices?voice_type=personal")" $tmp/body
check "Text to Speech: with timestamps" ok "$(req -X POST -H 'Content-Type: application/json' -d '{"text":"Test.","model_id":"eleven_v4"}' $api/v1/text-to-speech/$voice/with-timestamps)" $tmp/body
check "Sound Effects: 1s click"         ok "$(req -X POST -H 'Content-Type: application/json' -d '{"text":"mouse click","duration_seconds":1}' $api/v1/sound-generation)" $tmp/body
check "Music Generation: 3s"            ok "$(req -X POST -H 'Content-Type: application/json' -d '{"prompt":"soft piano note","music_length_ms":3000,"force_instrumental":true}' $api/v1/music)" $tmp/body
ffmpeg -v error -y -t 10 -i ${1:?sample mp3} $tmp/sample.mp3
code=$(req -X POST -F "name=permission-test (delete me)" -F "files=@$tmp/sample.mp3" $api/v1/voices/add)
check "Voices write: instant clone"    ok $code $tmp/body
new=$(grep -o '"voice_id":"[^"]*"' $tmp/body | cut -d'"' -f4)
[[ -n $new ]] && check "Voices write: delete test clone" ok "$(req -X DELETE $api/v1/voices/$new)" $tmp/body
check "Models (not granted): refused"  refused "$(req $api/v1/models)" $tmp/body
check "History (not granted): refused" refused "$(req "$api/v1/history?page_size=1")" $tmp/body
print "\n$pass passed, $fail failed"
rm -rf $tmp
