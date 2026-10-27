# Dev Log

Project memory for agents. Newest entry first. One entry per work session or checkpoint.

<!-- dev-log:entries -->

## 2026-10-27 09:27 — Enlarged Salem network arrowheads

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Make arrowheads on the network links easier to see.
- **Code:** `src/lib/stories/salem-witches/components/ScrollyPlot.svelte` increases all three SVG markers from 6 to 8 screen units while retaining zoom compensation.
- **Why:** A modest uniform size increase improves visibility without changing link geometry or marker proportions.
- **Verified:** `npm run check` passes with 0 errors and 7 pre-existing warnings.
- **Open:** None for this change.
- **Git:** `main` @ `b194f56`; unrelated working-tree changes remain.

## 2026-10-27 09:15 — Raised Salem self-loop rings above sprites

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Keep the red self-loop circles visible on top of node sprites in the network graph.
- **Code:** `src/lib/stories/salem-witches/components/ScrollyPlot.svelte` renders the self-loop group after the node group.
- **Why:** SVG paint order put the rings behind subsequently rendered sprites; moving the group fixes the layering without changing geometry or styling.
- **Verified:** `npm run check` passes with 0 errors and 7 pre-existing warnings.
- **Open:** None for this change.
- **Git:** `main` @ `b194f56`; unrelated Salem copy and image changes were already uncommitted.
