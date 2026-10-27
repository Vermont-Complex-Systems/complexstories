# Dev Log

Project memory for agents. Newest entry first. One entry per work session or checkpoint.

<!-- dev-log:entries -->

## 2026-10-27 15:49 — Made Salem illustrations mobile-responsive

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Make every story illustration scale to small screens and remain centered on phones.
- **Code:** `src/lib/stories/salem-witches/components/Index.svelte` gives `.story-illo` fluid sizing and automatic horizontal margins; at 768px and below, paired illustrations stack vertically and the portrait grid becomes two centered columns.
- **Why:** Fluid width prevents large network illustrations from overflowing, while stacking and two-column portraits preserve readability instead of shrinking every image into a single row.
- **Verified:** `npm run check` passes with 0 errors and 6 existing warnings.
- **Open:** Browser visual review on a physical or emulated phone not run.
- **Git:** `main` @ `8853c85`.

## 2026-10-27 15:39 — Limited Salem self-loop rings to five

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Draw five red self-accusation rings instead of seven.
- **Code:** `src/lib/stories/salem-witches/components/ScrollyPlot.svelte` limits `selfView` to the first five self-loop links before rendering.
- **Why:** The requested ring count is a presentational cap; retaining the first five is deterministic, and the source data remains unchanged.
- **Verified:** `npm run check` passes with 0 errors and 6 existing warnings.
- **Open:** The source JSON still contains seven distinct self-loop people; only the ring rendering is capped at five per request.
- **Git:** `main` @ `5900d56`; unrelated story changes remain uncommitted.

## 2026-10-27 10:08 — Intensified Salem illustration tilt animation

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Make the paired header illustrations rotate faster and more dramatically.
- **Code:** `src/lib/stories/salem-witches/components/Index.svelte` shortens the alternating tilt durations from 1.6s/1.4s to 0.9s/0.8s and widens rotation from −2.5°…4.5° to −4.5°…8°.
- **Why:** Roughly doubling angular travel while shortening the cycle makes the existing motion noticeably livelier; reduced-motion behavior remains unchanged.
- **Verified:** `npm run check` passes with 0 errors and 6 existing warnings.
- **Open:** None for this change.
- **Git:** `main` @ `ac3acd9`; unrelated `copy.json` changes remain uncommitted.

## 2026-10-27 10:04 — Enlarged Salem header subtitle and spaced author line

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Increase the StoryHeader subtitle size and add more space above the author text.
- **Code:** `src/lib/stories/salem-witches/components/Index.svelte` styles the header `h2` with `--vcsi-font-size-xl` (2.5rem on mobile) and gives `.author` a `--vcsi-space-xl` top margin.
- **Why:** The scrolly-kit reference requires `:global()` for elements rendered inside imported components; scoping those selectors under `.story` keeps the overrides local to Salem.
- **Verified:** `npm run check` passes with 0 errors and 7 existing warnings.
- **Open:** Browser visual review not run.
- **Git:** `main` @ `ac3acd9`; unrelated `copy.json` changes remain uncommitted.

## 2026-10-27 09:46 — Diversified Salem margin illustrations

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Use four distinct side illustrations rather than repeating the first two.
- **Code:** `src/lib/stories/salem-witches/components/Index.svelte` imports `girl-demon.jpg` and `horns-girl.jpg` as `girlDemon` and `hornsGirl`, replacing the repeated conclusion decorations.
- **Verified:** `npm run check` passes with 0 errors and 7 pre-existing warnings.
- **Open:** None for this change.
- **Git:** `main` @ `ac3acd9`.

## 2026-10-27 09:41 — Added Salem margin illustrations

- **Agent:** opencode / kimi-k3.1-pro
- **Intent:** Spread `demonGirl` and `accuserGirl` illustrations down the sides of the story as non-interactive decoration.
- **Code:** `src/lib/stories/salem-witches/components/Index.svelte` anchors four decorative images outside the introduction, curve introduction, and conclusion prose; they are hidden below 1024px.
- **Why:** Anchoring decorations to prose sections keeps them clear of the full-width scrolly graphics while letting them scroll naturally with the story. Empty alt text, `aria-hidden`, and disabled pointer events keep them purely decorative.
- **Verified:** `npm run check` passes with 0 errors and 7 pre-existing warnings.
- **Open:** Browser visual review not run.
- **Git:** `main` @ `ac3acd9`.

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
