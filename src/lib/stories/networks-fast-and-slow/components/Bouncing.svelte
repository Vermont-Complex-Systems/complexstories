<script lang="ts">
	import P5Sketch, { type Sketch } from '@sveltecraft/p5-svelte';
	import type p5 from 'p5';

	const RED_DURATION = 6000;

	let { width = 350, height = 350, numBalls = 50 }: { width?: number; height?: number; numBalls?: number } = $props();

	class Ball {
		p: p5;
		x: number;
		y: number;
		vx: number;
		vy: number;
		r: number;
		redTime: number | null;
		becameRedThisFrame = false;

		constructor(p: p5, x: number, y: number, vx: number, vy: number, r = 10, red = false) {
			this.p = p;
			this.x = x;
			this.y = y;
			this.vx = vx;
			this.vy = vy;
			this.r = r;
			this.redTime = red ? p.millis() : null;
		}

		isRed() {
			if (this.redTime === null) return false;
			return this.p.millis() - this.redTime < RED_DURATION;
		}

		move() {
			this.x += this.vx;
			this.y += this.vy;

			if (this.x < this.r) {
				this.vx *= -1;
				this.x = this.r;
			} else if (this.x > this.p.width - this.r) {
				this.vx *= -1;
				this.x = this.p.width - this.r;
			}

			if (this.y < this.r) {
				this.vy *= -1;
				this.y = this.r;
			} else if (this.y > this.p.height - this.r) {
				this.vy *= -1;
				this.y = this.p.height - this.r;
			}
		}

		display() {
			this.p.fill(this.isRed() ? '#ff4d4d' : 'black');
			this.p.strokeWeight(1.2);
			this.p.ellipse(this.x, this.y, this.r * 2);
		}

		checkCollision(other: Ball) {
			const dx = other.x - this.x;
			const dy = other.y - this.y;
			const dist = Math.hypot(dx, dy);
			const minDist = this.r + other.r;

			if (dist < minDist) {
				if ((this.isRed() || this.becameRedThisFrame) && !other.isRed()) {
					other.redTime = this.p.millis();
					other.becameRedThisFrame = true;
				}
				if ((other.isRed() || other.becameRedThisFrame) && !this.isRed()) {
					this.redTime = this.p.millis();
					this.becameRedThisFrame = true;
				}

				const angle = Math.atan2(dy, dx);
				const sin = Math.sin(angle);
				const cos = Math.cos(angle);

				const v1 = rotate(this.vx, this.vy, sin, cos, true);
				const v2 = rotate(other.vx, other.vy, sin, cos, true);

				const temp = v1.x;
				v1.x = v2.x;
				v2.x = temp;

				const final1 = rotate(v1.x, v1.y, sin, cos, false);
				const final2 = rotate(v2.x, v2.y, sin, cos, false);

				this.vx = final1.x;
				this.vy = final1.y;
				other.vx = final2.x;
				other.vy = final2.y;

				const overlap = 0.5 * (minDist - dist + 0.1);
				this.x -= overlap * (dx / dist);
				this.y -= overlap * (dy / dist);
				other.x += overlap * (dx / dist);
				other.y += overlap * (dy / dist);
			}
		}
	}

	function rotate(vx: number, vy: number, sin: number, cos: number, reverse: boolean) {
		return reverse
			? { x: vx * cos + vy * sin, y: vy * cos - vx * sin }
			: { x: vx * cos - vy * sin, y: vy * cos + vx * sin };
	}

	const sketch: Sketch = (p) => {
		let balls: Ball[] = [];
		let prevNumBalls: number | null = null;

		function initBalls() {
			balls = [];
			for (let i = 0; i < numBalls; i++) {
				const isInitialRed = i === 0;
				balls.push(
					new Ball(
						p,
						p.random(50, p.width - 50),
						p.random(50, p.height - 50),
						p.random(-2, 2),
						p.random(-2, 2),
						7,
						isInitialRed
					)
				);
			}
			prevNumBalls = numBalls;
		}

		p.setup = () => {
			p.createCanvas(width, height);
			initBalls();
		};

		p.draw = () => {
			p.background('#f9f9f9');

			if (numBalls !== prevNumBalls) {
				initBalls();
			}

			for (let i = 0; i < balls.length; i++) {
				const b = balls[i];
				b.move();
				b.display();

				for (let j = i + 1; j < balls.length; j++) {
					b.checkCollision(balls[j]);
				}
			}

			for (const b of balls) {
				b.becameRedThisFrame = false;
			}
		};
	};
</script>

<P5Sketch {sketch} />
