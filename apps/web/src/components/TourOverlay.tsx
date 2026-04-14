export const TOUR_STORAGE_KEY = "agentmesh.tour.v1";

export interface TourStep {
  title: string;
  body: string;
  position: "center" | "top-left" | "top-center" | "top-right" | "bottom-center";
  highlightClass?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "Welcome to AgentMesh",
    body: "AgentMesh is a visual canvas for building autonomous AI agent pipelines backed by real Algorand wallets. Agents hold funds, call paid services, and relay results through a chain you design.",
    position: "center",
  },
  {
    title: "The Canvas",
    body: "Each box on the canvas is a node. Nodes are agents, services, a trigger, or an end block. The lines between them are wires — they carry messages and payments. The loaded example is a live trading signal desk.",
    position: "center",
  },
  {
    title: "Node Types",
    body: "Trigger starts the flow when the endpoint is called. Agents do the reasoning using connected tools. APIs are services that agents call and pay for. End returns the final HTTP response.",
    position: "top-left",
    highlightClass: "tour-highlight-left",
  },
  {
    title: "Wire Types",
    body: "Pick a wire type before connecting two nodes. Purple (A2A) routes reasoning between agents. Green (x402) connects an agent to a paid tool. Blue (ALGO) sends a direct ALGO transfer.",
    position: "top-center",
    highlightClass: "tour-highlight-center",
  },
  {
    title: "Editing Nodes",
    body: "Click any node on the canvas to open the Inspector on the right. Set the system prompt, role, tools, and pricing for agents. Edit the URL and kind for service nodes.",
    position: "top-right",
    highlightClass: "tour-highlight-right",
  },
  {
    title: "Deploy, Fund, Run",
    body: "Three steps to go live: Deploy mints real Algorand wallets for each agent. Fund loads testnet ALGO via the faucet so agents can pay for tools. Run calls your live endpoint with a test prompt.",
    position: "top-right",
    highlightClass: "tour-highlight-buttons",
  },
  {
    title: "You are ready",
    body: "Explore the loaded Trade Signal Desk example, or clear the canvas and build your own pipeline from scratch. The progress bar below the toolbar will guide you through each step.",
    position: "center",
  },
];

interface TourOverlayProps {
  step: number;
  total: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function TourOverlay({ step, total, onNext, onPrev, onSkip }: TourOverlayProps) {
  const current = TOUR_STEPS[step - 1];
  if (!current) {
    return null;
  }

  const isLast = step === total;
  const isCenter = current.position === "center";

  return (
    <>
      <div className="tour-backdrop" onClick={onSkip} />
      <div className={`tour-card tour-card-${current.position}`} role="dialog" aria-modal="true">
        <div className="tour-card-header">
          <span className="tour-step-label eyebrow">
            {step} / {total}
          </span>
          <button className="tour-skip-btn" onClick={onSkip} type="button">
            Skip tour
          </button>
        </div>

        <h3 className="tour-card-title">{current.title}</h3>
        <p className="tour-card-body">{current.body}</p>

        <div className="tour-card-footer">
          <div className="tour-dots">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={i + 1 === step ? "tour-dot tour-dot-active" : "tour-dot"}
              />
            ))}
          </div>
          <div className="tour-nav">
            {step > 1 ? (
              <button className="ghost-button compact-button tour-nav-btn" onClick={onPrev} type="button">
                Back
              </button>
            ) : null}
            <button
              className="primary-button compact-button tour-nav-btn"
              onClick={isLast ? onSkip : onNext}
              type="button"
            >
              {isLast ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
