<script>
    import { browser } from '$app/environment';
    import { onMount, untrack } from 'svelte';
    import { Dashboard, Allotaxonograph } from 'allotaxonometer-ui';

    import Nav from './Nav.svelte';

    import SexToggle from './sidebar/SexToggle.svelte';
    import TopNSelector from './sidebar/TopNSelector.svelte';
    import AlphaSliderLocal from './sidebar/AlphaSliderLocal.svelte';
    import YearSlider from './sidebar/YearSlider.svelte';
    import LocationSelector from './sidebar/LocationSelector.svelte';
    import PeriodJumpControlsLocal from './sidebar/PeriodJumpControlsLocal.svelte';
    import MultiFileUploadLocal from './sidebar/MultiFileUploadLocal.svelte';
    import DownloadSection from './sidebar/DownloadSection.svelte';
    import DataInfo from './sidebar/DataInfo.svelte';

    import { getTopBabyNames, getAdapter } from '../allotax.remote.js';

    import boys1968 from '../data/boys-1968.json';
    import boys1895 from '../data/boys-1895.json';

    let { story, data } = $props();

    // ============================================================================
    // File Upload State
    // ============================================================================
    let uploadedSys1 = $state(null);
    let uploadedSys2 = $state(null);
    let uploadedTitle = $state(['System 1', 'System 2']);
    const hasUploadedFiles = $derived(!!uploadedSys1 && !!uploadedSys2);

    // ============================================================================
    // UI Parameters (not yet committed to API)
    // ============================================================================
    let period1 = $state([1905, 1925]);
    let period2 = $state([1968, 1998]);

    let location = $state('wikidata:Q30');
    let sex = $state('M');
    let limit = $state(10000);

    // ============================================================================
    // Committed Parameters (used for API calls)
    // ============================================================================
    let committedPeriod1Start = $state(1905);
    let committedPeriod1End = $state(1925);
    let committedPeriod2Start = $state(1972);
    let committedPeriod2End = $state(2002);
    let committedLocation = $state('wikidata:Q30');
    let committedSex = $state('M');
    let committedLimit = $state(10000);

    let dates = $derived(`${committedPeriod1Start},${committedPeriod1End}`);
    let dates2 = $derived(`${committedPeriod2Start},${committedPeriod2End}`);

    // ============================================================================
    // Alpha Parameter (updates immediately)
    // ============================================================================
    const alphas = [0, 1/4, 2/4, 3/4, 1, 3/2, 2, 3, 5, Infinity];
    let alphaIndex = $state(7);
    let alpha = $derived(alphas[alphaIndex]);

    // ============================================================================
    // Adapter Data & Date Range Logic
    // ============================================================================
    let adapterData = $state([]);
    getAdapter().then(d => adapterData = d).catch(err => console.error('Failed to load adapter:', err));
    const dateRange = $derived.by(() => {
        if (!adapterData.length) return { min: 1880, max: 2023 };
        const locationData = adapterData.find(l => l.entity_id === location);
        if (locationData?.min_year && locationData?.max_year) {
            return { min: locationData.min_year, max: locationData.max_year };
        }
        return { min: 1880, max: 2023 };
    });

    const dateMin = $derived(dateRange.min);
    const dateMax = $derived(dateRange.max);

    $effect(() => {
        const span = dateMax - dateMin;
        if (period1[0] < dateMin || period1[0] > dateMax) {
            const newYear = Math.floor(dateMin + span * 0.25);
            period1 = [newYear, newYear];
        }
        if (period2[0] < dateMin || period2[0] > dateMax) {
            const newYear = Math.floor(dateMin + span * 0.75);
            period2 = [newYear, newYear];
        }
    });

    // ============================================================================
    // Change Tracking & Warnings
    // ============================================================================
    let hasChanges = $derived(
        period1[0] !== committedPeriod1Start ||
        period1[1] !== committedPeriod1End ||
        period2[0] !== committedPeriod2Start ||
        period2[1] !== committedPeriod2End ||
        limit !== committedLimit
    );

    let reactiveEnabled = $state(false);
    $effect(() => {
        location; sex;
        if (!reactiveEnabled) return;
        untrack(() => updateData());
    });

    // ============================================================================
    // Data Loading & Management
    // ============================================================================

    function handleFilesUploaded(sys1Data, sys2Data, titles) {
        uploadedSys1 = sys1Data;
        uploadedSys2 = sys2Data;
        uploadedTitle = titles;
        sys1 = sys1Data;
        sys2 = sys2Data;
        title = titles;
        allotax.updateData(sys1Data, sys2Data, titles);
    }

    let sys1 = $state(null);
    let sys2 = $state(null);
    let title = $state(['Boys 1905-1925', 'Boys 1972-2002']);
    let isLoading = $state(false);

    function applyLimit(data, n) {
        if (data.length <= n) return data;
        const sliced = data.slice(0, n);
        const total = sliced.reduce((s, d) => s + d.counts, 0);
        return sliced.map(d => ({ ...d, probs: d.counts / total, totalunique: sliced.length }));
    }

    // Reactive data loading — re-fetches whenever committed params change
    $effect(() => {
        if (hasUploadedFiles) {
            const d1 = applyLimit(uploadedSys1, committedLimit);
            const d2 = applyLimit(uploadedSys2, committedLimit);
            sys1 = d1;
            sys2 = d2;
            title = uploadedTitle;
            allotax.updateData(d1, d2, uploadedTitle);
            return;
        }

        const d = dates;
        const d2 = dates2;
        const loc = committedLocation;
        const s = committedSex;
        const lim = committedLimit;

        isLoading = true;
        const result = getTopBabyNames({ dates: d, dates2: d2, locations: loc, sex: s, limit: lim });

        untrack(() => {
            result.then(ngrams => {
                const keys = Object.keys(ngrams);
                sys1 = ngrams[d] || ngrams[keys[0]];
                sys2 = ngrams[d2] || ngrams[keys[1]];

                const genderLabel = s === 'M' ? 'Boys' : 'Girls';
                title = [
                    `${genderLabel} ${committedPeriod1Start}-${committedPeriod1End}`,
                    `${genderLabel} ${committedPeriod2Start}-${committedPeriod2End}`
                ];
                allotax.updateData(sys1, sys2, title);
                isLoading = false;
            }).catch(err => {
                console.error('Failed to fetch baby names:', err);
                sys1 = boys1895;
                sys2 = boys1968;
                allotax.updateData(boys1895, boys1968, title);
                isLoading = false;
            });
        });
    });

    onMount(() => {
        reactiveEnabled = true;
    });

    function updateData() {
        [committedPeriod1Start, committedPeriod1End] = period1;
        [committedPeriod2Start, committedPeriod2End] = period2;
        committedLocation = location;
        committedSex = sex;
        committedLimit = limit;
    }

    // ============================================================================
    // Visualization (via Allotaxonograph WASM)
    // ============================================================================
    const allotax = new Allotaxonograph();

    $effect(() => {
        allotax.setAlpha(alpha);
    });

    let sidebarCollapsed = $state(false);
</script>

<article class="dashboard-layout" class:sidebar-collapsed={sidebarCollapsed} style="--vcsi-sidebar-bg: var(--vcsi-color-white); --vcsi-sidebar-width: 16rem">
    <aside class="dashboard-sidebar">
        <button class="sidebar-toggle" onclick={() => sidebarCollapsed = !sidebarCollapsed}>
            {sidebarCollapsed ? '>' : '<'}
        </button>

        <div class="sidebar-content">
            <div class="sidebar-header">
                <h2 class="sidebar-title">Allotaxonograph</h2>
            </div>

            <div class="sidebar-body">
            <MultiFileUploadLocal
                onFilesUploaded={handleFilesUploaded}
            />

            <div class="separator"></div>

            {#if !hasUploadedFiles}
                <div class="location-control">
                    <LocationSelector
                        bind:location
                        adapter={adapterData || []}
                        label="Location"
                    />
                </div>

                <div class="sex-control">
                    <SexToggle bind:sex />
                </div>

                <div class="separator"></div>
            {/if}

            <div class="topn-control">
                <TopNSelector bind:limit />
                {#if allotax.dat}
                    <div class="topn-available">
                        max: <span class="sys-badge sys1-badge">1</span>{(sys1?.[0]?.totalunique || sys1?.length || 0).toLocaleString()}
                        <span class="sys-badge sys2-badge">2</span>{(sys2?.[0]?.totalunique || sys2?.length || 0).toLocaleString()}
                    </div>
                {/if}
            </div>

            <div class="alpha-control">
                <AlphaSliderLocal bind:alphaIndex {alphas} />
            </div>

            {#if !hasUploadedFiles}
                <div class="separator"></div>

                <div class="year-control">
                    <YearSlider
                        bind:value={period1}
                        label="Period 1"
                        min={dateMin}
                        max={dateMax}
                    />
                </div>

                <div class="year-control">
                    <YearSlider
                        bind:value={period2}
                        label="Period 2"
                        min={dateMin}
                        max={dateMax}
                    />
                </div>

                <PeriodJumpControlsLocal
                    bind:period1
                    bind:period2
                    {dateMin}
                    {dateMax}
                    onJump={updateData}
                />
            {/if}

            <button
                class="update-button"
                onclick={updateData}
                disabled={!hasChanges || isLoading}
            >
                {#if isLoading}
                    <span class="btn-spinner"></span>
                    Loading...
                {:else}
                    Update
                {/if}
            </button>

            {#if allotax.dat}
                <DataInfo
                    {title}
                    itemCount={sys1?.length || 0}
                    normalization={allotax.rtd?.normalization ?? 0}
                />
            {/if}

            <div class="separator"></div>

            <DownloadSection isDataReady={!!allotax.dat} />
            </div>
        </div>
    </aside>

    <main class="dashboard-main">
        <Nav/>

        {#if browser && allotax.dat}
            <div id="allotaxonometer-dashboard">
                {#key `${committedPeriod1Start}-${committedPeriod1End}-${committedPeriod2Start}-${committedPeriod2End}-${committedLocation}-${committedSex}-${committedLimit}-${alpha}-${hasUploadedFiles}`}
                    <Dashboard
                        dat={allotax.dat}
                        barData={allotax.barData}
                        balanceData={allotax.balanceData}
                        maxlog10={allotax.maxlog10}
                        divnorm={allotax.rtd?.normalization ?? 1}
                        {title}
                        {alpha}
                        WordshiftWidth={400}
                    />
                {/key}
            </div>
        {:else}
            <div class="loading">
                <div class="loading-content">
                    <div class="spinner"></div>
                    <p>Loading baby names data...</p>
                </div>
            </div>
        {/if}
    </main>
</article>

<style>
    .dashboard-sidebar .sidebar-content {
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 0;
    }

    .sidebar-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-bottom: 1px solid var(--vcsi-border);
        background-color: var(--vcsi-bg);
    }

    .sidebar-title {
        font-size: 1rem;
        font-weight: 600;
        margin: 0;
    }

    .sidebar-body {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem;
    }

    .location-control {
        margin-bottom: 1.5rem;
        margin-top: 1rem;
    }

    .topn-control {
        margin-bottom: 1rem;
        margin-top: 0.5rem;
    }

    .sex-control {
        margin-bottom: 0.5rem;
        margin-top: 0;
    }

    .alpha-control {
        margin-bottom: 3rem;
        margin-top: 2rem;
        padding: 1.5rem 0;
        display: flex;
        align-items: center;
        position: relative;
        justify-content: center;
    }

    .year-control {
        margin-bottom: 2rem;
        margin-top: 2.5rem;
    }

    .separator {
        border-top: 1px solid var(--vcsi-border);
        margin: 1.5rem -1.5rem;
    }

    :global(.dashboard-main) {
        padding: 5.5rem 0 0 0;
        align-items: center;
        overflow: auto;
    }

    .topn-available {
        display: flex;
        align-items: center;
        gap: 0.375rem;
        margin-top: 0.375rem;
        font-size: var(--vcsi-font-size-xs);
        color: var(--vcsi-muted);
        justify-content: flex-end;
    }

    .sys-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1rem;
        height: 1rem;
        border-radius: var(--vcsi-radius-full);
        font-size: 0.625rem;
        font-weight: 700;
        color: rgb(59, 59, 59);
        flex-shrink: 0;
    }

    .sys1-badge { background-color: rgb(230, 230, 230); }
    .sys2-badge { background-color: rgb(195, 230, 243); }

    .update-button {
        width: 100%;
        padding: 0.75rem var(--vcsi-space-md);
        margin: var(--vcsi-space-md) 0;
        background-color: var(--vcsi-bg);
        color: var(--vcsi-fg);
        border: 1px solid var(--vcsi-border);
        border-radius: var(--vcsi-radius-md);
        font-size: 0.95rem;
        font-weight: var(--vcsi-font-weight-semibold);
        cursor: pointer;
        transition: all var(--vcsi-transition-base);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: var(--vcsi-space-sm);
    }

    .update-button:hover:not(:disabled) {
        background-color: var(--vcsi-hover);
        border-color: var(--vcsi-fg);
        transform: translateY(-1px);
    }

    .update-button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .btn-spinner {
        display: inline-block;
        width: 0.875rem;
        height: 0.875rem;
        border: 2px solid currentColor;
        border-top-color: transparent;
        border-radius: 50%;
        animation: spin 0.7s linear infinite;
        flex-shrink: 0;
    }

    .loading {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        color: var(--vcsi-muted);
    }

    .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--vcsi-space-lg);
    }

    .loading-content p {
        font-size: 1rem;
        color: var(--vcsi-muted);
        margin: 0;
    }

    .spinner {
        width: 3rem;
        height: 3rem;
        border: 4px solid var(--vcsi-border);
        border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
    }

    @keyframes spin {
        to { transform: rotate(360deg); }
    }
</style>
