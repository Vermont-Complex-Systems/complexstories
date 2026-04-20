<script>
	import PersonIcon from './PersonIcon.svelte';
	import { innerWidth } from 'svelte/reactivity/window';

	let { data = [], rows = 5, cellSize = 50, highlightName = null, highlightCategory = null, title = null, showLegend = false } = $props();

	let hoveredPerson = $state(null);
	let mousePos = $state({ x: 0, y: 0 });

	let isMobile = $derived(innerWidth.current <= 768);
	let cols = $derived(Math.ceil(Math.sqrt(data.length * (isMobile ? 0.5 : 2)))); // tall on mobile, wide on desktop
	let actualRows = $derived(Math.ceil(data.length / cols));

	function getPosition(index) {
		return {
			x: (index % cols) * cellSize,
			y: Math.floor(index / cols) * cellSize
		};
	}
</script>

<div class="waffle">
	{#if title}
		<h4>{title}</h4>
	{/if}
	
	<svg width={cols * cellSize} height={actualRows * cellSize} viewBox="0 0 {cols * cellSize} {actualRows * cellSize}" style="max-width: 100%; height: auto;">
		{#each data as person, i}
			{@const pos = getPosition(i)}
			<foreignObject
				x={pos.x}
				y={pos.y}
				width={cellSize}
				height={cellSize}
				role="img"
				onmouseenter={() => hoveredPerson = person}
				onmouseleave={() => hoveredPerson = null}
				onmousemove={(e) => mousePos = { x: e.clientX, y: e.clientY }}
			>
				<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;">
					<PersonIcon 
						{person} 
						size={cellSize} 
						{highlightName} 
						{highlightCategory} 
					/>
				</div>
			</foreignObject>
		{/each}
	</svg>

	{#if showLegend}
		<div class="legend">
			<span class="legend-item">
				<svg width="12" height="12" viewBox="0 0 24 24"><polygon points="12,2 22,22 2,22" fill="#666"/></svg>
				Male
			</span>
			<span class="legend-item">
				<svg width="12" height="12" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" fill="#666"/></svg>
				Female
			</span>
			<span class="legend-item">
				<span class="legend-swatch" style="background: #ffd100;"></span>
				Has research group
			</span>
			<span class="legend-item">
				<span class="legend-swatch" style="background: #257355;"></span>
				No research group
			</span>
			{#if highlightCategory === 'no_oa_uid'}
				<span class="legend-item">
					<span class="legend-swatch" style="background: #CCCCCC;"></span>
					No OpenAlex ID
				</span>
			{/if}
		</div>
	{/if}

	{#if hoveredPerson}
		<div
			class="tooltip"
			style:left="{mousePos.x + 10}px"
			style:top="{mousePos.y - 10}px"
		>
			{hoveredPerson.name || hoveredPerson.ego_display_name}<br>
			{hoveredPerson.has_research_group ? 'Has research group' : 'No research group'}
			{#if hoveredPerson.college}
				<br>College: {hoveredPerson.college}
			{/if}
			{#if hoveredPerson.department}
				<br>Department: {hoveredPerson.department}
			{/if}
			{#if highlightCategory === 'no_oa_uid'}
				<br>OpenAlex ID: {hoveredPerson.oa_uid || 'None'}
			{/if}
		</div>
	{/if}
</div>

<style>
	.waffle {
		position: relative;
		display: inline-block;
		margin-bottom: 1.5rem;
	}

	h4 {
		margin: 0 0 0.5rem 0;
		font-size: 14px;
		font-weight: bold;
		color: #666;
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		margin-top: 0.5rem;
		font-size: 12px;
		color: #555;
	}

	.legend-item {
		display: flex;
		align-items: center;
		gap: 4px;
	}

	.legend-swatch {
		display: inline-block;
		width: 12px;
		height: 12px;
		border-radius: 2px;
	}

	.tooltip {
		position: fixed;
		background: black;
		color: white;
		padding: 8px;
		border-radius: 4px;
		font-size: 12px;
		pointer-events: none;
		z-index: 1000;
	}
</style>