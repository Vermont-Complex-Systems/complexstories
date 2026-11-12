<script>
	// One scrolly section of the lemurs story: a sticky visual beside/behind a
	// column of step boxes. The story splits into several of these, one per
	// theme, with a full-width section header between them (see Index.svelte).
	// Each chapter owns its own step index and its own measurements, so the
	// chart a chapter draws is sized against that chapter's panel.
	import { ScrollyContent } from '@the-vcsi/scrolly-kit';
	import UnitChart from './UnitChart.svelte';
	import Stat from './Stat.svelte';
	import SleepWindows from './SleepWindows/SleepWindows.svelte';
	import sleepWindowRows from './SleepWindows/sleepWindows.data.js';
	import SleepSignals from './SleepSignals/SleepSignals.svelte';
	import sleepSignalData from './SleepSignals/sleepSignals.data.js';
	import NatureLift from './NatureLift/NatureLift.svelte';
	import natureLiftData from './NatureLift/natureLift.data.js';

	let { steps = [], sources = {} } = $props();

	// undefined = neutral until the reader scrolls in (and again when it scrolls
	// out); step 0 of this chapter is what shows in that case.
	let step = $state(undefined);

	// The visual reads the whole active step object (mode, theme, data, stat).
	let active = $derived(steps[step ?? 0] ?? {});

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

<section class="fullscreen-layout">
	<div class="sticky-panel">
		<div class="visual-wrap" bind:clientHeight={panelHeight} bind:clientWidth={panelWidth}>
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
	</div>

	<ScrollyContent {steps} bind:value={step}>
		{#snippet contentRenderer(item)}
			<div class="step-inner">
				{#if item.kicker}<p class="kicker">{item.kicker}</p>{/if}
				{#if item.description}<p class="s-description">{item.description}</p>{/if}
				{#if item.caveat}<p class="s-caveat">{item.caveat}</p>{/if}
				{#if item.extras?.length}
					<ul class="s-extras">
						{#each item.extras as e, i (i)}<li>{e}</li>{/each}
					</ul>
				{/if}
				{#if item.source && sources?.[item.source]}
					{@const src = sources[item.source]}
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

<style>
	/* ---- Step boxes (the scrolling prose) --------------------------------- */
	.fullscreen-layout {
		--vcsi-story-step-bg: var(--lem-surface);
		--vcsi-story-step-fg: var(--lem-ink);
		--vcsi-story-step-bg-inactive: var(--lem-surface2);
		--vcsi-story-step-fg-inactive: var(--lem-muted);
		--vcsi-step-text-align: left;
		--vcsi-step-box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
		--vcsi-step-border-radius: 8px;
		/* The fullscreen layout owns the step width through its own token. */
		--vcsi-fullscreen-step-max-width: 520px;
	}

	/* ---- The sticky panel ------------------------------------------------- */
	/* In the fullscreen layout the panel is the whole viewport. The charts sit
	   in a centred, width-capped column so a wide screen doesn't inflate them.
	   Measurements are taken here — where the charts are actually drawn — so
	   each component's fit-to-panel math sees the same box it fills. */
	.visual-wrap {
		width: 100%;
		height: 100%;
		max-width: 720px;
		margin: 0 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		--lem-chart-max: 60vh;
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

	/* The purpose-built charts fill the column; only the stat rides centered
	   above them, so it sits over the chart rather than off at the margin. */
	.panel-visual :global(.stat) {
		justify-content: center;
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

	.kicker {
		margin: 0 0 0.4rem;
		font-size: var(--vcsi-font-size-xs);
		font-weight: var(--vcsi-font-weight-semibold);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--lem-muted);
	}

	.s-description {
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
</style>
