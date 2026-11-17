<script>
	import { goto } from '$app/navigation';
	import { Footer, RenderContent, StoryHeader } from '@the-vcsi/scrolly-kit';
	import { onMount } from 'svelte';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import Chapter from './Chapter.svelte';
	import sleepImage from '../data/images/sleep.png';
	import natureImage from '../data/images/nature.png';
	import activityImage from '../data/images/activity.png';
	import anxietyImage from '../data/images/anxiety.png';
	import stressImage from '../data/images/stress.png';
	import sensingImage from '../data/images/sensing.png';

	let { story, data } = $props();

	const sectionImages = {
		Sleep: sleepImage,
		Nature: natureImage,
		Activity: activityImage,
		Anxiety: anxietyImage,
		Stress: stressImage
	};

	// The story is a run of chapters. Each `section` in copy.json opens a new
	// chapter with a full-width header; the steps after it (up to the next
	// header) make that chapter's scrolly section. Steps before the first header
	// form an untitled opening chapter.
	let chapters = $derived.by(() => {
		const out = [{ head: null, steps: [] }];
		let n = 0;
		for (const s of data.steps ?? []) {
			if (s.section) {
				n += 1;
				out.push({
					head: {
						label: s.section,
						intro: data.sectionIntros?.[s.section] ?? '',
						number: String(n).padStart(2, '0'),
						theme: s.theme,
						image: sectionImages[s.section]
					},
					steps: []
				});
			}
			out[out.length - 1].steps.push(s);
		}
		return out.filter((c) => c.head || c.steps.length);
	});

	let sources = $derived(Object.values(data.sources ?? {}));
	let activeSectionId = $state(null);

	onMount(() => {
		const nav = document.querySelector('.section-nav');
		const headers = document.querySelectorAll('.chapter-head[id]');

		const updateActiveSection = () => {
			const threshold = (nav?.getBoundingClientRect().bottom ?? 0) + 1;
			let currentSectionId = null;

			for (const header of headers) {
				if (header.getBoundingClientRect().top > threshold) break;
				currentSectionId = header.id;
			}

			activeSectionId = currentSectionId;
		};

		window.addEventListener('scroll', updateActiveSection, { passive: true });
		window.addEventListener('resize', updateActiveSection);
		updateActiveSection();

		return () => {
			window.removeEventListener('scroll', updateActiveSection);
			window.removeEventListener('resize', updateActiveSection);
		};
	});

	async function scrollToChapter(event, id) {
		const target = document.getElementById(id);
		if (!target) return;

		event.preventDefault();
		await goto(`#${id}`, { shallow: true, reset: false });
		target.focus({ preventScroll: true });
		target.scrollIntoView({
			behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
			block: 'start'
		});
	}
</script>

<BackToHome />

<article class="story lemurs-story">
	<StoryHeader
		title={data.title}
		subtitle={data.subtitle}
		authors={data.authors}
		date={data.date}
	/>

	<section class="story-prose introduction" aria-label="Introduction">
		<div class="introduction-copy">
			<RenderContent items={data.introduction} />
		</div>
		<img class="introduction-image" src={sensingImage} alt="" width="2000" height="2000" />
	</section>

	<nav class="section-nav full-bleed" aria-label="Story sections">
		<div class="section-nav-inner">
			{#each chapters.filter((chapter) => chapter.head) as chapter (chapter.head.number)}
				{@const sectionId = `chapter-${chapter.head.number}`}
				<a
					href={`#${sectionId}`}
					class={{ active: activeSectionId === sectionId }}
					aria-current={activeSectionId === sectionId ? 'location' : undefined}
					style="--section-hue: var(--lem-{chapter.head.theme});"
					onclick={(event) => scrollToChapter(event, sectionId)}
				>
					{chapter.head.label}
				</a>
			{/each}
		</div>
	</nav>

	{#each chapters as chapter, i (chapter.head?.label ?? `intro-${i}`)}
		{#if chapter.head}
			<header
				id={`chapter-${chapter.head.number}`}
				class="chapter-head full-bleed"
				style="--lem-hue: var(--lem-{chapter.head.theme});"
				tabindex="-1"
			>
				<div class="chapter-inner">
					<div class="chapter-copy">
						<span class="section-num">{chapter.head.number}</span>
						<h2 class="section-title">{chapter.head.label}</h2>
						{#if chapter.head.intro}
							<p class="section-intro">{chapter.head.intro}</p>
						{/if}
					</div>
					{#if chapter.head.image}
						<img class="chapter-image" src={chapter.head.image} alt="" width="2000" height="2000" loading="lazy" />
					{/if}
				</div>
			</header>
		{/if}
		<Chapter steps={chapter.steps} sources={data.sources ?? {}} />
	{/each}

	<section class="story-prose" aria-label="Conclusion">
		<RenderContent items={data.conclusion} />
	</section>

	<section class="sources-note">
		<h2>Sources</h2>
		<p class="dek">
			Every figure above is drawn from the LEMURS study's published papers. Where exact data could not be used due to privacy or other reasons, illustrative or synthetic data is used instead. Percentages are shares
			of the cited analytic sample; where a unit other than "student" is used, the chart says so.
		</p>
		<ul class="sources">
			{#each sources as src (src.key)}
				<li>
					<strong>{src.short}</strong> <span class="year">({src.year})</span>
					<span class="journal">{src.journal}</span>
					<span class="cohort">Cohort {src.cohort}</span>
				</li>
			{/each}
		</ul>
	</section>
</article>

<Footer theme="light" />

<style>
	/* ---- The story's own palette (LEMURS) ---------------------------------
	   Defined as --lem-* tokens on the story root, with a dark override. Light
	   is the default; add data-theme="dark" to the .story to flip everything,
	   including the dot fills (which reference these vars). */
	.story {
		--lem-bg: #eef0f3;
		--lem-surface: #fbfbfc;
		--lem-surface2: #e5e8ec;
		--lem-line: #cfd4da;
		--lem-line-soft: #dee2e7;
		--lem-ink: #12161b;
		--lem-ink2: #3d454f;
		--lem-muted: #6c757f;
		--lem-dot-rest: #b9bfc7;

		--lem-sleep: #2a78d6;
		--lem-sleep-tint: #8bb1e6;
		/* Ends of the sleep-duration ramp (short night → long night). Wider than
		   tint→hue so 6 h and 12 h stay apart; flipped in the dark block. */
		--lem-sleep-ramp-lo: #86b6ef;
		--lem-sleep-ramp-hi: #104281;
		--lem-nature: #1baf7a;
		--lem-nature-tint: #1baf7a;
		/* Ends of the nature-exposure map ramp (least → most), flipped in dark. */
		--lem-nature-ramp-lo: #e3f2ea;
		--lem-nature-ramp-hi: #0f5b3a;
		--lem-activity: #eb6834;
		--lem-activity-tint: #eb6834;
		--lem-anxiety: #4a3aa7;
		--lem-anxiety-tint: #9a91cc;
		--lem-stress: #e34948;
		--lem-stress-tint: #f3a56a;

		--lemurs-section-nav-height: 3.5rem;

		/* map the palette onto the scrolly-kit story tokens */
		--vcsi-story-bg: var(--lem-bg);
		--vcsi-story-fg: var(--lem-ink);
	}

	.lemurs-story :global(.step) {
		--vcsi-step-height: 200vh;
	}

	.story-prose {
		max-width: var(--vcsi-story-max-width);
		margin: var(--vcsi-space-2xl) auto;
	}

	.story > .introduction {
		max-width: calc(2 * var(--vcsi-story-max-width));
		display: grid;
		gap: var(--vcsi-space-lg);
		align-items: center;
	}

	.introduction-copy {
		min-width: 0;
	}

	.introduction-image {
		display: block;
		width: 100%;
		height: auto;
	}

	@media (min-width: 769px) {
		.story > .introduction {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		}
	}

	/* Scoped-global on the story's unique class so Svelte keeps the rule (it
	   prunes selectors whose static form it can't see) without leaking to other
	   stories. Add data-theme="dark" to the article to flip the whole piece. */
	:global(.lemurs-story[data-theme='dark']) {
		--lem-bg: #101216;
		--lem-surface: #171a1e;
		--lem-surface2: #1e2228;
		--lem-line: #333941;
		--lem-line-soft: #262b32;
		--lem-ink: #e8ebef;
		--lem-ink2: #b6bec8;
		--lem-muted: #808995;
		--lem-dot-rest: #3d434c;

		--lem-sleep: #3987e5;
		--lem-sleep-tint: #3a6ba6;
		--lem-sleep-ramp-lo: #1c5cab;
		--lem-sleep-ramp-hi: #cde2fb;
		--lem-nature: #199e70;
		--lem-nature-tint: #199e70;
		--lem-nature-ramp-lo: #143028;
		--lem-nature-ramp-hi: #6fd6a1;
		--lem-activity: #d95926;
		--lem-activity-tint: #d95926;
		--lem-anxiety: #9085e9;
		--lem-anxiety-tint: #6f6aa3;
		--lem-stress: #e66767;
		--lem-stress-tint: #f6b985;
	}

	/* ---- Chapter headers (full width, between scrolly sections) ----------- */
	/* `full-bleed` (scrolly-kit) stretches the band across the viewport. The band
	   is its own block, not a scroll step, so it doesn't sit over any chart. */
	.section-nav {
		position: sticky;
		top: 0;
		z-index: 90;
		height: var(--lemurs-section-nav-height);
		background: var(--lem-surface);
		color: var(--lem-ink);
		border-bottom: 1px solid var(--lem-line);
		box-shadow: 0 2px 6px color-mix(in srgb, var(--lem-ink) 8%, transparent);
	}

	.section-nav-inner {
		display: flex;
		align-items: stretch;
		gap: var(--vcsi-space-sm);
		width: 100%;
		max-width: var(--vcsi-page-max-width);
		height: 100%;
		margin-inline: auto;
		padding-inline: var(--vcsi-page-inline-padding);
		overflow-x: auto;
		scrollbar-width: thin;
	}

	.section-nav a {
		display: inline-flex;
		flex: 0 0 auto;
		align-items: center;
		padding-inline: var(--vcsi-space-sm);
		border-bottom: 3px solid transparent;
		color: inherit;
		font-size: var(--vcsi-font-size-small);
		font-weight: var(--vcsi-font-weight-semibold);
		text-decoration: none;
		white-space: nowrap;
		transition:
			color var(--vcsi-transition-base),
			border-color var(--vcsi-transition-base);
	}

	.section-nav a:hover,
	.section-nav a:focus-visible,
	.section-nav a.active {
		color: var(--section-hue);
		border-color: var(--section-hue);
	}

	.section-nav a:focus-visible {
		outline: 2px solid var(--section-hue);
		outline-offset: -4px;
	}

	.chapter-head {
		display: flex;
		justify-content: center;
		margin-block: 3.5rem 0;
		padding-block: 2.5rem;
		scroll-margin-top: var(--lemurs-section-nav-height);
		background: var(--lem-surface2);
		border-top: 3px solid var(--lem-hue);
		text-align: left;
	}

	.chapter-inner {
		width: 100%;
		max-width: var(--vcsi-story-max-width);
		display: flex;
		align-items: center;
		gap: var(--vcsi-space-lg);
	}

	.chapter-copy {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.chapter-image {
		width: clamp(6rem, 24vw, 12rem);
		height: auto;
		flex-shrink: 0;
	}

	.chapter-head .section-num {
		font-family: var(--vcsi-font-mono);
		font-size: var(--vcsi-font-size-xs);
		font-weight: var(--vcsi-font-weight-semibold);
		letter-spacing: 0.08em;
		color: var(--lem-hue);
	}

	.chapter-head .section-title {
		margin: 0;
		font-family: var(--vcsi-font-heading);
		font-weight: var(--vcsi-font-weight-bold);
		font-size: var(--vcsi-font-size-xl);
		line-height: 1;
		color: var(--lem-hue);
	}

	.chapter-head .section-intro {
		max-width: 62ch;
		margin: 0;
		font-size: var(--vcsi-font-size-small);
		line-height: var(--vcsi-line-height-relaxed);
		color: var(--lem-ink2);
	}

	@media (max-width: 768px) {
		.chapter-head {
			padding-block: 1.75rem;
		}
	}

	/* ---- Sources ---------------------------------------------------------- */
	.sources-note {
		max-width: var(--vcsi-story-max-width);
		margin: 3rem auto 0;
		border-top: 1px solid var(--lem-line);
		padding-top: 1.5rem;
	}

	.sources-note h2 {
		font-size: var(--vcsi-font-size-md);
		margin: 0 0 0.5rem;
	}

	.dek {
		font-size: var(--vcsi-font-size-small);
		color: var(--lem-muted);
		margin: 0 0 1rem;
	}

	.sources {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.sources li {
		font-size: var(--vcsi-font-size-xs);
		line-height: 1.4;
	}

	.sources .year {
		color: var(--lem-muted);
	}

	.sources .journal {
		display: block;
		color: var(--lem-ink2);
	}

	.sources .cohort {
		display: inline-block;
		margin-top: 0.15rem;
		font-size: 0.7rem;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--lem-muted);
	}
</style>
