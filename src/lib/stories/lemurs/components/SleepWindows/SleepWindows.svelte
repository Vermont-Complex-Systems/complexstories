<!--
  SleepWindows.svelte (Svelte 5 + D3)
  Every participant's sleep window as a hairline, stacked and sorted.
  Props, theming and scrollytelling usage: see README.md next to this file.
  Data rows: { start, end, midpoint, duration } in hours relative to midnight
  (start may be negative, e.g. -1.5 = 10:30 PM the night before).
-->
<script module lang="ts">
  export type SleepRow = { start: number; end: number; midpoint: number; duration: number };
  export type SortKey = 'midpoint' | 'duration';
  export type SleepLayout = 'linear' | 'radial';
</script>

<script lang="ts">
  import { scaleLinear, median, deviation, mean } from 'd3';

  interface Props {
    data: SleepRow[];
    sortBy?: SortKey;
    layout?: SleepLayout;
    showControls?: boolean;
    showLegend?: boolean;
    showStats?: boolean;
    showTable?: boolean;
    height?: number | null;
    domain?: [number, number];
    durationDomain?: [number, number];
    nightBand?: [number, number] | null;
    highlight?: number | null;
    theme?: 'light' | 'dark' | 'auto';
    ariaLabel?: string;
  }

  let {
    data,
    sortBy = $bindable('midpoint'),
    layout = 'linear',           // 'radial' = a 24-hour clock face, one ring per participant
    showControls = true,
    showLegend = true,
    showStats = true,
    showTable = true,
    height = null,               // null = responsive (0.62 × width, clamped 420–620)
    domain = [-3, 16],           // x-axis clock range in hours (9 PM → 4 PM)
    durationDomain = [6, 12],    // hours mapped onto the colour ramp
    nightBand = [0, 6],          // shaded clock-night band; null to hide
    highlight = $bindable(null), // index into data to spotlight (e.g. from a scrolly step)
    theme = 'light',             // 'auto' follows OS / <html data-theme>
    ariaLabel = 'Each participant’s average sleep window, stacked and sorted.'
  }: Props = $props();

  // ---------- formatting ----------
  const wrap = (h: number) => ((h % 24) + 24) % 24;
  const fmtClock = (h: number) => {
    let H = Math.floor(wrap(h)), M = Math.round((wrap(h) - H) * 60);
    if (M === 60) { H = (H + 1) % 24; M = 0; }
    return `${H % 12 || 12}:${String(M).padStart(2, '0')} ${H < 12 ? 'AM' : 'PM'}`;
  };
  const fmtHour = (h: number) => { const H = Math.floor(wrap(h)); return `${H % 12 || 12} ${H < 12 ? 'AM' : 'PM'}`; };

  // ---------- layout ----------
  let width = $state(0);
  const narrow = $derived(width < 560);
  const radial = $derived(layout === 'radial');
  // the clock face is square, so it never asks for more height than width
  const H = $derived(radial
    ? Math.min(height ?? width, width)
    : height ?? Math.max(420, Math.min(620, width * 0.62)));
  const m = $derived({ l: narrow ? 8 : 12, r: narrow ? 8 : 124, t: 8, b: 30 });
  const pw = $derived(Math.max(0, width - m.l - m.r));
  const ph = $derived(Math.max(0, H - m.t - m.b));

  const x = $derived(scaleLinear().domain(domain).range([m.l, m.l + pw]));
  const ticks = $derived.by(() => {
    const step = narrow ? 3 : 1, out: number[] = [];
    for (let h = Math.ceil(domain[0]); h <= domain[1]; h += step) out.push(h);
    return out;
  });
  const labelled = (h: number) => narrow || (h - Math.ceil(domain[0])) % 3 === 0;

  // ---------- ordering ----------
  const byMidRank = $derived.by(() => {
    const idx = data.map((_, i) => i).sort((a, b) => data[a].midpoint - data[b].midpoint);
    const rank: number[] = new Array(data.length);
    idx.forEach((i, r) => (rank[i] = r + 1));
    return rank;
  });
  const order = $derived(
    data.map((_, i) => i).sort((a, b) =>
      data[a][sortBy] - data[b][sortBy] || data[a].midpoint - data[b].midpoint)
  );
  const position = $derived.by(() => {
    const p: number[] = new Array(data.length);
    order.forEach((i, k) => (p[i] = k));
    return p;
  });
  const rowH = $derived(ph / Math.max(1, data.length));
  const lw = $derived(Math.max(0.6, Math.min(2, rowH * 0.8)));
  const y = (i: number) => m.t + (position[i] + 0.5) * rowH;

  // ---------- radial layout ----------
  // A 24-hour clock with midnight at the top. Each participant is a ring, and
  // the sort runs from the centre outward, so the first row is the innermost.
  const size = $derived(Math.min(width, H));
  const cx = $derived(width / 2);
  const cy = $derived(H / 2);
  const R = $derived(Math.max(0, size / 2 - (narrow ? 30 : 38)));
  const r0 = $derived(R * 0.22);
  const ringW = $derived((R - r0) / Math.max(1, data.length));
  const ringLw = $derived(Math.max(0.6, Math.min(2, ringW * 1.1)));
  const radius = (i: number) => r0 + (position[i] + 0.5) * ringW;
  const angle = (h: number) => (h / 24) * 2 * Math.PI;
  const pt = (h: number, r: number) => [cx + r * Math.sin(angle(h)), cy - r * Math.cos(angle(h))];
  const arcPath = (h0: number, h1: number, r: number) => {
    const [x0, y0] = pt(h0, r), [x1, y1] = pt(h1, r);
    return `M${x0},${y0}A${r},${r} 0 ${h1 - h0 > 12 ? 1 : 0} 1 ${x1},${y1}`;
  };
  const sectorPath = (h0: number, h1: number, ri: number, ro: number) => {
    const large = h1 - h0 > 12 ? 1 : 0;
    const [a, b] = pt(h0, ro), [c, d] = pt(h1, ro), [e, f] = pt(h1, ri), [g, k] = pt(h0, ri);
    return `M${a},${b}A${ro},${ro} 0 ${large} 1 ${c},${d}L${e},${f}A${ri},${ri} 0 ${large} 0 ${g},${k}Z`;
  };
  const clockHours = Array.from({ length: 24 }, (_, h) => h);
  const clockLabel = (h: number) => (h === 0 ? 'Midnight' : h === 12 ? 'Noon' : fmtHour(h));
  const labelAnchor = (h: number) => {
    const sx = Math.sin(angle(h));
    return Math.abs(sx) < 0.3 ? 'middle' : sx > 0 ? 'start' : 'end';
  };

  // colour: duration → mix between --sw-lo and --sw-hi (theme stays in CSS)
  const mixPct = (d: number) => Math.round(100 * Math.min(1, Math.max(0, (d - durationDomain[0]) / (durationDomain[1] - durationDomain[0]))));

  // ---------- quintiles & stats ----------
  const quintiles = $derived.by(() => {
    const n = order.length;
    return [0, 1, 2, 3, 4].map((q) => {
      const rows = order.slice(Math.round((q * n) / 5), Math.round(((q + 1) * n) / 5)).map((i) => data[i]);
      return { q, rows, y0: m.t + (q * ph) / 5, h: ph / 5 };
    });
  });
  const qValue = (rows: SleepRow[]) =>
    sortBy === 'midpoint'
      ? `mid ${fmtClock(median(rows, (r: SleepRow) => r.midpoint) ?? NaN)}`
      : `${(median(rows, (r: SleepRow) => r.duration) ?? NaN).toFixed(1)} h`;
  const qLabels = $derived(sortBy === 'midpoint'
    ? ['Earliest 20%', '', 'Middle 20%', '', 'Latest 20%']
    : ['Shortest 20%', '', 'Middle 20%', '', 'Longest 20%']);

  const pearson = (a: number[], b: number[]) => {
    const ma = mean(a) ?? 0, mb = mean(b) ?? 0;
    let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - ma) * (b[i] - mb);
    return s / ((a.length - 1) * (deviation(a) ?? 1) * (deviation(b) ?? 1));
  };
  const stats = $derived.by(() => {
    const sorted = [...data].sort((a, b) => a.midpoint - b.midpoint), n = sorted.length;
    const first = sorted.slice(0, Math.round(n / 5)), last = sorted.slice(Math.round((4 * n) / 5));
    const med = (rows: SleepRow[], k: keyof SleepRow) => median(rows, (d: SleepRow) => d[k]) ?? NaN;
    const shift = med(last, 'midpoint') - med(first, 'midpoint');
    const dd = (med(last, 'duration') - med(first, 'duration')) * 60;
    const r = pearson(data.map((d) => d.duration), data.map((d) => d.midpoint));
    const table = ['Earliest', 'Early', 'Middle', 'Late', 'Latest'].map((name, q) => {
      const s = sorted.slice(Math.round((q * n) / 5), Math.round(((q + 1) * n) / 5));
      return { name, n: s.length, start: med(s, 'start'), mid: med(s, 'midpoint'),
               end: med(s, 'end'), dur: med(s, 'duration') };
    });
    const cards = [
      { v: fmtClock(med(data, 'midpoint')), t: `Median sleep midpoint across all ${n} participants` },
      { v: `${shift.toFixed(1)} h`, t: 'Gap between the median midpoint of the latest and earliest fifth' },
      { v: `${dd >= 0 ? '+' : '−'}${Math.abs(dd).toFixed(0)} min`, t: 'Difference in median duration between those same two groups' },
      { v: `r = ${r.toFixed(2)}`, t: 'Correlation of duration with midpoint' }
    ];
    return { cards, table };
  });

  // ---------- interaction ----------
  let hover: number | null = $state(null);
  let pointer = $state({ x: 0, y: 0 });
  let tipEl: HTMLDivElement | undefined = $state();
  const active = $derived(hover ?? highlight);

  function onMove(e: PointerEvent) {
    const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;
    if (radial) {
      const k = Math.floor((Math.hypot(px - cx, py - cy) - r0) / ringW);
      if (k < 0 || k >= order.length) { hover = null; return; }
      hover = order[k];
      pointer = { x: px, y: py };
      return;
    }
    const k = Math.floor((py - m.t) / rowH);
    if (k < 0 || k >= order.length || px < m.l || px > m.l + pw) { hover = null; return; }
    hover = order[k];
    pointer = { x: px, y: py };
  }
  function onKey(e: KeyboardEvent) {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End', 'Escape'].includes(e.key)) return;
    e.preventDefault();
    if (e.key === 'Escape') { hover = null; return; }
    let k = hover == null ? Math.floor(order.length / 2) : position[hover];
    k = e.key === 'Home' ? 0 : e.key === 'End' ? order.length - 1 : k + (e.key === 'ArrowUp' ? -1 : 1);
    k = Math.max(0, Math.min(order.length - 1, k));
    hover = order[k];
    if (radial) { const [px, py] = pt(data[hover].end, radius(hover)); pointer = { x: px, y: py }; }
    else pointer = { x: x(data[hover].end), y: y(hover) };
  }

  const tipPos = $derived.by(() => {
    const tw = tipEl?.offsetWidth ?? 180, th = tipEl?.offsetHeight ?? 100;
    let tx = pointer.x + 16, ty = pointer.y - th / 2;
    if (tx + tw > width) tx = pointer.x - tw - 16;
    return { left: Math.max(0, tx), top: Math.max(0, Math.min(H - th, ty)) };
  });
</script>

<figure class="sw {theme}" bind:clientWidth={width}>
  {#if showControls || showLegend}
    <div class="sw-bar">
      {#if showControls}
        <div class="sw-seg" role="group" aria-label="Sort participants">
          <button type="button" aria-pressed={sortBy === 'midpoint'} onclick={() => (sortBy = 'midpoint')}>Sort by midpoint</button>
          <button type="button" aria-pressed={sortBy === 'duration'} onclick={() => (sortBy = 'duration')}>Sort by duration</button>
        </div>
      {/if}
      {#if showLegend}
        <div class="sw-legend">
          <span>Duration</span>
          <span class="sw-mono">{durationDomain[0]} h</span>
          <span class="sw-ramp" aria-hidden="true"></span>
          <span class="sw-mono">{durationDomain[1]} h</span>
          <span><span class="sw-tick" aria-hidden="true"></span>Sleep midpoint</span>
        </div>
      {/if}
    </div>
  {/if}

  <div class="sw-chart" style:height="{H}px">
    {#if width > 0}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <svg
        {width}
        height={H}
        role="img"
        aria-label={ariaLabel}
        tabindex="0"
        onpointermove={onMove}
        onpointerleave={() => (hover = null)}
        onkeydown={onKey}
      >
        {#if radial}
          {#if nightBand}
            <path class="sw-night" d={sectorPath(nightBand[0], nightBand[1], r0, R)} />
          {/if}
          <g class="sw-grid">
            {#each clockHours as h (h)}
              {@const [x0, y0] = pt(h, r0)}
              {@const [x1, y1] = pt(h, R)}
              <line x1={x0} y1={y0} x2={x1} y2={y1} />
              {#if !narrow || h % 3 === 0}
                {@const [lx, ly] = pt(h, R + (narrow ? 10 : 14))}
                <text class:major={h % 6 === 0} x={lx} y={ly + 4} text-anchor={labelAnchor(h)}>{clockLabel(h)}</text>
              {/if}
            {/each}
            <circle class="sw-base" {cx} {cy} r={r0} />
            <circle class="sw-base" {cx} {cy} r={R} />
          </g>
          <!-- the empty early-evening wedge carries the ring order -->
          <g class="sw-raxis">
            <text x={cx - r0 - 6} y={cy - 6} text-anchor="end">{sortBy === 'midpoint' ? (narrow ? 'Earliest' : 'Earliest midpoint') : 'Shortest'}</text>
            <text x={cx - R + 6} y={cy - 6} text-anchor="start">{sortBy === 'midpoint' ? 'Latest' : 'Longest'}</text>
          </g>

          <g class="sw-rings">
            {#each data as d, i (i)}
              <path d={arcPath(d.start, d.end, radius(i))} stroke-width={ringLw}
                style:stroke="color-mix(in oklab, var(--sw-hi) {mixPct(d.duration)}%, var(--sw-lo))" />
            {/each}
          </g>
          <g class="sw-mids">
            {#each data as d, i (i)}
              {@const [ax0, ay0] = pt(d.midpoint, radius(i) - Math.max(0.5, ringLw / 2))}
              {@const [ax1, ay1] = pt(d.midpoint, radius(i) + Math.max(0.5, ringLw / 2))}
              <line class="sw-midr" x1={ax0} y1={ay0} x2={ax1} y2={ay1} />
            {/each}
          </g>

          {#if active != null && data[active]}
            {@const d = data[active]}
            {@const [mx, my] = pt(d.midpoint, radius(active))}
            <g class="sw-active">
              <path class="sw-halo" d={arcPath(d.start, d.end, radius(active))} />
              <path class="sw-hl" d={arcPath(d.start, d.end, radius(active))} />
              <circle cx={mx} cy={my} r="4" />
            </g>
          {/if}
        {:else}
        {#if nightBand}
          <rect class="sw-night" x={x(nightBand[0])} y={m.t} width={x(nightBand[1]) - x(nightBand[0])} height={ph} />
        {/if}

        <g class="sw-grid">
          {#each ticks as h (h)}
            <line x1={Math.round(x(h)) + 0.5} x2={Math.round(x(h)) + 0.5} y1={m.t} y2={m.t + ph} />
            {#if labelled(h)}
              <text x={x(h)} y={m.t + ph + 20} text-anchor="middle">{fmtHour(h)}</text>
            {/if}
          {/each}
          <line class="sw-base" x1={m.l} x2={m.l + pw} y1={m.t + ph + 0.5} y2={m.t + ph + 0.5} />
        </g>

        <g class="sw-rows">
          {#each data as d, i (i)}
            <g class="sw-row" style:transform="translateY({y(i)}px)">
              <line
                x1={x(d.start)} x2={x(d.end)}
                stroke-width={lw}
                style:stroke="color-mix(in oklab, var(--sw-hi) {mixPct(d.duration)}%, var(--sw-lo))"
              />
            </g>
          {/each}
        </g>
        <!-- midpoints in their own layer so later rows never cover them -->
        <g class="sw-mids">
          {#each data as d, i (i)}
            <rect class="sw-row sw-mid" style:transform="translateY({y(i)}px)"
              x={x(d.midpoint) - 1} y={-Math.max(0.5, lw / 2)} width="2" height={Math.max(1, lw)} />
          {/each}
        </g>

        {#if !narrow}
          <g class="sw-quint">
            {#each quintiles as qt (qt.q)}
              <line x1={m.l + pw + 8.5} x2={m.l + pw + 8.5} y1={qt.y0 + 3} y2={qt.y0 + qt.h - 3} />
              {#if qLabels[qt.q]}
                <text class="sw-qlabel" x={m.l + pw + 16} y={qt.y0 + qt.h / 2 - 7}>{qLabels[qt.q]}</text>
              {/if}
              <text class="sw-qval" x={m.l + pw + 16} y={qt.y0 + qt.h / 2 + (qLabels[qt.q] ? 9 : 2)}>
                {qValue(qt.rows)}
              </text>
            {/each}
          </g>
        {/if}

        {#if active != null && data[active]}
          {@const d = data[active]}
          <g class="sw-active" style:transform="translateY({y(active)}px)">
            <line class="sw-halo" x1={x(d.start)} x2={x(d.end)} />
            <line class="sw-hl" x1={x(d.start)} x2={x(d.end)} />
            <circle cx={x(d.midpoint)} r="4" />
          </g>
        {/if}
        {/if}
      </svg>

      {#if hover != null}
        {@const d = data[hover]}
        <div class="sw-tip" bind:this={tipEl} style:left="{tipPos.left}px" style:top="{tipPos.top}px" aria-live="polite">
          <b>Participant #{byMidRank[hover]}</b> <span class="sw-muted">by midpoint</span>
          <div class="sw-tr"><span>Asleep</span><span class="sw-mono">{fmtClock(d.start)}</span></div>
          <div class="sw-tr"><span>Awake</span><span class="sw-mono">{fmtClock(d.end)}</span></div>
          <div class="sw-tr"><span>Midpoint</span><span class="sw-mono">{fmtClock(d.midpoint)}</span></div>
          <div class="sw-tr"><span>Duration</span><span class="sw-mono">{d.duration.toFixed(1)} h</span></div>
        </div>
      {/if}
    {/if}
  </div>

  {#if showStats}
    <div class="sw-stats">
      {#each stats.cards as s (s.t)}
        <div class="sw-stat"><div class="sw-v sw-mono">{s.v}</div><p>{s.t}</p></div>
      {/each}
    </div>
  {/if}

  {#if showTable}
    <details class="sw-table">
      <summary>Table view: sleep timing by chronotype quintile</summary>
      <div class="sw-tablewrap">
        <table>
          <thead><tr><th>Midpoint quintile</th><th>n</th><th>Median asleep</th><th>Median midpoint</th><th>Median awake</th><th>Median duration</th></tr></thead>
          <tbody>
            {#each stats.table as r (r.name)}
              <tr><td>{r.name}</td><td class="sw-mono">{r.n}</td><td class="sw-mono">{fmtClock(r.start)}</td>
                <td class="sw-mono">{fmtClock(r.mid)}</td><td class="sw-mono">{fmtClock(r.end)}</td><td class="sw-mono">{r.dur.toFixed(1)} h</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </details>
  {/if}
</figure>

<style>
  .sw {
    /* ---- theme tokens: override from a parent ---- */
    --sw-surface: #fcfcfb;
    --sw-ink: #0b0b0b;
    --sw-ink2: #52514e;
    --sw-muted: #898781;
    --sw-grid: #e1e0d9;
    --sw-axis: #c3c2b7;
    --sw-ring: rgba(11, 11, 11, 0.1);
    --sw-night: rgba(42, 120, 214, 0.05);
    --sw-lo: #86b6ef;
    --sw-hi: #104281;
    --sw-mid: #0b0b0b;
    --sw-accent: #eb6834;
    --sw-font: 'IBM Plex Sans', system-ui, -apple-system, 'Segoe UI', sans-serif;
    --sw-mono: 'IBM Plex Mono', ui-monospace, SFMono-Regular, Menlo, monospace;
    --sw-duration: 600ms;

    margin: 0;
    display: grid;
    gap: 12px;
    font-family: var(--sw-font);
    color: var(--sw-ink);
  }
  /* theme="dark" forces dark; theme="auto" follows the OS or a data-theme attribute on <html> */
  .sw.dark {
    --sw-surface: #1a1a19; --sw-ink: #fff; --sw-ink2: #c3c2b7; --sw-grid: #2c2c2a; --sw-axis: #383835;
    --sw-ring: rgba(255, 255, 255, 0.1); --sw-night: rgba(57, 135, 229, 0.07);
    --sw-lo: #1c5cab; --sw-hi: #cde2fb; --sw-mid: #fff; --sw-accent: #d95926;
  }
  @media (prefers-color-scheme: dark) {
    :global(:root:not([data-theme='light'])) .sw.auto {
      --sw-surface: #1a1a19; --sw-ink: #fff; --sw-ink2: #c3c2b7; --sw-grid: #2c2c2a; --sw-axis: #383835;
    --sw-ring: rgba(255, 255, 255, 0.1); --sw-night: rgba(57, 135, 229, 0.07);
    --sw-lo: #1c5cab; --sw-hi: #cde2fb; --sw-mid: #fff; --sw-accent: #d95926;
    }
  }
  :global(:root[data-theme='dark']) .sw.auto {
    --sw-surface: #1a1a19; --sw-ink: #fff; --sw-ink2: #c3c2b7; --sw-grid: #2c2c2a; --sw-axis: #383835;
    --sw-ring: rgba(255, 255, 255, 0.1); --sw-night: rgba(57, 135, 229, 0.07);
    --sw-lo: #1c5cab; --sw-hi: #cde2fb; --sw-mid: #fff; --sw-accent: #d95926;
  }

  .sw-mono { font-family: var(--sw-mono); font-variant-numeric: tabular-nums; }
  .sw-muted { color: var(--sw-muted); }

  .sw-bar { display: flex; flex-wrap: wrap; gap: 12px 24px; align-items: center; justify-content: space-between; }
  .sw-seg { display: inline-flex; border: 1px solid var(--sw-axis); border-radius: 7px; overflow: hidden; }
  .sw-seg button {
    font: 500 13px var(--sw-font); background: transparent; color: var(--sw-ink2);
    border: 0; padding: 6px 12px; cursor: pointer;
  }
  .sw-seg button[aria-pressed='true'] { background: var(--sw-ink); color: var(--sw-surface); }
  .sw-seg button:focus-visible { outline: 2px solid var(--sw-accent); outline-offset: -2px; }

  .sw-legend { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; font-size: 12.5px; color: var(--sw-ink2); }
  .sw-ramp { width: 120px; height: 8px; border-radius: 4px; background: linear-gradient(90deg, var(--sw-lo), var(--sw-hi)); }
  .sw-tick { display: inline-block; width: 2px; height: 12px; background: var(--sw-mid); vertical-align: middle; margin-right: 6px; }

  .sw-chart { position: relative; }
  svg { display: block; overflow: visible; touch-action: pan-y; }
  svg:focus-visible { outline: 2px solid var(--sw-accent); outline-offset: 4px; border-radius: 4px; }

  .sw-night { fill: var(--sw-night); }
  .sw-grid line { stroke: var(--sw-grid); stroke-width: 1; }
  .sw-grid .sw-base { stroke: var(--sw-axis); }
  .sw-grid text, .sw-qval { fill: var(--sw-muted); font: 11px var(--sw-mono); }
  .sw-quint line { stroke: var(--sw-axis); }
  .sw-qlabel { fill: var(--sw-ink2); font: 500 11.5px var(--sw-font); }
  .sw-grid text.major { fill: var(--sw-ink2); font-weight: 600; }
  .sw-grid circle { fill: none; }
  .sw-raxis text { fill: var(--sw-ink2); font: 500 11.5px var(--sw-font); }
  .sw-rings path { fill: none; stroke-linecap: butt; }
  .sw-midr { stroke: var(--sw-mid); stroke-width: 2; }
  .sw-active path { fill: none; }

  .sw-row { transition: transform var(--sw-duration) cubic-bezier(0.2, 0.7, 0.2, 1); }
  .sw-row line { stroke-linecap: butt; }
  .sw-mid { fill: var(--sw-mid); }

  .sw-active { pointer-events: none; }
  .sw-halo { stroke: var(--sw-surface); stroke-width: 6; }
  .sw-hl { stroke: var(--sw-accent); stroke-width: 3; }
  .sw-active circle { fill: var(--sw-mid); stroke: var(--sw-surface); stroke-width: 2; }

  .sw-tip {
    position: absolute; pointer-events: none; min-width: 170px;
    background: var(--sw-surface); border: 1px solid var(--sw-ring); border-radius: 8px;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.12); padding: 8px 10px; font-size: 12.5px; line-height: 1.45;
  }
  .sw-tip b { font-weight: 600; }
  .sw-tr { display: flex; justify-content: space-between; gap: 14px; color: var(--sw-ink2); }
  .sw-tr span:last-child { color: var(--sw-ink); }

  .sw-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 12px; }
  .sw-stat { padding: 10px 2px; border-top: 2px solid var(--sw-axis); }
  .sw-v { font-size: 20px; font-weight: 600; }
  .sw-stat p { margin: 2px 0 0; color: var(--sw-ink2); font-size: 13px; }

  .sw-table summary { cursor: pointer; color: var(--sw-ink2); font-size: 13px; }
  .sw-tablewrap { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; margin-top: 8px; }
  th, td { text-align: right; padding: 6px 10px; border-bottom: 1px solid var(--sw-grid); white-space: nowrap; }
  th:first-child, td:first-child { text-align: left; }
  th { font-weight: 500; color: var(--sw-muted); font-size: 12px; }

  @media (prefers-reduced-motion: reduce) { .sw-row { transition: none; } }
</style>
