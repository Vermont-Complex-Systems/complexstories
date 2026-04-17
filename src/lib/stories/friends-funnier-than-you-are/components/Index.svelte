<script lang="ts">
	import { RenderContent } from '@the-vcsi/scrolly-kit';
	import Footer from '$lib/components/Footer.svelte';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import CascadeHeader from './CascadeHeader.svelte';
	import BranchingNetwork from './BranchingNetwork.svelte';
	import InteractiveFig1 from './InteractiveFig1.svelte';
	import SelfReinforcingNetwork from './SelfReinforcingNetwork.svelte';
	import LogLogPlot from './LogLogPlot.svelte';

	let { story, data } = $props();

	const components = { BranchingNetwork, InteractiveFig1, SelfReinforcingNetwork, LogLogPlot };
</script>

<article class="story" >
	<BackToHome centered />
	<CascadeHeader title={data.title} subtitle={data.subtitle} authors={data.authors} date={data.date} />

	<section id="intro">
		<RenderContent items={data.intro} {components} />
	</section>

	<section id="model">
		<h2>{data.ModelSectionTitle}</h2>
		<RenderContent items={data.model} {components} />
	</section>

	<section id="result">
		<h2>{data.ResultSectionTitle}</h2>
		<RenderContent items={data.result} {components} />
	</section>

	<section id="conclusion">
		<h2>{data.ConclusionSectionTitle}</h2>
		<RenderContent items={data.conclusion}/>
	</section>
</article>

<Footer />

<style>
	section {
		margin: 3rem auto;
	}

	section :global(h2) {
		margin-top: 3rem;
		text-align: center;
	}

	/* Full-bleed section: children constrained to prose width,
	   except .chart-container which stretches to viewport. */
	#intro {
		max-width: none;
		padding-inline: 0;
	}

	#intro :global(> *) {
		max-width: var(--vcsi-story-max-width, 600px);
		margin-inline: auto;
		padding-inline: 1rem;
		box-sizing: border-box;
	}

	#intro :global(> .chart-container) {
		max-width: none;
		padding-inline: 0;
		width: 100%;
	}

</style>
