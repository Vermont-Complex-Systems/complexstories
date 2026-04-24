<script lang="ts">
	import { Footer, ScrollyContent } from '@the-vcsi/scrolly-kit';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import BlackBox from './BlackBox.svelte';
	import SankeyDiagram from './SankeyDiagram.svelte';

	let { story: _story, data } = $props();

	let boxIndex = $state(0);
	let scrollyIndex = $state(0);
</script>

<BackToHome />

<article class="story">
	<h1>{data.title}</h1>
	<p>{data.subtitle}</p>

	<section class="fullscreen-layout">
		<div class="sticky-panel">
			<BlackBox scrollyIndex={boxIndex} />
		</div>
		<div class="scrolly-content">
			<ScrollyContent steps={data.boxSteps} bind:value={boxIndex} />
		</div>
	</section>

	<section class="fullscreen-layout">
		<div class="sticky-panel">
			<SankeyDiagram {scrollyIndex} />
		</div>
		<div class="scrolly-content">
			<ScrollyContent steps={data.steps} bind:value={scrollyIndex} />
		</div>
	</section>
</article>

<Footer />
