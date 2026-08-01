<!--
  Galaxy.svelte — 3D scatter of ~20k words in ousiometric meaning space,
  with smooth projection onto any pair of dimensions.

  Data: Dodds' GPADS lexicon (Goodness, Power, Aggression, Danger, Structure).
  DOI 10.5281/zenodo.18509376. Each row is a word with five mean-centred scores.

  We keep three data dimensions (DIM below) and render them through a 3×3
  PROJECTION MATRIX. Each named view is just a target matrix:

    - '3d'          → identity: x=Goodness, y=Power, z=Danger (a rotating cube)
    - 'good-power'  → x=Goodness, y=Power,  z collapsed → the Goodness×Power plane
    - 'power-danger'→ x=Danger,   y=Power,  z collapsed → the Power×Danger plane
    - 'good-danger' → x=Goodness, y=Danger, z collapsed → the Goodness×Danger plane

  The current matrix eases toward the active view's matrix, so switching views
  smoothly *projects* the galaxy onto the chosen plane (the dropped dimension
  shrinks to zero) while the camera rotates to face it. To add a view, add a
  matrix to VIEWS; to change what a step shows, set `view` on that step in
  copy.json.

  Rendering: p5 WEBGL. Points are batched by colour bin into a handful of
  GL_POINTS draw calls so all 20k render smoothly.
-->
<script lang="ts">
	import P5Sketch, { type Sketch } from '@sveltecraft/p5-svelte';
	import type p5 from 'p5';
	import { fade } from 'svelte/transition';
	import gpads from '../data/ousiometry_GPADS.tsv';

	// width/height come from the sticky panel (fullscreen-layout binds both).
	// `view` selects the projection; it's read live inside the draw loop.
	let {
		width = 400,
		height = 400,
		view = '3d'
	}: { width?: number; height?: number; view?: string } = $props();

	// The three data dimensions, in vector order. Swap these to re-slice the
	// cloud (e.g. 'aggression' or 'structure' in place of 'danger').
	const DIM = ['goodness', 'power', 'danger'] as const;
	const BINS = 11;
	const HALF_EXTENT = 0.34; // cube half-extent as a fraction of the panel

	type Mat = number[][]; // 3×3: rows are screen [x, y, z] weights over DIM
	type ViewDef = { M: Mat; mode: '3d' | 'flat' };
	type Row = Record<string, number> & { word: string };
	type Star = { v: [number, number, number]; bin: number };

	// Named projections. Each row weights the DIM vector onto a screen axis;
	// a zero z-row collapses depth, flattening the cloud onto that plane.
	const VIEWS: Record<string, ViewDef> = {
		'3d': { M: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], mode: '3d' },
		'good-power': { M: [[1, 0, 0], [0, 1, 0], [0, 0, 0]], mode: 'flat' },
		'power-danger': { M: [[0, 0, 1], [0, 1, 0], [0, 0, 0]], mode: 'flat' },
		'good-danger': { M: [[1, 0, 0], [0, 0, 1], [0, 0, 0]], mode: 'flat' },
		// Ousiometry ↔ VAD: Valence ≈ Goodness, Dominance ≈ Power.
		// x = Dominance (power), y = Valence (goodness).
		'dominance-valence': { M: [[0, 1, 0], [1, 0, 0], [0, 0, 0]], mode: 'flat' }
	};

	const VIEW_META: Record<string, { label: string; sub: string }> = {
		'3d': { label: 'Goodness · Power · Danger', sub: '3D — drag to rotate' },
		'good-power': { label: 'Goodness × Power', sub: 'projection' },
		'power-danger': { label: 'Danger × Power', sub: 'projection' },
		'good-danger': { label: 'Goodness × Danger', sub: 'projection' },
		'dominance-valence': { label: 'Dominance × Valence', sub: 'projection' }
	};
	let meta = $derived(VIEW_META[view] ?? VIEW_META['3d']);

	// Axis names for the flat (2D) views, drawn as a labelled plot frame.
	const VIEW_AXES: Record<string, { x: string; y: string }> = {
		'good-power': { x: 'Goodness', y: 'Power' },
		'power-danger': { x: 'Danger', y: 'Power' },
		'good-danger': { x: 'Goodness', y: 'Danger' },
		'dominance-valence': { x: 'Dominance', y: 'Valence' }
	};
	let flatAxes = $derived(VIEW_AXES[view] ?? null); // non-null ⇒ show 2D plot frame

	// Plot geometry, matched to the WEBGL scene (p5's default camera maps model
	// units ≈ pixels at the z=0 plane, and flat views settle face-on).
	let cx = $derived(width / 2);
	let cy = $derived(height / 2);
	let R = $derived(Math.min(width, height) * HALF_EXTENT);

	// Colours for the three data axes (also used by the axis lines).
	const AXIS_HEX = ['#e0a33a', '#3ac0b0', '#a06cf0']; // goodness, power, danger

	// --- Precompute once (plain JS, no p5 needed) ---
	// One symmetric scale keeps the three axes comparable — a true metric cube.
	let maxAbs = 0;
	let gMax = 0;
	for (const r of gpads as Row[]) {
		for (const k of DIM) maxAbs = Math.max(maxAbs, Math.abs(r[k]));
		gMax = Math.max(gMax, Math.abs(r.goodness));
	}
	maxAbs ||= 1;
	gMax ||= 1;

	const stars: Star[] = (gpads as Row[]).map((r) => {
		const t = Math.min(1, Math.max(0, (r.goodness / gMax + 1) / 2)); // 0 = bad, 1 = good
		return {
			v: [r[DIM[0]] / maxAbs, r[DIM[1]] / maxAbs, r[DIM[2]] / maxAbs],
			bin: Math.min(BINS - 1, Math.floor(t * BINS))
		};
	});

	// Group stars by colour bin so each bin is one WEBGL draw call.
	const binGroups: Star[][] = Array.from({ length: BINS }, () => []);
	for (const s of stars) binGroups[s.bin].push(s);

	// --- Transition helpers ---
	const TAU = Math.PI * 2;
	const EASE = 0.08; // per-frame approach toward the active view
	const FLAT_EASE = 0.34; // fast snap into a 2D view (flatten + face-on)
	const SPIN = 0.005; // idle yaw speed in 3D
	const TILT = 0.32; // resting pitch in 3D
	const DRAG = 0.01; // mouse-drag sensitivity

	// Ease toward a target, but snap (and stop) once within eps — so a settled
	// 2D view comes fully to rest instead of drifting forever.
	const approach = (a: number, b: number, f: number, eps = 0.0005) =>
		Math.abs(b - a) <= eps ? b : a + (b - a) * f;

	const sketch: Sketch = (p) => {
		let palette: p5.Color[] = [];
		let M: Mat = VIEWS['3d'].M.map((row) => [...row]); // current (eased) matrix
		let yaw = 0;
		let pitch = TILT;
		let userYaw = 0;
		let userPitch = 0;

		p.setup = () => {
			p.createCanvas(Math.max(1, width), Math.max(1, height), p.WEBGL);

			// Diverging goodness ramp: red (bad) → pale → blue (good).
			const cBad = p.color(233, 78, 78);
			const cMid = p.color(224, 224, 232);
			const cGood = p.color(70, 150, 245);
			palette = Array.from({ length: BINS }, (_, i) => {
				const t = i / (BINS - 1);
				return t < 0.5 ? p.lerpColor(cBad, cMid, t * 2) : p.lerpColor(cMid, cGood, (t - 0.5) * 2);
			});
		};

		p.draw = () => {
			if (p.width !== width || p.height !== height) {
				p.resizeCanvas(Math.max(1, width), Math.max(1, height));
			}

			const target = VIEWS[view] ?? VIEWS['3d'];

			// Ease the projection matrix toward the active view — the actual
			// "projection". Snap into a 2D view fast; expand back to 3D gently.
			const mf = target.mode === 'flat' ? FLAT_EASE : EASE;
			for (let i = 0; i < 3; i++) {
				for (let j = 0; j < 3; j++) M[i][j] = approach(M[i][j], target.M[i][j], mf);
			}

			// Orientation. In 3D: idle spin + resting tilt, plus drag. In a flat
			// view: settle once to a face-on angle, then STOP — a 2D view doesn't
			// rotate anymore (no spin, no drag, and it comes to a hard rest).
			const dragging =
				p.mouseIsPressed && p.mouseX >= 0 && p.mouseX <= width && p.mouseY >= 0 && p.mouseY <= height;

			if (target.mode === '3d') {
				if (!dragging) yaw += SPIN;
				pitch = approach(pitch, TILT, EASE);
				if (dragging) {
					userYaw += (p.mouseX - p.pmouseX) * DRAG;
					userPitch = p.constrain(userPitch + (p.mouseY - p.pmouseY) * DRAG, -1, 1);
				}
			} else {
				yaw = approach(yaw, Math.round(yaw / TAU) * TAU, FLAT_EASE); // finish turn, face front
				pitch = approach(pitch, 0, FLAT_EASE);
				userYaw = approach(userYaw, 0, FLAT_EASE);
				userPitch = approach(userPitch, 0, FLAT_EASE);
			}

			p.background(20, 20, 28);
			p.rotateX(pitch + userPitch);
			p.rotateY(yaw + userYaw);

			const R = Math.min(width, height) * HALF_EXTENT; // half-extent of the cube

			drawAxes(p, M, R);

			// The galaxy: each colour bin drawn as one batch of GL points, each
			// point projected through the current matrix.
			p.strokeWeight(Math.max(2, R * 0.007));
			for (let b = 0; b < BINS; b++) {
				const grp = binGroups[b];
				if (!grp.length) continue;
				p.stroke(palette[b]);
				p.beginShape(p.POINTS);
				for (const s of grp) {
					const [a, c, d] = s.v;
					const px = (M[0][0] * a + M[0][1] * c + M[0][2] * d) * R;
					const py = (M[1][0] * a + M[1][1] * c + M[1][2] * d) * R;
					const pz = (M[2][0] * a + M[2][1] * c + M[2][2] * d) * R;
					p.vertex(px, -py, pz); // screen y is up
				}
				p.endShape();
			}
		};
	};

	// Draw the three data axes through the SAME projection, so a collapsed
	// dimension's axis shrinks to a point as the cloud flattens.
	function drawAxes(p: p5, M: Mat, R: number) {
		const len = R * 1.15;
		p.strokeWeight(1.5);
		for (let k = 0; k < 3; k++) {
			const ex = M[0][k] * len;
			const ey = M[1][k] * len;
			const ez = M[2][k] * len;
			const c = AXIS_HEX[k];
			p.stroke(c);
			p.line(-ex, ey, -ez, ex, -ey, ez);
		}
	}
</script>

<div class="galaxy">
	<P5Sketch {sketch} />

	<!-- Labelled 2D-plot frame, shown only in a flat (projected) view and
	     aligned to the WEBGL scene: the cube half-extent R around the centre. -->
	{#if flatAxes && width > 0 && height > 0}
		<svg
			class="frame"
			viewBox="0 0 {width} {height}"
			width={width}
			height={height}
			transition:fade={{ duration: 160 }}
			aria-hidden="true"
		>
			<rect class="box" x={cx - R} y={cy - R} width={2 * R} height={2 * R} />
			<text class="axis-label" x={cx} y={cy + R + 26} text-anchor="middle">{flatAxes.x}</text>
			<text
				class="axis-label"
				x={cx - R - 22}
				y={cy}
				text-anchor="middle"
				transform="rotate(-90 {cx - R - 22} {cy})">{flatAxes.y}</text
			>
		</svg>
	{/if}

	<div class="legend" aria-hidden="true">
		<div class="view-label">
			<strong>{meta.label}</strong>
			<span>{meta.sub}</span>
		</div>
		<ul class="axes">
			<li><span class="swatch" style="background:{AXIS_HEX[0]}"></span>Goodness</li>
			<li><span class="swatch" style="background:{AXIS_HEX[1]}"></span>Power</li>
			<li><span class="swatch" style="background:{AXIS_HEX[2]}"></span>Danger</li>
		</ul>
		<div class="ramp">
			<span>bad</span>
			<span class="bar"></span>
			<span>good</span>
		</div>
	</div>
</div>

<style>
	.galaxy {
		position: relative;
		width: 100%;
		height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.galaxy :global(canvas) {
		display: block;
		max-width: 100%;
		height: auto;
	}

	/* 2D-plot frame overlay (flat views only) */
	.frame {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.frame .box {
		fill: none;
		stroke: rgba(255, 255, 255, 0.16);
		stroke-width: 1;
	}

	.frame .axis-label {
		fill: #e6e6ea;
		font-family: var(--vcsi-font-sans);
		font-size: 14px;
		letter-spacing: 0.03em;
	}

	.legend {
		position: absolute;
		top: var(--vcsi-space-md);
		left: var(--vcsi-space-md);
		padding: var(--vcsi-space-sm) var(--vcsi-space-md);
		font-family: var(--vcsi-font-sans);
		font-size: var(--vcsi-font-size-small);
		color: #f2f2f2;
		background: rgba(20, 20, 28, 0.55);
		border: 1px solid rgba(255, 255, 255, 0.12);
		border-radius: var(--vcsi-radius-md);
		pointer-events: none;
	}

	.view-label {
		display: flex;
		flex-direction: column;
		margin-bottom: 0.6rem;
	}

	.view-label strong {
		font-weight: var(--vcsi-font-weight-medium);
	}

	.view-label span {
		font-size: 0.72rem;
		color: var(--vcsi-muted, #b8b8c0);
	}

	.axes {
		margin: 0 0 0.6rem 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}

	.axes li {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.swatch {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: var(--vcsi-radius-full);
	}

	.ramp {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.72rem;
		color: #cfcfd6;
	}

	.ramp .bar {
		width: 3.5rem;
		height: 0.45rem;
		border-radius: var(--vcsi-radius-full);
		background: linear-gradient(90deg, #e94e4e, #e0e0e8, #4696f5);
	}
</style>
