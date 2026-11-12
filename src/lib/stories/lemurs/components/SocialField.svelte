<script>
	// The cohort as a crowd: on the opening step each dot leaves the grid and
	// joins a conversation. Dots walk to a cluster, bob in place while they
	// "talk", drift slowly across the field with the group, then move on when
	// the conversation breaks up or they slip off to another one. Rendered on
	// canvas — a few hundred agents at 60fps is more than SVG wants to carry.
	// UnitChart only mounts this when reduced motion is off; the reduced-motion
	// view stays the plain grid.
	import { onMount } from 'svelte';

	let { count = 0, label = '', exitTargets = null } = $props();

	// Logical field size; the canvas letterboxes it into whatever CSS box the
	// layout gives it, so the simulation never has to know the pixel size.
	const W = 520;
	const H = 520;
	const TAU = Math.PI * 2;
	const R = 4.5; // dot radius — smaller than the unit chart's, crowds need room
	const SLOT = 11; // gap between "chairs" around a conversation
	const GOLDEN = 2.399963; // slot spiral: each chair rotated off the last
	const N_CLUSTERS = 34;
	const MARGIN = 55; // conversations keep off the frame edge
	const SPEED = 70; // walking speed, field units/s
	const ARRIVE = 9; // this close to a slot counts as sat down
	const K_SPRING = 36; // chatting dots are sprung onto their slot…
	const K_DAMP = 9; // …with enough damping to settle, not orbit

	let canvas;

	onMount(() => {
		const ctx = canvas.getContext('2d');
		const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
		const fill = getComputedStyle(canvas).getPropertyValue('--lem-dot-rest').trim() || '#b9bfc7';

		// A conversation: drifts slowly, rotates its seating, and can be relocated
		// to a fresh spot after a breakup.
		const clusters = [];
		function place(c) {
			c.x = rand(MARGIN, W - MARGIN);
			c.y = rand(MARGIN, H - MARGIN);
			c.dir = rand(TAU);
			c.rot = rand(TAU);
			c.rotV = rand(-0.08, 0.08);
			c.n = 0; // next slot number to hand out
		}
		for (let j = 0; j < N_CLUSTERS; j++) {
			const c = { members: [] };
			place(c);
			clusters.push(c);
		}
		let exit = null;

		// Start on the same near-square grid the static unit chart draws, then
		// deal everyone into conversations and let them walk there — the field
		// appears to come alive out of the chart the reader just saw.
		const agents = [];
		const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
		const cells = 20; // the unit chart's own pitch, so the grid matches it
		const ox = (W - cols * cells) / 2;
		const oy = (H - Math.ceil(count / cols) * cells) / 2;
		const order = Array.from({ length: count }, (_, i) => i);
		for (let i = order.length - 1; i > 0; i--) {
			const j = Math.floor(rand(i + 1));
			[order[i], order[j]] = [order[j], order[i]];
		}
		let dealt = 0;
		while (dealt < count) {
			const c = clusters[Math.floor(rand(N_CLUSTERS))];
			for (let m = 2 + Math.floor(rand(11)); m > 0 && dealt < count; m--, dealt++) {
				const i = order[dealt];
				const a = {
					x: ox + (i % cols) * cells + cells / 2,
					y: oy + Math.floor(i / cols) * cells + cells / 2,
					i,
					vx: 0,
					vy: 0,
					c,
					k: c.n++,
					mode: 0, // 0 = walking, 1 = chatting
					ph: rand(TAU) // private phase for the chat bob
				};
				c.members.push(a);
				agents.push(a);
			}
		}

		// Re-home one dot, leaving a gap in the old conversation and taking the
		// next slot in the new one.
		function moveTo(a, c) {
			const old = a.c.members;
			const at = old.indexOf(a);
			if (at >= 0) old.splice(at, 1);
			c.members.push(a);
			a.c = c;
			a.k = c.n++;
			a.mode = 0;
		}

		// A slot is a seat on a loose spiral around the conversation's centre.
		const target = [0, 0];
		function slot(a) {
			const r = SLOT * Math.sqrt(a.k + 0.6);
			const ang = a.k * GOLDEN + a.c.rot;
			target[0] = a.c.x + Math.cos(ang) * r;
			target[1] = a.c.y + Math.sin(ang) * r;
		}

		let t = 0;
		let defectorAt = 4; // small grace while the grid empties
		let breakupAt = 16;

		function tick(dt) {
			t += dt;

			for (const c of clusters) {
				const sp = 3.2;
				c.x += Math.cos(c.dir) * sp * dt;
				c.y += Math.sin(c.dir) * sp * dt;
				if (c.x < MARGIN) ((c.x = MARGIN), (c.dir = Math.PI - c.dir));
				else if (c.x > W - MARGIN) ((c.x = W - MARGIN), (c.dir = Math.PI - c.dir));
				if (c.y < MARGIN) ((c.y = MARGIN), (c.dir = -c.dir));
				else if (c.y > H - MARGIN) ((c.y = H - MARGIN), (c.dir = -c.dir));
				if (Math.random() < dt * 0.25) c.dir += (Math.random() - 0.5) * 1.1;
				c.rot += c.rotV * dt;
			}

			// Every second or two, someone slips off to another group.
			if (t > defectorAt) {
				defectorAt = t + rand(0.5, 1.4);
				for (let n = 1 + Math.floor(rand(2)); n > 0; n--) {
					const a = agents[(Math.random() * count) | 0];
					const c = clusters[(Math.random() * N_CLUSTERS) | 0];
					if (a && a.mode === 1 && c !== a.c) moveTo(a, c);
				}
			}

			// Every so often the largest conversation breaks up all at once and
			// everyone scatters to other groups; its spot opens somewhere new.
			if (t > breakupAt) {
				breakupAt = t + rand(13, 26);
				let big = null;
				for (const c of clusters) if (c.members.length > (big?.members.length ?? 5)) big = c;
				if (big) {
					const rest = clusters.filter((c) => c !== big);
					for (const a of [...big.members]) moveTo(a, rest[(Math.random() * rest.length) | 0]);
					place(big);
				}
			}

			for (const a of agents) {
				slot(a);
				if (a.mode === 0) {
					// Walk: steer toward the slot, easing off near it.
					const dx = target[0] - a.x;
					const dy = target[1] - a.y;
					const d = Math.hypot(dx, dy) || 1e-6;
					const sp = Math.min(SPEED, d * 2.4);
					const k = Math.min(1, 6 * dt);
					a.vx += ((dx / d) * sp - a.vx) * k;
					a.vy += ((dy / d) * sp - a.vy) * k;
					a.x += a.vx * dt;
					a.y += a.vy * dt;
					if (d < ARRIVE) a.mode = 1;
				} else {
					// Chat: sprung onto the slot, which itself bobs a little.
					const tx = target[0] + 1.7 * Math.sin(t * 1.9 + a.ph);
					const ty = target[1] + 1.7 * Math.cos(t * 2.3 + a.ph * 1.31);
					a.vx += ((tx - a.x) * K_SPRING - a.vx * K_DAMP) * dt;
					a.vy += ((ty - a.y) * K_SPRING - a.vy * K_DAMP) * dt;
					a.x += a.vx * dt;
					a.y += a.vy * dt;
				}
			}
		}

		// Fit the logical field into the CSS box, letterboxed and centred.
		let scale = 1;
		let padX = 0;
		let padY = 0;
		function resize() {
			const dpr = Math.min(2, window.devicePixelRatio || 1);
			canvas.width = Math.round(canvas.clientWidth * dpr);
			canvas.height = Math.round(canvas.clientHeight * dpr);
			scale = Math.min(canvas.width / W, canvas.height / H);
			padX = (canvas.width - W * scale) / 2;
			padY = (canvas.height - H * scale) / 2;
		}

		let visible = true;
		let last = performance.now();
		function frame(now) {
			const id = requestAnimationFrame(frame);
			raf = id;
			const dt = Math.min(0.05, (now - last) / 1000);
			last = now;
			if (!visible || document.hidden) return;
			if (exitTargets?.length === agents.length) {
				if (!exit || exit.targets !== exitTargets) {
					exit = {
						targets: exitTargets,
						startedAt: now,
						from: agents.reduce((positions, a) => {
							positions[a.i] = [a.x, a.y];
							return positions;
						}, [])
					};
				}
				const progress = Math.min(1, (now - exit.startedAt) / 1000);
				const eased = 1 - (1 - progress) ** 3;
				for (const a of agents) {
					const from = exit.from[a.i];
					const target = exit.targets[a.i];
					a.x = from[0] + (target.cx - from[0]) * eased;
					a.y = from[1] + (target.cy - from[1]) * eased;
				}
			} else {
				exit = null;
				tick(dt);
			}
			ctx.setTransform(1, 0, 0, 1, 0, 0);
			ctx.clearRect(0, 0, canvas.width, canvas.height);
			ctx.setTransform(scale, 0, 0, scale, padX, padY);
			ctx.fillStyle = fill;
			for (const a of agents) {
				// Chatting dots swell very slightly, on their own beat.
				const rr = a.mode === 1 ? R * (1 + 0.14 * Math.sin(t * 2.2 + a.ph)) : R;
				ctx.beginPath();
				ctx.arc(a.x, a.y, rr, 0, TAU);
				ctx.fill();
			}
		}

		let raf = requestAnimationFrame(frame);
		const ro = new ResizeObserver(resize);
		ro.observe(canvas);
		resize();
		const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
		io.observe(canvas);
		return () => {
			cancelAnimationFrame(raf);
			ro.disconnect();
			io.disconnect();
		};
	});
</script>

<div
	class="crowd"
	role="img"
	aria-label={label}
	aria-hidden={!!exitTargets}
	style="aspect-ratio: {W} / {H};"
>
	<canvas bind:this={canvas} width={W} height={H} aria-hidden="true"></canvas>
</div>

<style>
	.crowd {
		width: 100%;
		max-height: var(--lem-chart-max, 46vh);
		margin: 0 auto;
	}

	canvas {
		display: block;
		width: 100%;
		height: 100%;
	}

	@media (max-width: 768px) {
		.crowd {
			max-height: none;
		}
	}
</style>
