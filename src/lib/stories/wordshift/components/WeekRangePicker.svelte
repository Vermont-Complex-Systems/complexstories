<script>
    let {
        value = { start: null, end: null },
        onchange = undefined,
        availableWeeks = [],   // ISO strings of Mondays (week starts)
        disabled = false,
        single = false,        // Single-select mode: one click commits immediately
        placeholder = 'Select weeks…'
    } = $props();

    let open = $state(false);
    let triggerEl = $state(null);
    let popupEl = $state(null);

    let popupTop = $state(0);
    let popupLeft = $state(0);

    $effect(() => {
        if (open && triggerEl) {
            const rect = triggerEl.getBoundingClientRect();
            popupTop = rect.bottom + 6;
            popupLeft = rect.left;
        }
    });

    // Mid-selection: first click stored here, second click commits
    let pendingStart = $state(null);
    let hoverWeek  = $state(null);

    const availableSet = $derived(new Set(availableWeeks));

    const liveStart = $derived(pendingStart ?? value?.start ?? null);
    const liveEnd   = $derived(pendingStart
        ? (hoverWeek ?? pendingStart)
        : (value?.end ?? null));

    function weekEnd(mondayIso) {
        const [y, m, d] = mondayIso.split('-').map(Number);
        const sun = new Date(Date.UTC(y, m - 1, d) + 6 * 86400000);
        return sun.toISOString().split('T')[0];
    }

    function formatWeekRow(mondayIso) {
        const [y, m, d] = mondayIso.split('-').map(Number);
        const start = new Date(Date.UTC(y, m - 1, d));
        const end   = new Date(start.getTime() + 6 * 86400000);
        const fmtMD  = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
        const fmtMDY = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: '2-digit', timeZone: 'UTC' });
        return `${fmtMD.format(start)} – ${fmtMDY.format(end)}`;
    }

    function formatTrigger(mondayIso) {
        if (!mondayIso) return null;
        const [y, m, d] = mondayIso.split('-').map(Number);
        return `${m}/${d}/${String(y).slice(2)}`;
    }

    const triggerLabel = $derived.by(() => {
        const s = value?.start ? formatTrigger(value.start) : null;
        if (single) return s ? formatWeekRow(value.start) : placeholder;
        const e = value?.end   ? formatTrigger(value.end)   : null;
        if (s && e) return `${s} – ${e}`;
        if (s)      return `${s} – ?`;
        return placeholder;
    });

    function isStart(iso)   { return iso === liveStart; }
    function isEnd(iso)     { return iso === liveEnd; }
    function isInRange(iso) {
        if (!liveStart || !liveEnd) return false;
        const [s, e] = liveStart <= liveEnd ? [liveStart, liveEnd] : [liveEnd, liveStart];
        return iso > s && iso < e;
    }

    // Group weeks by year+month label for visual headers (most recent first)
    const groupedWeeks = $derived.by(() => {
        const groups = [];
        let currentKey = null;
        for (let i = availableWeeks.length - 1; i >= 0; i--) {
            const w = availableWeeks[i];
            const [y, m] = w.split('-').map(Number);
            const key = `${y}-${String(m).padStart(2, '0')}`;
            const label = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
                .format(new Date(Date.UTC(y, m - 1, 1)));
            if (key !== currentKey) {
                groups.push({ label, weeks: [] });
                currentKey = key;
            }
            groups[groups.length - 1].weeks.push(w);
        }
        return groups;
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

    function handleWeekClick(iso) {
        if (!availableSet.has(iso)) return;
        if (single) {
            open = false;
            onchange?.({ start: iso, end: weekEnd(iso) });
            return;
        }
        if (!pendingStart) {
            pendingStart = iso;
        } else {
            const [s, e] = pendingStart <= iso ? [pendingStart, iso] : [iso, pendingStart];
            pendingStart = null;
            hoverWeek = null;
            open = false;
            onchange?.({ start: s, end: weekEnd(e) });
        }
    }

    function handleWeekHover(iso) {
        if (pendingStart) hoverWeek = iso;
    }

    function handleWeekLeave() {
        hoverWeek = null;
    }
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
        <div class="week-list">
            {#each groupedWeeks as group (group.label)}
                <div class="month-header">{group.label}</div>
                {#each group.weeks as w (w)}
                    {@const sel = isStart(w) || isEnd(w)}
                    {@const inRange = isInRange(w)}
                    {@const isPending = pendingStart === w}
                    <button
                        class="week-row"
                        class:selected={sel}
                        class:in-range={inRange}
                        class:pending={isPending}
                        onclick={() => handleWeekClick(w)}
                        onmouseenter={() => handleWeekHover(w)}
                        onmouseleave={handleWeekLeave}
                    >
                        {formatWeekRow(w)}
                    </button>
                {/each}
            {/each}
        </div>
        {#if pendingStart && !single}
            <p class="hint">Click a second week to complete the range</p>
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
        min-width: 140px;
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
        padding: 8px;
        box-shadow: 0 4px 16px color-mix(in oklch, var(--vcsi-fg) 12%, transparent);
        z-index: 200;
        min-width: 200px;
    }

    .week-list {
        max-height: 280px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }

    .month-header {
        font-size: 0.7rem;
        font-weight: 600;
        color: var(--vcsi-muted);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        padding: 6px 8px 3px;
        position: sticky;
        top: 0;
        background: var(--vcsi-bg);
    }

    .week-row {
        display: block;
        width: 100%;
        padding: 5px 8px;
        border: none;
        border-radius: var(--vcsi-radius-sm);
        background: transparent;
        font-size: 0.8rem;
        font-family: inherit;
        text-align: left;
        cursor: pointer;
        color: var(--vcsi-fg);
        transition: background 0.1s;
        white-space: nowrap;
    }

    .week-row:hover:not(.selected):not(.pending) {
        background: var(--vcsi-code-bg);
    }

    .week-row.in-range {
        background: color-mix(in oklch, var(--vcsi-fg) 12%, transparent);
        border-radius: 0;
    }

    .week-row.selected,
    .week-row.pending {
        background: var(--vcsi-fg);
        color: var(--vcsi-bg);
        border-radius: var(--vcsi-radius-sm);
    }

    .hint {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid var(--vcsi-border);
        font-size: 0.72rem;
        color: var(--vcsi-muted);
        text-align: center;
    }
</style>
