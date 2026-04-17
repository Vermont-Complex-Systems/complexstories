# Story Patterns Reference

## Story File Structure

Each story lives in `src/lib/stories/{slug}/`:

```
src/lib/stories/my-story/
├── components/
│   └── Index.svelte       # Main story component
│   └── ScrollyPlot.svelte # Optional: visualization components
└── data/
    └── copy.json          # Content data
    └── data.csv           # Optional: datasets
```

The route `src/routes/[slug]/+page.svelte` dynamically imports `Index.svelte` and passes `story` metadata + `data` (copy.json contents) as props.

## copy.json Schema

```json
{
  "title": "Story Title",
  "subtitle": "Optional subtitle",
  "authors": [
    { "name": "Author Name", "url": "https://optional-link.com" }
  ],
  "date": "Month Year",

  "introduction": [
    { "type": "markdown", "value": "Markdown text with **bold**, *italic*, $math$" }
  ],

  "steps": [
    { "type": "markdown", "value": "Step content..." },
    { "type": "html", "value": "<strong>Raw HTML</strong>" },
    { "type": "math", "value": "E = mc^2" },
    { "type": "code", "value": "const x = 1;", "language": "javascript" }
  ],

  "conclusion": [
    { "type": "markdown", "value": "Closing text..." }
  ]
}
```

**ContentItem types:**
- `markdown` — Rendered with KaTeX math support (`$inline$`, `$$block$$`)
- `html` — Raw HTML, rendered directly
- `math` — Centered math expression (KaTeX)
- `code` — Syntax-highlighted code block (requires `language` field)

Sections like `introduction`, `steps`, `conclusion` are arrays of ContentItem. You can add custom section names (e.g., `appendix`, `methodology`).

## Multi-Section Stories

Stories can have multiple scrolly sections, each with its own layout:

```svelte
<article class="story">
  <StoryHeader ... />

  <section id="intro">
    <RenderContent items={data.introduction} />
  </section>

  <!-- First scrolly: split layout -->
  <section class="split-layout">
    <div class="sticky-panel"><ChartA {scrollyIndex1} /></div>
    <div class="scrolly-content">
      <ScrollyContent steps={data.part1Steps} bind:value={scrollyIndex1} />
    </div>
  </section>

  <h2>Part Two</h2>
  <p>Transition text between sections...</p>

  <!-- Second scrolly: fullscreen layout -->
  <section class="fullscreen-layout">
    <div class="sticky-panel"><ChartB {scrollyIndex2} /></div>
    <div class="scrolly-content">
      <ScrollyContent steps={data.part2Steps} bind:value={scrollyIndex2} />
    </div>
  </section>

  <section id="conclusion">
    <RenderContent items={data.conclusion} />
  </section>
</article>
```

Each section gets its own `$state()` variable for scroll tracking.

## Story Theming

Stories are isolated from global dark mode by default (light theme with beige background).

```svelte
<!-- Light story (default) -->
<article class="story">...</article>
<Footer theme="light" />

<!-- Dark story -->
<article class="story" data-theme="dark">...</article>
<Footer theme="dark" />

<!-- Custom colors -->
<article class="story" style="--vcsi-story-bg: navy; --vcsi-story-fg: white;">
  ...
</article>
<Footer style="--footer-bg: navy;" />
```

**Footer theming must match the story:**
- `theme="light"` → UVM green background
- `theme="dark"` → Dark grey background
- No `theme` prop → Respects global dark mode (for app pages, not stories)

## SSR / Build Gotchas

The `baked` template uses `adapter-static` — every page is prerendered at build time. Modules that access `window`, `document`, or WebGL at import time will crash the build.

**Fix: Guard browser-only components:**

```svelte
<script>
  import { browser } from '$app/environment';
</script>

{#if browser}
  <MyWebGLChart {data} />
{/if}
```

For code (not components) that must only run in the browser, use `$effect` or dynamic `import()` inside `onMount`.

**Do NOT set `export const ssr = false`** in `[slug]/+page.ts`. In `adapter-static`, this prevents remote functions like `getStory()` from being crawled, producing 404s at runtime.

## Dashboard Pattern

Dashboards use a different layout — no scrolly mechanics:

```svelte
<script>
  import { DashboardShell } from '@the-vcsi/scrolly-kit';
  // OR use raw CSS classes:
</script>

<article class="dashboard-layout">
  <aside class="dashboard-sidebar">
    <button class="sidebar-toggle" onclick={() => collapsed = !collapsed}>
      Toggle
    </button>
    <div class="sidebar-content">
      <!-- Filters, controls, form elements -->
    </div>
  </aside>
  <main class="dashboard-main">
    <!-- Charts, tables, content -->
  </main>
</article>
```

Add `.sidebar-collapsed` to the root element to collapse the sidebar.

## Visualization Component Patterns

Plot components inside `.sticky-panel` must be sized to match their layout. See LAYOUTS.md for the CSS contract each layout provides; this section covers **how to scaffold the Svelte component**.

### Split Layout Plot

The panel has constrained width and capped height. The plot only needs to track width.

```svelte
<script>
  let { scrollyIndex } = $props();

  let width = $state(800);       // bind width only
  const height = 400;             // fixed height
  const margin = { top: 20, right: 20, bottom: 80, left: 60 };

  let innerWidth = $derived(width - margin.left - margin.right);
  let innerHeight = $derived(height - margin.top - margin.bottom);
</script>

<div class="chart-container" bind:clientWidth={width}>
  <svg viewBox={`0 0 ${width} ${height}`}>
    <g transform={`translate(${margin.left},${margin.top})`}>
      <!-- chart content -->
    </g>
  </svg>
</div>
```

**Rules:** `bind:clientWidth` only. Fixed `height` constant. The `viewBox` scales the SVG proportionally. No viewport units.

### Fullscreen Layout Plot

The panel fills the viewport. The plot must track both dimensions.

```svelte
<script>
  let { scrollyIndex } = $props();

  let width = $state(800);        // bind both
  let height = $state(600);

  let isMobile = $derived(width < 768);
  let chartHeight = $derived(isMobile ? width : height);  // square on mobile

  let margin = $derived(isMobile
    ? { top: 40, right: 20, bottom: 50, left: 50 }
    : { top: 60, right: 40, bottom: 70, left: 70 }
  );

  let innerWidth = $derived(width - margin.left - margin.right);
  let innerHeight = $derived(chartHeight - margin.top - margin.bottom);
</script>

<div class="chart-container" bind:clientWidth={width} bind:clientHeight={height}>
  <svg viewBox={`0 0 ${width} ${chartHeight}`}>
    <g transform={`translate(${margin.left},${margin.top})`}>
      <!-- chart content -->
    </g>
  </svg>
</div>
```

**Rules:** `bind:clientWidth` AND `bind:clientHeight`. Derive `chartHeight` from bounds (square on mobile via `width`). Responsive margins. No viewport units — the layout already provides vh/vw.

## CSS Variable Scoping

Override variables at any level to customize a section:

```svelte
<!-- Override for one section -->
<section class="split-layout" style="--vcsi-panel-width: 60%; --vcsi-step-max-width: 400px;">
  ...
</section>

<!-- Override for the whole story -->
<article class="story" style="--vcsi-story-max-width: 800px;">
  ...
</article>
```

Variables cascade: story root → layout section → individual step. Set them at the narrowest scope needed.
