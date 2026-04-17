<script>
	import { ScrollyContent, ScrollIndicator } from '@the-vcsi/scrolly-kit';
	import Footer from '$lib/components/Footer.svelte';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import TextInterpolator from './TextInterpolator.svelte';
	import MobileTextInterpolator from './MobileTextInterpolator.svelte';
	import Hero from './Hero.svelte';
	import StackedSlider from './StackedSlider.svelte';
	import ScatterPlot from './ScatterPlot.svelte';
	import { innerWidth } from 'svelte/reactivity/window';
	import letterImg from '../assets/julia-illos/Symbolmapping.png?url';

	let { story, data } = $props();

	let firstIndex = $state(undefined);
	let firstProgress = $state(0);

	let secondIndex = $state(undefined);

	let thirdIndex = $state(undefined);

	let sliderValue = $derived((secondIndex ?? 0) === 2 ? 12 : 1);
	let sliderMode = $derived((secondIndex ?? 0) <= 2 ? 'words' : 'chars');

	let isMobile = $derived(innerWidth.current <= 768);
</script>

<ScrollIndicator />

<article id="tokenization-story" class="story">
	{#if isMobile}
		<BackToHome />
	{:else}
		<BackToHome centered />
	{/if}
	
	<Hero />

	<!-- Section 1: TextInterpolator -->
	<section class="split-layout" style="--vcsi-panel-width: 70%;">
		<div class="sticky-panel">
			{#if (innerWidth.current ?? 1200) > 800}
				<TextInterpolator progress={firstProgress} currentStep={firstIndex ?? 0} />
			{:else}
				<MobileTextInterpolator currentStep={firstIndex ?? 0} />
			{/if}
		</div>
		<ScrollyContent
			steps={data.firstSection}
			bind:value={firstIndex}
			bind:scrollProgress={firstProgress}
		/>
	</section>

	<div class="interlude">
		<div class="interlude-text">
			<h2>What is a token?</h2>
			<p>Let's explore how language models break down text into manageable pieces.</p>
		</div>
		<figure class="interlude-figure">
			<img src={letterImg} alt="letter being converted to binary ones and zeros" />
		</figure>
	</div>

	<!-- Section 2: StackedSlider -->
	<section class="fullscreen-layout">
		<div class="sticky-panel">
			<StackedSlider
				bind:sliderValue
				renderMode={sliderMode}
				scrollyIndex={secondIndex ?? 0}
			/>
		</div>
		<ScrollyContent steps={data.secondSection} bind:value={secondIndex} />
	</section>

	<h2>The Distributional Hypothesis</h2>
	<p>The Distributional Hypothesis states that words that occur in the same contexts tend to have similar meanings. So how does an LLM group different instances of the same word?</p>

	<!-- Section 3: ScatterPlot -->
	<section class="split-layout reversed" id="section-scatter" style="--vcsi-panel-width: 75%; --vcsi-step-text-align: center;">
		<div class="sticky-panel">
			<ScatterPlot stepCount={thirdIndex ?? 0} />
		</div>
		<ScrollyContent steps={data.thirdSection} bind:value={thirdIndex} />
	</section>

	<section class="conclusion">
		<h2>Where do we go from here?</h2>
		<p>The world's a stage, and we are actors.</p>
		<p>What role will LLM's play? Do they know something?</p>
		<p>Time will tell dear ones!</p>
	</section>
</article>

<Footer theme="dark" />


<style>
	:global(body:has(#tokenization-story)) {
		background-color: #f8ecd4;
		background-image:
			url("data:image/svg+xml;utf8,<svg width='400' height='400' xmlns='http://www.w3.org/2000/svg'><filter id='parchment-noise'><feTurbulence type='fractalNoise' baseFrequency='0.055' numOctaves='2' seed='7'/><feColorMatrix type='saturate' values='0.1'/></filter><rect width='100%' height='100%' filter='url(%23parchment-noise)' opacity='0.22'/></svg>"),
			radial-gradient(ellipse at center, rgba(0,0,0,0) 20%, rgba(80,60,30,0.4) 100%);
		background-blend-mode: multiply, normal;
		background-size: 400px 400px, 100% 100%;
		background-repeat: repeat, no-repeat;
		background-attachment: fixed;
		overflow-x: hidden;
	}

	/* Story root: always-on parchment background, typography, and modest
	   mobile padding for full-bleed layouts. Desktop overrides geometry below. */
	.story {
		--vcsi-story-bg: transparent;
		--vcsi-story-fg: #3b2f1e;
		--vcsi-fullscreen-padding-inline: 1rem;
		font-family: 'Tiempos Text', 'Iowan Old Style', 'Times New Roman', Times, serif;
	}

	/* Desktop-only per-section overrides (no mobile leak). */
	@media (min-width: 769px) {
		#section-scatter {
			--vcsi-content-padding-inline: 4rem;
		}

		.story {
			/* Parchment card appearance */
			--vcsi-story-step-bg: rgba(255, 255, 255, 0.98);
			--vcsi-story-step-fg: #333;
			--vcsi-story-step-bg-inactive: rgba(255, 255, 255, 0.55);
			--vcsi-story-step-fg-inactive: rgba(59, 47, 30, 0.5);
			--vcsi-step-max-width: 500px;
			--vcsi-step-padding: 1.5rem 2rem;
			--vcsi-step-border-radius: 8px;
			--vcsi-step-box-shadow: 0 8px 30px rgba(59, 47, 30, 0.15), 0 2px 6px rgba(59, 47, 30, 0.25);
			--vcsi-step-text-align: left;

			/* Layout geometry */
			--vcsi-panel-height: 80vh;
			--vcsi-step-height: 110vh;
			--vcsi-layout-gap: 0;
			--vcsi-fullscreen-padding-inline: clamp(3rem, 16vw, 14rem);
		}
	}

	/* Space above each scrolly section — tight on mobile, generous on desktop. */
	.split-layout,
	.fullscreen-layout {
		margin-top: 2rem;
	}

	@media (min-width: 769px) {
		.split-layout,
		.fullscreen-layout {
			margin-top: 6rem;
		}
	}




	.fullscreen-layout .sticky-panel {
		padding-top: 1rem;
	}

	@media (min-width: 769px) {
		.fullscreen-layout .sticky-panel {
			padding-top: 6rem;
		}
	}

	/* .step and .scrolly-content are rendered by scrolly-kit's ScrollyContent,
	   not this component, so they need :global to escape Svelte's scope hashing. */
	.split-layout :global(.step),
	.fullscreen-layout :global(.step) {
		margin-bottom: 150px;
	}

	/* Mobile: let the layout's own --vcsi-fullscreen-padding-inline own the
	   inline gutter; don't double up with the kit's 0.5rem scrolly-content padding. */
	@media (max-width: 768px) {
		.fullscreen-layout :global(.scrolly-content) {
			padding-inline: 0;
		}
	}

	.split-layout.reversed .sticky-panel {
		margin-left: 3rem;
	}


	.interlude {
		max-width: 900px;
		margin: 2rem auto;
		padding: 0 1rem;
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 3rem;
	}

	@media (min-width: 769px) {
		.interlude {
			margin: 6rem auto;
		}
	}

	.interlude-text {
		flex: 1;
		max-width: 500px;
	}

	.interlude-text h2 {
		margin: 0 0 0.75rem;
	}

	.interlude-text p {
		margin: 0;
		line-height: 1.6;
	}

	.interlude-figure {
		flex: 0 0 250px;
		margin: 0;
	}

	.interlude-figure img {
		width: 100%;
		height: auto;
		display: block;
	}

	@media (max-width: 768px) {
		.interlude {
			flex-direction: column;
			text-align: center;
			gap: 1.5rem;
		}
		.interlude-figure {
			flex: 0 0 auto;
			max-width: 200px;
		}
	}

	.conclusion {
		max-width: 700px;
		margin: 4rem auto;
		font-size: 1.125rem;
	}
</style>
