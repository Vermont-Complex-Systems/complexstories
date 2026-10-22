<!--
  NatureLift.svelte (Svelte 5 + D3)
  Three views of LEMURS Figure 2:
    "hrv":        before/after dumbbells plus one small multiple per group
                  (weekly HRV with 95% CI against the overall average);
                  showWeekly={false} drops the small multiples
    "depression": slope chart of depression by perceived nature exposure
    "map":        the nature-exposure raster around campus
  Props, theming and story usage: see README.md next to this file.
-->
<script module lang="ts">
  export type Group = 'Control' | 'Exercise' | 'Nature' | 'Therapy';
  export type HrvPoint = { week: number; mean: number; lo: number; hi: number; interpolated?: boolean };
  export type DepPoint = { bin: string; mean: number; lo: number; hi: number };
  export type NatureLiftData = {
    hrv: Record<Group, HrvPoint[]> & { Overall: { week: number; mean: number }[] };
    depression: Record<Group, DepPoint[]>;
    map: { rows: number; cols: number; values: (number | null)[][] };
  };
  export type NatureLiftView = 'hrv' | 'depression' | 'map';
</script>

<script lang="ts">
  import { scaleLinear, scalePoint, line, area, mean as d3mean, interpolateRgb } from 'd3';

  interface Props {
    data: NatureLiftData;
    view?: NatureLiftView;
    emphasis?: Group | null;
    week?: number | null;
    showControls?: boolean;
    showWeekly?: boolean;
    theme?: 'light' | 'dark' | 'auto';
    treatment?: [number, number];
    campus?: { row: number; col: number } | null;
  }

  let {
    data,
    view = $bindable('hrv'),
    emphasis = $bindable('Nature'),
    week = $bindable(null),
    showControls = true,
    showWeekly = true,
    theme = 'light',
    treatment = [14, 28],
    campus = { row: 83, col: 64 }
  }: Props = $props();

  const GROUPS: Group[] = ['Control', 'Exercise', 'Nature', 'Therapy'];
  const cls = (g: Group) => `g-${g.toLowerCase()}`;

  let width = $state(0);
  const narrow = $derived(width < 620);

  // ---------------- HRV ----------------
  const obsWeeks = $derived((w: number) => w < treatment[0]);
  const trtWeeks = $derived((w: number) => w >= treatment[0] && w <= treatment[1]);
  const summary = $derived(GROUPS.map((g) => {
    const s = data.hrv[g];
    const before = d3mean(s.filter((p) => obsWeeks(p.week)), (p) => p.mean) ?? 0;
    const after = d3mean(s.filter((p) => trtWeeks(p.week)), (p) => p.mean) ?? 0;
    return { g, before, after, delta: after - before };
  }));
  const dbH = 30 * GROUPS.length + 34;
  const dbm = $derived({ l: 78, r: 70 });
  const dbx = $derived(scaleLinear().domain([58, 74]).range([dbm.l, width - dbm.r]));

  const cols = $derived(narrow ? 1 : 2);
  const gap = 18;
  const smW = $derived(Math.max(0, (width - gap * (cols - 1)) / cols));
  const smH = $derived(narrow ? 150 : 190);
  const sm = { l: 30, r: 10, t: 8, b: 24 };
  const sx = $derived(scaleLinear().domain([1, 30]).range([sm.l, smW - sm.r]));
  const sy = $derived(scaleLinear().domain([52, 82]).range([smH - sm.b, sm.t]));
  const hLine = $derived(line<{ week: number; mean: number }>().x((d) => sx(d.week)).y((d) => sy(d.mean)));
  const hBand = $derived(area<HrvPoint>().x((d) => sx(d.week)).y0((d) => sy(d.lo)).y1((d) => sy(d.hi)));

  function smMove(e: PointerEvent) {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const w = Math.round(sx.invert(e.clientX - r.left));
    week = w >= 1 && w <= 30 ? w : null;
  }
  function smKey(e: KeyboardEvent) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    week = Math.max(1, Math.min(30, (week ?? 15) + (e.key === 'ArrowRight' ? 1 : -1)));
  }

  // ---------------- depression ----------------
  const BINS = ['Low', 'Medium', 'High'] as const;
  const dpH = $derived(Math.max(300, Math.min(420, width * 0.5)));
  const dm = $derived({ l: 40, r: narrow ? 14 : 150, t: 16, b: 44 });
  const dx = $derived(scalePoint<string>().domain(BINS as unknown as string[]).range([dm.l + 30, width - dm.r - 30]));
  const dy = $derived(scaleLinear().domain([3.5, 11.5]).range([dpH - dm.b, dm.t]));
  const dodge = (g: Group) => (GROUPS.indexOf(g) - 1.5) * 7;
  let hoverGroup: Group | null = $state(null);
  const focus = $derived(hoverGroup ?? emphasis);

  // ---------------- map ----------------
  let canvas: HTMLCanvasElement | undefined = $state();
  let rootEl: HTMLElement | undefined = $state();
  let themeTick = $state(0);
  const cell = $derived(Math.max(1, Math.min((width - 2) / data.map.cols, 560 / data.map.rows)));
  const mapW = $derived(cell * data.map.cols);
  const mapH = $derived(cell * data.map.rows);
  let mapHover: { r: number; c: number; v: number } | null = $state(null);
  const ranked = $derived(data.map.values.flat().filter((v): v is number => v != null).sort((a, b) => a - b));
  const pctRank = (v: number) => {
    let lo = 0, hi = ranked.length;
    while (lo < hi) { const m = (lo + hi) >> 1; if (ranked[m] < v) lo = m + 1; else hi = m; }
    return Math.round((100 * lo) / ranked.length);
  };

  $effect(() => {
    if (view !== 'map' || !canvas || !rootEl || width === 0) return;
    void themeTick;
    const cs = getComputedStyle(rootEl);
    const ramp = interpolateRgb(cs.getPropertyValue('--nl-map-lo').trim(), cs.getPropertyValue('--nl-map-hi').trim());
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(mapW * dpr); canvas.height = Math.round(mapH * dpr);
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, mapW, mapH);
    data.map.values.forEach((row, r) => row.forEach((v, c) => {
      if (v == null) return;
      ctx.fillStyle = ramp(v);
      ctx.fillRect(c * cell, r * cell, cell + 0.4, cell + 0.4);
    }));
  });
  $effect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const bump = () => themeTick++;
    mq.addEventListener('change', bump);
    const mo = new MutationObserver(bump);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => { mq.removeEventListener('change', bump); mo.disconnect(); };
  });
  function mapMove(e: PointerEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const c = Math.floor((e.clientX - r.left) / cell), rr = Math.floor((e.clientY - r.top) / cell);
    const v = data.map.values[rr]?.[c];
    mapHover = v == null ? null : { r: rr, c, v };
  }

  const fmt1 = (v: number) => v.toFixed(1);
  const sign = (v: number) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1);
</script>

<figure class="nl {theme}" bind:clientWidth={width} bind:this={rootEl}>
  {#if showControls}
    <div class="nl-bar">
      <div class="nl-seg" role="group" aria-label="Choose view">
        <button type="button" aria-pressed={view === 'hrv'} onclick={() => (view = 'hrv')}>Heart-rate variability</button>
        <button type="button" aria-pressed={view === 'depression'} onclick={() => (view = 'depression')}>Depression</button>
        <button type="button" aria-pressed={view === 'map'} onclick={() => (view = 'map')}>Nature map</button>
      </div>
    </div>
  {/if}

  {#if width > 0 && view === 'hrv'}
    <div class="nl-section">
      <div class="nl-h">Average HRV before and during treatment <span>weeks 1–{treatment[0] - 1} → weeks {treatment[0]}–{treatment[1]}</span></div>
      <svg {width} height={dbH} role="img" aria-label="Mean HRV before and during treatment by group. {summary.map((s) => `${s.g} ${sign(s.delta)}`).join(', ')}.">
        {#each [60, 64, 68, 72] as v (v)}
          <line class="nl-grid" x1={dbx(v)} x2={dbx(v)} y1="4" y2={dbH - 22} />
          <text class="nl-axis" x={dbx(v)} y={dbH - 6} text-anchor="middle">{v}</text>
        {/each}
        {#each summary as s, i (s.g)}
          {@const y = 18 + i * 30}
          <g class="nl-db {cls(s.g)}" class:dim={focus && focus !== s.g}>
            <text class="nl-lbl" x={dbm.l - 10} y={y + 4} text-anchor="end">{s.g}</text>
            <line class="nl-dbl" x1={dbx(s.before)} x2={dbx(s.after)} y1={y} y2={y} />
            <circle class="nl-before" cx={dbx(s.before)} cy={y} r="5" />
            <circle class="nl-after" cx={dbx(s.after)} cy={y} r="6" />
            <text class="nl-val" x={dbx(Math.max(s.before, s.after)) + 12} y={y + 4}>{sign(s.delta)}</text>
          </g>
        {/each}
      </svg>
      <div class="nl-keys"><span><i class="nl-ring"></i>Observational mean</span><span><i class="nl-fill"></i>Treatment-period mean</span></div>
    </div>

    {#if showWeekly}
    <div class="nl-section">
      <div class="nl-h">Weekly HRV with 95% CI <span>dashed: overall average · shaded weeks: treatment period</span></div>
      <div class="nl-sm" style:grid-template-columns="repeat({cols}, 1fr)" style:gap="{gap}px">
        {#each GROUPS as g (g)}
          {@const s = data.hrv[g]}
          {@const cur = week ? s[week - 1] : null}
          {@const ov = week ? data.hrv.Overall[week - 1] : null}
          <div class="nl-cell {cls(g)}">
            <div class="nl-ct"><b><i class="nl-sw"></i>{g}</b>
              {#if cur && ov}<span class="nl-mono">wk {week}: {fmt1(cur.mean)} <em>vs {fmt1(ov.mean)} avg</em></span>{/if}
            </div>
            <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
            <svg width={smW} height={smH} role="img" tabindex="0"
              aria-label="{g}: weekly HRV. Use left and right arrow keys to read weeks."
              onpointermove={smMove} onpointerleave={() => (week = null)} onkeydown={smKey}>
              <rect class="nl-trt" x={sx(treatment[0])} y={sm.t} width={sx(treatment[1]) - sx(treatment[0])} height={smH - sm.t - sm.b} />
              {#each [55, 65, 75] as v (v)}
                <line class="nl-grid" x1={sm.l} x2={smW - sm.r} y1={sy(v)} y2={sy(v)} />
                <text class="nl-axis" x={sm.l - 6} y={sy(v) + 3.5} text-anchor="end">{v}</text>
              {/each}
              {#each [1, 10, 20, 30] as w (w)}
                <text class="nl-axis" x={sx(w)} y={smH - 6} text-anchor="middle">{w === 1 ? 'wk 1' : w}</text>
              {/each}
              <path class="nl-band" d={hBand(s) ?? ''} />
              <path class="nl-avg" d={hLine(data.hrv.Overall) ?? ''} />
              <path class="nl-line" d={hLine(s) ?? ''} />
              {#if cur}
                <line class="nl-cross" x1={sx(cur.week)} x2={sx(cur.week)} y1={sm.t} y2={smH - sm.b} />
                <circle class="nl-dot" cx={sx(cur.week)} cy={sy(cur.mean)} r="4.5" />
              {/if}
            </svg>
          </div>
        {/each}
      </div>
    </div>
    {/if}
  {:else if width > 0 && view === 'depression'}
    <div class="nl-section">
      <div class="nl-h">Depression score by perceived nature exposure <span>mean with 95% CI · lower is better</span></div>
      <svg {width} height={dpH} role="img"
        aria-label="Depression by perceived nature exposure. {GROUPS.map((g) => `${g}: ${data.depression[g].map((p) => fmt1(p.mean)).join(' to ')}`).join('; ')}.">
        {#each [4, 6, 8, 10] as v (v)}
          <line class="nl-grid" x1={dm.l} x2={width - dm.r} y1={dy(v)} y2={dy(v)} />
          <text class="nl-axis" x={dm.l - 8} y={dy(v) + 3.5} text-anchor="end">{v}</text>
        {/each}
        {#each BINS as b (b)}
          <text class="nl-axis" x={dx(b)} y={dpH - 22} text-anchor="middle">{b}</text>
        {/each}
        <text class="nl-axis" x={(dm.l + width - dm.r) / 2} y={dpH - 4} text-anchor="middle">Perceived nature exposure</text>
        {#each [...GROUPS].sort((a, b) => (a === focus ? 1 : 0) - (b === focus ? 1 : 0)) as g (g)}
          {@const pts = data.depression[g]}
          <!-- svelte-ignore a11y_no_static_element_interactions -->
          <g class="nl-dg {cls(g)}" class:dim={focus && focus !== g} onpointerenter={() => (hoverGroup = g)} onpointerleave={() => (hoverGroup = null)}>
            <polyline class="nl-hit" points={pts.map((p) => `${(dx(p.bin) ?? 0) + dodge(g)},${dy(p.mean)}`).join(' ')} />
            <polyline class="nl-line" points={pts.map((p) => `${(dx(p.bin) ?? 0) + dodge(g)},${dy(p.mean)}`).join(' ')} />
            {#each pts as p (p.bin)}
              {@const x = (dx(p.bin) ?? 0) + dodge(g)}
              <line class="nl-ci" x1={x} x2={x} y1={dy(p.lo)} y2={dy(p.hi)} />
              <circle class="nl-dot" cx={x} cy={dy(p.mean)} r="5" />
              {#if focus === g}
                <text class="nl-val" x={x + (p.bin === 'Low' ? -12 : 12)} y={dy(p.mean) + 4} text-anchor={p.bin === 'Low' ? 'end' : 'start'}>{fmt1(p.mean)}</text>
              {/if}
            {/each}
            {#if !narrow}
              <text class="nl-lbl" x={width - dm.r + 14} y={dy(pts[2].mean) + 4}>{g}</text>
            {/if}
          </g>
        {/each}
      </svg>
      <div class="nl-keys">
        {#each GROUPS as g (g)}
          <button type="button" class="nl-chip {cls(g)}" aria-pressed={emphasis === g} onclick={() => (emphasis = emphasis === g ? null : g)}><i class="nl-sw"></i>{g}</button>
        {/each}
      </div>
    </div>
  {:else if width > 0}
    <div class="nl-section">
      <div class="nl-h">Nature exposure around campus <span>heat layer from the source map; basemap not included</span></div>
      <div class="nl-mapwrap">
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="nl-map" style:width="{mapW}px" style:height="{mapH}px" onpointermove={mapMove} onpointerleave={() => (mapHover = null)}>
          <canvas bind:this={canvas} style:width="{mapW}px" style:height="{mapH}px" role="img"
            aria-label="Raster map of relative nature exposure; most of the area is high exposure, with low-exposure pockets in the urban core."></canvas>
          {#if campus}
            <div class="nl-pin" style:left="{(campus.col + 0.5) * cell}px" style:top="{(campus.row + 0.5) * cell}px"><span>UVM campus (approx.)</span></div>
          {/if}
          {#if mapHover}
            <div class="nl-maptip" style:left="{Math.min(mapW - 150, (mapHover.c + 1) * cell + 8)}px" style:top="{Math.max(0, mapHover.r * cell - 34)}px">
              Exposure <b class="nl-mono">{mapHover.v.toFixed(2)}</b><br /><span>higher than {pctRank(mapHover.v)}% of the area</span>
            </div>
          {/if}
        </div>
        <div class="nl-legend"><span>Less nature</span><span class="nl-ramp" aria-hidden="true"></span><span>More nature</span></div>
      </div>
    </div>
  {/if}
</figure>

<style>
  .nl {
    --nl-surface: #fcfcfb; --nl-ink: #0b0b0b; --nl-ink2: #52514e; --nl-muted: #898781;
    --nl-grid: #e1e0d9; --nl-axis: #c3c2b7; --nl-ring: rgba(11, 11, 11, 0.1); --nl-trt: rgba(11, 11, 11, 0.035);
    --nl-control: #2a78d6; --nl-exercise: #eb6834; --nl-nature: #1baf7a; --nl-therapy: #eda100;
    --nl-avg: #52514e; --nl-accent: #eb6834;
    --nl-map-lo: #f3e3c2; --nl-map-hi: #0f5b3a;
    --nl-font: 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
    --nl-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    margin: 0; display: grid; gap: 22px; font-family: var(--nl-font); color: var(--nl-ink);
  }
  .nl.dark {
    --nl-surface: #1a1a19; --nl-ink: #fff; --nl-ink2: #c3c2b7; --nl-grid: #2c2c2a; --nl-axis: #383835; --nl-ring: rgba(255, 255, 255, 0.1); --nl-trt: rgba(255, 255, 255, 0.04);
    --nl-control: #3987e5; --nl-exercise: #d95926; --nl-nature: #199e70; --nl-therapy: #c98500; --nl-avg: #c3c2b7; --nl-accent: #d95926;
    --nl-map-lo: #3b3322; --nl-map-hi: #6fd6a1;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) .nl.auto {
      --nl-surface: #1a1a19; --nl-ink: #fff; --nl-ink2: #c3c2b7; --nl-grid: #2c2c2a; --nl-axis: #383835; --nl-ring: rgba(255, 255, 255, 0.1); --nl-trt: rgba(255, 255, 255, 0.04);
      --nl-control: #3987e5; --nl-exercise: #d95926; --nl-nature: #199e70; --nl-therapy: #c98500; --nl-avg: #c3c2b7; --nl-accent: #d95926;
      --nl-map-lo: #3b3322; --nl-map-hi: #6fd6a1;
    }
  }
  :global(:root[data-theme='dark']) .nl.auto {
    --nl-surface: #1a1a19; --nl-ink: #fff; --nl-ink2: #c3c2b7; --nl-grid: #2c2c2a; --nl-axis: #383835; --nl-ring: rgba(255, 255, 255, 0.1); --nl-trt: rgba(255, 255, 255, 0.04);
    --nl-control: #3987e5; --nl-exercise: #d95926; --nl-nature: #199e70; --nl-therapy: #c98500; --nl-avg: #c3c2b7; --nl-accent: #d95926;
    --nl-map-lo: #3b3322; --nl-map-hi: #6fd6a1;
  }
  .g-control { --c: var(--nl-control); }
  .g-exercise { --c: var(--nl-exercise); }
  .g-nature { --c: var(--nl-nature); }
  .g-therapy { --c: var(--nl-therapy); }

  .nl-bar { display: flex; flex-wrap: wrap; gap: 10px; }
  .nl-seg { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--nl-axis); border-radius: 7px; overflow: hidden; }
  .nl-seg button { font: 500 13px var(--nl-font); background: transparent; color: var(--nl-ink2); border: 0; padding: 6px 12px; cursor: pointer; }
  .nl-seg button[aria-pressed='true'] { background: var(--nl-ink); color: var(--nl-surface); }
  button:focus-visible, svg:focus-visible { outline: 2px solid var(--nl-accent); outline-offset: 2px; }

  .nl-section { display: grid; gap: 8px; }
  .nl-h { font-weight: 600; font-size: 14px; display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; }
  .nl-h span { font-weight: 400; font-size: 12px; color: var(--nl-muted); }
  svg { display: block; overflow: visible; touch-action: pan-y; }
  .nl-grid { stroke: var(--nl-grid); }
  .nl-axis { fill: var(--nl-muted); font: 11px var(--nl-mono); }
  .nl-lbl { fill: var(--nl-ink); font: 500 12.5px var(--nl-font); }
  .nl-val { fill: var(--nl-ink2); font: 500 12px var(--nl-mono); }
  .nl-mono { font-family: var(--nl-mono); font-variant-numeric: tabular-nums; }

  .nl-db { transition: opacity 0.2s; }
  .nl-db.dim, .nl-dg.dim { opacity: 0.3; }
  .nl-dbl { stroke: var(--c); stroke-width: 2.5; }
  .nl-before { fill: var(--nl-surface); stroke: var(--c); stroke-width: 2; }
  .nl-after { fill: var(--c); stroke: var(--nl-surface); stroke-width: 2; }
  .nl-keys { display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 12.5px; color: var(--nl-ink2); align-items: center; }
  .nl-ring, .nl-fill { display: inline-block; width: 10px; height: 10px; border-radius: 50%; margin-right: 6px; vertical-align: -1px; }
  .nl-ring { border: 2px solid var(--nl-ink2); }
  .nl-fill { background: var(--nl-ink2); }

  .nl-sm { display: grid; }
  .nl-cell { display: grid; gap: 2px; transition: opacity 0.2s; }
  .nl-ct { display: flex; justify-content: space-between; gap: 8px; font-size: 13px; min-height: 20px; }
  .nl-ct span { color: var(--nl-ink); font-size: 12px; }
  .nl-ct em { font-style: normal; color: var(--nl-muted); }
  .nl-sw { display: inline-block; width: 12px; height: 3px; border-radius: 2px; background: var(--c); vertical-align: middle; margin-right: 6px; }
  .nl-trt { fill: var(--nl-trt); }
  .nl-band { fill: var(--c); fill-opacity: 0.18; }
  .nl-avg { fill: none; stroke: var(--nl-avg); stroke-width: 1.5; stroke-dasharray: 5 4; }
  .nl-line { fill: none; stroke: var(--c); stroke-width: 2; stroke-linejoin: round; }
  .nl-cross { stroke: var(--nl-axis); stroke-dasharray: 3 3; }
  .nl-dot { fill: var(--c); stroke: var(--nl-surface); stroke-width: 2; }

  .nl-dg { cursor: default; transition: opacity 0.2s; }
  .nl-hit { fill: none; stroke: transparent; stroke-width: 16; pointer-events: stroke; }
  .nl-ci { stroke: var(--c); stroke-width: 2; }
  .nl-chip { font: 12.5px var(--nl-font); color: var(--nl-ink2); background: transparent; border: 1px solid var(--nl-axis); border-radius: 999px; padding: 3px 10px; cursor: pointer; }
  .nl-chip[aria-pressed='true'] { border-color: var(--nl-ink); color: var(--nl-ink); }

  .nl-mapwrap { display: grid; gap: 10px; justify-items: start; }
  .nl-map { position: relative; max-width: 100%; }
  .nl-map canvas { display: block; }
  .nl-pin { position: absolute; width: 14px; height: 14px; margin: -7px 0 0 -7px; border: 2px solid var(--nl-ink); border-radius: 50%; pointer-events: none; }
  .nl-pin span { position: absolute; left: 18px; top: -4px; white-space: nowrap; font-size: 12px; color: var(--nl-ink); background: color-mix(in oklab, var(--nl-surface) 80%, transparent); padding: 0 4px; border-radius: 3px; }
  .nl-maptip { position: absolute; pointer-events: none; background: var(--nl-surface); border: 1px solid var(--nl-ring); border-radius: 8px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12); padding: 6px 9px; font-size: 12.5px; line-height: 1.4; white-space: nowrap; }
  .nl-maptip span { color: var(--nl-ink2); }
  .nl-legend { display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: var(--nl-ink2); }
  .nl-ramp { width: 120px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, var(--nl-map-lo), var(--nl-map-hi)); }
  @media (prefers-reduced-motion: reduce) { .nl-db, .nl-cell, .nl-dg { transition: none; } }
</style>
