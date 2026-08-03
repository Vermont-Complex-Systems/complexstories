<script>
  /**
   * BookExplorer — explore mode: the Odyssey voyage machinery (dive, wake,
   * log-book, playback, seek) pointed at any of the gallery's six books.
   *
   * Each book's trace/chapters/stream loads on demand via dynamic import, so
   * the story's bundle only pays for voyages a reader actually opens. The
   * figure is re-mounted per pick ({#key}) for a clean dive every time.
   */
  import OusiogramFigure from './OusiogramFigure.svelte';

  const BOOKS = [
    {
      label: 'The Odyssey',
      load: () => Promise.all([
        import('../data/odyssey_trace.csv'),
        import('../data/odyssey_chapters.csv'),
        import('../data/odyssey_stream.csv')
      ])
    },
    {
      label: 'Anna Karenina',
      load: () => Promise.all([
        import('../data/anna_karenina_trace.csv'),
        import('../data/anna_karenina_chapters.csv'),
        import('../data/anna_karenina_stream.csv')
      ])
    },
    {
      label: 'Pride and Prejudice',
      load: () => Promise.all([
        import('../data/pride_prejudice_trace.csv'),
        import('../data/pride_prejudice_chapters.csv'),
        import('../data/pride_prejudice_stream.csv')
      ])
    },
    {
      label: 'Dracula',
      load: () => Promise.all([
        import('../data/dracula_trace.csv'),
        import('../data/dracula_chapters.csv'),
        import('../data/dracula_stream.csv')
      ])
    },
    {
      label: 'Frankenstein',
      load: () => Promise.all([
        import('../data/frankenstein_trace.csv'),
        import('../data/frankenstein_chapters.csv'),
        import('../data/frankenstein_stream.csv')
      ])
    },
    {
      label: 'Les Miserables',
      load: () => Promise.all([
        import('../data/les_miserables_trace.csv'),
        import('../data/les_miserables_chapters.csv'),
        import('../data/les_miserables_stream.csv')
      ])
    }
  ];

  const DIMS = ['goodness', 'power', 'aggression', 'danger', 'structure'];

  let current = $state(null); // { label, trace, chapters, stream }
  let loading = $state(false);
  let holderWidth = $state(0);
  let holderHeight = $state(0);

  // The plot's two axes — a session choice, picked alongside the book.
  let xDim = $state('power');
  let yDim = $state('danger');

  async function pick(b) {
    if (loading) return;
    // Clicking the active book climbs back out to the full map.
    if (current?.label === b.label) {
      current = null;
      return;
    }
    loading = true;
    try {
      const [t, c, s] = await b.load();
      current = { label: b.label, trace: t.default, chapters: c.default, stream: s.default };
    } finally {
      loading = false;
    }
  }

  // Default is NO selection: the full, zoomed-out map. Picking a book dives;
  // "full map" climbs back out.
</script>

<div class="picker" role="group" aria-label="Choose a book to sail (click again for the full map)">
  {#each BOOKS as b (b.label)}
    <button
      type="button"
      class:active={current?.label === b.label}
      aria-pressed={current?.label === b.label}
      onclick={() => pick(b)}
    >{b.label}</button>
  {/each}
</div>

<div class="axes-row">
  {#each [{ tag: 'x', get: () => xDim, set: (d) => (xDim = d), other: () => yDim }, { tag: 'y', get: () => yDim, set: (d) => (yDim = d), other: () => xDim }] as row (row.tag)}
    <div class="dims" role="group" aria-label="Plot {row.tag} axis">
      <span class="dims-tag">{row.tag}</span>
      {#each DIMS as d (d)}
        <button
          type="button"
          class:active={row.get() === d}
          disabled={row.other() === d}
          aria-pressed={row.get() === d}
          onclick={() => row.set(d)}
        >{d}</button>
      {/each}
    </div>
  {/each}
</div>

<!-- One persistent figure: no selection = the full zoomed-out map; picking
     a book dives, picking another PANS the camera to its cove. -->
<div class="holder" bind:clientWidth={holderWidth} bind:clientHeight={holderHeight}>
  <OusiogramFigure
    view={current ? 'odyssey-dive' : 'pds'}
    book={current}
    logLayout="side"
    {xDim}
    {yDim}
    width={holderWidth}
    height={holderHeight}
  />
</div>

<style>
  .picker {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    margin: 1.5rem 0 1rem 0;
    font-family: var(--vcsi-font-sans);
  }

  .picker button {
    padding: 0.35rem 0.8rem;
    border: 1px solid #1a2340;
    background: transparent;
    color: #1a2340;
    font: inherit;
    font-size: 0.82rem;
    cursor: pointer;
  }

  .picker button + button {
    border-left: none;
  }

  .picker button.active {
    background: #1a2340;
    color: #faf8f2;
  }

  .picker button:focus-visible {
    outline: 2px solid #b3452c;
    outline-offset: 1px;
  }

  .axes-row {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.4rem 1.6rem;
    margin-bottom: 1rem;
    font-family: var(--vcsi-font-sans);
  }

  .dims {
    display: flex;
    align-items: center;
    gap: 3px;
  }

  .dims-tag {
    width: 1rem;
    font-size: 0.75rem;
    font-style: italic;
    color: #777;
  }

  .dims button {
    padding: 0.2rem 0.45rem;
    border: 1px solid color-mix(in srgb, #1a2340 45%, transparent);
    background: transparent;
    color: #1a2340;
    font: inherit;
    font-size: 0.7rem;
    cursor: pointer;
  }

  .dims button + button {
    border-left: none;
  }

  .dims button.active {
    background: #1a2340;
    color: #faf8f2;
  }

  .dims button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .dims button:focus-visible {
    outline: 2px solid #b3452c;
    outline-offset: 1px;
  }

  .holder {
    /* full-screen stage (we live inside the story's .full-bleed) */
    position: relative;
    height: min(94vh, 950px);
    display: flex;
    justify-content: center;
  }

  /* the figure hugs start-side by default (story panels want that);
     a standalone full-bleed stage should center */
  .holder :global(.fill) {
    justify-content: center;
  }
</style>
