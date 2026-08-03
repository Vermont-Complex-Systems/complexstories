#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Merged per-word usage counts across the gallery books — the token weights
for the ousiogram's safety-bias beat.

Reads the same manifest as book_gallery.py (file + start_regex per book),
tokenizes each book with the exact conventions of book_trace.py (whitespace
1-grams, lowercased letters+apostrophes as the scoring key), and counts how
often each LEXICON word is used across all six books combined.

Output: gallery_word_counts.csv  (word,count — lexicon words with count > 0)

The client turns this into the `weights` array of the ousiogram: the type
ousiogram counts each word once; the token ousiogram counts it as often as
these books actually use it. Same texts as the gallery, so the caption
"weighted by usage across the six books below" is literal.

Usage:  uv run word_counts.py books.csv ousiometry_pds.csv
Pure stdlib.
"""
import csv
import re
import sys
from collections import Counter
from pathlib import Path


def strip_gutenberg(text):
    start = re.search(r"\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text)
    end = re.search(r"\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text)
    return text[start.end() if start else 0 : end.start() if end else len(text)]


def main():
    manifest, lexicon = sys.argv[1], sys.argv[2]

    lex = set()
    with open(lexicon) as f:
        f.readline()
        for line in f:
            lex.add(line.split(",", 1)[0])

    with open(manifest) as f:
        rows = [r for r in csv.DictReader(l for l in f if not l.startswith("#"))]

    counts = Counter()
    for r in rows:
        path = Path(r["file"])
        if not path.exists():
            print(f"SKIP {r['label']}: {path} not found")
            continue
        text = strip_gutenberg(path.read_text(encoding="utf-8"))
        if r.get("start_regex"):
            m = re.search(r["start_regex"], text)
            if m:
                text = text[m.start():]
            else:
                print(f"warning: start regex missed for {r['label']}")
        n = 0
        for tok in text.split():
            k = re.sub(r"[^a-z']+", "", tok.lower()).strip("'")
            if k in lex:
                counts[k] += 1
                n += 1
        print(f"{r['label']:22s} lensed tokens: {n:,}")

    with open("gallery_word_counts.csv", "w") as f:
        f.write("word,count\n")
        for w, c in sorted(counts.items()):
            f.write(f"{w},{c}\n")
    total = sum(counts.values())
    print(f"\ntypes with usage: {len(counts):,}  |  total lensed tokens: {total:,}")
    print("top 10:", ", ".join(f"{w} ({c:,})" for w, c in counts.most_common(10)))
    print("wrote gallery_word_counts.csv")


if __name__ == "__main__":
    main()
