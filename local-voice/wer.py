"""Word error rate with tolerant normalisation (round 8). Differences from the round-7 driver:
apostrophes dropped (Hark's == Harks), thousands commas dropped (1,280 == 1280), 'eagle eye' == 'EagleEye',
'A I' == 'AI'. Real misreadings still count."""
import re
def norm(s):
    s = s.lower().replace("’", "'").replace("'", "")
    s = re.sub(r"(?<=\d),(?=\d)", "", s)
    s = re.sub(r"[^a-z0-9 ]", " ", s)
    s = re.sub(r"\beagle eye\b", "eagleeye", s)
    s = re.sub(r"\ba i\b", "ai", s)
    return re.sub(r"\s+", " ", s).strip().split()
def wer(say, heard):
    a, b = norm(say), norm(heard)
    d = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1): d[i][0] = i
    for j in range(len(b) + 1): d[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] != b[j-1]))
    return d[-1][-1] / max(1, len(a))
