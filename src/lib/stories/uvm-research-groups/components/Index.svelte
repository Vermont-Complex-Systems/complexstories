<script lang="ts">
	import { RenderContent, MarkdownRenderer, ScrollIndicator } from '@the-vcsi/scrolly-kit';
	import Footer from '$lib/components/Footer.svelte';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import { innerWidth } from 'svelte/reactivity/window';
	import Spinner from '$lib/components/helpers/Spinner.svelte';
	import Header from './Header.svelte';
	import FacultyOverviewWaffle from './FacultyOverviewWaffle.svelte';
	import CollegeWaffles from './CollegeWaffles.svelte';
	import MorphingScrolly from './MorphingScrolly.svelte';
	import EmbeddingCharts from './EmbeddingCharts.svelte';
	import { loadEmbeddingsData, loadDoddsCoauthorData } from '../data.remote.js';

	let { story, data } = $props();

	const components = { FacultyOverviewWaffle, CollegeWaffles, MorphingScrolly };

	const embeddingDataPromise = Promise.all([loadEmbeddingsData(), loadDoddsCoauthorData()]);

	let isMobile = $derived(innerWidth.current <= 768);
</script>


<ScrollIndicator />
<article id="uvm-groups-story" class="story">
	{#if isMobile}<BackToHome />{:else}
		<BackToHome centered />
	{/if}
	
	<Header />

	<section id="introduction">
		<RenderContent items={data.introduction} {components} />
	</section>

	<section id="story">
		<RenderContent items={data.zoomingIn} {components} />
	</section>

  {#each data.embeddings as item}
		{#if item.type === 'markdown'}
    	<section class="embeddings-prose">
				<MarkdownRenderer text={item.value} />
			</section>
		{:else if item.type === 'component' && item.value === 'EmbeddingCharts'}
			<div class="wide-chart">
				{#await embeddingDataPromise}
					<Spinner />
				{:then [embeddingData, coauthorData]}
					<EmbeddingCharts {embeddingData} {coauthorData} />
				{:catch error}
					<p>Error loading embeddings: {error.message}</p>
				{/await}
			</div>
		{/if}
	{/each}

	<section id="conclusion">
		<RenderContent items={data.conclusion} />
	</section>
</article>

<Footer theme="light"/>

<style>
	
	.wide-chart {
		max-width: 1400px;
		margin: 3rem auto;
		padding: 0 0 0 200px; /* asymmetric padding nudges content right without transforming */
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	@media (max-width: 1200px) {
		.wide-chart {
			padding: 0 1rem;
		}
	}
</style>

