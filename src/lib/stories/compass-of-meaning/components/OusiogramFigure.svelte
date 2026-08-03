<script>
  /**
   * In-story ousiogram, sized to fill a fullscreen sticky panel and driven by
   * the scroll step (`view`). No buttons — the essay's steps set the camera:
   *   'vad'              valence × dominance   (psychology's survey frame)
   *   'gas'              goodness × aggression (the SVD's own alignment)
   *   'pds'              power × danger        (the nameable compass)
   *   'power-structure'  power × structure
   *   'danger-structure' danger × structure
   *   'ousiogram'        pds camera, dots crossfaded into the paper's
   *                      binned histogram (1/30-wide cells)
   *   'odyssey-*'        pds camera zoomed into the trajectory of Butler's
   *                      Odyssey; each beat extends the wake to a chapter of
   *                      the voyage (dive / telemachy / wanderings /
   *                      slaughter / home), with a book-axis strip as the
   *                      readable log and data-driven episode landmarks
   *
   * Transitions are rigid camera flights (frameLerp). A direct vad<->pds
   * flight swings through the thin structure dimension and the cloud
   * "squishes" edge-on; ROUTES sends it via GAS so each leg stays maximally
   * spread — the paper's Fig. 2 rows as one continuous move, no cuts.
   */
  import { untrack } from 'svelte';
  import { fade } from 'svelte/transition';
  import Ousiograms, { AXES, PAIRS, primaryPlane, frameLerp } from './Ousiograms.svelte';
  import TraceStrip from './TraceStrip.svelte';
  import pdsRows from '../data/ousiometry_pds.csv';
  import trace from '../data/odyssey_trace.csv';
  import chapters from '../data/odyssey_chapters.csv';
  import stream from '../data/odyssey_stream.csv';
  import wordCounts from '../data/gallery_word_counts.csv';

  let {
    view = 'vad',
    width = 0,
    height = 0,
    ellipse = true,
    book = null,
    logLayout = 'card', // 'card' = floating log-book | 'side' = strip column left of the plot
    xDim = 'power', // plot axes (honored in 'side' layout; the explorer owns
    yDim = 'danger' //   the selector UI)
  } = $props();

  // csv -> columnar (words[] + Float32Array stride 3 [power, danger, structure])
  const words = pdsRows.map((r) => r.word);
  const values = (() => {
    const a = new Float32Array(pdsRows.length * 3);
    for (let i = 0; i < pdsRows.length; i++) {
      a[3 * i] = pdsRows[i].power;
      a[3 * i + 1] = pdsRows[i].danger;
      a[3 * i + 2] = pdsRows[i].structure;
    }
    return a;
  })();

  // Named camera frames. Stable references: settling assigns the frame
  // object itself, so pairFor() label lookup and the annotation debounce in
  // Ousiograms both hit their reference-equality fast paths.
  // Usage counts across the six gallery books (word_counts.py) -> the token
  // weights for the safety-bias beat: the type ousiogram counts each word
  // once, the token ousiogram counts it as often as real books use it.
  const tokenWeights = (() => {
    const m = new Map(wordCounts.map((r) => [r.word, r.count]));
    const a = new Float32Array(words.length);
    for (let i = 0; i < words.length; i++) a[i] = m.get(words[i]) ?? 0;
    return a;
  })();

  const PDS = primaryPlane(0);
  const VIEWS = {
    vad: { xVec: AXES.valence, yVec: AXES.dominance },
    gas: primaryPlane(Math.PI / 4),
    pds: PDS,
    ousiogram: PDS, // same camera; the step swaps dots for bins
    'ousiogram-tokens': PDS, // same again; the step swaps type counts for usage
    'power-structure': { xVec: AXES.power, yVec: AXES.structure },
    'danger-structure': { xVec: AXES.danger, yVec: AXES.structure }
  };

  // Waypoints for flights that would otherwise pass edge-on through the
  // thin third dimension. (vad <-> odyssey-* is handled generically below.)
  const ROUTES = {
    'vad->pds': ['gas'],
    'pds->vad': ['gas'],
    'vad->ousiogram': ['gas'],
    'ousiogram->vad': ['gas'],
    'vad->ousiogram-tokens': ['gas'],
    'ousiogram-tokens->vad': ['gas']
  };

  // The voyage machinery is book-agnostic: the `book` prop swaps in any
  // { label, trace, chapters, stream } (explore mode); null = the Odyssey,
  // with its curated episode landmarks.
  // Rows augmented with the in-plane diagonals (paper Eq. 3): goodness and
  // aggression are exact rotations of (power, danger) — derived, not stored.
  let bTrace = $derived.by(() => {
    const rows = book?.trace ?? trace;
    const s = Math.SQRT1_2;
    return rows.map((r) => ({
      ...r,
      goodness: s * (r.power - r.danger),
      aggression: s * (r.power + r.danger)
    }));
  });
  let bChapters = $derived(book?.chapters ?? chapters);
  let bStream = $derived(book === null ? stream : (book.stream ?? null));

  // Full-explorer axes: in 'side' log layout the plot's two dimensions come
  // from the xDim/yDim props; story instances stay on power × danger.
  const DIMS = ['goodness', 'power', 'aggression', 'danger', 'structure'];
  const HOOK_WORDS = ['storm', 'wolf', 'surgery', 'conquer']; // called out on the VAD hook
  let xd = $derived(logLayout === 'side' ? xDim : 'power');
  let yd = $derived(logLayout === 'side' ? yDim : 'danger');

  // The book's wake in the CHOSEN plane, and the square zoom window around
  // it. A whole book averages toward the middle of the map, so the voyage
  // lives in a tiny cove near the origin — the camera has to dive to see it.
  let tracePath = $derived(bTrace.map((r) => [r[xd], r[yd]]));
  let ZOOM = $derived.by(() => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const [x, y] of tracePath) {
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    const half = (Math.max(x1 - x0, y1 - y0) / 2) * 1.7;
    return { x: [cx - half, cx + half], y: [cy - half, cy + half] };
  });

  // Each voyage beat extends the wake to a chapter of the story.
  const ODYSSEY_REVEAL = {
    'odyssey-dive': 0.04,
    'odyssey-telemachy': 0.28,
    'odyssey-wanderings': 0.55,
    'odyssey-slaughter': 0.93,
    'odyssey-home': 1
  };
  for (const k of Object.keys(ODYSSEY_REVEAL)) VIEWS[k] = PDS; // shared camera

  // Landmarks are DATA: book boundaries from <book>_chapters.csv (emitted by
  // book_trace.py), converted to fractions of the trace. Ticks compute frac
  // per row (labels repeat across parts in some books); the Odyssey's famous
  // episodes are the one curated list.
  let BOOK_TICKS = $derived.by(() => {
    const T0 = bTrace[0].T;
    const T1 = bTrace[bTrace.length - 1].T;
    return bChapters.map((c) => ({
      label: c.label,
      frac: Math.min(1, Math.max(0, (c.T - T0) / (T1 - T0)))
    }));
  });

  const ODYSSEY_EPISODES = [
    { book: 'I', name: 'Telemachus at home' },
    { book: 'IX', name: 'Polyphemus' },
    { book: 'XII', name: 'Scylla & Charybdis' },
    { book: 'XIII', name: 'return to Ithaca' },
    { book: 'XXI', name: 'the bow' },
    { book: 'XXII', name: 'the slaughter' }
  ];

  let EPISODES = $derived.by(() => {
    if (book) return [];
    const frac = {};
    for (const t of BOOK_TICKS) frac[t.label] ??= t.frac;
    return ODYSSEY_EPISODES.filter((e) => frac[e.book] != null).map((e) => ({
      ...e,
      frac: frac[e.book]
    }));
  });

  // On-plot landmarks: a subset — the strip carries the full set.
  let PLOT_MARKS = $derived.by(() => {
    if (book) return [];
    return [
      { at: 0.002, label: 'Book I', side: 'below' },
      ...EPISODES.filter((e) => ['IX', 'XIII', 'XXII'].includes(e.book)).map((e) => ({
        at: e.frac,
        label: e.name,
        side: e.book === 'XIII' ? 'below' : undefined
      })),
      { at: 0.999, label: 'home', side: 'below' }
    ];
  });

  // The cloud's three singular values — σₖ = ‖A·uₖ‖ along the principal
  // axes (goodness and aggression ARE the in-plane SVD axes; structure is
  // the third). Drawn as a tiny unlabeled bar chart at the flattening beat:
  // the one explicit trace of the SVD the essay allows on screen.
  const sigmas = (() => {
    const G = AXES.goodness, A = AXES.aggression;
    let g = 0, a = 0, s = 0;
    for (let i = 0; i < values.length; i += 3) {
      const p = values[i], d = values[i + 1], st = values[i + 2];
      const pg = G[0] * p + G[1] * d;
      const pa = A[0] * p + A[1] * d;
      g += pg * pg;
      a += pa * pa;
      s += st * st;
    }
    return [Math.sqrt(g), Math.sqrt(a), Math.sqrt(s)];
  })();

  // The bars are a "you are here" legend from the moment σ's exist in the
  // story: red marks the components currently on screen — the plane views
  // span σ1+σ2; the tilted views stand σ3 upright.
  const SIGMA_VIEWS = {
    gas: [0, 1],
    pds: [0, 1],
    'power-structure': [2],
    'danger-structure': [2]
  };
  let sigmaHi = $derived(SIGMA_VIEWS[view] ?? null);
  let showSigmas = $derived(sigmaHi != null);

  // Distance from the canvas's right edge to the HOME SQUARE's right edge:
  // on a wide canvas the [-1,1] square is centered, so corner overlays must
  // add half the surplus width to land inside the square, not in the sea.
  // (Component margins: left 52 + right 56 = 108 horizontal, 100 vertical.)
  let squareRight = $derived(56 + Math.max(0, (plotWpx - 108 - (size - 100)) / 2));

  // ---- transition operators (the 3blue1brown beat) ---------------------------
  // Each camera flight flashes the matrix DOING it: fade in as the tween
  // starts, fade out after it lands. Rotations carry real computed entries;
  // binning transitions show nothing — counting is not a linear map.
  const tpose = (m) => m[0].map((_, j) => m.map((row) => row[j]));
  const SQ = Math.SQRT1_2;
  // Ground-truth transforms as PUBLISHED (2 dp). Uᵀ maps VAD → GAS; R(π/4)
  // maps GAS → PDS (paper Eq. 3); R(π/4)·Uᵀ maps VAD → PDS. Every reverse is
  // the transpose. (Hardcoded from the paper so the cards match it exactly —
  // recomputing from the 2-dp VAD reconstruction drifts by a few hundredths.)
  const UT = [
    [0.86, -0.15, 0.48],
    [-0.16, 0.83, 0.54],
    [0.48, 0.55, -0.69]
  ];
  const R45 = [[SQ, SQ, 0], [-SQ, SQ, 0], [0, 0, 1]];
  const FULL = [
    [0.53, 0.45, 0.72],
    [-0.7, 0.71, 0.07],
    [0.48, 0.55, -0.69]
  ];

  // Basis labels: a matrix maps its COLUMN space (input) to its ROW space
  // (output). Naming both makes the transpose legible even when U happens to
  // be near-symmetric — reversing a map swaps which axes label rows vs cols.
  const VAD_L = ['Va', 'Ar', 'Dm'];
  const GAS_L = ['Gd', 'Ag', 'St'];
  const PDS_L = ['Pw', 'Dg', 'St'];

  const OPS = {
    'vad->gas': { title: '𝐔ᵀ — into the data’s axes', m: UT, rows: GAS_L, cols: VAD_L, gloss: 'columns are the input axes, rows the output' },
    'gas->vad': { title: '𝐔 — back to the survey’s axes', m: tpose(UT), rows: VAD_L, cols: GAS_L, gloss: 'transpose it, and input/output axes swap' },
    'gas->pds': { title: 'R(π/4) — rename the plane', m: R45, rows: PDS_L, cols: GAS_L, gloss: 'a quarter-turn inside the plane' },
    'pds->gas': { title: 'R(−π/4) — back', m: tpose(R45), rows: GAS_L, cols: PDS_L, gloss: 'the transpose R(−π/4) spins the other way' },
    'vad->pds': { title: 'R(π/4)·𝐔ᵀ — VAD → PDS', m: FULL, rows: PDS_L, cols: VAD_L, gloss: 'two rotations are one rotation' },
    'pds->vad': { title: '𝐔·R(−π/4) — the turn undone', m: tpose(FULL), rows: VAD_L, cols: PDS_L, gloss: 'the transpose of the product — reversed and un-turned' },
    'pds->power-structure': { title: '𝐏 — pick two axes', m: [[1, 0, 0], [0, 0, 1]], rows: ['Pw', 'St'], cols: PDS_L, gloss: 'a projection: keep power and structure, drop danger' },
    'power-structure->danger-structure': { title: '𝐏 — swap the kept axis', m: [[0, 1, 0], [0, 0, 1]], rows: ['Dg', 'St'], cols: PDS_L, gloss: 'keep danger and structure instead' },
    'danger-structure->power-structure': { title: '𝐏 — swap back', m: [[1, 0, 0], [0, 0, 1]], rows: ['Pw', 'St'], cols: PDS_L, gloss: 'keep power and structure' },
    'danger-structure->ousiogram': { title: '𝐏 — back to the plane', m: [[1, 0, 0], [0, 1, 0]], rows: ['Pw', 'Dg'], cols: PDS_L, gloss: 'structure set aside again: keep power and danger' },
    'power-structure->pds': { title: '𝐏 — back to the plane', m: [[1, 0, 0], [0, 1, 0]], rows: ['Pw', 'Dg'], cols: PDS_L, gloss: 'structure set aside again: keep power and danger' },
    'ousiogram->danger-structure': { title: '𝐏 — pick two axes', m: [[0, 1, 0], [0, 0, 1]], rows: ['Dg', 'St'], cols: PDS_L, gloss: 'keep danger and structure, drop power' }
  };

  let op = $state(null);
  let opId = 0;
  let opTimer;

  function flashOp(spec) {
    clearTimeout(opTimer);
    if (!spec) {
      op = null;
      return;
    }
    op = { ...spec, id: ++opId };
    opTimer = setTimeout(() => (op = null), 2800);
  }

  $effect(() => () => clearTimeout(opTimer));

  // Boot the camera at the mounting view — a second instance (the voyage
  // section) opens directly on its frame instead of flying from VAD.
  // svelte-ignore state_referenced_locally -- initial snapshot is intentional
  let frame = $state.raw(VIEWS[view] ?? VIEWS.vad);
  // svelte-ignore state_referenced_locally -- initial snapshot is intentional
  let lastView = view;

  // The plot's size is NON-NEGOTIABLE: always min(panel, PLOT_MAX). The
  // log-book is a compact card in the bottom-LEFT corner — empty plane on
  // the wide canvas — so it never blocks the cove or shrinks the plot.
  const PLOT_MAX = 780;

  let stripVisible = $derived(revealP > 0.02 && zoomP > 0.5);
  let size = $derived(Math.max(240, Math.min(width || 640, height || 640, PLOT_MAX)));

  // The plot fills the panel's width (equal units — the component widens its
  // x window, it never stretches). Capped so ultrawide panels stay sane.
  const SIDE_W = 356; // strip-column width in 'side' log layout

  // Gallery grammar for the strip stack: header rows with a mean per
  // dimension, and one shared book axis. Each strip auto-scales its own y
  // (the plot itself is where cross-dimension comparison lives).
  let dimMeans = $derived.by(() => {
    const m = {};
    for (const d of DIMS) m[d] = 0;
    for (const r of bTrace) for (const d of DIMS) m[d] += r[d];
    for (const d of DIMS) m[d] /= bTrace.length || 1;
    return m;
  });
  const fmtMean = (v) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(3);

  // The paper's x scale: narrative reading time T in 1-grams, ticked in
  // 10^5 units at true positions (T is absolute; the normalized x of the
  // strips maps to it linearly within one book).
  let tTicks = $derived.by(() => {
    const T0 = bTrace[0].T;
    const T1 = bTrace[bTrace.length - 1].T;
    const span5 = T1 / 1e5;
    const step = span5 <= 1.4 ? 0.25 : span5 <= 2.8 ? 0.5 : 1;
    const out = [];
    for (let v = 0; v * 1e5 <= T1 + 1; v = Math.round((v + step) * 100) / 100) {
      const frac = (v * 1e5 - T0) / (T1 - T0);
      if (frac >= 0 && frac <= 1) out.push({ frac, label: String(v) });
    }
    return out;
  });
  let sideLog = $derived(logLayout === 'side');
  // The sidebar is ALWAYS part of the side layout (empty stand-ins before a
  // book is picked), so the plot width never jumps on selection.
  let plotWpx = $derived(
    Math.max(size, Math.min((width || size) - (sideLog ? SIDE_W : 0), Math.round(size * 1.75)))
  );

  let raf = 0; // one in-flight rAF loop; cancelled before each new flight

  function flyTo(legs) {
    cancelAnimationFrame(raf);
    const queue = legs.filter(Boolean);
    if (!queue.length) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frame = queue[queue.length - 1];
      return;
    }
    const next = () => {
      const target = queue.shift();
      if (!target) return;
      if (frame === target) {
        next();
        return;
      }
      const from = frame;
      const dur = 900;
      const t0 = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      (function step(now) {
        // Clamp below as well: rAF timestamps can precede the t0 captured
        // mid-frame, and a negative t with ease-out pushes the frame AWAY
        // from the target — compounding into a runaway spin.
        const t = Math.min(Math.max((now - t0) / dur, 0), 1);
        if (t < 1) {
          frame = frameLerp(from, target, ease(t));
          raf = requestAnimationFrame(step);
        } else {
          frame = target; // exact reference — see VIEWS note
          next();
        }
      })(t0);
    };
    next();
  }

  // Dots <-> paper-style histogram crossfade, tweened on the ousiogram step.
  // Boots already-binned when mounted on an ousiogram view (the voyage
  // section opens on the figure the map act ended with).
  // svelte-ignore state_referenced_locally -- initial snapshot is intentional
  let binMix = $state(view === 'ousiogram' || view === 'ousiogram-tokens' ? 1 : 0);
  let binRaf = 0;

  function fadeBins(target) {
    cancelAnimationFrame(binRaf);
    if (binMix === target) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      binMix = target;
      return;
    }
    const from = binMix;
    const dur = 900;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    (function step(now) {
      const t = Math.min(Math.max((now - t0) / dur, 0), 1);
      binMix = from + (target - from) * ease(t);
      if (t < 1) binRaf = requestAnimationFrame(step);
    })(t0);
  }

  // Odyssey beats: the camera dives once (zoomP), and each scroll step
  // extends the wake to its chapter (revealP). Two independent tweens so
  // step-to-step chaining stays smooth in both directions.
  let zoomP = $state(0);
  let revealP = $state(0);
  let zoomRaf = 0;
  let revealRaf = 0;

  // The zoom target is itself tweened: when the book (and so its cove)
  // changes under a zoomed camera, the window PANS across the plane to the
  // new cove instead of jump-cutting. Constant-book instances never tween.
  let zoomBox = $state.raw(null);
  let boxRaf = 0;

  $effect(() => {
    const target = ZOOM; // tracked — recomputes when the book changes
    untrack(() => {
      if (!zoomBox || matchMedia('(prefers-reduced-motion: reduce)').matches) {
        zoomBox = target;
        return;
      }
      const from = zoomBox;
      if (from.x[0] === target.x[0] && from.y[0] === target.y[0]) return;
      cancelAnimationFrame(boxRaf);
      const dur = 1400;
      const t0 = performance.now();
      const ease = (t) => 1 - Math.pow(1 - t, 3);
      (function step(now) {
        const t = Math.min(Math.max((now - t0) / dur, 0), 1);
        const e = ease(t);
        const mix = (a, b) => a + (b - a) * e;
        zoomBox = {
          x: [mix(from.x[0], target.x[0]), mix(from.x[1], target.x[1])],
          y: [mix(from.y[0], target.y[0]), mix(from.y[1], target.y[1])]
        };
        if (t < 1) boxRaf = requestAnimationFrame(step);
      })(t0);
    });
  });

  let box = $derived(zoomBox ?? ZOOM);
  let zx = $derived(zoomP > 0 ? [-1 + (box.x[0] + 1) * zoomP, 1 + (box.x[1] - 1) * zoomP] : null);
  let zy = $derived(zoomP > 0 ? [-1 + (box.y[0] + 1) * zoomP, 1 + (box.y[1] - 1) * zoomP] : null);

  function fadeZoom(target) {
    cancelAnimationFrame(zoomRaf);
    if (zoomP === target) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      zoomP = target;
      return;
    }
    const from = zoomP;
    const dur = target > from ? 1900 : 800; // slow dive in, quick climb out
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    (function step(now) {
      const t = Math.min(Math.max((now - t0) / dur, 0), 1);
      zoomP = from + (target - from) * ease(t);
      if (t < 1) zoomRaf = requestAnimationFrame(step);
    })(t0);
  }

  function fadeReveal(target) {
    cancelAnimationFrame(revealRaf);
    stopPlayer(); // a scroll step always takes back the helm
    if (revealP === target) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      revealP = target;
      return;
    }
    const from = revealP;
    // Forward pace is the READING pace: slow enough that the flotsam words
    // surfacing at the head can actually be read. Reverse is just rewind.
    const dur = target > from ? 1400 + 14000 * (target - from) : 900;
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    (function step(now) {
      const t = Math.min(Math.max((now - t0) / dur, 0), 1);
      revealP = from + (target - from) * ease(t);
      if (t < 1) revealRaf = requestAnimationFrame(step);
    })(t0);
  }

  // ---- playback: read the voyage at your own pace -----------------------------
  // A music-player widget over the same revealP the scroll steps drive. 1x is
  // READING pace: the whole epic in ~10 min, so words surface at ~2/s — the
  // rate of subtitles, not of a sweep. 4x is the old cinematic default. The
  // strip is the scrubber, and any scroll-step change pauses the player and
  // takes over.
  const PLAY_RATE = 1 / 600; // reveal per second at 1x (reading pace)
  let playing = $state(false);
  let speed = $state(1);
  let playRaf = 0;

  function stopPlayer() {
    cancelAnimationFrame(playRaf);
    playing = false;
  }

  function play() {
    cancelAnimationFrame(revealRaf); // take the helm from any step tween
    cancelAnimationFrame(playRaf);
    if (revealP >= 0.999) revealP = 0.02; // at the end: restart the voyage
    playing = true;
    let last = performance.now();
    (function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      revealP = Math.min(1, revealP + dt * PLAY_RATE * speed);
      if (revealP >= 1) {
        playing = false;
        return;
      }
      playRaf = requestAnimationFrame(tick);
    })(last);
  }

  function seekTo(frac) {
    cancelAnimationFrame(revealRaf);
    stopPlayer();
    revealP = Math.max(0.02, Math.min(1, frac));
  }

  // ---- read-along flotsam ----------------------------------------------------
  // As the wake advances, surface the most extreme lensed words at the head's
  // narrative position (odyssey_stream.csv, emitted by read_stream.py) — the
  // Odyssey, accelerated. One word every ~140ms; fast sweeps sample the text.
  let streamRows = $derived.by(() => {
    if (!bStream) return null; // no read-along words for this book
    const by = new Array(bTrace.length).fill(null);
    for (const r of bStream) (by[r.i] ??= []).push(r);
    return by;
  });

  let flotsam = $state([]);
  let flotCursor = 0; // first stream row not yet considered
  let flotLastSpawn = 0;
  let flotId = 0;

  $effect(() => {
    const r = revealP; // the only tracked dependency: runs per tween frame
    untrack(() => {
      if (zoomP < 0.5 || r <= 0) {
        if (flotsam.length) flotsam = [];
        flotCursor = 0;
        return;
      }
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      if (!streamRows) return;
      const headIdx = Math.round(r * (bTrace.length - 1));
      if (headIdx + 1 < flotCursor) {
        flotCursor = headIdx + 1; // rewound: resync, don't spawn
        return;
      }
      const now = performance.now();
      if (now - flotLastSpawn < 140) return;
      // newest slice at or before the head that has words
      let row = null;
      for (let i = headIdx; i >= flotCursor; i--) {
        if (streamRows[i]) {
          row = { i, words: streamRows[i] };
          break;
        }
      }
      flotCursor = headIdx + 1;
      if (!row) return;
      const w = row.words[0]; // most extreme word of the slice
      const score = Math.hypot(w.power, w.danger);
      const [tx, ty] = tracePath[row.i];
      flotLastSpawn = now;
      // Disperse around the head at the golden angle: consecutive words fan
      // out in maximally separated directions (radius scaled to the cove)
      // instead of stacking unreadably on the slow-moving head.
      const half = (ZOOM.x[1] - ZOOM.x[0]) / 2;
      const ang = flotId * 2.39996;
      const rad = half * (0.16 + Math.random() * 0.16);
      flotsam = [
        ...flotsam.filter((f) => now - f.born < 2100),
        {
          id: flotId++,
          word: w.word,
          x: tx + Math.cos(ang) * rad,
          y: ty + Math.sin(ang) * rad * 0.8,
          size: 10 + 5 * Math.min(1, score / 0.7),
          born: now
        }
      ];
    });
  });

  // Scroll step drives the camera. untrack() so the effect depends only on
  // `view` — flyTo reads `frame`, and tracking it would re-trigger this
  // effect on every animation frame, restarting the flight ~60x/s.
  $effect(() => {
    const v = view;
    untrack(() => {
      const prev = lastView;
      const isOdys = v in ODYSSEY_REVEAL;
      let route = ROUTES[`${prev}->${v}`] ?? [];
      if (!route.length && ((prev === 'vad' && isOdys) || (prev in ODYSSEY_REVEAL && v === 'vad'))) {
        route = ['gas'];
      }
      lastView = v;
      flyTo([...route.map((k) => VIEWS[k]), VIEWS[v]]);
      fadeBins(v === 'ousiogram' || v === 'ousiogram-tokens' ? 1 : 0);
      fadeZoom(isOdys ? 1 : 0);
      fadeReveal(ODYSSEY_REVEAL[v] ?? 0);
      if (v !== prev) flashOp(OPS[`${prev}->${v}`]);
    });
  });

  // Changing the plot's axes (explore mode): the camera ROTATES to the new
  // frame (flyTo) while the zoom window pans to the wake's cove in that
  // plane (the zoomBox tween reacts to the new tracePath). The wake itself
  // just reprojects — same voyage, new shadow. Flotsam is cleared: its
  // coordinates lived in the old plane.
  let lastDimsKey = 'power|danger';

  $effect(() => {
    const key = `${xd}|${yd}`; // tracked
    untrack(() => {
      if (key === lastDimsKey) return;
      lastDimsKey = key;
      flotsam = [];
      flotCursor = Number.MAX_SAFE_INTEGER;
      flyTo([{ xVec: AXES[xd], yVec: AXES[yd] }]);
    });
  });

  // Swapping books mid-voyage (explore mode): the camera pans (zoomBox tween
  // above), the wake rewinds to the teaser, the player stops, and the
  // read-along words go quiet until the reader sails again.
  // svelte-ignore state_referenced_locally -- initial snapshot is intentional; the effect below tracks changes
  let lastBookLabel = book?.label ?? null;

  $effect(() => {
    const lbl = book?.label ?? null; // tracked
    untrack(() => {
      if (lbl === lastBookLabel) return;
      lastBookLabel = lbl;
      stopPlayer();
      flotsam = [];
      flotCursor = Number.MAX_SAFE_INTEGER; // resyncs on next forward motion
      fadeReveal(ODYSSEY_REVEAL[view] ?? 0);
    });
  });

  // Stop the loops when the component unmounts (or HMR replaces it) — a stale
  // rAF loop would keep writing state forever.
  $effect(() => () => {
    cancelAnimationFrame(raf);
    cancelAnimationFrame(binRaf);
    cancelAnimationFrame(zoomRaf);
    cancelAnimationFrame(revealRaf);
    cancelAnimationFrame(playRaf);
    cancelAnimationFrame(boxRaf);
  });
</script>

{#snippet playerRow()}
  <div class="player" role="group" aria-label="Reading playback">
    <button
      class="pp"
      type="button"
      disabled={sideLog && !book}
      onclick={() => (playing ? stopPlayer() : play())}
      aria-label={playing ? 'Pause' : 'Play'}
    >{playing ? '❚❚' : '▶'}</button>
    {#each [0.5, 1, 2, 4] as s (s)}
      <button
        class="spd"
        type="button"
        disabled={sideLog && !book}
        class:active={speed === s}
        onclick={() => (speed = s)}
        aria-pressed={speed === s}
      >{s}×</button>
    {/each}
    <span class="player-hint">{sideLog && !book ? 'pick a book to sail' : '1× = reading pace'}</span>
  </div>
{/snippet}

<div class="fill">
  {#if sideLog}
    <!-- explore layout: the log is a column of strips, one per dimension,
         drawing in step with the wake; before a book is picked they are
         empty stand-ins so selection never reflows the layout -->
    <aside class="log-side">
      {@render playerRow()}
      {#each DIMS as d (d)}
        <div class="slot" class:on={d === xDim || d === yDim}>
          <div class="shead">
            <span class="sname">{d}</span>
            <span class="spair">{PAIRS[d][0]} ↔ {PAIRS[d][1]}</span>
            <span class="smean">{book ? `mean ${fmtMean(dimMeans[d])}` : ''}</span>
          </div>
          <TraceStrip
            trace={book ? bTrace : []}
            reveal={revealP}
            marks={[]}
            books={[]}
            width={SIDE_W - 22}
            height={112}
            dim={d}
            title=""
            coverage={d === 'structure'}
            yTicks
            onseek={book ? seekTo : null}
          />
        </div>
      {/each}
      <!-- one shared axis for the whole stack: the paper's narrative-time scale -->
      <svg class="xaxis" width={SIDE_W - 22} height={34} viewBox="0 0 {SIDE_W - 22} 34" aria-hidden="true">
        {#if book}
          {#each tTicks as t (t.label)}
            <line class="ax-tick" x1={40 + t.frac * (SIDE_W - 72)} x2={40 + t.frac * (SIDE_W - 72)} y1={2} y2={8} />
            <text class="ax-num" x={40 + t.frac * (SIDE_W - 72)} y={19} text-anchor="middle">{t.label}</text>
          {/each}
        {/if}
        <text class="ax-label" x={40} y={32}>narrative reading time T (×10⁵)</text>
      </svg>
    </aside>
  {/if}

  <div class="stage">
    <Ousiograms
      {words}
      {values}
      xVec={frame.xVec}
      yVec={frame.yVec}
      width={plotWpx}
      height={size}
      compass
      sigmaAxes={ellipse && (view === 'vad' || view === 'gas')}
      highlight={view === 'vad' ? HOOK_WORDS : []}
      bins={binMix > 0 || view === 'ousiogram' || view === 'ousiogram-tokens' ? 60 : 0}
      {binMix}
      weights={view === 'ousiogram-tokens' ? tokenWeights : null}
      binPower={view === 'ousiogram-tokens' ? 0.5 : 1}
      xDomain={zx}
      yDomain={zy}
      path={revealP > 0 ? tracePath : null}
      pathReveal={revealP}
      pathMarks={PLOT_MARKS}
      {flotsam}
      annotate={zoomP < 0.001 || zoomP > 0.999}
      boundaryLabels={zoomP > 0.5 ? 0 : 26}
      showMarginals={zoomP < 0.001}
      showEllipse={ellipse && zoomP < 0.001}
    />

    <!-- the story's log-book: a compact floating card, danger only -->
    {#if !sideLog && stripVisible}
      <div class="strip" transition:fade={{ duration: 250 }}>
        {@render playerRow()}
        <TraceStrip
          trace={bTrace}
          reveal={revealP}
          marks={EPISODES}
          books={BOOK_TICKS}
          width={Math.min(340, plotWpx - 40)}
          height={164}
          onseek={seekTo}
        />
      </div>
    {/if}

    <!-- 3b1b beat: the operator flashes up while it acts, then dissolves. -->
    {#key op?.id}
      {#if op}
        <div class="op-card" transition:fade={{ duration: 350 }}>
          <div class="op-title">{op.title}</div>
          <!-- column labels = input axes (top); row labels = output axes
               (left); the matrix maps cols -> rows. -->
          <div class="op-grid">
            <span class="op-corner"></span>
            <div class="op-collabs" style="grid-template-columns: repeat({op.cols.length}, 1fr)">
              {#each op.cols as c, i (i)}<span class="axlab">{c}</span>{/each}
            </div>
            <div class="op-rowlabs" style="grid-template-rows: repeat({op.rows.length}, 1fr)">
              {#each op.rows as r, i (i)}<span class="axlab">{r}</span>{/each}
            </div>
            <div class="mat" style="grid-template-columns: repeat({op.m[0].length}, 1fr)">
              {#each op.m as row, ri (ri)}
                {#each row as x, ci (ci)}
                  <span class:diag={ri === ci}>{(x >= 0 ? '' : '−') + Math.abs(x).toFixed(2)}</span>
                {/each}
              {/each}
            </div>
          </div>
          <div class="op-gloss">{op.gloss}</div>
        </div>
      {/if}
    {/key}

    <!-- σ₁ σ₂ σ₃ as bare bars — justifies "the third dimension is small"
         with the actual quantities, no numbers, no jargon. -->
    {#if showSigmas}
      <div
        class="sigmas"
        style="right: {squareRight + 12}px"
        transition:fade={{ duration: 250 }}
        title="the cloud's three widths — red marks the axes on screen"
        aria-hidden="true"
      >
        {#each sigmas as s, i (i)}
          <div class="sig-col">
            <div class="bar" class:hi={sigmaHi?.includes(i)} style="height: {(s / sigmas[0]) * 48}px"></div>
            <span class="sig-name">{['σ₁', 'σ₂', 'σ₃'][i]}</span>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .fill {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    /* hug the steps column on the left; the panel's spare width stays right */
    justify-content: flex-start;
  }

  .stage {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
  }

  .sigmas {
    position: absolute;
    /* bottom-right corner INSIDE the home square (right offset computed
       inline from the canvas/square geometry) */
    bottom: 56px;
    display: flex;
    align-items: flex-end;
    gap: 3px;
    pointer-events: none;
  }

  .sig-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    gap: 2px;
  }

  .sigmas .bar {
    width: 6px;
    background: color-mix(in srgb, var(--ousio-ink, #1a2340) 35%, transparent);
    border-radius: 1px;
    transition: background 300ms ease;
  }

  .sigmas .bar.hi {
    background: var(--ousio-accent, #b3452c);
  }

  .sig-name {
    font-family: var(--ousio-font, ui-serif, Georgia, serif);
    font-size: 8.5px;
    font-style: italic;
    color: color-mix(in srgb, var(--ousio-ink, #1a2340) 60%, transparent);
  }

  .op-card {
    /* bare math, no card chrome — just the operator floating on the paper */
    position: absolute;
    top: 16px;
    right: 20px;
    text-align: center;
    font-family: var(--ousio-font, ui-serif, Georgia, serif);
    color: var(--ousio-ink, #1a2340);
    pointer-events: none;
  }

  .op-title {
    font-size: 0.78rem;
    font-variant: small-caps;
    letter-spacing: 0.04em;
    margin-bottom: 5px;
  }

  /* corner · column labels (input axes) on top;
     row labels (output axes) on the left · matrix bottom-right */
  .op-grid {
    display: inline-grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto auto;
    align-items: center;
  }

  .op-corner {
    grid-column: 1;
    grid-row: 1;
  }

  .op-collabs {
    grid-column: 2;
    grid-row: 1;
    display: grid;
    width: 100%;
    box-sizing: border-box;
    padding: 0 10px;
    border-inline: 1.5px solid transparent;
    column-gap: 12px;
    margin-bottom: 1px;
  }

  .op-rowlabs {
    grid-column: 1;
    grid-row: 2;
    display: grid;
    height: 100%;
    box-sizing: border-box;
    padding: 4px 0;
    row-gap: 2px;
    align-items: center;
    margin-right: 3px;
  }

  .axlab {
    text-align: center;
    font-family: var(--ousio-font, ui-serif, Georgia, serif);
    font-size: 0.6rem;
    font-style: italic;
    letter-spacing: 0.02em;
    color: color-mix(in srgb, var(--ousio-ink, #1a2340) 55%, transparent);
  }

  .op-rowlabs .axlab {
    text-align: right;
  }

  .mat {
    grid-column: 2;
    grid-row: 2;
    display: inline-grid;
    gap: 2px 12px;
    padding: 4px 10px;
    /* bracket look: thin verticals with short caps */
    border-left: 1.5px solid var(--ousio-ink, #1a2340);
    border-right: 1.5px solid var(--ousio-ink, #1a2340);
    border-image: none;
    position: relative;
    font-size: 0.82rem;
    font-variant-numeric: tabular-nums;
  }

  /* diagonal entries are invariant under transpose — the off-diagonal is
     what swaps; a faint accent helps the reader see the flip. */
  .mat .diag {
    color: color-mix(in srgb, var(--ousio-accent, #b3452c) 85%, var(--ousio-ink, #1a2340));
  }

  .mat::before,
  .mat::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 1.5px;
    background:
      linear-gradient(to right, var(--ousio-ink, #1a2340) 6px, transparent 6px) left/50% 100% no-repeat,
      linear-gradient(to left, var(--ousio-ink, #1a2340) 6px, transparent 6px) right/50% 100% no-repeat;
  }

  .mat::before { top: 0; }
  .mat::after { bottom: 0; }

  .op-gloss {
    margin-top: 5px;
    font-size: 0.68rem;
    font-style: italic;
    color: color-mix(in srgb, var(--ousio-ink, #1a2340) 65%, transparent);
  }

  .log-side {
    flex-shrink: 0;
    align-self: center;
    display: flex;
    flex-direction: column;
    gap: 7px;
    padding: 8px;
    margin-right: 8px;
    background: color-mix(in srgb, var(--ousio-paper, #faf8f2) 96%, transparent);
    border: 1px solid color-mix(in srgb, var(--ousio-ink, #1a2340) 15%, transparent);
    border-radius: 4px;
  }

  /* gallery grammar: hairline-separated panels; the on-plot pair is marked
     by a CONTOUR (outline), not a fill */
  .slot {
    border: 1px solid transparent;
    border-top: 1px solid color-mix(in srgb, var(--ousio-ink, #1a2340) 12%, transparent);
    border-radius: 3px;
    padding: 3px 2px 1px 2px;
  }

  .slot.on {
    border-color: color-mix(in srgb, var(--ousio-accent, #b3452c) 55%, transparent);
  }

  .shead {
    display: flex;
    align-items: baseline;
    gap: 0.45rem;
    padding: 0 2px;
    font-family: var(--ousio-font, ui-serif, Georgia, serif);
    color: var(--ousio-ink, #1a2340);
    font-size: 0.72rem;
  }

  .sname {
    font-weight: 600;
  }

  .spair {
    font-style: italic;
    font-size: 0.62rem;
    color: color-mix(in srgb, var(--ousio-ink, #1a2340) 60%, transparent);
  }

  .slot.on .spair {
    color: var(--ousio-accent, #b3452c);
  }

  .smean {
    margin-left: auto;
    font-size: 0.6rem;
    font-variant-numeric: tabular-nums;
    color: color-mix(in srgb, var(--ousio-ink, #1a2340) 55%, transparent);
  }

  .xaxis {
    display: block;
  }

  .ax-tick {
    stroke: color-mix(in srgb, var(--ousio-ink, #1a2340) 35%, transparent);
  }

  .ax-num,
  .ax-label {
    font-family: var(--ousio-font, ui-serif, Georgia, serif);
    font-size: 8.5px;
    fill: color-mix(in srgb, var(--ousio-ink, #1a2340) 60%, transparent);
    font-variant-numeric: tabular-nums;
  }

  .strip {
    /* compact log-book card, bottom-left corner of the plot */
    position: absolute;
    left: 60px;
    bottom: 50px;
    padding: 4px 8px;
    background: color-mix(in srgb, var(--ousio-paper, #faf8f2) 96%, transparent);
    border: 1px solid color-mix(in srgb, var(--ousio-ink, #1a2340) 18%, transparent);
    border-radius: 4px;
  }

  .player {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 4px;
    font-family: var(--vcsi-font-sans, ui-sans-serif, system-ui);
  }

  .player button {
    border: 1px solid color-mix(in srgb, var(--ousio-ink, #1a2340) 45%, transparent);
    background: transparent;
    color: var(--ousio-ink, #1a2340);
    font: inherit;
    font-size: 0.68rem;
    line-height: 1;
    padding: 0.28rem 0.5rem;
    cursor: pointer;
  }

  .player .pp {
    min-width: 2rem;
  }

  .player .spd.active {
    background: var(--ousio-ink, #1a2340);
    color: var(--ousio-paper, #faf8f2);
  }

  .player button:focus-visible {
    outline: 2px solid var(--ousio-accent, #b3452c);
    outline-offset: 1px;
  }

  .player button:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .player-hint {
    margin-left: auto;
    font-size: 0.66rem;
    font-style: italic;
    color: color-mix(in srgb, var(--ousio-ink, #1a2340) 55%, transparent);
  }
</style>
