<script>
  import { dashboardState } from '$stories/open-academic-analytics/state.svelte.js';
  import { BarChart3 } from "@lucide/svelte";

  let { paper, coauthor } = $props();

  let uniqueCoauthors = $derived.by(() => {
    if (!coauthor?.length) return [];
    return [...new Set(coauthor.map(c => c.coauthor_display_name).filter(Boolean))].sort();
  });

  let chosenAuthor = $derived.by(() => {
    if (!coauthor) return null;
    return coauthor.filter(d => d.ego_display_name == dashboardState.selectedAuthor)[0];
  });
</script>

<div class="data-info-section">
  <div class="data-stats">
    <div class="widget-header">
      <BarChart3 size={14} />
      <span class="widget-title">Currently showing</span>
    </div>

    <div class="stat-row">
      <span class="stat-label">Selected author:</span>
      <span class="stat-value">{dashboardState.selectedAuthor}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label"># Papers:</span>
      <span class="stat-value">{paper?.length}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Total collaborations:</span>
      <span class="stat-value">{coauthor?.length}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Unique Coauthors:</span>
      <span class="stat-value">{uniqueCoauthors?.length}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Departments:</span>
      <span class="stat-value-text">{chosenAuthor?.ego_department}</span>
    </div>
    {#if chosenAuthor?.group_url}
      <div class="stat-row">
        <span class="stat-label">Group URL:</span>
        <span class="stat-value-href"><a href={chosenAuthor.group_url}>{chosenAuthor.group_url}</a></span>
      </div>
    {/if}
  </div>
</div>

<style>
  .data-info-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
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

  .data-stats {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    background: rgb(247, 247, 247);
    border: 1px solid var(--vcsi-border);
    border-radius: 3px;
  }

  :global(.dark) .data-stats {
    background: var(--vcsi-gray-800);
  }

  .stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: clamp(12px, 1vw, 0.8rem);
  }

  .stat-label {
    color: var(--vcsi-gray-600);
    font-weight: 400;
  }

  .stat-value {
    color: var(--vcsi-fg);
    font-weight: 900;
  }
  
  .stat-value-text {
    color: var(--vcsi-fg);
    font-size: 10px;
  }
  
  .stat-value-href {
    color: var(--vcsi-fg);
    font-size: 12px;
  }
</style>