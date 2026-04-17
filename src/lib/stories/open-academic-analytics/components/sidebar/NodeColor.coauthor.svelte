<script>
  import { dashboardState } from '$stories/open-academic-analytics/state.svelte.js';
  import { Palette, Info } from "@lucide/svelte";
</script>

<div class="color-mode-section">
  <div class="widget-header">
    <Palette size={14} />
    <span class="widget-title">Coauthor Node Color</span>
  </div>
  
  <select bind:value={dashboardState.coauthorNodeColor} class="filter-select">
    <option value="age_diff">Age Difference</option>
    <option value="acquaintance">Collaboration History</option>
    <option value="institutions">Institutions</option>
    <option value="shared_institutions">Shared Institutions</option>
  </select>
</div>

<style>
  .color-mode-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
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


</style>