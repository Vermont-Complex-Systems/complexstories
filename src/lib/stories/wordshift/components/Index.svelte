<script lang="ts">
	import { base } from '$app/paths';
	import { RenderContent } from '@the-vcsi/scrolly-kit';
	import SystemPicker from './SystemPicker.svelte';
	import WordShiftChart from './WordShiftChart.svelte';
	import { getWordShift } from '../wordshift.remote';
	import { PLATFORMS, PLATFORM_KEYS, GRANULARITY_LABELS } from '../constants';
	import type { PlatformKey } from '../constants';
	import { spanFor, type Granularity } from '../dates';
	import type { SystemSelection } from '../types';

	let { story, data } = $props();

	let platformKey = $state<PlatformKey>('wikipedia');
	const platform = $derived(PLATFORMS[platformKey]);

	// A platform is chosen once for the whole comparison (the endpoint compares
	// within one dataset). Selections are kept per platform — seeded from each
	// one's defaults and remembered when switching — so the active pair is just
	// a lookup, no state-resetting effect.
	// Per-platform state — granularity + the two systems, seeded from defaults and
	// remembered when switching platforms. The active triple is just a lookup.
	type SystemsState = { gran: Granularity; s1: SystemSelection; s2: SystemSelection };
	const store = $state(
		Object.fromEntries(
			PLATFORM_KEYS.map((k) => [
				k,
				{
					gran: PLATFORMS[k].granularities[0],
					s1: { ...PLATFORMS[k].defaults.s1 },
					s2: { ...PLATFORMS[k].defaults.s2 }
				}
			])
		) as Record<PlatformKey, SystemsState>
	);

	const granularity = $derived(store[platformKey].gran);
	const system1 = $derived(store[platformKey].s1);
	const system2 = $derived(store[platformKey].s2);

	// Switching granularity re-snaps each system's span to the new unit, from its
	// current anchor, clamped to the platform window.
	function setGranularity(g: Granularity) {
		const p = PLATFORMS[platformKey];
		const c = store[platformKey];
		c.gran = g;
		c.s1 = { ...c.s1, ...spanFor(g, c.s1.start, p.min, p.max) };
		c.s2 = { ...c.s2, ...spanFor(g, c.s2.start, p.min, p.max) };
	}

	// Plain snapshot → stable cache key for the query.
	const args = $derived({
		platform: platformKey,
		system1: { country: system1.country, start: system1.start, end: system1.end },
		system2: { country: system2.country, start: system2.start, end: system2.end }
	});

	// Header labels: country on entity platforms, platform name otherwise.
	const leftLabel = $derived(platform.hasEntity ? system1.country : platform.label);
	const rightLabel = $derived(platform.hasEntity ? system2.country : platform.label);
</script>

<svelte:head>
	<title>{story?.title ?? 'Word Shift'} · Complex Stories</title>
</svelte:head>

<article class="app">
	<aside class="sidebar">
		<header class="intro">
			<a href="{base}/" class="home">← Complex Stories</a>
			<h1>{story?.title ?? 'Word Shift'}</h1>
			{#if data?.introduction}
				<div class="lede"><RenderContent items={data.introduction} /></div>
			{/if}
		</header>

		<section class="card">
			<div class="card-head">
				<h2>Comparison</h2>
				<p><em>💡 Use arrows to navigate the calendar.</em></p>
			</div>

			<div class="platforms" role="group" aria-label="Platform">
				{#each PLATFORM_KEYS as key (key)}
					<button
						type="button"
						class="platform-btn"
						class:active={platformKey === key}
						aria-pressed={platformKey === key}
						onclick={() => (platformKey = key)}
					>
						{PLATFORMS[key].label}
					</button>
				{/each}
			</div>

			{#if platform.granularities.length > 1}
				<div class="granularity" role="group" aria-label="Granularity">
					{#each platform.granularities as g (g)}
						<button
							type="button"
							class="gran-btn"
							class:active={granularity === g}
							aria-pressed={granularity === g}
							onclick={() => setGranularity(g)}
						>
							{GRANULARITY_LABELS[g]}
						</button>
					{/each}
				</div>
			{/if}

			<div class="controls">
				<SystemPicker
					label="System 1 — baseline"
					bind:value={store[platformKey].s1}
					{platform}
					{granularity}
				/>
				<div class="vs" aria-hidden="true">vs</div>
				<SystemPicker label="System 2" bind:value={store[platformKey].s2} {platform} {granularity} />
			</div>
		</section>
	</aside>

	<section class="result">
		<svelte:boundary>
			{#snippet pending()}
				<div class="state">
					<p>Computing word shift…</p>
				</div>
			{/snippet}

			{#snippet failed(error, reset)}
				<div class="state error">
					<p class="msg">
						{(error as { body?: { message?: string } })?.body?.message ?? String(error)}
					</p>
					<p class="hint">
						Couldn't reach the Storywrangler wordshift API. Check your connection (or the
						<code>STORYWRANGLER_URL</code> setting), then retry.
					</p>
					<button class="retry" onclick={reset}>Retry</button>
				</div>
			{/snippet}

			<WordShiftChart data={await getWordShift(args)} {leftLabel} {rightLabel} />
		</svelte:boundary>
	</section>
</article>

<style>
	.app {
		display: grid;
		grid-template-columns: 22rem 1fr;
		min-height: 100vh;
		background: var(--vcsi-bg);
		color: var(--vcsi-fg);
		font-family: var(--vcsi-font-sans);
	}
	.sidebar {
		max-height: 100vh;
		position: sticky;
		top: 0;
		overflow-y: auto;
		padding: var(--vcsi-space-lg);
		border-right: 1px solid var(--vcsi-border);
		display: flex;
		flex-direction: column;
		gap: var(--vcsi-space-lg);
	}
	.home {
		font-size: 0.8rem;
		color: var(--vcsi-muted);
		text-decoration: none;
	}
	.home:hover {
		color: var(--vcsi-fg);
	}
	.intro h1 {
		font-size: 1.75rem;
		font-weight: 700;
		letter-spacing: -0.02em;
		margin: 0.5rem 0 0;
	}
	.lede {
		margin-top: 0.5rem;
		color: var(--vcsi-muted);
		line-height: 1.55;
		font-size: 0.9rem;
	}
	.lede :global(code),
	.hint code {
		font-size: 0.85em;
		background: var(--vcsi-code-bg);
		padding: 0.05em 0.35em;
		border-radius: 4px;
	}
	.card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-md);
		padding: 1rem;
	}
	.card-head h2 {
		font-size: 1rem;
		font-weight: 600;
		margin: 0;
	}
	.card-head p {
		font-size: 0.8rem;
		color: var(--vcsi-muted);
		margin: 0.15rem 0 0;
	}
	.platforms {
		display: grid;
		grid-template-columns: repeat(2, 1fr);
		gap: 0.35rem;
	}
	.platform-btn {
		padding: 0.4rem 0.5rem;
		font-size: 0.8rem;
		font-family: inherit;
		font-weight: 500;
		color: var(--vcsi-fg);
		background: var(--vcsi-bg);
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-sm);
		cursor: pointer;
		transition: border-color 0.15s, background 0.15s;
	}
	.platform-btn:hover {
		border-color: var(--vcsi-muted);
	}
	.platform-btn.active {
		background: var(--vcsi-fg);
		color: var(--vcsi-bg);
		border-color: var(--vcsi-fg);
	}
	.granularity {
		display: flex;
		gap: 0.25rem;
	}
	.gran-btn {
		flex: 1;
		padding: 0.3rem 0.5rem;
		font-size: 0.75rem;
		font-family: inherit;
		color: var(--vcsi-muted);
		background: var(--vcsi-bg);
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-sm);
		cursor: pointer;
		transition: border-color 0.15s, color 0.15s;
	}
	.gran-btn:hover {
		border-color: var(--vcsi-muted);
		color: var(--vcsi-fg);
	}
	.gran-btn.active {
		color: var(--vcsi-fg);
		border-color: var(--vcsi-fg);
		font-weight: 600;
	}
	.controls {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.vs {
		color: var(--vcsi-muted);
		font-style: italic;
		text-align: center;
	}
	.result {
		padding: var(--vcsi-space-lg) var(--vcsi-space-xl) var(--vcsi-space-2xl);
		/* clip (not hidden) so it doesn't become a scroll container — keeps the
		   chart's sticky bottom-left legend pinned to the viewport, not this box. */
		overflow-x: clip;
	}
	.state {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		text-align: center;
		color: var(--vcsi-muted);
	}
	.state.error .msg {
		color: var(--vcsi-fg);
		font-weight: 600;
	}
	.state .hint {
		font-size: 0.875rem;
		max-width: 32rem;
	}
	.retry {
		padding: 0.45rem 1rem;
		font-size: 0.875rem;
		font-family: inherit;
		color: var(--vcsi-fg);
		background: var(--vcsi-bg);
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-sm);
		cursor: pointer;
	}
	.retry:hover {
		border-color: var(--vcsi-fg);
	}
	@media (max-width: 768px) {
		.app {
			grid-template-columns: 1fr;
		}
		.sidebar {
			position: static;
			max-height: none;
			overflow: visible;
			border-right: none;
			border-bottom: 1px solid var(--vcsi-border);
		}
	}
</style>
