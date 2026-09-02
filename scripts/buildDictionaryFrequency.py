#!/usr/bin/env python3
"""Build a 0-100 word-frequency map for the packed dictionary.

Reads every shard in public/data/dictionary/, looks up each unique alias
(traditional + simplified) in the `wordfreq` 'zh' corpus, and writes
output/dictionary-frequency-map.json as {"word": score} where

    score = round(clamp((zipf - 3) * 25, 0, 100))

(zipf 3 = ~1 per million -> 0; zipf 7 = ~10M per billion -> 100; unknown -> 0).

The score feeds the search_dictionary RPC's frequency_score term so common
words rank above rare ones at equal match weight. The map is a regenerable
artifact (wordfreq is pinned in output/venv); the DB update is applied by
`scripts/addDictionaryFrequency.ts`.

Usage: output/venv/bin/python scripts/buildDictionaryFrequency.py
"""
import glob
import json
import os
import sys

from wordfreq import zipf_frequency

PACK_DIR = os.path.join(os.path.dirname(__file__), "..", "public", "data", "dictionary")
OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "output", "dictionary-frequency-map.json")

ZIPF_FLOOR = 3.0
SCORE_PER_ZIPF = 25.0  # zipf 7 -> 100


def score_for(zipf: float) -> int:
    if zipf <= ZIPF_FLOOR:
        return 0
    return min(100, round((zipf - ZIPF_FLOOR) * SCORE_PER_ZIPF))


def main() -> None:
    aliases: set[str] = set()
    for path in sorted(glob.glob(os.path.join(PACK_DIR, "shard-*.json"))):
        with open(path, encoding="utf-8") as handle:
            pack = json.load(handle)
        for item in pack["items"]:
            aliases.add(item["simplified"])
            aliases.add(item["traditional"])

    freq_map: dict[str, int] = {}
    covered = 0
    for alias in sorted(aliases):
        zipf = zipf_frequency(alias, "zh")
        if zipf > 0:
            covered += 1
        freq_map[alias] = score_for(zipf)

    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as handle:
        json.dump(freq_map, handle, ensure_ascii=False, separators=(",", ":"))

    nonzero = sum(1 for score in freq_map.values() if score > 0)
    print(f"aliases: {len(aliases)}  covered: {covered} ({covered / len(aliases) * 100:.1f}%)  nonzero: {nonzero}")
    print(f"wrote {OUTPUT_PATH}")


if __name__ == "__main__":
    sys.exit(main())
