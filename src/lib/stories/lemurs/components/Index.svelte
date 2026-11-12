<script>
	import { Footer, StoryHeader } from '@the-vcsi/scrolly-kit';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import Chapter from './Chapter.svelte';

	let { story, data } = $props();

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
						theme: s.theme
					},
					steps: []
				});
			}
			out[out.length - 1].steps.push(s);
		}
		return out.filter((c) => c.head || c.steps.length);
	});

	let sources = $derived(Object.values(data.sources ?? {}));
</script>

<BackToHome />

<article class="story lemurs-story">
	<StoryHeader
		title={data.title}
		subtitle={data.subtitle}
		authors={data.authors}
		date={data.date}
	/>

	{#each chapters as chapter, i (chapter.head?.label ?? `intro-${i}`)}
		{#if chapter.head}
			<header class="chapter-head full-bleed" style="--lem-hue: var(--lem-{chapter.head.theme});">
				<div class="chapter-inner">
					<span class="section-num">{chapter.head.number}</span>
					<h2 class="section-title">{chapter.head.label}</h2>
					{#if chapter.head.intro}
						<p class="section-intro">{chapter.head.intro}</p>
					{/if}
				</div>
			</header>
		{/if}
		<Chapter steps={chapter.steps} sources={data.sources ?? {}} />
	{/each}

	<section class="sources-note">
		<h2>Sources</h2>
		<p class="dek">
			Every figure above is drawn from the LEMURS study's published papers. Percentages are shares
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
		--lem-stress-tint: #e34948;

		/* map the palette onto the scrolly-kit story tokens */
		--vcsi-story-bg: var(--lem-bg);
		--vcsi-story-fg: var(--lem-ink);
	}

	.lemurs-story :global(.step) {
		--vcsi-step-height: 200vh;
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
		--lem-stress-tint: #e66767;
	}

	/* ---- Chapter headers (full width, between scrolly sections) ----------- */
	/* `full-bleed` (scrolly-kit) stretches the band across the viewport. The band
	   is its own block, not a scroll step, so it doesn't sit over any chart. */
	.chapter-head {
		display: flex;
		justify-content: center;
		margin-block: 3.5rem 0;
		padding-block: 2.5rem;
		background: var(--lem-surface2);
		border-top: 3px solid var(--lem-hue);
		text-align: left;
	}

	.chapter-inner {
		width: 100%;
		max-width: var(--vcsi-story-max-width);
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
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
