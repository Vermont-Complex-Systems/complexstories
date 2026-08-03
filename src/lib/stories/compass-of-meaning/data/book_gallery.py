#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=1.26"]
# ///
"""Run book_trace.py over a manifest of books and combine the results.

Reads books.csv (file, label, start_regex, chapter_regex), runs the single-book
trace for each, then merges everything into one gallery file with reading time
normalized to [0, 1] so books of different lengths share an x-axis.

Outputs:
  gallery_traces.csv    label, t (0..1), power, danger, structure, coverage
  gallery_chapters.csv  label, chapter, t (0..1)
  a per-book summary table (length, coverage, mean/min/max danger) for captions

Usage:
  uv run book_gallery.py books.csv
  uv run book_gallery.py books.csv --lexicon ousiometry_pds.csv

Comparability rules baked in: every book runs with the same window/step and
the same lexicon; the client should render every strip on the SAME y-scale —
the whole point of the gallery is that the panels are comparable.
"""
import argparse
import csv
import subprocess
import sys
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
TRACER = HERE / "book_trace.py"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("manifest")
    ap.add_argument("--lexicon", default="ousiometry_pds.csv")
    ap.add_argument("--window", type=int, default=10_000)
    ap.add_argument("--step", type=int, default=100)
    args = ap.parse_args()

    with open(args.manifest) as f:
        rows = [r for r in csv.DictReader(l for l in f if not l.startswith("#"))]

    all_traces, all_chapters, summary = [], [], []
    failed = []

    for r in rows:
        book, label = r["file"], r["label"]
        if not Path(book).exists():
            print(f"SKIP {label}: {book} not found")
            failed.append(label)
            continue
        cmd = [sys.executable, str(TRACER), book, args.lexicon,
               "--window", str(args.window), "--step", str(args.step)]
        if r.get("start_regex"):
            cmd += ["--start-regex", r["start_regex"]]
        cmd += ["--chapter-regex", r.get("chapter_regex", "")]
        print(f"\n=== {label} ===")
        res = subprocess.run(cmd)
        if res.returncode != 0:
            print(f"FAIL {label}")
            failed.append(label)
            continue

        stem = Path(book).with_suffix("").name
        tr = np.genfromtxt(f"{stem}_trace.csv", delimiter=",", names=True)
        tmax = tr["T"].max() or 1
        for row in tr:
            all_traces.append([label, row["T"] / tmax, row["power"], row["danger"],
                               row["structure"], row["coverage"]])
        ch_path = Path(f"{stem}_chapters.csv")
        if ch_path.exists():
            with open(ch_path) as f:
                for c in csv.DictReader(f):
                    all_chapters.append([label, c["label"], int(c["T"]) / tmax])
        summary.append([
            label, int(tr["T"].max()), float(tr["coverage"].mean()),
            float(tr["danger"].mean()), float(tr["danger"].min()), float(tr["danger"].max()),
        ])

    with open("gallery_traces.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["label", "t", "power", "danger", "structure", "coverage"])
        for row in all_traces:
            w.writerow([row[0]] + [f"{x:.5f}" if isinstance(x, float) else x for x in row[1:]])
    with open("gallery_chapters.csv", "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["label", "chapter", "t"])
        for label, chap, t in all_chapters:
            w.writerow([label, chap, f"{t:.5f}"])

    print("\n=== gallery summary (for captions) ===")
    print(f"{'book':22s}{'1-grams':>10s}{'cover':>7s}{'danger mean':>12s}{'min':>8s}{'max':>8s}")
    for label, T, cov, dmean, dmin, dmax in summary:
        print(f"{label:22s}{T:>10,}{cov:>7.1%}{dmean:>+12.3f}{dmin:>+8.3f}{dmax:>+8.3f}")
    print("\nwrote gallery_traces.csv, gallery_chapters.csv")
    if failed:
        print(f"NOT included: {', '.join(failed)}")


if __name__ == "__main__":
    main()