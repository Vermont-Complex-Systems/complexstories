<!--
  Story page — renders any story from $lib/stories/{slug}/.

  This file stays the same across all phases:
    Phase 1 (static):  load function uses prerender()  → built at compile time
    Phase 2 (dynamic): load function uses query()      → runs on the server
    Phase 3 (mutations): add form()/command() alongside, this file unchanged

  The load function (+page.ts) provides the component, slug, story, and copyData.
-->
<script>
  // Component, slug, story, and copyData all come from the load function in +page.ts
  let { data } = $props();
  const StoryComponent = $derived(data.component);
  const story = $derived(data.story);
  const copyData = $derived(data.copyData);
</script>

<StoryComponent {story} data={copyData} />
