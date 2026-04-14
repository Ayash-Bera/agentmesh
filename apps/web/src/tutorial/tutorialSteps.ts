export interface TutorialStep {
  title: string;
  body: string;
  actionHint: string;
  highlightNodeId?: string;
  highlightEdgeId?: string;
  highlightTarget?: "deploy-btn" | "run-btn" | "wire-selector" | "canvas" | "none";
}

// Minimal 3-node pipeline used in the tutorial canvas
export const TUTORIAL_NODES = [
  {
    id: "tut-trigger",
    type: "trigger" as const,
    position: { x: 80, y: 200 },
    data: {
      kind: "trigger" as const,
      label: "HTTP Trigger",
      description: "Entry point for your pipeline",
      requestMethod: "POST" as const,
      testRequestBody: '{ "prompt": "Hello AgentMesh" }',
    },
  },
  {
    id: "tut-agent",
    type: "agent" as const,
    position: { x: 360, y: 160 },
    data: {
      kind: "agent" as const,
      label: "My Agent",
      description: "Autonomous AI agent with a wallet",
      role: "assistant",
      systemPrompt: "You are a helpful assistant. Respond to the incoming request clearly and concisely.",
      priceAlgo: 0.01,
      enabledTools: ["search"],
    },
  },
  {
    id: "tut-end",
    type: "end" as const,
    position: { x: 640, y: 200 },
    data: {
      kind: "end" as const,
      label: "HTTP Response",
      description: "Returns the final result",
    },
  },
];

export const TUTORIAL_EDGES = [
  {
    id: "tut-e1",
    source: "tut-trigger",
    target: "tut-agent",
    type: "wire",
    data: { wireType: "a2a" as const, label: "Start" },
  },
  {
    id: "tut-e2",
    source: "tut-agent",
    target: "tut-end",
    type: "wire",
    data: { wireType: "a2a" as const, label: "Return result" },
  },
];

export const TUTORIAL_STEPS: TutorialStep[] = [
  {
    title: "Welcome to AgentMesh",
    body: "AgentMesh lets you build AI agent pipelines that run on Algorand. Each agent gets a real wallet, can call paid services, and passes results through a visual graph you design. This tutorial walks through every part of the canvas.",
    actionHint: "Follow along — by the end you will have deployed and run your first pipeline.",
    highlightTarget: "canvas",
  },
  {
    title: "The Trigger Node",
    body: "Every pipeline starts with a Trigger. It is the HTTP entry point — when someone calls your deployed endpoint, the request enters here. You can set a test request body to simulate incoming data.",
    actionHint: "In the studio: click the Trigger node to edit the test request body in the Inspector on the right.",
    highlightNodeId: "tut-trigger",
  },
  {
    title: "The Agent Node",
    body: "Agents are the brains of your pipeline. Each agent has a system prompt that defines its role, a list of tools it can use, and a price per call in ALGO. When you deploy, AgentMesh mints a real Algorand testnet wallet for each agent.",
    actionHint: "In the studio: click an Agent node, then open the Inspector to edit its prompt, role, and tools.",
    highlightNodeId: "tut-agent",
  },
  {
    title: "Wire Types",
    body: "Wires carry data and payments between nodes. Purple (A2A) routes reasoning between agents. Green (x402) connects an agent to a paid API tool — the agent pays the tool in ALGO or USDC when it calls it. Blue (ALGO) sends a direct ALGO transfer.",
    actionHint: "In the studio: select a wire type from the center of the topbar before dragging to connect two nodes.",
    highlightEdgeId: "tut-e1",
    highlightTarget: "wire-selector",
  },
  {
    title: "The End Node",
    body: "Every pipeline needs an End node. It collects the final result from the last agent and returns it as the HTTP response to whoever called your endpoint. The result is also displayed in the runtime console.",
    actionHint: "In the studio: connect your last agent to the End node with a purple A2A wire.",
    highlightNodeId: "tut-end",
  },
  {
    title: "Deploy",
    body: "Clicking Deploy publishes your pipeline. AgentMesh creates an Algorand wallet for each agent node, reserves a live HTTP endpoint, and stores the configuration. Deployment is fast — usually under 2 seconds.",
    actionHint: "In the studio: click Deploy in the top-right corner. You will see wallet addresses appear on each agent node.",
    highlightTarget: "deploy-btn",
  },
  {
    title: "Fund and Run",
    body: "After deploying, each agent wallet starts with 0 ALGO. Click Fund Wallet on any Agent node to open the QR code and faucet link. Load some testnet ALGO, then click Run to execute the pipeline with your test prompt.",
    actionHint: "In the studio: click Fund Wallet on an agent, use the testnet faucet, then click Run.",
    highlightTarget: "run-btn",
  },
  {
    title: "You are ready",
    body: "That is everything you need to know to build, deploy, and run a pipeline. Start with the Trade Signal Desk example to see a full multi-agent workflow, or clear the canvas and build your own from scratch.",
    actionHint: "Head to the studio and start building.",
    highlightTarget: "none",
  },
];
