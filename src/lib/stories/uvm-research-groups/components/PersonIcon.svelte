<script>
	let {
		person,
		size = 48,
		highlightName = null,
		highlightCategory = null
	} = $props();

	const isHighlightedByName = $derived(
		highlightName && (person.name === highlightName || person.ego_display_name === highlightName)
	);

	const categoryHighlights = {
		no_oa_uid: () => !person.oa_uid,
		male: () => person.perceived_as_male === 1,
		female: () => person.perceived_as_male === 0,
		professor: () => person.is_prof === 1
	};

	const categoryColors = {
		no_oa_uid: '#CCCCCC',
		male: '#2196F3',
		female: '#E91E63',
		professor: '#9C27B0'
	};

	const color = $derived(
		isHighlightedByName ? 'red' :
		highlightCategory && categoryHighlights[highlightCategory]?.() ? categoryColors[highlightCategory] :
		person.has_research_group ? '#ffd100' : '#257355'
	);

	const shouldGlow = $derived(
		isHighlightedByName || (highlightCategory && categoryHighlights[highlightCategory]?.())
	);

	const isFemale = $derived(person.perceived_as_male === 0);
	const hasOpenAlexId = $derived(!!person.oa_uid);
	const iconSize = $derived(size - 2);
</script>

<svg
	width={iconSize}
	height={iconSize}
	viewBox="0 0 24 24"
	fill={color}
	style="cursor: pointer; {shouldGlow && hasOpenAlexId ? 'filter: drop-shadow(0 0 8px currentColor);' : ''}"
	role="button"
	tabindex="0"
>
	{#if isFemale}
		<circle cx="12" cy="12" r="8"/>
	{:else}
		<polygon points="12,2 22,22 2,22"/>
	{/if}
</svg>