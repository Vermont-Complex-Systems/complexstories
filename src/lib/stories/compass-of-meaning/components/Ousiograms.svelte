<script module>
  /**
   * Axes are unit vectors in the shipped (power, danger, structure) basis.
   * Goodness/aggression are exact pi/4 rotations of the primary plane
   * (paper Eq. 3) — no extra columns needed, derived at projection time.
   *
   * The VAD axes come from transposing the paper's Eq. 4 (the matrix is
   * orthogonal, so its inverse is its transpose): valence, arousal, and
   * dominance are just three more unit vectors in the same rank-3 space.
   * CAVEAT: Eq. 4 is published at 2 decimal places, so reconstructed VAD
   * coordinates carry ~1% error vs. the NRC lexicon's published scores —
   * fine for visualization; for exact values, emit VAD columns from the
   * pipeline by joining the NRC VAD lexicon instead.
   */
  const unit = (v) => {
    const m = Math.hypot(v[0], v[1], v[2]);
    return [v[0] / m, v[1] / m, v[2] / m];
  };

  export const AXES = {
    power:      [1, 0, 0],
    danger:     [0, 1, 0],
    structure:  [0, 0, 1],
    goodness:   [Math.SQRT1_2, -Math.SQRT1_2, 0],
    aggression: [Math.SQRT1_2,  Math.SQRT1_2, 0],
    valence:    unit([+0.50, -0.72, +0.48]),  // Eq. 4, column 1
    arousal:    unit([+0.48, +0.69, +0.55]),  // Eq. 4, column 2
    dominance:  unit([+0.72, +0.04, -0.69]),  // Eq. 4, column 3
  };

  export const PAIRS = {
    power:      ['weak', 'powerful'],
    danger:     ['safe', 'dangerous'],
    structure:  ['structured', 'unstructured'],
    goodness:   ['bad', 'good'],
    aggression: ['gentle', 'aggressive'],
    valence:    ['negative', 'positive'],
    arousal:    ['passive', 'active'],
    dominance:  ['submissive', 'dominant'],
  };

  /**
   * Continuous rotation of the primary plane.
   * theta = 0    -> x: power,    y: danger      (PDS view)
   * theta = pi/4 -> x: goodness, y: aggression  (GAS view)
   * Tween theta between the two for the rotation beat.
   */
  export function primaryPlane(theta) {
    const c = Math.cos(theta), s = Math.sin(theta);
    return { xVec: [c, -s, 0], yVec: [s, c, 0] };
  }

  /**
   * Rigid camera tween between two viewing frames of the 3D cloud
   * (e.g. valence×dominance -> power×danger). Normalized lerp of the
   * x axis, then Gram-Schmidt to keep the frame orthonormal throughout —
   * every intermediate step is a valid 2D projection, so marginals,
   * ellipse, and annotations stay mathematically correct mid-flight.
   */
  export function frameLerp(a, b, t) {
    const mix = (u, v) => [
      u[0] + (v[0] - u[0]) * t,
      u[1] + (v[1] - u[1]) * t,
      u[2] + (v[2] - u[2]) * t,
    ];
    const x = unit(mix(a.xVec, b.xVec));
    const y0 = mix(a.yVec, b.yVec);
    const d = y0[0] * x[0] + y0[1] * x[1] + y0[2] * x[2];
    const y = unit([y0[0] - d * x[0], y0[1] - d * x[1], y0[2] - d * x[2]]);
    return { xVec: x, yVec: y };
  }

  /**
   * Shared reading-time ramp for book trajectories (path overlay + strip):
   * blue at the opening, through green, to red at the close.
   */
  export const epochColor = (t) => `hsl(${215 - 205 * t}, 62%, 40%)`;
</script>

<script>
  /**
   * Ousiogram — annotated point cloud of essential-meaning space.
   *
   * Data is columnar, matching make_ousiometry_pds.py --binary:
   *   words:  string[]                       (n)
   *   values: Float32Array, stride 3         [pw0,dg0,st0, pw1,dg1,st1, ...]
   *
   * Any 2D view is a pair of axis vectors; marginals, medians, the SVD
   * ellipse, and the hull/ray annotations are all computed on the projected
   * coordinates, so they stay correct mid-rotation.
   *
   * Rendering split: Canvas 2D for points, Svelte-templated SVG for
   * axes/marginals/ellipse, HTML overlay for labels. d3 supplies math only.
   *
   * Svelte 5 (runes). Deps: d3-scale d3-array d3-polygon d3-quadtree
   */
  import { fade } from 'svelte/transition';
  import { scaleLinear } from 'd3-scale';
  import { bin, median } from 'd3-array';
  import { polygonHull, polygonCentroid } from 'd3-polygon';
  import { quadtree } from 'd3-quadtree';

  let {
    words = [],
    values = new Float32Array(0),
    xVec = AXES.power,
    yVec = AXES.danger,
    xPair = null,              // bipolar adjectival pair, e.g. ['weak','powerful'];
    yPair = null,              //   defaults resolved from AXES if the vector matches
    weights = null,            // optional Float32Array (n) -> token mode
    domain = [-1, 1],
    xDomain = null,            // per-axis zoom windows; null = `domain`
    yDomain = null,
    path = null,               // book trajectory: [[x, y], ...] in data space
    pathReveal = 1,            // 0..1 fraction of the path drawn (the "wake")
    pathMarks = [],            // landmarks [{ at: 0..1, label, side? }], shown
                               //   once the wake reaches `at`
    flotsam = [],              // read-along words surfacing at the wake head:
                               //   [{ id, word, x, y, size }] in data coords
    highlight = [],            // words to call out with a labelled dot (the hook)
    annotate = true,           // hull/ray word labels (turn off when zoomed)
    size = 640,                // square edge; or pass width/height separately —
    width = null,              //   a wider canvas keeps UNITS EQUAL and simply
    height = null,             //   shows more of the plane horizontally
    boundaryLabels = 26,
    rayLabels = true,
    compass = false,           // render all 8 GPADS directions as a rotating rim
    bins = 0,                  // 0 = scatter; 60 matches the paper's 1/30 bin width
    binMix = 1,                // 0..1 crossfade: 0 = pure scatter, 1 = pure histogram
    binPower = 1,              // color = (count/max)^binPower; 1 = paper's linear
                               // normalization, 0.5 = sqrt (use when one token
                               // like 'be' dominates the max bin — and say so)
    showEllipse = true,
    sigmaAxes = false,         // draw the ellipse's principal axes (σ1, σ2) —
                               //   the geometric Σ of the SVD, live mid-turn
    showMarginals = true,
    onhover = null,            // (index | null, word | null) => void
  } = $props();

  let n = $derived(Math.min(words.length, values.length / 3 | 0));

  // ---- axis label resolution ------------------------------------------------
  function pairFor(vec) {
    for (const [name, v] of Object.entries(AXES)) {
      if (Math.hypot(v[0] - vec[0], v[1] - vec[1], v[2] - vec[2]) < 1e-6) return PAIRS[name];
    }
    return null; // mid-rotation: let the essay crossfade its own labels
  }
  let xLabels = $derived(xPair ?? pairFor(xVec));
  let yLabels = $derived(yPair ?? pairFor(yVec));

  // ---- layout ---------------------------------------------------------------
  const M = { top: 56, right: 56, bottom: 44, left: 52 };
  const MARGINAL_H = 34;

  let W = $derived(width ?? size);
  let H = $derived(height ?? size);
  let plotW = $derived(W - M.left - M.right);
  let plotH = $derived(H - M.top - M.bottom);
  let yDom = $derived(yDomain ?? domain);
  // The x window is derived from the y window and the canvas aspect, so a
  // pixel is the same data length on both axes — a wide canvas is a wider
  // WINDOW onto the plane, never a stretched plane.
  let xDom = $derived.by(() => {
    const base = xDomain ?? domain;
    const xc = (base[0] + base[1]) / 2;
    const half = ((yDom[1] - yDom[0]) / 2) * (plotW / plotH);
    return [xc - half, xc + half];
  });
  let zoomedIn = $derived(xDomain != null || yDomain != null);

  // Minimap window rect (76px box over the full square domain), clamped —
  // the auto-widened x window can poke past the [-1, 1] map on wide canvases.
  let mmWin = $derived.by(() => {
    const span = domain[1] - domain[0];
    const c = (v) => Math.max(0, Math.min(76, v));
    const x0 = c(((xDom[0] - domain[0]) / span) * 76);
    const x1 = c(((xDom[1] - domain[0]) / span) * 76);
    const y0 = c(((domain[1] - yDom[1]) / span) * 76);
    const y1 = c(((domain[1] - yDom[0]) / span) * 76);
    return { x: x0, y: y0, w: Math.max(3, x1 - x0), h: Math.max(3, y1 - y0) };
  });
  let sx = $derived(scaleLinear().domain(xDom).range([0, plotW]));
  let sy = $derived(scaleLinear().domain(yDom).range([plotH, 0]));

  // On a wide canvas the window extends past the [-1,1] home square. The
  // extra plane is honest margin, not map: confine ticks/grid to the square
  // and mark its boundary, so the composition reads "map with a mat".
  let homeSquare = $derived(!zoomedIn && xDom[1] > domain[1] * 1.02);
  let xTicks = $derived(
    homeSquare
      ? sx.ticks(5).filter((t) => t >= domain[0] - 1e-9 && t <= domain[1] + 1e-9)
      : sx.ticks(5)
  );
  let yTicks = $derived(sy.ticks(5));
  let gridX0 = $derived(homeSquare ? sx(domain[0]) : 0);
  let gridX1 = $derived(homeSquare ? sx(domain[1]) : plotW);

  // ---- compass: the GPADS circumplex as a literal rim -----------------------
  // Eight fixed directions in data space (angle phi in the power-danger plane,
  // math convention: 0 = +power, pi/2 = +danger). The whole ring rotates on
  // screen by theta, so PDS names sit on the screen axes at theta = 0 and GAS
  // names at theta = pi/4. Emphasis follows axis alignment: cos^2(2*(phi+theta))
  // is 1 when a direction lies on a screen axis and 0 at 45 degrees off.
  const COMPASS = [
    { word: 'powerful',   phi: 0 },
    { word: 'aggressive', phi: Math.PI / 4 },
    { word: 'dangerous',  phi: Math.PI / 2 },
    { word: 'bad',        phi: (3 * Math.PI) / 4 },
    { word: 'weak',       phi: Math.PI },
    { word: 'gentle',     phi: (5 * Math.PI) / 4 },
    { word: 'safe',       phi: (3 * Math.PI) / 2 },
    { word: 'good',       phi: (7 * Math.PI) / 4 },
  ];

  // Compass only makes sense for views of the primary plane. Rather than a
  // hard on/off, fade with planarity so the ring emerges as a camera tween
  // (e.g. from the VAD view) lands in the plane; theta is recovered from
  // xVec ([cos t, -sin t, 0]) so callers pass nothing extra.
  let compassFade = $derived(
    compass ? Math.max(0, 1 - 3 * Math.hypot(xVec[2], yVec[2])) : 0
  );
  let compassActive = $derived(compassFade > 0.001);
  let compassTheta = $derived(compassActive ? Math.atan2(-xVec[1], xVec[0]) : 0);

  let compassMarks = $derived.by(() => {
    if (!compassActive) return [];
    // Plot center, not data origin: the rim is a screen ornament and must
    // stay centered when the domain zooms off the origin.
    const cx = plotW / 2, cy = plotH / 2;
    const R = Math.min(plotW, plotH) / 2 - 12;
    return COMPASS.map(({ word, phi }) => {
      const a = phi + compassTheta;
      const dx = Math.cos(a), dy = -Math.sin(a); // screen y is down
      const w = Math.cos(2 * a) ** 2;
      // Labels live ON the rim in the compass-rose views, but a zoomed
      // window fills the canvas with data — push them out along their ray
      // to the canvas edge so they never occlude the wake or its words.
      let lx, ly;
      if (zoomedIn) {
        const inset = 16;
        const tx = dx ? (plotW / 2 - inset) / Math.abs(dx) : Infinity;
        const ty = dy ? (plotH / 2 - inset) / Math.abs(dy) : Infinity;
        const t = Math.min(tx, ty);
        lx = cx + dx * t;
        ly = cy + dy * t;
      } else {
        lx = cx + dx * (R - 16);
        ly = cy + dy * (R - 16);
      }
      return {
        word,
        weight: w,
        tx1: cx + dx * R,       ty1: cy + dy * R,
        tx2: cx + dx * (R + 7), ty2: cy + dy * (R + 7),
        lx,
        ly
      };
    });
  });

  // ---- projection: data-space scalars along each axis -----------------------
  function computeProj(xV, yV) {
    const u = new Float32Array(n);
    const v = new Float32Array(n);
    const [ax, ay, az] = xV, [bx, by, bz] = yV;
    for (let i = 0; i < n; i++) {
      const p = values[3 * i], d = values[3 * i + 1], s = values[3 * i + 2];
      u[i] = ax * p + ay * d + az * s;
      v[i] = bx * p + by * d + bz * s;
    }
    return { u, v };
  }

  let proj = $derived.by(() => computeProj(xVec, yVec));

  // ---- settled basis for the heavy annotation layer --------------------------
  // Mid-rotation the view vectors change ~60x/s; rebuilding the quadtree, hull,
  // label placement and marginals per frame is what makes scrolling lag. Those
  // layers read a debounced copy of the basis instead: they freeze during a
  // tween and rebuild once, ~150ms after the vectors stop moving. Points, the
  // ellipse, and the compass stay live (all O(n) and cheap).
  // $state.raw, NOT $state: the deep proxy would wrap the vectors, breaking
  // the reference-equality guards below (proxy !== raw prop), which turns the
  // debounce into an infinite 150ms churn loop of quadtree/hull/label rebuilds.
  // svelte-ignore state_referenced_locally -- initial snapshot is intentional; the effect below tracks changes
  let annotBasis = $state.raw({ x: xVec, y: yVec });

  $effect(() => {
    const x = xVec, y = yVec;
    if (x === annotBasis.x && y === annotBasis.y) return;
    const id = setTimeout(() => (annotBasis = { x, y }), 150);
    return () => clearTimeout(id);
  });

  // When settled the references match and we reuse `proj` — no double compute.
  let annotProj = $derived.by(() =>
    annotBasis.x === xVec && annotBasis.y === yVec ? proj : computeProj(annotBasis.x, annotBasis.y)
  );

  // pixel positions + index, for hull/quadtree
  let pts = $derived.by(() => {
    const out = new Array(n);
    for (let i = 0; i < n; i++) out[i] = [sx(annotProj.u[i]), sy(annotProj.v[i]), i];
    return out;
  });

  let tree = $derived(quadtree().x((p) => p[0]).y((p) => p[1]).addAll(pts));

  let wMax = $derived.by(() => {
    if (!weights) return 1;
    let m = 0;
    for (let i = 0; i < n; i++) if (weights[i] > m) m = weights[i];
    return m || 1;
  });
  const radiusOf = (i) => (weights ? 0.6 + 4.5 * Math.sqrt((weights[i] || 0) / wMax) : 1.1);

  // ---- 2D histogram grid (the paper's ousiogram proper) ---------------------
  // Fixed-width bins over the data domain (paper: width 1/30 -> bins = 60).
  // Also collects occupied-cell centers in pixel space: the paper hulls the
  // histogram, not the raw points, so annotations anchor to these when binning.
  // Cells stay square on a wide canvas: `bins` counts the y cells (paper's
  // 1/30 of the y span) and the x count follows the aspect ratio.
  let binsX = $derived(bins ? Math.max(1, Math.round(bins * (plotW / plotH))) : 0);

  function computeGrid(p) {
    if (!bins || !n) return null;
    const counts = new Float32Array(binsX * bins);
    const xSpan = xDom[1] - xDom[0];
    const ySpan = yDom[1] - yDom[0];
    const { u, v } = p;
    let maxC = 0;
    for (let i = 0; i < n; i++) {
      const gx = Math.min(binsX - 1, Math.max(0, Math.floor(((u[i] - xDom[0]) / xSpan) * binsX)));
      const gy = Math.min(bins - 1, Math.max(0, Math.floor(((v[i] - yDom[0]) / ySpan) * bins)));
      const c = (counts[gy * binsX + gx] += weights ? (weights[i] || 0) : 1);
      if (c > maxC) maxC = c;
    }
    const centers = [];
    const cw = plotW / binsX, ch = plotH / bins;
    for (let gy = 0; gy < bins; gy++) {
      for (let gx = 0; gx < binsX; gx++) {
        if (counts[gy * binsX + gx] > 0) {
          // grid y counts up in data space; flip for pixels
          centers.push([(gx + 0.5) * cw, plotH - (gy + 0.5) * ch]);
        }
      }
    }
    return { counts, maxC: maxC || 1, centers };
  }

  let grid = $derived.by(() => computeGrid(proj));
  // Hull annotations read the SETTLED grid (same debounce as pts/tree);
  // reuses the live grid at rest, where annotProj IS proj.
  let annotGrid = $derived.by(() => (annotProj === proj ? grid : computeGrid(annotProj)));
  // Boolean gate: the hull flips source once at the crossfade midpoint
  // instead of recomputing on every frame of a binMix tween.
  let binned = $derived(!!grid && binMix > 0.5);

  // ---- canvas points --------------------------------------------------------
  let canvas = $state(null);

  $effect(() => {
    if (!canvas || !n) return;
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    canvas.width = plotW * dpr;
    canvas.height = plotH * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, plotW, plotH);
    const ink = getComputedStyle(canvas).getPropertyValue('--ousio-ink').trim() || '#1a2340';
    const { u, v } = proj;

    // histogram layer (paper-style ramp: pale yellow -> gold -> ink)
    const heat = grid && binMix > 0;
    if (heat) {
      const ramp = scaleLinear()
        .domain([0, 0.2, 0.55, 1])
        .range(['#fbf3d0', '#f0da7c', '#c99a2e', ink])
        .clamp(true);
      const cw = plotW / binsX, ch = plotH / bins;
      ctx.globalAlpha = binMix;
      for (let gy = 0; gy < bins; gy++) {
        for (let gx = 0; gx < binsX; gx++) {
          const c = grid.counts[gy * binsX + gx];
          if (!c) continue;
          ctx.fillStyle = ramp(Math.pow(c / grid.maxC, binPower));
          ctx.fillRect(gx * cw, plotH - (gy + 1) * ch, cw + 0.5, ch + 0.5);
        }
      }
    }

    // scatter layer, fading out as the histogram fades in
    const scatterAlpha = (weights ? 0.28 : 0.35) * (heat ? 1 - binMix : 1);
    if (scatterAlpha > 0.003) {
      ctx.fillStyle = ink;
      ctx.globalAlpha = scatterAlpha;
      if (weights) {
        for (let i = 0; i < n; i++) {
          ctx.beginPath();
          ctx.arc(sx(u[i]), sy(v[i]), radiusOf(i), 0, 6.2832);
          ctx.fill();
        }
      } else {
        // At ~1px radius a square is indistinguishable from a circle, and
        // fillRect is ~5x cheaper than 20k arc+fill path ops — this effect
        // re-runs every frame of the rotation tween.
        const r = 1.1;
        for (let i = 0; i < n; i++) {
          ctx.fillRect(sx(u[i]) - r, sy(v[i]) - r, 2 * r, 2 * r);
        }
      }
    }
  });

  // ---- SVD ellipse on projected coords --------------------------------------
  let ellipse = $derived.by(() => {
    if (!n) return null;
    const { u, v } = proj;
    let W = 0, mu = 0, mv = 0;
    for (let i = 0; i < n; i++) {
      const w = weights ? (weights[i] || 0) : 1;
      W += w; mu += w * u[i]; mv += w * v[i];
    }
    if (!W) return null;
    mu /= W; mv /= W;
    let a = 0, b = 0, c = 0;
    for (let i = 0; i < n; i++) {
      const w = weights ? (weights[i] || 0) : 1;
      const du = u[i] - mu, dv = v[i] - mv;
      a += w * du * du; b += w * du * dv; c += w * dv * dv;
    }
    a /= W; b /= W; c /= W;
    const tr = (a + c) / 2;
    const det = Math.sqrt(((a - c) / 2) ** 2 + b * b);
    const l1 = tr + det, l2 = Math.max(tr - det, 1e-12);
    const theta = 0.5 * Math.atan2(2 * b, a - c);
    return { mu, mv, r1: 2 * Math.sqrt(l1), r2: 2 * Math.sqrt(l2), theta };
  });

  // Principal axes of the ellipse, in data space mapped through the scales —
  // they tilt with the survey frame and lie flat once U has been applied.
  let sigAxes = $derived.by(() => {
    if (!sigmaAxes || !ellipse) return null;
    const { mu, mv, r1, r2, theta } = ellipse;
    const c = Math.cos(theta), s = Math.sin(theta);
    const axis = (rx, ry, stretch, label) => ({
      x1: sx(mu - rx), y1: sy(mv - ry),
      x2: sx(mu + rx), y2: sy(mv + ry),
      lx: sx(mu + rx * stretch), ly: sy(mv + ry * stretch),
      label
    });
    return [
      axis(r1 * c, r1 * s, 1.14, 'σ₁'),
      axis(-r2 * s, r2 * c, 1.3, 'σ₂')
    ];
  });

  let ellipseT = $derived.by(() => {
    if (!ellipse) return null;
    const k = plotW / (domain[1] - domain[0]);
    const ky = plotH / (domain[1] - domain[0]);
    return {
      cx: sx(ellipse.mu), cy: sy(ellipse.mv),
      rx: ellipse.r1 * k, ry: ellipse.r2 * ky,
      deg: (-ellipse.theta * 180) / Math.PI,
    };
  });

  // ---- marginals on projected coords ----------------------------------------
  function marginal(arr, dom) {
    const idx = Array.from({ length: n }, (_, i) => i);
    const bins = bin().domain(dom).thresholds(40).value((i) => arr[i])(idx);
    const counts = bins.map((bk) =>
      weights ? bk.reduce((s, i) => s + (weights[i] || 0), 0) : bk.length
    );
    const m = Math.max(...counts, 1);
    return {
      bins,
      counts: counts.map((cnt) => cnt / m),
      med: weights ? weightedMedian(arr) : median(arr),
    };
  }
  function weightedMedian(arr) {
    const idx = Array.from({ length: n }, (_, i) => i).sort((a, b) => arr[a] - arr[b]);
    let total = 0;
    for (let i = 0; i < n; i++) total += weights[i] || 0;
    let acc = 0;
    for (const i of idx) {
      acc += weights[i] || 0;
      if (acc >= total / 2) return arr[i];
    }
    return 0;
  }
  // Settled basis: binning 2x20k per tween frame is jank; the histograms
  // refresh once the rotation stops.
  let margX = $derived(showMarginals && n ? marginal(annotProj.u, xDom) : null);
  let margY = $derived(showMarginals && n ? marginal(annotProj.v, yDom) : null);

  // ---- boundary annotation (hull -> anchors -> outward normals -> nearest) --
  let boundaryAnno = $derived.by(() => {
    if (!n || !annotate || !boundaryLabels) return [];
    const hullSrc = binned && annotGrid ? annotGrid.centers : pts.map((p) => [p[0], p[1]]);
    const hull = polygonHull(hullSrc);
    if (!hull || hull.length < 3) return [];
    const [cx, cy] = polygonCentroid(hull);

    let perim = 0;
    for (let i = 0; i < hull.length; i++) {
      const [x0, y0] = hull[i], [x1, y1] = hull[(i + 1) % hull.length];
      perim += Math.hypot(x1 - x0, y1 - y0);
    }
    const step = perim / boundaryLabels;

    const used = new Set();
    const labels = [];
    let carried = 0;
    for (let i = 0; i < hull.length; i++) {
      const [x0, y0] = hull[i], [x1, y1] = hull[(i + 1) % hull.length];
      const segLen = Math.hypot(x1 - x0, y1 - y0);
      let t = carried;
      while (t < segLen) {
        const ax = x0 + ((x1 - x0) * t) / segLen;
        const ay = y0 + ((y1 - y0) * t) / segLen;
        let nx = -(y1 - y0) / segLen, ny = (x1 - x0) / segLen;
        if (nx * (ax - cx) + ny * (ay - cy) < 0) { nx = -nx; ny = -ny; }
        const nearest = tree.find(ax, ay);
        if (nearest && !used.has(nearest[2])) {
          used.add(nearest[2]);
          let deg = (Math.atan2(ny, nx) * 180) / Math.PI;
          let anchor = 'start';
          if (deg > 90 || deg < -90) { deg += 180; anchor = 'end'; }
          labels.push({ word: words[nearest[2]], lx: ax + nx * 8, ly: ay + ny * 8, deg, anchor });
        }
        t += step;
      }
      carried = t - segLen;
    }
    return labels;
  });

  // ---- internal ray annotation ----------------------------------------------
  let rayAnno = $derived.by(() => {
    if (!rayLabels || !annotate || !n) return [];
    // Plot center, not data origin: identical at the default domain, and it
    // keeps the rays inside the window when the domain zooms — so the words
    // the reader is floating among still get named.
    const cx = plotW / 2, cy = plotH / 2;
    const R = Math.min(plotW, plotH) / 2;
    const used = new Set(boundaryAnno.map((l) => l.word));
    const out = [];
    for (let k = 0; k < 8; k++) {
      const ang = (k * Math.PI) / 4;
      for (const f of [0.3, 0.55, 0.8]) {
        const ax = cx + Math.cos(ang) * R * f;
        const ay = cy - Math.sin(ang) * R * f;
        const nearest = tree.find(ax, ay, 28);
        if (nearest && !used.has(words[nearest[2]])) {
          used.add(words[nearest[2]]);
          out.push({ word: words[nearest[2]], lx: nearest[0], ly: nearest[1] });
        }
      }
    }
    return out;
  });

  // ---- hover ----------------------------------------------------------------
  // Scatter mode targets the nearest word (ring + word tooltip). Binned mode
  // targets the CELL under the cursor (square highlight + count tooltip) —
  // once the dots have melted into bins, the square is the unit of meaning.
  let hoveredIdx = $state(null);
  let hoveredCell = $state(null); // { gx, gy, count, words, hidden, left, top, below } | null

  let cellW = $derived(binsX ? plotW / binsX : 0);
  let cellH = $derived(bins ? plotH / bins : 0);

  // cell -> word indices, on the settled projection. $derived is lazy, so
  // this only computes when a binned hover first reads it — camera flights
  // never pay for it. File order is alphabetical, which the list inherits;
  // with weights, "top" means heaviest first.
  const CELL_LIST_MAX = 30;
  let cellWords = $derived.by(() => {
    if (!bins || !n) return null;
    const idx = new Array(binsX * bins).fill(null);
    const xSpan = xDom[1] - xDom[0];
    const ySpan = yDom[1] - yDom[0];
    const { u, v } = annotProj;
    for (let i = 0; i < n; i++) {
      const gx = Math.min(binsX - 1, Math.max(0, Math.floor(((u[i] - xDom[0]) / xSpan) * binsX)));
      const gy = Math.min(bins - 1, Math.max(0, Math.floor(((v[i] - yDom[0]) / ySpan) * bins)));
      (idx[gy * binsX + gx] ??= []).push(i);
    }
    return idx;
  });

  // ---- book trajectory (the telegnomic wake) ---------------------------------
  // Ten epoch-colored SVG segments over the plot; segment boundaries use the
  // FULL path length so colors are stable while pathReveal grows. Overlapping
  // one point per boundary keeps the wake visually continuous.
  const EPOCHS = 10;
  let pathSegs = $derived.by(() => {
    if (!path || pathReveal <= 0) return [];
    const upto = Math.max(2, Math.round(path.length * pathReveal));
    const per = Math.ceil(path.length / EPOCHS);
    const segs = [];
    for (let s = 0; s < EPOCHS; s++) {
      const a = s * per;
      if (a >= upto - 1) break;
      const b = Math.min(a + per + 1, upto);
      const pp = path.slice(a, b);
      if (pp.length < 2) continue;
      segs.push({
        d: 'M' + pp.map((p) => `${sx(p[0]).toFixed(1)},${sy(p[1]).toFixed(1)}`).join('L'),
        color: epochColor(s / (EPOCHS - 1))
      });
    }
    return segs;
  });

  let pathHead = $derived.by(() => {
    if (!path || pathReveal <= 0) return null;
    const p = path[Math.min(path.length - 1, Math.max(1, Math.round(path.length * pathReveal)) - 1)];
    return { x: sx(p[0]), y: sy(p[1]) };
  });

  // Landmarks appear as the wake reaches them, anchored to the path point.
  let visibleMarks = $derived.by(() => {
    if (!path || !pathMarks.length || pathReveal <= 0) return [];
    return pathMarks
      .filter((m) => pathReveal >= m.at - 1e-6)
      .map((m) => {
        const p = path[Math.min(path.length - 1, Math.round(m.at * (path.length - 1)))];
        return { ...m, x: sx(p[0]), y: sy(p[1]) };
      });
  });

  function handleMove(ev) {
    const rect = canvas.getBoundingClientRect();
    const mx = ev.clientX - rect.left;
    const my = ev.clientY - rect.top;

    if (binned) {
      if (hoveredIdx != null) { hoveredIdx = null; onhover?.(null, null); }
      const gx = Math.min(binsX - 1, Math.max(0, Math.floor((mx / plotW) * binsX)));
      const gy = Math.min(bins - 1, Math.max(0, Math.floor(((plotH - my) / plotH) * bins)));
      const count = grid ? grid.counts[gy * binsX + gx] : 0;
      if (!count) {
        if (hoveredCell) hoveredCell = null;
        return;
      }
      if (hoveredCell?.gx === gx && hoveredCell?.gy === gy) return;

      const list = cellWords?.[gy * binsX + gx] ?? [];
      const top = weights
        ? [...list].sort((a, b) => (weights[b] || 0) - (weights[a] || 0)).slice(0, CELL_LIST_MAX)
        : list.slice(0, CELL_LIST_MAX);

      // Tooltip anchor: clamped horizontally, flipped below near the top edge
      // so a 30-word panel never clips off the figure.
      const half = Math.min(124, W / 2 - 8);
      const anchorX = Math.max(half, Math.min(W - half, M.left + (gx + 0.5) * cellW));
      const cellTopPx = plotH - (gy + 1) * cellH;
      const below = cellTopPx < 170;
      const anchorY = M.top + (below ? cellTopPx + cellH + 6 : cellTopPx - 6);

      hoveredCell = {
        gx, gy,
        count: Math.round(count),
        words: top.map((i) => words[i]),
        hidden: Math.max(0, list.length - CELL_LIST_MAX),
        left: anchorX,
        top: anchorY,
        below
      };
      return;
    }

    if (hoveredCell) hoveredCell = null;
    const found = tree.find(mx, my, 24);
    const i = found ? found[2] : null;
    if (i !== hoveredIdx) { hoveredIdx = i; onhover?.(i, i == null ? null : words[i]); }
  }
  function handleLeave() {
    hoveredIdx = null;
    hoveredCell = null;
    onhover?.(null, null);
  }

  let hoverPx = $derived(
    hoveredIdx == null ? null : { px: sx(proj.u[hoveredIdx]), py: sy(proj.v[hoveredIdx]) }
  );

  // Called-out words (the hook): resolve each to its projected position, so a
  // reader sees storm/conquer sitting exactly where the copy claims.
  let highlightMarks = $derived.by(() => {
    if (!highlight.length || !n) return [];
    return highlight
      .map((w) => {
        const i = words.indexOf(w);
        return i < 0 ? null : { word: w, px: sx(proj.u[i]), py: sy(proj.v[i]) };
      })
      .filter(Boolean);
  });

  const fmt = (v) => (v >= 0 ? '+' : '') + v.toFixed(2);
</script>

<figure class="ousiogram" style="width: {W}px">
  <div class="frame">
    <canvas
      bind:this={canvas}
      style="width: {plotW}px; height: {plotH}px; left: {M.left}px; top: {M.top}px"
      onmousemove={handleMove}
      onmouseleave={handleLeave}
    ></canvas>

    <svg width={W} height={H} aria-hidden="true">
      <g transform="translate({M.left},{M.top})">
        {#if homeSquare}
          <rect
            class="home"
            x={gridX0}
            y={sy(domain[1])}
            width={gridX1 - gridX0}
            height={sy(domain[0]) - sy(domain[1])}
          />
        {/if}
        {#each xTicks as t}
          <line class="grid" x1={sx(t)} x2={sx(t)} y1={0} y2={plotH} />
          <text class="tick" x={sx(t)} y={plotH + 16} text-anchor="middle">{t}</text>
        {/each}
        {#each yTicks as t}
          <line class="grid" y1={sy(t)} y2={sy(t)} x1={gridX0} x2={gridX1} />
          <text class="tick" x={gridX0 - 8} y={sy(t)} text-anchor="end" dy="0.32em">{t}</text>
        {/each}
        {#if xDom[0] <= 0 && 0 <= xDom[1]}
          <line class="axis-zero" x1={sx(0)} x2={sx(0)} y1={0} y2={plotH} />
        {/if}
        {#if yDom[0] <= 0 && 0 <= yDom[1]}
          <line class="axis-zero" y1={sy(0)} y2={sy(0)} x1={gridX0} x2={gridX1} />
        {/if}

        {#if showEllipse && ellipseT}
          <ellipse
            class="svd"
            cx={ellipseT.cx} cy={ellipseT.cy}
            rx={ellipseT.rx} ry={ellipseT.ry}
            transform="rotate({ellipseT.deg} {ellipseT.cx} {ellipseT.cy})"
          />
        {/if}
        {#if sigAxes}
          <g class="sig-axes">
            {#each sigAxes as a (a.label)}
              <line x1={a.x1} y1={a.y1} x2={a.x2} y2={a.y2} />
              <text class="sig-label" x={a.lx} y={a.ly} text-anchor="middle" dy="0.32em">{a.label}</text>
            {/each}
          </g>
        {/if}

        {#if margX}
          <g transform="translate(0,-6)">
            {#each margX.bins as bk, i}
              <rect
                class="marg" class:pos={(bk.x0 + bk.x1) / 2 >= 0}
                x={sx(bk.x0)} width={Math.max(sx(bk.x1) - sx(bk.x0) - 0.5, 0.5)}
                y={-margX.counts[i] * MARGINAL_H} height={margX.counts[i] * MARGINAL_H}
              />
            {/each}
            <path class="median" d="M {sx(margX.med) - 4} -1 L {sx(margX.med) + 4} -1 L {sx(margX.med)} -8 Z" />
          </g>
        {/if}
        {#if margY}
          <g transform="translate({gridX1 + 6},0)">
            {#each margY.bins as bk, i}
              <rect
                class="marg" class:pos={(bk.x0 + bk.x1) / 2 >= 0}
                y={sy(bk.x1)} height={Math.max(sy(bk.x0) - sy(bk.x1) - 0.5, 0.5)}
                x={0} width={margY.counts[i] * MARGINAL_H}
              />
            {/each}
            <path class="median" d="M 1 {sy(margY.med) - 4} L 1 {sy(margY.med) + 4} L 8 {sy(margY.med)} Z" />
          </g>
        {/if}

        {#each compassMarks as m (m.word)}
          <line
            class="compass-tick"
            x1={m.tx1} y1={m.ty1} x2={m.tx2} y2={m.ty2}
            style="stroke-opacity: {(0.15 + 0.65 * m.weight) * compassFade}"
          />
        {/each}

        <!-- Minimap: full plane with the zoom window, so a zoomed reader
             always knows where in the map they are. -->
        {#if zoomedIn}
          <g class="minimap" transform="translate({plotW - 84}, 8)">
            <rect class="mm-bg" width="76" height="76" />
            <line class="mm-axis" x1="38" y1="0" x2="38" y2="76" />
            <line class="mm-axis" x1="0" y1="38" x2="76" y2="38" />
            <rect class="mm-win" x={mmWin.x} y={mmWin.y} width={mmWin.w} height={mmWin.h} />
          </g>
          <!-- two-second decoder for the zoomed window -->
          {#if xLabels && yLabels}
            <text class="mm-hint" x={plotW - 8} y={102} text-anchor="end">→ more {xLabels[1]}</text>
            <text class="mm-hint" x={plotW - 8} y={116} text-anchor="end">↑ more {yLabels[1]}</text>
          {/if}
        {/if}

        <!-- Pole labels: the bipolar pair placed AT the ends of the zero
             axes, so direction reads directly off the axis. Hidden when the
             compass rim is active (the rim already labels the directions). -->
        {#if xLabels && !compassActive && yDom[0] <= 0 && 0 <= yDom[1]}
          <text class="pole" x={gridX1 - 6} y={sy(0) - 7} text-anchor="end">{xLabels[1]} →</text>
          <text class="pole" x={gridX0 + 6} y={sy(0) - 7} text-anchor="start">← {xLabels[0]}</text>
        {/if}
        {#if yLabels && !compassActive && xDom[0] <= 0 && 0 <= xDom[1]}
          <text class="pole" x={sx(0) + 7} y={14} text-anchor="start">↑ {yLabels[1]}</text>
          <text class="pole" x={sx(0) + 7} y={plotH - 8} text-anchor="start">↓ {yLabels[0]}</text>
        {/if}

        {#if pathSegs.length}
          <g class="traj">
            {#each pathSegs as seg, i (i)}
              <path d={seg.d} stroke={seg.color} />
            {/each}
            {#each visibleMarks as m (m.label)}
              <circle class="traj-mark" cx={m.x} cy={m.y} r={2.5} />
            {/each}
            {#if pathHead}
              <circle class="traj-head" cx={pathHead.x} cy={pathHead.y} r={3.5} />
            {/if}
          </g>
        {/if}

        {#if binned && hoveredCell}
          <rect
            class="hover-cell"
            x={hoveredCell.gx * cellW}
            y={plotH - (hoveredCell.gy + 1) * cellH}
            width={cellW}
            height={cellH}
          />
        {:else if hoverPx}
          <circle class="hover-ring" cx={hoverPx.px} cy={hoverPx.py} r={7} />
        {/if}

        {#each highlightMarks as h (h.word)}
          <circle class="hl-dot" cx={h.px} cy={h.py} r={4} />
        {/each}
      </g>
    </svg>

    <div class="labels" style="left: {M.left}px; top: {M.top}px; width: {plotW}px; height: {plotH}px">
      {#each boundaryAnno as l (l.word)}
        <span
          class="boundary-label"
          style="left: {l.lx}px; top: {l.ly}px;
                 transform: translate(0,-50%) rotate({l.deg}deg);
                 transform-origin: {l.anchor === 'end' ? '100%' : '0'} 50%;
                 {l.anchor === 'end' ? 'translate: -100% 0;' : ''}"
        >{l.word}</span>
      {/each}
      {#each rayAnno as l (l.word)}
        <span class="ray-label" style="left: {l.lx}px; top: {l.ly}px">{l.word}</span>
      {/each}
      {#each compassMarks as m (m.word)}
        <span
          class="compass-label"
          style="left: {m.lx}px; top: {m.ly}px;
                 opacity: {(0.3 + 0.7 * m.weight) * compassFade};
                 font-size: {10.5 + 1.5 * m.weight}px"
        >{m.word}</span>
      {/each}
      {#each visibleMarks as m (m.label)}
        <span
          class="traj-label"
          class:below={m.side === 'below'}
          style="left: {m.x}px; top: {m.y}px"
          transition:fade={{ duration: 300 }}
        >{m.label}</span>
      {/each}
      {#each flotsam as f (f.id)}
        <span
          class="flot"
          style="left: {sx(f.x)}px; top: {sy(f.y)}px; font-size: {f.size}px"
        >{f.word}</span>
      {/each}
      {#each highlightMarks as h (h.word)}
        <span class="hl-label" style="left: {h.px}px; top: {h.py}px">{h.word}</span>
      {/each}
    </div>

    {#if binned && hoveredCell}
      <div
        class="tooltip cell"
        class:below={hoveredCell.below}
        style="left: {hoveredCell.left}px; top: {hoveredCell.top}px"
      >
        <strong>{hoveredCell.count.toLocaleString()} {weights ? 'uses' : hoveredCell.count === 1 ? 'word' : 'words'}</strong>
        {#if hoveredCell.words.length}
          <span class="cell-words">
            {hoveredCell.words.join(', ')}{hoveredCell.hidden ? `, +${hoveredCell.hidden} more` : ''}
          </span>
        {/if}
      </div>
    {:else if hoveredIdx != null && hoverPx}
      <div class="tooltip" style="left: {M.left + hoverPx.px}px; top: {M.top + hoverPx.py - 14}px">
        <strong>{words[hoveredIdx]}</strong>
        <span>{fmt(proj.u[hoveredIdx])} · {fmt(proj.v[hoveredIdx])}</span>
      </div>
    {/if}
  </div>
</figure>

<style>
  .ousiogram {
    --ink: var(--ousio-ink, #1a2340);
    --paper: var(--ousio-paper, #faf8f2);
    --accent: var(--ousio-accent, #b3452c);
    position: relative;
    margin: 0;
    background: var(--paper);
    font-family: var(--ousio-font, ui-serif, Georgia, serif);
    color: var(--ink);
  }
  .frame { position: relative; }
  canvas { position: absolute; cursor: crosshair; --ousio-ink: var(--ink); }
  svg { display: block; overflow: visible; pointer-events: none; }

  .grid { stroke: color-mix(in srgb, var(--ink) 8%, transparent); }
  .home { fill: none; stroke: color-mix(in srgb, var(--ink) 20%, transparent); }
  .axis-zero { stroke: color-mix(in srgb, var(--ink) 40%, transparent); stroke-width: 1; }
  .tick { font-size: 10px; fill: color-mix(in srgb, var(--ink) 55%, transparent); font-variant-numeric: tabular-nums; }

  .svd { fill: none; stroke: var(--accent); stroke-width: 1.5; stroke-dasharray: 5 4; }

  .sig-axes line {
    stroke: var(--accent);
    stroke-width: 1.5;
  }

  .sig-label {
    fill: var(--accent);
    font-size: 12px;
    font-style: italic;
  }

  .marg { fill: color-mix(in srgb, var(--ink) 28%, transparent); }
  .marg.pos { fill: color-mix(in srgb, var(--ink) 55%, transparent); }
  .median { fill: var(--ink); }

  .hover-ring { fill: none; stroke: var(--accent); stroke-width: 1.5; }

  .hl-dot {
    fill: var(--accent);
    stroke: var(--paper);
    stroke-width: 1.5;
  }

  .hl-label {
    position: absolute;
    transform: translate(-50%, -165%);
    white-space: nowrap;
    font-size: 12px;
    font-style: italic;
    color: var(--accent);
    background: color-mix(in srgb, var(--paper) 78%, transparent);
    padding: 0 3px;
    border-radius: 2px;
  }

  .hover-cell {
    fill: color-mix(in srgb, var(--accent) 15%, transparent);
    stroke: var(--accent);
    stroke-width: 1.5;
  }

  .traj path {
    fill: none;
    stroke-width: 2;
    stroke-linecap: round;
    stroke-linejoin: round;
    opacity: 0.9;
  }

  .traj-head {
    fill: var(--paper);
    stroke: var(--ink);
    stroke-width: 1.5;
  }

  .traj-mark {
    fill: var(--ink);
    stroke: var(--paper);
    stroke-width: 1;
  }

  .traj-label {
    position: absolute;
    transform: translate(-50%, -150%);
    white-space: nowrap;
    font-size: 10.5px;
    font-style: italic;
    color: var(--ink);
    background: color-mix(in srgb, var(--paper) 85%, transparent);
    padding: 0 4px;
    border-radius: 2px;
  }

  .traj-label.below {
    transform: translate(-50%, 55%);
  }

  /* Read-along words: surface at the wake head, rise, and dissolve. */
  .flot {
    position: absolute;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    font-style: italic;
    color: var(--ink);
    opacity: 0;
    animation: flot-rise 2s ease-out forwards;
  }

  @keyframes flot-rise {
    0% {
      opacity: 0;
      translate: 0 8px;
    }
    15% {
      opacity: 0.85;
    }
    70% {
      opacity: 0.45;
    }
    100% {
      opacity: 0;
      translate: 0 -18px;
    }
  }

  .mm-bg {
    fill: color-mix(in srgb, var(--paper) 90%, transparent);
    stroke: color-mix(in srgb, var(--ink) 25%, transparent);
  }

  .mm-axis {
    stroke: color-mix(in srgb, var(--ink) 15%, transparent);
  }

  .mm-win {
    fill: color-mix(in srgb, var(--accent) 25%, transparent);
    stroke: var(--accent);
    stroke-width: 1;
  }

  .mm-hint {
    font-size: 10px;
    letter-spacing: 0.03em;
    font-variant: small-caps;
    fill: color-mix(in srgb, var(--ink) 70%, transparent);
  }

  .labels { position: absolute; pointer-events: none; }
  .boundary-label, .ray-label { position: absolute; white-space: nowrap; font-size: 11px; line-height: 1; }
  .boundary-label { color: var(--ink); }
  .ray-label {
    transform: translate(-50%, -130%);
    color: color-mix(in srgb, var(--ink) 60%, transparent);
    font-style: italic;
    font-size: 10.5px;
  }

  .compass-tick { stroke: var(--ink); stroke-width: 1.5; }
  .compass-label {
    position: absolute;
    transform: translate(-50%, -50%);
    white-space: nowrap;
    letter-spacing: 0.05em;
    font-variant: small-caps;
    color: var(--ink);
    background: color-mix(in srgb, var(--paper) 82%, transparent);
    padding: 0 4px;
    border-radius: 2px;
  }

  .pole {
    font-size: 11.5px;
    letter-spacing: 0.04em;
    font-variant: small-caps;
    fill: color-mix(in srgb, var(--ink) 75%, transparent);
  }

  .tooltip {
    position: absolute;
    transform: translate(-50%, -100%);
    background: var(--ink);
    color: var(--paper);
    padding: 4px 8px;
    border-radius: 3px;
    font-size: 12px;
    pointer-events: none;
    white-space: nowrap;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .tooltip span { font-size: 10px; opacity: 0.75; font-variant-numeric: tabular-nums; }

  /* Binned-cell variant: a word-list panel rather than a one-liner. */
  .tooltip.cell {
    max-width: 240px;
    white-space: normal;
  }

  .tooltip.below {
    transform: translate(-50%, 0);
  }

  .tooltip .cell-words {
    font-size: 10px;
    line-height: 1.45;
    opacity: 0.85;
    font-variant-numeric: normal;
  }

  @media (prefers-reduced-motion: no-preference) {
    .boundary-label, .ray-label { transition: left 300ms, top 300ms; }
  }
</style>
