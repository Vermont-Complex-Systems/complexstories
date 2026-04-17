<script lang="ts">
	import { Scrolly, RenderContent, type ContentItem } from '@the-vcsi/scrolly-kit';
	import Spinner from '$lib/components/helpers/Spinner.svelte';
	import { innerWidth } from 'svelte/reactivity/window';
	import MorphingChart from './MorphingChart.svelte';
	import { loadDoddsPaperData, loadDoddsCoauthorData } from '../data.remote.js';
	import copy from '../data/copy.json';

	const steps = copy.morphingSteps as ContentItem[];

	let DoddsPaperData = $state(null);
	let DoddsCoauthorData = $state(null);

	Promise.all([loadDoddsPaperData(), loadDoddsCoauthorData()]).then(([p, c]) => {
		DoddsPaperData = p;
		DoddsCoauthorData = c;
	});

	let width = $state(innerWidth.current ?? 1200);
	const height = 1800;
	let scrollyIndex = $state(0);
</script>

<div class="scrolly-container">
	<div class="scrolly-chart">
		{#if DoddsPaperData && DoddsCoauthorData}
			<MorphingChart {scrollyIndex} {DoddsCoauthorData} {DoddsPaperData} {width} {height} />
		{:else}
			<Spinner />
		{/if}
	</div>

	<div class="scrolly-content">
		<div class="spacer"></div>
		<Scrolly bind:value={scrollyIndex}>
			{#each steps as text, i}
				{@const active = scrollyIndex === i}
				<div class="step" class:active>
					<div class="step-body"><RenderContent items={text} /></div>
				</div>
			{/each}
		</Scrolly>
		<div class="spacer"></div>
	</div>
</div>

<style>
	.scrolly-container {
		display: grid;
		grid-template-columns: 4fr 6fr;
		min-height: 100vh;
		gap: 4rem;
		margin-top: 3rem;

		/* Break out of parent prose width */
		width: min(1100px, calc(100vw - 2rem));
		margin-left: 50%;
		transform: translateX(-50%);
		position: relative;
	}

	.scrolly-chart {
		position: sticky;
		top: calc(50vh - 350px);
		height: fit-content;
		grid-column: 2;
		grid-row: 1;
	}

	.scrolly-content {
		grid-column: 1;
		grid-row: 1;
		width: 100%;
	}

	.spacer {
		height: 35vh;
	}

	.step {
		height: 80vh;
		display: flex;
		align-items: center;
	}

	.step .step-body {
		padding: 1rem;
		background: #f5f5f5;
		color: #ccc;
		border-radius: 5px;
		box-shadow: 1px 1px 10px rgba(0, 0, 0, 0.2);
		transition: all 500ms ease;
	}

	.step.active .step-body {
		background: white;
		color: black;
	}

	@media (max-width: 1200px) {
		.scrolly-container {
			display: block;
			margin-top: 2rem;
		}

		.scrolly-chart {
			position: sticky;
			top: calc(50vh - 200px);
			width: 100%;
			max-width: 90vw;
			margin: 1rem auto;
			z-index: -1;
		}

		.step {
			height: 100vh;
			justify-content: center;
		}

		.step .step-body {
			width: 90vw;
			max-width: 90vw;
			margin: 0 auto;
			text-align: center;
			background: rgba(255, 255, 255, 0.95);
			border: 1px solid rgba(0, 0, 0, 0.1);
			box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
			position: relative;
			z-index: 100;
		}

		.scrolly-chart :global(.legend) {
			display: none;
		}
	}

	@media (max-width: 768px) {
		.step .step-body {
			font-size: 1rem;
			padding: 0.75rem;
		}
	}
</style>
