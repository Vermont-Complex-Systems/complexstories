/**
 * Label placement for the network graph.
 *
 * Labels are a fixed size on screen, so in user units their width shrinks as
 * the camera zooms in — the caller passes sizes already divided down by the
 * screen-px-per-user-unit factor. Placement is a small deterministic sweep:
 * pick a side (right of the node unless the text would leave the frame and the
 * left side has room), clamp into the frame's vertical band, then push labels
 * down past any rect they would overlap. That keeps a dozen-ish labels
 * readable without a full force-directed label pass, and it reproduces the
 * same layout on every load and every frame of the camera tween.
 */

/** Average glyph width of the label font, as a fraction of its size. */
export const CHAR_W = 0.55;

/**
 * @param {Array<{ id: string, x: number, y: number, r: number, text: string, color?: string }>} items
 *   Node centers and circle radii in user units (`r` includes emphasis scaling).
 * @param {{ x0: number, y0: number, x1: number, y1: number }} frame
 *   Safe visible rect in user units — already shrunk by any screen space the
 *   overlays (quote card, legend) occupy.
 * @param {number} fontSize Label font size in user units.
 * @param {number} pad Gap between the node's edge and its text, user units.
 * @param {number} gap Vertical breathing room between labels, user units.
 * @returns {Array<{ id: string, text: string, color: string|undefined, side: 'left'|'right', x: number, y: number, leader: boolean, sx: number, sy: number, ex: number, ey: number }>}
 *   One entry per input, in placement order. `x`/`y` are the text anchor
 *   position (pair with `text-anchor` and `dy="0.32em"`); `sx/sy → ex/ey` is
 *   the short leader segment from the node's edge to the text's edge.
 */
export function placeLabels(items, { frame, fontSize, pad = 0, gap = 0, maxPushes = 100 }) {
	const h = fontSize * 1.25;

	const rects = items.map((it) => {
		const w = it.text.length * CHAR_W * fontSize;
		// Right of the node by default; flip left when the text would leave the
		// frame and there is room for it on the left.
		const flip = it.x + it.r + pad + w > frame.x1 && it.x - it.r - pad - w >= frame.x0;
		const side = flip ? 'left' : 'right';
		const x0 = flip ? it.x - it.r - pad - w : it.x + it.r + pad;
		// Keep the text inside the safe band even when its node is not — the
		// leader line then carries the name→dot binding.
		const y = Math.min(Math.max(it.y, frame.y0 + h / 2), frame.y1 - h / 2);
		return {
			id: it.id,
			text: it.text,
			color: it.color,
			side,
			w,
			nx: it.x,
			ny: it.y,
			nr: it.r,
			x0,
			x1: x0 + w,
			y0: y - h / 2,
			y1: y + h / 2,
			homeY: it.y,
			flip,
			pushed: false
		};
	});

	// One downward sweep: sort by top edge, then push each label below any
	// already-placed rect it overlaps. A label only ever moves down, so the
	// pass terminates; ties break by x, then id, for determinism.
	rects.sort((a, b) => a.y0 - b.y0 || a.x0 - b.x0 || (a.id < b.id ? -1 : 1));
	const done = [];
	for (const L of rects) {
		for (let i = 0; i < maxPushes; i++) {
			const hit = done.find((p) => L.x0 < p.x1 && p.x0 < L.x1 && L.y0 < p.y1 && p.y0 < L.y1);
			if (!hit) break;
			L.y0 = hit.y1 + gap;
			L.y1 = L.y0 + h;
			L.pushed = true;
		}
		done.push(L);
	}

	return rects.map((L) => {
		const y = (L.y0 + L.y1) / 2;
		const leader = L.flip || L.pushed || Math.abs(y - L.homeY) > h * 0.75;
		// Leader runs from the node's edge, out through the gap, to the text.
		const ex = L.side === 'right' ? L.x0 - pad * 0.35 : L.x1 + pad * 0.35;
		const dx = ex - L.nx;
		const dy = y - L.ny;
		const d = Math.hypot(dx, dy) || 1;
		return {
			id: L.id,
			text: L.text,
			color: L.color,
			side: L.side,
			x: L.side === 'right' ? L.x0 : L.x1,
			y,
			leader,
			sx: L.nx + (dx / d) * L.nr,
			sy: L.ny + (dy / d) * L.nr,
			ex,
			ey: y
		};
	});
}
