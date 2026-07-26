<script>

  import Meta from "$lib/components/Meta.svelte";
  import Home from "$lib/components/Home.svelte";

  let { data } = $props();

</script>

<Home stories={data.stories} />