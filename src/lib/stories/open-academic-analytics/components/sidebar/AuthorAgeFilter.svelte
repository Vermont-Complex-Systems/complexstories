<script>
  import * as d3 from 'd3';
  import { dashboardState } from '$stories/open-academic-analytics/state.svelte.js';
  import { Baby } from "@lucide/svelte";

  let { authors } = $props();

  // Use authors filtered by research group (but not age filter yet)
  let availableAuthors = $derived.by(() => {
    let result = authors || [];

    // Apply research group filter only (not age filter)
    if (dashboardState.researchGroupFilter && dashboardState.researchGroupFilter !== 'all') {
      switch (dashboardState.researchGroupFilter) {
        case 'with_group':
          result = result.filter(author => author.has_research_group === true);
          break;
        case 'without_group':
          result = result.filter(author => author.has_research_group === false);
          break;
      }
    }

    return result;
  });

  // Extract age data from available authors and calculate range
  let authorAgeData = $derived.by(() => {
    if (!availableAuthors || availableAuthors.length === 0) return { ages: [], min: 0, max: 100 };
    
    const ages = availableAuthors
      .map(author => +author.current_age || 0)
      .filter(age => age > 0 && age < 120)
      .sort((a, b) => a - b);
    
    if (ages.length === 0) return { ages: [], min: 0, max: 100 };
    
    return {
      ages,
      min: Math.floor(Math.min(...ages) / 5) * 5,
      max: Math.ceil(Math.max(...ages) / 5) * 5
    };
  });

  // SVG dimensions
  const width = 240;
  const height = 100;
  const margin = { top: 10, right: 40, bottom: 35, left: 20 };
  const chartWidth = width - margin.left - margin.right;
  const chartHeight = height - margin.top - margin.bottom;

  // Create histogram bins
  let histogram = $derived.by(() => {
    if (!authorAgeData.ages.length) return [];
    
    const binGenerator = d3.bin()
      .domain([authorAgeData.min, authorAgeData.max])
      .thresholds(12);
    
    return binGenerator(authorAgeData.ages);
  });

  // Scales
  let xScale = $derived(d3.scaleLinear()
    .domain([authorAgeData.min, authorAgeData.max])
    .range([0, chartWidth]));

  let yScale = $derived.by(() => {
    const maxCount = Math.max(...histogram.map(d => d.length), 1);
    return d3.scaleLinear()
      .domain([0, maxCount])
      .range([chartHeight, 0]);
  });

  // Selected bins state
  let selectedBins = $state(new Set());

  // Calculate age range from selected bins
  let selectedAgeRange = $derived.by(() => {
    if (selectedBins.size === 0) return null;
    
    const selectedBinArray = Array.from(selectedBins);
    const minBin = Math.min(...selectedBinArray);
    const maxBin = Math.max(...selectedBinArray);
    
    return [
      Math.round(histogram[minBin]?.x0 || authorAgeData.min),
      Math.round(histogram[maxBin]?.x1 || authorAgeData.max)
    ];
  });

  // Update dashboard state when selection changes
  $effect(() => {
    dashboardState.authorAgeFilter = selectedAgeRange;
  });

  // Handle bin click
  function handleBinClick(binIndex, event) {
    event.stopPropagation();
    
    if (event.shiftKey && selectedBins.size > 0) {
      // Shift+click: select range from first selected to clicked bin
      const existingBins = Array.from(selectedBins);
      const minExisting = Math.min(...existingBins);
      const maxExisting = Math.max(...existingBins);
      
      const rangeStart = Math.min(minExisting, binIndex);
      const rangeEnd = Math.max(maxExisting, binIndex);
      
      selectedBins = new Set();
      for (let i = rangeStart; i <= rangeEnd; i++) {
        selectedBins.add(i);
      }
    } else if (event.ctrlKey || event.metaKey) {
      // Ctrl/Cmd+click: toggle individual bin
      if (selectedBins.has(binIndex)) {
        selectedBins.delete(binIndex);
      } else {
        selectedBins.add(binIndex);
      }
      selectedBins = new Set(selectedBins); // Trigger reactivity
    } else {
      // Regular click: select only this bin
      selectedBins = new Set([binIndex]);
    }
  }

  // Handle keyboard events for bins
  function handleBinKeydown(event, binIndex) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleBinClick(binIndex, event);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      clearFilter();
    }
  }

  // Clear selection
  function clearFilter() {
    selectedBins = new Set();
  }

  // Show filtered author count
  let filteredAuthorCount = $derived.by(() => {
    if (!selectedAgeRange) return availableAuthors.length;
    const [min, max] = selectedAgeRange;
    return availableAuthors.filter(author => {
      const age = author.current_age || 0;
      return age >= min && age <= max;
    }).length;
  });

  // Show filter status like ResearchGroupFilter does
  let filterStatus = $derived.by(() => {
    if (!selectedAgeRange) return '';
    const total = availableAuthors?.length || 0;
    const filtered = filteredAuthorCount;
    return `(${filtered} of ${total} authors)`;
  });
</script>

<div class="age-filter-section">
  <div class="filter-header">
    <Baby size={14} />
    <span class="filter-title">Author Age {filterStatus}</span>
  </div>

  <div class="filter-section">
    
    <!-- Range display -->
    {#if selectedAgeRange}
      <div class="range-display">
        <span class="range-label">Age Range:</span>
        <span class="range-values">
          {selectedAgeRange[0]} - {selectedAgeRange[1]} years
        </span>
        <span class="filter-badge">
          {filteredAuthorCount} of {availableAuthors.length}
        </span>
        <button class="clear-button" onclick={clearFilter}>Clear</button>
      </div>
    {/if}

    <!-- Histogram with clickable bins -->
    <div class="chart-container">
      <svg {width} {height} class="age-chart">
        <g transform="translate({margin.left}, {margin.top})">
          
          <!-- Histogram bars with accessibility -->
          {#each histogram as bin, i}
            {@const barHeight = chartHeight - yScale(bin.length)}
            {@const barWidth = Math.max(1, xScale(bin.x1) - xScale(bin.x0) - 1)}
            {@const isSelected = selectedBins.has(i)}
            {@const ageRangeText = `${Math.round(bin.x0)} to ${Math.round(bin.x1)} years`}
            {@const countText = `${bin.length} author${bin.length !== 1 ? 's' : ''}`}
            <rect
              x={xScale(bin.x0)}
              y={yScale(bin.length)}
              width={barWidth}
              height={barHeight}
              fill={isSelected ? "rgb(0, 91, 187)" : "var(--vcsi-gray-300)"}
              stroke={isSelected ? "rgb(0, 91, 187)" : "var(--vcsi-gray-400)"}
              stroke-width={isSelected ? "2" : "0.5"}
              style="cursor: pointer;"
              onclick={(e) => handleBinClick(i, e)}
              onkeydown={(e) => handleBinKeydown(e, i)}
              tabindex="0"
              role="button"
              aria-label={`Age range ${ageRangeText}, ${countText}. ${isSelected ? 'Selected' : 'Not selected'}`}
              aria-pressed={isSelected}
              class="histogram-bar"
            />
          {/each}

          <!-- X-axis -->
          <g transform="translate(0, {chartHeight})">
            <line x1={0} x2={chartWidth} stroke="var(--vcsi-border)" />
            <text x={0} y={15} text-anchor="start" class="axis-label">{authorAgeData.min}</text>
            <text x={chartWidth} y={15} text-anchor="end" class="axis-label">{authorAgeData.max}</text>
            <text x={chartWidth / 2} y={30} text-anchor="middle" class="axis-title">Academic Age</text>
          </g>
        </g>
      </svg>
    </div>

    <div class="interaction-help">
      <p class="filter-info">
        <strong>Click</strong> a bar to select that age range • 
        <strong>Ctrl+Click</strong> to select multiple • 
        <strong>Shift+Click</strong> to select range •
        <strong>Escape</strong> to clear selection
      </p>
    </div>
    
  </div>
</div>

<style>
  .age-filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .filter-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid var(--vcsi-border);
  }

  .filter-title {
    font-size: clamp(12px, 1vw, 0.8rem);
    font-weight: 500;
    color: var(--vcsi-fg);
  }

  .filter-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .range-display {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
    padding: 0.5rem;
    background: rgb(247, 247, 247);
    border-radius: 3px;
    border: 1px solid var(--vcsi-border);
  }

  :global(.dark) .range-display {
    background: var(--vcsi-gray-800);
  }

  .range-label {
    font-size: clamp(15px, 1.25vw, 1.2rem);
    font-weight: 500;
    color: var(--vcsi-fg);
  }

  .range-values {
    font-size: clamp(15px, 1.25vw, 1.2rem);
    color: rgb(0, 91, 187);
    font-weight: 900;
  }

  .filter-badge {
    background: rgb(0, 91, 187);
    color: white;
    padding: 0.125rem 0.375rem;
    border-radius: 12px;
    font-size: clamp(10px, 0.8vw, 0.7rem);
    font-weight: 900;
    margin-left: auto;
  }

  .clear-button {
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--vcsi-border);
    border-radius: 3px;
    background: var(--vcsi-bg);
    color: var(--vcsi-gray-600);
    font-size: clamp(10px, 0.8vw, 0.7rem);
    cursor: pointer;
    transition: all 100ms ease;
  }

  .clear-button:hover {
    background: var(--vcsi-gray-100);
    color: var(--vcsi-fg);
  }

  .chart-container {
    border: 1px solid var(--vcsi-border);
    border-radius: 3px;
    background: var(--vcsi-bg);
    overflow: hidden;
  }

  .age-chart {
    display: block;
    width: 100%;
  }

  .histogram-bar {
    transition: all 0.2s ease;
  }

  .histogram-bar:hover,
  .histogram-bar:focus {
    fill-opacity: 0.8;
    stroke-width: 2;
    outline: none;
  }

  .histogram-bar:focus {
    stroke: #3AE660;
    stroke-width: 3;
  }

  :global(.age-chart .axis-label) {
    font-size: clamp(10px, 0.8vw, 0.7rem);
    font-family: var(--vcsi-font-mono);
    fill: var(--vcsi-gray-600);
  }

  :global(.age-chart .axis-title) {
    font-size: clamp(12px, 1vw, 0.8rem);
    font-family: var(--vcsi-font-serif);
    font-weight: 500;
    fill: var(--vcsi-fg);
  }

  .interaction-help {
    text-align: center;
  }

  .filter-info {
    font-size: clamp(12px, 1vw, 0.8rem);
    color: var(--vcsi-gray-600);
    margin: 0;
    line-height: 1.3;
  }

  /* Dark mode */
  :global(.dark) .clear-button:hover {
    background: var(--vcsi-gray-700);
  }
</style>