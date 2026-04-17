## Open Academic Analytics — Dashboard Architecture

### Data flow

```
                        data.remote.js
                     (query functions run
                       on the server)
                            |
                            v
    +--------------------------------------------------+
    |               Index.svelte                       |
    |                                                  |
    |  loadAvailableAuthors().then() --> authors        |
    |                                                  |
    |  $effect: reads selectedAuthor, filterBigPapers  |
    |    loadPaperData()  ------------> paper           |
    |    loadCoauthorData() ----------> coauthor        |
    +--------------------------------------------------+
               |    props    |          |    props
               v             v          v
    +----------------+    +--------------------+
    |   Sidebar      |    |   Dashboard        |
    |  (authors,     |    |  (paper, coauthor)  |
    |   paper,       |    +--------------------+
    |   coauthor)    |       |  props   |  props
    +----------------+       v          v
     | | | |  props    CoauthorChart  PaperChart
     v v v v
    SelectAuthors (authors)
    AuthorAgeFilter (authors)
    ResearchGroupFilter (authors)
    DataInfo (paper, coauthor)
    ChangePointChart (own query: loadTrainingData)
```

### How queries work

SvelteKit's `query()` functions run on the server but are called from
the client. They must be created in a reactive context (component script
or `$effect`) — calling them from `.svelte.ts` modules loses the reactive
owner (enforced since SvelteKit 2.56).

```js
// One-time query — created in component script (reactive context)
loadAvailableAuthors().then(result => { authors = result; });

// Reactive queries — $effect re-runs when deps change
$effect(() => {
    const author = dashboardState.selectedAuthor;   // tracked
    const filter = dashboardState.filterBigPapers;  // tracked
    const p = loadPaperData({ authorName: author, filterBigPapers: filter });
    const c = loadCoauthorData({ authorName: author, filterBigPapers: filter });
    untrack(() => {
        Promise.all([p, c]).then(([pr, cr]) => {
            paper = pr;
            coauthor = cr;
        });
    });
});
```

The `untrack` wraps the `.then()` consumption because SvelteKit's query
objects have reactive internals (`.then` is a `$derived` under the hood).
Without it, the effect would track the query's internal state and re-run
when data arrives — like re-ordering food every time the kitchen updates
your meal's status. We only want to re-fetch when the *order* changes
(author, filter), not when the *delivery* completes.

### Shared state

`state.svelte.ts` lets the sidebar and dashboard stay in sync without
prop drilling. Any component can read or write `dashboardState`
(selected author, filters, color mode) directly, which keeps the
component tree modular as the dashboard grows.

### Child components

Child components receive data as props and use `$derived.by` for
pure transformations:

```js
// SelectAuthors.svelte
let filteredAuthors = $derived.by(() => {
    let result = authors || [];
    // apply age/research group filters from dashboardState
    return result;
});
```
