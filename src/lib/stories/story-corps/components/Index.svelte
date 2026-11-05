<script lang="ts">
	import { Footer, ScrollyContent } from '@the-vcsi/scrolly-kit';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import ScrollyPlot from './ScrollyPlot.svelte';

	let { story, data } = $props();

	let scrollyIndex = $state(0);
</script>

<BackToHome />

<article class="story">
	<h1>{data.title}</h1>
	<p>{data.subtitle}</p>

	<section class="split-layout">
		<div class="sticky-panel">
			<ScrollyPlot {scrollyIndex}/>
		</div>

		<div class="scrolly-content">
			<ScrollyContent steps={data.steps} bind:value={scrollyIndex}/>
		</div>
	</section>
</article>

<Footer />
