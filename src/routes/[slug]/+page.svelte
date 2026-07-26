<!--
  Story page — renders any story from $lib/stories/{slug}/.

  This file stays the same across all phases:
    Phase 1 (static):  getStory uses prerender()  → built at compile time
    Phase 2 (dynamic): getStory uses query()      → runs on the server
    Phase 3 (mutations): add form()/command() alongside, this file unchanged

  The load function (+page.ts) provides the component, slug, story, and copyData.
  Data is fetched in the load function, NOT via top-level await here: an async
  page component hydrates out of sync with its SSR output (hydration_mismatch),
  forcing a client re-render of every story.
-->
<script>
  import ScrollDepthTracker from '$lib/components/ScrollDepthTracker.svelte';

  let { data } = $props();
  const StoryComponent = $derived(data.component);
  const story = $derived(data.story);
  const copyData = $derived(data.copyData);
</script>

<StoryComponent {story} data={copyData} />
<ScrollDepthTracker story={data.slug} />
