<script>
  import Meta from '$lib/components/Meta.svelte';
  import { MarkdownRenderer } from '@the-vcsi/scrolly-kit';
  import { ArrowLeft } from '@lucide/svelte';
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { getBlog } from '$lib/blog.remote';

  const { blog, content } = await getBlog(page.params.slug);
</script>

<Meta
  title={`${blog.title} - Complex Stories`}
  description={blog.excerpt || blog.tease || `Read ${blog.title} on Complex Stories blog`}
/>

<article class="blog-post">
  <header class="post-header">
    <nav class="breadcrumb" aria-label="Breadcrumb">
      <a href="{base}/blog" class="back-link"><ArrowLeft size={16} /> Back to Blog</a>
    </nav>

    <h1>{blog.title}</h1>

    {#if blog.tease && blog.tease.trim()}
      <p class="post-tease">{blog.tease}</p>
    {/if}

    <div class="post-meta">
      <time datetime={blog.date}>{blog.month}</time>

      {#if blog.author?.length}
        <span class="authors">by {blog.author.join(', ')}</span>
      {/if}

      {#if blog.tags?.length}
        <div class="tags">
          {#each blog.tags as tag (tag)}
            <span class="tag">{tag}</span>
          {/each}
        </div>
      {/if}
    </div>
  </header>

  <div class="post-content">
    {#if blog.hasMarkdown}
      <MarkdownRenderer text={content} />
    {:else}
      {@html content}
    {/if}
  </div>
</article>

<style>
  .blog-post {
    max-width: 70rem;
    margin: 8rem auto 0;
    padding: 2rem var(--vcsi-page-inline-padding);
    overflow-x: visible;
    box-sizing: border-box;
    width: 100%;
  }

  .post-header,
  .post-content {
    max-width: 40rem;
    margin: 0 auto;
    padding: 0 1rem;
  }

  .post-header {
    margin-bottom: 3rem;
    text-align: left;
  }

  .breadcrumb {
    margin-bottom: 0.5rem;
  }

  .back-link {
    font-family: var(--vcsi-font-mono);
    font-size: var(--vcsi-font-size-base);
    text-transform: uppercase;
    color: rgb(0, 91, 187);
    text-decoration: none;
    transition: all var(--vcsi-transition-base);
    letter-spacing: 0.5px;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }

  .back-link:hover {
    transform: translateX(-2px);
  }

  .post-header h1 {
    font-family: var(--vcsi-font-sans);
    font-weight: var(--vcsi-font-weight-bold);
    font-size: var(--vcsi-font-size-xl);
    margin: 0 0 1rem 0;
    line-height: 1.1;
    text-transform: capitalize;
  }

  .post-tease {
    font-size: var(--vcsi-font-size-md);
    color: var(--vcsi-gray-600);
    line-height: 1.4;
    margin: 0 0 2rem 0;
    font-weight: var(--vcsi-font-weight-light);
  }

  .post-meta {
    font-family: var(--vcsi-font-mono);
    font-size: var(--vcsi-font-size-small);
    color: var(--vcsi-gray-600);
    text-transform: capitalize;
    letter-spacing: 0.5px;
  }

  .authors {
    margin-left: 1rem;
    text-transform: capitalize;
  }

  .tags {
    margin-top: 1rem;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 0.5rem;
  }

  .tag {
    background: var(--vcsi-gray-100);
    padding: 0.25rem 0.75rem;
    border-radius: 3px;
    font-size: clamp(12px, 1vw, 0.8rem);
  }

  /* Markdown content */
  .post-content {
    position: relative;
    margin-bottom: 3rem;
    font-family: var(--vcsi-font-serif);
    font-size: 1.3rem;
    line-height: 1.5;
    color: var(--vcsi-fg);
  }

  .post-content :global(p) {
    margin: 1.5rem 0;
    font-weight: 400;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  .post-content :global(li) {
    margin: 0.75rem 0;
    line-height: 1.5;
  }

  .post-content :global(ol) {
    margin: 1.5rem 0;
    padding-left: 1.5rem;
  }

  .post-content :global(blockquote) {
    border: none;
    margin: 2rem 0;
    padding: 0 0 0 1.5rem;
    background: none;
    font-size: 1.2em;
    line-height: 1.2;
    color: #2c5aa0;
    border-left: 3px solid #2c5aa0;
  }

  .post-content :global(blockquote p) {
    margin: 0;
  }

  /* Code blocks */
  .post-content :global(pre) {
    background: var(--vcsi-gray-100);
    border-radius: 3px;
    padding: 1rem;
    margin: 1.5rem 0;
    overflow-x: auto;
    font-family: var(--vcsi-font-mono);
    font-size: 0.7em;
    line-height: 1.3;
    white-space: pre;
    max-width: 100%;
    box-sizing: border-box;
  }

  .post-content :global(pre code) {
    background: none;
    padding: 0;
    border: none;
    white-space: pre;
    font-family: inherit;
    font-size: inherit;
  }

  /* Inline code */
  .post-content :global(p code),
  .post-content :global(li code) {
    font-family: var(--vcsi-font-mono);
    font-size: 0.75em;
    background: var(--vcsi-gray-100);
    padding: 0.125rem 0.25rem;
    border-radius: 2px;
  }

  /* Dark mode */
  :global(.dark) .post-content :global(blockquote) {
    color: #4a90e2;
    border-left-color: #4a90e2;
  }

  :global(.dark) .post-content :global(pre) {
    background: var(--vcsi-gray-800);
  }

  :global(.dark) .post-content :global(p code),
  :global(.dark) .post-content :global(li code) {
    background: var(--vcsi-gray-800);
  }

  /* Image grids */
  .post-content :global(.image-grid) {
    display: flex;
    gap: 1rem;
    margin: 2rem 0;
  }

  .post-content :global(.image-item) {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .post-content :global(.image-item a) {
    display: block;
    text-decoration: none;
    border-radius: 3px;
    overflow: hidden;
    margin-bottom: 0.5rem;
    height: 200px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transition: transform var(--vcsi-transition-base), box-shadow var(--vcsi-transition-base);
  }

  .post-content :global(.image-item a:hover) {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  }

  .post-content :global(.image-grid img) {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .post-content :global(.image-caption) {
    font-family: var(--vcsi-font-sans);
    font-size: var(--vcsi-font-size-small);
    color: var(--vcsi-gray-600);
    text-align: center;
    margin: 0;
    padding: 0 0.5rem;
    line-height: 1.3;
    font-weight: 500;
  }

  /* Images should not overflow */
  .post-content :global(img) {
    max-width: 100%;
    height: auto;
  }

  /* Margin images beside code blocks */
  .post-content :global(div.margin-right) {
    position: absolute;
    right: -320px;
    max-width: 280px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  @media (max-width: 768px) {
    .blog-post {
      margin-top: 3rem;
      padding: 1.5rem var(--vcsi-page-inline-padding);
    }

    .post-header {
      margin-bottom: 2rem;
    }

    .post-header h1 {
      font-size: var(--vcsi-font-size-lg);
    }

    .post-tease {
      font-size: var(--vcsi-font-size-base);
      margin-bottom: 1rem;
    }

    .back-link {
      font-size: 12px;
    }

    .post-content {
      font-size: 1.1rem;
    }

    .post-content :global(pre) {
      font-size: 0.65em;
      padding: 0.75rem;
      margin: 1rem 0;
    }

    .post-content :global(.image-grid) {
      flex-direction: column;
      align-items: center;
    }

    .post-content :global(.image-item) {
      max-width: 100%;
    }

    .post-content :global(.image-item a) {
      height: 180px;
    }

    .post-content :global(div.margin-right) {
      position: static;
      margin: 1rem auto;
      width: 90%;
      max-width: none;
    }
  }
</style>
