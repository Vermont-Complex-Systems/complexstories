<script>
	import WaffleChart from './Waffle.svelte';
	import Spinner from '$lib/components/helpers/Spinner.svelte';
	import { loadUvmProfsData } from '../data.remote.js';

	async function loadAndProcess() {
		const uvmProfs = await loadUvmProfsData();
		const exploded = [];
		uvmProfs.forEach((prof) => {
			if (prof.host_dept) {
				prof.host_dept.split(';').map((d) => d.trim()).forEach((department) => {
					exploded.push({ ...prof, name: prof.payroll_name, department });
				});
			} else {
				exploded.push({ ...prof, name: prof.payroll_name, department: null });
			}
		});
		exploded.sort((a, b) => {
			if (a.has_research_group !== b.has_research_group) {
				return (b.has_research_group || 0) - (a.has_research_group || 0);
			}
			if (a.perceived_as_male !== b.perceived_as_male) {
				return (a.perceived_as_male || 0) - (b.perceived_as_male || 0);
			}
			return (a.oa_uid || '').localeCompare(b.oa_uid || '');
		});
		return exploded;
	}

	let data = $state([]);
	loadAndProcess().then((d) => (data = d));
</script>

{#if !data.length}
	<Spinner />
{:else}
	<p>
		To better understand UVM's research landscape, we take a deep dive into research groups at UVM.
		We first take a look at the {data.length} UVM faculty (as of 2023, based on
		<a href="https://www.uvm.edu/d10-files/documents/2024-12/2024-2025-Base-Pay.pdf">payroll</a>):
	</p>
	<WaffleChart {data} cellSize={25} highlightCategory="no_oa_uid" />
{/if}
