<script>
  import StoryGrid from '$lib/components/StoryGrid.svelte';
  import FilterBar from '$lib/components/FilterBar.svelte';
  import { ChevronDown } from '@lucide/svelte';
  import { getStories } from '$lib/story.remote';

  const initMax = 12;

  const stories = $derived(await getStories());

  let maxStories = $state(initMax);
  let activeFilter = $state(undefined);

  let allFilters = $derived([...new Set(stories.flatMap(s => s.tags))].sort());

  let filtered = $derived(
    activeFilter ? stories.filter(d => d.tags.includes(activeFilter)) : stories
  );

  let displayedStories = $derived(filtered.slice(0, maxStories));

  function onLoadMore() {
    maxStories = filtered.length;
  }

  // Reset pagination when filter changes
  $effect(() => {
    activeFilter;
    maxStories = initMax;
  });
</script>

<div class="content page">
  <FilterBar bind:activeFilter filters={allFilters} />

  <!-- Stories Section -->
  <section class="stories">
    <StoryGrid stories={displayedStories} />
  </section>

  {#if filtered.length > maxStories}
    <div class="more">
      <button onclick={onLoadMore} class="load-more-btn">
        <ChevronDown size={20} />
        <span class="text">Load More Stories</span>
      </button>
    </div>
  {/if}
</div>

<style>
  :global(main:has(.content)) {
    max-width: none;
    padding: 0 !important;
  }

  .content {
    position: relative;
    padding-top: 2rem;
    padding-bottom: 8rem;
    padding-inline: var(--vcsi-page-inline-padding);
  }

  .stories {
    margin-top: 1rem;
  }

  .more {
    height: 30vh;
    max-height: 300px;
    background: linear-gradient(to bottom, transparent, var(--vcsi-bg));
    position: absolute;
    width: 100%;
    bottom: 0;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: center;
    z-index: 10;
    pointer-events: none;
  }

  .load-more-btn {
    display: flex;
    align-items: center;
    gap: var(--vcsi-space-sm);
    padding: var(--vcsi-space-md) var(--vcsi-space-xl);
    margin-bottom: var(--vcsi-space-xl);
    background: var(--vcsi-bg);
    color: var(--vcsi-fg);
    border: 1px solid var(--vcsi-border);
    border-radius: 2rem;
    font-family: var(--vcsi-font-sans);
    font-size: var(--vcsi-font-size-small);
    font-weight: var(--vcsi-font-weight-bold);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    min-width: fit-content;
    transition: transform var(--vcsi-transition-base);
    pointer-events: all;
    min-height: 44px;
  }

  .load-more-btn:hover {
    transform: translateY(-2px);
    background: var(--vcsi-gray-100);
  }

  .text {
    flex-shrink: 0;
  }

  /* Mobile */
  @media (max-width: 768px) {
    .more {
      height: 25vh;
      max-height: 200px;
    }

    .load-more-btn {
      padding: 1.125rem 2.25rem;
      margin-bottom: var(--vcsi-space-lg);
      font-size: var(--vcsi-font-size-small);
      min-height: 48px;
    }
  }

  @media (max-width: 480px) {
    .more {
      height: 20vh;
      max-height: 150px;
    }

    .load-more-btn {
      padding: var(--vcsi-space-md) 1.75rem;
      font-size: var(--vcsi-font-size-xs);
      gap: 0.375rem;
    }
  }
</style>
