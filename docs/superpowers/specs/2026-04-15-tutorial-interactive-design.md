# Tutorial Interactive Design

**Date:** 2026-04-15
**Status:** Ready for implementation planning
**Scope:** `apps/web/src/tutorial/` + `apps/web/src/App.tsx` routing fixes

---

## Problem Statement

The `/tutorial` page is passive and has several broken navigation flows:

1. **Tutorial is non-interactive.** Canvas has all interaction disabled. `SpotlightOverlay` returns `null`. Node highlights are CSS-only with no spotlight/dim effect. The "Try it" hints say "In the studio: click..." but the user is stuck in a read-only view.
2. **"Open Studio" and "Skip tutorial" land on the landing page.** Both call `router.push("/")`, which mounts `BuilderApp` with `mode === "landing"` — the user must click "Open Studio" again.
3. **Demo param detection has no Strict Mode guard.** The `demo=1` `useEffect` has an empty deps array with an `eslint-disable-line` suppressing the missing dep. Under `reactStrictMode: true` it fires twice on mount.
4. **Tutorial page is SSR'd.** `TutorialPage` is a `"use client"` component imported directly by a server page component. ReactFlow has SSR quirks; it should be wrapped in `dynamic(ssr: false)` like the studio.

---

## Goals

- Tutorial steps feel interactive and respond to user actions.
- Navigation from tutorial → studio is direct (no landing-page detour).
- Highlight system uses a real spotlight overlay (dim + cutout) not just a CSS pulse.
- Wire selector step is clickable and live-updates the canvas edge.
- Deploy and Run steps demonstrate the action with a scripted mock animation.
- Transitions between steps animate both exit and entrance (not just entrance).
- Code changes are self-contained to `apps/web/src/tutorial/` and minimal edits to `App.tsx`.

---

## Dependencies

**Add `framer-motion` to `apps/web/package.json`:**

```json
"framer-motion": "^12.0.0"
```

Import pattern throughout tutorial files:
```ts
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
```

Framer Motion is isolated to the `/tutorial` route bundle — it does not affect the studio chunk.

---

## Architecture

### Navigation fixes (App.tsx + TutorialPage.tsx)

**New URL contract:**

| param | meaning |
|---|---|
| `?studio=1` | Skip landing, open BuilderApp in studio mode |
| `?demo=1` | Skip landing, load example pipeline, open studio |

**`apps/web/src/App.tsx` — replace lines 875–879:**

Replace the bare `window.location.search.includes("demo=1")` effect with a single once-guarded effect:

```ts
const routedOnceRef = useRef(false);

useEffect(() => {
  if (routedOnceRef.current) return;
  routedOnceRef.current = true;
  const params = new URLSearchParams(window.location.search);
  if (params.has("demo")) {
    handleLoadExample();
  } else if (params.has("studio")) {
    setMode("studio");
  }
}, [handleLoadExample]);
```

The `useRef` guard prevents double-fire under Strict Mode. `handleLoadExample` is added to deps (removing the `eslint-disable-line`). `handleLoadExample` already calls `setMode("studio")` so no separate branch needed for it.

**`apps/web/src/tutorial/TutorialPage.tsx` — navigation callsites:**

| location | old | new |
|---|---|---|
| `handleNext` (last step) | `router.push("/")` | `router.push("/?studio=1")` |
| `handleSkip` | `router.push("/")` | `router.push("/?studio=1")` |
| Final CTA "Open Studio" | `<a href="/">` | `<button onClick={() => router.push("/?studio=1")}>` |
| Final CTA "Load demo" | `<a href="/?demo=1">` | `<button onClick={() => router.push("/?demo=1")}>` |

**`apps/web/src/tutorial/TutorialPageClient.tsx` — new file:**

```tsx
"use client";
import dynamic from "next/dynamic";
const TutorialPage = dynamic(
  () => import("./TutorialPage").then(m => ({ default: m.TutorialPage })),
  { ssr: false }
);
export function TutorialPageClient() { return <TutorialPage />; }
```

**`apps/web/app/tutorial/page.tsx` — update import:**

```tsx
import { TutorialPageClient } from "../../src/tutorial/TutorialPageClient";
export default function Tutorial() { return <TutorialPageClient />; }
```

---

### Step content transitions (Framer Motion)

Replace the CSS `key`-trick entrance-only animation with `AnimatePresence` for true exit + entrance.

**Variants:**
```ts
const stepVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15, ease: "easeIn" } },
};
```

**In the instruction pane:**
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={step}
    variants={stepVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    className="tutorial-step-content"
  >
    <h2 className="tutorial-step-title">{current.title}</h2>
    <p className="tutorial-step-body">{current.body}</p>
    {/* actionHint / inspector / log stream */}
  </motion.div>
</AnimatePresence>
```

`mode="wait"` ensures exit completes before entrance begins (~150ms total gap, imperceptible as a pause).

**CSS:** `.tutorial-step-content` only needs layout rules (no animation property — Framer Motion owns it):
```css
.tutorial-step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}
```

Remove `.tutorial-step-content { animation: tourFadeIn ... }` from the original CSS plan.

---

### Progress dots (Framer Motion layout)

Replace plain `<span>` with `<motion.span layout>`. Framer Motion's `layout` prop automatically spring-animates width and border-radius between renders — no CSS `transition` needed on `.tour-dot`.

```tsx
<nav aria-label="Tutorial steps" className="tour-dots">
  {Array.from({ length: TOTAL_STEPS }, (_, i) => (
    <motion.span
      key={i}
      layout
      className={
        i + 1 < step  ? "tour-dot tour-dot-past" :
        i + 1 === step ? "tour-dot tour-dot-active" :
        "tour-dot"
      }
      aria-label={`Step ${i + 1}`}
      aria-current={i + 1 === step ? "step" : undefined}
      transition={{ type: "spring", stiffness: 500, damping: 35 }}
    />
  ))}
</nav>
```

**CSS changes (`.tour-dot` only):**
```css
/* Remove: transition: width 250ms ease, background 250ms ease; */
/* Add: */
.tour-dot-active { width: 18px; border-radius: 3px; }
.tour-dot-past   { background: rgba(45, 219, 118, 0.35); }
/* background color transition still needed (layout only handles geometry): */
.tour-dot { transition: background 220ms ease; }
```

---

### Spotlight overlay system (Framer Motion springs)

**Replace `SpotlightOverlay.tsx` — full rewrite as `TutorialSpotlight.tsx`.**

Instead of SVG clip-path, use a positioned `<motion.div>` with `box-shadow: 0 0 0 9999px rgba(3,7,5,0.68)` to create the veil. Position and size spring-animate via `useSpring` when the highlighted node changes.

```
interface TutorialSpotlightProps {
  highlightNodeId?: string;
  active: boolean;   // false on step 1 (welcome) and step 8 (ready)
}
```

Node dimensions (constants): `{ agent: [246, 220], trigger: [246, 140], end: [246, 140] }`

**Internal mechanics:**
```ts
const mX = useMotionValue(0);
const mY = useMotionValue(0);
const mW = useMotionValue(246);
const mH = useMotionValue(140);

const springX = useSpring(mX, { stiffness: 350, damping: 32 });
const springY = useSpring(mY, { stiffness: 350, damping: 32 });
const springW = useSpring(mW, { stiffness: 350, damping: 32 });
const springH = useSpring(mH, { stiffness: 350, damping: 32 });
```

When `highlightNodeId` changes, call `rfInstance.flowToScreenPosition(node.position)` (via `useReactFlow()`), subtract the canvas wrapper's `getBoundingClientRect()` origin to get local coordinates, then call `mX.set(...)`, `mY.set(...)`, etc. A `ResizeObserver` on `.tutorial-canvas-wrap` triggers recalculation on layout change.

**Render output:**
```tsx
<motion.div
  aria-hidden="true"
  style={{
    position: "absolute",
    borderRadius: 18,
    boxShadow: "0 0 0 9999px rgba(3, 7, 5, 0.68)",
    border: "2px solid rgba(45, 219, 118, 0.65)",
    filter: "drop-shadow(0 0 14px rgba(45, 219, 118, 0.45))",
    pointerEvents: "none",
    zIndex: 10,
    x: springX,
    y: springY,
    width: springW,
    height: springH,
  }}
  initial={{ opacity: 0 }}
  animate={{ opacity: active ? 1 : 0 }}
  transition={{ duration: 0.25 }}
/>
```

This renders inside `.tutorial-canvas-wrap` (which already has `position: relative`). Must be inside `<ReactFlowProvider>` — already satisfied.

For edge highlighting (step 4, `highlightEdgeId`): position the spotlight over the edge midpoint. Since both nodes have known positions and the edge runs between them, compute midpoint in flow space and convert. Size: `120×32px` (a narrow pill highlighting the wire).

**Removed from CSS plan:** `@keyframes tutSpotlightFadeIn` — Framer Motion owns opacity.

---

### Interactive node inspection (steps 2, 3, 5)

**New component: `apps/web/src/tutorial/TutorialInspector.tsx`**

Read-only display of node properties. No callbacks, no editable fields.

```ts
interface TutorialInspectorProps {
  nodeType: "trigger" | "agent" | "end";
  nodeData: typeof TUTORIAL_NODES[number]["data"];
}
```

Renders a `<dl>` of key-value rows. Per node type:
- **Trigger:** label, description, HTTP method, test body preview (truncated 60 chars)
- **Agent:** label, description, role, system prompt preview (italicized, truncated 80 chars), price per call, enabled tools as pills
- **End:** label, description

CSS classes: `.tut-inspector`, `.tut-inspector-row`, `.tut-inspector-key`, `.tut-inspector-val`, `.tut-inspector-pill`, `.tut-inspector-prompt`, `.tut-click-hint`

**State in `TutorialPage`:** `const [inspectorOpen, setInspectorOpen] = useState(false)`

**Instruction pane logic:** When `current.highlightNodeId` is set and `!inspectorOpen`, render `.tut-click-hint` ("Click the highlighted node to inspect"). When `inspectorOpen`, show `TutorialInspector`.

**Inspector animate-in with Framer Motion:**
```tsx
<AnimatePresence>
  {inspectorOpen && (
    <motion.div
      initial={{ opacity: 0, height: 0, overflow: "hidden" }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <TutorialInspector nodeType={...} nodeData={...} />
    </motion.div>
  )}
</AnimatePresence>
```

**Click capture:** `TutorialCanvas` receives `onNodeClick: (nodeId: string) => void`. A transparent hit-target `<div>` is absolutely positioned over the highlighted node (same coordinates as `TutorialSpotlight`) inside `.tutorial-canvas-wrap`. Clicking calls `onNodeClick(highlightNodeId)`. ReactFlow `elementsSelectable={false}` stays.

**Reset:** `setInspectorOpen(false)` in `handleNext` and `handlePrev`.

---

### Interactive wire selector (step 4)

**State in `TutorialPage`:** `const [previewWire, setPreviewWire] = useState<WireKind>("a2a")`

`TutorialCanvas` receives `previewWire` and `onWireSelect` props. When `step === 4`, edge `tut-e1` uses `previewWire` as its wireType instead of the static `"a2a"`.

The wire callout pills become `<button>` elements with `.tutorial-wire-pill-active` on the selected one.

**Wire description animates with Framer Motion:**
```tsx
<AnimatePresence mode="wait">
  <motion.p
    key={previewWire}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.12 }}
    className="tutorial-btn-caption"
  >
    {wireDescriptions[previewWire]}
  </motion.p>
</AnimatePresence>
```

```ts
const wireDescriptions: Record<WireKind, string> = {
  a2a: "Routes reasoning between agents",
  x402: "Agent pays the tool per call",
  algo_transfer: "Direct ALGO transfer between wallets",
};
```

**CSS:**
```css
.tutorial-wire-pill { transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
.tutorial-wire-a2a.tutorial-wire-pill-active  { box-shadow: 0 0 8px rgba(139,92,246,0.5); border-width:2px; background:rgba(139,92,246,0.2); }
.tutorial-wire-x402.tutorial-wire-pill-active { box-shadow: 0 0 8px rgba(16,185,129,0.5);  border-width:2px; background:rgba(16,185,129,0.2); }
.tutorial-wire-algo.tutorial-wire-pill-active  { box-shadow: 0 0 8px rgba(37,99,235,0.5);   border-width:2px; background:rgba(37,99,235,0.2); }
```

Remove `pointer-events: none` from `.tutorial-wire-callout`. Leave it on `.tutorial-btn-callout` for non-interactive callout steps.

**Reset:** `setPreviewWire("a2a")` in `handleNext`/`handlePrev`.

---

### Deploy mock animation (step 6)

**State in `TutorialPage`:**
```ts
const [deployState, setDeployState] = useState<"idle" | "pending" | "done">("idle");
const [tutNodes, setTutNodes] = useState(TUTORIAL_NODES);
```

`TutorialCanvas` receives `tutNodes`, `deployState`, `onMockDeploy` props. Replace static `TUTORIAL_NODES.map(...)` with `tutNodes.map(...)`.

The mock Deploy button in the callout becomes a real `<button>` (`pointer-events: none` removed from `.tutorial-btn-callout`).

`handleMockDeploy` in `TutorialPage`:
```ts
async function handleMockDeploy() {
  setDeployState("pending");
  await sleep(1200);
  setTutNodes(ns => ns.map(n =>
    n.id === "tut-agent"
      ? { ...n, data: { ...n.data, walletAddress: "ABCD12...9EF0", balanceAlgo: 0 } }
      : n
  ));
  await sleep(400);
  setDeployState("done");
}
```

(`sleep` helper already exists in `App.tsx:80` — copy to `TutorialPage.tsx`)

Button states: `idle → "Deploy"`, `pending → "Deploying..."` (`tourGlow` animation), `done → "Deployed"` (green border + text, `disabled`).

**Reset:** `setDeployState("idle")`, `setTutNodes(TUTORIAL_NODES)` in `handleNext`/`handlePrev`.

---

### Run mock animation + log stream (step 7)

**State in `TutorialPage`:** `const [runState, setRunState] = useState<"idle" | "pending" | "done">("idle")`

**New component: `apps/web/src/tutorial/TutorialLogStream.tsx`**

Props: `{ visible: boolean }`. Uses `useState<number>` for revealed count and `useEffect` + `setInterval` (300ms) to increment.

Entries appear via `AnimatePresence` + `motion.div`:
```tsx
<AnimatePresence>
  {MOCK_LOGS.slice(0, revealed).map((log, i) => (
    <motion.div
      key={i}
      className="console-line tut-log-line"
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* time / level / node / message */}
    </motion.div>
  ))}
</AnimatePresence>
```

```ts
const MOCK_LOGS = [
  { time: "00:00:01", level: "info",    node: "tut-trigger", message: "Request received" },
  { time: "00:00:01", level: "info",    node: "tut-agent",   message: "Planning tool selection" },
  { time: "00:00:02", level: "success", node: "tut-agent",   message: "search tool called" },
  { time: "00:00:03", level: "success", node: "tut-end",     message: "Pipeline result returned" },
];
```

Reuses existing `.console-block`, `.console-line`, `.console-time`, `.console-node`, `.console-message` CSS. New container `.tut-log-stream` only.

`handleMockRun` in `TutorialPage`:
```ts
async function handleMockRun() {
  setRunState("pending");
  setTutNodes(ns => ns.map(n =>
    n.id === "tut-agent" ? { ...n, data: { ...n.data, executionState: "running" } } : n
  ));
  await sleep(2000);
  setTutNodes(ns => ns.map(n => ({
    ...n,
    data: {
      ...n.data,
      executionState: "done",
      executionNote: n.id === "tut-end" ? "Pipeline result returned." : undefined,
    },
  })));
  setRunState("done");
}
```

Run button: `idle → "Run"`, `pending → "Running..."`, `done → "Done"`.

**Reset:** `setRunState("idle")`, `setTutNodes(TUTORIAL_NODES)` in `handleNext`/`handlePrev`.

**Removed from CSS plan:** `@keyframes tutStreamIn` — Framer Motion owns the log line entrance.

---

## File change summary

| File | Change type | Notes |
|---|---|---|
| `apps/web/package.json` | Edit | Add `"framer-motion": "^12.0.0"` |
| `apps/web/src/App.tsx` | Edit | Replace `demo=1` effect (lines 875–879) with once-guarded `studio=1`/`demo=1` handler; add `useRef` |
| `apps/web/src/tutorial/TutorialPage.tsx` | Edit | Navigation fixes, new state, AnimatePresence step transitions, motion dots, CTA buttons, new canvas props |
| `apps/web/src/tutorial/tutorialSteps.ts` | Edit (minor) | Optional: add `inspectorFields?: string[]` to `TutorialStep` interface |
| `apps/web/src/tutorial/SpotlightOverlay.tsx` | Rewrite | Full rewrite as `TutorialSpotlight` — div + box-shadow + useSpring |
| `apps/web/src/tutorial/TutorialInspector.tsx` | New | Read-only node property display |
| `apps/web/src/tutorial/TutorialLogStream.tsx` | New | AnimatePresence mock log stream for step 7 |
| `apps/web/src/tutorial/TutorialPageClient.tsx` | New | `dynamic(ssr:false)` wrapper |
| `apps/web/app/tutorial/page.tsx` | Edit | Import `TutorialPageClient` |
| `apps/web/src/styles/app.css` | Edit (append) | New classes listed below |

### New / updated CSS (append after line 2863)

```css
/* Step content layout — animation owned by Framer Motion */
.tutorial-step-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  min-height: 0;
}

/* Progress dots — geometry animated by Framer Motion layout */
.tour-dot        { transition: background 220ms ease; }
.tour-dot-active { width: 18px; border-radius: 3px; }
.tour-dot-past   { background: rgba(45, 219, 118, 0.35); }

/* Wire pills */
.tutorial-wire-pill { transition: background 180ms ease, border-color 180ms ease, box-shadow 180ms ease; }
.tutorial-wire-a2a.tutorial-wire-pill-active  { box-shadow: 0 0 8px rgba(139,92,246,0.5); border-width:2px; background:rgba(139,92,246,0.2); }
.tutorial-wire-x402.tutorial-wire-pill-active { box-shadow: 0 0 8px rgba(16,185,129,0.5);  border-width:2px; background:rgba(16,185,129,0.2); }
.tutorial-wire-algo.tutorial-wire-pill-active  { box-shadow: 0 0 8px rgba(37,99,235,0.5);   border-width:2px; background:rgba(37,99,235,0.2); }

/* Inspector */
.tut-inspector       { padding:14px; border-left:3px solid #2ddb76; background:rgba(45,219,118,0.06); border-radius:0 10px 10px 0; }
.tut-inspector-row   { display:flex; justify-content:space-between; font-size:12px; padding:3px 0; border-bottom:1px solid rgba(72,136,98,0.12); }
.tut-inspector-key   { color:#4a7060; }
.tut-inspector-val   { color:#9effc3; font-family:var(--font-jetbrains-mono,"JetBrains Mono",monospace); font-size:11px; }
.tut-inspector-pill  { padding:2px 7px; border-radius:6px; font-size:10px; background:rgba(45,219,118,0.1); border:1px solid rgba(45,219,118,0.3); color:#78f0a6; }
.tut-inspector-prompt { font-size:11px; color:#5a7a6a; font-style:italic; line-height:1.5; margin-top:6px; }
.tut-click-hint      { font-size:11px; color:#4a7060; text-align:center; padding:8px; border:1px dashed rgba(72,136,98,0.3); border-radius:8px; cursor:pointer; }

/* Log stream */
.tut-log-stream { max-height:120px; overflow:hidden; margin-top:8px; border-radius:10px; border:1px solid rgba(72,136,98,0.2); background:rgba(6,11,9,0.9); padding:8px 10px; font-size:11px; }
```

Keyframes **not** needed (Framer Motion handles): `tutStreamIn`, `tutSpotlightFadeIn`, `tutorial-step-content` entrance animation.

---

## Framer Motion usage map

| Feature | API used | Why |
|---|---|---|
| Step exit + entrance | `AnimatePresence mode="wait"` + `motion.div` variants | CSS `key` trick only animates entrance, not exit |
| Progress dot width | `motion.span layout` | Spring-interpolates geometry changes for free |
| Spotlight position | `useMotionValue` + `useSpring` | Smooth glide between node positions on step change |
| Spotlight visibility | `motion.div` `animate={{ opacity }}` | Clean fade without a separate CSS keyframe |
| Inspector slide-in | `AnimatePresence` + `motion.div` `height: 0 → auto` | Avoids fixed-height hacks |
| Wire description swap | `AnimatePresence mode="wait"` + `motion.p` | Crossfades text between wire types |
| Log line entrance | `AnimatePresence` + `motion.div` per entry | Sequential reveal with stagger |

---

## TutorialCanvas props (updated)

```ts
interface TutorialCanvasProps {
  step: number;
  previewWire: WireKind;
  onWireSelect: (w: WireKind) => void;
  onNodeClick: (nodeId: string) => void;
  tutNodes: typeof TUTORIAL_NODES;
  deployState: "idle" | "pending" | "done";
  runState: "idle" | "pending" | "done";
  onMockDeploy: () => void;
  onMockRun: () => void;
}
```

---

## New state in TutorialPage

```ts
const [inspectorOpen, setInspectorOpen] = useState(false);
const [previewWire, setPreviewWire] = useState<WireKind>("a2a");
const [deployState, setDeployState] = useState<"idle" | "pending" | "done">("idle");
const [runState, setRunState]         = useState<"idle" | "pending" | "done">("idle");
const [tutNodes, setTutNodes]         = useState(TUTORIAL_NODES);

// Reset all in handleNext and handlePrev:
setInspectorOpen(false);
setPreviewWire("a2a");
setDeployState("idle");
setRunState("idle");
setTutNodes(TUTORIAL_NODES);
```

---

## Accessibility

- `TutorialSpotlight` div: `aria-hidden="true"` (decorative)
- `TutorialInspector` wrapper: `role="region" aria-label="Node properties"`
- Progress dots `<nav>`: `aria-label="Tutorial steps"`; each dot `aria-label="Step N"`; active dot `aria-current="step"`
- Wire selector pills: `role="radiogroup"`; each pill `role="radio" aria-checked={...}`
- Mock Deploy/Run buttons: `aria-busy={state === "pending"}`
- `AnimatePresence` motion divs: no extra aria needed (content inside carries semantics)

---

## Out of scope

- Real backend calls from the tutorial
- Persisting tutorial progress across sessions
- Mobile layout changes (existing responsive breakpoint at 900px stays)
- Any changes to the studio (`App.tsx`) beyond the routing useEffect fix
- Framer Motion in any file outside `apps/web/src/tutorial/`
