<script>
	import { innerWidth, innerHeight } from 'svelte/reactivity/window';
	import { fade } from 'svelte/transition';
	import { ArrowDown, FileText, Volume2, VolumeOff } from '@lucide/svelte';
	import { ScrollyContent, RenderContent } from '@the-vcsi/scrolly-kit';

	import Footer from '$lib/components/Footer.svelte';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import thumbnail from '$lib/assets/thumbnails/taste-for-privacy.jpg';

	import { audio } from '../state.svelte.ts';
	import TrustEvo from './TrustEvo.svelte';
	import Dashboard from './Dashboard.svelte';
	import WaffleChart from './WaffleChart.svelte';

	import taste_for_privacy_raw from '../data/taste_for_privacy_aggregated.csv';
	import platform_trust from '../data/platform_trust_aggregated.csv';

	// Scrolly data: gender/ACES slices + Overall/platform-count slices (same format)
	const trustData = [...taste_for_privacy_raw, ...platform_trust];

	let { story: _story, data } = $props();

	// Components that copy.json can reference via {"type": "component"} markers
	const components = { WaffleChart };

	// One scrolly section, one index — undefined until the reader scrolls in
	let scrollyIndex = $state(undefined);

	// The fullscreen layout owns the space; the chart fills the sticky panel
	let panelWidth = $state(0);
	let panelHeight = $state(0);

	// Section visibility drives the corner image + distribution-chart overlay fade
	let conclusionSection = $state();
	let conclusionVisible = $state(false);
	let dashboardSection = $state();
	let dashboardVisible = $state(false);

	// Bouncing arrow shown until the reader starts scrolling
	let showScrollIndicator = $state(true);

	$effect(() => {
		if (!conclusionSection) return;
		const observer = new IntersectionObserver((entries) => {
			conclusionVisible = entries[0].isIntersecting;
		}, { threshold: 0.3 });
		observer.observe(conclusionSection);
		return () => observer.disconnect();
	});

	$effect(() => {
		if (!dashboardSection) return;
		const observer = new IntersectionObserver((entries) => {
			dashboardVisible = entries[0].isIntersecting;
		}, { threshold: 0.3 });
		observer.observe(dashboardSection);
		return () => observer.disconnect();
	});

	$effect(() => {
		const handleScroll = () => {
			showScrollIndicator = window.scrollY < 50;
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	});
</script>

<BackToHome />

{#if showScrollIndicator}
	<div class="scroll-indicator" transition:fade={{ duration: 500 }}>
		<ArrowDown size={32} strokeWidth={2} />
	</div>
{/if}

<article class="story" data-theme="dark" style="--vcsi-story-bg: #2b2b2b;">
	<header class="title">
		<h1>{data.title}</h1>
		<h2>{data.subtitle}</h2>

		<div class="article-meta">
			<p class="author">By {#each data.authors as author, i}{i === 0 ? '' : i === data.authors.length - 1 ? ' and ' : ', '}<a href={author.url} target="_blank" rel="noreferrer">{author.name}</a>{/each}</p>
			<p class="date">{data.date}</p>
			{#if data.paperUrl}
				<a class="paper-link" href={data.paperUrl} target="_blank" rel="noreferrer">
					<FileText size={14} strokeWidth={2} aria-hidden="true" />
					Read the paper
				</a>
			{/if}
		</div>
	</header>

	<div class="audio-notice">
		<p>This story has audio in the form of a data sonification.</p>
		<button
			class="enable-audio"
			type="button"
			onclick={() => audio.toggle()}
			aria-pressed={audio.enabled}
		>
			{#if audio.enabled}
				<VolumeOff size={16} strokeWidth={2} aria-hidden="true" />
				Click here to disable
			{:else}
				<Volume2 size={16} strokeWidth={2} aria-hidden="true" />
				Click here to enable
			{/if}
		</button>
	</div>

	<section id="intro">
		<RenderContent items={data.intro} {components} />
	</section>

	<section class="fullscreen-layout">
		<div class="sticky-panel" bind:clientWidth={panelWidth} bind:clientHeight={panelHeight}>
			<TrustEvo
				data={trustData}
				{scrollyIndex}
				width={panelWidth}
				height={panelHeight}
				isStorySection={scrollyIndex !== undefined}
				{conclusionVisible}
				showACESSlider={scrollyIndex !== undefined && scrollyIndex >= 11 && scrollyIndex <= 15} />
		</div>
		<div class="scrolly-content">
			<ScrollyContent steps={data.steps} bind:value={scrollyIndex} />
		</div>
	</section>

	<section id="conclusion" bind:this={conclusionSection}>
		<h2>Conclusion</h2>
		<RenderContent items={data.conclusion} />
	</section>

	<!-- Hidden on mobile via CSS, not {#if}: window-size conditionals in markup
	     diverge from SSR (which assumes desktop) and crash hydration. -->
	<section id="dashboard" bind:this={dashboardSection}>
		<Dashboard
			data={taste_for_privacy_raw}
			width={innerWidth.current ?? 0}
			height={Math.round((innerHeight.current ?? 800) * 0.62)} />
	</section>
</article>

<button
	class="audio-toggle"
	type="button"
	onclick={() => audio.toggle()}
	aria-pressed={audio.enabled}
	aria-label={audio.enabled ? 'Pause story audio' : 'Play story audio'}
	title={audio.enabled ? 'Pause audio' : 'Play audio'}
>
	{#if audio.enabled}
		<Volume2 size={20} strokeWidth={2} aria-hidden="true" />
	{:else}
		<VolumeOff size={20} strokeWidth={2} aria-hidden="true" />
	{/if}
</button>

<div class="corner-image" class:hidden={conclusionVisible || dashboardVisible}>
	<a href="https://www.compethicslab.org/">
		<img src={thumbnail} alt="Dark data visualization" />
	</a>
</div>

<Footer theme="dark" />

<style>
	/* -----------------------------
	   Title & Meta Section
	----------------------------- */
	.title {
		margin: 0 auto 5rem auto;
		text-align: center;
	}

	.title h1,
	.title h2 {
		font-family: var(--vcsi-font-serif);
		max-width: 450px;
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
		margin: -1rem auto 2rem auto;
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

	.article-meta .paper-link {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		margin-top: 1rem;
		background: #1d1f26;
		color: #f7f3ea;
		border: 1px solid #3c3f4c;
		border-radius: var(--vcsi-radius-full);
		padding: 0.4rem 0.85rem;
		font-family: var(--vcsi-font-sans);
		font-size: 0.85rem;
		letter-spacing: 0.02em;
		text-decoration: none;
	}

	.article-meta .paper-link:hover {
		border-color: #6b7080;
	}

	/* -----------------------------
	   Audio Notice
	----------------------------- */
	.audio-notice {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		margin: 0 auto 4rem auto;
		max-width: 30rem;
		text-align: center;
	}

	.audio-notice p {
		margin: 0;
		font-size: var(--vcsi-font-size-small);
		color: var(--vcsi-muted);
	}

	.enable-audio {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		background: #1d1f26;
		color: #f7f3ea;
		border: 1px solid #3c3f4c;
		border-radius: var(--vcsi-radius-full);
		padding: 0.5rem 0.9rem;
		font-family: var(--vcsi-font-sans);
		font-size: 0.85rem;
		letter-spacing: 0.02em;
		cursor: pointer;
	}

	.enable-audio:hover {
		border-color: #6b7080;
	}

	/* -----------------------------
	   Scrolly Section
	   Light step boxes over the dark visualization, as in the original.
	----------------------------- */
	.fullscreen-layout {
		--vcsi-story-step-bg: #fff;
		--vcsi-story-step-fg: #000;
		--vcsi-story-step-bg-inactive: #f5f5f5;
		--vcsi-story-step-fg-inactive: #888;
	}

	/* The kit's dark-theme text rule (.story[data-theme="dark"] p) outranks
	   ScrollyContent's own `.step-box * { color: inherit }`, which would turn
	   the step text white on these white boxes. */
	.fullscreen-layout :global(.step-box p),
	.fullscreen-layout :global(.step-box a) {
		color: inherit;
	}

	/* -----------------------------
	   Scroll Indicator
	----------------------------- */
	.scroll-indicator {
		position: fixed;
		bottom: 2rem;
		left: 50%;
		transform: translateX(-50%);
		z-index: 100;
		color: whitesmoke;
		opacity: 0.7;
		animation: bounce 2s infinite ease-in-out;
		pointer-events: none;
		transition: opacity 0.3s ease;
	}

	@keyframes bounce {
		0%, 100% {
			transform: translateX(-50%) translateY(0);
		}
		50% {
			transform: translateX(-50%) translateY(-10px);
		}
	}

	/* -----------------------------
	   Floating Audio Toggle
	----------------------------- */
	.audio-toggle {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		width: 3rem;
		height: 3rem;
		background: #1d1f26;
		color: #f7f3ea;
		border: 1px solid #3c3f4c;
		border-radius: 50%;
		cursor: pointer;
		transition: border-color 0.3s ease, opacity 0.3s ease;
	}

	.audio-toggle:hover {
		border-color: #6b7080;
	}

	.audio-toggle[aria-pressed='false'] {
		opacity: 0.6;
	}

	/* -----------------------------
	   Corner Image
	----------------------------- */
	.corner-image {
		position: fixed;
		bottom: 2rem;
		left: 2rem;
		max-width: 14rem;
		z-index: 10;
		opacity: 1;
		transition: opacity 0.6s ease;
	}

	.corner-image.hidden {
		opacity: 0;
		pointer-events: none;
	}

	.corner-image img {
		width: 100%;
		height: auto;
	}

	/* -----------------------------
	   Responsive Adjustments
	----------------------------- */
	@media (max-width: 768px) {
		.title h1 {
			font-size: var(--vcsi-font-size-xl);
		}

		.title h2 {
			margin-top: 8rem;
			margin-bottom: 2rem;
		}

		#conclusion {
			margin-top: 0;
		}

		.audio-toggle {
			bottom: 1rem;
			right: 1rem;
			width: 2.5rem;
			height: 2.5rem;
		}

		#dashboard,
		.corner-image {
			display: none;
		}
	}
</style>
