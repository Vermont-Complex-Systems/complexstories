<script>
	import { ModeWatcher } from 'mode-watcher';
	import { QueryClientProvider, QueryClient } from '@tanstack/svelte-query';
	import '$lib/styles/app.css';

	const queryClient = new QueryClient();

	let { children } = $props();
</script>

<svelte:head>
        <script async defer src="https://cloud.umami.is/script.js" data-website-id="9748947b-5af8-4053-b1a5-8e74f48eb7e2"></script>
</svelte:head>

<ModeWatcher defaultMode="system" />

<QueryClientProvider client={queryClient}>
	{@render children?.()}
</QueryClientProvider>
