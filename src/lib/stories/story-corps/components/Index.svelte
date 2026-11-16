<script lang="ts">
	import { Footer, ScrollyContent } from '@the-vcsi/scrolly-kit';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import ScrollyPlot from './ScrollyPlot.svelte';
	import sensing from '../data/images/sensing.png';

	let { story, data } = $props();

	let scrollyIndex = $state(0);
</script>

<BackToHome />

<article class="story">
	<section class="intro">
		<div class="intro-text">
			<h1>{data.title}</h1>
			<p>{data.subtitle}</p>
		</div>
		<img class="intro-image" src={sensing} alt="" />
	</section>

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

<style>
	.intro {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 2rem;
		align-items: center;
		max-width: 1100px;
		margin: 0 auto 2rem;
		padding: 0 1rem;
	}

	.intro-image {
		width: 100%;
		height: auto;
	}

	@media (max-width: 768px) {
		.intro {
			grid-template-columns: 1fr;
		}
	}
</style>
