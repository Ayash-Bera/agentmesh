"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Background,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { WireEdge } from "../edges/WireEdge";
import { AgentNode } from "../nodes/AgentNode";
import { EndNode } from "../nodes/EndNode";
import { TriggerNode } from "../nodes/TriggerNode";
import { TutorialInspector } from "./TutorialInspector";
import { TutorialLogStream } from "./TutorialLogStream";
import { TutorialSpotlight } from "./TutorialSpotlight";
import {
  TUTORIAL_EDGES,
  TUTORIAL_NODES,
  TUTORIAL_STEPS,
  type TutorialStep,
} from "./tutorialSteps";
import type { BuilderEdge, BuilderNode, PipelineNodeData, WireKind } from "../types/pipeline";

type TutorialNodeState = {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Partial<PipelineNodeData> & { kind: PipelineNodeData["kind"]; label: string };
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sleep(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

const wireDescriptions: Record<WireKind, string> = {
  a2a: "Routes reasoning between agents",
  x402: "Agent pays the tool per call",
  algo_transfer: "Direct ALGO transfer between wallets",
};

const stepVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: "easeOut" as const } },
  exit:    { opacity: 0, y: -6, transition: { duration: 0.15, ease: "easeIn" as const } },
};

// ---------------------------------------------------------------------------
// Node / edge type registrations
// ---------------------------------------------------------------------------

const nodeTypes = {
  agent: AgentNode,
  trigger: TriggerNode,
  end: EndNode,
};

const edgeTypes = {
  wire: WireEdge,
};

const TOTAL_STEPS = TUTORIAL_STEPS.length;

// ---------------------------------------------------------------------------
// TutorialCanvas
// ---------------------------------------------------------------------------

interface TutorialCanvasProps {
  step: number;
  previewWire: WireKind;
  onWireSelect: (w: WireKind) => void;
  onNodeClick: (nodeId: string) => void;
  tutNodes: TutorialNodeState[];
  deployState: "idle" | "pending" | "done";
  runState: "idle" | "pending" | "done";
  onMockDeploy: () => void;
  onMockRun: () => void;
}

function TutorialCanvas({
  step,
  previewWire,
  onWireSelect,
  onNodeClick,
  tutNodes,
  deployState,
  runState,
  onMockDeploy,
  onMockRun,
}: TutorialCanvasProps) {
  const current = TUTORIAL_STEPS[step - 1];

  const nodes: BuilderNode[] = tutNodes.map((node) => ({
    ...node,
    className: current.highlightNodeId === node.id ? "tutorial-pulse-node" : "",
  })) as BuilderNode[];

  const edges: BuilderEdge[] = TUTORIAL_EDGES.map((edge) => ({
    ...edge,
    data: {
      ...edge.data,
      wireType: step === 4 && edge.id === "tut-e1" ? previewWire : edge.data.wireType,
    },
    className: current.highlightEdgeId === edge.id ? "tutorial-pulse-edge" : "",
  })) as BuilderEdge[];

  const isDeployStep = current.highlightTarget === "deploy-btn";
  const isRunStep    = current.highlightTarget === "run-btn";
  const mockState    = isDeployStep ? deployState : runState;
  const mockLabel    = isDeployStep
    ? (deployState === "idle" ? "Deploy" : deployState === "pending" ? "Deploying..." : "Deployed")
    : (runState    === "idle" ? "Run"    : runState    === "pending" ? "Running..."   : "Done");

  return (
    <div className="tutorial-canvas-wrap">
      <ReactFlow
        connectionMode={ConnectionMode.Loose}
        edgeTypes={edgeTypes}
        edges={edges}
        elementsSelectable={false}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        nodeTypes={nodeTypes}
        nodes={nodes}
        nodesDraggable={false}
        nodesConnectable={false}
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
      >
        <Background color="#113023" gap={28} />
      </ReactFlow>

      {/* Spotlight overlay — springs between highlighted nodes */}
      <TutorialSpotlight
        highlightNodeId={current.highlightNodeId}
        highlightEdgeId={current.highlightEdgeId}
        active={Boolean(current.highlightNodeId || current.highlightEdgeId)}
      />

      {/* Transparent click-capture over the canvas for node inspection steps */}
      {current.highlightNodeId ? (
        <div
          style={{ position: "absolute", inset: 0, zIndex: 11, cursor: "pointer" }}
          onClick={() => onNodeClick(current.highlightNodeId!)}
        />
      ) : null}

      {/* Wire selector callout — step 4 */}
      {current.highlightTarget === "wire-selector" ? (
        <div className="tutorial-wire-callout">
          <div className="tutorial-wire-mock" role="radiogroup" aria-label="Wire type selector">
            {(["a2a", "x402", "algo_transfer"] as WireKind[]).map((w) => {
              const colorClass =
                w === "a2a" ? "tutorial-wire-a2a" :
                w === "x402" ? "tutorial-wire-x402" :
                "tutorial-wire-algo";
              const label =
                w === "a2a" ? "Purple Wire" :
                w === "x402" ? "Green Wire" :
                "Blue Wire";
              return (
                <button
                  key={w}
                  type="button"
                  role="radio"
                  aria-checked={previewWire === w}
                  className={[
                    "tutorial-wire-pill",
                    colorClass,
                    previewWire === w ? "tutorial-wire-pill-active" : "",
                  ].filter(Boolean).join(" ")}
                  onClick={() => onWireSelect(w)}
                >
                  {label}
                </button>
              );
            })}
          </div>
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
        </div>
      ) : null}

      {/* Deploy / Run mock callout — steps 6 and 7 */}
      {(isDeployStep || isRunStep) ? (
        <div className="tutorial-btn-callout">
          <button
            type="button"
            aria-busy={mockState === "pending"}
            disabled={mockState === "done"}
            className={[
              "tutorial-btn-mock",
              mockState === "done" ? "tutorial-btn-mock-done" : "",
            ].filter(Boolean).join(" ")}
            onClick={isDeployStep ? onMockDeploy : onMockRun}
          >
            {mockLabel}
          </button>
          <p className="tutorial-btn-caption">
            {isDeployStep
              ? "Top-right of the studio topbar"
              : "Top-right, next to Deploy"}
          </p>
        </div>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// TutorialPage
// ---------------------------------------------------------------------------

export function TutorialPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const current: TutorialStep = TUTORIAL_STEPS[step - 1];
  const isLast = step === TOTAL_STEPS;

  // New interactive state
  const [inspectorOpen, setInspectorOpen] = useState(false);
  const [previewWire, setPreviewWire]     = useState<WireKind>("a2a");
  const [deployState, setDeployState]     = useState<"idle" | "pending" | "done">("idle");
  const [runState, setRunState]           = useState<"idle" | "pending" | "done">("idle");
  const [tutNodes, setTutNodes]           = useState<TutorialNodeState[]>(TUTORIAL_NODES);

  // Guard async callbacks against post-unmount state updates
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  // Reset all interactive state when navigating between steps
  const resetStepState = useCallback(() => {
    setInspectorOpen(false);
    setPreviewWire("a2a");
    setDeployState("idle");
    setRunState("idle");
    setTutNodes(TUTORIAL_NODES);
  }, []);

  const handleNext = useCallback(() => {
    resetStepState();
    if (isLast) {
      router.push("/?studio=1");
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, router, resetStepState]);

  const handlePrev = useCallback(() => {
    resetStepState();
    setStep((s) => Math.max(s - 1, 1));
  }, [resetStepState]);

  const handleSkip = useCallback(() => router.push("/?studio=1"), [router]);

  const handleMockDeploy = useCallback(async () => {
    setDeployState("pending");
    await sleep(1200);
    if (!mountedRef.current) return;
    setTutNodes((ns) =>
      ns.map((n) =>
        n.id === "tut-agent"
          ? { ...n, data: { ...n.data, walletAddress: "ABCD12...9EF0", balanceAlgo: 0 } }
          : n,
      ),
    );
    await sleep(400);
    if (!mountedRef.current) return;
    setDeployState("done");
  }, []);

  const handleMockRun = useCallback(async () => {
    setRunState("pending");
    setTutNodes((ns) =>
      ns.map((n) =>
        n.id === "tut-agent"
          ? { ...n, data: { ...n.data, executionState: "running" as const } }
          : n,
      ),
    );
    await sleep(2000);
    if (!mountedRef.current) return;
    setTutNodes((ns) =>
      ns.map((n) => ({
        ...n,
        data: {
          ...n.data,
          executionState: "done" as const,
          executionNote: n.id === "tut-end" ? "Pipeline result returned." : undefined,
        },
      })),
    );
    setRunState("done");
  }, []);

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      if (current.highlightNodeId === nodeId) {
        setInspectorOpen(true);
      }
    },
    [current.highlightNodeId],
  );

  // Derive the node data for the inspector
  const inspectorNode = current.highlightNodeId
    ? tutNodes.find((n) => n.id === current.highlightNodeId)
    : undefined;

  return (
    <div className="tutorial-shell">
      <div className="tutorial-topbar">
        <div className="tutorial-brand">
          <span className="brand-mark small-mark">AM</span>
          <span className="eyebrow">Tutorial</span>
        </div>
        <button className="ghost-button compact-button" onClick={handleSkip} type="button">
          Skip tutorial
        </button>
      </div>

      <div className="tutorial-body">
        <ReactFlowProvider>
          <section className="tutorial-canvas-pane">
            <TutorialCanvas
              step={step}
              previewWire={previewWire}
              onWireSelect={setPreviewWire}
              onNodeClick={handleNodeClick}
              tutNodes={tutNodes}
              deployState={deployState}
              runState={runState}
              onMockDeploy={handleMockDeploy}
              onMockRun={handleMockRun}
            />
          </section>
        </ReactFlowProvider>

        <aside className="tutorial-instruction-pane studio-panel panel-pad">
          <div className="tutorial-step-header">
            <span className="eyebrow">Step {step} of {TOTAL_STEPS}</span>
          </div>

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

              {/* Click hint / inspector — steps that highlight a node */}
              {current.highlightNodeId && !inspectorOpen ? (
                <div
                  className="tut-click-hint"
                  onClick={() => setInspectorOpen(true)}
                >
                  Click the highlighted node to inspect
                </div>
              ) : null}

              <AnimatePresence>
                {inspectorOpen && inspectorNode ? (
                  <motion.div
                    initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <TutorialInspector
                      nodeType={inspectorNode.type as "trigger" | "agent" | "end"}
                      nodeData={inspectorNode.data as PipelineNodeData}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              {/* Action hint — hidden when inspector is open */}
              {current.actionHint && !inspectorOpen ? (
                <div className="tutorial-action-hint">
                  <span className="eyebrow">Try it</span>
                  <p>{current.actionHint}</p>
                </div>
              ) : null}

              {/* Log stream — step 7, appears once Run is clicked */}
              {step === 7 && runState !== "idle" ? (
                <TutorialLogStream visible={runState === "pending" || runState === "done"} />
              ) : null}

              {/* Final CTA — step 8 */}
              {isLast ? (
                <div className="tutorial-cta-row">
                  <button
                    className="primary-button"
                    type="button"
                    onClick={() => router.push("/?studio=1")}
                  >
                    Open Studio
                  </button>
                  <button
                    className="ghost-button"
                    type="button"
                    onClick={() => router.push("/?demo=1")}
                  >
                    Load demo and start
                  </button>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>

          <div className="tutorial-nav-row">
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
            <div className="tutorial-nav-btns">
              {step > 1 ? (
                <button className="ghost-button compact-button" onClick={handlePrev} type="button">
                  Back
                </button>
              ) : null}
              {!isLast ? (
                <button className="primary-button compact-button" onClick={handleNext} type="button">
                  Next
                </button>
              ) : null}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
