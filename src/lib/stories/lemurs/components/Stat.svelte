<script>
	// The big theme-colored figure above a panel visual. Shared by the unit
	// chart and the sleep-windows panel so every step keeps the same rhythm.
	// Colour comes from --lem-hue, set by whichever panel renders it.
	let { stat = null } = $props();
</script>

{#if stat}
	<div class="stat">
		<span class="stat-value">{stat.value}</span>
		<span class="stat-label">{stat.label}</span>
	</div>
{/if}

<style>
	.stat {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.stat-value {
		font-family: var(--vcsi-font-heading);
		font-weight: var(--vcsi-font-weight-bold);
		font-size: var(--vcsi-font-size-xl);
		line-height: 1;
		color: var(--lem-hue);
		transition: color 400ms ease;
	}

	.stat-label {
		font-size: var(--vcsi-font-size-small);
		color: var(--lem-muted, currentColor);
	}
</style>
