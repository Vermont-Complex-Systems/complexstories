<script lang="ts">
	import { ScrollyContent, RenderContent, ScrollIndicator } from '@the-vcsi/scrolly-kit';
	import Footer from '$lib/components/Footer.svelte';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import Hero from './Hero.svelte';
	import Network from './Network.svelte';
	import Quench from './Quench.svelte';
	import edges from '../data/edges.json';
	import nodesRaw from '../data/nodes.csv';

	let { story, data } = $props();

	const nodes = nodesRaw.map((n: any) => ({ ...n, id: String(n.id) }));
	const links = edges[0];

	let annealIndex = $state(0);
	let quenchIndex = $state(0);

	const width = 500;
	const height = 500;
	const padding = { top: 20, right: 40, bottom: 20, left: 60 };
</script>

<ScrollIndicator />
<article class="story">
	<BackToHome />
	<Hero {data} />

	<section class="part-intro">
		<RenderContent items={data.part1Intro} />
	</section>

	<section class="split-layout">
		<div class="sticky-panel">
			<Network scrollyIndex={annealIndex} {nodes} {links} {width} {height} {padding} />
		</div>
		<div class="scrolly-content">
			<ScrollyContent steps={data.steps} bind:value={annealIndex} />
		</div>
	</section>

	<section class="part-intro">
		<RenderContent items={data.part2Intro} />
	</section>

	<section class="split-layout">
		<div class="sticky-panel">
			<Quench scrollyIndex={quenchIndex} {nodes} {links} {width} {height} {padding} />
		</div>
		<div class="scrolly-content">
			<ScrollyContent steps={data.postIntro} bind:value={quenchIndex} />
		</div>
	</section>

	<section class="conclusion">
		<RenderContent items={data.conclusion} />
	</section>
</article>

<Footer />

<style>
	.story {
		--vcsi-story-bg: var(--vcsi-color-white);
	}

	.part-intro,
	.conclusion {
		max-width: calc(var(--vcsi-story-max-width, 600px) + 350px + 2rem);
		margin: 3rem auto;
		padding: 0 1rem;
		text-align: left;
	}

	.part-intro :global(> *),
	.conclusion :global(> *) {
		max-width: var(--vcsi-story-max-width, 600px);
		margin-left: 0;
		margin-right: auto;
		text-align: left;
	}

	.part-intro {
		margin-top: 5rem;
	}
</style>
