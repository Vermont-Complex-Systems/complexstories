<script lang="ts">
	import { Footer, ScrollyContent } from '@the-vcsi/scrolly-kit';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import BlackBox from './BlackBox.svelte';
	import SankeyDiagram from './SankeyDiagram.svelte';
	import fig1Image from '$lib/stories/peer-review/data/Fig1Y.png';
	import sciHumlogo from '$lib/stories/peer-review/data/sci-hum-lab-logo.png';

	let { story: _story, data } = $props();

	let boxIndex = $state(0);
	let scrollyIndex = $state(0);
</script>

<BackToHome />

<style>
	.lab-credit {
		text-align: center;
		margin: 0rem auto;
		align-items: center;
		justify-content: center;
		margin-bottom: 2rem;
	}

	.authors {
		padding-right: 2rem;
		border-right: 1px solid #ccc;
		font-style: italic;
		margin-bottom: 0.5rem
	}

	@media (max-width: 768px) {
		.lab-credit {
			flex-direction: column;
			gap: 1rem;
		}

		.authors {
			padding-right: 0;
			border-right: none;
			border-bottom: 1px solid #ccc;
			padding-bottom: 1rem;
		}
	}

	.story h1 {
		max-width: 1000px;
		margin: 0 auto;
		text-align:center;
		margin-bottom: 0.5rem;
	}

	.subtitle {
		max-width: 700px;
		font-size: 1.5rem;
		margin: 0 auto;
		text-align:center;
		margin-bottom: 1rem;
	}

	.lab img {
		display: block;
		margin: 0 auto;
	}

	.full-width-image {
		--vcsi-bleed-padding-inline: 20px;
		height: auto;
		margin-block: 2rem;
	}

	@media (max-width: 768px) {
		.full-width-image {
			--vcsi-bleed-padding-inline: 10px;
		}
	}
</style>

<article class="story">
	<h1>{data.title}</h1>
	<p class="subtitle">{data.subtitle}</p>
	<div class="lab-credit">
	<div class="authors">
		<span>By:</span>
		{#each data.authors as author, index}
			<a href={author.url} target="_blank" rel="noopener noreferrer">{author.name}</a>{index < data.authors.length - 1 ? ', ' : ''}
		{/each}
	</div>
	<div class="lab">
		<p>A project by:</p>
		<a href="https://scienceandhumanitylab.github.io/" target="_blank" rel="noopener noreferrer">
		<img src={sciHumlogo} width="80" alt="Science and Humanity Lab Logo" />
		</a>
		</div>
	</div>

	<section>
		<p>
			Elite general science journals shape scientific discourse, public policy, and scientific careers. Publishing a manuscript in one of these journals can alter the direction not just of an individual career, but of an entire scientific field. Therefore, scientists have a vested interest in understanding the editorial processes shaping outcomes at these journals. However, scientific journals also have a long tradition of reviewer confidentiality, making it difficult to allow the broader scientific community a closer look.
		</p>
		<p>
			Among the most prestigious and impactful journals are Science and Science Advances, two general science journals published by the American Association for the Advancement of Science (AAAS). With collaborators, director of VCSI’s Science and Humanity Lab Sam Zhang worked with AAAS to de-identify their editorial data, and publish a  dataset of the editorial outcomes of 110,303 manuscripts submitted between 2015-2020 for the two journals [eventual citation to paper here?]. This dataset allows the scientific community to understand elite peer review as a complex system.
		</p>
	</section>

	<section class="fullscreen-layout">
		<div class="sticky-panel">
			<BlackBox scrollyIndex={boxIndex} />
		</div>
		<div class="scrolly-content">
			<ScrollyContent steps={data.boxSteps} bind:value={boxIndex} />
		</div>
	</section>

	<section>
		<p>The newly released AAAS data allows the scientific community to quantify the editorial dynamics of submissions to Science (and Science Advances) over a five year period. Most submissions are rejected, and there are multiple stages where rejection can occur. A successful submission must clear several hurdles by multiple sets of evaluators.</p>
		<p>First, the editor rejects certain unsuitable submissions immediately. The submissions not immediately rejected are typically routed to a small group of several hundred external experts, called the Board of Reviewing Editors (BoRE), who quickly evaluate the manuscript and provide a numeric score and suggested reviewers. BoRE feedback and scores is not made available to authors, but it is present in the new dataset.</p>
		<p>Based on BoRE feedback, the editor rejects another set of submissions. The remaining manuscripts are forwarded to peer reviewers. The editor makes the decision whether to proceed to subsequent rounds of review, acceptance, or rejection, based on the comments from the peer reviewers.</p>
	</section>

	<section class="fullscreen-layout">
		<div class="sticky-panel">
			<SankeyDiagram {scrollyIndex} />
		</div>
		<div class="scrolly-content">
			<ScrollyContent steps={data.steps} bind:value={scrollyIndex} />
		</div>
	</section>

	<section>
		<p>
			This dataset provides the community an unprecedented opportunity to glimpse into the inner workings of peer review, and to quantify the correlates of outcome disparities. The team found higher acceptance rates among larger teams whose corresponding authors worked in the US, Canada, or Europe, and those at prestigious institutions, as well as a small gender disparity (Fig. 1). However, these results are not causal, and there can be unmeasured attributes that explain these disparities.
		</p>
	</section>

	<img class="full-bleed full-width-image" src={fig1Image} alt="Figure 1: Acceptance rates by author gender, team size, and region" />

	<section>
		<p>
			Randomized controlled experiments at the journals, such as through double-blinding, can help measure the causal effect of bias compared to other unmeasured correlates such as the manuscript’s novelty or quality. The release of this data by the AAAS serves as a welcome example for the scientific community, and the collaboration with academic institutions provides a template for how other academic journals can demonstrate their public commitment to transparency.
		</p>
	</section>
</article>

<Footer />
