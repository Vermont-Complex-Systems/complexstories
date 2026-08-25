<script>
	// The sticky "field": a unit chart of the active step. Each dot is one unit
	// (student, night, student-week…); dots are sorted into groups by role —
	// `hue` (the theme's main color), `tint` (a lighter shade for an ordered
	// middle band), and `rest` (neutral). Everything is derived from the one
	// step object handed down from Index.svelte; this component only draws.
	let { step = {} } = $props();

	const CELL = 20; // viewBox units per cell
	const R = 6; // dot radius
	const FIELD_COLS = (n) => Math.max(1, Math.ceil(Math.sqrt(n))); // near-square field
	const COL_COLS = 13; // fixed width for the two-panel `columns` mode (shared pitch)

	let theme = $derived(step?.theme ?? 'sleep');
	let mode = $derived(step?.mode ?? 'single');
	let d = $derived(step?.data ?? {});
	let stat = $derived(step?.stat ?? null);

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

	// single | split | whole — one field
	let field = $derived.by(() => {
		if (mode === 'columns') return null;
		const count = d.dots ?? 0;
		const { cols, w, h } = layout(count);
		const roles = allocate(d.groups ?? [], count);
		return {
			w,
			h,
			dots: roles.map((role, i) => ({
				role,
				cx: (i % cols) * CELL + CELL / 2,
				cy: Math.floor(i / cols) * CELL + CELL / 2
			}))
		};
	});

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
	{#if stat}
		<div class="stat">
			<span class="stat-value">{stat.value}</span>
			<span class="stat-label">{stat.label}</span>
		</div>
	{/if}

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
				class:pulse={mode === 'whole'}
				viewBox="0 0 {field.w} {field.h}"
				role="img"
				aria-label={ariaLabel}
			>
				{#each field.dots as dot, i (i)}
					<circle class="dot dot-{dot.role}" cx={dot.cx} cy={dot.cy} r={R} />
				{/each}
			</svg>
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
		gap: var(--vcsi-space-md);
		font-family: var(--vcsi-font-sans);
		color: var(--lem-ink, currentColor);
	}

	.stat {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.stat-value {
		font-family: var(--vcsi-font-heading);
		font-weight: var(--vcsi-font-weight-bold);
		font-size: var(--vcsi-font-size-xl);
		line-height: 1;
		color: var(--lem-hue);
		transition: color 400ms ease;
	}

	.stat-label {
		font-size: var(--vcsi-font-size-small);
		color: var(--lem-muted, currentColor);
	}

	.plot {
		display: flex;
		justify-content: center;
		min-height: 0;
	}

	svg {
		width: 100%;
		height: auto;
		max-height: 46vh;
		display: block;
		overflow: visible;
	}

	.dot {
		transition: fill 500ms ease;
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

	/* Whole-field synchrony state: every dot throbs on the same beat. */
	svg.pulse .dot {
		transform-box: fill-box;
		transform-origin: center;
	}
	@media (prefers-reduced-motion: no-preference) {
		svg.pulse .dot {
			animation: beat 1.5s ease-in-out infinite;
		}
	}
	@keyframes beat {
		0%,
		100% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.35);
		}
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
