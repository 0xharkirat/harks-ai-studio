#!/bin/zsh
# Voice one line in Hark's local voice clone (Qwen3-TTS), from any agent or shell.
# Usage: local-voice/speak.sh "text" out.wav [attempts]
# Free: no network, no ElevenLabs. Set up once with scripts/setup-local-voice.sh.
# Prints one line: ok, the file, and the gate numbers of the kept take.
# Exit 0: the file was written. 1: bad input or the voicing failed. 2: the local voice is not set up.
# Spell out what the voice must say: "S S W", "A P I", numbers in words. A published clip must say it is Hark's AI.
setopt no_unset pipe_fail
here=${0:A:h}
text=${1:-}
out=${2:-}
attempts=${3:-}
py=$here/.venv/bin/python

[[ -n $text && -n $out ]] || { print -u2 'usage: local-voice/speak.sh "text" out.wav [attempts]'; exit 1 }
[[ -x $py && -d $here/models ]] || { print -u2 'the local voice is not set up: run scripts/setup-local-voice.sh'; exit 2 }
[[ -z $attempts || $attempts == <-> ]] || { print -u2 'attempts must be a whole number (1 is fastest, 4 is full quality)'; exit 1 }
mkdir -p ${out:A:h} || exit 1

log=$(mktemp -t speak.XXXXXX)
req=$($py -c 'import json,sys
d={"text":sys.argv[1],"out":sys.argv[2]}
if sys.argv[3]: d["attempts"]=int(sys.argv[3])
print(json.dumps(d))' "$text" "${out:A}" "$attempts") || exit 1

# The helper loads the model, answers each JSON line on stdin, and exits when stdin closes.
print -r -- $req | $py $here/qwen_server.py --config $here/qwen.json 2>$log | $py -c 'import json,sys
for line in sys.stdin:
    try: r = json.loads(line)
    except ValueError: continue
    if not isinstance(r, dict) or r.get("event") == "ready": continue
    if not r.get("ok"):
        print("failed: " + str(r.get("error", r)), file=sys.stderr); sys.exit(1)
    nums = " ".join("%s=%.1f" % (k, r[k]) for k in ("tail_db", "rise_hz") if isinstance(r.get(k), (int, float)))
    wer = " wer=%.2f" % r["wer"] if isinstance(r.get("wer"), (int, float)) else ""
    note = "" if r.get("all_pass", True) else " (no take passed every gate; kept the best)"
    print("ok %s takes=%s %s%s%s" % (r["out"], r.get("attempts_run", 1), nums, wer, note))
    sys.exit(0)
print("failed: the helper gave no answer", file=sys.stderr); sys.exit(1)'
rc=${pipestatus[3]}
if (( rc != 0 )); then tail -5 $log >&2; fi
rm -f $log
exit $rc
