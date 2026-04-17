<script>
    import { getContext } from 'svelte';
    import BarChartRank from './BarChartRank.svelte';

    const state = getContext('allotax');
</script>

<div class="initial-chart">
    <BarChartRank data={state.sys1.slice(0, 30)} fill="#a6a6a6" />
</div>

<style>
    .initial-chart { margin: 2rem 0; }
</style>
