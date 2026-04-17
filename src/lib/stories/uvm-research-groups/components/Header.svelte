<script lang="ts">
	import { base } from '$app/paths';
	import copy from '../data/copy.json';

	const { title, authors, date } = copy;
</script>

<header class="story-header">
	<div class="header-content">
		<div class="header-text">
			<h1>{title}</h1>
			<div class="article-meta">
				<p class="author">
					By {#each authors as author, i}{#if i > 0}{i === authors.length - 1 ? ' and ' : ', '}{/if}{#if author.url}<a href={author.url}>{author.name}</a>{:else}{author.name}{/if}{/each}
				</p>
				<p class="date">{date}</p>
			</div>
		</div>
		<div class="logo-container">
			<img src="{base}/UVM_Seal_Gr.png" alt="University of Vermont Seal" class="logo" />
		</div>
	</div>
</header>

<style>
	.story-header {
		margin-bottom: 3rem;
		margin-top: 5rem;
	}

	.header-content {
		display: flex;
		align-items: flex-start;
		gap: 20px;
	}

	.header-text {
		flex: 1;
	}

	.story-header h1 {
		margin: 0 0 1rem 0;
		font-size: var(--vcsi-font-h1);
		line-height: 1.2;
	}

	.logo-container {
		flex-shrink: 0;
	}

	.logo {
		height: 260px;
		width: auto;
		object-fit: contain;
		max-width: 320px;
		transform: translateY(-20px);
	}

	.article-meta .author {
		font-size: var(--vcsi-font-md);
		color: #555;
		margin: 0 0 0.25rem 0;
	}

	.article-meta .author a {
		color: inherit;
	}

	.article-meta .author a:hover {
		text-decoration: underline;
	}

	.article-meta .date {
		font-size: var(--vcsi-font-size-small);
		color: #888;
		margin: 0;
	}

	@media (max-width: 1200px) {
		.header-content {
			flex-direction: column;
			align-items: center;
			text-align: center;
			gap: 1rem;
		}

		.logo {
			transform: none;
			height: 180px;
		}
	}

	@media (max-width: 768px) {
		.story-header {
			margin-top: 0rem;
		}
		.story-header h1 {
			font-size: clamp(2.1rem, 9vw, 4rem);
		}

		.logo {
			height: 200px;
		}
	}
</style>
