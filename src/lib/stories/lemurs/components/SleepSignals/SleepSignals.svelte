<!--
  SleepSignals.svelte (Svelte 5 + D3)
  Two views of LEMURS Figure 1:
    "minutes": an hour × minute grid of when students fall asleep and get up,
               with a minute-of-hour profile that exposes alarm times.
    "arcs":    the two stable heart-rate arc clusters (k = 2) over the night,
               optionally over the unstable k = 3 spread.
  Props, theming and story usage: see README.md next to this file.
-->
<script module lang="ts">
  export type ClusterPoint = { t: number; mid: number; lo: number; hi: number };
  export type SpreadPoint = { t: number; min: number; p10: number; p50: number; p90: number; max: number };
  export type SleepSignalsData = {
    clock: { start: number[]; end: number[] };
    clusters: { lateMinimum: ClusterPoint[]; hammock: ClusterPoint[]; k3Spread: SpreadPoint[] };
  };
  export type SleepSignalsView = 'minutes' | 'arcs';
  export type SleepSignalsArc = 'lateMinimum' | 'hammock';
</script>

<script lang="ts">
  import { scaleLinear, line, area, curveMonotoneX, max as d3max } from 'd3';
  import { draw, fade } from 'svelte/transition';
  import { cubicInOut } from 'svelte/easing';

  interface Props {
    data: SleepSignalsData;
    view?: SleepSignalsView;
    arcs?: SleepSignalsArc[];
    showControls?: boolean;
    showSpread?: boolean;
    showSummary?: boolean;
    theme?: 'light' | 'dark' | 'auto';
  }

  let {
    data,
    view = $bindable('minutes'),
    arcs = ['lateMinimum', 'hammock'],
    showControls = true,
    showSpread = $bindable(false),
    showSummary = true,
    theme = 'light'
  }: Props = $props();

  let width = $state(0);
  const narrow = $derived(width < 560);

  // ---------------- minutes view ----------------
  const ALARM = [0, 1, 15, 16, 30, 31, 45, 46];
  const HOUR_ORDER = [6, 7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5]; // index into 12-hour face (0 = 12 o'clock)
  const hourLabel = (h: number) => String(h === 0 ? 12 : h);
  const clockLabel = (i: number) => `${hourLabel(Math.floor(i / 60))}:${String(i % 60).padStart(2, '0')}`;

  const vmax = $derived(Math.max(d3max(data.clock.start) ?? 1, d3max(data.clock.end) ?? 1));

  function profile(vals: number[]) {
    const rows = Array.from({ length: 12 }, (_, h) => vals.slice(h * 60, h * 60 + 60));
    const rowMean = rows.map((r) => r.reduce((a, b) => a + b, 0) / 60);
    const top = Math.max(...rowMean);
    const active = rowMean.map((m, h) => (m >= 0.5 * top ? h : -1)).filter((h) => h >= 0);
    const marg = Array.from({ length: 60 }, (_, m) => active.reduce((a, h) => a + rows[h][m], 0) / active.length);
    const inA = ALARM.map((m) => marg[m]), outA = marg.filter((_, m) => !ALARM.includes(m));
    const ratio = inA.reduce((a, b) => a + b, 0) / inA.length / (outA.reduce((a, b) => a + b, 0) / outA.length);
    return { marg, active, ratio };
  }
  const panels = $derived([
    { key: 'start', title: 'Falling asleep', vals: data.clock.start, ...profile(data.clock.start) },
    { key: 'end', title: 'Getting up', vals: data.clock.end, ...profile(data.clock.end) }
  ]);

  const labelW = 30;
  const cw = $derived(Math.max(1, (width - labelW - 2) / 60));
  const ch = $derived(Math.max(8, Math.min(15, cw * 1.25)));
  const gridH = $derived(12 * ch);
  const margH = 54;
  const panelH = $derived(gridH + 12 + margH + 22);
  const mmax = $derived(Math.max(...panels.flatMap((p) => p.marg)));
  const pct = (v: number) => Math.round((100 * v) / vmax);

  // ---------------- arcs view ----------------
  const ARC_H = $derived(Math.max(300, Math.min(440, width * 0.52)));
  const am = $derived({ l: 40, r: narrow ? 12 : 200, t: 14, b: 40 });
  const ax = $derived(scaleLinear().domain([0, 29]).range([am.l, width - am.r]));
  const ay = $derived(scaleLinear().domain([-1.25, 2.15]).range([ARC_H - am.b, am.t]));
  const ctr = $derived(line<ClusterPoint>().x((d) => ax(d.t)).y((d) => ay(d.mid)).curve(curveMonotoneX));
  const rib = $derived(area<ClusterPoint>().x((d) => ax(d.t)).y0((d) => ay(d.lo)).y1((d) => ay(d.hi)).curve(curveMonotoneX));
  const band = (lo: keyof SpreadPoint, hi: keyof SpreadPoint) =>
    area<SpreadPoint>().x((d) => ax(d.t)).y0((d) => ay(d[lo])).y1((d) => ay(d[hi])).curve(curveMonotoneX)(data.clusters.k3Spread) ?? '';
  const ONSET = 4;
  const series = $derived([
    { key: 'lateMinimum', name: 'Late-minimum arc', note: 'linked to prior diagnosis + trauma', pts: data.clusters.lateMinimum, cls: 's1' },
    { key: 'hammock', name: 'Hammock arc', note: 'lowest around mid-sleep', pts: data.clusters.hammock, cls: 's2' }
  ].map((s) => {
    // ignore the sleep-onset transient (steps 0-3) when locating each arc's trough
    const min = s.pts.filter((p) => p.t >= ONSET).reduce((a, p) => (p.mid < a.mid ? p : a));
    return { ...s, min };
  }).filter((s) => arcs.includes(s.key as SleepSignalsArc)));
  // An arc that arrives mid-scroll draws itself in, then its ribbon, low-point
  // dot and label settle in behind the line.
  const DRAW_MS = 1100;

  // ---------------- interaction ----------------
  type Tip = { x: number; y: number; html: string } | null;
  let tip: Tip = $state(null);
  let hoverCell: { panel: string; i: number } | null = $state(null);
  let hoverT: number | null = $state(null);

  function cellFromEvent(e: PointerEvent, key: string, vals: number[], marg: number[]) {
    const svg = e.currentTarget as SVGSVGElement, r = svg.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    const m = Math.floor((px - labelW) / cw);
    if (m < 0 || m > 59) { tip = null; hoverCell = null; return; }
    if (py < gridH) {
      const row = Math.floor(py / ch); if (row < 0 || row > 11) return;
      const i = HOUR_ORDER[row] * 60 + m;
      hoverCell = { panel: key, i };
      tip = { ...local(e), html: `<b>${clockLabel(i)}</b> on the clock face<br><span>${pct(vals[i])}% of the busiest minute</span>` };
    } else if (py > gridH + 12 && py < gridH + 12 + margH) {
      hoverCell = { panel: key, i: -1 - m };
      tip = { ...local(e), html: `<b>:${String(m).padStart(2, '0')}</b> past the hour<br><span>${pct(marg[m])}% on average in the busiest hours</span>` };
    } else { tip = null; hoverCell = null; }
  }
  function arcMove(e: PointerEvent) {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const t = Math.round(ax.invert(e.clientX - r.left));
    if (t < 0 || t > 29) { hoverT = null; tip = null; return; }
    hoverT = t;
    const rows = series.map((s) =>
      `<div class="ss-tr"><i class="ss-sw ${s.cls}"></i><span>${s.name.replace(' arc', '')}</span><span class="ss-mono">${s.pts[t].mid.toFixed(2)}</span></div>`);
    tip = { ...local(e), html: `<b>Step ${t} of 29</b>${rows.join('')}` };
  }
  let bodyEl: HTMLDivElement | undefined = $state();
  function local(e: PointerEvent) {
    const b = bodyEl?.getBoundingClientRect();
    return { x: e.clientX - (b?.left ?? 0), y: e.clientY - (b?.top ?? 0) };
  }
  function clear() { tip = null; hoverCell = null; hoverT = null; }

  let tipEl: HTMLDivElement | undefined = $state();
  const tipPos = $derived.by(() => {
    if (!tip) return { left: 0, top: 0 };
    const tw = tipEl?.offsetWidth ?? 170, th = tipEl?.offsetHeight ?? 50;
    let left = tip.x + 14; if (left + tw > width) left = tip.x - tw - 14;
    return { left: Math.max(0, left), top: Math.max(0, tip.y - th - 10) };
  });
</script>

<figure class="ss {theme}" bind:clientWidth={width}>
  {#if showControls}
    <div class="ss-bar">
      <div class="ss-seg" role="group" aria-label="Choose view">
        <button type="button" aria-pressed={view === 'minutes'} onclick={() => { view = 'minutes'; clear(); }}>Alarm minutes</button>
        <button type="button" aria-pressed={view === 'arcs'} onclick={() => { view = 'arcs'; clear(); }}>Heart-rate arcs</button>
      </div>
      {#if view === 'minutes'}
        <div class="ss-legend"><span>Less often</span><span class="ss-ramp" aria-hidden="true"></span><span>More often</span></div>
      {:else}
        <label class="ss-check"><input id="ss-spread" type="checkbox" bind:checked={showSpread} /> Show the unstable k = 3 spread</label>
      {/if}
    </div>
  {/if}

  <div class="ss-body" bind:this={bodyEl}>
    {#if width > 0 && view === 'minutes'}
      {#each panels as p (p.key)}
        <div class="ss-panel">
          <div class="ss-ptitle"><b>{p.title}</b><span>hour of a 12-hour clock face × minute past the hour</span></div>
          <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
          <svg {width} height={panelH} role="img"
            aria-label="{p.title}: frequency by hour and minute. Alarm minutes score {p.ratio.toFixed(2)} times other minutes."
            onpointermove={(e) => cellFromEvent(e, p.key, p.vals, p.marg)} onpointerleave={clear}>
            {#each HOUR_ORDER as h, row (h)}
              <text class="ss-axis" x={labelW - 6} y={row * ch + ch / 2 + 3.5} text-anchor="end">{hourLabel(h)}</text>
              {#each { length: 60 } as _, m (m)}
                {@const v = p.vals[h * 60 + m]}
                <rect x={labelW + m * cw} y={row * ch} width={cw + 0.25} height={ch + 0.25}
                  style:fill="color-mix(in oklab, var(--ss-hi) {Math.round((100 * v) / vmax)}%, var(--ss-lo))" />
              {/each}
            {/each}
            {#if hoverCell?.panel === p.key && hoverCell.i >= 0}
              {@const row = HOUR_ORDER.indexOf(Math.floor(hoverCell.i / 60))}
              <rect class="ss-hl" x={labelW + (hoverCell.i % 60) * cw} y={row * ch} width={cw} height={ch} />
            {/if}

            <g transform="translate(0 {gridH + 12})">
              {#each p.marg as v, m (m)}
                <rect class="ss-mbar" class:alarm={ALARM.includes(m)} class:hot={hoverCell?.panel === p.key && hoverCell.i === -1 - m}
                  x={labelW + m * cw + Math.min(1, cw * 0.15)} y={margH - (margH * v) / mmax}
                  width={Math.max(1, cw - Math.min(2, cw * 0.3))} height={(margH * v) / mmax} rx="1.5" />
              {/each}
              <line class="ss-base" x1={labelW} x2={labelW + 60 * cw} y1={margH + 0.5} y2={margH + 0.5} />
              {#each [0, 15, 30, 45] as m (m)}
                <text class="ss-axis" x={labelW + m * cw + cw / 2} y={margH + 15} text-anchor="middle">:{String(m).padStart(2, '0')}</text>
              {/each}
            </g>
          </svg>
          {#if showSummary}
            <p class="ss-note">
              {#if p.key === 'end'}
                In the busiest hours ({p.active.map(hourLabel).join(', ')}), minutes at :00, :01, :15, :16, :30, :31, :45 and :46 score <b>{p.ratio.toFixed(2)}×</b> the others. Alarms go off, and people get up a minute later.
              {:else}
                In the busiest hours ({p.active.map(hourLabel).join(', ')}), the same minutes score <b>{p.ratio.toFixed(2)}×</b> the others, so bedtimes show no pull toward the quarter hour.
              {/if}
            </p>
          {/if}
        </div>
      {/each}
    {:else if width > 0}
      <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
      <svg {width} height={ARC_H} role="img" onpointermove={arcMove} onpointerleave={clear}
        aria-label="Standardized heart rate across the night for {series.length === 1 ? 'one of the two stable clusters' : 'the two stable clusters'}. {series.map((s) => `The ${s.name.toLowerCase()} bottoms out at step ${s.min.t} of 29.`).join(' ')}">
        {#each [-1, 0, 1, 2] as v (v)}
          <line class="ss-grid" class:zero={v === 0} x1={am.l} x2={width - am.r} y1={ay(v)} y2={ay(v)} />
          <text class="ss-axis" x={am.l - 8} y={ay(v) + 3.5} text-anchor="end">{v > 0 ? '+' : v < 0 ? '−' : ''}{Math.abs(v)}</text>
        {/each}
        <text class="ss-axis" x={am.l} y={ARC_H - 12}>Falling asleep</text>
        <text class="ss-axis" x={width - am.r} y={ARC_H - 12} text-anchor="end">Waking</text>

        {#if showSpread}
          <path class="ss-spread outer" d={band('min', 'max')} />
          <path class="ss-spread" d={band('p10', 'p90')} />
        {/if}
        {#each series as s (s.key)}
          <path class="ss-rib {s.cls}" d={rib(s.pts) ?? ''}
            in:fade={{ delay: DRAW_MS * 0.4, duration: DRAW_MS * 0.6 }} out:fade={{ duration: 250 }} />
          <path class="ss-line {s.cls}" d={ctr(s.pts) ?? ''}
            in:draw={{ duration: DRAW_MS, easing: cubicInOut }} out:fade={{ duration: 250 }} />
          <circle class="ss-min {s.cls}" cx={ax(s.min.t)} cy={ay(s.min.mid)} r="5"
            in:fade={{ delay: DRAW_MS * 0.7, duration: 300 }} out:fade={{ duration: 250 }} />
        {/each}
        {#if !narrow}
          {#each series as s (s.key)}
            {@const last = s.pts[s.pts.length - 1]}
            <g in:fade={{ delay: DRAW_MS * 0.85, duration: 300 }} out:fade={{ duration: 250 }}>
              <text class="ss-dl" x={width - am.r + 10} y={ay(last.mid) + (s.key === 'hammock' ? -4 : 12)}>{s.name}</text>
              <text class="ss-dl2" x={width - am.r + 10} y={ay(last.mid) + (s.key === 'hammock' ? 10 : 26)}>{s.note}</text>
            </g>
          {/each}
        {/if}
        {#if hoverT != null}
          <line class="ss-cross" x1={ax(hoverT)} x2={ax(hoverT)} y1={am.t} y2={ARC_H - am.b} />
          {#each series as s (s.key)}
            <circle class="ss-dot {s.cls}" cx={ax(hoverT)} cy={ay(s.pts[hoverT].mid)} r="4" />
          {/each}
        {/if}
      </svg>
      <div class="ss-keys">
        {#each series as s (s.key)}
          <span in:fade={{ delay: DRAW_MS * 0.85, duration: 300 }}><i class="ss-sw {s.cls}"></i>{s.name}: lowest at step {s.min.t} of 29</span>
        {/each}
        {#if showSpread}<span><i class="ss-sw sp"></i>k = 3 centroids (10th–90th percentile)</span>{/if}
      </div>
      {#if showSummary}
        <p class="ss-note">Heart rate is standardized within each night; dots mark each arc’s lowest point after sleep onset (steps 0–3 excluded). Two arc shapes recur whenever the data is resampled; a third cluster does not settle into a stable shape.</p>
      {/if}
    {/if}

    {#if tip}
      <div class="ss-tip" bind:this={tipEl} style:left="{tipPos.left}px" style:top="{tipPos.top}px">{@html tip.html}</div>
    {/if}
  </div>
</figure>

<style>
  .ss {
    --ss-surface: #fcfcfb; --ss-ink: #0b0b0b; --ss-ink2: #52514e; --ss-muted: #898781;
    --ss-grid: #e1e0d9; --ss-axis: #c3c2b7; --ss-ring: rgba(11, 11, 11, 0.1);
    --ss-lo: #f0efec; --ss-hi: #104281;           /* minute grid ramp */
    --ss-bar: #9ec5f4; --ss-bar-alarm: #1c5cab;   /* minute profile */
    --ss-s1: #2a78d6; --ss-s2: #eb6834; --ss-spread: #898781; --ss-accent: #eb6834;
    --ss-font: 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
    --ss-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    margin: 0; display: grid; gap: 12px; font-family: var(--ss-font); color: var(--ss-ink);
  }
  .ss.dark {
    --ss-surface: #1a1a19; --ss-ink: #fff; --ss-ink2: #c3c2b7; --ss-grid: #2c2c2a; --ss-axis: #383835; --ss-ring: rgba(255, 255, 255, 0.1);
    --ss-lo: #232322; --ss-hi: #cde2fb; --ss-bar: #256abf; --ss-bar-alarm: #9ec5f4; --ss-s1: #3987e5; --ss-s2: #d95926; --ss-accent: #d95926;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) .ss.auto {
      --ss-surface: #1a1a19; --ss-ink: #fff; --ss-ink2: #c3c2b7; --ss-grid: #2c2c2a; --ss-axis: #383835; --ss-ring: rgba(255, 255, 255, 0.1);
      --ss-lo: #232322; --ss-hi: #cde2fb; --ss-bar: #256abf; --ss-bar-alarm: #9ec5f4; --ss-s1: #3987e5; --ss-s2: #d95926; --ss-accent: #d95926;
    }
  }
  :global(:root[data-theme='dark']) .ss.auto {
    --ss-surface: #1a1a19; --ss-ink: #fff; --ss-ink2: #c3c2b7; --ss-grid: #2c2c2a; --ss-axis: #383835; --ss-ring: rgba(255, 255, 255, 0.1);
    --ss-lo: #232322; --ss-hi: #cde2fb; --ss-bar: #256abf; --ss-bar-alarm: #9ec5f4; --ss-s1: #3987e5; --ss-s2: #d95926; --ss-accent: #d95926;
  }

  .ss-bar { display: flex; flex-wrap: wrap; gap: 10px 24px; align-items: center; justify-content: space-between; }
  .ss-seg { display: inline-flex; border: 1px solid var(--ss-axis); border-radius: 7px; overflow: hidden; }
  .ss-seg button { font: 500 13px var(--ss-font); background: transparent; color: var(--ss-ink2); border: 0; padding: 6px 12px; cursor: pointer; }
  .ss-seg button[aria-pressed='true'] { background: var(--ss-ink); color: var(--ss-surface); }
  .ss-seg button:focus-visible, .ss-check input:focus-visible { outline: 2px solid var(--ss-accent); outline-offset: 2px; }
  .ss-legend, .ss-check { display: flex; gap: 8px; align-items: center; font-size: 12.5px; color: var(--ss-ink2); }
  .ss-ramp { width: 110px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, var(--ss-lo), var(--ss-hi)); border: 1px solid var(--ss-ring); }

  .ss-body { position: relative; display: grid; gap: 18px; }
  .ss-panel { display: grid; gap: 6px; }
  .ss-ptitle { display: flex; flex-wrap: wrap; gap: 4px 10px; align-items: baseline; font-size: 14px; }
  .ss-ptitle span { font-size: 12px; color: var(--ss-muted); }
  svg { display: block; overflow: visible; touch-action: pan-y; }
  .ss-axis { fill: var(--ss-muted); font: 11px var(--ss-mono); }
  .ss-hl { fill: none; stroke: var(--ss-accent); stroke-width: 2; }
  .ss-mbar { fill: var(--ss-bar); }
  .ss-mbar.alarm { fill: var(--ss-bar-alarm); }
  .ss-mbar.hot { fill: var(--ss-accent); }
  .ss-base { stroke: var(--ss-axis); }
  .ss-note { margin: 0; font-size: 13px; color: var(--ss-ink2); max-width: 70ch; }

  .ss-grid { stroke: var(--ss-grid); }
  .ss-grid.zero { stroke: var(--ss-axis); }
  .ss-spread { fill: var(--ss-spread); fill-opacity: 0.22; }
  .ss-spread.outer { fill-opacity: 0.09; }
  .ss-rib { fill-opacity: 0.22; }
  .ss-line { fill: none; stroke-width: 2.25; }
  .ss-rib.s1, .ss-min.s1, .ss-dot.s1 { fill: var(--ss-s1); }
  .ss-rib.s2, .ss-min.s2, .ss-dot.s2 { fill: var(--ss-s2); }
  .ss-line.s1 { stroke: var(--ss-s1); }
  .ss-line.s2 { stroke: var(--ss-s2); }
  .ss-min, .ss-dot { stroke: var(--ss-surface); stroke-width: 2; }
  .ss-cross { stroke: var(--ss-axis); stroke-dasharray: 3 3; }
  .ss-dl { fill: var(--ss-ink); font: 500 12px var(--ss-font); }
  .ss-dl2 { fill: var(--ss-muted); font: 11px var(--ss-font); }
  .ss-keys { display: flex; flex-wrap: wrap; gap: 6px 18px; font-size: 12.5px; color: var(--ss-ink2); }
  :global(.ss-sw) { display: inline-block; width: 12px; height: 3px; border-radius: 2px; vertical-align: middle; margin-right: 6px; }
  :global(.ss-sw.s1) { background: var(--ss-s1); }
  :global(.ss-sw.s2) { background: var(--ss-s2); }
  :global(.ss-sw.sp) { background: var(--ss-spread); opacity: 0.5; height: 8px; }

  .ss-tip { position: absolute; pointer-events: none; z-index: 2; min-width: 150px; background: var(--ss-surface);
    border: 1px solid var(--ss-ring); border-radius: 8px; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12);
    padding: 7px 10px; font-size: 12.5px; line-height: 1.45; color: var(--ss-ink); }
  .ss-tip :global(span) { color: var(--ss-ink2); }
  .ss-tip :global(.ss-tr) { display: flex; gap: 8px; align-items: center; }
  .ss-tip :global(.ss-tr span:nth-of-type(1)) { flex: 1; }
  .ss-tip :global(.ss-mono) { font-family: var(--ss-mono); color: var(--ss-ink); }
</style>
