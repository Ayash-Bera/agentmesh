"use client";

import type { PipelineNodeData } from "../types/pipeline";

interface TutorialInspectorProps {
  nodeType: "trigger" | "agent" | "end";
  nodeData: PipelineNodeData;
}

export function TutorialInspector({ nodeType, nodeData }: TutorialInspectorProps) {
  return (
    <dl role="region" aria-label="Node properties" className="tut-inspector">
      {nodeType === "trigger" && (
        <>
          <div className="tut-inspector-row">
            <dt className="tut-inspector-key">Label</dt>
            <dd className="tut-inspector-val">{nodeData.label}</dd>
          </div>
          <div className="tut-inspector-row">
            <dt className="tut-inspector-key">Description</dt>
            <dd className="tut-inspector-val">{nodeData.description}</dd>
          </div>
          <div className="tut-inspector-row">
            <dt className="tut-inspector-key">Method</dt>
            <dd className="tut-inspector-val">{nodeData.requestMethod ?? "POST"}</dd>
          </div>
          <div className="tut-inspector-row">
            <dt className="tut-inspector-key">Test body</dt>
            <dd className="tut-inspector-val">
              {(nodeData.testRequestBody ?? "").slice(0, 60)}
              {(nodeData.testRequestBody ?? "").length > 60 ? "…" : ""}
            </dd>
          </div>
        </>
      )}

      {nodeType === "agent" && (
        <>
          <div className="tut-inspector-row">
            <dt className="tut-inspector-key">Label</dt>
            <dd className="tut-inspector-val">{nodeData.label}</dd>
          </div>
          <div className="tut-inspector-row">
            <dt className="tut-inspector-key">Role</dt>
            <dd className="tut-inspector-val">{nodeData.role ?? "assistant"}</dd>
          </div>
          <div className="tut-inspector-row">
            <dt className="tut-inspector-key">Price / call</dt>
            <dd className="tut-inspector-val">{(nodeData.priceAlgo ?? 0).toFixed(3)} ALGO</dd>
          </div>
          <div className="tut-inspector-row">
            <dt className="tut-inspector-key">Tools</dt>
            <dd className="tut-inspector-val" style={{ display: "flex", gap: 4, flexWrap: "wrap", justifyContent: "flex-end" }}>
              {(nodeData.enabledTools ?? []).map((t) => (
                <span key={t} className="tut-inspector-pill">{t}</span>
              ))}
            </dd>
          </div>
          {nodeData.systemPrompt ? (
            <p className="tut-inspector-prompt">
              &ldquo;{nodeData.systemPrompt.slice(0, 80)}{nodeData.systemPrompt.length > 80 ? "…" : ""}&rdquo;
            </p>
          ) : null}
        </>
      )}

      {nodeType === "end" && (
        <>
          <div className="tut-inspector-row">
            <dt className="tut-inspector-key">Label</dt>
            <dd className="tut-inspector-val">{nodeData.label}</dd>
          </div>
          <div className="tut-inspector-row">
            <dt className="tut-inspector-key">Description</dt>
            <dd className="tut-inspector-val">{nodeData.description}</dd>
          </div>
        </>
      )}
    </dl>
  );
}
