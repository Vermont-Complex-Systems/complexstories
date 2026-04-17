<script>
  import { dashboardState } from '$stories/open-academic-analytics/state.svelte.js';
  import { Users } from "@lucide/svelte";

  let { authors: availableAuthors } = $props();

  // Show filter status like AuthorAgeFilter does
  let filterStatus = $derived.by(() => {
    if (dashboardState.researchGroupFilter === 'all') return '';

    if (!availableAuthors || availableAuthors.length === 0) return '';

    const total = availableAuthors.length;
    let filtered = 0;

    switch (dashboardState.researchGroupFilter) {
      case 'with_group':
        filtered = availableAuthors.filter(author => author.has_research_group === true).length;
        break;
      case 'without_group':
        filtered = availableAuthors.filter(author => author.has_research_group === false).length;
        break;
    }

    return `(${filtered} of ${total} authors)`;
  });

  function clearFilter() {
    dashboardState.researchGroupFilter = 'all';
  }
</script>

<div class="research-group-filter-section">
  <div class="filter-header">
    <Users size={14} />
    <span class="filter-title">Research Groups {filterStatus}</span>
  </div>

  <div class="filter-section">
    <select bind:value={dashboardState.researchGroupFilter} class="filter-select">
      <option value="all">All Faculty</option>
      <option value="with_group">With Research Group</option>
      <option value="without_group">Without Research Group</option>
    </select>

    <div class="filter-info">
      <p class="info-text">Do authors have research groups?</p>
    </div>
  </div>
</div>

<style>
  .research-group-filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .filter-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--vcsi-border);
  }

  .filter-title {
    font-size: clamp(12px, 1vw, 0.8rem);
    font-weight: 500;
    color: var(--vcsi-fg);
  }

  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }



  .filter-select {
    padding: 0.5rem;
    border: 1px solid var(--vcsi-border);
    border-radius: 3px;
    background: var(--vcsi-bg);
    color: var(--vcsi-fg);
    font-size: clamp(14px, 1vw, 0.8rem);
    width: 100%;
  }

  .filter-select:focus {
    outline: none;
    border-color: rgb(0, 91, 187);
  }

  .filter-info {
    text-align: center;
  }

  .info-text {
    font-size: clamp(12px, 1vw, 0.8rem);
    color: var(--vcsi-gray-600);
    margin: 0;
    line-height: 1.3;
  }
</style>