<script lang="ts">
	import { CloudOff } from '@lucide/svelte';

	let { error, retry }: { error: unknown; retry?: () => void } = $props();

	// Remote-function errors reach the client with the serialized error body as
	// their message, e.g. '{"message":"..."}' — unwrap it for display.
	const message = $derived.by(() => {
		const raw = error instanceof Error ? error.message : String(error ?? '');
		try {
			const parsed = JSON.parse(raw);
			if (parsed && typeof parsed.message === 'string') return parsed.message;
		} catch {
			// not JSON — use the message as-is
		}
		return raw || 'Something went wrong while fetching the data.';
	});
</script>

<div class="data-error" role="alert">
	<CloudOff size={36} strokeWidth={1.5} aria-hidden="true" />
	<p>{message}</p>
	{#if retry}
		<button onclick={retry}>Try again</button>
	{/if}
</div>

<style>
	.data-error {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: var(--vcsi-space-sm);
		max-width: 28rem;
		margin: var(--vcsi-space-xl) auto;
		padding: var(--vcsi-space-lg);
		color: var(--vcsi-muted);
		font-family: var(--vcsi-font-sans);
		text-align: center;
	}

	p {
		margin: 0;
		font-size: var(--vcsi-font-size-xs);
		line-height: var(--vcsi-line-height-normal);
	}

	button {
		margin-top: var(--vcsi-space-xs);
		padding: var(--vcsi-space-xs) var(--vcsi-space-md);
		border: 1px solid var(--vcsi-border);
		border-radius: var(--vcsi-radius-sm);
		background: var(--vcsi-bg);
		color: var(--vcsi-fg);
		font-family: var(--vcsi-font-sans);
		font-size: var(--vcsi-font-size-xs);
		cursor: pointer;
		transition: background var(--vcsi-transition-fast);
	}

	button:hover {
		background: var(--vcsi-hover);
	}
</style>
