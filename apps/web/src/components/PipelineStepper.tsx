interface PipelineStepperProps {
  hasNodes: boolean;
  isDeployed: boolean;
  isFunded: boolean;
  hasRun: boolean;
}

const STEPS = [
  {
    label: "Build",
    hint: "Add nodes and connect them with wires",
  },
  {
    label: "Deploy",
    hint: "Publish to mint Algorand wallets and get a live endpoint",
  },
  {
    label: "Fund",
    hint: "Load testnet ALGO into agent wallets via the faucet",
  },
  {
    label: "Run",
    hint: "Use the Run button to test your pipeline",
  },
];

export function PipelineStepper({ hasNodes, isDeployed, isFunded, hasRun }: PipelineStepperProps) {
  const done = [hasNodes, isDeployed, isFunded, hasRun];
  const currentStep = done.findIndex((d) => !d);
  // All done: currentStep is -1, treat as step 4 (past last)
  const activeIndex = currentStep === -1 ? 4 : currentStep;

  return (
    <div className="pipeline-stepper">
      {STEPS.map((step, index) => {
        const isDone = done[index];
        const isActive = index === activeIndex;
        const isFuture = index > activeIndex;

        return (
          <div key={step.label} className="stepper-item">
            <div
              className={
                isDone
                  ? "stepper-step stepper-done"
                  : isActive
                    ? "stepper-step stepper-active"
                    : "stepper-step stepper-future"
              }
              title={step.hint}
            >
              <span className="stepper-number">
                {isDone ? <CheckIcon /> : index + 1}
              </span>
              <span className="stepper-label">{step.label}</span>
              <span className="stepper-hint">{step.hint}</span>
            </div>
            {index < STEPS.length - 1 ? (
              <div className={isDone ? "stepper-connector stepper-connector-done" : "stepper-connector"} />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg fill="none" height="10" viewBox="0 0 10 10" width="10">
      <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
    </svg>
  );
}
