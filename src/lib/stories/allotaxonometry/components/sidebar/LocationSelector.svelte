<script>
    let {
        location = $bindable('wikidata:Q30'),
        adapter = [],
        label = "Location"
    } = $props();

    function handleChange(event) {
        location = event.target.value;
    }
</script>

<div class="location-selector">
    <div class="selector-header">
        <span class="selector-label">{label}</span>
    </div>

    <div class="selector-control">
        {#if adapter.length > 0}
            <select
                value={location}
                onchange={handleChange}
                class="location-dropdown"
            >
                {#each adapter as row}
                    <option value={row.entity_id}>
                        {row.entity_name}
                    </option>
                {/each}
            </select>
        {:else}
            <div class="loading-dropdown">Loading locations...</div>
        {/if}
    </div>
</div>

<style>
    .location-selector {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
        width: 100%;
    }

    .selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
    }

    .selector-label {
        font-size: 0.75rem;
        font-weight: 500;
        color: var(--vcsi-fg);
    }


    .selector-control {
        position: relative;
    }

    .location-dropdown,
    .loading-dropdown {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid var(--vcsi-border);
        border-radius: 6px;
        font-size: 0.875rem;
        background-color: var(--vcsi-bg);
        color: var(--vcsi-fg);
    }

    .location-dropdown {
        cursor: pointer;
        appearance: none;
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
        background-position: right 0.75rem center;
        background-repeat: no-repeat;
        background-size: 1rem;
        transition: all 0.15s ease;
    }

    .location-dropdown:hover {
        border-color: rgb(0, 91, 187);
        box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.1);
    }

    .location-dropdown:focus {
        outline: none;
        border-color: rgb(0, 91, 187);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }

    .loading-dropdown {
        opacity: 0.6;
        font-style: italic;
    }

    /* Mobile responsive */
    @media (max-width: 768px) {
        .location-dropdown,
        .loading-dropdown {
            padding: 1rem;
            font-size: 1rem;
        }
    }
</style>