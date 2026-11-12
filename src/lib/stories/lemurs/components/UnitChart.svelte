<script>
	// The sticky "field": a unit chart of the active step. Each dot is one unit
	// (student, night, student-week…); dots are sorted into groups by role —
	// `hue` (the theme's main color), `tint` (a lighter shade for an ordered
	// middle band), and `rest` (neutral). Everything is derived from the one
	// step object handed down from Index.svelte; this component only draws.
	import { onMount } from 'svelte';
	import Stat from './Stat.svelte';
	import SocialField from './SocialField.svelte';

	let { step = {} } = $props();

	const CELL = 20; // viewBox units per cell
	const R = 6; // dot radius
	const BOX = 520; // every grid-style step draws into this same box, so a step change moves dots instead of rescaling the chart
	const FIELD_COLS = (n) => Math.max(1, Math.ceil(Math.sqrt(n))); // near-square field
	const COL_COLS = 13; // fixed width for the two-panel `columns` mode (shared pitch)

	let theme = $derived(step?.theme ?? 'sleep');
	let mode = $derived(step?.mode ?? 'single');
	let d = $derived(step?.data ?? {});
	let stat = $derived(step?.stat ?? null);
	let motion = $derived(step?.motion ?? null);

	// Turn a list of groups into a flat array of dot roles over `count` dots.
	// The last group absorbs the rounding remainder so the total is exact.
	function allocate(groups, count) {
		const roles = [];
		let assigned = 0;
		groups.forEach((g, i) => {
			const n = i === groups.length - 1 ? count - assigned : Math.round((g.share ?? 0) * count);
			assigned += n;
			for (let k = 0; k < n; k++) roles.push(g.role ?? 'rest');
		});
		return roles;
	}

	function layout(count, cols) {
		const c = cols ?? FIELD_COLS(count);
		const rows = Math.max(1, Math.ceil(count / c));
		return { cols: c, rows, w: c * CELL, h: rows * CELL };
	}

	// `motion: "threshold"` — a horizontal line through the field. `hue` dots
	// sit above it, `rest` dots below, and each `tint` dot owns a slot on both
	// sides (mirrored across the line, same column) so it can hop back and forth.
	const TH_COLS = 32; // wider than the square field: the tint band is drawn twice
	const TH_GAP = CELL * 1.5; // clear space around the line
	let threshold = $derived.by(() => {
		if (motion !== 'threshold' || mode === 'columns') return null;
		const count = d.dots ?? 0;
		const roles = allocate(d.groups ?? [], count);
		const nHue = roles.filter((r) => r === 'hue').length;
		const nTint = roles.filter((r) => r === 'tint').length;
		const rows = (n) => Math.ceil(n / TH_COLS);
		const hueRows = rows(nHue);
		const tintRows = rows(nTint);
		const lineY = (hueRows + tintRows) * CELL + TH_GAP / 2;
		const above = (row) => row * CELL + CELL / 2; // row counted from the top
		const below = (row) => lineY + TH_GAP / 2 + row * CELL + CELL / 2; // from the line down
		let h = 0, t = 0, r = 0, maxBelow = 0;
		const dots = roles.map((role) => {
			if (role === 'hue') {
				const k = h++;
				return { role, cx: (k % TH_COLS) * CELL + CELL / 2, cy: above(Math.floor(k / TH_COLS)) };
			}
			if (role === 'tint') {
				// row 0 is the row nearest the line on either side
				const k = t++, c = k % TH_COLS, j = Math.floor(k / TH_COLS);
				return { role, cx: c * CELL + CELL / 2, cy: above(hueRows + tintRows - 1 - j), cyAlt: below(j) };
			}
			const k = r++, row = tintRows + Math.floor(k / TH_COLS);
			maxBelow = Math.max(maxBelow, row + 1);
			return { role, cx: (k % TH_COLS) * CELL + CELL / 2, cy: below(row) };
		});
		return { w: TH_COLS * CELL, h: lineY + TH_GAP / 2 + maxBelow * CELL, lineY, dots, nTint };
	});

	// Which tint dots are currently below the line. Every tick a few of them
	// flip, so the band keeps churning; reduced motion holds a fixed half-split.
	let down = $state([]);
	let reduceMotion = $state(false);
	// Phones stack `sides` groups top-to-bottom instead of left-to-right.
	let narrow = $state(false);
	onMount(() => {
		const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
		reduceMotion = mq.matches;
		const onChange = (e) => (reduceMotion = e.matches);
		mq.addEventListener('change', onChange);
		const nq = window.matchMedia('(max-width: 768px)');
		narrow = nq.matches;
		const onNarrow = (e) => (narrow = e.matches);
		nq.addEventListener('change', onNarrow);
		return () => {
			mq.removeEventListener('change', onChange);
			nq.removeEventListener('change', onNarrow);
		};
	});
	$effect(() => {
		const n = threshold?.nTint ?? 0;
		if (!n) return;
		down = Array.from({ length: n }, (_, k) => (reduceMotion ? k % 2 === 1 : Math.random() < 0.5));
		if (reduceMotion) return;
		const id = setInterval(() => {
			down = down.map((v) => (Math.random() < 0.06 ? !v : v));
		}, 280);
		return () => clearInterval(id);
	});

	// `motion: "social"` — the opening cohort as a mingling crowd. Reduced motion
	// skips the crowd entirely and falls back to the static grid field.
	let social = $derived(motion === 'social' && mode !== 'columns' && !reduceMotion);

	// single | split | whole — one field
	let field = $derived.by(() => {
		if (mode === 'columns') return null;
		if (threshold) {
			let t = 0;
			return {
				...threshold,
				dots: threshold.dots.map((dot) =>
					dot.role === 'tint' && down[t++] ? { ...dot, cy: dot.cyAlt } : dot
				)
			};
		}
		const count = d.dots ?? 0;
		const roles = allocate(d.groups ?? [], count);
		if (step?.arrange === 'sides') {
			const pts = sidePositions(roles, !narrow);
			return {
				w: BOX,
				h: BOX,
				dots: roles.map((role, i) => ({ role, cx: pts[i][0], cy: pts[i][1] }))
			};
		}
		const { slots, cols, rows } = gridSlots(count);
		const ox = (BOX - cols * CELL) / 2;
		const oy = (BOX - rows * CELL) / 2;
		return {
			w: BOX,
			h: BOX,
			dots: roles.map((role, i) => ({
				role,
				cx: ox + slots[i][0] * CELL + CELL / 2,
				cy: oy + slots[i][1] * CELL + CELL / 2
			}))
		};
	});

	// Cell [col, row] for each dot index, row by row.
	function gridSlots(count) {
		const slots = [];
		const cols = FIELD_COLS(count);
		const rows = Math.max(1, Math.ceil(count / cols));
		for (let i = 0; i < count; i++) slots.push([i % cols, Math.floor(i / cols)]);
		return { slots, cols, rows };
	}

	// `sides`: each colour group is its own run of columns (desktop) or rows
	// (phones), and every group boundary starts a new run with a gap before it.
	const GROUP_GAP = CELL * 0.75;
	function sidePositions(roles, byColumn) {
		const span = Math.max(1, Math.ceil(Math.sqrt(roles.length)));
		const pts = [];
		let major = 0; // column index (desktop) or row index (phones)
		let minor = 0; // row index (desktop) or column index (phones)
		let gap = 0;
		roles.forEach((role, i) => {
			if (i > 0 && role !== roles[i - 1]) {
				major += 1;
				minor = 0;
				gap += GROUP_GAP;
			}
			if (minor === span) {
				major += 1;
				minor = 0;
			}
			const along = major * CELL + gap + CELL / 2;
			const across = minor * CELL + CELL / 2;
			pts.push(byColumn ? [along, across] : [across, along]);
			minor += 1;
		});
		if (!pts.length) return pts;
		// Centre the whole arrangement in the shared box.
		const xs = pts.map((p) => p[0]);
		const ys = pts.map((p) => p[1]);
		const minX = Math.min(...xs) - CELL / 2;
		const minY = Math.min(...ys) - CELL / 2;
		const ox = (BOX - (Math.max(...xs) + CELL / 2 - minX)) / 2 - minX;
		const oy = (BOX - (Math.max(...ys) + CELL / 2 - minY)) / 2 - minY;
		return pts.map(([x, y]) => [x + ox, y + oy]);
	}

	// columns — two panels at a shared dot pitch, so area is an honest comparison
	let columns = $derived.by(() => {
		if (mode !== 'columns') return null;
		return (d.columns ?? []).map((col) => {
			const count = col.n ?? (col.groups ?? []).reduce((a, g) => a + (g.count ?? 0), 0);
			const { w, h } = layout(count, COL_COLS);
			const roles = allocate(col.groups ?? [], count);
			const hueGroup = (col.groups ?? []).find((g) => g.role === 'hue');
			return {
				label: col.label,
				n: count,
				pct: Math.round((hueGroup?.share ?? 0) * 100),
				w,
				h,
				dots: roles.map((role, i) => ({
					role,
					cx: (i % COL_COLS) * CELL + CELL / 2,
					cy: Math.floor(i / COL_COLS) * CELL + CELL / 2
				}))
			};
		});
	});

	// Legend rows. For `columns`, the two hue/rest labels apply to both panels.
	let legend = $derived(
		mode === 'columns' ? (d.columns?.[0]?.groups ?? []) : (d.groups ?? [])
	);
	let showLegendPct = $derived(mode !== 'columns' && mode !== 'single' && mode !== 'whole');

	let ariaLabel = $derived(
		`${step?.title ?? ''} ${(d.groups ?? [])
			.map((g) => `${g.label}: ${Math.round((g.share ?? 0) * 100)}%`)
			.join('; ')}`
	);
</script>

<figure
	class="chart"
	style="--lem-hue: var(--lem-{theme}); --lem-tint: var(--lem-{theme}-tint); --lem-rest: var(--lem-dot-rest);"
>
	<Stat {stat} />

	<div class="plot">
		{#if mode === 'columns' && columns}
			<div class="cols">
				{#each columns as col (col.label)}
					<div class="col">
						<div class="col-pct">{col.pct}%</div>
						<svg viewBox="0 0 {col.w} {col.h}" role="img" aria-label="{col.label}: {col.pct}%">
							{#each col.dots as dot, i (i)}
								<circle class="dot dot-{dot.role}" cx={dot.cx} cy={dot.cy} r={R} />
							{/each}
						</svg>
						<div class="col-label">{col.label}</div>
						<div class="col-n">{col.n} students</div>
					</div>
				{/each}
			</div>
		{:else if field}
			<svg
				class={{
					pulse: mode === 'whole',
					moving: !!threshold,
					revealing: social,
					arriving: step?.id === 'impairment' && !reduceMotion
				}}
				viewBox="0 0 {field.w} {field.h}"
				role="img"
				aria-hidden={social}
				aria-label={ariaLabel}
			>
				<!-- positioned by transform (not cx/cy) so the threshold hops can ease -->
				{#each field.dots as dot, i (i)}
					<circle class="dot dot-{dot.role}" r={R} style:transform="translate({dot.cx}px, {dot.cy}px)" />
				{/each}
				{#if threshold}
					<line class="threshold" x1={-CELL / 2} x2={field.w + CELL / 2} y1={field.lineY} y2={field.lineY} />
				{/if}
			</svg>
		{/if}
		{#if social || (step?.id === 'impairment' && !reduceMotion)}
			<div class={['crowd-layer', { departing: !social }]}>
				<SocialField
					count={d.dots ?? 0}
					label={ariaLabel}
					exitTargets={!social ? field?.dots : null}
				/>
			</div>
		{/if}
	</div>

	<figcaption>
		<ul class="legend">
			{#each legend as g (g.label)}
				<li>
					<span class="swatch swatch-{g.role}"></span>
					<span class="l-label">{g.label}</span>
					{#if showLegendPct}<span class="l-pct">{Math.round((g.share ?? 0) * 100)}%</span>{/if}
				</li>
			{/each}
		</ul>
		{#if d.each}<p class="each">{d.each}</p>{/if}
	</figcaption>
</figure>

<style>
	.chart {
		margin: 0;
		width: 100%;
		height: 100%;
		display: flex;
		flex-direction: column;
		justify-content: center;
		align-items: center;
		gap: var(--vcsi-space-md);
		font-family: var(--vcsi-font-sans);
		color: var(--lem-ink, currentColor);
	}

	.plot {
		width: 100%;
		display: grid;
		place-items: center;
		min-height: 0;
	}

	.plot > svg,
	.plot > .cols,
	.plot > .crowd-layer {
		grid-area: 1 / 1;
	}

	.crowd-layer {
		width: 100%;
		pointer-events: none;
	}

	svg.revealing {
		opacity: 0;
	}

	svg {
		width: 100%;
		height: auto;
		max-height: var(--lem-chart-max, 46vh);
		display: block;
		overflow: visible;
	}

	@media (prefers-reduced-motion: no-preference) {
		svg {
			transition: opacity 250ms ease;
		}

		.crowd-layer.departing {
			animation: crowd-depart 250ms ease 1000ms both;
		}

		svg.arriving {
			animation: chart-arrive 250ms ease 1000ms both;
		}
	}

	@keyframes crowd-depart {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	@keyframes chart-arrive {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Every step tweens its dots from where they were to where they now belong,
	   so a change of step re-sorts the field rather than swapping it. Positions
	   are set with transform, which is what the transition runs on. */
	.dot {
		transition: fill 500ms ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.dot {
			transition:
				fill 500ms ease,
				transform 900ms cubic-bezier(0.45, 0, 0.25, 1);
		}
	}
	.dot-hue {
		fill: var(--lem-hue);
	}
	.dot-tint {
		fill: var(--lem-tint);
	}
	.dot-rest {
		fill: var(--lem-rest);
	}

	/* Whole-field synchrony state: every dot throbs on the same beat. The dots
	   are placed with transform, so the beat scales a stroke rather than the
	   transform itself (which would snap every dot back to the origin). */
	@media (prefers-reduced-motion: no-preference) {
		svg.pulse .dot {
			animation: beat 1.5s ease-in-out infinite;
		}
	}
	@keyframes beat {
		0%,
		100% {
			stroke-width: 0;
		}
		50% {
			stroke-width: 4;
		}
	}
	svg.pulse .dot-hue {
		stroke: var(--lem-hue);
	}
	svg.pulse .dot-tint {
		stroke: var(--lem-tint);
	}
	svg.pulse .dot-rest {
		stroke: var(--lem-rest);
	}

	/* Threshold state: dots glide to their side of the line, and tint dots keep
	   hopping across it. */
	.threshold {
		stroke: var(--lem-ink);
		stroke-width: 2.5;
	}

	/* columns mode */
	.cols {
		display: flex;
		align-items: flex-start;
		justify-content: center;
		gap: var(--vcsi-space-xl);
		width: 100%;
	}
	.col {
		flex: 1;
		max-width: 45%;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.35rem;
	}
	.col svg {
		max-height: 34vh;
		width: auto;
		max-width: 100%;
	}
	.col-pct {
		font-family: var(--vcsi-font-heading);
		font-weight: var(--vcsi-font-weight-bold);
		font-size: var(--vcsi-font-size-lg);
		color: var(--lem-hue);
		line-height: 1;
	}
	.col-label {
		font-size: var(--vcsi-font-size-xs);
		font-weight: var(--vcsi-font-weight-semibold);
		text-align: center;
		max-width: 20ch;
	}
	.col-n {
		font-size: var(--vcsi-font-size-xs);
		color: var(--lem-muted, currentColor);
	}

	/* legend */
	.legend {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: var(--vcsi-font-size-xs);
		line-height: 1.3;
	}
	.swatch {
		flex: none;
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 2px;
		transition: background-color 400ms ease;
	}
	.swatch-hue {
		background: var(--lem-hue);
	}
	.swatch-tint {
		background: var(--lem-tint);
	}
	.swatch-rest {
		background: var(--lem-rest);
	}
	.l-label {
		flex: 1;
	}
	.l-pct {
		font-variant-numeric: tabular-nums;
		font-weight: var(--vcsi-font-weight-semibold);
		color: var(--lem-ink2, currentColor);
	}
	.each {
		margin: 0.5rem 0 0;
		font-size: var(--vcsi-font-size-xs);
		font-style: italic;
		color: var(--lem-muted, currentColor);
	}

	@media (max-width: 768px) {
		svg {
			max-height: none;
		}
	}
</style>
