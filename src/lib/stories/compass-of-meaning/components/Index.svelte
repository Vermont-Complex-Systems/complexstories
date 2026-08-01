<script lang="ts">
	import { ScrollyContent, RenderContent } from '@the-vcsi/scrolly-kit';
	import Footer from '$lib/components/Footer.svelte';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';

	import Galaxy from './Galaxy.svelte';

	let { story: _story, data } = $props();

	// One scrolly section, one index — undefined until the reader scrolls in.
	let scrollyIndex = $state<number | undefined>(undefined);

	// Each step names the projection to show (copy.json → step.view); the
	// galaxy eases toward it. Neutral 3D view before the reader scrolls in.
	let view = $derived(
		scrollyIndex === undefined ? '3d' : (data.steps[scrollyIndex]?.view ?? '3d')
	);

	// The fullscreen layout owns the space; the galaxy fills the sticky panel.
	let panelWidth = $state(0);
	let panelHeight = $state(0);
</script>

<BackToHome />

<article class="story" data-theme="dark" style="--vcsi-story-bg: #14141c;">
	<header class="title">
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

	<section class="fullscreen-layout">
		<div class="sticky-panel" bind:clientWidth={panelWidth} bind:clientHeight={panelHeight}>
			<Galaxy width={panelWidth} height={panelHeight} {view} />
		</div>
		<div class="scrolly-content">
			<ScrollyContent steps={data.steps} bind:value={scrollyIndex} />
		</div>
	</section>

	{#if data.conclusion}
		<section id="conclusion">
			<h2>Conclusion</h2>
			<RenderContent items={data.conclusion} />
		</section>
	{/if}
</article>

<Footer theme="dark" />

<style>
	.title {
		margin: 0 auto 5rem auto;
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
		color: var(--vcsi-gray-300);
		font-weight: var(--vcsi-font-weight-medium);
	}

	.article-meta .date {
		font-size: var(--vcsi-font-size-small);
		color: var(--vcsi-muted);
		margin: 0;
	}

	/* Light step boxes over the dark galaxy. */
	.fullscreen-layout {
		--vcsi-story-step-bg: #fff;
		--vcsi-story-step-fg: #000;
		--vcsi-story-step-bg-inactive: #f5f5f5;
		--vcsi-story-step-fg-inactive: #888;
	}

	.fullscreen-layout :global(.step-box p),
	.fullscreen-layout :global(.step-box a) {
		color: inherit;
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
