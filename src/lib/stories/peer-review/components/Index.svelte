<script lang="ts">
	import { Footer, ScrollyContent } from '@the-vcsi/scrolly-kit';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import BlackBox from './BlackBox.svelte';
	import SankeyDiagram from './SankeyDiagram.svelte';
	import fig1Image from '$lib/stories/peer-review/data/Fig1Y.png';
	import fig1ImageA from '$lib/stories/peer-review/data/Fig1Y-a.png';
	import fig1ImageB from '$lib/stories/peer-review/data/Fig1Y-b.png';
	import fig1ImageC from '$lib/stories/peer-review/data/Fig1Y-c.png';
	import sciHumlogo from '$lib/stories/peer-review/data/sci-hum-lab-logo.png';

	let { story: _story, data } = $props();

	let boxIndex = $state(0);
	let scrollyIndex = $state(0);
</script>

<BackToHome />

<a id="lab-credit" href="https://scienceandhumanitylab.github.io/" target="_blank" rel="noopener noreferrer" aria-label="Science and Humanity Lab">
	<img src={sciHumlogo} width="80" alt="Science and Humanity Lab Logo" />
</a>

<article class="story">
	<h1>Five years of submissions to <span style="font-style: italic;">Science</span> and <span style="font-style: italic;">Science Advances</span>: A look behind-the-scenes</h1>
	<p class="subtitle">What happens when a paper is submitted to <span style="font-style: italic;">Science</span>?</p>
	<section>
		<p>
			Elite general science journals shape scientific discourse, public policy, and scientific careers. Publishing a manuscript in one of these journals can alter the direction not just of an individual career, but of an entire scientific field. Therefore, scientists have a vested interest in understanding the editorial processes shaping outcomes at these journals. However, scientific journals also have a long tradition of reviewer confidentiality, making it difficult to allow the broader scientific community a closer look.
		</p>
		<p>
			Among the most prestigious and impactful journals are <span style="font-style: italic;">Science</span> and <span style="font-style: italic;">Science Advances</span>, two general science journals published by the American Association for the Advancement of Science (AAAS). With collaborators at the University of Colorado Boulder, director of VCSI’s Science and Humanity Lab Sam Zhang worked with AAAS to de-identify their editorial data, and publish a  dataset of the editorial outcomes of 110,303 manuscripts submitted between 2015-2020 for the two journals (<a target="_blank" href="https://doi.org/10.1126/sciadv.aec0494">Zhang et al., 2026</a>). This dataset allows the scientific community to understand elite peer review as a complex system.
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
		<p>The newly released AAAS data allows the scientific community to quantify the editorial dynamics of submissions to <span style="font-style: italic;">Science</span> (and <span style="font-style: italic;">Science Advances</span>) over a five year period. Most submissions are rejected, and there are multiple stages where rejection can occur. A successful submission must clear several hurdles by multiple sets of evaluators.</p>
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

	<img class="full-bleed full-width-image fig1-single" src={fig1Image} alt="Figure 1: Acceptance rates by author gender, team size, and region" />

	<div class="full-bleed full-width-image fig1-split">
		<img src={fig1ImageA} alt="Figure 1a: Acceptance rates by author gender" />
		<img src={fig1ImageB} alt="Figure 1b: Acceptance rates by team size" />
		<img src={fig1ImageC} alt="Figure 1c: Acceptance rates by region" />
	</div>

	<section>
		<p>
			Randomized controlled experiments at the journals, such as through double-blinding, can help measure the causal effect of bias compared to other unmeasured correlates such as the manuscript’s novelty or quality. The release of this data by the AAAS serves as a welcome example for the scientific community, and the collaboration with academic institutions provides a template for how other academic journals can demonstrate their public commitment to transparency.
		</p>
	</section>
	<div class="paper-credit">
		<div class="authors">
			<span>Visualizations and story by:</span>
			{#each data.authors as author, index}
				<a href={author.url} target="_blank" rel="noopener noreferrer">{author.name}</a>{index < data.authors.length - 1 ? ', ' : ''}
			{/each}
		</div>
		<div style="">
		Paper citation:
		<br><br>
		<div>
			Zhang, S., LaBerge, N., McElhiney, Q., Larremore, D. B., & Clauset, A. (2026). Editorial and peer review dynamics at elite general science journals. <span style="font-style: italic;">Science Advances</span>, 12, eaec0494. https://doi.org/10.1126/sciadv.aec0494
		</div>
	</div>
	</div>
</article>

<Footer />

<style>
	#lab-credit {
		position: absolute;
		top: 1rem;
		right: 1rem;
		z-index: 100;
		transition: transform 0.2s ease;
	}

	#lab-credit:hover {
		transform: scale(1.05);
	}

	#lab-credit img {
		display: block;
		height: 4.5rem;
		width: auto;
	}

	.paper-credit {
		max-width: 550px; margin: 0 auto; font-size: 0.9rem; color: var(--vcsi-muted);
		border-top: 1px solid var(--vcsi-border);
		padding-top: 2rem;
		padding-inline: var(--vcsi-space-md);
	}

	.authors {
			margin-bottom: 0.5rem;
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


	.full-width-image {
		--vcsi-bleed-padding-inline: 20px;
		height: auto;
		margin-block: 2rem;
	}

	.fig1-split {
		display: none;
		flex-direction: column;
		gap: 0;
		background: #fff;
		padding-block: 1.5rem;
	}

	.fig1-split img {
		width: 100%;
		height: auto;
	}

	@media (max-width: 768px) {
		.full-width-image {
			--vcsi-bleed-padding-inline: 10px;
		}

		.fig1-single {
			display: none;
		}

		.fig1-split {
			display: flex;
			--vcsi-bleed-padding-inline: 1.5rem;
		}
	}
</style>
