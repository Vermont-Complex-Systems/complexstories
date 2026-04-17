<script>
  let {
    activeFilter = $bindable(undefined),
    filters = []
  } = $props();

  function toggleFilter(filter) {
    activeFilter = filter === activeFilter ? undefined : filter;
  }
</script>

<div class="filter-bar">
  <div class="filter-content">
    <div class="filters-wrapper">
      <span class="filters-label">Filters:</span>

      <!-- Desktop filters -->
      <div class="filters--desktop">
        {#each filters as filter (filter)}
          <button
            class={['filter-btn', filter === activeFilter && 'active']}
            onclick={() => toggleFilter(filter)}
          >
            {filter}
          </button>
        {/each}
      </div>

      <!-- Mobile filters -->
      <div class="filters--mobile">
        <select bind:value={activeFilter}>
          <option value={undefined}>All</option>
          {#each filters as filter (filter)}
            <option value={filter}>{filter}</option>
          {/each}
        </select>
      </div>
    </div>
  </div>
</div>

<style>
  .filter-bar {
    position: sticky;
    top: 0;
    z-index: 10;
    width: 100%;
    background: var(--vcsi-bg);
    transition: all var(--vcsi-transition-base);
  }

  .filter-content {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding-block: var(--vcsi-space-sm);
  }

  .filters-wrapper {
    display: flex;
    align-items: center;
    gap: var(--vcsi-space-md);
  }

  .filters-label {
    font-family: var(--vcsi-font-mono);
    font-size: 0.7rem;
    font-weight: var(--vcsi-font-weight-bold);
    color: var(--vcsi-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    user-select: none;
  }

  /* Desktop filters */
  .filters--desktop {
    display: flex;
    align-items: center;
    gap: var(--vcsi-space-md);
  }

  .filters--desktop .filter-btn {
    display: flex;
    align-items: center;
    padding: var(--vcsi-space-sm) var(--vcsi-space-md);
    border: 1px solid transparent;
    border-radius: 3px;
    text-transform: uppercase;
    font-size: clamp(12px, 1vw, 0.8rem);
    font-weight: var(--vcsi-font-weight-bold);
    font-family: var(--vcsi-font-mono);
    color: var(--vcsi-muted);
    opacity: 0.6;
    transition: all var(--vcsi-transition-base);
  }

  .filters--desktop .filter-btn:hover {
    opacity: 1;
    background: var(--vcsi-gray-100);
  }

  .filters--desktop .filter-btn.active {
    opacity: 1;
    color: var(--vcsi-fg);
    background: var(--vcsi-gray-100);
    border-color: var(--vcsi-border);
  }

  /* Mobile filters */
  .filters--mobile {
    display: none;
  }

  .filters--mobile select {
    min-width: 8rem;
    font-family: var(--vcsi-font-mono);
    font-size: var(--vcsi-font-size-small);
    text-transform: uppercase;
    margin-top: 2.5rem;
  }

  /* Responsive */
  @media (max-width: 960px) {
    .filters-label {
      display: none;
    }

    .filters--desktop {
      display: none;
    }

    .filters--mobile {
      display: block;
    }
  }

  @media (max-width: 768px) {
    .filter-content {
      justify-content: center;
    }
  }
</style>
