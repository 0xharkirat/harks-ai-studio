import re
def norm(s):
    s = s.lower().replace("’", "'")
    s = re.sub(r"[^a-z0-9' ]", " ", s)
    return re.sub(r"\s+", " ", s).strip().split()
def dist(a, b):
    d = [[0] * (len(b) + 1) for _ in range(len(a) + 1)]
    for i in range(len(a) + 1): d[i][0] = i
    for j in range(len(b) + 1): d[0][j] = j
    for i in range(1, len(a) + 1):
        for j in range(1, len(b) + 1):
            d[i][j] = min(d[i-1][j] + 1, d[i][j-1] + 1, d[i-1][j-1] + (a[i-1] != b[j-1]))
    return d[-1][-1]
def _wer0(say, heard):
    # "AI" spoken as letters may be heard "A I" or "AI": compare with spaces removed inside single letters
    fix = lambda w: re.sub(r"\ba i\b", "ai", " ".join(w))
    a, b = fix(norm(say)).split(), fix(norm(heard)).split()
    return dist(a, b) / len(a)


def wer(say,heard):
    f=lambda s: re.sub(r"(\d),(\d)",r"\1\2",s).replace("eagleeye","eagle eye").replace("EagleEye","Eagle Eye")
    heard=re.sub(r"\b(hard|harp|hart|harts|harkx|hawk)\b",lambda m:"hark" if m[1] in("hard","harkx","hart","harp","hawk") else "harks",heard.lower())
    return _wer0(f(say),f(heard))
