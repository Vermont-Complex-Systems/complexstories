<script lang="ts">
	import { scaleLinear } from 'd3-scale';
	import { format } from 'd3-format';
	import { fade } from 'svelte/transition';
	import ScoreGauge from './ScoreGauge.svelte';
	import type { WordShiftResponse, WordShiftEntry } from '../types';

	let {
		data,
		leftLabel,
		rightLabel
	}: { data: WordShiftResponse; leftLabel?: string; rightLabel?: string } = $props();

	// The API echoes dates back as a single day or a 'start,end' month range;
	// render a range as a compact "Mon YYYY".
	function fmtWhen(s: string | null): string {
		if (!s) return '';
		const first = s.split(',')[0];
		if (s.includes(',')) {
			const [y, m] = first.split('-').map(Number);
			return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
				month: 'short',
				year: 'numeric'
			});
		}
		return first;
	}

	// Keyed elements persist across data changes, so CSS transitions interpolate
	// geometry (bars extend/shrink, rows glide) while fade handles enter/exit.
	const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';
	const tBar = `transition: x 0.5s ${ease}, width 0.5s ${ease};`;
	const tTip = `transition: x 0.5s ${ease};`;
	const tRow = `transition: transform 0.5s ${ease};`;

	// The four Shifterator categories, keyed by (relative sentiment, frequency).
	// Yellow = word is relatively positive; blue = relatively negative.
	// Solid = more prevalent in system 2 (↑); faded = less prevalent (↓).
	const CATEGORIES = {
		'pos-up': { color: 'var(--ws-pos-up)', label: '↑ positive word, more prevalent' },
		'pos-down': { color: 'var(--ws-pos-down)', label: '↓ positive word, less prevalent' },
		'neg-up': { color: 'var(--ws-neg-up)', label: '↑ negative word, more prevalent' },
		'neg-down': { color: 'var(--ws-neg-down)', label: '↓ negative word, less prevalent' }
	} as const;

	function categoryOf(e: WordShiftEntry): keyof typeof CATEGORIES {
		const pos = e.s_ref_diff >= 0;
		const up = e.p_diff >= 0;
		return `${pos ? 'pos' : 'neg'}-${up ? 'up' : 'down'}`;
	}

	// Hover tooltip: read a word's colour + direction back in plain language.
	type Ranked = WordShiftEntry & { pct: number };
	let hover = $state<{ d: Ranked; x: number; y: number; flip: boolean } | null>(null);

	function interpret(e: WordShiftEntry): string {
		const tone = e.s_ref_diff >= 0 ? 'positive' : 'negative';
		const freq = e.p_diff >= 0 ? 'more' : 'less';
		const dir = e.s_ref_diff >= 0 === e.p_diff >= 0 ? 'up' : 'down';
		return `A relatively ${tone} word, used ${freq} often in system 2 — nudging its average sentiment ${dir}.`;
	}

	const COMPONENTS = [
		{ key: 'pos_s_pos_p', cat: 'pos-up', label: 'positive, ↑ prevalent' },
		{ key: 'pos_s_neg_p', cat: 'pos-down', label: 'positive, ↓ prevalent' },
		{ key: 'neg_s_pos_p', cat: 'neg-up', label: 'negative, ↑ prevalent' },
		{ key: 'neg_s_neg_p', cat: 'neg-down', label: 'negative, ↓ prevalent' }
	] as const;

	// --- Everything on one % scale (Shifterator "variation" style) ------------
	// Per-type contribution to Δ average sentiment, exactly as Shifterator draws
	// the bars: (p_diff·s_ref_diff + p_avg·s_diff) ÷ the total |shift| (`norm`),
	// ×100. (NOT `shift_score`, which the API scales differently.) component_sums
	// arrive already ÷norm with |values| summing to 1, so ×100 gives each
	// component's % of the total shift; the net is their signed sum (the true Δ).
	const contribOf = (e: WordShiftEntry) => e.p_diff * e.s_ref_diff + e.p_avg * e.s_diff;

	let compRows = $derived(
		COMPONENTS.map((c) => ({
			label: c.label,
			color: CATEGORIES[c.cat].color,
			value: 100 * (data.component_sums?.[c.key] ?? 0)
		}))
	);
	let netValue = $derived(
		100 * COMPONENTS.reduce((s, c) => s + (data.component_sums?.[c.key] ?? 0), 0)
	);

	let normVal = $derived(
		data.norm || data.entries.reduce((s, e) => s + Math.abs(contribOf(e)), 0) || 1
	);
	// Biggest movers first.
	let ranked = $derived(
		[...data.entries]
			.map((d) => ({ ...d, pct: (100 * contribOf(d)) / normVal }))
			.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
	);

	let width = $state(720);
	const padX = { left: 152, right: 120 };
	let plotWidth = $derived(Math.max(0, width - padX.left - padX.right));

	// The per-type bars set the axis. The component/net bars are cumulative sums
	// (tens of %), so — like Shifterator — we shrink them to fit that axis and
	// show their true value as a label instead of reading them off the ticks.
	let maxPct = $derived(Math.max(...ranked.map((d) => Math.abs(d.pct)), 1e-6));
	let x = $derived(scaleLinear().domain([-maxPct, maxPct]).range([0, plotWidth]).nice());
	let ticks = $derived(x.ticks(5));
	const zero = $derived(x(0));
	const fmtTick = $derived(x.tickFormat(5));

	let maxComp = $derived(
		Math.max(...compRows.map((r) => Math.abs(r.value)), Math.abs(netValue), 1e-6)
	);
	let compScale = $derived(maxPct / maxComp);

	const fmtVal = format('+.1f');
	const fmtHapps = format('.3f');
	const fmtSent = format('.1f'); // a word's labMT score (1–9), s_ref_diff + reference_value

	// --- Per-word bars (bottom) — compact rows to fit many top words ----------
	const rowHeight = 16;
	const wordPadY = { top: 6, bottom: 34 };
	let innerHeight = $derived(ranked.length * rowHeight);
	let height = $derived(innerHeight + wordPadY.top + wordPadY.bottom);

	// --- Component sums (top) + net shift (middle) ----------------------------
	const compRowHeight = 22;
	const compPadY = { top: 6, bottom: 24 };
	let compInnerHeight = $derived(compRows.length * compRowHeight);
	let compHeight = $derived(compInnerHeight + compPadY.top + compPadY.bottom);
	let netBx = $derived(x(netValue * compScale));
	let netPositive = $derived(netValue >= 0);

	const netRowHeight = 30;
	const netPadY = { top: 4, bottom: 4 };
	let netHeight = $derived(netRowHeight + netPadY.top + netPadY.bottom);
</script>

<div class="chart">
	<header class="summary">
		<div class="system">
			<span class="muted">System 1 (baseline)</span>
			<strong>{leftLabel ?? data.meta.system1.entity} · {fmtWhen(data.meta.system1.dates)}</strong>
			<span class="happs">happiness {fmtHapps(data.s_avg_1)}</span>
		</div>
		<div class="arrow" aria-hidden="true">→</div>
		<div class="system">
			<span class="muted">System 2</span>
			<strong>{rightLabel ?? data.meta.system2.entity} · {fmtWhen(data.meta.system2.dates)}</strong>
			<span class="happs">
				happiness {fmtHapps(data.s_avg_2)}
				<span class:up={data.s_avg_2 >= data.s_avg_1} class:down={data.s_avg_2 < data.s_avg_1}>
					({data.s_avg_2 >= data.s_avg_1 ? '+' : ''}{fmtHapps(data.s_avg_2 - data.s_avg_1)})
				</span>
			</span>
		</div>
	</header>

	<!-- Top: cumulative contribution of each of the four components -->
	<figure class="panel">
		<figcaption>Cumulative contribution by component (% of total shift)</figcaption>
		<div class="fill" bind:clientWidth={width}>
			<svg viewBox={`0 0 ${width} ${compHeight}`} role="img" aria-label="Cumulative component contributions">
				<g transform={`translate(${padX.left},${compPadY.top})`}>
					<line class="grid zero" x1={zero} x2={zero} y1={0} y2={compInnerHeight} />

					{#each compRows as row, i (row.label)}
						{@const bx = x(row.value * compScale)}
						{@const positive = row.value >= 0}
						<g transform={`translate(0,${i * compRowHeight})`}>
							<text class="row-label" x={-padX.left + 4} y={compRowHeight / 2}>{row.label}</text>
							<rect
								x={Math.min(zero, bx)}
								y={6}
								width={Math.abs(bx - zero)}
								height={compRowHeight - 14}
								rx={2}
								fill={row.color}
								style={tBar}
							/>
							<text
								class="value"
								x={positive ? bx + 5 : bx - 5}
								y={compRowHeight / 2}
								text-anchor={positive ? 'start' : 'end'}
								style={tTip}
							>
								{fmtVal(row.value)}%
							</text>
						</g>
					{/each}
				</g>
			</svg>
		</div>
	</figure>

	<!-- Middle: the net shift — the four components netted out, on the same axis -->
	<figure class="panel net">
		<div class="fill">
			<svg viewBox={`0 0 ${width} ${netHeight}`} role="img" aria-label="Net sentiment shift">
				<g transform={`translate(${padX.left},${netPadY.top})`}>
					<line class="grid zero" x1={zero} x2={zero} y1={0} y2={netRowHeight} />
					<text class="row-label strong" x={-padX.left + 4} y={netRowHeight / 2}>Σ net shift</text>
					<rect
						x={Math.min(zero, netBx)}
						y={8}
						width={Math.abs(netBx - zero)}
						height={netRowHeight - 16}
						rx={2}
						fill="var(--vcsi-fg)"
						style={tBar}
					/>
					<text
						class="value strong"
						x={netPositive ? netBx + 5 : netBx - 5}
						y={netRowHeight / 2}
						text-anchor={netPositive ? 'start' : 'end'}
						style={tTip}
					>
						{fmtVal(netValue)}%
					</text>
				</g>
			</svg>
		</div>
	</figure>

	<!-- Bottom: per-word contributions -->
	<div class="plot fill">
		<svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Word shift graph">
			<g transform={`translate(${padX.left},${wordPadY.top})`}>
				{#each ticks as tick (tick)}
					<line class="grid" x1={x(tick)} x2={x(tick)} y1={0} y2={innerHeight} class:zero={tick === 0} />
				{/each}

				{#each ranked as d, i (d.type)}
					{@const cat = categoryOf(d)}
					{@const bx = x(d.pct)}
					{@const positive = d.pct >= 0}
					<g transform={`translate(0,${i * rowHeight})`} style={tRow} transition:fade={{ duration: 300 }}>
						<rect
							x={Math.min(zero, bx)}
							y={2}
							width={Math.abs(bx - zero)}
							height={rowHeight - 6}
							rx={2}
							fill={CATEGORIES[cat].color}
							style={tBar}
						/>
						<text
							class="word"
							x={positive ? bx + 6 : bx - 6}
							y={rowHeight / 2}
							text-anchor={positive ? 'start' : 'end'}
							style={tTip}
						>
							{d.type}
							<tspan class="dir">{d.p_diff >= 0 ? '↑' : '↓'}{d.s_ref_diff >= 0 ? '+' : '−'}</tspan>
						</text>
						<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
						<rect
							class="hit"
							x={-padX.left}
							y={0}
							width={width}
							height={rowHeight}
							fill="transparent"
							role="img"
							aria-label={`${d.type}: ${interpret(d)}`}
							onmouseenter={(e) =>
								(hover = { d, x: e.clientX, y: e.clientY, flip: e.clientX > window.innerWidth - 280 })}
							onmousemove={(e) =>
								(hover = { d, x: e.clientX, y: e.clientY, flip: e.clientX > window.innerWidth - 280 })}
							onmouseleave={() => (hover = null)}
						/>
					</g>
				{/each}

				{#each ticks as tick (tick)}
					<text class="tick" x={x(tick)} y={innerHeight + 16} text-anchor="middle">{fmtTick(tick)}</text>
				{/each}
				<text class="axis-label" x={plotWidth / 2} y={innerHeight + 32} text-anchor="middle">
					Per-type average score shift δs_avg,r (%)
				</text>
			</g>
		</svg>
	</div>

	<!-- Category key — floats in the bottom-left corner and stays put while the
	     word list scrolls, so it never eats vertical space at the top. -->
	<ul class="legend">
		{#each Object.entries(CATEGORIES) as [key, cat] (key)}
			<li><span class="swatch" style:background={cat.color}></span>{cat.label}</li>
		{/each}
	</ul>

	{#if hover}
		{@const d = hover.d}
		{@const cat = categoryOf(d)}
		{@const tone = d.s_ref_diff >= 0 ? 'positive' : 'negative'}
		{@const freq = d.p_diff >= 0 ? 'more' : 'less'}
		{@const dir = d.s_ref_diff >= 0 === d.p_diff >= 0 ? 'up' : 'down'}
		{@const score = d.s_ref_diff + data.reference_value}
		<div
			class="ws-tooltip"
			class:flip={hover.flip}
			style="left: {hover.x}px; top: {hover.y}px; --cat: {CATEGORIES[cat].color};"
		>
			<div class="tt-head">
				<span class="tt-swatch" style:background={CATEGORIES[cat].color}></span>
				<strong class="ink">{d.type}</strong>
				<span class="tt-pct">{fmtVal(d.pct)}%</span>
			</div>
			<div class="tt-gauge" title="labMT sentiment score — 1 saddest, 9 happiest">
				<ScoreGauge value={score} min={1} max={9} label="labMT score" interactive={false} />
				<span class="tt-gauge-val">{fmtSent(score)} / 9</span>
			</div>
			<p class="tt-body">
				A relatively <span class="ink">{tone}</span> word, used <span class="ink">{freq}</span> often
				in system 2 — nudging its average sentiment <span class="ink">{dir}</span>.
			</p>
		</div>
	{/if}
</div>

<style>
	.chart {
		--ws-pos-up: #f2b705;
		--ws-pos-down: #f8e3a3;
		--ws-neg-up: #3b6fb6;
		--ws-neg-down: #b3c7e6;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.hit {
		cursor: default;
	}
	.ws-tooltip {
		position: fixed;
		z-index: 50;
		max-width: 15rem;
		padding: 0.5rem 0.7rem;
		background: var(--vcsi-bg);
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-md);
		box-shadow: 0 4px 16px color-mix(in oklch, var(--vcsi-fg) 14%, transparent);
		pointer-events: none;
		transform: translate(14px, 14px);
		font-size: 0.8rem;
	}
	.ws-tooltip.flip {
		transform: translate(calc(-100% - 14px), 14px);
	}
	.tt-head {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	/* Category hue, pulled toward the text colour so even the pale "less
	   prevalent" swatches stay readable as text (and it adapts to dark mode). */
	.ink {
		color: color-mix(in oklch, var(--cat) 65%, var(--vcsi-fg));
		font-weight: 600;
	}
	/* Underline the coded descriptors in the sentence (not the headword). */
	.tt-body .ink {
		text-decoration: underline;
		text-decoration-color: var(--cat);
		text-decoration-thickness: 2px;
		text-underline-offset: 2px;
	}
	.tt-swatch {
		width: 0.75rem;
		height: 0.75rem;
		border-radius: 3px;
		flex-shrink: 0;
	}
	.tt-pct {
		margin-left: auto;
		color: var(--vcsi-muted);
		font-variant-numeric: tabular-nums;
	}
	.tt-body {
		margin: 0.35rem 0 0;
		color: var(--vcsi-muted);
		line-height: 1.4;
	}
	.tt-gauge {
		max-width: 9.5rem;
		margin: 0.4rem auto 0;
		text-align: center;
	}
	.tt-gauge-val {
		display: block;
		margin-top: -0.15rem;
		font-size: 0.72rem;
		color: var(--vcsi-muted);
		font-variant-numeric: tabular-nums;
	}
	.summary {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 1.5rem;
		flex-wrap: wrap;
		font-size: 0.875rem;
	}
	.system {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}
	.summary .arrow {
		font-size: 1.5rem;
		color: var(--vcsi-muted);
	}
	.muted {
		color: var(--vcsi-muted);
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}
	.happs {
		color: var(--vcsi-muted);
	}
	.happs .up {
		color: var(--ws-pos-up);
		font-weight: 600;
	}
	.happs .down {
		color: var(--ws-neg-up);
		font-weight: 600;
	}
	.legend {
		position: sticky;
		bottom: var(--vcsi-space-sm);
		z-index: 2;
		align-self: flex-start;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		list-style: none;
		margin: 0;
		padding: 0.5rem 0.7rem;
		font-size: 0.7rem;
		color: var(--vcsi-muted);
		background: color-mix(in oklch, var(--vcsi-bg) 86%, transparent);
		backdrop-filter: blur(4px);
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-md);
		box-shadow: 0 2px 10px color-mix(in oklch, var(--vcsi-fg) 10%, transparent);
	}
	.legend li {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		white-space: nowrap;
	}
	.swatch {
		display: inline-block;
		width: 0.8rem;
		height: 0.8rem;
		border-radius: 3px;
		flex-shrink: 0;
	}
	.panel {
		margin: 0;
	}
	.panel figcaption {
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		color: var(--vcsi-muted);
		margin-bottom: 0.15rem;
	}
	.panel.net {
		background: var(--vcsi-code-bg);
		border-radius: var(--vcsi-radius-md);
		padding: 0.15rem 0;
	}
	.fill {
		width: 100%;
	}
	svg {
		width: 100%;
		height: auto;
		display: block;
	}
	.grid {
		stroke: var(--vcsi-border);
		stroke-width: 1;
	}
	.grid.zero {
		stroke: var(--vcsi-muted);
	}
	.row-label {
		font-size: 11px;
		fill: var(--vcsi-fg);
		dominant-baseline: middle;
		text-anchor: start;
	}
	.value {
		font-size: 10px;
		fill: var(--vcsi-muted);
		dominant-baseline: middle;
	}
	.strong {
		font-weight: 700;
		fill: var(--vcsi-fg);
	}
	.word {
		font-size: 10px;
		fill: var(--vcsi-fg);
		dominant-baseline: middle;
	}
	.word .dir {
		fill: var(--vcsi-muted);
		font-size: 9px;
	}
	.tick {
		font-size: 10px;
		fill: var(--vcsi-muted);
	}
	.axis-label {
		font-size: 11px;
		fill: var(--vcsi-muted);
	}
</style>
