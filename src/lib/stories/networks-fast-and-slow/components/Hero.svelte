<script lang="ts">
	import { browser } from '$app/environment';
	import { RenderContent } from '@the-vcsi/scrolly-kit';
	import Bouncing from './Bouncing.svelte';

	let { data } = $props();

	let numBalls = $state(50);
</script>

<div class="hero">
	<header class="hero-head">
		<h1>{data.title}</h1>
		{#if data.subtitle}<p class="subtitle">{data.subtitle}</p>{/if}
		<div class="article-meta">
			<p class="author">
				By {#each data.authors as author, i}{#if i > 0}{i === data.authors.length - 1 ? ' and ' : ', '}{/if}{#if author.url}<a href={author.url}>{author.name}</a>{:else}{author.name}{/if}{/each}
			</p>
			<p class="date">{data.date}</p>
		</div>
	</header>

	<div class="hero-body">
		<div class="text-side">
			<RenderContent items={data.introduction} />
		</div>

		<div class="plot-side">
			<label class="ball-count">
				Ball count
				<input type="range" bind:value={numBalls} min="1" max="100" />
				<span>{numBalls}</span>
			</label>
			<div class="chart-container">
				{#if browser}
					<Bouncing width={300} height={300} {numBalls} />
				{:else}
					<div style="width:300px;height:300px;"></div>
				{/if}
			</div>
		</div>
	</div>
</div>

<style>
	.hero {
		--text-col: var(--vcsi-story-max-width, 600px);
		--viz-col: 350px;

		max-width: calc(var(--text-col) + var(--viz-col) + 2rem);
		margin: 0 auto;
		padding: 6rem 1rem 2rem;
		text-align: left;
	}

	.hero-head,
	.text-side {
		max-width: var(--text-col);
	}

	.hero-head {
		margin-bottom: 2rem;
	}

	.hero-head h1 {
		font-size: var(--vcsi-font-size-giant);
		margin: 0 0 0.75rem 0;
		line-height: 1.1;
	}

	.subtitle {
		font-size: var(--vcsi-font-size-md);
		color: #555;
		margin: 0 0 1.25rem 0;
		font-weight: 400;
	}

	.hero-body {
		display: flex;
		align-items: flex-start;
		gap: 2rem;
	}

	.text-side {
		flex: 1;
		min-width: 0;
	}

	.text-side :global(p) {
		line-height: 1.55;
		margin: 0 0 1rem 0;
	}

	.article-meta .author {
		font-size: var(--vcsi-font-size-small);
		color: #666;
		margin: 0 0 0.25rem 0;
		font-weight: 500;
	}

	.article-meta .date {
		font-size: var(--vcsi-font-size-small);
		color: #888;
		margin: 0;
	}

	.article-meta a {
		color: inherit;
		text-decoration: underline;
	}

	.plot-side {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-top: 1rem;
	}

	@media (max-width: 900px) {
		.plot-side {
			margin-top: 0;
		}
	}

	.ball-count {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 1rem;
		font-size: 1rem;
	}

	.chart-container {
		border: 2px solid #ccc;
		border-radius: 6px;
		box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
		background: #f9f9f9;
		display: inline-block;
		line-height: 0;
	}

	.plot-side :global(canvas) {
		max-width: 100%;
	}

	@media (max-width: 900px) {
		.hero-body {
			flex-direction: column;
			align-items: center;
			gap: 1.5rem;
		}

		.subtitle {
			font-size: var(--vcsi-font-size-lg);
		}
		
		.article-meta .author {
			font-size: var(--vcsi-font-size-md);
		}

	}
</style>
