<script>
	import { scaleBand, scaleLinear } from 'd3-scale';
	import { max } from 'd3-array';
	import network from '../data/salem_network_layout.json';

	let { scrollyIndex } = $props();

	// =====================================================================
	// Data — every accusation dated to the month it was made, as a continuous
	// month series from the first to the last accusation in the record.
	// =====================================================================

	const months = (() => {
		const counts = new Map();
		for (const e of network.edges) {
			const d = e.attributes.d24;
			if (!d || d === 'null') continue;
			const key = String(d).slice(0, 7); // YYYY-MM
			counts.set(key, (counts.get(key) ?? 0) + 1);
		}
		const keys = [...counts.keys()].sort();
		let [y, m] = keys[0].split('-').map(Number);
		const [endY, endM] = keys[keys.length - 1].split('-').map(Number);
		const out = [];
		while (y < endY || (y === endY && m <= endM)) {
			const key = `${y}-${String(m).padStart(2, '0')}`;
			out.push({ key, m, count: counts.get(key) ?? 0 });
			m += 1;
			if (m > 12) {
				m = 1;
				y += 1;
			}
		}
		return out;
	})();

	const peakMonth = months.reduce((a, b) => (b.count > a.count ? b : a));
	const countFor = (key) => months.find((d) => d.key === key)?.count ?? 0;
	const wave2 = [countFor('1692-08'), countFor('1692-09')];

	const MONTH_ABBR = [
		'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
		'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
	];
	const label = (m) => MONTH_ABBR[m.m - 1];

	// =====================================================================
	// Chart geometry — a fixed viewBox so the whole panel scales cleanly.
	// =====================================================================

	const VB_W = 900;
	const VB_H = 480;
	const M = { top: 34, right: 34, bottom: 64, left: 66 };
	const innerW = VB_W - M.left - M.right;
	const innerH = VB_H - M.top - M.bottom;

	const x = scaleBand()
		.domain(months.map((d) => d.key))
		.range([M.left, M.left + innerW])
		.padding(0.28);

	const yMax = Math.ceil(max(months, (d) => d.count) / 50) * 50; // 290 → 300
	const y = scaleLinear().domain([0, yMax]).range([M.top + innerH, M.top]);

	const ticks = [0, yMax / 2, yMax];
	const baseline = y(0);

	// The polyline that turns the bars into a single epidemic curve.
	const curve = months.map((d) => `${x(d.key) + x.bandwidth() / 2},${y(d.count)}`).join(' ');

	// =====================================================================
	// Steps
	// =====================================================================

	// highlight: 'none' → grey bars | 'peak' → May | 'wave2' → Aug+Sep | 'all'
	const STEPS = [
		{ highlight: 'none' },
		{ highlight: 'peak' },
		{ highlight: 'wave2' },
		{ highlight: 'all', curve: true }
	];

	const step = $derived(STEPS[scrollyIndex ?? 0] ?? STEPS[0]);
	const highlight = $derived(step.highlight);
	const showCurve = $derived(step.curve ?? false);

	function lit(d) {
		// Final step: keep the bars grey and let the green curve carry the eye.
		if (highlight === 'all') return false;
		if (highlight === 'peak') return d.key === peakMonth.key;
		if (highlight === 'wave2') return d.key === '1692-08' || d.key === '1692-09';
		return false;
	}
</script>

<div class="curve">
	<svg viewBox="0 0 {VB_W} {VB_H}" role="img" aria-label="Accusations per month during the Salem witch trials, 1692–1693.">
		<!-- axes -->
		{#each ticks as t (t)}
			<line class="grid" x1={M.left} x2={M.left + innerW} y1={y(t)} y2={y(t)} />
			<text class="ytick" x={M.left - 12} y={y(t)} dy="0.32em" text-anchor="end">{t}</text>
		{/each}
		<text class="axis-title" x={M.left - 46} y={M.top - 14} text-anchor="start"
			>Accusations</text
		>
		<text class="axis-title" x={M.left + innerW / 2} y={VB_H - 16} text-anchor="middle"
			>Month, 1692–1693</text
		>

		<!-- bars -->
		{#each months as d (d.key)}
			<rect
				class="bar"
				class:lit={lit(d)}
				x={x(d.key)}
				y={y(d.count)}
				width={x.bandwidth()}
				height={Math.max(0, baseline - y(d.count))}
				rx="2"
			/>
			<text class="xtick" x={x(d.key) + x.bandwidth() / 2} y={baseline + 22} text-anchor="middle"
				>{label(d)}</text
			>
		{/each}

		<!-- the epidemic curve itself, revealed on the final step -->
		{#if showCurve}
			<polyline class="curve-line" points={curve} />
		{/if}

		<!-- annotations -->
		{#if highlight === 'peak' || highlight === 'all'}
			<text
				class="note"
				x={x(peakMonth.key) + x.bandwidth() / 2}
				y={y(peakMonth.count) - 12}
				text-anchor="middle">{peakMonth.count} in May</text
			>
		{/if}
		{#if highlight === 'wave2'}
			<text class="note" x={x('1692-08') + x.bandwidth() / 2} y={y(174) - 12} text-anchor="middle"
				>174</text
			>
			<text class="note" x={x('1692-09') + x.bandwidth() / 2} y={y(183) - 12} text-anchor="middle"
				>183</text
			>
			<text
				class="note sub"
				x={(x('1692-08') + x('1692-09') + x.bandwidth()) / 2}
				y={M.top + 4}
				text-anchor="middle">second wave</text
			>
		{/if}
	</svg>
</div>

<style>
	.curve {
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
		font-family: var(--vcsi-font-sans);
	}

	.grid {
		stroke: var(--vcsi-border);
		stroke-width: 1px;
		shape-rendering: crispEdges;
	}

	.bar {
		fill: var(--vcsi-gray-400);
		fill-opacity: 0.55;
		transition:
			fill var(--vcsi-transition-slow),
			fill-opacity var(--vcsi-transition-slow);
	}

	.bar.lit {
		fill: var(--vcsi-color-accent);
		fill-opacity: 1;
	}

	.curve-line {
		fill: none;
		stroke: var(--vcsi-color-uvm-green);
		stroke-width: 2.5px;
		stroke-linejoin: round;
		stroke-linecap: round;
	}

	.xtick {
		font-size: 15px;
		fill: var(--vcsi-fg);
		fill-opacity: 0.75;
	}

	.ytick {
		font-size: 14px;
		fill: var(--vcsi-fg);
		fill-opacity: 0.75;
	}

	.axis-title {
		font-size: 15px;
		fill: var(--vcsi-fg);
		fill-opacity: 0.85;
		font-weight: 500;
	}

	.note {
		font-size: 16px;
		font-weight: 600;
		fill: var(--vcsi-color-accent);
	}

	.note.sub {
		font-size: 14px;
		font-weight: 500;
		fill: var(--vcsi-fg);
		fill-opacity: 0.7;
	}
</style>
