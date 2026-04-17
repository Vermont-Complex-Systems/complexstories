<script>
    import * as d3 from "d3";
    import { base } from "$app/paths";
    import { browser } from '$app/environment';
    import { fade, fly } from 'svelte/transition';
    import { innerWidth } from 'svelte/reactivity/window';
    import { Diamond, Legend, DivergingBarChart, Dashboard } from 'allotaxonometer-ui';
    import { combElems, rank_turbulence_divergence, diamond_count, wordShift_dat, balanceDat } from 'allotaxonometer-ui';

    import { setContext } from 'svelte';
    import { RenderContent, ScrollyContent, StoryHeader, MarkdownRenderer as Md } from '@the-vcsi/scrolly-kit';

	import BackToHome from '$lib/components/helpers/BackToHome.svelte';
	import Footer from '$lib/components/Footer.svelte';

    import BarChartRank1980 from './BarChartRank1980.svelte';
    import BarChartRank2023 from './BarChartRank2023.svelte';
    import Slider from './Slider.svelte';
    import ToggleSex from './ToggleSex.svelte';

    const components = { BarChartRank1980, BarChartRank2023 };

    import boys1980 from '../data/boys-qc-1980.json';
    import boys2023 from '../data/boys-qc-2023.json';
    import girls1980 from '../data/girls-qc-1980.json';
    import girls2023 from '../data/girls-qc-2023.json';

    const datasets = {
        girls: { sys1: girls1980, sys2: girls2023, title: ['Girls 1980', 'Girls 2023'] },
        boys:  { sys1: boys1980,  sys2: boys2023,  title: ['Boys 1980', 'Boys 2023'] }
    };

    let { story, data } = $props();

    let scrollyIndex = $state();
    let isGirls = $state(true);

    let steps = $derived(isGirls ? data.stepsGirls : data.stepsBoys);

    // Filter ContentItems by current sex; items with no `sex` field are shown always.
    let currentSex = $derived(isGirls ? 'girls' : 'boys');
    let forSex = $derived((items) => items.filter((i) => !i.sex || i.sex === currentSex));

    let isMobile = $derived(innerWidth.current <= 768);

    let currentDataset = $derived(isGirls ? datasets.girls : datasets.boys);
    let sys1 = $derived(currentDataset.sys1);
    let sys2 = $derived(currentDataset.sys2);
    let title = $derived(currentDataset.title);

    // Expose reactive sys1/sys2 to propless sub-components (BarChartRank1980/2023)
    // rendered by RenderContent. Getters preserve reactivity across context reads.
    setContext('allotax', {
        get sys1() { return sys1; },
        get sys2() { return sys2; }
    });

	// Allotax setup
	// We expose the subcomponents to construct the dashboard plot by plot.
    let alpha = $state(0.58);
    const alphas = d3.range(0,18).map(v => +(v/12).toFixed(2)).concat([1, 2, 5, Infinity]);
    let alphaIndex = $state(7);

    let DiamondHeight = 600;
    let DiamondWidth = DiamondHeight;
    let marginInner = 160;
    let marginDiamond = 40;

    let me = $derived(sys1 && sys2 ? combElems(sys1, sys2) : null);
    let rtd = $derived(me ? rank_turbulence_divergence(me, alpha) : null);
    let dat = $derived(me && rtd ? diamond_count(me, rtd) : null);

    let barData = $derived(me && dat ? wordShift_dat(me, dat).slice(0, 30) : []);
    let max_shift = $derived(barData.length > 0 ? d3.max(barData, d => Math.abs(d.metric)) : 1);
    let balanceData = $derived(sys1 && sys2 ? balanceDat(sys1, sys2) : []);
    let maxlog10 = $derived(me ? Math.ceil(d3.max([Math.log10(d3.max(me[0].ranks)), Math.log10(d3.max(me[1].ranks))])) : 0);
    let max_count_log = $derived(dat ? Math.ceil(Math.log10(d3.max(dat.counts, d => d.value))) + 1 : 2);
    let isDataReady = $derived(dat && barData && balanceData && me && rtd);

    $effect(() => { alpha = alphas[alphaIndex]; });

	// Effective steps logic to move up and down across scrolly transitions
    let maxStepReached = $state(0);
    let hasStartedScrolly = $derived(maxStepReached > 0);

    $effect(() => {
        if (scrollyIndex !== undefined) {
            maxStepReached = Math.max(maxStepReached, scrollyIndex);
        }
    });

    let delta_sum = $derived(dat ? d3.sum(dat.deltas.map(d => +d)).toFixed(3) : '0.000');
    let math = $derived(`$D_{\\alpha}^R (\\Omega_1 || \\Omega_2 = ${delta_sum})$\n$\\propto \\sum_\\tau | \\frac{1}{r_{\\tau,1}^{${alpha == 'Infinity' ? '\\infty' : alpha}}} - \\frac{1}{r_{\\tau,2}^{${alpha == 'Infinity' ? '\\infty' : alpha}}} |$`);

    let effectiveStep = $derived(
        scrollyIndex !== undefined
            ? scrollyIndex
            : hasStartedScrolly
                ? maxStepReached
                : 0
    );

	// We are not even gonna try to have the ineractive viz working on mobile
	// We use screenshots
    let mobileImageGender = $derived(isGirls ? 'girl' : 'boy');
    let mobileImageStep = $derived(scrollyIndex !== undefined ? Math.min(scrollyIndex, 2) : 0);

    let renderedData = $derived.by(() => {
        if (!dat || !barData) return null;
        switch (effectiveStep) {
            case 0:
                return {
                    ...dat,
                    counts: dat.counts.map(d => ({
                        ...d,
                        x1: Math.ceil(d.coord_on_diag),
                        y1: Math.ceil(d.coord_on_diag),
                        types: ""
                    }))
                };
            case 1:
                return {
                    ...dat,
                    counts: dat.counts.map(d => ({
                        ...d,
                        x1: d.which_sys === "right" ? Math.ceil(d.coord_on_diag) : d.x1,
                        y1: d.which_sys === "right" ? Math.ceil(d.coord_on_diag) : d.y1,
                        types: d.which_sys === "right" ? "" : d.types,
                        value: d.which_sys === "right" ? 0 : d.value
                    }))
                };
            default:
                return dat;
        }
    });
</script>

<article id="allotaxonometer-story" class="story" class:girls-mode={isGirls} class:boys-mode={!isGirls}>

<BackToHome />

<div class="story-toggle">
    <ToggleSex bind:isGirls />
</div>

<StoryHeader
    title={data.title}
    subtitle={data.subtitle}
    authors={data.authors}
    date={data.date}
    class="left"
/>

<section id="intro">
    <RenderContent items={forSex(data.intro)} {components} />
</section>

<section class="split-layout" id="allotax-walkthrough">
    <div class="sticky-panel">
        {#if isMobile}
            <div class="mobile-chart-image">
                <img
                    src="{base}/common/assets/screenshots/allotax-scrolly-{mobileImageGender}-{mobileImageStep}.jpg"
                    alt="Allotaxonometer step {mobileImageStep} — {mobileImageGender} baby names, Quebec"
                    loading="lazy"
                />
            </div>
        {:else if browser && isDataReady && renderedData}
            <div class="visualization-container">
                <div class="diamondplot">
                    <Diamond
                        dat={renderedData}
                        {alpha}
                        divnorm={rtd.normalization}
                        {title}
                        {maxlog10}
                        {DiamondHeight}
                        {marginInner}
                        {marginDiamond}
                    />
                </div>

                {#if effectiveStep >= 1}
                    <div class="additional-charts" in:fade={{ duration: 800, delay: 300 }}>
                        <div class="legend-container" in:fly={{ x: -50, duration: 600, delay: 500 }}>
                            <Legend
                                diamond_dat={dat.counts}
                                max_count_log={max_count_log || 5}
                            />
                        </div>

                        <div class="balance-container" style="opacity: {effectiveStep >= 2 ? 1 : 0};">
                            <DivergingBarChart
                                data={balanceData}
                                DiamondHeight={DiamondHeight}
                                DiamondWidth={DiamondWidth}
                            />
                        </div>
                    </div>
                {/if}
            </div>
        {/if}
    </div>

    <div class="scrolly-content">
        <ScrollyContent {steps} bind:value={scrollyIndex} topSpacer={false} bottomSpacer={false} />
    </div>
</section>

<section id="full-picture">
    <h2>The full picture</h2>
    <RenderContent items={forSex(data.fullPicture)} />
</section>

{#if isMobile}
    <div class="mobile-dashboard-image">
        <img
            src="{base}/common/assets/screenshots/allotax-scrolly-{mobileImageGender}-dashboard.jpg"
            alt="Complete allotaxonometer dashboard for {mobileImageGender} baby names analysis"
            loading="lazy"
        />
    </div>
    <p class="mobile-note"><em>Note: The interactive α slider is available on desktop for exploring different parameter values.</em></p>
{:else if browser}
    <section class="dashboard-section">
        <div class="dashboard-container">
            <div class="math-overlay">
                <Md text={math} />
            </div>

            <Dashboard
                {dat}
                {alpha}
                divnorm={rtd?.normalization || 1}
                {barData}
                {balanceData}
                {title}
                {maxlog10}
                {max_count_log}
                width={Math.min((innerWidth.current || 1440) - 40, 1400)}
                {DiamondHeight}
                {DiamondWidth}
                {marginInner}
                {marginDiamond}
                xDomain={[-max_shift * 1.5, max_shift * 1.5]}
                class="dashboard"
            />

            <div class="slider-wrapper">
                <Slider bind:alphaIndex {alphas} />
            </div>
        </div>
    </section>
{/if}

<section>
    <RenderContent items={forSex(data.afterAlpha)} />
    <RenderContent items={data.foundational} />
</section>

<section class="prose appendix">
    <RenderContent items={data.appendix} />
</section>

</article>

<Footer />

<style>
    #allotaxonometer-story {
        --vcsi-story-max-width: 900px;
        --vcsi-story-bg: whitesmoke;
    }

    .story-toggle {
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 100;
    }

    /* Left-align the StoryHeader content (default is centered). The
       `class="left"` prop is forwarded to the <header class="story-header ..."> */
    :global(#allotaxonometer-story .story-header.left),
    :global(#allotaxonometer-story .story-header.left .article-meta) {
        text-align: left;
    }

    :global(#allotaxonometer-story .story-header.left .article-meta) {
        margin-inline: 0;
    }

    /* All inline highlight spans (.year-1980, .year-2023, .gender-text) come
       from copy.json via RenderContent/MarkdownRenderer, so they render
       outside this component's scoped DOM — hence :global(). */
    :global(#allotaxonometer-story .year-1980),
    :global(#allotaxonometer-story .year-2023),
    :global(#allotaxonometer-story .gender-text) {
        font-weight: 600;
        padding: 0.1rem 0.3rem;
        border-radius: 0.25rem;
    }

    :global(#allotaxonometer-story .year-1980) {
        background: rgb(230, 230, 230);
        color: #374151;
        font-family: var(--mono);
    }

    :global(#allotaxonometer-story .year-2023) {
        background: rgb(195, 230, 243);
        color: #0f172a;
        font-family: var(--mono);
    }

    :global(#allotaxonometer-story .gender-text) {
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 3px;
        transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
    }

    :global(#allotaxonometer-story .gender-text.girls) {
        color: #be185d;
        text-decoration-color: #ec4899;
        background: rgba(236, 72, 153, 0.1);
    }

    :global(#allotaxonometer-story .gender-text.boys) {
        color: #1e40af;
        text-decoration-color: #3b82f6;
        background: rgba(59, 130, 246, 0.1);
    }

    :global(#allotaxonometer-story .name-highlight) {
        font-weight: 600;
        padding: 0.1rem 0.3rem;
        border-radius: 0.25rem;
        text-decoration: underline;
        text-decoration-thickness: 2px;
        text-underline-offset: 3px;
    }

    :global(#allotaxonometer-story .name-highlight.girls) {
        background: rgba(236, 72, 153, 0.1);
        color: #be185d;
        text-decoration-color: #ec4899;
    }

    :global(#allotaxonometer-story .name-highlight.boys) {
        background: rgba(59, 130, 246, 0.1);
        color: #1e40af;
        text-decoration-color: #3b82f6;
    }

    /* Scrolly section — uses the skill's .split-layout but with three
       deliberate overrides to match the original design:
       1. Panel width → 40% (original had width:40%).
       2. Panel height → auto + align-items:flex-start, so the diamond +
          additional-charts column grows naturally instead of being clipped
          into the default min(80vh, 600px) flex-centered box.
       3. Step boxes → transparent/no-shadow so steps read as plain prose
          (original scrolly used raw paragraphs, not boxed steps). */
    .split-layout {
        max-width: var(--vcsi-page-max-width);
        margin-inline: auto;
        --vcsi-panel-width: 45%;
        --vcsi-panel-min-width: 800px;
        --vcsi-layout-gap: 1rem;
        --vcsi-step-max-width: 420px;
        --vcsi-step-height: 70vh;
        --vcsi-step-text-align: left;
    }

    @media (max-width: 768px) {
        .split-layout {
            --vcsi-step-height: 160vh;
        }
    }

    /* Desktop-only overrides:
       - Transparent step boxes (plain-prose look, matches the original story).
       - .sticky-panel becomes a plain block so the diamond's min-width:600px
         and additional-charts' margins can bleed right of the 40% panel.
       Mobile (< 769px) keeps scrolly-kit's defaults: boxed steps overlay a
       full-viewport flex-centered sticky panel — which is what we want for
       the screenshot image on small screens. */
    @media (min-width: 769px) {
        .split-layout {
            --vcsi-step-padding: 0;
            --vcsi-step-border-radius: 0;
            --vcsi-step-box-shadow: none;
            --vcsi-story-step-bg: transparent;
            --vcsi-story-step-bg-inactive: transparent;
            --vcsi-story-step-fg-inactive: var(--vcsi-story-fg);
        }

        .split-layout .sticky-panel {
            display: block;
            height: auto;
            overflow: visible;
            top: calc(50vh - 350px);
        }
    }

    .mobile-chart-image {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        max-width: 90vw;
        margin: 0 auto;
    }

    .mobile-chart-image img {
        width: 100%;
        height: auto;
        max-height: 60vh;
        object-fit: contain;
    }


    .mobile-dashboard-image {
        width: 100%;
        margin: 2rem 0;
        display: flex;
        justify-content: center;
        padding: 0 1rem;
        box-sizing: border-box;
    }

    .mobile-dashboard-image img {
        width: 90vw;
        height: auto;
        max-width: 90vw;
        object-fit: contain;
    }

    .visualization-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    .diamondplot {
        flex: 0 0 auto;
        display: flex;
        justify-content: center;
        align-items: center;
        min-width: 600px;
        min-height: 600px;
    }

    /* scrolly-kit's reset.css applies `svg { max-width: 100% }` which would
       shrink the 600px diamond when the panel is narrower. The original
       project had no such reset, so we opt the allotax charts out. */
    .visualization-container :global(svg) {
        max-width: none;
    }

    .additional-charts {
        display: flex;
        gap: 13rem;
        justify-content: center;
        margin-top: 2rem;
		margin-left: 8rem;
    }

    .legend-container,
    .balance-container {
        display: flex;
        justify-content: center;
        align-items: flex-start;
    }

    .balance-container {
        transition: opacity 600ms ease;
    }

    .diamondplot :global(rect),
    .diamondplot :global(text) {
        transition:
            x 700ms cubic-bezier(0.76, 0, 0.24, 1),
            y 700ms cubic-bezier(0.76, 0, 0.24, 1),
            fill 700ms cubic-bezier(0.76, 0, 0.24, 1),
            width 700ms cubic-bezier(0.76, 0, 0.24, 1),
            height 700ms cubic-bezier(0.76, 0, 0.24, 1),
            opacity 700ms cubic-bezier(0.76, 0, 0.24, 1);
    }

    /* Break out of the .story prose-width constraint (max-width:
       --vcsi-story-max-width applied by layouts.css to direct section
       children) — same pattern the built-in layout classes use. */
    .dashboard-section {
        max-width: none;
        width: 100vw;
        margin-left: calc(-50vw + 50%);
        padding: 4rem 2rem 2rem 2rem;
        text-align: center;
    }

    /* scrolly-kit's reset applies `svg { max-width: 100% }`, which makes
       Dashboard's internal SVGs shrink to the column width and wrap. Opt
       out for everything inside the dashboard. */
    .dashboard-section :global(svg) {
        max-width: none;
    }

    .dashboard-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 90vh;
        gap: 2rem;
        padding: 2rem;
        position: relative;
        max-width: 1400px;
        margin: 0 auto;
        background: var(--vcsi-color-white);
        border-radius: 12px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12), 0 4px 8px rgba(0, 0, 0, 0.08);
        border: 1px solid var(--vcsi-border);
    }

    .math-overlay {
        position: absolute;
        top: 6rem;
        left: 3rem;
        z-index: 2;
        background: var(--vcsi-color-white);
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--vcsi-border);
        max-width: 200px;
        overflow: hidden;
        line-height: 1.2;
        pointer-events: none;
    }

    .math-overlay :global(.katex) {
        font-size: 0.9em !important;
    }

    .slider-wrapper {
        width: 100%;
        max-width: 400px;
        display: flex;
        justify-content: center;
    }

    .mobile-note {
        text-align: center;
        font-size: 14px;
        color: var(--vcsi-fg);
        opacity: 0.7;
        margin: 1rem 0;
        padding: 0.5rem;
        background: var(--vcsi-bg);
        border-radius: 4px;
    }

    @media (max-width: 1200px) {
        .additional-charts {
            flex-direction: column;
            gap: 1rem;
            margin-left: 0;
            align-items: center;
        }
    }

</style>
