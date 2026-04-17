<script>
  import BlogPosts from "$lib/components/Blog.Posts.svelte";
  import FilterBar from "$lib/components/FilterBar.svelte";
  import HeroText from "$lib/components/HeroText.svelte";
  import { ChevronDown } from "@lucide/svelte";

  let { posts } = $props();

  const initMax = 6;
  let maxPosts = $state(initMax);
  let activeFilter = $state(undefined);

  let allTags = $derived([...new Set(posts.flatMap((p) => p.tags))].sort());

  let filtered = $derived(
    activeFilter
      ? posts.filter((post) => post.tags.includes(activeFilter))
      : posts
  );

  let displayedPosts = $derived(filtered.slice(0, maxPosts));

  function onLoadMore() {
    maxPosts = filtered.length;
  }

  $effect(() => {
    activeFilter;
    maxPosts = initMax;
  });
</script>

<div class="blog-container page">
  <!-- Hero section -->
  <section class="blog-hero">
    <HeroText>
      <span class="hero-title">Behind the Scenes</span>
      <p>
        Insights, tutorials, and thoughts on complex systems, data visualization,
        and the stories that emerge from data.
      </p>
    </HeroText>
  </section>

  <!-- Filter bar -->
  <FilterBar bind:activeFilter filters={allTags} />

  <!-- Blog posts -->
  <div class="blog-content">
    <BlogPosts posts={displayedPosts} />
  </div>

  <!-- Load more button -->
  {#if filtered.length > maxPosts}
    <div class="more">
      <button onclick={onLoadMore} class="load-more-btn">
        <ChevronDown size={20} />
        <span class="text">Load More Posts</span>
      </button>
    </div>
  {/if}
</div>

<style>
  :global(main#content:has(.blog-container)) {
    max-width: none;
    padding: 0 !important;
  }

  .blog-container {
    position: relative;
    min-height: 100vh;
    padding-inline: var(--vcsi-page-inline-padding);
    margin-inline: auto;
  }

  .blog-hero {
    text-align: center;
  }

  .blog-hero :global(.hero-text) {
    padding: 1rem 0;
  }

  .hero-title {
    font-family: var(--vcsi-font-mono);
    font-size: var(--vcsi-font-size-giant);
    font-weight: var(--vcsi-font-weight-bold);
    display: block;
    margin-bottom: var(--vcsi-space-md);
  }

  .hero-title::after {
    content: '|';
    animation: blink 1s infinite;
    margin-left: 0.1em;
  }

  @keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0; }
  }

  .blog-hero :global(.hero-text p) {
    font-family: var(--vcsi-font-mono);
    font-size: clamp(15px, 1.25vw, 1.2rem);
    max-width: var(--vcsi-content-max-width);
    margin-left: auto;
    margin-right: auto;
  }

  .blog-content {
    margin-top: 0;
    position: relative;
  }

  .more {
    height: 40vh;
    max-height: 400px;
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
    margin-bottom: 15%;
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
    cursor: pointer;
  }

  .load-more-btn:hover {
    transform: translateY(-2px);
    background: var(--vcsi-gray-100);
  }

  .text {
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .blog-hero {
      padding: 1rem 0;
    }

    .load-more-btn {
      padding: 0.875rem 1.75rem;
      margin-bottom: 12%;
      font-size: var(--vcsi-font-size-xs);
    }
  }
</style>
