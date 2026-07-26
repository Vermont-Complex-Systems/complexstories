<script>
    import { scaleSequential, scaleLinear, scaleOrdinal } from 'd3-scale';
    import { interpolateRdYlGn } from 'd3-scale-chromatic';
    import { extent } from 'd3-array';
    
    import TrustDistributionChart from './TrustDistributionChart.svelte';
    import ACESSlider from './ACESSlider.svelte';
    import TrustSonification from './TrustSonification.svelte';
    import { institutionColorMap, getInstitutionColor } from '../utils/institutionColors.js';


    let {
        data,
        scrollyIndex,
        width,
        height,
        isStorySection = false,
        isDashboard = false,
        conclusionVisible = false,
        externalCategory = undefined,
        externalHighlight = undefined,
        onInstitutionClick = undefined,
        showACESSlider = false,
        acesValue = $bindable(0)
    } = $props();

    let sonificationData = $state([]);

    $effect(() => {
        scrollyIndex;
        sonificationData = Array.isArray(data) ? [...data] : [];
    });

    // One render config per step — derive, don't react.
    // Available demographic values in new format:
    // - Dem_Gender_Woman, Dem_Gender_Man, Dem_Gender_Other
    // - ACES_0.0 … ACES_5.25+ (ACES_Compound exists in data but not used in storytelling)
    const stepConfig = $derived.by(() => {
        switch (scrollyIndex) {
            // missing cases default to Dem_Gender_Woman baseline
            case 1:  return { category: 'Dem_Gender_Woman', highlight: 'TP_Platform', aces: null };
            case 2:  return { category: 'Dem_Gender_Woman', highlight: 'TP_Platform', aces: null };
            case 3:  return { category: 'Dem_Gender_Man',   highlight: 'TP_Platform', aces: null };
            case 4:  return { category: 'Dem_Gender_Woman', highlight: '',            aces: null };
            case 5:  return { category: 'Dem_Gender_Woman', highlight: 'TP_Medical',  aces: null };
            case 6:  return { category: 'Dem_Gender_Man',   highlight: 'TP_Medical',  aces: null };
            case 7:  return { category: 'Dem_Gender_Woman', highlight: '',            aces: null };
            case 8:  return { category: 'Dem_Gender_Man',   highlight: 'TP_Police',   aces: null };
            case 9:  return { category: 'Dem_Gender_Other', highlight: 'TP_Police',   aces: null };
            case 10: return { category: 'Dem_Gender_Woman', highlight: '',            aces: null };
            case 11: return { category: 'ACES_0.0',   highlight: 'TP_Relative', aces: 0.0 };
            case 12: return { category: 'ACES_1.25',  highlight: 'TP_Relative', aces: 1.25 };
            case 13: return { category: 'ACES_2.25',  highlight: 'TP_Relative', aces: 2.25 };
            case 14: return { category: 'ACES_4.25',  highlight: 'TP_Relative', aces: 4.25 };
            case 15: return { category: 'ACES_5.25+', highlight: 'TP_Relative', aces: 5.25 };
            default: return { category: 'Dem_Gender_Woman', highlight: '',            aces: null };
        }
    });

    // Dashboard mode passes explicit filters; scrolly mode derives them from the step.
    const selectedDemCategory = $derived(
        externalCategory !== undefined ? externalCategory : stepConfig.category
    );
    const highlightCircle = $derived(
        externalCategory !== undefined ? (externalHighlight || '') : stepConfig.highlight
    );

    // The ACE slider is bindable (the reader can drag it), so the step value
    // is pushed into it as a side effect rather than derived.
    $effect(() => {
        if (externalCategory === undefined && stepConfig.aces !== null) {
            acesValue = stepConfig.aces;
        }
    });

    // Simple filter - return new array (this is fine, flip doesn't depend on this)
    let filteredCircles = $derived.by(() =>
        data.filter((c) => c.Demographic == selectedDemCategory
        )
    )

    // Trust value of the currently highlighted institution under the active demographic filter.
    let highlightedValue = $derived.by(() => {
        if (!highlightCircle) return null;
        const circle = filteredCircles.find(c => c.Trust_Category === highlightCircle);
        return circle ? +circle.Average_Trust : null;
    });

    // TRUST CIRCLES PLOTTING ---

    // Use the responsive width/height from props
    // outerHeight is intentionally larger than viewport to maximize circle size
    const centerX = $derived(width / 2);
    // 0.47: the old layout stuck the chart ~13vh above the viewport top
    // (top: calc(50vh - 63%)), so its 0.6 center landed around 47% visually.
    const centerY = $derived(isDashboard ? height * 0.5 : height * 0.47);
    const maxRadius = $derived(isDashboard ? height * 0.95 : height * 0.43);
    
    const zScale = $derived(scaleSequential(interpolateRdYlGn).domain(extent(data.map(d=>d.Average_Trust))));
    
    // Likert scale from 1 to 7
    const radiusScale = $derived(scaleLinear().domain([1, 7]).range([50, maxRadius]));
    
    // Use shared institution color mapping
    const institutionColors = (institution) => getInstitutionColor(institution);

</script>


<div class="chart-wrapper">
    {#if !isDashboard}
        <TrustSonification data={sonificationData} {highlightCircle} {highlightedValue} />
    {/if}
     <div class="viz-content">
        <div class="plot-container" class:dashboard={isDashboard} style={isDashboard ? `height: ${height}px;` : ''}>
            <svg class="trust-visualization" viewBox={`0 0 ${width} ${height}`}>
                {#each filteredCircles as circle}
                    {@const isHighlighted = circle.Trust_Category === highlightCircle}
                    {@const hasHighlight = highlightCircle !== ""}
                    <circle
                        cx={centerX}
                        cy={centerY}
                        r={radiusScale(+circle.Average_Trust)}
                        fill="none"
                        stroke={institutionColors(circle.Trust_Category)}
                        stroke-width={isHighlighted ? "4.0" : "2.0"}
                        opacity={hasHighlight ? (isHighlighted ? "1.0" : "0.3") : "0.6"}
                        style="transition: r 0.8s ease-in-out, stroke-width 0.3s ease, opacity 0.3s ease; pointer-events: none;"
                    />
                {/each}
            </svg>
        </div>

        <!-- ACES Slider for interactive exploration -->
        {#if showACESSlider}
            <div class="aces-slider-overlay">
                <ACESSlider bind:value={acesValue} />
            </div>
        {/if}
        
        <!-- Trust Distribution Chart in bottom right - only during main scrolly story, NOT in dashboard -->
        {#if !isDashboard}
            <div class="chart-overlay"
                class:visible={isStorySection}
                class:fade-out={conclusionVisible}>
                <TrustDistributionChart filteredData={filteredCircles} colorScale={zScale} {highlightCircle} {onInstitutionClick} {isDashboard} />
            </div>
        {/if}
    </div>
</div>

<style>
    /* The layout owns the space (fullscreen sticky panel) — this fills it. */
    .chart-wrapper {
        width: 100%;
        position: relative;
        height: 100%;
        overflow: visible;
    }


    .viz-content {
        width: 100%;
        height: 100%;
    }

    .plot-container {
        position: relative;
        overflow: visible;
        width: 100%;
        height: 100%;
        pointer-events: none;
    }

    .plot-container.dashboard {
        width: 100%;
        height: auto;
        left: 0;
        transform: none;
    }
    
    .trust-visualization {
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
    }
    
    
    /* Stays pinned near the bottom edge, below the circles, as in the original
       (where it rendered in flow at the bottom of the sticky chart). */
    .aces-slider-overlay {
        position: absolute;
        bottom: 4%;
        left: 50%;
        transform: translateX(-50%);
        width: min(500px, 80%);
        z-index: 10;
        pointer-events: auto;
    }

    .chart-overlay {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        z-index: 1000;
        pointer-events: none;
        transform: translateX(100%);
        opacity: 0;
        transition: opacity 0.6s ease, transform 0.8s ease;
    }

    .chart-overlay.visible {
        pointer-events: auto;
        transform: translateX(0);
        opacity: 1;
    }

    .chart-overlay.fade-out {
        opacity: 0;
        pointer-events: none;
    }

    /* Mobile adjustments */
    @media (max-width: 768px) {
        .chart-overlay {
            display: none !important;
        }

        .plot-container {
            /* Center the circles better on mobile and position them lower */
            top: 20vh;
        }

        .trust-visualization {
            /* Ensure circles appear behind survey boxes */
            z-index: 0;
        }
    }

</style>