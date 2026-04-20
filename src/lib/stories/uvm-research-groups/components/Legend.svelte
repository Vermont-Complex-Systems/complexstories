<!-- Legend.svelte -->
<script>
  let { colorMode, visible = true } = $props();
</script>

<div class="legend" class:visible>
  <div class="legend-content">
    <div class="legend-title">Legend</div>
    
    {#key colorMode}
      <div class="legend-items">
        {#if colorMode === 'age_diff'}
          <div class="legend-item">
            <div class="legend-dot" style="background: #404788FF;"></div>
            <span>Older coauthor<br>(+7 years)</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #20A387FF;"></div>
            <span>Similar age<br>(±7 years)</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #FDE725FF;"></div>
            <span>Younger coauthor<br>(-7 years)</span>
          </div>
        {:else if colorMode === 'shared_institutions'}
          <div class="legend-item">
            <div class="legend-dot" style="background: #FF6B35;"></div>
            <span>MIT</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #4682B4;"></div>
            <span>Columbia</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #B59410;"></div>
            <span>Santa Fe Institute</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #2E8B57;"></div>
            <span>University of Vermont</span>
          </div>
          <div class="legend-item">
            <div class="legend-dot" style="background: #D3D3D3;"></div>
            <span>No shared institution</span>
          </div>
        {:else}
          <div class="legend-item">
            <div class="legend-dot" style="background: black;"></div>
            <span>Coauthors</span>
          </div>
        {/if}
        
      </div>
    {/key}
  </div>
</div>

<style>
  .legend {
    position: absolute;
    right: 0rem;
    top: 2rem;
    background: var(--vcsi-bg);
    border: 1px solid var(--vcsi-border);
    border-radius: 8px;
    padding: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    font-size: 11px;
    font-family: var(--vcsi-font-sans);
    z-index: 100;
    backdrop-filter: blur(10px);
    width: 8rem;
    opacity: 0;
    transition: opacity var(--vcsi-transition-slow), transform var(--vcsi-transition-slow);
    pointer-events: none;
  }

  .legend.visible {
    opacity: 1;
    transform: translateX(0);
    pointer-events: auto;
  }

  .legend-content {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .legend-title {
    font-weight: var(--vcsi-font-weight-bold);
    font-size: 11px;
    color: var(--vcsi-fg);
    margin-bottom: 4px;
    text-align: center;
    border-bottom: 1px solid var(--vcsi-border);
    padding-bottom: 4px;
  }

  .legend-items {
    display: flex;
    color: var(--vcsi-fg);
    flex-direction: column;
    gap: 6px;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    opacity: 0;
    transform: translateX(10px);
    animation: slideIn 0.4s ease forwards;
  }

  .legend-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 1px solid var(--vcsi-fg);
    flex-shrink: 0;
    transition: background-color var(--vcsi-transition-base);
  }

  .legend-item span {
    font-size: 10px;
    color: var(--vcsi-fg);
    line-height: 1.2;
  }

  @keyframes slideIn {
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }

  @media (max-width: 768px) {
    .legend {
      position: fixed;
      top: 20px;
      right: 20px;
      left: auto;
      transform: translateX(0);
      padding: 8px;
      width: auto;
    }

    .legend-items {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 12px;
    }

    .legend.visible {
      transform: translateX(0);
    }
  }
</style>