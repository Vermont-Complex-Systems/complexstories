<script lang="ts">
	import { ScrollyContent, RenderContent } from '@the-vcsi/scrolly-kit';
	import Footer from '$lib/components/Footer.svelte';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';

	import OusiogramFigure from './OusiogramFigure.svelte';
	import BookGallery from './BookGallery.svelte';
	import BookExplorer from './BookExplorer.svelte';
	import Hero from './Hero.svelte';

	let { story, data } = $props();

	// Gallery small-multiples fill the prose column width.
	let galleryWidth = $state(0);

	// Two scrolly sections, one index EACH (scrolly-kit's multi-section rule).
	let mapIndex = $state<number | undefined>(undefined);
	let voyageIndex = $state<number | undefined>(undefined);

	// Each step names the ousiogram camera view (copy.json → step.view).
	// The map act holds the opening VAD frame before scroll-in; the voyage
	// act opens on the full compass before its dive.
	let mapView = $derived(
		mapIndex === undefined ? 'vad' : (data.steps[mapIndex]?.view ?? 'vad')
	);

	// The SVD ellipse is a REVEAL (step 3 names it) — hidden on the hook
	// steps and before scroll-in, per each step's `ellipse` flag.
	let mapEllipse = $derived(
		mapIndex === undefined ? false : (data.steps[mapIndex]?.ellipse ?? true)
	);
	// The voyage act picks up exactly where the map act left off: the ousiogram.
	let voyageView = $derived(
		voyageIndex === undefined ? 'ousiogram' : (data.odysseySteps?.[voyageIndex]?.view ?? 'ousiogram')
	);

	// Sticky panel dims, per section.
	let panelWidth = $state(0);
	let panelHeight = $state(0);
	let voyPanelWidth = $state(0);
	let voyPanelHeight = $state(0);

	// Safety-bias coda: a reader-driven toggle between counting each word
	// once and counting by usage across the gallery's six books.
	let byUse = $state(false);
	let safetyView = $derived(byUse ? 'ousiogram-tokens' : 'ousiogram');
	let safetyWidth = $state(0);
	let safetyHeight = $state(0);
</script>

<BackToHome />

<article class="story" data-theme="light" style="--vcsi-story-bg: #efe6cf; --ousio-paper: #efe6cf;">
	<header class="title">
		<Hero />
		<h1>{data.title}</h1>
		<h2>{data.subtitle}</h2>

		<div class="article-meta">
			<p class="author">By {#each data.authors as author, i}{i === 0 ? '' : i === data.authors.length - 1 ? ' and ' : ', '}<a href={author.url} target="_blank" rel="noreferrer">{author.name}</a>{/each}</p>
			<p class="date">{data.date}</p>
		</div>
	</header>

	{#if data.intro}
		<section id="intro">
			<RenderContent items={data.intro} />
		</section>
	{/if}

	<!-- Act I–II: the map. Steps LEFT, plot RIGHT (split-layout default). -->
	<section class="split-layout">
		<div class="sticky-panel" bind:clientWidth={panelWidth} bind:clientHeight={panelHeight}>
			<OusiogramFigure view={mapView} ellipse={mapEllipse} width={panelWidth} height={panelHeight} />
		</div>
		<div class="scrolly-content">
			<ScrollyContent steps={data.steps} bind:value={mapIndex} />
		</div>
	</section>

	{#if data.interlude}
		<section id="interlude">
			<h2>{data.interludeTitle ?? 'Putting the compass to work'}</h2>
			<RenderContent items={data.interlude} />
		</section>
	{/if}

	<!-- Act III: the voyage. Mirrored for the whole section — plot LEFT,
	     steps RIGHT — so the layout never flips mid-scroll. -->
	{#if data.odysseySteps}
		<section class="split-layout reversed">
			<div class="sticky-panel" bind:clientWidth={voyPanelWidth} bind:clientHeight={voyPanelHeight}>
				<OusiogramFigure view={voyageView} width={voyPanelWidth} height={voyPanelHeight} />
			</div>
			<div class="scrolly-content">
				<ScrollyContent steps={data.odysseySteps} bind:value={voyageIndex} />
			</div>
		</section>
	{/if}

	{#if data.gallery}
		<section id="gallery">
			<h2>{data.galleryTitle ?? 'Six voyages, one plane'}</h2>
			<RenderContent items={data.gallery} />
			<div class="gallery-holder" bind:clientWidth={galleryWidth}>
				<BookGallery width={galleryWidth || 640} />
			</div>
		</section>
	{/if}

	{#if data.safety}
		<section id="safety">
			<h2>{data.safetyTitle ?? 'One more count: the safety bias'}</h2>
			<RenderContent items={data.safety} />
			<div class="safety-toggle" role="group" aria-label="Counting mode">
				<button type="button" class:active={!byUse} aria-pressed={!byUse} onclick={() => (byUse = false)}>
					each word once
				</button>
				<button type="button" class:active={byUse} aria-pressed={byUse} onclick={() => (byUse = true)}>
					as the six books use them
				</button>
			</div>
			<div class="safety-holder" bind:clientWidth={safetyWidth} bind:clientHeight={safetyHeight}>
				<OusiogramFigure view={safetyView} width={safetyWidth} height={safetyHeight} />
			</div>
		</section>
	{/if}

	{#if data.conclusion}
		<section id="conclusion">
			<h2>Conclusion</h2>
			<RenderContent items={data.conclusion} />
		</section>
	{/if}

	{#if data.explore}
		<section id="explore">
			<h2>{data.exploreTitle ?? 'Sail one yourself'}</h2>
			<RenderContent items={data.explore} />
		</section>
		<!-- .full-bleed only works as a DIRECT child of .story -->
		<div class="full-bleed">
			<BookExplorer />
		</div>
	{/if}
</article>

<Footer theme="light" />

<style>
	.title {
		margin: 2.5rem auto 5rem auto;
		text-align: center;
	}

	.title h1,
	.title h2 {
		font-family: var(--vcsi-font-serif);
		max-width: 480px;
		margin: 6rem auto 1rem auto;
		text-align: center;
	}

	.title h1 {
		font-size: var(--vcsi-font-size-giant);
		/* sits just under the compass rose, not a full viewport below it */
		margin-top: 1.5rem;
	}

	.title h2 {
		font-size: var(--vcsi-font-size-md);
		font-weight: var(--vcsi-font-weight-regular);
		margin: 0 auto 3rem auto;
	}

	.article-meta {
		margin: -1rem auto 2rem auto;
		max-width: 30rem;
		font-family: var(--vcsi-font-sans);
		text-align: center;
	}

	.article-meta .author {
		font-size: var(--vcsi-font-size-md);
		margin: -1rem auto 1rem auto;
	}

	.article-meta .author a {
		color: var(--vcsi-gray-500, #555);
		font-weight: var(--vcsi-font-weight-medium);
	}

	.article-meta .date {
		font-size: var(--vcsi-font-size-small);
		color: var(--vcsi-muted);
		margin: 0;
	}

	.gallery-holder {
		margin-top: 2rem;
	}

	.safety-toggle {
		display: flex;
		justify-content: center;
		margin: 1.5rem 0 1rem 0;
		font-family: var(--vcsi-font-sans);
	}

	.safety-toggle button {
		padding: 0.35rem 0.8rem;
		border: 1px solid #1a2340;
		background: transparent;
		color: #1a2340;
		font: inherit;
		font-size: 0.82rem;
		cursor: pointer;
	}

	.safety-toggle button + button {
		border-left: none;
	}

	.safety-toggle button.active {
		background: #1a2340;
		color: #faf8f2;
	}

	.safety-toggle button:focus-visible {
		outline: 2px solid #b3452c;
		outline-offset: 1px;
	}

	.safety-holder {
		height: min(88vh, 700px);
		display: flex;
		justify-content: center;
	}

	/* The panel column is sized to the PLOT, not a viewport fraction: the
	   ousiogram is a square capped by panel height (min(96vh,950) − it maxes
	   at 780px), so giving the grid track that same measure makes the panel
	   hug the plot exactly — no dead space right of the figure, and all
	   remaining width flows to the steps column. */
	.split-layout {
		/* the plot fills whatever width the panel has (it widens its window
		   onto the plane, units intact) — raise the % to slim the steps,
		   lower it to widen them and pull the framed square closer */
		--vcsi-panel-width: 72%;
		--vcsi-panel-min-width: 480px;
		/* tall enough for the plot at full size PLUS the log-book under it */
		--vcsi-panel-height: min(96vh, 950px);
		--vcsi-layout-gap: 0rem;
		--vcsi-content-padding-inline: 2.5rem;

		/* step boxes styled as pages of a scanned old book */
		--vcsi-story-step-bg: #faf3e2;
		--vcsi-story-step-fg: #3b2f1e;
		--vcsi-story-step-bg-inactive: #ece0c6;
		--vcsi-story-step-fg-inactive: #9a8a6c;
		--vcsi-step-box-shadow: 1px 2px 7px rgba(59, 47, 30, 0.24);
		--vcsi-step-border-radius: 2px;
	}

	.split-layout :global(.step-box p),
	.split-layout :global(.step-box a) {
		color: inherit;
	}

	/* Mirrored beats: keep the plot glued to the steps column (slack, if any,
	   goes to the outer edge) — the figure hugs start-side by default. */
	.split-layout.reversed .sticky-panel :global(.fill) {
		justify-content: flex-end;
	}

	/* Below 768px the split collapses to the overlay layout, where the
	   viewport-tall step spacers would swallow hover meant for the ousiogram.
	   Pass pointer events through; the visible boxes stay interactive. */
	.split-layout .scrolly-content {
		pointer-events: none;
		/* content padding is 0 for the flush right edge; keep a small inset
		   so step boxes don't touch the left viewport edge */
		padding-left: 1rem;
	}

	.split-layout :global(.step-box) {
		pointer-events: auto;
		font-family: 'Baskerville', Georgia, 'Times New Roman', serif;
		font-size: 1.02rem;
		line-height: 1.64;
		letter-spacing: 0.008em;
		border: 1px solid rgba(90, 72, 42, 0.16);
		/* faint sepia darkening at top and bottom edges, like a scan */
		background-image:
			radial-gradient(130% 90% at 50% 0%, rgba(120, 96, 54, 0.06), rgba(120, 96, 54, 0) 52%),
			radial-gradient(150% 110% at 50% 100%, rgba(90, 66, 30, 0.08), rgba(90, 66, 30, 0) 58%);
	}

	@media (max-width: 768px) {
		.title h1 {
			font-size: var(--vcsi-font-size-xl);
		}

		.title h2 {
			margin-top: 8rem;
			margin-bottom: 2rem;
		}
	}
</style>
