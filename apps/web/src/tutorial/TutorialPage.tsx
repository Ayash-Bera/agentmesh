"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import {
  Background,
  ConnectionMode,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { WireEdge } from "../edges/WireEdge";
import { AgentNode } from "../nodes/AgentNode";
import { EndNode } from "../nodes/EndNode";
import { TriggerNode } from "../nodes/TriggerNode";
import {
  TUTORIAL_EDGES,
  TUTORIAL_NODES,
  TUTORIAL_STEPS,
  type TutorialStep,
} from "./tutorialSteps";
import type { BuilderEdge, BuilderNode } from "../types/pipeline";

const nodeTypes = {
  agent: AgentNode,
  trigger: TriggerNode,
  end: EndNode,
};

const edgeTypes = {
  wire: WireEdge,
};

const TOTAL_STEPS = TUTORIAL_STEPS.length;

function TutorialCanvas({ step }: { step: number }) {
  const current = TUTORIAL_STEPS[step - 1];

  const nodes: BuilderNode[] = TUTORIAL_NODES.map((node) => ({
    ...node,
    className: current.highlightNodeId === node.id ? "tutorial-pulse-node" : "",
  })) as BuilderNode[];

  const edges: BuilderEdge[] = TUTORIAL_EDGES.map((edge) => ({
    ...edge,
    className: current.highlightEdgeId === edge.id ? "tutorial-pulse-edge" : "",
  })) as BuilderEdge[];

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

      {(current.highlightTarget === "deploy-btn" || current.highlightTarget === "run-btn") ? (
        <div className="tutorial-btn-callout">
          <div className="tutorial-btn-mock">
            {current.highlightTarget === "deploy-btn" ? "Deploy" : "Run"}
          </div>
          <p className="tutorial-btn-caption">
            {current.highlightTarget === "deploy-btn"
              ? "Top-right of the studio topbar"
              : "Top-right, next to Deploy"}
          </p>
        </div>
      ) : null}

      {current.highlightTarget === "wire-selector" ? (
        <div className="tutorial-wire-callout">
          <div className="tutorial-wire-mock">
            <span className="tutorial-wire-pill tutorial-wire-a2a">Purple Wire</span>
            <span className="tutorial-wire-pill tutorial-wire-x402">Green Wire</span>
            <span className="tutorial-wire-pill tutorial-wire-algo">Blue Wire</span>
          </div>
          <p className="tutorial-btn-caption">Center of the studio topbar</p>
        </div>
      ) : null}
    </div>
  );
}

export function TutorialPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const current: TutorialStep = TUTORIAL_STEPS[step - 1];
  const isLast = step === TOTAL_STEPS;

  const handleNext = useCallback(() => {
    if (isLast) {
      router.push("/");
    } else {
      setStep((s) => s + 1);
    }
  }, [isLast, router]);

  const handlePrev = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);
  const handleSkip = useCallback(() => router.push("/"), [router]);

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
            <TutorialCanvas step={step} />
          </section>
        </ReactFlowProvider>

        <aside className="tutorial-instruction-pane studio-panel panel-pad">
          <div className="tutorial-step-header">
            <span className="eyebrow">Step {step} of {TOTAL_STEPS}</span>
          </div>

          <h2 className="tutorial-step-title">{current.title}</h2>
          <p className="tutorial-step-body">{current.body}</p>

          {current.actionHint ? (
            <div className="tutorial-action-hint">
              <span className="eyebrow">Try it</span>
              <p>{current.actionHint}</p>
            </div>
          ) : null}

          {isLast ? (
            <div className="tutorial-cta-row">
              <a className="primary-button" href="/">
                Open Studio
              </a>
              <a className="ghost-button" href="/?demo=1">
                Load demo and start
              </a>
            </div>
          ) : null}

          <div className="tutorial-nav-row">
            <div className="tour-dots">
              {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <span
                  key={i}
                  className={i + 1 === step ? "tour-dot tour-dot-active" : "tour-dot"}
                />
              ))}
            </div>
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
