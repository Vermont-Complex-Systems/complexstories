<script>
  import { Accordion } from "bits-ui";
  import { dashboardState } from '$stories/open-academic-analytics/state.svelte.js';
  import { loadCoauthorData } from '$stories/open-academic-analytics/data.remote.js';

  let coauthorData = $derived(await loadCoauthorData({
    authorName: dashboardState.selectedAuthor,
    filterBigPapers: dashboardState.filterBigPapers
  }));
  let uniqueCoauthors = $derived.by(() => {
    if (!coauthorData?.length) return [];
    return [...new Set(coauthorData.map(c => c.coauthor_display_name).filter(Boolean))].sort();
  });

</script>

<Accordion.Item value="highlight-coauthor">
  <Accordion.Header>
    <Accordion.Trigger class="accordion-trigger">
      👥 Highlight Coauthor
    </Accordion.Trigger>
  </Accordion.Header>
  <Accordion.Content class="accordion-content">
    <div class="control-section">
      <label class="filter-label" for="coauthor-select">
        Select Coauthor to Highlight:
      </label>

      <select
        id="coauthor-select"
        class="filter-select"
        bind:value={dashboardState.clickedCoauthor}
      >
        <option value="">All coauthors</option>
        {#each uniqueCoauthors as coauthorName}
          <option value={coauthorName}>{coauthorName}</option>
        {/each}
      </select>
      

    </div>
  </Accordion.Content>
</Accordion.Item>


<style>
  :global(.accordion-trigger) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem;
    font-size: clamp(15px, 1.25vw, 1.2rem);
    font-weight: 500;
    color: var(--vcsi-fg);
    background: transparent;
    border: none;
    border-radius: 3px;
    transition: background-color 200ms ease;
    cursor: pointer;
  }

  :global(.accordion-trigger:hover) {
    background-color: var(--vcsi-gray-100);
  }

  :global(.dark .accordion-trigger:hover) {
    background-color: var(--vcsi-gray-800);
  }

  :global(.accordion-content) {
    padding: 0 0.75rem 1rem 0.75rem;
  }

  .control-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .filter-label {
    font-size: clamp(15px, 1.25vw, 1.2rem);
    font-weight: 500;
    color: var(--vcsi-fg);
  }

  .filter-select {
    padding: 0.5rem;
    border: 1px solid var(--vcsi-border);
    border-radius: 3px;
    background: var(--vcsi-bg);
    color: var(--vcsi-fg);
    font-size: clamp(15px, 1.25vw, 1.2rem);
    width: 100%;
  }

  .filter-select:focus {
    outline: none;
    border-color: rgb(0, 91, 187);
  }
</style>