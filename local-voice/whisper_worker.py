"""Long-lived Whisper transcriber for qwen_server.py (run with the pyenv python that has openai-whisper).
stdin : one JSON per line {"path": "/abs/file.wav"}
stdout: one JSON per line {"path": ..., "text": ...}; first line is {"ready": true}.
"""
import sys, json, whisper
model = whisper.load_model(sys.argv[1] if len(sys.argv) > 1 else "medium.en", device="cpu")
print(json.dumps({"ready": True}), flush=True)
for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    req = json.loads(line)
    r = model.transcribe(req["path"], language="en", fp16=False, condition_on_previous_text=False, verbose=None)
    print(json.dumps({"path": req["path"], "text": r["text"].strip()}), flush=True)
