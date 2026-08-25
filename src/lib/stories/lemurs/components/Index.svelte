<script>
	import { Footer, StoryHeader, ScrollyContent } from '@the-vcsi/scrolly-kit';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import UnitChart from './UnitChart.svelte';

	let { story, data } = $props();

	// One $state for this scrolly section. undefined = neutral until the reader
	// scrolls in (and again when it scrolls out); step 0 is the neutral cohort.
	let step = $state(undefined);

	// The visual reads the whole active step object (mode, theme, data, stat).
	let active = $derived(data.steps?.[step ?? 0] ?? {});

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

	<section class="split-layout">
		<div class="sticky-panel">
			<UnitChart step={active} />
		</div>

		<ScrollyContent steps={data.steps} bind:value={step}>
			{#snippet contentRenderer(item)}
				<div class="step-inner">
					{#if item.kicker}<p class="kicker">{item.kicker}</p>{/if}
					{#if item.title}<h2 class="s-title">{item.title}</h2>{/if}
					{#if item.body}<p class="s-body">{item.body}</p>{/if}
					{#if item.caveat}<p class="s-caveat">{item.caveat}</p>{/if}
					{#if item.extras?.length}
						<ul class="s-extras">
							{#each item.extras as e, i (i)}<li>{e}</li>{/each}
						</ul>
					{/if}
					{#if item.source && data.sources?.[item.source]}
						{@const src = data.sources[item.source]}
						<p class="s-source">
							<span class="src-label">Source</span>
							<span class="src-name">{src.short}</span>
							<span class="src-journal">{src.journal}</span>
						</p>
					{/if}
				</div>
			{/snippet}
		</ScrollyContent>
	</section>

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
		--lem-nature: #1baf7a;
		--lem-nature-tint: #1baf7a;
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
		--lem-nature: #199e70;
		--lem-nature-tint: #199e70;
		--lem-activity: #d95926;
		--lem-activity-tint: #d95926;
		--lem-anxiety: #9085e9;
		--lem-anxiety-tint: #6f6aa3;
		--lem-stress: #e66767;
		--lem-stress-tint: #e66767;
	}

	/* ---- Step boxes (the scrolling prose) --------------------------------- */
	.split-layout {
		--vcsi-story-step-bg: var(--lem-surface);
		--vcsi-story-step-fg: var(--lem-ink);
		--vcsi-story-step-bg-inactive: var(--lem-surface2);
		--vcsi-story-step-fg-inactive: var(--lem-muted);
		--vcsi-step-text-align: left;
		--vcsi-step-box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		--vcsi-step-border-radius: 8px;
		--vcsi-step-max-width: 520px;
	}

	.step-inner {
		text-align: left;
	}

	.kicker {
		margin: 0 0 0.4rem;
		font-size: var(--vcsi-font-size-xs);
		font-weight: var(--vcsi-font-weight-semibold);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--lem-muted);
	}

	.s-title {
		margin: 0 0 0.6rem;
		font-size: var(--vcsi-font-size-md);
		line-height: var(--vcsi-line-height-snug);
	}

	.s-body {
		margin: 0;
		font-size: var(--vcsi-font-size-small);
		line-height: var(--vcsi-line-height-relaxed);
	}

	.s-caveat {
		margin: 0.75rem 0 0;
		padding-left: 0.75rem;
		border-left: 2px solid var(--lem-line);
		font-size: var(--vcsi-font-size-xs);
		color: var(--lem-muted);
	}

	.s-extras {
		margin: 0.85rem 0 0;
		padding-left: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.2rem;
		list-style: none;
	}

	.s-extras li {
		position: relative;
		padding-left: 0.9rem;
		font-family: var(--vcsi-font-mono);
		font-size: 0.78rem;
		color: var(--lem-ink2);
	}

	.s-extras li::before {
		content: '';
		position: absolute;
		left: 0;
		top: 0.55em;
		width: 4px;
		height: 4px;
		border-radius: 50%;
		background: var(--lem-line);
	}

	.s-source {
		margin: 0.9rem 0 0;
		padding-top: 0.6rem;
		border-top: 1px solid var(--lem-line-soft);
		font-size: var(--vcsi-font-size-xs);
		line-height: 1.4;
		color: var(--lem-muted);
	}

	.src-label {
		display: inline-block;
		margin-right: 0.4rem;
		font-size: 0.65rem;
		font-weight: var(--vcsi-font-weight-semibold);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--lem-muted);
	}

	.src-name {
		font-weight: var(--vcsi-font-weight-semibold);
		color: var(--lem-ink2);
	}

	.src-journal::before {
		content: ' · ';
		color: var(--lem-line);
	}

	.src-journal {
		color: var(--lem-muted);
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
