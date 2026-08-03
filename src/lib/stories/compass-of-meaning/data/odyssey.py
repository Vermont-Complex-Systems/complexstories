#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=1.26"]
# ///
"""Run the ousiometer over a book: sliding-window essential-meaning time series.

Reimplements the paper's telegnomic instrument (Sec. 5, Eq. 5): tokenize the
text into 1-grams, apply the lexical lens (keep only tokens present in the
lexicon), and average (power, danger, structure) over a sliding window.
Narrative time T is measured in ALL 1-grams (lensed or not), matching the
paper's convention for "Les Miserables" (window 10,000 1-grams, step 100).

Input:
  book        plain-text file, e.g. Butler's Odyssey (Project Gutenberg #1727,
              https://www.gutenberg.org/ebooks/1727 -> "Plain Text UTF-8")
  lexicon     ousiometry_pds.csv from make_ousiometry_pds.py
              (word, power, danger, structure)

Output:
  <book>_trace.csv   T, power, danger, structure, coverage
                     T = window-center position in 1-grams; coverage = lensed
                     fraction of the window's tokens (plot it — dips flag
                     stretches the lexicon can't see)

Also prints token/type coverage and the most frequent unlensed tokens, so the
figure caption can quote real numbers ("the lens covers X% of tokens; the
rest is mostly function words and proper nouns like Odysseus and Poseidon").

Usage:
  uv run make_book_trace.py odyssey.txt ousiometry_pds.csv
  uv run make_book_trace.py odyssey.txt ousiometry_pds.csv \
      --window 10000 --step 100 --start-regex "BOOK I\\b"

Notes:
- Gutenberg *** START/END *** boilerplate is stripped automatically.
- --start-regex skips front matter (Butler's own preface would otherwise be
  measured as if it were Homer); omit it to keep the full text.
- CAVEAT for captions: this measures the TRANSLATOR's vocabulary. A Butler
  trace and a Pope trace of the same poem are different measurements.
"""
import argparse
import re
import sys
from collections import Counter
from pathlib import Path

import numpy as np


def load_lexicon(path):
    words, vals = [], []
    with open(path) as f:
        header = f.readline().strip().split(",")
        assert header == ["word", "power", "danger", "structure"], header
        for line in f:
            w, *v = line.rstrip("\n").split(",")
            words.append(w)
            vals.append([float(x) for x in v])
    return dict(zip(words, np.array(vals, dtype=np.float64)))


def strip_gutenberg(text):
    start = re.search(r"\*\*\* ?START OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text)
    end = re.search(r"\*\*\* ?END OF (?:THE|THIS) PROJECT GUTENBERG.*?\*\*\*", text)
    return text[start.end() if start else 0 : end.start() if end else len(text)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("book")
    ap.add_argument("lexicon")
    ap.add_argument("--window", type=int, default=10_000, help="1-grams per window (paper: 10000)")
    ap.add_argument("--step", type=int, default=100, help="1-grams between windows (paper: 100)")
    ap.add_argument("--start-regex", default=None,
                    help=r"begin at first match, e.g. 'BOOK I\b' to skip front matter")
    args = ap.parse_args()

    lex = load_lexicon(args.lexicon)
    text = strip_gutenberg(Path(args.book).read_text(encoding="utf-8"))
    if args.start_regex:
        m = re.search(args.start_regex, text)
        if m:
            text = text[m.start():]
        else:
            print(f"warning: start regex {args.start_regex!r} not found; using full text")

    # 1-grams: whitespace tokens define narrative time T (punctuation and
    # numbers included, per the paper); scoring key = lowercased letters only.
    tokens = text.split()
    T = len(tokens)
    if T < args.window:
        sys.exit(f"text has {T} 1-grams, fewer than one window ({args.window})")

    keys = [re.sub(r"[^a-z']+", "", t.lower()).strip("'") for t in tokens]

    # per-token scores (0 where unlensed) + lens mask -> prefix sums
    scores = np.zeros((T, 3))
    lensed = np.zeros(T, dtype=bool)
    unlensed = Counter()
    for i, k in enumerate(keys):
        v = lex.get(k)
        if v is not None:
            scores[i] = v
            lensed[i] = True
        elif k:
            unlensed[k] += 1

    cum = np.vstack([np.zeros(3), np.cumsum(scores, axis=0)])       # (T+1, 3)
    cnt = np.concatenate([[0], np.cumsum(lensed)]).astype(np.float64)

    starts = np.arange(0, T - args.window + 1, args.step)
    ends = starts + args.window
    m = (cnt[ends] - cnt[starts])                                   # lensed per window
    with np.errstate(invalid="ignore", divide="ignore"):
        avg = (cum[ends] - cum[starts]) / m[:, None]
    avg = np.nan_to_num(avg)
    centers = starts + args.window // 2
    coverage = m / args.window

    out = Path(args.book).with_suffix("").name + "_trace.csv"
    with open(out, "w") as f:
        f.write("T,power,danger,structure,coverage\n")
        for i in range(len(starts)):
            f.write(f"{centers[i]},{avg[i,0]:.5f},{avg[i,1]:.5f},{avg[i,2]:.5f},{coverage[i]:.3f}\n")

    # --- coverage report for the caption --------------------------------------
    n_word_tokens = sum(1 for k in keys if k)
    types = set(k for k in keys if k)
    print(f"1-grams (narrative time): {T:,}")
    print(f"word tokens: {n_word_tokens:,}  |  lensed: {lensed.sum():,} "
          f"({lensed.sum() / n_word_tokens:.1%} of word tokens)")
    print(f"types: {len(types):,}  |  in lexicon: {sum(1 for t in types if t in lex):,} "
          f"({sum(1 for t in types if t in lex) / len(types):.1%})")
    print("most frequent unlensed tokens:",
          ", ".join(f"{w} ({c:,})" for w, c in unlensed.most_common(15)))
    print(f"windows: {len(starts):,}  (window {args.window:,}, step {args.step})")
    print(f"wrote {out}")


if __name__ == "__main__":
    main()