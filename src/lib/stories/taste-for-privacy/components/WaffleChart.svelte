<script>
	import settings from '../data/privacy_settings_aggregated.csv';

	// Hand-rolled waffle (no svelteplot — its WaffleX produced NaN geometry
	// with this data and crashed hydration). Four 10×10 grids, one per
	// platform-count bin, each normalized to 100 squares (1 square = 1%).
	const SETTINGS = ['private', 'mixed', 'public'];
	const COLORS = { private: '#69b578', mixed: '#f2cc60', public: '#e5737d' };

	const BIN_ORDER = ['0 platforms', '1 platform', '2 platforms', '3+ platforms'];
	const byBin = {};
	for (const d of settings) {
		const n = +d.platform_count;
		const bin = n >= 3 ? '3+ platforms' : `${n} platform${n === 1 ? '' : 's'}`;
		byBin[bin] ??= { private: 0, mixed: 0, public: 0 };
		byBin[bin][d.privacy_setting] += +d.respondents;
	}

	// Largest-remainder rounding: integer percentages summing to exactly 100
	function toPercents(counts) {
		const total = SETTINGS.reduce((sum, s) => sum + counts[s], 0);
		const exact = SETTINGS.map((s) => (counts[s] / total) * 100);
		const pct = exact.map(Math.floor);
		const leftover = 100 - pct.reduce((a, b) => a + b, 0);
		[...exact.keys()]
			.sort((a, b) => (exact[b] - pct[b]) - (exact[a] - pct[a]))
			.slice(0, leftover)
			.forEach((i) => pct[i]++);
		return pct;
	}

	// One flat array of 100 cell colors per bin, filled in SETTINGS order
	const bins = BIN_ORDER.map((label) => {
		const pct = toPercents(byBin[label]);
		const cells = SETTINGS.flatMap((s, i) => Array(pct[i]).fill(COLORS[s]));
		return { label, pct, cells };
	});

	const COLS = 10;
	const CELL = 16;
	const GAP = 2;
	const SIDE = COLS * CELL - GAP;
</script>

<div class="waffle-chart">
	<div class="grids">
		{#each bins as bin}
			<figure>
				<svg viewBox="0 0 {SIDE} {SIDE}" width={SIDE} height={SIDE} style="max-width: 100%; height: auto;">
					{#each bin.cells as color, i}
						<rect
							x={(i % COLS) * CELL}
							y={(COLS - 1 - Math.floor(i / COLS)) * CELL}
							width={CELL - GAP}
							height={CELL - GAP}
							rx="2"
							fill={color}
						/>
					{/each}
				</svg>
				<figcaption>{bin.label}<br /><span class="pct">{bin.pct[0]}% private</span></figcaption>
			</figure>
		{/each}
	</div>
	<div class="legend">
		{#each SETTINGS as s}
			<span class="legend-item"><span class="swatch" style="background: {COLORS[s]};"></span>{s}</span>
		{/each}
		<span class="note">1 square = 1% of respondents in that group</span>
	</div>
	<p class="clarify">
		“0 platforms” (92 respondents) means using none of the listed platforms — Twitter, Instagram,
		Facebook, TikTok, or other — while still having social media profiles with settings to report.
	</p>
</div>

<style>
	.waffle-chart {
		margin: 2rem 0;
	}

	.grids {
		display: flex;
		flex-wrap: wrap;
		gap: var(--vcsi-space-lg);
		justify-content: center;
	}

	figure {
		margin: 0;
		text-align: center;
	}

	figcaption {
		margin-top: var(--vcsi-space-sm);
		font-family: var(--vcsi-font-sans);
		font-size: var(--vcsi-font-size-xs);
	}

	.pct {
		color: var(--vcsi-muted);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--vcsi-space-md);
		justify-content: center;
		align-items: center;
		margin-top: var(--vcsi-space-md);
		font-family: var(--vcsi-font-sans);
		font-size: var(--vcsi-font-size-xs);
	}

	.legend-item {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
	}

	.swatch {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 2px;
	}

	.note {
		color: var(--vcsi-muted);
	}

	.clarify {
		margin: var(--vcsi-space-sm) auto 0 auto;
		max-width: 34rem;
		text-align: center;
		font-family: var(--vcsi-font-sans);
		font-size: var(--vcsi-font-size-xs);
		color: var(--vcsi-muted);
	}
</style>
