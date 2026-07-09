<script lang="ts">
	import * as d3 from 'd3';
	import { Tween } from 'svelte/motion';
	import { cubicInOut, cubicOut } from 'svelte/easing';

	let { scrollyIndex = 0 }: { scrollyIndex?: number } = $props();

	const W = 400;
	const H = 300;

	// Box front face: top-left at (FX, FY), width FW, height FH
	const FX = 110, FY = 140, FW = 140, FH = 110;
	// Isometric depth offsets (right face, lid parallax)
	const DX = 45, DY = 30;

	// 8 category colors (one per author-size bucket × journal column)
	const COLORS = [
		'#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
		'#59a14f', '#edc948', '#b07aa1', '#ff9da7'
	];

	// Final grid colors: 4 accepted (green), rest gray — ~6% acceptance rate
	const GREEN = '#2ca02c';
	const GRAY = '#bbbbbb';
	const GREEN_INDICES = new Set([5, 18, 37, 52]);

	const RW = 26, RH = 16, GAP = 4;
	const COLS = 8, ROWS = 8, N = 64;

	// 8×8 grid centered in viewbox
	const gridW = COLS * RW + (COLS - 1) * GAP;
	const gridH = ROWS * RH + (ROWS - 1) * GAP;
	const gridX0 = (W - gridW) / 2;
	const gridY0 = (H - gridH) / 2;

	function gridPos(i: number): [number, number] {
		return [
			gridX0 + (i % COLS) * (RW + GAP),
			gridY0 + Math.floor(i / COLS) * (RH + GAP)
		];
	}

	// Deterministic pseudo-random in [0, 1) seeded by index + salt
	function sr(i: number, salt: number): number {
		const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
		return x - Math.floor(x);
	}

	// Starting position: clustered near the top opening of the box
	function insidePos(i: number): [number, number] {
		return [
			FX + FW / 2 - RW / 2 + (sr(i, 3) - 0.5) * 30,
			FY - RH / 2 + (sr(i, 4) - 0.5) * 20
		];
	}

	// Scatter position: random across the canvas
	function scatterPos(i: number): [number, number] {
		return [20 + sr(i, 0) * (W - 60), 10 + sr(i, 1) * (H - 30)];
	}

	// Tweens
	const lidT = Tween.of(() => (scrollyIndex >= 1 ? 1 : 0), { duration: 700, easing: cubicInOut });
	const scatterT = Tween.of(() => (scrollyIndex >= 1 ? 1 : 0), { duration: 1400, easing: cubicOut });
	const gridT = Tween.of(() => (scrollyIndex >= 2 ? 1 : 0), { duration: 1000, easing: cubicInOut });
	const boxOpacT = Tween.of(() => (scrollyIndex >= 2 ? 0 : 1), { duration: 700, easing: cubicInOut });
	// Color transition: original colors → green (accepted) / gray (rejected) as grid settles
	const colorT = Tween.of(() => (scrollyIndex >= 2 ? 1 : 0), { duration: 600, easing: cubicInOut });

	// Lid front edge tweens upward (y decreases) and shifts right as it pivots open
	const lidFrontY = $derived(FY - lidT.current * 60);
	const lidFrontXOff = $derived(DX * lidT.current);

	// Per-rect stagger: rect i starts moving after a fraction of the total progress
	function staggerP(i: number, progress: number, span = 0.5): number {
		const delay = (i / N) * span;
		return Math.max(0, Math.min(1, (progress - delay) / (1 - span)));
	}

	// Per-rect positions, opacity, and color — fully derived
	const rects = $derived.by(() => {
		const st = scatterT.current;
		const gt = gridT.current;
		const ct = colorT.current;
		return Array.from({ length: N }, (_, i) => {
			const sp = staggerP(i, st);
			const gp = staggerP(i, gt);
			const [ix, iy] = insidePos(i);
			const [sx, sy] = scatterPos(i);
			const [gx, gy] = gridPos(i);

			let x: number, y: number;
			if (gp > 0) {
				x = sx + (gx - sx) * gp;
				y = sy + (gy - sy) * gp;
			} else {
				x = ix + (sx - ix) * sp;
				y = iy + (sy - iy) * sp;
			}

			const baseColor = COLORS[i % COLORS.length];
			const targetColor = GREEN_INDICES.has(i) ? GREEN : GRAY;
			const color = d3.interpolateRgb(baseColor, targetColor)(ct);

			return { x, y, color, opacity: Math.min(sp * 3, 1) };
		});
	});
</script>

<div class="blackbox-wrap">
	<svg viewBox="0 0 {W} {H}">
		<!-- Box body (fades out on step 3) -->
		<g opacity={boxOpacT.current}>
			<!-- Right (depth) face — slightly darker for contrast -->
			<polygon
				points="{FX + FW},{FY} {FX + FW + DX},{FY - DY} {FX + FW + DX},{FY - DY + FH} {FX + FW},{FY + FH}"
				fill="#141414"
				stroke="#3a3a3a"
				stroke-width="1.5"
			/>
			<!-- Front face -->
			<rect x={FX} y={FY} width={FW} height={FH} fill="#1e1e1e" stroke="#3a3a3a" stroke-width="1.5" />
			<!-- Interior top — revealed as lid lifts -->
			<polygon
				points="{FX},{FY} {FX + FW},{FY} {FX + FW + DX},{FY - DY} {FX + DX},{FY - DY}"
				fill="#0a0a0a"
				opacity={lidT.current}
			/>
		</g>

		<!-- Papers: rendered above box body so they appear to burst out -->
		{#each rects as r, i (i)}
			<rect x={r.x} y={r.y} width={RW} height={RH} fill={r.color} opacity={r.opacity} rx="2" />
		{/each}

		<!-- Lid: rendered last so it occludes rects still inside the box -->
		<g opacity={boxOpacT.current}>
			<polygon
				points="{FX + lidFrontXOff},{lidFrontY} {FX + FW + lidFrontXOff},{lidFrontY} {FX + FW + DX},{FY - DY} {FX + DX},{FY - DY}"
				fill="#252525"
				stroke="#3a3a3a"
				stroke-width="1.5"
			/>
		</g>
	</svg>
</div>

<style>
	.blackbox-wrap {
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	svg {
		width: 100%;
		height: 100%;
		max-height: 100%;
		max-width: 100%;
	}
</style>
