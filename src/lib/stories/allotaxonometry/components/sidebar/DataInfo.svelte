<script>
    let { title, itemCount, normalization } = $props();
</script>

<div class="data-info">
    <div class="stats">
        <div class="stat">
            <span class="stat-label">Items</span>
            <span class="stat-value">{itemCount.toLocaleString()}</span>
        </div>
        <div class="stat">
            <span class="stat-label">Divergence</span>
            <span class="stat-value">{normalization.toFixed(4)}</span>
        </div>
    </div>
</div>

<style>
    .data-info {
        display: flex;
        flex-direction: column;
    }


    .stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        margin-top: 1rem;
    }

    .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0.75rem;
        background-color: var(--vcsi-gray-100);
        border-radius: 3px;
        border: 1px solid var(--vcsi-border);
    }

    .stat-label {
        font-size: 0.75rem;
        color: var(--vcsi-gray-600);
        margin-bottom: 0.25rem;
        font-family: var(--font-form);
    }

    .stat-value {
        font-size: 0.875rem;
        font-weight: 900;
        color: var(--vcsi-fg);
        font-family: var(--font-form);
    }
</style>