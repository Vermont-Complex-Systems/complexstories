<script>
	import { Footer, StoryHeader, ScrollyContent } from '@the-vcsi/scrolly-kit';
	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import UnitChart from './UnitChart.svelte';
	import Stat from './Stat.svelte';
	import SleepWindows from './SleepWindows/SleepWindows.svelte';
	import sleepWindowRows from './SleepWindows/sleepWindows.data.js';
	import SleepSignals from './SleepSignals/SleepSignals.svelte';
	import sleepSignalData from './SleepSignals/sleepSignals.data.js';
	import NatureLift from './NatureLift/NatureLift.svelte';
	import natureLiftData from './NatureLift/natureLift.data.js';

	let { story, data } = $props();

	// One $state for this scrolly section. undefined = neutral until the reader
	// scrolls in (and again when it scrolls out); step 0 is the neutral cohort.
	let step = $state(undefined);

	// The scrolling column: every step, with a section header slotted in before
	// any step that opens a theme (`section` in copy.json). A header is its own
	// scroll item but doesn't change the chart — it holds the previous step's
	// visual, so every re-sort still lands on the step box that explains it.
	let items = $derived.by(() => {
		const out = [];
		let n = 0;
		(data.steps ?? []).forEach((s, i) => {
			if (s.section) {
				n += 1;
				out.push({
					kind: 'section',
					label: s.section,
					number: String(n).padStart(2, '0'),
					theme: s.theme,
					visual: data.steps[i - 1] ?? s
				});
			}
			out.push({ ...s, visual: s });
		});
		return out;
	});

	// The visual reads the whole active step object (mode, theme, data, stat).
	let active = $derived(items[step ?? 0]?.visual ?? {});

	let sources = $derived(Object.values(data.sources ?? {}));

	// The sleep-windows chart sizes itself from its width, which leaves it short
	// enough to disappear behind the step box on a phone. The layout owns the
	// panel's height, so measure it and hand the chart what's left under the
	// stat and legend. 0 before measurement (and on the server) = its own default.
	let panelHeight = $state(0);
	let panelWidth = $state(0);
	let sleepWindowsHeight = $derived(panelHeight ? Math.max(360, panelHeight - 96) : null);

	// SleepSignals and NatureLift lay themselves out from their own width, and
	// below about 620px NatureLift stacks its four panels into one column over
	// 1000px tall — taller than any sticky panel. So hand them a roomier design
	// width than the panel really has and scale the result down to fit: they keep
	// choosing their wide layout, and it lands inside the panel. A phone-width
	// panel is left alone (scaling there would shrink the type past reading).
	const DESIGN_WIDTH = 680;
	let fitWidth = $derived(panelWidth >= 520 ? DESIGN_WIDTH : panelWidth || DESIGN_WIDTH);
	let fitNaturalHeight = $state(0);
	let viewportHeight = $state(0);

	// Width sets the scale, but the chart also has to clear the viewport: on a
	// phone NatureLift's four stacked panels run past the screen, and a cropped
	// chart is worse than a small one. Scaling never changes the measured height
	// (a transform doesn't touch layout), so this can't feed back on itself.
	let fitScale = $derived.by(() => {
		const byWidth = panelWidth ? panelWidth / fitWidth : 1;
		const byHeight =
			viewportHeight && fitNaturalHeight ? (viewportHeight - 48) / fitNaturalHeight : 1;
		return Math.min(1, byWidth, byHeight);
	});

	// Scaling from the top-left keeps the arithmetic simple, so re-centre by hand
	// whenever the height clamp leaves the drawn chart narrower than the panel.
	let fitOffset = $derived(Math.max(0, (panelWidth - fitWidth * fitScale) / 2));
</script>

<svelte:window bind:innerHeight={viewportHeight} />

<BackToHome />

<article class="story lemurs-story">
	<StoryHeader
		title={data.title}
		subtitle={data.subtitle}
		authors={data.authors}
		date={data.date}
	/>

	<section class="split-layout">
		<div class="sticky-panel" bind:clientHeight={panelHeight} bind:clientWidth={panelWidth}>
			{#if active.visual}
				<!-- Some steps leave the dot field for a purpose-built chart. The step
				     names the component and the view in copy.json; the controls stay
				     hidden because the scroll position is what drives the view. -->
				<figure class="panel-visual" style="--lem-hue: var(--lem-{active.theme});">
					<Stat stat={active.stat} />
					{#if active.visual.component === 'sleepWindows'}
						<SleepWindows
							data={sleepWindowRows}
							sortBy="midpoint"
							layout="radial"
							height={sleepWindowsHeight}
							showControls={false}
							showStats={false}
							showTable={false}
							ariaLabel="Each participant's average sleep window over Thanksgiving week, drawn on a 24-hour clock face as one ring per student, sorted by sleep midpoint from the centre outward. The median midpoint falls at 5 AM."
						/>
					{:else}
						<div class="fit" style="height: {Math.round(fitNaturalHeight * fitScale)}px">
							<div
								class="fit-inner"
								bind:clientHeight={fitNaturalHeight}
								style="width: {fitWidth}px; transform: translateX({fitOffset}px) scale({fitScale});"
							>
								{#if active.visual.component === 'sleepSignals'}
									<SleepSignals
										data={sleepSignalData}
										view={active.visual.view}
										arcs={active.visual.arcs}
										showControls={false}
									/>
								{:else if active.visual.component === 'natureLift'}
									<NatureLift
										data={natureLiftData}
										view={active.visual.view}
										emphasis={active.visual.emphasis ?? null}
										showWeekly={active.visual.weekly ?? true}
										showControls={false}
									/>
								{/if}
							</div>
						</div>
					{/if}
				</figure>
			{:else}
				<UnitChart step={active} />
			{/if}
		</div>

		<ScrollyContent steps={items} bind:value={step}>
			{#snippet contentRenderer(item)}
				{#if item.kind === 'section'}
					<header class="section-head" style="--lem-hue: var(--lem-{item.theme});">
						<span class="section-num">{item.number}</span>
						<h2 class="section-title">{item.label}</h2>
					</header>
				{:else}
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
				{/if}
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

	/* ---- Panels that aren't the dot field ---------------------------------
	   Each of these components declares its own --xx-* tokens on its own root,
	   so a value inherited from this wrapper would lose to them (the READMEs'
	   parent-override examples don't take). Re-declare them on those elements
	   instead, mapped onto the LEMURS palette so all three follow the story —
	   dark override included — rather than their own built-in themes. */
	.panel-visual {
		margin: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		gap: var(--vcsi-space-md);
	}

	/* The scaled wrapper: the inner box keeps its full design width and is drawn
	   smaller, so the outer box only needs the height that actually shows. No
	   overflow rule — a transform paints nothing outside the scaled result, and
	   clipping here would cut off the charts' own hover readouts. */
	.fit {
		width: 100%;
	}

	.fit-inner {
		transform-origin: top left;
	}

	.panel-visual :global(.sw) {
		--sw-surface: var(--lem-surface);
		--sw-ink: var(--lem-ink);
		--sw-ink2: var(--lem-ink2);
		--sw-muted: var(--lem-muted);
		--sw-grid: var(--lem-line-soft);
		--sw-axis: var(--lem-line);
		--sw-ring: var(--lem-line);
		--sw-night: color-mix(in srgb, var(--lem-sleep) 8%, transparent);
		--sw-lo: var(--lem-sleep-ramp-lo);
		--sw-hi: var(--lem-sleep-ramp-hi);
		--sw-mid: var(--lem-ink);
		--sw-accent: var(--lem-activity);
		--sw-font: var(--vcsi-font-sans);
		--sw-mono: var(--vcsi-font-mono);
	}

	.panel-visual :global(.ss) {
		--ss-surface: var(--lem-surface);
		--ss-ink: var(--lem-ink);
		--ss-ink2: var(--lem-ink2);
		--ss-muted: var(--lem-muted);
		--ss-grid: var(--lem-line-soft);
		--ss-axis: var(--lem-line);
		--ss-ring: var(--lem-line);
		/* minute grid ramp and minute-profile bars, on the sleep hue */
		--ss-lo: var(--lem-surface2);
		--ss-hi: var(--lem-sleep-ramp-hi);
		--ss-bar: var(--lem-sleep-tint);
		--ss-bar-alarm: var(--lem-sleep);
		/* the two heart-rate arcs: late trough is the finding, early is the foil */
		--ss-s1: var(--lem-sleep);
		--ss-s2: var(--lem-activity);
		--ss-spread: var(--lem-muted);
		--ss-accent: var(--lem-activity);
		--ss-font: var(--vcsi-font-sans);
		--ss-mono: var(--vcsi-font-mono);
	}

	.panel-visual :global(.nl) {
		--nl-surface: var(--lem-surface);
		--nl-ink: var(--lem-ink);
		--nl-ink2: var(--lem-ink2);
		--nl-muted: var(--lem-muted);
		--nl-grid: var(--lem-line-soft);
		--nl-axis: var(--lem-line);
		--nl-ring: var(--lem-line);
		--nl-trt: color-mix(in srgb, var(--lem-ink) 4%, transparent);
		/* the four trial groups; nature is the story's own green */
		--nl-control: var(--lem-sleep);
		--nl-exercise: var(--lem-activity);
		--nl-nature: var(--lem-nature);
		--nl-therapy: var(--lem-anxiety);
		--nl-avg: var(--lem-muted);
		--nl-accent: var(--lem-activity);
		--nl-map-lo: var(--lem-nature-ramp-lo);
		--nl-map-hi: var(--lem-nature-ramp-hi);
		--nl-font: var(--vcsi-font-sans);
		--nl-mono: var(--vcsi-font-mono);
	}

	/* ---- Section headers (one before each theme) ------------------------- */
	/* A header is its own scroll item. Shorten it, and on desktop drop its box so
	   it reads as a chapter break rather than another step. On mobile the box
	   stays: the header scrolls over the dot field and needs the backing. */
	.split-layout :global(.step:has(.section-head)) {
		min-height: 50vh;
	}

	@media (min-width: 769px) {
		.split-layout :global(.step:has(.section-head)) {
			--vcsi-story-step-bg: transparent;
			--vcsi-story-step-bg-inactive: transparent;
			--vcsi-step-box-shadow: none;
		}
	}

	.section-head {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		padding-top: 0.75rem;
		border-top: 3px solid var(--lem-hue);
		text-align: left;
		transition: opacity 400ms ease;
	}

	:global(.step:not(.active)) .section-head {
		opacity: 0.45;
	}

	.section-head .section-num {
		font-family: var(--vcsi-font-mono);
		font-size: var(--vcsi-font-size-xs);
		font-weight: var(--vcsi-font-weight-semibold);
		letter-spacing: 0.08em;
		color: var(--lem-hue);
	}

	.section-head .section-title {
		margin: 0;
		font-family: var(--vcsi-font-heading);
		font-weight: var(--vcsi-font-weight-bold);
		font-size: var(--vcsi-font-size-xl);
		line-height: 1;
		color: var(--lem-hue);
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
