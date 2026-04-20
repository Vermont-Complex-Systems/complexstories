<script>
	import { ModeWatcher } from 'mode-watcher';
	import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';
	import '$lib/styles/app.css';

	const queryClient = new QueryClient();

	let { children } = $props();
</script>

<ModeWatcher defaultMode="system" />

<QueryClientProvider client={queryClient}>
	{@render children?.()}
</QueryClientProvider>
