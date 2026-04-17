<script>
	let { variant = 'primary', size = 'medium', children } = $props();
</script>

<p
	class="label"
	data-variant={variant}
	data-size={size}
>
	{@render children?.()}
</p>

<style>
	.label {
		display: flex;
		color: white;
		font-weight: bold;
		margin-bottom: 1rem;
		width: fit-content;
		border-radius: 0.25rem;
		background: var(--label-bg, violet);
		font-size: var(--label-size, x-large);
		padding: var(--label-padding, 0.25rem 0.5rem);
	}

	.label:where([data-variant="primary"]) { --label-bg: violet; }
	.label:where([data-variant="secondary"]) { --label-bg: #2aa198; }
	.label:where([data-variant="accent"]) { --label-bg: #667eea; }
	.label:where([data-variant="success"]) { --label-bg: #48bb78; }
	.label:where([data-variant="warning"]) { --label-bg: #ed8936; }

	.label:where([data-size="small"]) { --label-size: medium; --label-padding: 0.2rem 0.4rem; }
	.label:where([data-size="medium"]) { --label-size: large; --label-padding: 0.25rem 0.5rem; }
	.label:where([data-size="large"]) { --label-size: x-large; --label-padding: 0.6rem 0.9rem; }
	.label:where([data-size="xlarge"]) { --label-size: xx-large; --label-padding: 0.8rem 1.2rem; }
</style>
