<script>
  import * as d3 from 'd3';

  import CoauthorChart from './CoauthorChart.svelte';
  import PaperChart from './PaperChart.svelte';
  import { uiState } from '$stories/open-academic-analytics/state.svelte.ts';
  import { innerWidth } from 'svelte/reactivity/window';
  import { calculateChartWidth, calculateChartHeight, spacing } from '$stories/open-academic-analytics/utils/layout.js';
  import { getCombinedDateRange } from '$stories/open-academic-analytics/utils/combinedChartUtils.js';

  let { paper, coauthor } = $props();

  let width = $derived(
    calculateChartWidth(innerWidth.current, uiState.sidebarCollapsed)
  )

  const height = $derived(
    calculateChartHeight(coauthor?.length)
  );

  let timeScale = $derived.by(() => {
        if (!paper && !coauthor) return d3.scaleTime();

        const dateRange = getCombinedDateRange(paper, coauthor, 'pub_date');
        return d3.scaleTime()
            .domain(dateRange)
            .range([50, height - 50]);
      });

</script>

<div class="dashboard">
  <div class="charts-container">
    <div class="charts-grid">
      <div class="chart-panel">
        <h2>Coauthor Collaborations</h2>
        <CoauthorChart {coauthor} {timeScale} {width} {height}/>
      </div>
      <div class="chart-panel">
        <h2>Publications Timeline</h2>
          <PaperChart {paper} {timeScale} {width} {height} />
      </div>
    </div>
  </div>
</div>



<style>

  .dashboard {
    max-width: 100%;
    margin: 0;
    padding: 20px;
    font-family: var(--vcsi-font-sans);
  }

  .charts-container {
    margin-bottom: 30px;
    overflow: visible;
  }

  .charts-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    width: 100%;
  }

  .chart-panel {
    margin-top: -40px;
    background: var(--vcsi-bg);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: visible;
  }

  .chart-panel h2 {
    color: var(--vcsi-fg);
    font-size: clamp(12px, 1vw, 0.8rem);
    text-align: center;
    width: 100%;
  }

 
  /* Responsive design */
  @media (max-width: 1200px) {
    .charts-grid {
      grid-template-columns: 1fr;
    }
    
    .dashboard {
      padding: 15px;
    }
  }
</style>