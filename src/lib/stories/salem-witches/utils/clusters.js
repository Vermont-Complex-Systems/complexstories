/**
 * Spatial clustering for the Salem network visualisation.
 *
 * The Gephi export ships a precomputed layout (an x/y per node) but no cluster
 * membership, so the scrolly steps derive their clusters from geometry: a small
 * k-means over the node positions. Determinism matters — the story has to look
 * the same on every reload — so the seeds are quantiles of x rather than random
 * points, and the clusters come back ordered left-to-right.
 */

import { mean } from 'd3-array';

/** Linear-interpolation quantile of an ascending numeric array. */
function quantile(asc, p) {
	if (!asc.length) return 0;
	const i = (asc.length - 1) * p;
	const lo = Math.floor(i);
	const hi = Math.ceil(i);
	return asc[lo] + (asc[hi] - asc[lo]) * (i - lo);
}

/** Plain k-means over 2-D points. Returns clusters ordered by centroid x. */
export function kmeans(points, k, { iterations = 60 } = {}) {
	const n = points.length;
	if (!n || k < 1) return { assignment: [], centroids: [] };
	const kk = Math.min(k, n);

	// Seeds: interleave the points by x into k chunks and take each chunk's
	// mean, so the seeds start spread along the graph's main axis.
	const byX = [...points].sort((a, b) => a.x - b.x);
	let centroids = Array.from({ length: kk }, (_, c) =>
		centroidOf(byX.filter((_, i) => i % kk === c))
	);

	let assignment = new Array(n).fill(0);
	for (let iter = 0; iter < iterations; iter++) {
		let moved = false;
		const next = new Array(n);
		for (let i = 0; i < n; i++) {
			let best = 0;
			let bestDist = Infinity;
			for (let c = 0; c < kk; c++) {
				const dx = points[i].x - centroids[c].x;
				const dy = points[i].y - centroids[c].y;
				const dist = dx * dx + dy * dy;
				if (dist < bestDist) {
					bestDist = dist;
					best = c;
				}
			}
			next[i] = best;
			if (best !== assignment[i]) moved = true;
		}
		assignment = next;

		const sums = Array.from({ length: kk }, () => ({ x: 0, y: 0, n: 0 }));
		for (let i = 0; i < n; i++) {
			const s = sums[assignment[i]];
			s.x += points[i].x;
			s.y += points[i].y;
			s.n += 1;
		}
		centroids = sums.map((s, c) => (s.n ? { x: s.x / s.n, y: s.y / s.n } : centroids[c]));

		if (!moved) break;
	}

	// Relabel left-to-right so "cluster 0" is always the leftmost one.
	const order = centroids.map((_, i) => i).sort((a, b) => centroids[a].x - centroids[b].x);
	const relabel = new Map(order.map((oldId, newId) => [oldId, newId]));

	return {
		assignment: assignment.map((c) => relabel.get(c)),
		centroids: order.map((oldId) => centroids[oldId])
	};
}

function centroidOf(points) {
	return { x: mean(points, (p) => p.x), y: mean(points, (p) => p.y) };
}

/**
 * Robust bounding box of a cluster: trims the outermost `trim` fraction on each
 * side so a couple of far-flung nodes don't dictate how far the camera zooms
 * out. Returns { x0, x1, y0, y1, cx, cy, w, h }.
 */
export function robustBox(points, trim = 0.1) {
	const xs = points.map((p) => p.x).sort((a, b) => a - b);
	const ys = points.map((p) => p.y).sort((a, b) => a - b);
	const x0 = quantile(xs, trim);
	const x1 = quantile(xs, 1 - trim);
	const y0 = quantile(ys, trim);
	const y1 = quantile(ys, 1 - trim);

	return {
		x0,
		x1,
		y0,
		y1,
		cx: (x0 + x1) / 2,
		cy: (y0 + y1) / 2,
		w: Math.max(x1 - x0, 1),
		h: Math.max(y1 - y0, 1)
	};
}

/**
 * `k` clusters over `points`, each with its members and a robust box — the
 * shape the scrolly camera needs. Members keep whatever extra fields the caller
 * attached (the story attaches its node objects as `node`).
 */
export function buildClusters(points, k, trim = 0.1) {
	const { assignment, centroids } = kmeans(points, k);

	const clusters = centroids.map((centroid, id) => ({ id, centroid, members: [] }));
	points.forEach((p, i) => clusters[assignment[i]].members.push(p));

	return clusters.map((c) => ({ ...c, box: robustBox(c.members, trim) }));
}
