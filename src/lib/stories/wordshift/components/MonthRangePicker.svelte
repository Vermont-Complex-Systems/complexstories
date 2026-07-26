<script>
    import { ChevronLeft, ChevronRight } from '@lucide/svelte';

    let {
        value = { start: null, end: null },
        onchange = undefined,
        availableMonths = [],
        disabled = false,
        single = false,        // Single-select mode: one click commits immediately
        placeholder = 'Select range…'
    } = $props();

    let open = $state(false);
    let triggerEl = $state(null);
    let popupEl = $state(null);

    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    // Initial left-panel year: year of current start, or first available year
    const initialYear = $derived.by(() => {
        if (value?.start) return parseInt(value.start.slice(0, 4));
        if (availableMonths.length) return parseInt(availableMonths[0].slice(0, 4));
        return new Date().getFullYear();
    });

    let viewYear = $state(null);
    $effect(() => { if (viewYear === null) viewYear = initialYear; });

    // Mid-selection: first click stored here, second click commits
    let pendingStart = $state(null);

    // Hover preview
    let hoverMonth = $state(null);

    const availableSet = $derived(new Set(availableMonths));

    // The "live" range end for highlighting (hover preview or committed end)
    const liveEnd = $derived(pendingStart
        ? (hoverMonth ?? pendingStart)
        : (value?.end ?? null));
    const liveStart = $derived(pendingStart ?? value?.start ?? null);

    // Min/max years from available months
    const minYear = $derived(availableMonths.length ? parseInt(availableMonths[0].slice(0, 4)) : null);
    const maxYear = $derived(availableMonths.length ? parseInt(availableMonths[availableMonths.length - 1].slice(0, 4)) : null);

    // Fixed position anchored to the trigger (sticky header → getBoundingClientRect is always viewport-relative)
    let popupTop = $state(0);
    let popupLeft = $state(0);

    $effect(() => {
        if (open && triggerEl) {
            const rect = triggerEl.getBoundingClientRect();
            popupTop = rect.bottom + 6;
            popupLeft = rect.left;
        }
    });

    function toggleOpen() {
        if (disabled) return;
        open = !open;
        if (!open) pendingStart = null;
    }

    function handleWindowClick(e) {
        if (!open) return;
        if (triggerEl?.contains(e.target)) return;
        if (popupEl?.contains(e.target)) return;
        open = false;
        pendingStart = null;
    }

    function handleKeydown(e) {
        if (e.key === 'Escape' && open) {
            open = false;
            pendingStart = null;
        }
    }

    function isAvailable(iso) { return availableSet.has(iso); }

    function isoForCell(year, monthIdx) {
        return `${year}-${String(monthIdx + 1).padStart(2, '0')}-01`;
    }

    function isStart(iso) { return iso === liveStart; }
    function isEnd(iso)   { return iso === liveEnd; }

    function isInRange(iso) {
        if (!liveStart || !liveEnd) return false;
        const [s, e] = liveStart <= liveEnd ? [liveStart, liveEnd] : [liveEnd, liveStart];
        return iso > s && iso < e;
    }

    function formatLabel(iso) {
        if (!iso) return null;
        const [y, m] = iso.split('-').map(Number);
        return `${m}/${String(y).slice(2)}`;
    }

    const triggerLabel = $derived.by(() => {
        const s = value?.start ? formatLabel(value.start) : null;
        if (single) return s ?? placeholder;
        const e = value?.end   ? formatLabel(value.end)   : null;
        if (s && e) return `${s} – ${e}`;
        if (s)      return `${s} – ?`;
        return placeholder;
    });

    function handleMonthClick(iso) {
        if (!isAvailable(iso)) return;
        if (single) {
            open = false;
            onchange?.({ start: iso, end: iso });
            return;
        }
        if (!pendingStart) {
            pendingStart = iso;
        } else {
            const [s, e] = pendingStart <= iso ? [pendingStart, iso] : [iso, pendingStart];
            pendingStart = null;
            hoverMonth = null;
            open = false;
            onchange?.({ start: s, end: e });
        }
    }

    function handleMonthHover(iso) {
        if (pendingStart) hoverMonth = iso;
    }

    function handleMonthLeave() {
        hoverMonth = null;
    }

    function prevYear() { viewYear--; }
    function nextYear() { viewYear++; }
</script>

<svelte:window onclick={handleWindowClick} onkeydown={handleKeydown} />

<button
    bind:this={triggerEl}
    class="trigger"
    class:disabled
    class:has-value={value?.start}
    {disabled}
    onclick={toggleOpen}
    aria-expanded={open}
    aria-haspopup="dialog"
>
    {triggerLabel}
    <span class="trigger-chevron">▾</span>
</button>

{#if open}
    <div
        bind:this={popupEl}
        class="popup"
        role="dialog"
        aria-modal="true"
        style="top: {popupTop}px; left: {popupLeft}px;"
    >
        <div class="panels">

            <!-- Left panel: viewYear -->
            <div class="panel">
                <div class="year-header">
                    <button class="nav-btn" onclick={prevYear} disabled={viewYear <= minYear}>
                        <ChevronLeft size={16} />
                    </button>
                    <span class="year-label">{viewYear}</span>
                    <div class="nav-spacer"></div>
                </div>
                <div class="month-grid">
                    {#each Array(12) as _, i (i)}
                        {@const iso = isoForCell(viewYear, i)}
                        {@const avail = isAvailable(iso)}
                        {@const start = isStart(iso)}
                        {@const end = isEnd(iso)}
                        {@const inRange = isInRange(iso)}
                        {@const isPending = pendingStart === iso}
                        <button
                            class="month-cell"
                            class:available={avail}
                            class:unavailable={!avail}
                            class:start
                            class:end
                            class:in-range={inRange}
                            class:pending={isPending}
                            disabled={!avail}
                            onclick={() => handleMonthClick(iso)}
                            onmouseenter={() => handleMonthHover(iso)}
                            onmouseleave={handleMonthLeave}
                        >
                            {MONTH_NAMES[i]}
                        </button>
                    {/each}
                </div>
            </div>

            <div class="panel-divider"></div>

            <!-- Right panel: viewYear + 1 -->
            <div class="panel">
                <div class="year-header">
                    <div class="nav-spacer"></div>
                    <span class="year-label">{viewYear + 1}</span>
                    <button class="nav-btn" onclick={nextYear} disabled={viewYear + 1 >= maxYear}>
                        <ChevronRight size={16} />
                    </button>
                </div>
                <div class="month-grid">
                    {#each Array(12) as _, i (i)}
                        {@const iso = isoForCell(viewYear + 1, i)}
                        {@const avail = isAvailable(iso)}
                        {@const start = isStart(iso)}
                        {@const end = isEnd(iso)}
                        {@const inRange = isInRange(iso)}
                        {@const isPending = pendingStart === iso}
                        <button
                            class="month-cell"
                            class:available={avail}
                            class:unavailable={!avail}
                            class:start
                            class:end
                            class:in-range={inRange}
                            class:pending={isPending}
                            disabled={!avail}
                            onclick={() => handleMonthClick(iso)}
                            onmouseenter={() => handleMonthHover(iso)}
                            onmouseleave={handleMonthLeave}
                        >
                            {MONTH_NAMES[i]}
                        </button>
                    {/each}
                </div>
            </div>

        </div>

        {#if pendingStart && !single}
            <p class="hint">Click a second month to complete the range</p>
        {/if}
    </div>
{/if}

<style>
    .trigger {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.375rem 0.6rem;
        border: 1px solid var(--vcsi-border);
        border-radius: var(--vcsi-radius-sm);
        background: var(--vcsi-bg);
        font-size: 0.875rem;
        font-family: inherit;
        cursor: pointer;
        white-space: nowrap;
        min-width: 120px;
        justify-content: space-between;
        transition: border-color 0.15s;
    }
    .trigger:hover { border-color: var(--vcsi-muted); }
    .trigger.disabled { opacity: 0.5; cursor: not-allowed; }
    .trigger.has-value { color: var(--vcsi-fg); }
    .trigger:not(.has-value) { color: var(--vcsi-muted); }
    .trigger-chevron { font-size: 0.7rem; color: var(--vcsi-muted); }

    .popup {
        position: fixed;
        background: var(--vcsi-bg);
        border: 1px solid var(--vcsi-border);
        border-radius: var(--vcsi-radius-md);
        padding: 16px;
        box-shadow: 0 4px 16px color-mix(in oklch, var(--vcsi-fg) 12%, transparent);
        z-index: 200;
    }

    /* Two panels side by side */
    .panels {
        display: flex;
        gap: 0;
        align-items: flex-start;
    }

    .panel {
        flex: 1;
        min-width: 180px;
    }

    .panel-divider {
        width: 1px;
        background: var(--vcsi-border);
        align-self: stretch;
        margin: 0 12px;
    }

    /* Year header row */
    .year-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 10px;
    }
    .year-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: var(--vcsi-fg);
    }
    .nav-btn {
        /* display: inline-flex; */
        align-items: center;
        justify-content: center;
        overflow: visible;
        width: 26px;
        height: 26px;
        border: none;
        background: transparent;
        border-radius: var(--vcsi-radius-sm);
        cursor: pointer;
        color: var(--vcsi-muted);
        transition: background 0.15s;
        flex-shrink: 0;
    }
    .nav-btn:hover:not(:disabled) { background: var(--vcsi-code-bg); }
    .nav-btn:disabled { opacity: 0.3; cursor: default; }
    .nav-btn :global(svg) {
        display: block;
        width: 16px;
        height: 16px;
        color: var(--vcsi-muted);
    }
    .nav-spacer {
        width: 26px;
        flex-shrink: 0;
    }

    /* 3-column month grid */
    .month-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 3px;
    }

    .month-cell {
        padding: 7px 4px;
        border: 1px solid transparent;
        border-radius: var(--vcsi-radius-sm);
        background: transparent;
        font-size: 0.8rem;
        font-family: inherit;
        text-align: center;
        cursor: pointer;
        transition: background 0.12s, color 0.12s, border-color 0.12s;
        color: var(--vcsi-fg);
    }

    .month-cell.unavailable {
        color: var(--vcsi-muted);
        cursor: not-allowed;
    }

    .month-cell.available:hover:not(.start):not(.end):not(.pending) {
        border-color: var(--vcsi-muted);
    }

    /* Range highlight */
    .month-cell.in-range {
        background: color-mix(in oklch, var(--vcsi-fg) 12%, transparent);
        border-radius: 0;
    }

    /* Start cap */
    .month-cell.start {
        background: var(--vcsi-fg);
        color: var(--vcsi-bg);
        border-color: var(--vcsi-fg);
        border-radius: var(--vcsi-radius-sm) 0 0 var(--vcsi-radius-sm);
    }
    /* End cap */
    .month-cell.end {
        background: var(--vcsi-fg);
        color: var(--vcsi-bg);
        border-color: var(--vcsi-fg);
        border-radius: 0 var(--vcsi-radius-sm) var(--vcsi-radius-sm) 0;
    }
    /* Single month (start === end) or pending first click */
    .month-cell.start.end,
    .month-cell.pending {
        background: var(--vcsi-fg);
        color: var(--vcsi-bg);
        border-color: var(--vcsi-fg);
        border-radius: var(--vcsi-radius-sm);
    }

    .hint {
        margin-top: 12px;
        font-size: 0.72rem;
        color: var(--vcsi-muted);
        text-align: center;
    }
</style>
