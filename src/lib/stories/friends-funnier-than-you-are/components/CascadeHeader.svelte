<script lang="ts">
	interface Author {
		name: string;
		url?: string;
	}

	let { title, subtitle, authors, date }: {
		title: string;
		subtitle?: string;
		authors?: Author[];
		date?: string;
	} = $props();
</script>

<div class="title">
	<h1>{title}</h1>
	{#if subtitle}
		<h2>{subtitle}</h2>
	{/if}

	<div class="article-meta">
		{#if authors}
			<p class="author">
				By
				{#each authors as author, i}
					<a target="_blank" rel="noreferrer" href={author.url}>{author.name}</a>{#if i < authors.length - 1}{i === authors.length - 2 ? ' and ' : ', '}{/if}
				{/each}
			</p>
		{/if}
		{#if date}
			<p class="date">{date}</p>
		{/if}
	</div>
</div>

<style>
	.title {
		margin: 0 auto 5rem auto;
		text-align: center;
	}

	.title h1 {
		font-family: var(--vcsi-font-serif);
		max-width: 450px;
		font-size: var(--vcsi-font-size-giant);
		margin: 6rem auto 1rem auto;
	}

	.title h2 {
		font-size: var(--vcsi-font-size-md);
		font-weight: 400;
		margin: 0 auto 3rem auto;
	}

	.article-meta {
		margin: -1rem auto 2rem auto;
		max-width: 30rem;
		text-align: center;
	}

	.article-meta .author {
		font-size: var(--vcsi-font-size-md);
		color: var(--vcsi-color-text-muted, #666);
		margin: 0 0 0.25rem 0;
		font-weight: 500;
	}

	.article-meta .author a {
		color: inherit;
		text-decoration: underline;
	}

	.article-meta .date {
		font-size: var(--vcsi-font-size-small);
		color: var(--vcsi-color-text-muted, #999);
		margin: 0;
		font-weight: 400;
	}

	@media (max-width: 768px) {
		.title h1 {
			font-size: 4rem;
		}

		.title h2 {
			font-size: 2rem;
		}

		.article-meta .author {
			font-size: var(--vcsi-font-size-lg);
		}

		.article-meta .date {
			font-size: var(--vcsi-font-size-md);
		}
	}
</style>
