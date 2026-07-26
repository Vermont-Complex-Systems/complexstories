<script>
	import { Spring } from 'svelte/motion';

	let {
		value = $bindable(5),
		min = 1,
		max = 9,
		label = 'Happiness',
		interactive = true
	} = $props();

	const CX = 340;
	const CY = 380;
	const R = 240;
	const A_MIN = 162;
	const A_MAX = 18;

	const angleFor = (v) => A_MIN + ((v - min) / (max - min)) * (A_MAX - A_MIN);
	const valueFor = (deg) => min + ((deg - A_MIN) / (A_MAX - A_MIN)) * (max - min);

	const rad = (deg) => (deg * Math.PI) / 180;
	const polar = (r, deg) => [CX + r * Math.cos(rad(deg)), CY - r * Math.sin(rad(deg))];

	const reduced =
		typeof window !== 'undefined' &&
		window.matchMedia('(prefers-reduced-motion: reduce)').matches;

	const needle = new Spring(angleFor(value), {
		stiffness: 0.06,
		damping: 0.28
	});

	$effect(() => {
		needle.set(angleFor(value), { instant: reduced });
	});

	const wobble = (i) => {
		const x = Math.sin(i * 127.1) * 43758.5453;
		return (x - Math.floor(x) - 0.5) * 5;
	};

	const arc = (() => {
		const pts = [];
		for (let i = 0; i <= 12; i++) {
			const [x, y] = polar(R + wobble(i), A_MIN - i * 12);
			pts.push(`${x.toFixed(1)} ${y.toFixed(1)}`);
		}
		return 'M' + pts.join(' L');
	})();

	const sideL = (() => {
		const [x, y] = polar(R, A_MIN);
		return `M${x.toFixed(1)} ${y.toFixed(1)} Q 224 342 ${CX - 1} ${CY - 1}`;
	})();

	const sideR = (() => {
		const [x, y] = polar(R, A_MAX);
		return `M${CX + 1} ${CY - 1} Q 457 340 ${x.toFixed(1)} ${y.toFixed(1)}`;
	})();

	const ticks = $derived(
		Array.from({ length: max - min + 1 }, (_, i) => {
			const v = min + i;
			const deg = angleFor(v);
			const mid = v === (min + max) / 2;
			const [x1, y1] = polar(mid ? R - 42 : R - 30, deg);
			const [x2, y2] = polar(R - 4, deg);
			return { v, x1, y1, x2, y2, mid };
		})
	);

	const faces = $derived(
		[1, 3, 5, 7, 9]
			.filter((v) => v >= min && v <= max)
			.map((v) => {
				const [x, y] = polar(R + 56, angleFor(v));
				return { v, x, y, curve: ((v - 5) / 4) * 18 };
			})
	);

	const nearestFace = $derived(
		faces.reduce((a, b) => (Math.abs(b.v - value) < Math.abs(a.v - value) ? b : a))
	);

	const tip = $derived(polar(R * 0.78, needle.current));
	const barbs = $derived.by(() => {
		const [bx, by] = polar(R * 0.65, needle.current);
		const px = Math.sin(rad(needle.current));
		const py = Math.cos(rad(needle.current));
		return [
			[bx - px * 13, by - py * 13],
			[bx + px * 13, by + py * 13]
		];
	});

	let svgEl = $state();

	function setFromPointer(event) {
		if (!interactive || !svgEl) return;
		const box = svgEl.getBoundingClientRect();
		const scale = 680 / box.width;
		const x = (event.clientX - box.left) * scale - CX;
		const y = CY - (event.clientY - box.top) * scale;
		const deg = (Math.atan2(y, x) * 180) / Math.PI;
		value = Math.min(max, Math.max(min, Math.round(valueFor(deg))));
	}
</script>

<figure class="gauge">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<svg
		bind:this={svgEl}
		viewBox="0 0 680 420"
		role="img"
		aria-label="{label}: {value} out of {max}"
		class:clickable={interactive}
		onclick={setFromPointer}
	>
		<g fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">
			<path d={arc} stroke-width="3.4" />
			<path d={sideL} stroke-width="3.2" />
			<path d={sideR} stroke-width="3.2" />

			{#each ticks as t (t.v)}
				<path
					d="M{t.x1.toFixed(1)} {t.y1.toFixed(1)} L{t.x2.toFixed(1)} {t.y2.toFixed(1)}"
					stroke-width={t.mid ? 2.8 : 2.2}
				/>
			{/each}

			{#each faces as f (f.v)}
				<g class="face" style:opacity={f.v === nearestFace.v ? 1 : 0.32} stroke-width="2.6">
					<ellipse cx={f.x - 11} cy={f.y - 12} rx="3.4" ry="4.6" fill="currentColor" />
					<ellipse cx={f.x + 11} cy={f.y - 12} rx="3.4" ry="4.6" fill="currentColor" />
					<path d="M{f.x - 14} {f.y + 8} Q {f.x} {f.y + 8 + f.curve} {f.x + 14} {f.y + 8}" />
				</g>
			{/each}

			<path d="M{CX} {CY} L{tip[0].toFixed(1)} {tip[1].toFixed(1)}" stroke-width="3.4" />
			<path
				d="M{barbs[0][0].toFixed(1)} {barbs[0][1].toFixed(1)} L{tip[0].toFixed(1)} {tip[1].toFixed(
					1
				)} L{barbs[1][0].toFixed(1)} {barbs[1][1].toFixed(1)}"
				stroke-width="3.2"
			/>
			<circle cx={CX} cy={CY} r="7.5" fill="currentColor" stroke-width="2.5" />
		</g>
	</svg>

	{#if interactive}
		<label class="control">
			<span>{label}</span>
			<input type="range" bind:value {min} {max} step="1" />
			<output>{value}</output>
		</label>
	{/if}
</figure>

<style>
	.gauge {
		margin: 0;
		color: var(--vcsi-fg);
	}
	svg {
		width: 100%;
		height: auto;
		display: block;
	}
	svg.clickable {
		cursor: pointer;
	}
	.face {
		transition: opacity 220ms ease-out;
	}
	.control {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-top: 0.5rem;
		font-family: inherit;
		font-size: 0.9rem;
		color: var(--vcsi-muted);
	}
	.control input {
		flex: 1;
	}
	.control output {
		min-width: 1.25ch;
		color: var(--vcsi-fg);
		font-variant-numeric: tabular-nums;
	}
	@media (prefers-reduced-motion: reduce) {
		.face {
			transition: none;
		}
	}
</style>
