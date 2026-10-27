<script lang="ts">
	import { Footer, MarkdownRenderer, ScrollyContent, RenderContent, StoryHeader } from '@the-vcsi/scrolly-kit';
	import type { ContentItem } from '@the-vcsi/scrolly-kit';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import ScrollyPlot from './ScrollyPlot.svelte';
	import EpidemicCurve from './EpidemicCurve.svelte';
	import accuserLeft from '../data/illos/accuse-left.jpg'
	import accuserRight from '../data/illos/accuse-right.jpg'
	import demonGirl from '../data/illos/demon-behind-girl.jpg'
	import girlDemon from '../data/illos/girl-demon.jpg'
	import hornsGirl from '../data/illos/horns-girl.jpg'
	import accuserGirl from '../data/illos/revised-illos/accuser3.png'
	import tituba from '../data/illos/tituba.jpg'
	import maryWarren from '../data/illos/mary warren.jpg'
	import abigail from '../data/illos/Untitled_Artwork 3[1].jpg'
	import martha from '../data/illos/Untitled_Artwork 1[1].jpg'
	import network1 from '../data/illos/revised-illos/network1.png';	
	import networkHead from '../data/illos/revised-illos/network-directed.png';
	

	let { story, data } = $props();

	// One scroll index per scrolly section — they must never share a value.
	let networkIndex = $state(undefined);
	let curveIndex = $state(undefined);

	const PORTRAIT_MARKER = 'Among them are Tituba';

	function isPortraitStep(item: ContentItem) {
		return item.type === 'markdown' && item.value.includes(PORTRAIT_MARKER);
	}

	// Split the step text after the sentence naming the four women, so the
	// portraits sit inside the step, between it and the next paragraph.
	function portraitParts(item: ContentItem) {
		const text = typeof item.value === 'string' ? item.value : '';
		const marker = 'Martha Corey.';
		const i = text.indexOf(marker);
		if (i === -1) return { before: text, after: '' };
		const cut = i + marker.length;
		return { before: text.slice(0, cut), after: text.slice(cut) };
	}
</script>

{#snippet networkStep(item)}
	{#if isPortraitStep(item)}
		{@const parts = portraitParts(item)}
		<MarkdownRenderer text={parts.before} />
		<div class="portrait-row">
			<figure>
				<img src={tituba} alt="Illustration of Tituba" />
				<figcaption>Tituba</figcaption>
			</figure>
			<figure>
				<img src={maryWarren} alt="Illustration of Mary Warren" />
				<figcaption>Mary Warren</figcaption>
			</figure>
			<figure>
				<img src={abigail} alt="Illustration of Abigail Williams" />
				<figcaption>Abigail Williams</figcaption>
			</figure>
			<figure>
				<img src={martha} alt="Illustration of Martha Corey" />
				<figcaption>Martha Corey</figcaption>
			</figure>
		</div>
		<MarkdownRenderer text={parts.after} />
	{:else if item.type === 'markdown'}
		<MarkdownRenderer text={item.value} />
	{:else if item.type === 'html'}
		<span>{@html item.value}</span>
	{:else}
		<MarkdownRenderer text={String(item.value)} />
	{/if}
{/snippet}

<BackToHome />
<article class="story">
	<StoryHeader
		title={data.title}
		subtitle={data.subtitle}
		authors={data.authors}
		date={data.date}
	/>
	<img class="story-illo" style="max-width: 1000px; height: auto; margin: 0 auto;" src={networkHead} alt="A network diagram of the Salem witch trials" />

	<section class="prose">
		<img
			class="side-decoration side-decoration-left"
			src={hornsGirl}
			alt=""
			aria-hidden="true"
			loading="lazy"
		/>
		<RenderContent items={data.introduction} />
	</section>

	<div class="side-by-side" id="story-header-image">
		<img class="story-illo" src={accuserLeft} style="max-width: 200px; height: auto; width: 100%;" alt="A drawing of a woman pointing her finger accusingly at a man" />
		<img class="story-illo" style="max-width: 180px; height: auto; width: 100%;" src={accuserRight} alt="A drawing of a woman pointing her finger accusingly at a man" />
	</div>

	<section class="split-layout">
		<div class="sticky-panel">
			<ScrollyPlot scrollyIndex={networkIndex} />
		</div>

		<div class="scrolly-content">
			<ScrollyContent steps={data.steps} bind:value={networkIndex} contentRenderer={networkStep} />
		</div>
	</section>

	<section class="prose">
		<img
			class="side-decoration side-decoration-right"
			src={demonGirl}
			alt=""
			aria-hidden="true"
			loading="lazy"
		/>
		<RenderContent items={data.curveIntro} />
	</section>

	<section class="split-layout">
		<div class="sticky-panel">
			<EpidemicCurve scrollyIndex={curveIndex} />
		</div>

		<div class="scrolly-content">
			<ScrollyContent steps={data.curveSteps} bind:value={curveIndex} />
		</div>
	</section>

	<section class="prose conclusion">
		<img
			class="side-decoration side-decoration-left"
			src={accuserGirl}
			alt=""
			aria-hidden="true"
			loading="lazy"
		/>
		<img
			class="side-decoration side-decoration-right"
			src={girlDemon}
			alt=""
			aria-hidden="true"
			loading="lazy"
		/>
		<RenderContent items={data.conclusion} />
		<img class="story-illo" src={network1} alt="A network diagram of the Salem witch trials" />
	</section>
	<div class="paper-credit">
		<div class="authors">
			<span>Research and story by</span> Juniper Lovato and Laurent Hébert-Dufresne.<br> Visualizations by Ben Dexter Cooley. <br>Illustrations by Alexa Woodward.
		</div>
		
	</div>
</article>

<Footer />

<style>
	.story {
		background: #fff
	}

	.paper-credit {
		max-width: 550px; margin: 0 auto; font-size: 0.9rem; color: var(--vcsi-muted);
		border-top: 1px solid var(--vcsi-border);
		padding-top: 2rem;
		padding-inline: var(--vcsi-space-md);
	}

	.split-layout {
		--vcsi-panel-width: 60%;
		/* Taller sticky panel than the kit's 600px default cap — the extra
			height lets the graphics render slightly larger. */
		--vcsi-panel-height: min(80vh, 720px);
	}
	.prose {
		position: relative;
		max-width: calc(var(--vcsi-story-max-width, 600px) + 2rem);
		margin: 4rem auto;
		padding: 0 1rem;
		text-align: left;
	}

	.prose :global(> *) {
		max-width: var(--vcsi-story-max-width, 600px);
		margin-left: 0;
		margin-right: auto;
		text-align: left;
	}

	/* Margin illustrations travel with their prose section without taking up
		layout space or intercepting clicks. Keep narrow screens uncluttered. */
	.side-decoration {
		position: absolute;
		top: 0;
		display: none;
		width: clamp(7rem, 13vw, 13rem);
		max-width: none;
		height: auto;
		margin: 0;
		pointer-events: none;
		user-select: none;
	}

	.side-decoration-left {
		right: calc(100% + var(--vcsi-space-lg));
	}

	.side-decoration-right {
		left: calc(100% + var(--vcsi-space-lg));
	}

	@media (min-width: 1024px) {
		.side-decoration {
			display: block;
		}
	}

	.conclusion {
		margin-bottom: 5rem;
	}

	.step-box {
		margin-bottom: var(--vcsi-space-lg);
	}

	.step + .step {
		margin-top: var(--vcsi-space-lg);
	}

	.side-by-side {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 2rem;
		margin-top: 2rem;
	}

	.story :global(.story-header h2) {
		font-size: var(--vcsi-font-size-md);
	}

	.story :global(.story-header .author) {
		margin-top: var(--vcsi-space-xl);
		font-size: var(--vcsi-font-size-xs);
	}

	@media (max-width: 768px) {
		.story :global(.story-header h2) {
			font-size: 2.5rem;
		}
	}

	#story-header-image {
		margin-top: -50px;
	}

	/* Each header illustration tilts back and forth a touch — very slightly,
		like the women are leaning into the accusation. The two images run offset
		in direction and phase so the pair breathes rather than sways in unison. */
	#story-header-image .story-illo {
		animation: tilt-a 0.9s cubic-bezier(0.19, 1, 0.22, 1) infinite alternate;
		transform-origin: 50% 92%;
	}

	#story-header-image .story-illo:last-child {
		animation-name: tilt-b;
		animation-duration: 0.8s;
	}

	@keyframes tilt-a {
		from {
			rotate: -4.5deg;
		}
		to {
			rotate: 8deg;
		}
	}

	@keyframes tilt-b {
		from {
			rotate: 4.5deg;
		}
		to {
			rotate: -8deg;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		#story-header-image .story-illo {
			animation: none;
		}
	}

	.side-by-side .story-illo {
		/* Split the row evenly and shrink rather than wrap, so the pair stays
			side by side even on a phone. */
		flex: 1 1 0;
		min-width: 0;
		max-width: 300px;
		height: auto;
		width: 100%;
		object-fit: contain;
		align-self: center;
	}

	.portrait-row {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.5rem;
		margin: 0.75rem 0;
	}

	.portrait-row figure {
		margin: 0;
	}

	.portrait-row img {
		display: block;
		width: 100%;
		height: auto;
		border-radius: var(--vcsi-radius-sm, 6px);
	}

	.portrait-row figcaption {
		margin-top: 0.25rem;
		font-family: var(--vcsi-font-sans);
		font-size: 0.68rem;
		line-height: 1.2;
		text-align: center;
	}
</style>