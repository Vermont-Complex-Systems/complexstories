#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Emit the read-along word stream for a book trace: at each trace step, the
few most ousiometrically extreme lensed words in the newly read text.

Companion to book_trace.py (same tokenization, same Gutenberg stripping, same
window/step convention). Trace row i is plotted at the window CENTER
(T = i*step + window/2), so the slice for row i is the `step` 1-grams around
that center — the words the plotted point actually represents. From each
slice we keep the top --per lensed words by distance from the origin in the
(power, danger) plane (the words that actually move the trace), skipping any
word already shown in the previous --lookback slices so the stream doesn't
stutter on repeats.

Output: <book>_stream.csv  i,word,power,danger
        i = trace row index (matches <book>_trace.csv row order)

Usage (the committed <book>_stream.csv files were generated with --per 2;
the start regexes live in books.csv):
  uv run read_stream.py odyssey.txt ousiometry_pds.csv \
      --start-regex '(?m)^BOOK I\\r?$' --per 2
Pure stdlib.
"""
import argparse
import re
from pathlib import Path


def strip_gutenberg(text):
    start = re.search(r"\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text)
    end = re.search(r"\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text)
    return text[start.end() if start else 0 : end.start() if end else len(text)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("book")
    ap.add_argument("lexicon")
    ap.add_argument("--window", type=int, default=10_000)
    ap.add_argument("--step", type=int, default=100)
    ap.add_argument("--per", type=int, default=3, help="words kept per slice")
    ap.add_argument("--lookback", type=int, default=8,
                    help="slices a word must wait before reappearing")
    ap.add_argument("--start-regex", default=None)
    args = ap.parse_args()

    lex = {}
    with open(args.lexicon) as f:
        assert f.readline().strip() == "word,power,danger,structure"
        for line in f:
            w, pw, dg, _st = line.rstrip("\n").split(",")
            lex[w] = (float(pw), float(dg))

    text = strip_gutenberg(Path(args.book).read_text(encoding="utf-8"))
    if args.start_regex:
        m = re.search(args.start_regex, text)
        if m:
            text = text[m.start():]
        else:
            print(f"warning: start regex {args.start_regex!r} not found; using full text")

    tokens = text.split()
    keys = [re.sub(r"[^a-z']+", "", t.lower()).strip("'") for t in tokens]
    T = len(tokens)

    n_rows = (T - args.window) // args.step + 1
    recent = {}  # word -> last slice index it was emitted
    out = []
    for i in range(n_rows):
        lo = i * args.step + (args.window - args.step) // 2
        hi = lo + args.step
        seen = set()
        cands = []
        for k in keys[lo:hi]:
            v = lex.get(k)
            if v is None or k in seen:
                continue
            seen.add(k)
            if i - recent.get(k, -10**9) <= args.lookback:
                continue
            cands.append(((v[0] ** 2 + v[1] ** 2) ** 0.5, k, v))
        cands.sort(reverse=True)
        for _score, k, (pw, dg) in cands[: args.per]:
            recent[k] = i
            out.append((i, k, pw, dg))

    dest = Path(args.book).with_suffix("").name + "_stream.csv"
    with open(dest, "w") as f:
        f.write("i,word,power,danger\n")
        for i, w, pw, dg in out:
            f.write(f"{i},{w},{pw:.3f},{dg:.3f}\n")
    print(f"rows: {len(out)} over {n_rows} slices -> {dest}")


if __name__ == "__main__":
    main()
