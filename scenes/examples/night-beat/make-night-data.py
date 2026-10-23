"""Write src/night-data.json from the research files. Run again after the research changes; never edit the output by hand.

Usage: python3 make-night-data.py
Reads ~/youtube-factory/research/01-brightest-night/top10.json (mean_radiance.top10) and ranking.csv (Korea rows).
"""
import csv, json
from pathlib import Path

root = Path.home() / "youtube-factory/research/01-brightest-night"
top = json.loads((root / "top10.json").read_text())["mean_radiance"]["top10"]
rows = {r["iso3"]: r for r in csv.DictReader((root / "ranking.csv").open())}
out = {
    "from": str(root),
    "measure": "mean_radiance: brightness per km2, the land-area mean, nW/(cm2 sr). 9 nights Jan to Sep 2025.",
    "top10": [{"rank": t["rank"], "name": t["name"], "iso3": t["iso3"], "value": round(t["mean_radiance"], 4)} for t in top],
    "korea": {k: round(float(rows[i]["mean_radiance"]), 4) for k, i in (("south", "KOR"), ("north", "PRK"))},
}
Path("src/night-data.json").write_text(json.dumps(out, indent=2) + "\n")
print("wrote src/night-data.json:", out["korea"], [t["name"] for t in out["top10"]][:3], "...")
