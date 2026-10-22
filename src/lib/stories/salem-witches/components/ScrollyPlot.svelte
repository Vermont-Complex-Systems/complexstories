<script>
	import { Tween } from 'svelte/motion';
	import { fade } from 'svelte/transition';
	import { extent } from 'd3-array';
	import { scaleSqrt } from 'd3-scale';
	import network from '../data/salem_network_layout.json';
	import { placeLabels, CHAR_W } from '../utils/labels.js';

	let { scrollyIndex } = $props();

	// The sticky panel is the full viewport (see .fullscreen-layout), so we bind
	// its size: the label size and node radii both have to know how large the
	// rendering actually is, not just how large the data is.
	let boxW = $state(0);
	let boxH = $state(0);

	// =====================================================================
	// Configuration
	// =====================================================================

	const VB_W = 1000; // viewBox width — its height follows the data's aspect ratio
	const PAD = 0.06; // breathing room around the graph, as a fraction of VB_W
	const LABEL_PX = 13; // on-screen label size, held constant regardless of panel size
	const LABEL_PAD_PX = 5; // gap between a node's edge and its label, on screen
	const LABEL_GAP_PX = 4; // vertical breathing room between labels, on screen
	const QUOTE_INSET_PX = 110; // screen band the testimony quote card can occupy
	const LEGEND_INSET_PX = 56; // screen band the legend occupies
	const HUB_MIN = { w: 380, h: 210 }; // smallest hub-step frame, keeps the fan composition

	/**
	 * One entry per scrolly step, in the order the reader scrolls them.
	 *
	 *  - layout:  'base'    — the original Gephi force-atlas positions
	 *             'layered' — nodes stacked by accusation "generation", so every
	 *                          edge points downward and the absence of cycles is
	 *                          legible at a glance.
	 *  - node:    which nodes stay lit ('none' = all lit, no dimming).
	 *  - edge:    how edges are emphasised for that step.
	 *  - labels:  which names to draw — a key into LABEL_SETS, or null for none.
	 */
	const STEPS = [
		{ layout: 'base', node: 'none', edge: 'none', labels: null }, // 0 — the whole raw network
		{ layout: 'base', node: 'hubs', edge: 'hubs', labels: 'hubs' }, // 1 — the six superspreaders
		{ layout: 'base', node: 'turned', edge: 'book', labels: 'turned' }, // 2 — who switched sides
		{ layout: 'layered', node: 'none', edge: 'flow', labels: 'selfs' }, // 3 — no loops (laid out by generation)
		{ layout: 'layered', node: 'none', edge: 'flow', labels: 'selfs' } // 4 — hence: an epidemic
	];

	// =====================================================================
	// Data — nodes, links, degrees, and the derived sets the steps highlight
	// =====================================================================

	const nodes = network.nodes.map((n) => ({
		id: n.key,
		label: n.attributes.label,
		x: n.attributes.x,
		y: n.attributes.y,
		size: n.attributes.size,
		role: n.attributes.d1, // 'ACCUSER' | 'ACCUSED' | 'ACCUSED | ACCUSER'
		turned: (n.attributes.d0 || '').includes('TURNEDWITCH')
	}));

	const links = network.edges.map((e) => ({
		source: e.source,
		target: e.target,
		weight: e.attributes.weight,
		self: e.source === e.target,
		book: (e.attributes.d23 || '').includes('MECHANISM_BOOK_SIGNING'),
		q: (e.attributes.d22 || '')
			.split(' | ')
			.map((s) => s.trim())
			.filter(Boolean)
	}));

	const byId = new Map(nodes.map((n) => [n.id, n]));

	const outDegree = new Map();
	for (const l of links) {
		if (!l.self) outDegree.set(l.source, (outDegree.get(l.source) ?? 0) + 1);
	}

	// The six most prolific accusers — the network's superspreaders.
	const hubs = new Set(
		[...nodes]
			.sort((a, b) => (outDegree.get(b.id) ?? 0) - (outDegree.get(a.id) ?? 0))
			.slice(0, 6)
			.map((n) => n.id)
	);
	// People who appear first as accusers/victims and are later accused.
	const turnedSet = new Set(nodes.filter((n) => n.turned).map((n) => n.id));
	// The only self-loops in the graph: people who appear to themselves.
	const selfNodes = new Set(links.filter((l) => l.self).map((l) => l.source));

	// =====================================================================
	// Testimony quotes — one per step, drawn from the d22 field of edges tied
	// to that step's focus, so each quote speaks to what the step highlights.
	//
	//   step 0 — an act of affliction, from anywhere in the network
	//   step 1 — first-person affliction sworn by one of the six superspreaders
	//   step 2 — an accusation about signing the Devil's book
	//   step 3 — the self-loops (people who appear to themselves)
	//   step 4 — affliction reported repeatedly / against others (the epidemic)
	//
	// Boilerplate charges ("Sundry acts of Witchcraft…") are skipped, as are
	// fragments too short to read as testimony. Picked deterministically, so
	// the same quote appears every load.
	// =====================================================================

	const QUOTE_MIN = 25; // characters
	const QUOTE_MIN_WORDS = 4;
	const BOILERPLATE = [
		'sundry act',
		'acts of witchcraft',
		'great hurt',
		'hurt and dammage',
		'hurt and damage',
		'injury of theire',
		'suspition of',
		'hurt hath',
		'hurt & dammage'
	];

	const AFFLICTION = /afflict|afflect|afflet|torment|tortur|pinch|bite|bitin|strangl|choak|choke|prick/i;
	const FIRST_PERSON = /\b(me|my)\b/i;
	const BOOK = /book/i;
	const REPEATED = /others|severall times|several times/i;

	function isBoilerplate(q) {
		const s = q.toLowerCase();
		return BOILERPLATE.some((b) => s.includes(b));
	}

	function trimQuote(q) {
		return q.replace(/[\s,;:.]+$/, '');
	}

	function buildQuotePool(predicate, minLen = QUOTE_MIN, minWords = QUOTE_MIN_WORDS) {
		const seen = new Set();
		const out = [];
		for (const l of links) {
			for (const q of l.q) {
				if (q.length < minLen || q.split(/\s+/).length < minWords) continue;
				if (isBoilerplate(q) || seen.has(q) || !predicate(q, l)) continue;
				seen.add(q);
				out.push({ text: trimQuote(q), source: l.source, target: l.target });
			}
		}
		return out;
	}

	const QUOTE_POOLS = [
		// 0 — the raw network: any act of affliction
		buildQuotePool((q) => AFFLICTION.test(q) && !BOOK.test(q)),
		// 1 — superspreaders: first-person testimony from one of the six
		buildQuotePool(
			(q, l) =>
				hubs.has(l.source) && FIRST_PERSON.test(q) && AFFLICTION.test(q) && !BOOK.test(q)
		),
		// 2 — the Devil's book: the mechanism named in this step
		buildQuotePool((q, l) => l.book && BOOK.test(q), 20),
		// 3 — self-loops: people who appear to themselves
		buildQuotePool((q, l) => l.self, 20, 3),
		// 4 — the epidemic: affliction repeated, and reaching others
		buildQuotePool((q) => REPEATED.test(q) && AFFLICTION.test(q) && !BOOK.test(q))
	];

	// A small integer hash → index, so the pick is stable run to run.
	function seededIndex(n, seed) {
		if (n <= 1) return 0;
		let t = (seed + 0x9e3779b9) >>> 0;
		t = Math.imul(t ^ (t >>> 16), 0x21f0aaad);
		t = Math.imul(t ^ (t >>> 15), 0x735a2d97);
		return ((t ^ (t >>> 15)) >>> 0) % n;
	}

	const stepQuote = $derived.by(() => {
		const i = scrollyIndex ?? 0;
		const pool = QUOTE_POOLS[i] ?? QUOTE_POOLS[0];
		if (!pool.length) return null;
		return pool[seededIndex(pool.length, i + 1)];
	});

	// =====================================================================
	// Base (Gephi) layout — normalise the raw coordinates into the viewBox.
	// A single `unit` for both axes keeps the layout undistorted.
	// =====================================================================

	const [minX, maxX] = extent(nodes, (d) => d.x);
	const [minY, maxY] = extent(nodes, (d) => d.y);
	const unit = (VB_W * (1 - 2 * PAD)) / (maxX - minX);
	const pad = VB_W * PAD;
	const VB_H = (maxY - minY) * unit + 2 * pad;

	for (const n of nodes) {
		n.vx = (n.x - minX) * unit + pad;
		n.vy = (n.y - minY) * unit + pad;
	}

	// =====================================================================
	// Layered layout — stack nodes by "generation".
	//
	// level(v) = the longest chain of accusations that reaches v. Because the
	// graph is acyclic, every edge strictly increases level, so drawing level on
	// the vertical axis makes every arrow point downward: no cycles, visibly.
	// =====================================================================

	const levels = (() => {
		const rev = new Map(nodes.map((n) => [n.id, []]));
		for (const l of links) {
			if (l.self) continue;
			rev.get(l.target).push(l.source);
		}
		const memo = new Map();
		const lv = (id) => {
			if (memo.has(id)) return memo.get(id);
			let best = 0;
			for (const p of rev.get(id)) best = Math.max(best, lv(p) + 1);
			memo.set(id, best);
			return best;
		};
		const map = new Map();
		for (const n of nodes) map.set(n.id, lv(n.id));
		return map;
	})();

	const COLS = 50; // nodes per row within a generation band
	const LVL_GAP = 3; // vertical space between generation bands, in grid units

	const layeredRaw = (() => {
		const byLvl = new Map();
		for (const n of nodes) {
			const l = levels.get(n.id);
			if (!byLvl.has(l)) byLvl.set(l, []);
			byLvl.get(l).push(n.id);
		}
		const maxLvl = Math.max(...byLvl.keys());
		const raw = new Map();
		let yCur = 0;
		for (let l = 0; l <= maxLvl; l++) {
			const ids = byLvl.get(l) || [];
			// Order within a band by the base layout's vertical position — a cheap
			// stand-in for crossing-minimisation, and it keeps the band readable.
			ids.sort((a, b) => byId.get(a).vy - byId.get(b).vy);
			const rows = Math.max(1, Math.ceil(ids.length / COLS));
			const xOff = (COLS - Math.min(ids.length, COLS)) / 2; // centre the band
			ids.forEach((id, i) => {
				raw.set(id, { x: xOff + (i % COLS), y: yCur + Math.floor(i / COLS) });
			});
			yCur += rows + LVL_GAP;
		}
		return raw;
	})();

	// Fit the layered box inside the viewBox (uniform unit) and centre it.
	for (const n of nodes) {
		n.lx = 0;
		n.ly = 0;
	}
	(() => {
		const raws = [...layeredRaw.values()];
		const rMinX = Math.min(...raws.map((r) => r.x));
		const rMaxX = Math.max(...raws.map((r) => r.x));
		const rMinY = Math.min(...raws.map((r) => r.y));
		const rMaxY = Math.max(...raws.map((r) => r.y));
		const w = rMaxX - rMinX || 1;
		const h = rMaxY - rMinY || 1;
		const u = Math.min((VB_W * (1 - 2 * PAD)) / w, (VB_H * (1 - 2 * PAD)) / h);
		const ox = (VB_W - w * u) / 2;
		const oy = (VB_H - h * u) / 2;
		for (const n of nodes) {
			const r = layeredRaw.get(n.id);
			n.lx = (r.x - rMinX) * u + ox;
			n.ly = (r.y - rMinY) * u + oy;
		}
	})();

	// =====================================================================
	// Camera — each step frames the part of the graph it is talking about.
	// =====================================================================

	const ZOOM = { min: 1, max: 8, fill: 0.9, duration: 900 };

	function bbox(pts) {
		const xs = pts.map((p) => p[0]);
		const ys = pts.map((p) => p[1]);
		const x0 = Math.min(...xs);
		const x1 = Math.max(...xs);
		const y0 = Math.min(...ys);
		const y1 = Math.max(...ys);
		return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, w: x1 - x0 || 1, h: y1 - y0 || 1 };
	}

	const baseBox = bbox(nodes.map((n) => [n.vx, n.vy]));
	const layeredBox = bbox(nodes.map((n) => [n.lx, n.ly]));

	// =====================================================================
	// Sizing — screen px per user unit, so node radii and labels stay constant
	// on screen however large the panel is, and however far the camera zooms.
	// =====================================================================

	const radiusPx = scaleSqrt()
		.domain(extent(nodes, (d) => d.size))
		.range([3, 11]);

	const unitPx = $derived(boxW && boxH ? Math.min(boxW / VB_W, boxH / VB_H) : 1);
	const viewW = $derived(boxW ? boxW / unitPx : VB_W);
	const viewH = $derived(boxH ? boxH / unitPx : VB_H);

	// The superspreaders sit in a thin horizontal band at the graph's left edge.
	// Anchor the frame's left edge near them so the cluster reads on the left
	// (clear of the centred step cards) and its fan of accusations fills the
	// rest — then grow the frame until every hub label fits. Labels are a fixed
	// size on screen, so the room they need depends on the zoom this frame
	// itself gets; two passes converge, deterministically.
	const hubBox = $derived.by(() => {
		const pts = [...hubs].map((id) => byId.get(id));
		const xs = pts.map((n) => n.vx);
		const ys = pts.map((n) => n.vy);
		const nx0 = Math.min(...xs);
		const nx1 = Math.max(...xs);
		const ny0 = Math.min(...ys);
		const ny1 = Math.max(...ys);
		const hb = bbox(pts.map((n) => [n.vx, n.vy]));

		const minFrame = (() => {
			const left = Math.max(hb.cx - HUB_MIN.w / 2, pad - 24);
			const cy = Math.min(Math.max(hb.cy, HUB_MIN.h / 2), VB_H - HUB_MIN.h / 2);
			return {
				x0: left,
				y0: cy - HUB_MIN.h / 2,
				x1: left + HUB_MIN.w,
				y1: cy + HUB_MIN.h / 2
			};
		})();

		let frame = minFrame;
		for (let pass = 0; pass < 2; pass++) {
			const w = frame.x1 - frame.x0;
			const h = frame.y1 - frame.y0;
			const k = Math.min(ZOOM.max, Math.max(ZOOM.min, Math.min(viewW / w, viewH / h) * ZOOM.fill));
			const p = (unitPx || 1) * k; // screen px per user unit at this zoom
			const fs = LABEL_PX / p;
			const gap = LABEL_PAD_PX / p;
			// Widest label extends the content's right edge; the overlay bands
			// pad it top and bottom so no name hides under card or legend.
			let xNeed = nx1;
			for (const n of pts) {
				const r = (radiusPx(n.size) * 1.25) / p + gap; // hubs render emphasized
				xNeed = Math.max(xNeed, n.vx + r + n.label.length * CHAR_W * fs);
			}
			const cY0 = ny0 - fs - QUOTE_INSET_PX / p;
			const cY1 = ny1 + fs + LEGEND_INSET_PX / p;
			frame = {
				x0: Math.min(minFrame.x0, nx0 - gap),
				y0: Math.min(minFrame.y0, cY0),
				x1: Math.max(minFrame.x1, xNeed),
				y1: Math.max(minFrame.y1, cY1)
			};
		}

		return {
			cx: (frame.x0 + frame.x1) / 2,
			cy: (frame.y0 + frame.y1) / 2,
			w: frame.x1 - frame.x0,
			h: frame.y1 - frame.y0
		};
	});

	const focusBox = $derived.by(() => {
		const i = scrollyIndex ?? 0;
		if (i === 1) return hubBox; // the six superspreaders
		if (i >= 3) return layeredBox; // the generation layout
		return baseBox; // the whole network
	});

	const camera = $derived.by(() => {
		const b = focusBox;
		const fit = Math.min(viewW / b.w, viewH / b.h) * ZOOM.fill;
		const k = Math.min(ZOOM.max, Math.max(ZOOM.min, fit));
		return { k, x: viewW / 2 - k * b.cx, y: viewH / 2 - k * b.cy };
	});

	const zoom = Tween.of(() => camera, { duration: ZOOM.duration });
	const pxToUser = $derived(unitPx * zoom.current.k || 1); // screen px → user units

	// =====================================================================
	// Step → visual state. Everything below derives from the scroll index.
	// =====================================================================

	const step = $derived(STEPS[scrollyIndex ?? 0] ?? STEPS[0]);
	const focus = $derived(step.node);
	const edgeFocus = $derived(step.edge);
	const layered = $derived(step.layout === 'layered');

	// 0 while in the base layout, 1 while layered — tweened so the morph animates.
	const mix = Tween.of(() => ({ v: layered ? 1 : 0 }), { duration: 900 });

	// Per-node render state: interpolated position, dim/emph, and colour.
	const nodeState = $derived.by(() => {
		const m = mix.current.v;
		const f = focus;
		const map = new Map();
		for (const n of nodes) {
			const px = n.vx + (n.lx - n.vx) * m;
			const py = n.vy + (n.ly - n.vy) * m;
			let op = 1;
			let emph = false;
			if (f === 'hubs') {
				emph = hubs.has(n.id);
				op = emph ? 1 : 0.07;
			} else if (f === 'turned') {
				emph = turnedSet.has(n.id);
				op = emph ? 1 : 0.07;
			}
			let color = roleColor(n.role);
			if (f === 'turned' && emph) color = 'var(--role-turned)';
			map.set(n.id, { id: n.id, label: n.label, size: n.size, px, py, op, emph, color });
		}
		return map;
	});

	function roleColor(role) {
		if (role === 'ACCUSER') return 'var(--role-accuser)';
		if (role === 'ACCUSED') return 'var(--role-accused)';
		return 'var(--role-both)';
	}

	// Non-self edges, styled for the active step. Self-loops are drawn as rings.
	const linkView = $derived.by(() => {
		const st = nodeState;
		const ef = edgeFocus;
		return links
			.filter((l) => !l.self)
			.map((l) => {
				let cls;
				if (ef === 'hubs') cls = hubs.has(l.source) || hubs.has(l.target) ? 'emph' : 'dim';
				else if (ef === 'book') cls = l.book ? 'book' : 'dim';
				else if (ef === 'flow') cls = 'flow';
				else cls = l.weight >= 6 ? 'heavy' : '';
				return { a: st.get(l.source), b: st.get(l.target), cls };
			});
	});

	// The seven self-loops, as rings floating off their node.
	const selfView = $derived.by(() => {
		const st = nodeState;
		const i = scrollyIndex ?? 0;
		return links
			.filter((l) => l.self)
			.map((l) => ({ n: st.get(l.source), emph: i >= 3 }));
	});

	// Which nodes get a label for this step — a per-step key into LABEL_SETS,
	// so a step's cast of names is editable right next to its other config.
	const LABEL_SETS = {
		hubs: () => [...hubs],
		turned: () => ['Tituba', 'Mary Warren', 'Abigail Williams', 'Martha Corey'],
		selfs: () => [...selfNodes]
	};

	const labels = $derived.by(() => {
		const build = LABEL_SETS[step.labels];
		if (!build) return [];
		const st = nodeState;
		return build()
			.map((id) => st.get(id))
			.filter(Boolean);
	});

	// Label placement. The visible rect, shrunk by the screen bands the quote
	// card and legend occupy, is the safe frame: labels stay inside it even
	// when their node does not, with a leader line carrying the binding.
	const labelFrame = $derived.by(() => {
		const p = pxToUser || 1;
		const z = zoom.current;
		return {
			x0: -z.x / z.k,
			y0: -z.y / z.k + QUOTE_INSET_PX / p,
			x1: (viewW - z.x) / z.k,
			y1: (viewH - z.y) / z.k - LEGEND_INSET_PX / p
		};
	});

	const labelLayout = $derived.by(() => {
		if (!boxW || !boxH) return [];
		const p = pxToUser || 1;
		const items = labels.map((n) => ({
			id: n.id,
			text: n.label,
			color: n.color,
			x: n.px,
			y: n.py,
			r: (radiusPx(n.size) * (n.emph ? 1.25 : 1)) / p
		}));
		return placeLabels(items, {
			frame: labelFrame,
			fontSize: LABEL_PX / p,
			pad: LABEL_PAD_PX / p,
			gap: LABEL_GAP_PX / p
		});
	});
</script>

<div class="network" bind:clientWidth={boxW} bind:clientHeight={boxH}>
	<svg
		viewBox="0 0 {viewW} {viewH}"
		role="img"
		aria-label="Network graph of the accusations made during the Salem witch trials."
		style="--label-size: {LABEL_PX / pxToUser}px"
	>
		<defs>
			<marker
				id="arrow"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth={6 / zoom.current.k}
				markerHeight={6 / zoom.current.k}
				markerUnits="userSpaceOnUse"
				orient="auto"
			>
				<path d="M0,0 L10,5 L0,10 z" class="head" />
			</marker>
			<marker
				id="arrowAccent"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth={6 / zoom.current.k}
				markerHeight={6 / zoom.current.k}
				markerUnits="userSpaceOnUse"
				orient="auto"
			>
				<path d="M0,0 L10,5 L0,10 z" class="head accent" />
			</marker>
			<marker
				id="arrowRed"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth={6 / zoom.current.k}
				markerHeight={6 / zoom.current.k}
				markerUnits="userSpaceOnUse"
				orient="auto"
			>
				<path d="M0,0 L10,5 L0,10 z" class="head red" />
			</marker>
		</defs>

		<g transform="translate({zoom.current.x} {zoom.current.y}) scale({zoom.current.k})">
		<g class="links">
			{#each linkView as l, i (i)}
				<line class="link {l.cls}" x1={l.a.px} y1={l.a.py} x2={l.b.px} y2={l.b.py} />
			{/each}
		</g>

		<!-- Self-loops: a ring attached to the node, drawn above the links. -->
		<g class="selfloops">
			{#each selfView as s (s.n.id)}
				{@const nodeR = radiusPx(s.n.size) / pxToUser}
				{@const loopR = (radiusPx(s.n.size) + 3) / pxToUser}
				{@const dist = nodeR + loopR}
				<circle
					class="selfloop"
					class:emph={s.emph}
					cx={s.n.px + dist * 0.7071}
					cy={s.n.py - dist * 0.7071}
					r={loopR}
				/>
			{/each}
		</g>

		<g class="nodes">
			{#each nodes as n (n.id)}
				{@const s = nodeState.get(n.id)}
				<circle
					class="node"
					class:emph={s.emph}
					cx={s.px}
					cy={s.py}
					r={(radiusPx(s.size) * (s.emph ? 1.25 : 1)) / pxToUser}
					style="fill: {s.color}; fill-opacity: {s.op}"
				/>
			{/each}
		</g>

		<!-- Labels are drawn last so they sit above the links. -->
		<g class="labels">
			{#each labelLayout as L (L.id)}
				{#if L.leader}
					<line class="leader" x1={L.sx} y1={L.sy} x2={L.ex} y2={L.ey} />
				{/if}
				<text
					x={L.x}
					y={L.y}
					dy="0.32em"
					text-anchor={L.side === 'left' ? 'end' : 'start'}
					style="fill: {L.color}"
					>{L.text}</text
				>
			{/each}
		</g>
		</g>
	</svg>

	<div class="legend" aria-hidden="true">
		<span class="item"><i class="swatch" style="background: var(--role-accuser)"></i>Accuser</span>
		<span class="item"><i class="swatch" style="background: var(--role-accused)"></i>Accused</span>
		<span class="item"><i class="swatch" style="background: var(--role-both)"></i>Both</span>
		<span class="item"><i class="swatch" style="background: var(--role-turned)"></i
			>Turned witch</span>
	</div>

	{#key stepQuote?.text}
		{#if stepQuote}
			<blockquote class="quote" transition:fade={{ duration: 300 }}>
				<span class="quote-text">“{stepQuote.text}”</span>
				<cite class="quote-source">
					{#if stepQuote.target === stepQuote.source}
						{stepQuote.source}
					{:else}
						{stepQuote.source} → {stepQuote.target}
					{/if}
				</cite>
			</blockquote>
		{/if}
	{/key}
</div>

<style>
	.network {
		--role-accuser: #2563eb;
		--role-accused: #d97706;
		--role-both: #7c3aed;
		--role-turned: #dc2626;

		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
	}

	svg {
		width: 100%;
		height: 100%;
	}

	.node {
		stroke: none;
		transition:
			fill var(--vcsi-transition-slow),
			fill-opacity var(--vcsi-transition-slow);
	}

	.node.emph {
		stroke: var(--vcsi-fg);
		stroke-width: 1px;
		stroke-opacity: 0.5;
	}

	.link {
		stroke: var(--vcsi-gray-400);
		stroke-opacity: 0.14;
		stroke-width: 1px;
		vector-effect: non-scaling-stroke;
		marker-end: url(#arrow);
		transition:
			stroke var(--vcsi-transition-slow),
			stroke-opacity var(--vcsi-transition-slow);
	}

	.link.heavy {
		stroke-opacity: 0.32;
	}

	.link.emph {
		stroke: var(--vcsi-color-accent);
		stroke-opacity: 0.65;
		marker-end: url(#arrowAccent);
	}

	.link.book {
		stroke: var(--role-turned);
		stroke-opacity: 0.7;
		marker-end: url(#arrowRed);
	}

	.link.flow {
		stroke: var(--vcsi-color-accent);
		stroke-opacity: 0.3;
		marker-end: url(#arrowAccent);
	}

	.link.dim {
		stroke-opacity: 0.04;
		marker-end: none;
	}

	.head {
		fill: var(--vcsi-gray-400);
		opacity: 0.5;
	}

	.head.accent {
		fill: var(--vcsi-color-accent);
		opacity: 0.8;
	}

	.head.red {
		fill: var(--role-turned);
		opacity: 0.85;
	}

	.selfloop {
		fill: none;
		stroke: var(--vcsi-gray-500, var(--vcsi-gray-400));
		stroke-width: 1.5px;
		vector-effect: non-scaling-stroke;
		transition: stroke var(--vcsi-transition-slow);
	}

	.selfloop.emph {
		stroke: var(--role-turned);
		stroke-width: 2.5px;
	}

	.labels text {
		font-family: var(--vcsi-font-sans);
		font-size: var(--label-size);
		fill: var(--vcsi-fg);
		/* Halo, so labels stay readable where they cross links. */
		paint-order: stroke;
		stroke: var(--vcsi-story-bg);
		stroke-width: 3px;
		stroke-linejoin: round;
	}

	.labels .leader {
		stroke: var(--vcsi-gray-400);
		stroke-width: 1px;
		stroke-opacity: 0.7;
		vector-effect: non-scaling-stroke;
	}

	.legend {
		position: absolute;
		left: 1rem;
		bottom: 1rem;
		display: flex;
		flex-wrap: wrap;
		gap: 0.65rem;
		font-family: var(--vcsi-font-sans);
		font-size: var(--vcsi-font-size-small, 0.8rem);
		color: var(--vcsi-fg);
		background: color-mix(in srgb, var(--vcsi-story-bg) 85%, transparent);
		padding: 0.4rem 0.6rem;
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-sm, 6px);
		pointer-events: none;
	}

	.legend .item {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.legend .swatch {
		width: 0.7em;
		height: 0.7em;
		border-radius: 50%;
		display: inline-block;
	}

	.quote {
		position: absolute;
		top: 1rem;
		left: 50%;
		transform: translateX(-50%);
		margin: 0;
		max-width: min(560px, 90%);
		padding: 0.6rem 0.85rem;
		text-align: center;
		font-family: var(--vcsi-font-serif, Georgia, 'Times New Roman', serif);
		font-size: var(--vcsi-font-size-small, 0.85rem);
		font-style: italic;
		line-height: 1.45;
		color: var(--vcsi-fg);
		background: color-mix(in srgb, var(--vcsi-story-bg) 85%, transparent);
		border: 1px solid var(--vcsi-border);
		border-top: 3px solid var(--vcsi-color-accent);
		border-radius: var(--vcsi-radius-sm, 6px);
		pointer-events: none;
	}

	.quote-source {
		display: block;
		margin-top: 0.3rem;
		font-family: var(--vcsi-font-sans);
		font-size: 0.75em;
		font-style: normal;
		color: var(--vcsi-fg);
		opacity: 0.65;
	}

	@media (max-width: 768px) {
		.quote {
			top: 0.5rem;
			max-width: calc(100% - 1rem);
			font-size: 0.8rem;
		}
	}
</style>
