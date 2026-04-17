<script>
  import { dashboardState } from '$stories/open-academic-analytics/state.svelte.js';
  import { UserCheck } from "@lucide/svelte";

  let { authors } = $props();

  // Filter authors based on age and research group filters
  let filteredAuthors = $derived.by(() => {
    let result = authors || [];

    if (dashboardState.authorAgeFilter) {
      const [minAge, maxAge] = dashboardState.authorAgeFilter;
      result = result.filter(author => {
        const age = author.current_age || 0;
        return age >= minAge && age <= maxAge;
      });
    }

    if (dashboardState.researchGroupFilter && dashboardState.researchGroupFilter !== 'all') {
      switch (dashboardState.researchGroupFilter) {
        case 'with_group':
          result = result.filter(author => author.has_research_group === true);
          break;
        case 'without_group':
          result = result.filter(author => author.has_research_group === false);
          break;
      }
    }

    return result;
  });

  // Auto-select first author if current selection is filtered out
  $effect(() => {
    if (filteredAuthors.length > 0) {
      const inList = filteredAuthors.some(a => a.ego_display_name === dashboardState.selectedAuthor);
      if (!inList) {
        dashboardState.selectedAuthor = filteredAuthors[0].ego_display_name;
      }
    }
  });

  let authorNames = $derived(filteredAuthors.map(a => a.ego_display_name));

  function handleSelectionChange(event) {
    const selected = Array.from(event.target.selectedOptions).map(option => option.value);
    dashboardState.selectedAuthor = selected.length > 0 ? selected[selected.length - 1] : '';
  }

  let filterStatus = $derived.by(() => {
    if (!dashboardState.authorAgeFilter) return '';
    return `(${filteredAuthors.length} of ${authors.length} authors)`;
  });
</script>

<!-- Author Selection Filter -->
<div class="widget-container">
  <div class="widget-header">
    <UserCheck size={16} />
    <span class="widget-title">Select Author {filterStatus}</span>
  </div>
    <div class="control-section">
      <select 
        multiple 
        class="filter-select-multiple"
        onchange={handleSelectionChange}
        value={[dashboardState.selectedAuthor]}
      >
        {#each authorNames as authorName}
          <option value={authorName} selected={dashboardState.selectedAuthor === authorName}>
            {authorName}
          </option>
        {/each}
      </select>
    </div>
</div>

<style>
  .widget-container {
    margin-bottom: 1.5rem;
  }

  .widget-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--vcsi-border);
  }

  .widget-title {
    font-size: clamp(12px, 1vw, 0.8rem);
    font-weight: 500;
    color: var(--vcsi-fg);
  }

  .control-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }


  .filter-select-multiple {
    padding: 0.5rem;
    border: 1px solid var(--vcsi-border);
    border-radius: 3px;
    background: var(--vcsi-bg);
    color: var(--vcsi-fg);
    font-size: clamp(14px, 1vw, 0.8rem);
    width: 100%;
    height: 250px; /* Fixed height to show multiple options */
    font-family: var(--vcsi-font-serif);
  }

  .filter-select-multiple:focus {
    outline: none;
    border-color: rgb(0, 91, 187);
  }

  .filter-select-multiple option {
    padding: 0.2rem 0.5rem;
  }

  .filter-select-multiple option:checked {
    background: rgb(0, 91, 187);
    color: white;
  }

</style>