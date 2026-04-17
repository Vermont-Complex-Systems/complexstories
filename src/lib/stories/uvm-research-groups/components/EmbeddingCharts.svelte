<script>
	import EmbeddingDotPlot from './EmbeddingDotPlot.svelte';
	import BrushableCoauthorChart from './BrushableCoauthorChart.svelte';
	import * as d3 from 'd3';
	import { innerWidth } from 'svelte/reactivity/window';
	import { ageColorScale, processCoauthorData, parseDate } from '../utils/combinedChartUtils2';

	let { embeddingData, coauthorData } = $props();

	const chartWidth = 250;
	const chartHeight = 1045;

	let isMobile = $derived(innerWidth.current <= 1200);
	let colorMode = $state('age_diff');
	let highlightedCoauthor = $state(null);
	let selectedCoauthors = $state([]);

	let filteredCoauthorData = $derived(coauthorData);

	let timeScale = $derived.by(() => {
		const allDates = coauthorData.map((d) => parseDate(d.pub_date));
		const [minDate, maxDate] = d3.extent(allDates);
		const paddedMinDate = new Date(minDate.getFullYear() - 1, 0, 1);
		const paddedMaxDate = new Date(maxDate.getFullYear() + 1, 11, 31);
		return d3.scaleTime().domain([paddedMinDate, paddedMaxDate]).range([50, chartHeight - 50]);
	});

	let processedCoauthorData = $derived.by(() => {
		if (!filteredCoauthorData?.length) return [];
		return processCoauthorData(filteredCoauthorData, chartWidth, chartHeight, timeScale);
	});

	let styledCoauthorData = $derived.by(() => {
		if (!processedCoauthorData.length) return [];
		return processedCoauthorData.map((point) => {
			let colorValue;
			if (colorMode === 'age_diff') colorValue = point.age_category;
			else if (colorMode === 'acquaintance') colorValue = point.acquaintance;
			else if (colorMode === 'institutions')
				colorValue = point.institution_normalized || point.institution;
			else if (colorMode === 'shared_institutions')
				colorValue = point.shared_institutions_normalized || point.shared_institutions;

			const isNull = colorValue == null || colorValue === '' || colorValue === 'Unknown';
			let displayColor, opacity, strokeWidth;

			if (isNull) {
				displayColor = '#888888';
				opacity = 0.3;
				strokeWidth = 0.1;
			} else if (ageColorScale) {
				displayColor =
					colorMode === 'acquaintance'
						? ageColorScale(+point.all_times_collabo || 0)
						: ageColorScale(colorValue);
				opacity = 0.9;
				strokeWidth = 0.3;
			} else {
				displayColor = '#888888';
				opacity = 0.9;
				strokeWidth = 0.3;
			}

			if (highlightedCoauthor) {
				const isHighlighted = point.ego_display_name === highlightedCoauthor;
				opacity *= isHighlighted ? 1 : 0.2;
			}

			return { ...point, displayColor, opacity, strokeWidth };
		});
	});

	let timeRange = $derived.by(() => {
		if (selectedCoauthors.length === 0) return null;
		const years = selectedCoauthors.map((c) => parseInt(c.year)).filter(Boolean);
		if (years.length === 0) return null;
		return [Math.min(...years), Math.max(...years)];
	});

	function handleBrushSelection(brushedPoints) {
		selectedCoauthors = brushedPoints;
	}
</script>

<EmbeddingDotPlot
	{embeddingData}
	width={isMobile ? innerWidth.current : 1200}
	height={isMobile ? 350 : 650}
	{selectedCoauthors}
	{timeRange}
/>

{#if !isMobile}
	<BrushableCoauthorChart
		displayData={styledCoauthorData}
		width={chartWidth}
		height={chartHeight}
		{timeScale}
		onBrushSelection={handleBrushSelection}
	/>
	<small>brush to filter</small>
{/if}
