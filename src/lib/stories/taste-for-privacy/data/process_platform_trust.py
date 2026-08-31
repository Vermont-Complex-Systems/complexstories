#!/usr/bin/env python3
"""
Aggregate raw survey responses (dfall.csv, gitignored — do NOT commit) into
platform_trust_aggregated.csv: average trust (1–7 Likert, lower = more
comfortable sharing PII) per institution, for the overall sample and sliced
by number of social-media platforms used. Only this aggregate is committed.

Methodology: simple mean per institution column over TIMEPOINT 1 ONLY
(the January 2023 wave the story copy describes), dropping blank answers
per column. Verified to exactly reproduce the author's trust_circles.csv
aggregation at Timepoint 1 (e.g. 4-platform users: platform=4.34,
police=4.41, neighbor=4.72). NOTE: the story's claim that 4-platform users
trust platforms more than police holds at T1 (n=29) but REVERSES when all
seven waves are pooled (police 4.07 < platform 4.34, n=238) — keep the
T1 scope unless the copy is rewritten.

Output Demographic values: Overall, Platforms_0 … Platforms_5 — same
(Demographic,Trust_Category,Average_Trust) format as the committed
gender/ACES aggregate so the story can concatenate both files.

Usage:  python3 process_platform_trust.py
"""

import csv
from pathlib import Path

HERE = Path(__file__).parent
RAW = HERE / "dfall.csv"
OUT = HERE / "platform_trust_aggregated.csv"

INSTITUTIONS = [
    "TP_Gov", "TP_Police", "TP_Friend", "TP_Relative", "TP_Employer",
    "TP_Medical", "TP_Financial", "TP_Neighbor", "TP_Acquaintance",
    "TP_Co_worker", "TP_School", "TP_Researcher", "TP_Platform",
    "TP_NonProf", "TP_Company_cust", "TP_Company_notcust", "TP_Stranger",
]
PLATFORM_COLS = [
    "TP_Platforms_twitter",
    "TP_Platforms_instagram",
    "TP_Platforms_facebook",
    "TP_Platforms_tiktok",
    "TP_Platforms_other",
]


def platform_count(row):
    return sum(1 for col in PLATFORM_COLS if row[col] and float(row[col]) == 1.0)


def mean_trust(rows, institution):
    vals = [float(r[institution]) for r in rows if r[institution]]
    return sum(vals) / len(vals) if vals else None


def main():
    rows = [r for r in csv.DictReader(open(RAW)) if r["Timepoint"] == "1"]
    slices = {"Overall": rows}
    for n in range(6):
        slices[f"Platforms_{n}"] = [r for r in rows if platform_count(r) == n]

    with open(OUT, "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["Demographic", "Trust_Category", "Average_Trust"])
        for name, subset in slices.items():
            for inst in INSTITUTIONS:
                m = mean_trust(subset, inst)
                if m is not None:
                    w.writerow([name, inst, m])

    print(f"{len(rows)} raw rows -> {len(slices)} slices x {len(INSTITUTIONS)} institutions -> {OUT.name}")


if __name__ == "__main__":
    main()
