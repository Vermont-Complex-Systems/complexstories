<script>
	/**
	 * Hero — the ousiometric compass as an engraved rose, in three dimensions.
	 *
	 * An ornamental eight-point compass rose lies flat in the x–z (power×danger)
	 * plane: the four long cardinal points are the axes powerful / weak (heroes /
	 * fools) and dangerous / safe (demons / angels); the four short diagonal points
	 * are the archetypes good / aggressive / bad / gentle (paragons / dominators /
	 * wretches / innocents), set 45° off the axes exactly as goodness/aggression
	 * sit 45° off power/danger. A degree bezel rings it. Rising vertically through
	 * the hub is the structure axis — a bevelled mast: structured up
	 * (traditionalists), unstructured down (adventurers).
	 *
	 * The wow: a real 3-D object. The rose orbits toward the cursor, drifts by
	 * itself when idle, labels stay upright and legible. Under prefers-reduced-
	 * motion it is a still three-quarter engraving. One rAF loop, gated by an
	 * IntersectionObserver; SSR-renders as a proper compass.
	 */
	let { size = 500 } = $props();

	const INK = '#3b2f1e';
	const DEG = Math.PI / 180;
	const SCALE = 150;
	const CX = 260;
	const CY = 272;
	const BASE_YAW = -30 * DEG;
	const BASE_PITCH = 24 * DEG;

	// rose geometry (world units; bezel radius = 1)
	const R_BEZEL = 1.0;
	const RING_N = 72;
	const CARD_PT = 0.92; // long cardinal star tip
	const DIAG_PT = 0.6; // short diagonal star tip
	const CARD_W = 0.12; // cardinal half-width
	const DIAG_W = 0.08; // diagonal half-width
	const MAST = 1.0; // structure mast tip
	const MAST_W = 0.085;
	const N_TICK = 24; // a bezel tick every 15°

	const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
	const f1 = (n) => n.toFixed(1);

	// the eight rose points, angle φ measured in the x–z plane from +x toward +z
	const FLOOR = [
		{ phi: 0, label: 'POWERFUL', persona: 'heroes', card: true },
		{ phi: 90, label: 'DANGEROUS', persona: 'demons', card: true },
		{ phi: 180, label: 'WEAK', persona: 'fools', card: true },
		{ phi: 270, label: 'SAFE', persona: 'angels', card: true },
		{ phi: 315, label: 'GOOD', persona: 'paragons', card: false },
		{ phi: 45, label: 'AGGRESSIVE', persona: 'dominators', card: false },
		{ phi: 135, label: 'BAD', persona: 'wretches', card: false },
		{ phi: 225, label: 'GENTLE', persona: 'innocents', card: false }
	];
	// the vertical structure mast
	const VERT = [
		{ dir: [0, 1, 0], label: 'STRUCTURED', persona: 'traditionalists' },
		{ dir: [0, -1, 0], label: 'UNSTRUCTURED', persona: 'adventurers' }
	];
	// faint reference planes (outline only) that survive from the 3-D chart
	const PLANES = [
		{ key: 'xy', c: [[-1, -1, 0], [1, -1, 0], [1, 1, 0], [-1, 1, 0]] },
		{ key: 'yz', c: [[0, -1, -1], [0, 1, -1], [0, 1, 1], [0, -1, 1]] }
	];

	// rotate (yaw about vertical, then pitch) and orthographically project;
	// z is kept as depth for painter-sort and depth-cueing
	function proj(p, yaw, pitch) {
		const c1 = Math.cos(yaw);
		const s1 = Math.sin(yaw);
		const X1 = p[0] * c1 + p[2] * s1;
		const Z1 = -p[0] * s1 + p[2] * c1;
		const c2 = Math.cos(pitch);
		const s2 = Math.sin(pitch);
		const Y2 = p[1] * c2 - Z1 * s2;
		const Z2 = p[1] * s2 + Z1 * c2;
		return { x: CX + SCALE * X1, y: CY - SCALE * Y2, z: Z2 };
	}
	const tri = (a, b, c) => `M${f1(a.x)},${f1(a.y)} L${f1(b.x)},${f1(b.y)} L${f1(c.x)},${f1(c.y)} Z`;
	const depthAlpha = (z) => 0.4 + 0.6 * clamp((z / 1.4 + 1) / 2, 0, 1);

	// one bevelled star point: two triangles split along the centre→tip spine
	function starPoint(u, perp, R, s, yaw, pitch, id, out) {
		const o = proj([0, 0, 0], yaw, pitch);
		const t = proj([u[0] * R, u[1] * R, u[2] * R], yaw, pitch);
		const sl = proj([perp[0] * s, perp[1] * s, perp[2] * s], yaw, pitch);
		const sr = proj([-perp[0] * s, -perp[1] * s, -perp[2] * s], yaw, pitch);
		const depth = (o.z + t.z) / 2;
		const op = depthAlpha(depth);
		out.push({ id: id + 'a', depth, d: tri(o, sl, t), fill: 'rgba(59,47,30,0.09)', stroke: 'rgba(59,47,30,0.5)', sw: 0.6, op });
		out.push({ id: id + 'b', depth, d: tri(o, sr, t), fill: 'rgba(59,47,30,0.82)', stroke: 'rgba(59,47,30,0.5)', sw: 0.6, op });
		return t.z;
	}

	function build(yaw, pitch) {
		const shapes = [];
		const labels = [];
		const o = proj([0, 0, 0], yaw, pitch);

		// faint reference planes
		for (const pl of PLANES) {
			const pts = pl.c.map((cc) => proj(cc, yaw, pitch));
			const depth = pts.reduce((s, p) => s + p.z, 0) / 4;
			shapes.push({
				id: 'pl-' + pl.key,
				depth,
				d: 'M' + pts.map((p) => `${f1(p.x)},${f1(p.y)}`).join('L') + 'Z',
				fill: 'none',
				stroke: 'rgba(59,47,30,0.12)',
				sw: 0.8,
				op: depthAlpha(depth)
			});
		}

		// bezel: outer ring, inner ring, ticks (all in the floor plane)
		const ringPath = (rad) => {
			const pts = [];
			for (let i = 0; i < RING_N; i++) {
				const a = (i / RING_N) * 2 * Math.PI;
				pts.push(proj([rad * Math.cos(a), 0, rad * Math.sin(a)], yaw, pitch));
			}
			return 'M' + pts.map((p) => `${f1(p.x)},${f1(p.y)}`).join('L') + 'Z';
		};
		shapes.push({ id: 'bezel-o', depth: o.z, d: ringPath(R_BEZEL * 1.06), fill: 'none', stroke: 'rgba(59,47,30,0.55)', sw: 0.9, op: 0.85 });
		shapes.push({ id: 'bezel-i', depth: o.z, d: ringPath(R_BEZEL), fill: 'none', stroke: 'rgba(59,47,30,0.7)', sw: 1.3, op: 0.9 });
		for (let k = 0; k < N_TICK; k++) {
			const a = (k / N_TICK) * 2 * Math.PI;
			const dir = [Math.cos(a), 0, Math.sin(a)];
			const major = k % 6 === 0;
			const p1 = proj([dir[0] * R_BEZEL, 0, dir[2] * R_BEZEL], yaw, pitch);
			const p2 = proj([dir[0] * (major ? 1.06 : 1.03), 0, dir[2] * (major ? 1.06 : 1.03)], yaw, pitch);
			shapes.push({ id: 'tk' + k, depth: (p1.z + p2.z) / 2, d: `M${f1(p1.x)},${f1(p1.y)} L${f1(p2.x)},${f1(p2.y)}`, fill: 'none', stroke: 'rgba(59,47,30,0.6)', sw: major ? 1.3 : 0.7, op: 0.85 });
		}

		// the eight-point rose in the floor plane
		for (const pt of FLOOR) {
			const a = pt.phi * DEG;
			const u = [Math.cos(a), 0, Math.sin(a)];
			const perp = [-Math.sin(a), 0, Math.cos(a)];
			const R = pt.card ? CARD_PT : DIAG_PT;
			const w = pt.card ? CARD_W : DIAG_W;
			const tipZ = starPoint(u, perp, R, w, yaw, pitch, 'fl-' + pt.label, shapes);
			const lp = proj([u[0] * (R_BEZEL + 0.2), 0, u[2] * (R_BEZEL + 0.2)], yaw, pitch);
			labels.push({ id: 'lb-' + pt.label, x: lp.x, y: lp.y, main: pt.label, persona: pt.persona, minor: !pt.card, op: Math.max(0.5, depthAlpha(tipZ)) });
		}

		// the vertical structure mast (bevelled, perpendicular to the rose)
		for (const v of VERT) {
			const tipZ = starPoint(v.dir, [1, 0, 0], MAST, MAST_W, yaw, pitch, 'vt-' + v.label, shapes);
			const lp = proj([v.dir[0] * 1.2, v.dir[1] * 1.2, v.dir[2] * 1.2], yaw, pitch);
			labels.push({ id: 'lb-' + v.label, x: lp.x, y: lp.y, main: v.label, persona: v.persona, minor: false, op: Math.max(0.5, depthAlpha(tipZ)) });
		}

		shapes.sort((a, b) => a.depth - b.depth);
		return { shapes, labels, origin: o };
	}

	// ── orientation, live ────────────────────────────────────────────────────
	let heroEl;
	let yaw = $state(BASE_YAW);
	let pitch = $state(BASE_PITCH);
	let scene = $derived.by(() => build(yaw, pitch));

	let tYaw = BASE_YAW;
	let tPitch = BASE_PITCH;
	let lastMove = -1e9;
	let raf = 0;

	$effect(() => {
		if (typeof matchMedia === 'undefined') return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // stays a still engraving
		const fine = matchMedia('(pointer: fine)').matches;

		const loop = (now) => {
			const steering = now - lastMove < 1400;
			if (!steering) tYaw += 0.0018; // gentle auto-orbit when left alone
			yaw += (tYaw - yaw) * 0.09;
			pitch += (tPitch - pitch) * 0.09;
			raf = requestAnimationFrame(loop);
		};
		const onMove = (e) => {
			const r = heroEl.getBoundingClientRect();
			const nx = clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2), -1, 1);
			const ny = clamp((e.clientY - (r.top + r.height / 2)) / (r.height / 2), -1, 1);
			tYaw = BASE_YAW + nx * 0.7;
			tPitch = clamp(BASE_PITCH - ny * 0.4, 0.08, 1.25);
			lastMove = e.timeStamp;
		};
		const activate = () => {
			if (fine) window.addEventListener('pointermove', onMove, { passive: true });
			if (!raf) raf = requestAnimationFrame(loop);
		};
		const deactivate = () => {
			if (fine) window.removeEventListener('pointermove', onMove);
			if (raf) {
				cancelAnimationFrame(raf);
				raf = 0;
			}
		};
		const io = new IntersectionObserver(
			(entries) => {
				for (const en of entries) en.isIntersecting ? activate() : deactivate();
			},
			{ threshold: 0.1 }
		);
		io.observe(heroEl);

		return () => {
			io.disconnect();
			if (fine) window.removeEventListener('pointermove', onMove);
			if (raf) cancelAnimationFrame(raf);
		};
	});
</script>

<div class="hero" bind:this={heroEl} style="--hero-size:{size}px">
	<svg
		viewBox="0 0 520 520"
		role="img"
		aria-label="A three-dimensional ousiometric compass rose: an eight-point star in the power–danger plane (powerful, dangerous, weak, safe, and the archetypes good, aggressive, bad, gentle) with a vertical structure axis from unstructured to structured."
	>
		<defs>
			<radialGradient id="hero-vignette" cx="50%" cy="50%" r="62%">
				<stop offset="55%" stop-color="#3b2f1e" stop-opacity="0" />
				<stop offset="100%" stop-color="#3b2f1e" stop-opacity="0.1" />
			</radialGradient>
			<filter id="hero-grain">
				<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
				<feColorMatrix type="matrix" values="0 0 0 0 0.231  0 0 0 0 0.184  0 0 0 0 0.118  0 0 0 0.6 0" />
			</filter>
		</defs>

		{#each scene.shapes as s (s.id)}
			<path d={s.d} fill={s.fill} stroke={s.stroke} stroke-width={s.sw} opacity={s.op} stroke-linejoin="round" />
		{/each}

		<circle cx={scene.origin.x} cy={scene.origin.y} r="4.5" fill="var(--ousio-paper, #efe6cf)" stroke={INK} stroke-width="1" />
		<circle cx={scene.origin.x} cy={scene.origin.y} r="1.8" fill="var(--ousio-accent, #b3452c)" />

		{#each scene.labels as l (l.id)}
			<text class="lbl" class:minor={l.minor} x={l.x} y={l.y} opacity={l.op}>
				<tspan class="main" x={l.x} dy="-0.1em">{l.main}</tspan>
				<tspan class="persona" x={l.x} dy="1.25em">{l.persona}</tspan>
			</text>
		{/each}

		<circle class="vignette" cx="260" cy="260" r="250" fill="url(#hero-vignette)" />
		<rect class="grain" x="0" y="0" width="520" height="520" filter="url(#hero-grain)" />
	</svg>
</div>

<style>
	.hero {
		width: min(100%, var(--hero-size));
		margin: 0 auto;
		opacity: 0;
		animation: hero-in 1100ms ease-out 120ms forwards;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	/* labels are billboarded: upright and centred on their anchor, never skewed */
	text {
		text-anchor: middle;
		dominant-baseline: middle;
		fill: var(--ousio-ink, #3b2f1e);
		font-family: 'Baskerville', Georgia, 'Times New Roman', serif;
	}

	.lbl .main {
		font-size: 12px;
		font-weight: 600;
		letter-spacing: 0.09em;
	}

	.lbl .persona {
		font-size: 9.5px;
		font-style: italic;
		fill: rgba(59, 47, 30, 0.55);
	}

	/* the archetype diagonals sit a touch quieter than the measured axes */
	.lbl.minor .main {
		font-weight: 500;
		fill: rgba(59, 47, 30, 0.78);
	}

	.vignette,
	.grain {
		pointer-events: none;
	}

	.grain {
		opacity: 0.04;
		mix-blend-mode: multiply;
	}

	@keyframes hero-in {
		to {
			opacity: 1;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.hero {
			animation: none;
			opacity: 1;
		}
	}
</style>
