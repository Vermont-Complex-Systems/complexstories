<script>
    import { getContext } from 'svelte';
    import BarChartRank from './BarChartRank.svelte';

    const state = getContext('allotax');
</script>

<div class="initial-chart">
    <BarChartRank data={state.sys2.slice(0, 30)} fill="#c3e6f3e6" />
</div>

<style>
    .initial-chart { margin: 2rem 0; }
</style>
