<script>
  let { 
    visible = false, 
    x = 0, 
    y = 0, 
    content = '',
    offset = { x: 10, y: -30 }
  } = $props();
</script>

{#if visible}
  <div 
    class="tooltip" 
    style="left: {x + offset.x}px; top: {y + offset.y}px;"
  >
    {content}
  </div>
{/if}

<style>
  .tooltip {
    position: fixed;
    background: var(--vcsi-bg);
    color: var(--vcsi-fg);
    border: 1px solid var(--vcsi-border);
    padding: 0.75rem 1rem;
    border-radius: 3px;
    font-size: clamp(12px, 1vw, 0.8rem);
    font-family: var(--vcsi-font-sans);
    white-space: pre-line;
    line-height: 1.4;
    pointer-events: none;
    z-index: 1000;
    max-width: 300px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    transition: opacity 100ms;
  }

  :global(.dark) .tooltip {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  }
</style>