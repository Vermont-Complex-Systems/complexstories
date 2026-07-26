#!/usr/bin/env python3
"""
Aggregate raw survey responses (dfall.csv, gitignored — do NOT commit) into
privacy_settings_aggregated.csv: respondent counts by social-media privacy
setting and number of platforms used. Only this aggregate is committed.

Coding assumption for TP_Social (raw file has 1.0/2.0/3.0):
    3.0 = private, 2.0 = mixed, 1.0 = public
i.e. higher = more private. This matches the story's claim ("most students
set private, then mixed, then public"): 3.0 is the most frequent value
(1760), then 2.0 (609), then 1.0 (458). Blank TP_Social rows are dropped.

Usage:  python3 process_privacy_settings.py
"""

import csv
from collections import Counter
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "dfall.csv"
OUT = HERE / "privacy_settings_aggregated.csv"

SETTING = {"1.0": "public", "2.0": "mixed", "3.0": "private"}
PLATFORM_COLS = [
    "TP_Platforms_twitter",
    "TP_Platforms_instagram",
    "TP_Platforms_facebook",
    "TP_Platforms_tiktok",
    "TP_Platforms_other",
]


def platform_count(row):
    return sum(1 for col in PLATFORM_COLS if row[col] and float(row[col]) == 1.0)


def main():
    rows = list(csv.DictReader(open(RAW)))
    counts = Counter(
        (platform_count(r), SETTING[r["TP_Social"]])
        for r in rows
        if r["TP_Social"] in SETTING
    )

    with open(OUT, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["platform_count", "privacy_setting", "respondents"])
        for (n, setting), c in sorted(counts.items()):
            w.writerow([n, setting, c])

    total = sum(counts.values())
    print(f"{len(rows)} raw rows -> {total} respondents with a setting -> {OUT.name}")


if __name__ == "__main__":
    main()
