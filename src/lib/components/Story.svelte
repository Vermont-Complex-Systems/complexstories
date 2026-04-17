<script lang="ts">
  import { base } from "$app/paths";
  import { ExternalLink } from "@lucide/svelte";
  import type { Story } from '$lib/story.remote';

  let { story }: { story: Story } = $props();

  const isExternal = $derived(!!story.externalUrl);
  const finalHref = $derived(isExternal ? story.externalUrl : `${base}/${story.slug}`);

  // Glob-import all thumbnails through enhanced-img for automatic WebP/AVIF conversion
  const thumbnails = import.meta.glob<{ default: string }>(
    '/src/lib/assets/thumbnails/*.{jpg,png,webp}',
    { eager: true, query: { enhanced: true } }
  );

  // Find this story's thumbnail (try jpg then png)
  const thumbnailKey = Object.keys(thumbnails).find(
    k => k.endsWith(`/${story.slug}.jpg`) || k.endsWith(`/${story.slug}.png`)
  );
  const thumbnail = thumbnailKey ? thumbnails[thumbnailKey].default : null;
</script>

<div class:external={isExternal}>
  <a
    href={finalHref}
    rel={isExternal ? "external noopener" : undefined}
    target={isExternal ? "_blank" : undefined}
    class="inner"
  >
    <div class="screenshot">
      {#if isExternal}
        <div class="external-badge">
          <ExternalLink size={18} />
        </div>
      {/if}
      {#if thumbnail}
        <enhanced:img
          src={thumbnail}
          loading="lazy"
          alt="Thumbnail for {story.title}"
        />
      {:else}
        <img
          src="{base}/common/thumbnails/screenshots/{story.slug}.jpg"
          loading="lazy"
          alt="Thumbnail for {story.title}"
        />
      {/if}
    </div>
    <div class="text">
      <div class="header-row">
        <h3 class="short">
          <strong>{@html story.title}</strong>
        </h3>
        <span class="month">{story.month}</span>
      </div>
      <p class="tease">{@html story.description}</p>
    </div>
  </a>
</div>

<style>
  .header-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--vcsi-space-md);
    margin-bottom: var(--vcsi-space-sm);
  }

  .header-row .month {
    font-size: 0.875rem;
    font-weight: var(--vcsi-font-weight-regular);
    color: var(--vcsi-muted);
    white-space: nowrap;
    font-family: var(--vcsi-font-sans);
    user-select: none;
  }

  a {
    display: block;
    color: inherit;
    text-decoration: none;
  }

  a:focus-visible {
    outline: 2px solid var(--vcsi-color-accent);
    outline-offset: 2px;
  }

  .screenshot {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 16px;
    border: 1px solid var(--vcsi-border);
    transition: border-color var(--vcsi-transition-base), transform var(--vcsi-transition-base);
  }

  a:hover .screenshot {
    border-color: var(--vcsi-fg);
    transform: translateY(-2px);
  }

  .screenshot img,
  .screenshot :global(picture img) {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.25s ease;
  }

  a:hover .screenshot img,
  a:hover .screenshot :global(picture img) {
    transform: scale(1.05);
  }

  .external-badge {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    z-index: 1;
    background: var(--vcsi-bg);
    border: 1px solid var(--vcsi-border);
    border-radius: 50%;
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .text {
    margin-top: 1.25rem;
  }

  h3.short {
    font-family: var(--vcsi-font-serif);
    line-height: 1;
    margin: 0 0 var(--vcsi-space-sm);
    letter-spacing: -0.05em;
  }

  p.tease {
    color: var(--vcsi-muted);
    font-size: var(--vcsi-font-size-small);
    margin: 0;
    line-height: 1.1;
  }

  @media (min-width: 960px) {
    h3.short {
      font-size: var(--vcsi-font-size-base);
    }
  }
</style>
