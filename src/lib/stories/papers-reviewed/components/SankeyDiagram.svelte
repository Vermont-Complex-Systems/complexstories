<script lang="ts">
	import * as d3 from 'd3';
	import { sankey, sankeyLinkHorizontal, type SankeyNode, type SankeyLink } from 'd3-sankey';
	import { Tween } from 'svelte/motion';
	import { cubicInOut } from 'svelte/easing';

	interface NodeDatum {
		id: string;
		name: string;
	}

	interface LinkDatum {
		source: string | NodeDatum;
		target: string | NodeDatum;
		value: number;
		percent: number;
	}

	type Node = SankeyNode<NodeDatum, LinkDatum>;
	type Link = SankeyLink<NodeDatum, LinkDatum>;

	let { scrollyIndex = 0 }: { scrollyIndex?: number } = $props();

	// Precomputed from aaas_release.csv filtered to Publication === "Science"
	// Submitted = total rows; BORE = BOREExists1 === 1.0; Peer Review = ReviewExists1 === 1; Accepted = IsAccepted === 1
	// Single "rejected" sink receives all rejection flows — d3-sankey moves sinks to the rightmost column
	const graphData = {
		nodes: [
			{ id: 'submitted', name: 'Submitted' },
			{ id: 'bore', name: 'BORE' },
			{ id: 'peer-review', name: 'Peer Review' },
			{ id: 'accepted', name: 'Accepted' },
			{ id: 'rejected', name: 'Rejected' }
		] satisfies NodeDatum[],
		links: [
			{ source: 'submitted', target: 'bore', value: 47292, percent: 100 },
			{ source: 'submitted', target: 'rejected', value: 20755, percent: 100 },
			{ source: 'bore', target: 'peer-review', value: 11845, percent: 69.5 },
			{ source: 'bore', target: 'rejected', value: 35447, percent: 100 },
			{ source: 'peer-review', target: 'accepted', value: 4181, percent: 35.3 },
			{ source: 'peer-review', target: 'rejected', value: 7664, percent: 100 }
		]
	};

	const width = 720;
	const height = 380;
	const margin = { top: 16, right: 130, bottom: 16, left: 130 };

	const sankeyGen = sankey<NodeDatum, LinkDatum>()
		.nodeId((d: NodeDatum) => d.id)
		.nodeWidth(18)
		.nodePadding(14)
		.extent([
			[margin.left, margin.top],
			[width - margin.right, height - margin.bottom]
		]);

	const { nodes, links } = sankeyGen({
		nodes: graphData.nodes.map((d) => ({ ...d })),
		links: graphData.links.map((d) => ({ ...d }))
	});

	// Track container width to reduce viewBox padding on small screens
	let wrapWidth = $state(720);

	function observeWidth(node: HTMLElement) {
		const ro = new ResizeObserver(([entry]) => { wrapWidth = entry.contentRect.width; });
		ro.observe(node);
		return () => ro.disconnect();
	}

	// Zoom: pan to BORE column on step 2, Peer Review on step 3
	const ZOOM_PAD = 30;    // px of incoming link visible before the focused column
	const MOBILE_CROP = 55; // px cropped from each side of the viewBox on small screens
	const boreX0 = (nodes.find((n) => n.id === 'bore') as Node | undefined)?.x0 ?? 0;
	const reviewX0 = (nodes.find((n) => n.id === 'peer-review') as Node | undefined)?.x0 ?? 0;

	// On mobile, base viewBox is inset by MOBILE_CROP on each side to remove excess padding.
	// Zoom steps clamp against the mobile base so they never pull further left than the crop.
	const vbX = Tween.of(
		() => {
			const crop = wrapWidth < 640 ? MOBILE_CROP : 0;
			if (scrollyIndex === 2) return Math.max(crop, boreX0 - ZOOM_PAD);
			if (scrollyIndex === 3) return Math.max(crop, reviewX0 - ZOOM_PAD);
			return crop;
		},
		{ duration: 700, easing: cubicInOut }
	);

	const vbW = Tween.of(
		() => {
			const crop = wrapWidth < 640 ? MOBILE_CROP : 0;
			const x = scrollyIndex === 2 ? Math.max(crop, boreX0 - ZOOM_PAD)
					: scrollyIndex === 3 ? Math.max(crop, reviewX0 - ZOOM_PAD)
					: crop;
			return width - crop - x;
		},
		{ duration: 700, easing: cubicInOut }
	);

	const nodeNames = nodes.map((n: Node) => n.name);
	const colorRange = nodeNames.map((name) =>
		name === 'Rejected' ? '#d62728' : name === 'Accepted' ? '#1f77b4' : d3.schemeDark2[nodeNames.indexOf(name) % d3.schemeDark2.length]
	);
	const color = d3.scaleOrdinal<string>().domain(nodeNames).range(colorRange);
	const linkPathGen = sankeyLinkHorizontal();


	// "sourceId-targetId" → computed link
	const linksByKey = Object.fromEntries(
		links.map((l: Link) => [`${(l.source as Node).id}-${(l.target as Node).id}`, l])
	);

	// Which links are active per step
	const STEP_LINKS: Record<number, string[]> = {
		0: Object.keys(linksByKey),
		1: ['submitted-bore', 'submitted-rejected'],
		2: ['bore-peer-review', 'bore-rejected'],
		3: ['peer-review-accepted', 'peer-review-rejected']
	};

	const MAX_PARTICLES = 10;
	const BASE_DUR = 4.0; // seconds per traversal — increase to slow down, decrease to speed up

	// Per-link author-size distributions precomputed from aaas_release.csv (Publication=Science)
	// [small=[1-5], medium=[6-9], large=10+] as proportions summing to ~1
	const LINK_SIZES: Record<string, [number, number, number]> = {
		'submitted-bore':        [0.36, 0.30, 0.34],
		'submitted-rejected':    [0.56, 0.23, 0.21],
		'bore-peer-review':      [0.27, 0.29, 0.43],
		'bore-rejected':         [0.39, 0.30, 0.31],
		'peer-review-accepted':  [0.23, 0.29, 0.49],
		'peer-review-rejected':  [0.29, 0.29, 0.42]
	};
	const PARTICLE_SIZES = { small: 5, medium: 8, large: 12 } as const;

	function sampleSize(weights: [number, number, number]): number {
		const r = Math.random();
		if (r < weights[0]) return PARTICLE_SIZES.small;
		if (r < weights[0] + weights[1]) return PARTICLE_SIZES.medium;
		return PARTICLE_SIZES.large;
	}

	const maxLinkValue = d3.max(links, (l: Link) => l.value) ?? 1;

	function particleCount(link: Link): number {
		return Math.max(1, Math.round((link.value / maxLinkValue) * MAX_PARTICLES));
	}

	// Build a jittered cubic bezier path for a single particle.
	// y0/y1 are offset independently within ±halfWidth so particles
	// spread across the link band and curve differently from each other.
	function jitteredPath(link: Link, jitterY0: number, jitterY1: number): string {
		const src = link.source as Node;
		const tgt = link.target as Node;
		const x0 = src.x1!;
		const x1 = tgt.x0!;
		const midX = (x0 + x1) / 2;
		const y0 = link.y0! + jitterY0;
		const y1 = link.y1! + jitterY1;
		return `M${x0},${y0}C${midX},${y0} ${midX},${y1} ${x1},${y1}`;
	}

	interface Particle {
		id: string;
		path: string;
		color: string;
		beginDelay: number;
		duration: number;
		size: number;
	}

	const particles: Particle[] = $derived.by(() => {
		const activeKeys = STEP_LINKS[scrollyIndex] ?? STEP_LINKS[0];
		const next: Particle[] = [];

		for (const key of activeKeys) {
			const link = linksByKey[key];
			if (!link) continue;
			const c = color((link.source as Node).name);
			const n = particleCount(link);
			const halfWidth = (link.width ?? 0) / 2;
			const sizeWeights = LINK_SIZES[key] ?? [0.33, 0.34, 0.33];

			for (let i = 0; i < n; i++) {
				// Independent y jitter at source and target — each particle curves differently
				const jY0 = (Math.random() - 0.5) * halfWidth * 1.6;
				const jY1 = (Math.random() - 0.5) * halfWidth * 1.6;

				// Even base spacing + random offset so entries are irregular
				const duration = BASE_DUR * (0.75 + Math.random() * 0.6);
				const beginDelay = (i * BASE_DUR) / n + Math.random() * BASE_DUR * 0.5;

				next.push({
					id: `s${scrollyIndex}-${key}-${i}`,
					path: jitteredPath(link, jY0, jY1),
					color: c,
					beginDelay,
					duration,
					size: sampleSize(sizeWeights)
				});
			}
		}

		return next;
	});

	function activeKeys(): string[] {
		return STEP_LINKS[scrollyIndex] ?? STEP_LINKS[0];
	}

	function isActive(link: Link): boolean {
		const key = `${(link.source as Node).id}-${(link.target as Node).id}`;
		return activeKeys().includes(key);
	}

	function labelAnchor(n: Node): 'start' | 'end' {
		return n.x0! < width / 2 ? 'start' : 'end';
	}

	function labelX(n: Node) {
		return n.x0! < width / 2 ? n.x1! + 6 : n.x0! - 6;
	}

	function labelY(n: Node) {
		return (n.y0! + n.y1!) / 2;
	}
</script>

<div class="sankey-wrap" {@attach observeWidth}>
	<svg viewBox="{vbX.current} 0 {vbW.current} {height}" {width} {height}>
		<!-- Links — dim when inactive -->
		<g fill="none">
			{#each links as link (link.index)}
				<path
					d={linkPathGen(link)}
					stroke={color((link.source as Node).name)}
					stroke-width={Math.max(1, link.width ?? 1)}
					stroke-opacity={isActive(link) ? 0.45 : 0.1}
					style="transition: stroke-opacity 0.4s ease"
				>
					<title>{(link.source as Node).name} → {(link.target as Node).name}: {link.value}</title>
				</path>
			{/each}
		</g>

		<!-- Nodes -->
		<g>
			{#each nodes as node, i (node.index)}
				<rect
					x={node.x0}
					y={node.y0}
					width={(node.x1 ?? 0) - (node.x0 ?? 0)}
					height={(node.y1 ?? 0) - (node.y0 ?? 0)}
					fill={color(node.name)}
					rx="0"
					style="animation: fadeNode 0.5s ease {i * 60}ms both"
				>
					<title>{node.name}: {node.value}</title>
				</rect>
			{/each}
		</g>

		<!-- Labels -->
		<g>
			{#each nodes as node (node.index)}
				{@const fmt = d3.format(',')}
				<text
					x={labelX(node)}
					y={labelY(node)}
					text-anchor={labelAnchor(node)}
					class="node-label"
				>
					<tspan x={labelX(node)} dy="-0.4em">{node.name}</tspan>
					<tspan x={labelX(node)} dy="1.2em" class="node-count">{fmt(node.value ?? 0)}</tspan>
				</text>
			{/each}
		</g>

		<!-- Flowing particles — keyed by step so animateMotion restarts on step change -->
		<g>
			{#each particles as p (p.id)}
				<rect width={p.size} height={p.size} x={-p.size / 2} y={-p.size / 2} fill={p.color} opacity="0" rx="1">
					<animateMotion
						dur="{p.duration}s"
						begin="{p.beginDelay}s"
						repeatCount="indefinite"
						path={p.path}
					/>
					<!-- fade in when motion begins, stay visible through loop -->
					<animate
						attributeName="opacity"
						values="0;0.9;0.9"
						keyTimes="0;0.01;1"
						dur="{p.duration}s"
						begin="{p.beginDelay}s"
						repeatCount="indefinite"
					/>
				</rect>
			{/each}
		</g>
	</svg>
</div>

<style>
	.sankey-wrap {
		position: relative;
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
	}

	.node-label {
		font-size: 13px;
		fill: var(--vcsi-color-text, #333);
		font-family: inherit;
	}

	.node-count {
		font-size: 11px;
		fill: var(--vcsi-color-text, #666);
		opacity: 0.7;
	}

	@keyframes fadeNode {
		from {
			opacity: 0;
			transform: scaleY(0.5);
		}
		to {
			opacity: 1;
			transform: scaleY(1);
		}
	}
</style>
