<script>
	import WaffleChart from './Waffle.svelte';
	import Spinner from '$lib/components/helpers/Spinner.svelte';
	import { group } from 'd3-array';
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
		return exploded;
	}

	let data = $state([]);
	loadAndProcess().then((d) => (data = d));

	let groupBy = $state('college');

	let groupedData = $derived.by(() => {
		if (!data?.length) return new Map();

		const flattened = data.flatMap((person) => {
			const values = (person[groupBy] || 'Unknown').split(';').map((d) => d.trim());
			return values.map((value) => ({ ...person, [groupBy]: value }));
		});

		const grouped = group(flattened, (d) => d[groupBy]);

		if (groupBy === 'department') {
			const deptsByCollege = new Map();
			for (const [dept, people] of grouped) {
				const collegeCount = people
					.map((p) => p.college || 'Unknown')
					.reduce((acc, c) => ((acc[c] = (acc[c] || 0) + 1), acc), {});
				const primaryCollege = Object.keys(collegeCount).reduce((a, b) =>
					collegeCount[a] > collegeCount[b] ? a : b
				);
				if (!deptsByCollege.has(primaryCollege)) deptsByCollege.set(primaryCollege, []);
				deptsByCollege.get(primaryCollege).push([dept, people]);
			}
			return Array.from(deptsByCollege.entries())
				.sort((a, b) => a[0].localeCompare(b[0]))
				.map(([college, depts]) => [college, depts.sort((a, b) => b[1].length - a[1].length)]);
		}
		return new Map(Array.from(grouped.entries()).sort((a, b) => b[1].length - a[1].length));
	});
</script>

{#if !data.length}
	<Spinner />
{:else}
	<p class="grouping-controls">
		Stratify by
		<button class:active={groupBy === 'college'} onclick={() => (groupBy = 'college')}>
			Colleges & Schools
		</button>
		or
		<button class:active={groupBy === 'department'} onclick={() => (groupBy = 'department')}>
			Departments
		</button>
	</p>

	<div class="waffle-grid">
		{#if groupBy === 'department'}
			{#each groupedData as [collegeName, departments]}
				<div class="college-section">
					<h3 class="college-header">{collegeName}</h3>
					<div class="department-grid">
						{#each departments as [deptName, deptData]}
							{#if deptName == collegeName}
								<WaffleChart data={deptData} cellSize={20} highlightCategory="no_oa_uid" />
							{:else}
								<WaffleChart
									data={deptData}
									title={deptName}
									cellSize={20}
									highlightCategory="no_oa_uid"
								/>
							{/if}
						{/each}
					</div>
				</div>
			{/each}
		{:else}
			{#each groupedData as [groupName, groupData]}
				<WaffleChart
					data={groupData}
					title={groupName}
					cellSize={25}
					highlightCategory="no_oa_uid"
				/>
			{/each}
		{/if}
	</div>
{/if}

<style>
	.waffle-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
		margin: 1rem 0;
	}

	.college-section {
		grid-column: 1 / -1;
		margin-bottom: 2rem;
	}

	.college-header {
		font-size: 1.2rem;
		font-weight: bold;
		margin-bottom: 1rem;
		padding-bottom: 0.5rem;
		border-bottom: 2px solid #ddd;
	}

	.department-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.grouping-controls {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.grouping-controls button {
		padding: 0.4rem 0.9rem;
		border: 2px solid #ddd;
		background: white;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.95rem;
		transition: all 0.2s ease;
	}

	.grouping-controls button:hover {
		border-color: #999;
	}

	.grouping-controls button.active {
		background: #4caf50;
		color: white;
		border-color: #4caf50;
	}
</style>
