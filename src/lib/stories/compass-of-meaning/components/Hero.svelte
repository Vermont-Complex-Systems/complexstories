<script>
	/**
	 * Hero — an engraved compass of essential meaning, and a living one.
	 *
	 * A cartographer's rose in sepia on aged paper: the two axes of meaning as
	 * cardinal poles (GOOD / BAD up–down, POWERFUL / WEAK across), an eight-point
	 * star, a degree bezel, and a faint field of words scattered like islands —
	 * the four from the opening (storm, wolf, surgery, conquer) inked darker.
	 *
	 * The wow is that it behaves like a real compass. A magnetised needle chases
	 * the cursor with spring physics; the whole rose tilts in 3D toward the
	 * pointer like an object you're leaning over; the pole it swings toward lights
	 * up. On touch (no cursor) the needle sways gently on its own. Under
	 * prefers-reduced-motion it is exactly the static engraving — no needle
	 * motion, no tilt. One rAF loop, gated by an IntersectionObserver so it only
	 * runs while the hero is on screen.
	 *
	 * The frame itself never rotates: the SVD turn (the story's payoff) is still
	 * left for the scroll to earn — the needle points, the map holds still.
	 */
	let { size = 460 } = $props();

	const C = 220; // svg centre in a 440×440 box
	const rad = (deg) => (deg * Math.PI) / 180;
	// polar → cartesian, angle measured from north (up), clockwise
	const at = (a, r) => [C + r * Math.sin(rad(a)), C - r * Math.cos(rad(a))];
	const fmt = (p) => p.map((n) => n.toFixed(1)).join(',');
	const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

	// eight-point rose: four long cardinal points, four short intercardinal ones.
	// each point is split along its centre→tip spine into a light and a dark
	// half, the old engraver's trick for a bevelled, three-dimensional star.
	const POINTS = [
		{ a: 0, R: 138, s: 16, north: true },
		{ a: 90, R: 138, s: 16 },
		{ a: 180, R: 138, s: 16 },
		{ a: 270, R: 138, s: 16 },
		{ a: 45, R: 96, s: 11 },
		{ a: 135, R: 96, s: 11 },
		{ a: 225, R: 96, s: 11 },
		{ a: 315, R: 96, s: 11 }
	].map((p) => {
		const tip = at(p.a, p.R);
		const sL = at(p.a - 90, p.s);
		const sR = at(p.a + 90, p.s);
		return {
			...p,
			light: `M${fmt([C, C])} L${fmt(sL)} L${fmt(tip)} Z`,
			dark: `M${fmt([C, C])} L${fmt(sR)} L${fmt(tip)} Z`
		};
	});

	// degree bezel: a tick every 5°, longer on the eighths
	const TICKS = Array.from({ length: 72 }, (_, i) => {
		const a = i * 5;
		const major = a % 45 === 0;
		const [x1, y1] = at(a, 150);
		const [x2, y2] = at(a, major ? 138 : 145);
		return { x1, y1, x2, y2, major };
	});

	// faint crosslines through the hub, out to the ring
	const HAIRS = [0, 45, 90, 135].map((a) => {
		const [x1, y1] = at(a, 150);
		const [x2, y2] = at(a + 180, 150);
		return { x1, y1, x2, y2 };
	});

	const CARDINALS = [
		{ a: 0, label: 'GOOD' },
		{ a: 90, label: 'POWERFUL' },
		{ a: 180, label: 'BAD' },
		{ a: 270, label: 'WEAK' }
	].map((c) => {
		const [x, y] = at(c.a, 176);
		return { ...c, x, y };
	});

	// the field: words scattered like islands. the four hook words from the
	// opening carry a little more ink; the rest are almost weather-worn.
	const HOOKS = new Set(['storm', 'wolf', 'surgery', 'conquer']);
	const WORDS = [
		{ w: 'mother', a: -26, r: 118 },
		{ w: 'honey', a: -6, r: 150 },
		{ w: 'dawn', a: 20, r: 121 },
		{ w: 'mercy', a: 34, r: 151 },
		{ w: 'harvest', a: -52, r: 150 },
		{ w: 'conquer', a: 66, r: 116 },
		{ w: 'triumph', a: 80, r: 152 },
		{ w: 'throne', a: 106, r: 121 },
		{ w: 'ruin', a: 126, r: 151 },
		{ w: 'storm', a: 150, r: 116 },
		{ w: 'venom', a: 168, r: 151 },
		{ w: 'plague', a: 198, r: 121 },
		{ w: 'wolf', a: 214, r: 116 },
		{ w: 'whisper', a: 250, r: 120 },
		{ w: 'feeble', a: 288, r: 120 },
		{ w: 'surgery', a: 322, r: 116 }
	].map((d) => {
		const [x, y] = at(d.a, d.r);
		return { ...d, x, y, hook: HOOKS.has(d.w) };
	});

	// ── the living part ────────────────────────────────────────────────────
	let heroEl;
	let needleAngle = $state(0); // degrees clockwise from north
	let tiltX = $state(0);
	let tiltY = $state(0);
	let engaged = $state(false); // a real cursor is steering it

	// non-reactive spring/loop bookkeeping
	let target = 0;
	let vel = 0;
	let raf = 0;
	let running = false;
	let idle = false;

	const STIFF = 0.09; // spring pull toward target
	const DAMP = 0.8; // < 1 → a lively overshoot before it settles
	const MAX_TILT = 8; // degrees
	const IDLE_AMP = 13; // touch-only autonomous sway

	const shortestDelta = (a, b) => {
		let d = (b - a) % 360;
		if (d > 180) d -= 360;
		if (d < -180) d += 360;
		return d;
	};

	const nearestCardinal = (ang) => {
		const a = ((ang % 360) + 360) % 360;
		return ['GOOD', 'POWERFUL', 'BAD', 'WEAK'][Math.round(a / 90) % 4];
	};

	// the pole the needle currently favours (only while a cursor is steering)
	let activeLabel = $derived(engaged ? nearestCardinal(needleAngle) : null);

	$effect(() => {
		if (typeof matchMedia === 'undefined') return;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; // stays a still engraving
		const fine = matchMedia('(pointer: fine)').matches;

		const loop = (now) => {
			if (idle) target = IDLE_AMP * Math.sin(now / 1500);
			const diff = shortestDelta(needleAngle, target);
			vel = vel * DAMP + diff * STIFF;
			needleAngle += vel;
			if (needleAngle > 180) needleAngle -= 360;
			else if (needleAngle < -180) needleAngle += 360;
			// stop once settled (idle mode keeps looping for its sway)
			if (!idle && Math.abs(vel) < 0.02 && Math.abs(diff) < 0.05) {
				needleAngle = target;
				running = false;
				return;
			}
			raf = requestAnimationFrame(loop);
		};
		const ensureRunning = () => {
			if (!running) {
				running = true;
				raf = requestAnimationFrame(loop);
			}
		};

		const onMove = (e) => {
			const r = heroEl.getBoundingClientRect();
			const cx = r.left + r.width / 2;
			const cy = r.top + r.height / 2;
			const dx = e.clientX - cx;
			const dy = e.clientY - cy;
			target = (Math.atan2(dx, -dy) * 180) / Math.PI; // point the needle at the cursor
			tiltY = clamp(dx / (r.width * 0.9), -1, 1) * MAX_TILT; // lean the rose toward it
			tiltX = -clamp(dy / (r.height * 0.9), -1, 1) * MAX_TILT;
			engaged = true;
			ensureRunning();
		};

		const activate = () => {
			if (fine) window.addEventListener('pointermove', onMove, { passive: true });
			else idle = true;
			ensureRunning();
		};
		const deactivate = () => {
			if (fine) window.removeEventListener('pointermove', onMove);
			idle = false;
			engaged = false;
			target = 0; // ease home to north (GOOD)
			tiltX = 0;
			tiltY = 0;
			ensureRunning();
		};

		const io = new IntersectionObserver(
			(entries) => {
				for (const en of entries) en.isIntersecting ? activate() : deactivate();
			},
			{ threshold: 0.15 }
		);
		io.observe(heroEl);

		return () => {
			io.disconnect();
			if (fine) window.removeEventListener('pointermove', onMove);
			if (raf) cancelAnimationFrame(raf);
			running = false;
		};
	});
</script>

<div class="hero" bind:this={heroEl} style="--hero-size:{size}px">
	<div class="rose" style="transform: rotateX({tiltX}deg) rotateY({tiltY}deg);">
		<svg
			viewBox="0 0 440 440"
			role="img"
			aria-label="A compass of essential meaning — its poles marked good and bad, powerful and weak — with words scattered around it like islands."
		>
			<defs>
				<radialGradient id="hero-vignette" cx="50%" cy="50%" r="62%">
					<stop offset="52%" stop-color="#3b2f1e" stop-opacity="0" />
					<stop offset="100%" stop-color="#3b2f1e" stop-opacity="0.11" />
				</radialGradient>
				<filter id="hero-grain">
					<feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" />
					<feColorMatrix
						type="matrix"
						values="0 0 0 0 0.231  0 0 0 0 0.184  0 0 0 0 0.118  0 0 0 0.6 0"
					/>
				</filter>
			</defs>

			<!-- crosslines -->
			<g class="hair">
				{#each HAIRS as h, i (i)}
					<line x1={h.x1} y1={h.y1} x2={h.x2} y2={h.y2} />
				{/each}
			</g>

			<!-- bezel -->
			<circle class="ring outer" cx={C} cy={C} r="158" />
			<circle class="ring" cx={C} cy={C} r="150" />
			{#each TICKS as t, i (i)}
				<line class="tick" class:major={t.major} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} />
			{/each}

			<!-- the field of words, beneath the star -->
			{#each WORDS as d (d.w)}
				<text class="word" class:hook={d.hook} x={d.x} y={d.y} font-size={d.hook ? 13 : 11}>{d.w}</text>
			{/each}

			<!-- the rose -->
			{#each POINTS as p (p.a)}
				<path class="pt-light" d={p.light} />
				<path class="pt-dark" class:north={p.north} d={p.dark} />
			{/each}

			<!-- the magnetised needle, capped by the hub -->
			<g class="needle" transform="rotate({needleAngle} {C} {C})">
				<polygon class="needle-n" points="{C},{C - 124} {C - 4.5},{C} {C + 4.5},{C}" />
				<polygon class="needle-s" points="{C},{C + 82} {C - 4},{C} {C + 4},{C}" />
			</g>
			<circle class="hub" cx={C} cy={C} r="5.5" />
			<circle class="hub-dot" cx={C} cy={C} r="1.6" />

			<!-- pole labels -->
			{#each CARDINALS as c (c.label)}
				<text class="pole" class:active={c.label === activeLabel} x={c.x} y={c.y}>{c.label}</text>
			{/each}

			<!-- aged-page overlays -->
			<circle class="vignette" cx={C} cy={C} r="210" fill="url(#hero-vignette)" />
			<rect class="grain" x="0" y="0" width="440" height="440" filter="url(#hero-grain)" />
		</svg>
	</div>
</div>

<style>
	.hero {
		width: min(100%, var(--hero-size));
		margin: 0 auto;
		perspective: 1000px;
		opacity: 0;
		animation: hero-in 1100ms ease-out 120ms forwards;
	}

	/* the tiltable disc */
	.rose {
		transform-style: preserve-3d;
		transition: transform 180ms ease-out;
		will-change: transform;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
		overflow: visible;
	}

	/* every label centres on its anchor point */
	text {
		text-anchor: middle;
		dominant-baseline: middle;
		fill: var(--ousio-ink, #3b2f1e);
		font-family: 'Baskerville', Georgia, 'Times New Roman', serif;
	}

	.ring {
		fill: none;
		stroke: #3b2f1e;
		stroke-width: 1;
		opacity: 0.72;
	}

	.ring.outer {
		stroke-width: 1.6;
		opacity: 0.85;
	}

	.tick {
		stroke: #3b2f1e;
		stroke-width: 0.8;
		opacity: 0.5;
	}

	.tick.major {
		stroke-width: 1.5;
		opacity: 0.82;
	}

	.hair line {
		stroke: #3b2f1e;
		stroke-width: 0.8;
		opacity: 0.13;
	}

	/* the bevelled star: a near-transparent lit half, a solid shadow half */
	.pt-light {
		fill: rgba(59, 47, 30, 0.09);
		stroke: #3b2f1e;
		stroke-width: 0.6;
		stroke-opacity: 0.5;
	}

	.pt-dark {
		fill: #3b2f1e;
		fill-opacity: 0.82;
		stroke: #3b2f1e;
		stroke-width: 0.6;
		stroke-opacity: 0.5;
	}

	/* north (GOOD) catches the story's one warm accent */
	.pt-dark.north {
		fill: var(--ousio-accent, #b3452c);
		fill-opacity: 0.9;
	}

	.needle-n {
		fill: var(--ousio-accent, #b3452c);
		stroke: #3b2f1e;
		stroke-width: 0.5;
		stroke-opacity: 0.55;
	}

	.needle-s {
		fill: #3b2f1e;
		fill-opacity: 0.8;
		stroke: #3b2f1e;
		stroke-width: 0.5;
		stroke-opacity: 0.55;
	}

	.hub {
		fill: #3b2f1e;
	}

	.hub-dot {
		fill: var(--ousio-paper, #efe6cf);
	}

	.pole {
		font-size: 13px;
		font-weight: 600;
		letter-spacing: 0.18em;
		opacity: 0.92;
		transition: fill 220ms ease, opacity 220ms ease;
	}

	/* the pole the needle is favouring */
	.pole.active {
		fill: var(--ousio-accent, #b3452c);
		opacity: 1;
	}

	.word {
		font-style: italic;
		opacity: 0.3;
	}

	.word.hook {
		opacity: 0.64;
	}

	.vignette {
		pointer-events: none;
	}

	.grain {
		opacity: 0.045;
		mix-blend-mode: multiply;
		pointer-events: none;
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
		.rose {
			transition: none;
		}
	}
</style>
