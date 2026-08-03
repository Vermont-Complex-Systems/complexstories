#!/usr/bin/env -S uv run
# /// script
# requires-python = ">=3.11"
# dependencies = ["numpy>=1.26"]
# ///
"""Prepare the GPADS lexicon for the visual essay. No PCA — see NOTE.

Input:   ousiometry_GPADS.tsv   (word, goodness, power, aggression, danger, structure)
Output:  ousiometry_pds.csv     (word, power, danger, structure)  rounded to 3 dp
Optional (--binary):
         ousiometry_pds.f32     little-endian Float32Array, [pw0,dg0,st0, pw1,dg1,st1, ...]
         ousiometry_words.txt   newline-delimited words, same order

NOTE — why no PCA:
The 5 GPADS dimensions are rank-3 by construction: (power, danger) is an
exact pi/4 rotation of (goodness, aggression) [paper Eq. 3], so the primary
plane appears twice and PCA on the 5 columns returns the GAS axes (goodness,
aggression) under misleading names, with the plane's variance share inflated
to ~95% by the double-counting. (power, danger, structure) is already an
orthogonal basis of the rank-3 space — the reduction was done by the authors'
SVD. This script only selects columns, verifies the algebra, and rounds.

Goodness/aggression are derived client-side in 2 lines:
    const s = Math.SQRT1_2;
    gd = s * (power - danger);  ag = s * (power + danger);

Run:  uv run psd.py [--binary]
Exits nonzero if the sanity checks fail.
"""
import sys

import numpy as np

SRC = "ousiometry_GPADS.tsv"
DIMS = ["goodness", "power", "aggression", "danger", "structure"]
KEEP = ["power", "danger", "structure"]

# Source data carries ~6 dp, so Eq. 3 reconstruction error should be ~1e-6;
# rank-3 residual eigenvalues should be numerically tiny vs. the leading one.
TOL_EQ3 = 1e-4
TOL_RANK = 1e-6


def main() -> None:
    binary = "--binary" in sys.argv

    words = np.loadtxt(SRC, delimiter="\t", skiprows=1, usecols=0, dtype=str)
    X = np.loadtxt(SRC, delimiter="\t", skiprows=1, usecols=range(1, 6))
    assert list(np.loadtxt(SRC, delimiter="\t", max_rows=1, dtype=str)) == ["word"] + DIMS
    print(f"loaded {len(words)} words")

    # --- sanity check 1: covariance is rank-3 --------------------------------
    eig = np.linalg.eigvalsh(np.cov(X, rowvar=False))[::-1]
    residual = max(eig[3], eig[4], 0.0) / eig[0]
    print("covariance eigenvalues:", np.round(eig, 6))
    print(f"rank-3 residual ratio (want ~0): {residual:.2e}")

    # --- sanity check 2: paper Eq. 3 holds column-wise -----------------------
    gd, pw, ag, dg, _st = X.T
    s = np.sqrt(0.5)
    err = max(np.abs(gd - s * (pw - dg)).max(), np.abs(ag - s * (pw + dg)).max())
    print(f"max Eq.3 reconstruction error (want ~1e-6): {err:.2e}")

    if residual >= TOL_RANK or err >= TOL_EQ3:
        sys.exit(
            "FAIL: data does not match the expected GPADS structure "
            "(not rank-3, or Eq. 3 does not hold). Inspect before shipping."
        )

    # --- emit ----------------------------------------------------------------
    kept = X[:, [DIMS.index(k) for k in KEEP]]

    with open("ousiometry_pds.csv", "w", newline="") as f:
        f.write("word," + ",".join(KEEP) + "\n")
        for word, row in zip(words, kept):
            f.write(word + "," + ",".join(f"{v:.3f}" for v in row) + "\n")
    print("wrote ousiometry_pds.csv")

    if binary:
        kept.astype("<f4").tofile("ousiometry_pds.f32")
        with open("ousiometry_words.txt", "w") as f:
            f.write("\n".join(words) + "\n")
        print(f"wrote ousiometry_pds.f32 ({kept.size * 4} bytes) and ousiometry_words.txt")
        print(
            "client: new Float32Array(await (await fetch(url)).arrayBuffer()); "
            "stride 3 = [power, danger, structure]"
        )


if __name__ == "__main__":
    main()