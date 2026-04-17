<script>
  import { base } from "$app/paths";

  let { posts } = $props();
</script>

<section class="blog-posts">
  {#if posts && posts.length > 0}
    <div class="posts-grid">
      {#each posts as post (post.slug)}
        <article class="post-card">
          <a href="{base}/blog/{post.slug}" class="post-link">
            <header class="post-header">
              <span class="post-title">
                {post.title || 'Untitled Post'}
              </span>
              <div class="post-meta">
                <time datetime={post.date}>
                  {post.month || 'No date'}
                </time>
                {#if post.author && post.author.length > 0}
                  <span class="author">by {post.author.join(', ')}</span>
                {/if}
              </div>
            </header>

            <div class="post-excerpt">
              <p>{post.excerpt || post.tease || 'No excerpt available'}</p>
            </div>

            {#if post.tags && post.tags.length > 0}
              <div class="post-tags">
                {#each post.tags.slice(0, 3) as tag (tag)}
                  <span class="tag">{tag}</span>
                {/each}
              </div>
            {/if}
          </a>
        </article>
      {/each}
    </div>
  {:else}
    <div class="no-posts">
      <p>No blog posts found.</p>
    </div>
  {/if}
</section>

<style>
  .blog-posts {
    margin: 2rem 0;
  }

  .posts-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem 1.5rem;
    margin: 0 auto;
  }

  @media (min-width: 768px) {
    .posts-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 3.5rem 2rem;
    }
  }

  @media (min-width: 1200px) {
    .posts-grid {
      grid-template-columns: repeat(3, 1fr);
      gap: 4rem 2.5rem;
    }
  }

  .post-card {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 12px;
    overflow: hidden;
    transition: all var(--vcsi-transition-base);
    min-height: 250px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  }

  .post-card:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.9);
  }

  :global(.dark) .post-card {
    background: rgba(30, 30, 30, 0.8);
    border-color: rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }

  :global(.dark) .post-card:hover {
    background: rgba(40, 40, 40, 0.9);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }

  .post-link {
    display: block;
    padding: var(--vcsi-space-lg);
    text-decoration: none;
    color: inherit;
    height: 100%;
    min-height: 200px;
  }

  .post-title {
    font-family: var(--vcsi-font-sans);
    font-weight: var(--vcsi-font-weight-bold);
    font-size: var(--vcsi-font-size-md);
    line-height: 1.2;
    color: var(--vcsi-fg);
    display: block;
    margin-bottom: var(--vcsi-space-sm);
  }

  .post-meta {
    font-family: var(--vcsi-font-mono);
    font-size: clamp(12px, 1vw, 0.8rem);
    color: var(--vcsi-gray-600);
    text-transform: uppercase;
    margin-bottom: var(--vcsi-space-md);
  }

  .author {
    margin-left: var(--vcsi-space-sm);
  }

  .post-excerpt p {
    color: var(--vcsi-gray-600);
    margin: 0;
    line-height: 1.5;
    font-size: var(--vcsi-font-size-small);
  }

  .post-tags {
    margin-top: var(--vcsi-space-md);
    display: flex;
    flex-wrap: wrap;
    gap: var(--vcsi-space-sm);
  }

  .tag {
    background: rgba(255, 255, 255, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: clamp(12px, 1vw, 0.8rem);
    font-family: var(--vcsi-font-mono);
    text-transform: uppercase;
    color: var(--vcsi-fg);
    transition: all var(--vcsi-transition-fast);
  }

  .tag:hover {
    background: rgba(255, 255, 255, 0.4);
  }

  :global(.dark) .tag {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.1);
  }

  :global(.dark) .tag:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .no-posts {
    text-align: center;
    padding: var(--vcsi-space-xl);
    color: var(--vcsi-gray-600);
  }
</style>
