<script lang="ts">
  import Story from "$lib/components/Story.svelte";
  import type { Story as StoryType } from '$lib/story.remote';

  let { stories }: { stories: StoryType[] } = $props();
</script>

<ul>
  {#each stories as story (story.slug)}
    <li>
      <Story {story} />
    </li>
  {/each}
</ul>

<style>
  ul {
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem 1.5rem;
    margin: 0;
    max-width: none;
  }

  li {
    margin: 0;
    list-style-type: none;
    padding: 0;
  }

  @media only screen and (min-width: 600px) {
    ul {
      grid-template-columns: repeat(2, 1fr);
      gap: 3.5rem 2rem;
    }
  }

  @media only screen and (min-width: 960px) {
    ul {
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 4rem 1.5rem;
    }
  }
</style>
